import got from "got";
import { DocumentReference, FieldValue, Timestamp } from "@google-cloud/firestore";
import { db, RICHPODS_COLLECTION } from "../config/firestore.js";
import { fetchFeed } from "./feed.service.js";
import { parseIntEnv } from "../utils/env.js";
import { runCheckFlow, isFresh } from "@richpods/shared/media/check";
import { assertSafePublicUrl } from "@richpods/shared/utils/ssrf";
import type { CheckFlowDeps, HeadCheckResponse } from "@richpods/shared/media/types";
import {
    RichPodState as FirestoreRichPodState,
    type PodcastMedia,
    type RichPodDocument,
} from "../types/firestore.js";

const MEDIA_CHECK_TTL_MS = parseIntEnv("MEDIA_CHECK_TTL_MS", 86_400_000, { min: 60_000 });
const HEAD_CHECK_TIMEOUT_MS = parseIntEnv("HEAD_CHECK_TIMEOUT_MS", 5000, { min: 1000 });
async function performHeadCheck(url: string, timeoutMs?: number): Promise<HeadCheckResponse> {
    await assertSafePublicUrl(url);
    const response = await got.head(url, {
        followRedirect: true,
        timeout: { request: timeoutMs ?? HEAD_CHECK_TIMEOUT_MS },
        retry: { limit: 0 },
        throwHttpErrors: false,
        hooks: {
            beforeRedirect: [
                async (redirectOptions) => {
                    if (redirectOptions.url) {
                        await assertSafePublicUrl(redirectOptions.url.toString());
                    }
                },
            ],
        },
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

function createServerCheckFlowDeps(): CheckFlowDeps {
    return {
        performHeadCheck,
        fetchAndParseFeed: async (feedUrl: string) => {
            const { parsedFeed } = await fetchFeed(feedUrl);
            return { parsedFeed };
        },
    };
}

type GraphQLPodcastMedia = {
    url: string;
    type: string;
    length: number;
    checksum: string;
    mediaCheck: {
        checkedAt: string;
        checkedUrl: string;
        status: string;
        httpStatus: number | null;
        etag: string | null;
        lastModified: string | null;
        contentLength: number | null;
    } | null;
};

function mediaToGraphQL(media: PodcastMedia, urlOverride?: string): GraphQLPodcastMedia {
    return {
        url: urlOverride ?? media.url,
        type: media.type,
        length: media.length,
        checksum: media.checksum,
        mediaCheck: media.mediaCheck
            ? {
                  checkedAt: media.mediaCheck.checkedAt?.toDate().toISOString(),
                  checkedUrl: media.mediaCheck.checkedUrl,
                  status: media.mediaCheck.status,
                  httpStatus: media.mediaCheck.httpStatus ?? null,
                  etag: media.mediaCheck.etag ?? null,
                  lastModified: media.mediaCheck.lastModified ?? null,
                  contentLength: media.mediaCheck.contentLength ?? null,
              }
            : null,
    };
}

/**
 * Check and optionally update the media URL for a RichPod.
 *
 * @param richPodId - the RichPod document ID
 * @param force - if true, skip freshness check and always re-check
 * @returns the media object with the freshest URL
 */
async function checkAndUpdateMediaForDocument(
    docRef: DocumentReference,
    data: RichPodDocument,
    force: boolean,
): Promise<GraphQLPodcastMedia> {
    const media = data.origin.episode.media;

    // Hosted episodes use our own GCS URLs — skip check
    if (data.isHosted) {
        return mediaToGraphQL(media);
    }

    // Check freshness
    if (!force && media.mediaCheck) {
        const checkedAtMs = media.mediaCheck.checkedAt?.toDate().getTime();
        if (checkedAtMs && isFresh(checkedAtMs, MEDIA_CHECK_TTL_MS)) {
            return mediaToGraphQL(media);
        }
    }

    const deps = createServerCheckFlowDeps();

    // Single HEAD request with timeout — if it fails, serve old URL
    let headResponse: HeadCheckResponse | null;
    try {
        headResponse = await performHeadCheck(media.url);
    } catch {
        headResponse = null;
    }

    // If HEAD failed entirely and this is not a forced check, serve old URL
    if (!headResponse && !force) {
        return mediaToGraphQL(media);
    }

    // Run the full check flow
    const result = await runCheckFlow(
        deps,
        media.url,
        data.origin.feedUrl,
        data.origin.episode.guid,
        data.origin.episode.pubDate ?? null,
        { url: media.url, length: media.length },
        headResponse,
    );

    // Build the mediaCheck object for Firestore
    const mediaCheck = {
        checkedAt: FieldValue.serverTimestamp(),
        checkedUrl: media.url,
        status: result.status,
        ...(result.httpStatus !== undefined ? { httpStatus: result.httpStatus } : {}),
        ...(result.etag !== undefined ? { etag: result.etag } : {}),
        ...(result.lastModified !== undefined ? { lastModified: result.lastModified } : {}),
        ...(result.contentLength !== undefined ? { contentLength: result.contentLength } : {}),
    };

    // Prepare Firestore update (do not bump updatedAt — media checks are not real edits)
    const updates: Record<string, unknown> = {
        "origin.episode.media.mediaCheck": mediaCheck,
    };

    // Update the stored URL if check resolved to a new URL and status is ok
    if (result.status === "ok" && result.resolvedUrl !== media.url) {
        console.info(
            `Media URL rewritten for RichPod ${docRef.id}: ${media.url} → ${result.resolvedUrl}`,
        );
        updates["origin.episode.media.url"] = result.resolvedUrl;
    }

    await docRef.update(updates);

    // Return the GraphQL media with the resolved URL
    const resolvedUrl = result.status === "ok" ? result.resolvedUrl : media.url;

    return {
        url: resolvedUrl,
        type: media.type,
        length: media.length,
        checksum: media.checksum,
        mediaCheck: {
            checkedAt: new Date().toISOString(),
            checkedUrl: media.url,
            status: result.status,
            httpStatus: result.httpStatus ?? null,
            etag: result.etag ?? null,
            lastModified: result.lastModified ?? null,
            contentLength: result.contentLength ?? null,
        },
    };
}

export async function checkAndUpdateMedia(
    richPodId: string,
    force: boolean,
): Promise<GraphQLPodcastMedia> {
    const docRef = db.collection(RICHPODS_COLLECTION).doc(richPodId);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new Error(`RichPod ${richPodId} not found`);
    }

    return checkAndUpdateMediaForDocument(docRef, doc.data() as RichPodDocument, force);
}

export async function refreshRichPodMediaForEditor(
    richPodId: string,
    editorUserId: string,
): Promise<GraphQLPodcastMedia> {
    const docRef = db.collection(RICHPODS_COLLECTION).doc(richPodId);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new Error("RichPod not found");
    }

    const data = doc.data() as RichPodDocument;
    if (data.state === FirestoreRichPodState.DELETED || data.editor.id !== editorUserId) {
        throw new Error("RichPod not found");
    }

    console.info(`Media check triggered by user ${editorUserId} for RichPod ${richPodId}`);
    return checkAndUpdateMediaForDocument(docRef, data, true);
}
