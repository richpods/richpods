import { http, type Request, type Response } from "@google-cloud/functions-framework";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import got, { type Progress } from "got";
import * as xml2js from "xml2js";
import {
    assertSafePublicUrl,
    assertSafeRedirectTarget,
    ssrfSafeDnsLookup,
} from "@richpods/shared/utils/ssrf";
import { getMaxFeedSize } from "@richpods/shared/media/feed";
import {
    checkFeedVerifications,
    extractEmailFromFeed,
    feedFetchFailure,
    type FeedCheckTally,
    type FeedEmailCheck,
    type VerifiedRecord,
} from "./verification-check.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const VerificationRequestState = {
    PENDING: "pending",
    FAILED: "failed",
    VERIFIED: "verified",
} as const;

type VerificationDocument = {
    feedUrl: string;
    email: string;
    user: FirebaseFirestore.DocumentReference;
    state: (typeof VerificationRequestState)[keyof typeof VerificationRequestState];
};

type VerificationCheckResult = {
    total: number;
    checked: number;
    passed: number;
    failed: number;
    errors: number;
};

type FeedVerificationRecord = VerifiedRecord & { ref: FirebaseFirestore.DocumentReference };

// ---------------------------------------------------------------------------
// Firestore
// ---------------------------------------------------------------------------

const VERIFICATIONS_COLLECTION = "verifications";

const db = new Firestore({
    databaseId: process.env.FIRESTORE_DATABASE_ID || "(default)",
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

// ---------------------------------------------------------------------------
// Feed helpers (ported from server)
// ---------------------------------------------------------------------------

const RP_USER_AGENT = "RichPods/1.0 (+https://richpods.org/bot)";

function validateParsedRssFeed(parsed: Record<string, unknown>): Record<string, unknown> | null {
    if (!parsed || !(parsed as any).rss || !(parsed as any).rss.channel) return null;
    const version = (parsed as any).rss.version;
    if (version && String(version) !== "2.0") return null;

    const channel = (parsed as any).rss.channel;
    if (!channel.title || !channel.description) return null;

    const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
    if (!items.length) return null;

    for (const item of items) {
        const hasTitle = Boolean(
            item && typeof item.title === "string" && item.title.trim().length > 0,
        );
        const guidVal = item?.guid;
        const hasGuid =
            typeof guidVal === "string"
                ? guidVal.trim().length > 0
                : guidVal &&
                  typeof guidVal === "object" &&
                  typeof guidVal._ === "string" &&
                  guidVal._.trim().length > 0;
        const enc = item?.enclosure;
        const hasEnclosure = Boolean(
            enc && typeof enc.url === "string" && enc.url.trim().length > 0,
        );
        if (!hasTitle || !hasGuid || !hasEnclosure) return null;
    }
    return parsed;
}

function assertFeedNotLocked(parsed: Record<string, unknown>): void {
    const channel = (parsed as any)?.rss?.channel;
    if (!channel) return;

    const locked = channel["podcast:locked"];
    const value = typeof locked === "object" && locked !== null ? locked._ : locked;
    if (typeof value === "string" && value.trim().toLowerCase() === "yes") {
        throw new Error("This podcast feed is locked by its owner and does not allow imports");
    }
}

async function fetchFeed(
    feedUrl: string,
): Promise<{ feedContent: string; parsedFeed: Record<string, unknown> }> {
    await assertSafePublicUrl(feedUrl);
    const maxFeedSizeBytes = getMaxFeedSize();
    const abortController = new AbortController();
    let aborted = false;
    const request = got.get(feedUrl, {
        headers: {
            "User-Agent": RP_USER_AGENT,
            Accept: "application/rss+xml, application/xml, text/xml",
        },
        responseType: "text",
        timeout: { request: 15000 },
        retry: { limit: 1 },
        dnsLookup: ssrfSafeDnsLookup,
        hooks: { beforeRedirect: [assertSafeRedirectTarget] },
        signal: abortController.signal,
    });
    // got has no maxContentLength; abort mid-transfer so an oversized or
    // endless feed cannot exhaust the function's memory. The decoded size is
    // checked again below against the same limit.
    request.on("downloadProgress", (progress: Progress) => {
        if (progress.transferred > maxFeedSizeBytes || (progress.total ?? 0) > maxFeedSizeBytes) {
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
                `Feed exceeds maximum allowed size of ${Math.round(maxFeedSizeBytes / 1024 / 1024)} MB`,
            );
        }
        throw error;
    }

    const feedContent = response.body;
    const contentLength = Buffer.byteLength(feedContent, "utf-8");

    if (contentLength > maxFeedSizeBytes) {
        throw new Error(
            `Feed size (${Math.round(contentLength / 1024 / 1024)} MB) exceeds maximum allowed size (${Math.round(maxFeedSizeBytes / 1024 / 1024)} MB)`,
        );
    }

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

// ---------------------------------------------------------------------------
// Revalidation
// ---------------------------------------------------------------------------

async function fetchCurrentFeedEmail(feedUrl: string): Promise<FeedEmailCheck> {
    try {
        const { parsedFeed } = await fetchFeed(feedUrl);
        return { ok: true, email: extractEmailFromFeed(parsedFeed) };
    } catch (error) {
        return feedFetchFailure(error);
    }
}

async function revokeVerification(record: FeedVerificationRecord, reason: string): Promise<void> {
    console.log(`[checkAllVerifications] Revoking verification ${record.id}: ${reason}`);
    try {
        await record.ref.update({
            state: VerificationRequestState.FAILED,
            verificationTimestamp: FieldValue.serverTimestamp(),
            lastCheckReason: reason,
        });
    } catch (error) {
        console.error(
            `[checkAllVerifications] Failed to revoke verification ${record.id}:`,
            error instanceof Error ? error.message : error,
        );
        throw error;
    }
}

async function checkFeed(
    feedUrl: string,
    records: readonly FeedVerificationRecord[],
): Promise<FeedCheckTally> {
    console.log(
        `[checkAllVerifications] Checking feed: ${feedUrl} (${records.length} verifications)`,
    );

    try {
        const feed = await fetchCurrentFeedEmail(feedUrl);
        const tally = await checkFeedVerifications(records, feed, revokeVerification);
        console.log(
            `[checkAllVerifications] Checked feed: ${feedUrl} (passed: ${tally.passed}, revoked: ${tally.failed}, errors: ${tally.errors})`,
        );
        return tally;
    } catch (error) {
        console.error(
            `[checkAllVerifications] Error checking feed ${feedUrl}:`,
            error instanceof Error ? error.message : error,
        );
        return { checked: records.length, passed: 0, failed: 0, errors: records.length };
    }
}

// ---------------------------------------------------------------------------
// Main logic
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkAllVerifications(): Promise<VerificationCheckResult> {
    const result: VerificationCheckResult = {
        total: 0,
        checked: 0,
        passed: 0,
        failed: 0,
        errors: 0,
    };

    const snapshot = await db
        .collection(VERIFICATIONS_COLLECTION)
        .where("state", "==", VerificationRequestState.VERIFIED)
        .orderBy("feedUrl")
        .orderBy("verificationTimestamp", "desc")
        .get();

    if (snapshot.empty) {
        console.log("[checkAllVerifications] No verified verifications found");
        return result;
    }

    const uniqueFeeds = new Map<string, FeedVerificationRecord[]>();

    snapshot.forEach((doc) => {
        const data = doc.data() as VerificationDocument;
        const feedUrl = data.feedUrl;

        if (!uniqueFeeds.has(feedUrl)) {
            uniqueFeeds.set(feedUrl, []);
        }

        uniqueFeeds.get(feedUrl)!.push({
            id: doc.id,
            userPath: data.user.path,
            email: data.email,
            ref: doc.ref,
        });
    });

    result.total = snapshot.size;
    console.log(
        `[checkAllVerifications] Found ${result.total} verifications across ${uniqueFeeds.size} unique feeds`,
    );

    const BATCH_SIZE = 5;
    const DELAY_MS = 1500;
    const feedEntries = Array.from(uniqueFeeds.entries());

    for (let i = 0; i < feedEntries.length; i += BATCH_SIZE) {
        const batch = feedEntries.slice(i, i + BATCH_SIZE);
        const tallies = await Promise.all(
            batch.map(([feedUrl, records]) => checkFeed(feedUrl, records)),
        );

        for (const tally of tallies) {
            result.checked += tally.checked;
            result.passed += tally.passed;
            result.failed += tally.failed;
            result.errors += tally.errors;
        }

        if (i + BATCH_SIZE < feedEntries.length) {
            await sleep(DELAY_MS);
        }
    }

    return result;
}

// ---------------------------------------------------------------------------
// HTTP Cloud Function entry point
// ---------------------------------------------------------------------------

http("checkVerifications", async (_req: Request, res: Response) => {
    console.log("[checkVerifications] Starting verification check...");
    const startTime = Date.now();

    try {
        const result = await checkAllVerifications();
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`[checkVerifications] Completed in ${duration}s`, result);

        res.status(200).json({
            ...result,
            durationSeconds: Number(duration),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[checkVerifications] Fatal error:", error);
        res.status(500).json({ error: message });
    }
});
