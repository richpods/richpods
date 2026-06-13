import { createHash } from "crypto";
import got, { type Progress } from "got";
import { v4 as uuidv4 } from "uuid";
import { Storage } from "@google-cloud/storage";
import { validateParsedRssFeed, assertFeedNotLocked, episodeExistsInFeed } from "../validation/feed.js";
import { GCS_IMMUTABLE_CACHE_CONTROL } from "../config/storage.js";
import {
    getMaxFeedSize,
    parseFeed,
    RP_USER_AGENT,
    RSS_ACCEPT_HEADERS,
} from "@richpods/shared/media/feed";
import {
    assertSafePublicUrl,
    assertSafeRedirectTarget,
    ssrfSafeDnsLookup,
} from "@richpods/shared/utils/ssrf";
import { toClientSafeFetchError } from "../utils/fetch-error.js";

const storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

const BUCKET_NAME = process.env.GCS_BUCKET_NAME ?? "";
if (BUCKET_NAME.length <= 2) {
    throw new Error("GCS_BUCKET_NAME environment variable is required");
}

/**
 * Build deterministic GCS object name for a feed snapshot.
 */
export function buildFeedGcsName(richPodId: string, feedUrl: string): string {
    const timestamp = new Date().toISOString().replace(/\D/g, "");
    const hash = createHash("sha256").update(feedUrl).digest().subarray(0, 4).toString("hex");
    return `${richPodId}/feed-${timestamp}-${uuidv4()}--${hash}.xml`;
}

export interface FetchFeedResult {
    feedContent: string;
    parsedFeed: any;
}

export async function fetchFeed(feedUrl: string): Promise<FetchFeedResult> {
    await assertSafePublicUrl(feedUrl);
    const maxSize = getMaxFeedSize();
    const abortController = new AbortController();
    let aborted = false;
    const request = got.get(feedUrl, {
        headers: RSS_ACCEPT_HEADERS,
        responseType: "text",
        timeout: { request: 5000 },
        retry: { limit: 1 },
        dnsLookup: ssrfSafeDnsLookup,
        hooks: { beforeRedirect: [assertSafeRedirectTarget] },
        signal: abortController.signal,
    });
    // got has no maxContentLength; abort mid-transfer so an oversized or
    // endless feed cannot exhaust server memory. The decoded size is checked
    // again below against the same limit.
    request.on("downloadProgress", (progress: Progress) => {
        if (progress.transferred > maxSize || (progress.total ?? 0) > maxSize) {
            aborted = true;
            abortController.abort();
        }
    });

    let response;
    try {
        response = await request;
    } catch (error) {
        if (aborted) {
            throw new Error(
                `Feed exceeds maximum allowed size of ${Math.round(maxSize / 1024 / 1024)} MB`,
            );
        }
        throw toClientSafeFetchError(error, "feed");
    }

    const feedContent = response.body;
    const contentLength = Buffer.byteLength(feedContent, "utf-8");

    if (contentLength > maxSize) {
        throw new Error(
            `Feed size (${Math.round(contentLength / 1024 / 1024)} MB) exceeds maximum allowed size (${Math.round(maxSize / 1024 / 1024)} MB)`,
        );
    }

    const parsed = await parseFeed(feedContent);
    validateParsedRssFeed(parsed);
    assertFeedNotLocked(parsed);

    return { feedContent, parsedFeed: parsed };
}

/**
 * Fetch and validate RSS feed
 */
export async function fetchAndValidateFeed(
    feedUrl: string,
    episodeGuid: string,
): Promise<FetchFeedResult> {
    const { feedContent, parsedFeed } = await fetchFeed(feedUrl);

    // Check if the episode with the given GUID exists
    if (!episodeExistsInFeed(parsedFeed, episodeGuid)) {
        throw new Error(`Episode with GUID "${episodeGuid}" not found in RSS feed`);
    }

    return { feedContent, parsedFeed };
}

/**
 * Store RSS feed in Google Cloud Storage
 */
export async function storeFeedInGCS(
    richPodId: string,
    feedUrl: string,
    feedContent: string,
): Promise<string> {
    const gcsFeedName = buildFeedGcsName(richPodId, feedUrl);

    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(gcsFeedName);

    const payload = JSON.stringify({
        storedAt: new Date().toISOString(),
        feedUrl,
        originalXml: feedContent,
    });

    await file.save(payload, {
        metadata: {
            contentType: "application/xml",
            cacheControl: GCS_IMMUTABLE_CACHE_CONTROL,
        },
    });

    return gcsFeedName;
}

export async function fetchFeedForVerification(feedUrl: string): Promise<FetchFeedResult> {
    return fetchFeed(feedUrl);
}
