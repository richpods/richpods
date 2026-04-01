import { http, type Request, type Response } from "@google-cloud/functions-framework";
import { Firestore, FieldValue, Timestamp } from "@google-cloud/firestore";
import got from "got";
import { parseFeed, RP_USER_AGENT, RSS_ACCEPT_HEADERS } from "@richpods/shared/media/feed";
import { runCheckFlow, isFresh, performHeadCheckWithRetries } from "@richpods/shared/media/check";
import type {
    MediaCheckStatusValue,
    HeadCheckResponse,
    CheckFlowDeps,
} from "@richpods/shared/media/types";

// ---------------------------------------------------------------------------
// Types (Firestore-specific, not shared)
// ---------------------------------------------------------------------------

type PodcastMediaCheck = {
    checkedAt: Timestamp;
    checkedUrl: string;
    status: MediaCheckStatusValue;
    httpStatus?: number;
    etag?: string;
    lastModified?: string;
    contentLength?: number;
};

type RichPodMediaInfo = {
    id: string;
    mediaUrl: string;
    mediaLength: number;
    feedUrl: string;
    guid: string;
    pubDate: string | null;
    mediaCheck: PodcastMediaCheck | null;
};

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_URLS_PER_RUN = 200;
const MAX_URLS_PER_HOSTNAME = 20;
const MIN_HOSTNAME_INTERVAL_MS = 2000;
const HEAD_CHECK_TIMEOUT_MS = 5000;
const HEAD_CHECK_MAX_RETRIES = 3;
const MEDIA_CHECK_TTL_MS = parseInt(
    process.env.MEDIA_CHECK_TTL_MS || "86400000",
    10,
);

// ---------------------------------------------------------------------------
// Firestore
// ---------------------------------------------------------------------------

const RICHPODS_COLLECTION = "richpods";

const db = new Firestore({
    databaseId: process.env.FIRESTORE_DATABASE_ID || "(default)",
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

// ---------------------------------------------------------------------------
// I/O implementations for CheckFlowDeps
// ---------------------------------------------------------------------------

async function performHeadCheck(url: string): Promise<HeadCheckResponse> {
    const response = await got.head(url, {
        headers: { "User-Agent": RP_USER_AGENT },
        followRedirect: true,
        timeout: { request: HEAD_CHECK_TIMEOUT_MS },
        retry: { limit: 0 },
        throwHttpErrors: false,
    });

    return {
        httpStatus: response.statusCode,
        finalUrl: response.url,
        etag: response.headers.etag as string | undefined,
        lastModified: response.headers["last-modified"] as string | undefined,
        contentLength: response.headers["content-length"]
            ? parseInt(response.headers["content-length"], 10)
            : undefined,
        redirected: response.url !== url,
    };
}

async function fetchAndParseFeed(feedUrl: string): Promise<{ parsedFeed: any }> {
    const response = await got.get(feedUrl, {
        headers: RSS_ACCEPT_HEADERS,
        responseType: "text",
        timeout: { request: 15000 },
        retry: { limit: 1 },
    });

    const parsedFeed = await parseFeed(response.body);
    return { parsedFeed };
}

const checkFlowDeps: CheckFlowDeps = {
    performHeadCheck,
    fetchAndParseFeed,
};

// ---------------------------------------------------------------------------
// Rate limiting helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getHostname(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return "unknown";
    }
}

// ---------------------------------------------------------------------------
// Priority sorting
// ---------------------------------------------------------------------------

function checkPriority(info: RichPodMediaInfo): number {
    if (!info.mediaCheck) return 0; // never checked — same as stale
    switch (info.mediaCheck.status) {
        case "broken":
            return 1;
        case "altered":
            return 2;
        default:
            return 0; // stale "ok" — same priority as never checked
    }
}

// ---------------------------------------------------------------------------
// Main logic
// ---------------------------------------------------------------------------

type CheckSummary = {
    total: number;
    checked: number;
    ok: number;
    altered: number;
    broken: number;
    skipped: number;
    errors: number;
};

async function checkAllMedia(): Promise<CheckSummary> {
    const summary: CheckSummary = {
        total: 0,
        checked: 0,
        ok: 0,
        altered: 0,
        broken: 0,
        skipped: 0,
        errors: 0,
    };

    // Query all non-deleted RichPods
    const snapshot = await db
        .collection(RICHPODS_COLLECTION)
        .where("state", "in", ["published", "draft"])
        .limit(MAX_URLS_PER_RUN * 2)
        .get();

    if (snapshot.empty) {
        console.log("[checkMedia] No RichPods found");
        return summary;
    }

    // Collect eligible RichPods (exclude hosted)
    const candidates: RichPodMediaInfo[] = [];

    snapshot.forEach((doc) => {
        const data = doc.data();

        // Exclude hosted episodes — our own GCS URLs don't change
        if (data.isHosted) return;

        const media = data.origin?.episode?.media;
        if (!media?.url) return;

        const mediaCheck = media.mediaCheck ?? null;

        // Skip fresh "ok" checks
        if (mediaCheck?.status === "ok" && mediaCheck.checkedAt) {
            const checkedAtMs =
                mediaCheck.checkedAt instanceof Timestamp
                    ? mediaCheck.checkedAt.toDate().getTime()
                    : new Date(mediaCheck.checkedAt).getTime();
            if (isFresh(checkedAtMs, MEDIA_CHECK_TTL_MS)) return;
        }

        candidates.push({
            id: doc.id,
            mediaUrl: media.url,
            mediaLength: media.length ?? 0,
            feedUrl: data.origin.feedUrl,
            guid: data.origin.episode.guid,
            pubDate: data.origin.episode.pubDate ?? null,
            mediaCheck,
        });
    });

    summary.total = candidates.length;
    console.log(`[checkMedia] Found ${candidates.length} candidates to check`);

    // Sort by priority: stale first, then broken, then altered
    candidates.sort((a, b) => checkPriority(a) - checkPriority(b));

    // Rate limiting state
    const hostnameCount = new Map<string, number>();
    const hostnameLastCheck = new Map<string, number>();
    let checkedCount = 0;

    for (const candidate of candidates) {
        if (checkedCount >= MAX_URLS_PER_RUN) {
            summary.skipped += candidates.length - checkedCount;
            break;
        }

        const hostname = getHostname(candidate.mediaUrl);

        // Per-hostname limit
        const count = hostnameCount.get(hostname) ?? 0;
        if (count >= MAX_URLS_PER_HOSTNAME) {
            summary.skipped++;
            continue;
        }

        // Enforce minimum interval between same-hostname requests
        const lastCheck = hostnameLastCheck.get(hostname);
        if (lastCheck) {
            const elapsed = Date.now() - lastCheck;
            if (elapsed < MIN_HOSTNAME_INTERVAL_MS) {
                await sleep(MIN_HOSTNAME_INTERVAL_MS - elapsed);
            }
        }

        try {
            const headResponse = await performHeadCheckWithRetries(
                performHeadCheck,
                candidate.mediaUrl,
                HEAD_CHECK_MAX_RETRIES,
            );

            const result = await runCheckFlow(
                checkFlowDeps,
                candidate.mediaUrl,
                candidate.feedUrl,
                candidate.guid,
                candidate.pubDate,
                { url: candidate.mediaUrl, length: candidate.mediaLength },
                headResponse,
            );

            // Build Firestore update
            const mediaCheckUpdate: Record<string, unknown> = {
                checkedAt: FieldValue.serverTimestamp(),
                checkedUrl: candidate.mediaUrl,
                status: result.status,
            };
            if (result.httpStatus !== undefined) {
                mediaCheckUpdate.httpStatus = result.httpStatus;
            }
            if (result.etag !== undefined) {
                mediaCheckUpdate.etag = result.etag;
            }
            if (result.lastModified !== undefined) {
                mediaCheckUpdate.lastModified = result.lastModified;
            }
            if (result.contentLength !== undefined) {
                mediaCheckUpdate.contentLength = result.contentLength;
            }

            const updates: Record<string, unknown> = {
                "origin.episode.media.mediaCheck": mediaCheckUpdate,
            };

            if (result.status === "ok" && result.resolvedUrl !== candidate.mediaUrl) {
                console.info(
                    `[checkMedia] Media URL rewritten for RichPod ${candidate.id}: ${candidate.mediaUrl} → ${result.resolvedUrl}`,
                );
                updates["origin.episode.media.url"] = result.resolvedUrl;
            }

            await db.collection(RICHPODS_COLLECTION).doc(candidate.id).update(updates);

            switch (result.status) {
                case "ok":
                    summary.ok++;
                    break;
                case "altered":
                    summary.altered++;
                    break;
                case "broken":
                    summary.broken++;
                    break;
            }

            summary.checked++;
            checkedCount++;
        } catch (error: any) {
            console.error(
                `[checkMedia] Error checking ${candidate.id} (${candidate.mediaUrl}):`,
                error.message,
            );
            summary.errors++;
            summary.checked++;
            checkedCount++;
        }

        hostnameCount.set(hostname, (hostnameCount.get(hostname) ?? 0) + 1);
        hostnameLastCheck.set(hostname, Date.now());
    }

    return summary;
}

// ---------------------------------------------------------------------------
// HTTP Cloud Function entry point
// ---------------------------------------------------------------------------

http("checkMedia", async (_req: Request, res: Response) => {
    console.log("[checkMedia] Starting media check...");
    const startTime = Date.now();

    try {
        const result = await checkAllMedia();
        const durationMs = Date.now() - startTime;

        console.log(`[checkMedia] Completed in ${durationMs}ms`, result);

        res.status(200).json({
            ...result,
            durationMs,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[checkMedia] Fatal error:", error);
        res.status(500).json({ error: message });
    }
});
