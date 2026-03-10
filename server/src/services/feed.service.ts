import { createHash } from "crypto";
import got from "got";
import * as xml2js from "xml2js";
import { v4 as uuidv4 } from "uuid";
import { Storage } from "@google-cloud/storage";
import { validateParsedRssFeed, assertFeedNotLocked, episodeExistsInFeed, getMaxFeedSize } from "../validation/feed.js";
import { GCS_IMMUTABLE_CACHE_CONTROL } from "../config/storage.js";

const storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

const BUCKET_NAME = process.env.GCS_BUCKET_NAME ?? "";
if (BUCKET_NAME.length <= 2) {
    throw new Error("GCS_BUCKET_NAME environment variable is required");
}

const RP_USER_AGENT = "RichPods/1.0 (+https://richpods.org/bot)";

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

async function fetchFeed(feedUrl: string): Promise<FetchFeedResult> {
    const response = await got.get(feedUrl, {
        headers: {
            "User-Agent": RP_USER_AGENT,
            Accept: "application/rss+xml, application/xml, text/xml",
        },
        responseType: "text",
        timeout: { request: 5000 },
        retry: { limit: 1 },
    });

    const feedContent = response.body;
    const contentLength = Buffer.byteLength(feedContent, "utf-8");
    const maxSize = getMaxFeedSize();

    if (contentLength > maxSize) {
        throw new Error(
            `Feed size (${Math.round(contentLength / 1024 / 1024)} MB) exceeds maximum allowed size (${Math.round(maxSize / 1024 / 1024)} MB)`,
        );
    }

    // Parse and validate the feed
    const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true,
    });
    const parsed = await parser.parseStringPromise(feedContent);
    const validatedFeed = validateParsedRssFeed(parsed);

    if (!validatedFeed) {
        throw new Error("Not a valid RSS 2.0 feed");
    }

    assertFeedNotLocked(validatedFeed);

    return { feedContent, parsedFeed: validatedFeed };
}

/**
 * Fetch and validate RSS feed
 */
export async function fetchAndValidateFeed(
    feedUrl: string,
    episodeGuid: string,
): Promise<string> {
    const { feedContent, parsedFeed } = await fetchFeed(feedUrl);

    // Check if the episode with the given GUID exists
    if (!episodeExistsInFeed(parsedFeed, episodeGuid)) {
        throw new Error(`Episode with GUID "${episodeGuid}" not found in RSS feed`);
    }

    return feedContent;
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
