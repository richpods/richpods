import { http, type Request, type Response } from "@google-cloud/functions-framework";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import got from "got";
import * as xml2js from "xml2js";

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
    return EMAIL_REGEX.test(email);
}

/**
 * Calculate the maximum feed size based on the current year.
 * 20 MB for 2025, +1 MB for each subsequent year.
 */
function getMaxFeedSize(): number {
    const currentYear = new Date().getFullYear();
    const baseYear = 2025;
    const baseSizeMB = 20;
    const yearDiff = Math.max(0, currentYear - baseYear);
    return (baseSizeMB + yearDiff) * 1024 * 1024;
}

function validateParsedRssFeed(parsed: Record<string, unknown>): Record<string, unknown> | null {
    if (!parsed || !(parsed as any).rss || !(parsed as any).rss.channel) return null;
    const version = (parsed as any).rss.version;
    if (version && String(version) !== "2.0") return null;

    const channel = (parsed as any).rss.channel;
    if (!channel.title || !channel.description) return null;

    const items = Array.isArray(channel.item)
        ? channel.item
        : channel.item
          ? [channel.item]
          : [];
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
        const hasEnclosure = Boolean(enc && typeof enc.url === "string" && enc.url.trim().length > 0);
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
    const response = await got.get(feedUrl, {
        headers: {
            "User-Agent": RP_USER_AGENT,
            Accept: "application/rss+xml, application/xml, text/xml",
        },
        responseType: "text",
        timeout: { request: 15000 },
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
// Email extraction (ported from server verification.service.ts)
// ---------------------------------------------------------------------------

function extractEmailFromFeed(parsedFeed: Record<string, unknown>): string | null {
    if (!(parsedFeed as any)?.rss?.channel) {
        return null;
    }

    const channel = (parsedFeed as any).rss.channel;
    const directEmail =
        typeof channel["itunes:email"] === "string" ? channel["itunes:email"].trim() : undefined;
    if (directEmail && isValidEmail(directEmail)) {
        return directEmail;
    }

    const owner = channel["itunes:owner"];
    const ownerEmail =
        typeof owner?.["itunes:email"] === "string" ? owner["itunes:email"].trim() : undefined;
    if (ownerEmail && isValidEmail(ownerEmail)) {
        return ownerEmail;
    }

    return null;
}

// ---------------------------------------------------------------------------
// Revalidation
// ---------------------------------------------------------------------------

async function revalidateVerification(
    feedUrl: string,
    expectedEmail: string,
): Promise<{ success: boolean; reason?: string }> {
    try {
        const { parsedFeed } = await fetchFeed(feedUrl);
        const currentEmail = extractEmailFromFeed(parsedFeed);

        if (!currentEmail) {
            return { success: false, reason: "Email not found in feed" };
        }

        if (currentEmail.toLowerCase() !== expectedEmail.toLowerCase()) {
            return { success: false, reason: "Email mismatch" };
        }

        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { success: false, reason: `Feed fetch error: ${message}` };
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

    const uniqueFeeds = new Map<
        string,
        Array<{ id: string; email: string; userId: string }>
    >();

    snapshot.forEach((doc) => {
        const data = doc.data() as VerificationDocument;
        const feedUrl = data.feedUrl;
        const userId = data.user.id;

        if (!uniqueFeeds.has(feedUrl)) {
            uniqueFeeds.set(feedUrl, []);
        }

        uniqueFeeds.get(feedUrl)!.push({
            id: doc.id,
            email: data.email,
            userId,
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

        const batchPromises = batch.map(async ([feedUrl, verifications]) => {
            console.log(
                `[checkAllVerifications] Checking feed: ${feedUrl} (${verifications.length} verifications)`,
            );

            try {
                const firstVerification = verifications[0];
                const checkResult = await revalidateVerification(
                    feedUrl,
                    firstVerification.email,
                );

                for (const verification of verifications) {
                    result.checked++;

                    if (checkResult.success) {
                        result.passed++;
                        console.log(
                            `[checkAllVerifications] Pass: ${feedUrl}`,
                        );
                    } else {
                        result.failed++;
                        console.log(
                            `[checkAllVerifications] Fail: ${feedUrl}: ${checkResult.reason}`,
                        );

                        const docRef = db
                            .collection(VERIFICATIONS_COLLECTION)
                            .doc(verification.id);
                        await docRef.update({
                            state: VerificationRequestState.FAILED,
                            verificationTimestamp: FieldValue.serverTimestamp(),
                            lastCheckReason:
                                checkResult.reason || "Verification check failed",
                        });
                    }
                }
            } catch (error) {
                for (const _verification of verifications) {
                    result.checked++;
                    result.errors++;
                }
                console.error(
                    `[checkAllVerifications] Error checking feed ${feedUrl}:`,
                    error instanceof Error ? error.message : error,
                );
            }
        });

        await Promise.all(batchPromises);

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
