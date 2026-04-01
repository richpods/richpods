import {
    MediaCheckStatus,
    type HeadCheckResponse,
    type CheckFlowResult,
    type EpisodeEnclosure,
    type StoredMedia,
    type CheckFlowDeps,
} from "./types.js";

/**
 * Find an episode in a parsed RSS feed by GUID, falling back to pubDate.
 */
export function findEpisodeInFeed(
    parsedFeed: any,
    guid: string,
    pubDate: string | null,
): EpisodeEnclosure | null {
    const channel = parsedFeed.rss.channel;
    const items: any[] = Array.isArray(channel.item)
        ? channel.item
        : channel.item
          ? [channel.item]
          : [];

    // Primary lookup: by GUID
    let episode = items.find((item) => {
        const itemGuid =
            typeof item.guid === "object" && item.guid["_"] ? item.guid["_"] : item.guid;
        return itemGuid === guid;
    });

    // Fallback: pubDate match by timestamp (only if GUID not found)
    if (!episode && pubDate) {
        const storedTime = new Date(pubDate).getTime();
        if (!isNaN(storedTime)) {
            episode = items.find((item) => {
                if (!item.pubDate) return false;
                const itemTime = new Date(item.pubDate).getTime();
                if (isNaN(itemTime)) return false;
                return itemTime === storedTime;
            });
        }
    }

    if (!episode?.enclosure?.url) return null;

    return {
        url: episode.enclosure.url,
        type: episode.enclosure.type || "audio/mpeg",
        length: parseInt(episode.enclosure.length, 10) || 0,
    };
}

/**
 * Compare content-length with a +-5 % tolerance to allow for minor
 * re-encodings while still detecting completely different files.
 */
export function contentMatches(storedLength: number, newContentLength: number | undefined): boolean {
    if (!newContentLength) return true;
    if (storedLength > 0) {
        const ratio = newContentLength / storedLength;
        return ratio >= 0.95 && ratio <= 1.05;
    }
    return true;
}

/**
 * Check whether a media check timestamp is still within the TTL.
 */
export function isFresh(checkedAtMs: number, ttlMs: number): boolean {
    return Date.now() - checkedAtMs < ttlMs;
}

/**
 * Retry a HEAD check with exponential back-off.
 * Returns `null` if all retries are exhausted.
 */
export async function performHeadCheckWithRetries(
    headCheck: (url: string) => Promise<HeadCheckResponse>,
    url: string,
    maxRetries: number,
): Promise<HeadCheckResponse | null> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await headCheck(url);
        } catch (error: any) {
            if (attempt === maxRetries) return null;
            const delayMs = 1000 * Math.pow(2, attempt);
            console.info(
                `HEAD retry ${attempt + 1}/${maxRetries} for ${url} after ${delayMs}ms: ${error.message}`,
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
    return null;
}

// --- RSS feed re-resolution (internal) ---

async function resolveFromRssFeed(
    deps: CheckFlowDeps,
    feedUrl: string,
    guid: string,
    pubDate: string | null,
    storedMedia: StoredMedia,
): Promise<CheckFlowResult> {
    let parsedFeed: any;
    try {
        const result = await deps.fetchAndParseFeed(feedUrl);
        parsedFeed = result.parsedFeed;
    } catch (error) {
        console.error(`Failed to fetch RSS feed ${feedUrl} for re-resolution:`, error);
        return { status: MediaCheckStatus.BROKEN, resolvedUrl: storedMedia.url };
    }

    const enclosure = findEpisodeInFeed(parsedFeed, guid, pubDate);
    if (!enclosure) {
        console.info(`Episode ${guid} not found in feed ${feedUrl} — marking as broken`);
        return { status: MediaCheckStatus.BROKEN, resolvedUrl: storedMedia.url };
    }

    // Verify the new URL is accessible
    let headResponse: HeadCheckResponse | null;
    try {
        headResponse = await deps.performHeadCheck(enclosure.url);
    } catch {
        headResponse = null;
    }

    if (!headResponse || headResponse.httpStatus >= 400) {
        return {
            status: MediaCheckStatus.BROKEN,
            resolvedUrl: storedMedia.url,
            httpStatus: headResponse?.httpStatus,
        };
    }

    const resolvedUrl = headResponse.redirected ? headResponse.finalUrl : enclosure.url;
    const matches = contentMatches(storedMedia.length, headResponse.contentLength);

    return {
        status: matches ? MediaCheckStatus.OK : MediaCheckStatus.ALTERED,
        resolvedUrl: matches ? resolvedUrl : storedMedia.url,
        httpStatus: headResponse.httpStatus,
        etag: headResponse.etag,
        lastModified: headResponse.lastModified,
        contentLength: headResponse.contentLength,
    };
}

// --- Main check flow ---

/**
 * Run the media check flow for a single episode.
 *
 * Decision logic is pure; all I/O is performed through `deps`.
 *
 * @param deps        - injected I/O helpers (HEAD check, feed fetcher)
 * @param storedUrl   - the URL currently stored in Firestore
 * @param feedUrl     - the podcast's RSS feed URL
 * @param guid        - episode GUID
 * @param pubDate     - episode publication date (ISO string) or null
 * @param storedMedia - stored url + content length for comparison
 * @param headResponse - result of the initial HEAD request (null if it failed entirely)
 */
export async function runCheckFlow(
    deps: CheckFlowDeps,
    storedUrl: string,
    feedUrl: string,
    guid: string,
    pubDate: string | null,
    storedMedia: StoredMedia,
    headResponse: HeadCheckResponse | null,
): Promise<CheckFlowResult> {
    // HEAD failed entirely (DNS, timeout after retries)
    if (!headResponse) {
        return { status: MediaCheckStatus.BROKEN, resolvedUrl: storedUrl };
    }

    const { httpStatus, finalUrl, etag, lastModified, contentLength, redirected } = headResponse;

    // 2xx: URL is accessible
    if (httpStatus >= 200 && httpStatus < 300) {
        const resolvedUrl = redirected ? finalUrl : storedUrl;
        const matches = contentMatches(storedMedia.length, contentLength);

        if (!matches) {
            return {
                status: MediaCheckStatus.ALTERED,
                resolvedUrl: storedUrl,
                httpStatus,
                etag,
                lastModified,
                contentLength,
            };
        }

        return {
            status: MediaCheckStatus.OK,
            resolvedUrl,
            httpStatus,
            etag,
            lastModified,
            contentLength,
        };
    }

    // 4xx / 5xx: URL is broken — try RSS re-resolution
    if (httpStatus >= 400) {
        const rssResult = await resolveFromRssFeed(deps, feedUrl, guid, pubDate, storedMedia);
        if (rssResult.httpStatus === undefined) {
            rssResult.httpStatus = httpStatus;
        }
        return rssResult;
    }

    // Any other status — treat as ok if accessible
    return {
        status: MediaCheckStatus.OK,
        resolvedUrl: redirected ? finalUrl : storedUrl,
        httpStatus,
        etag,
        lastModified,
        contentLength,
    };
}
