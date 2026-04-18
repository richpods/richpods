import { FieldValue, type DocumentReference } from "@google-cloud/firestore";
import {
    db,
    HOSTED_PODCASTS_COLLECTION,
    HOSTED_EPISODES_COLLECTION,
} from "../config/firestore.js";
import type { HostedEpisodeDocument, HostedPodcastDocument } from "../types/firestore.js";
import { getUserReference } from "./user.service.js";
import { deletePodcastChannelFiles, getHostedPublicUrl } from "./hosted-storage.service.js";
import type {
    HostedPodcast,
    CreateHostedPodcastInput,
    PublicHostedPodcast,
    UpdateHostedPodcastInput,
} from "../graphql.js";
import type { PaginatedResult } from "../utils/pagination.js";
import { ValidationError } from "../validation/validator.js";

function buildFeedUrl(podcastId: string): string {
    const baseUrl = process.env.API_BASE_URL || "http://localhost:4000";
    return `${baseUrl}/api/v1/hosted/podcast/${podcastId}/feed.xml`;
}

async function countEpisodes(podcastId: string): Promise<number> {
    const podcastRef = db.collection(HOSTED_PODCASTS_COLLECTION).doc(podcastId);
    const snapshot = await db
        .collection(HOSTED_EPISODES_COLLECTION)
        .where("hostedPodcast", "==", podcastRef)
        .count()
        .get();
    return snapshot.data().count;
}

function mapToGraphQL(
    id: string,
    data: HostedPodcastDocument,
    episodeCount: number,
): HostedPodcast {
    return {
        id,
        title: data.title,
        description: data.description,
        link: data.link,
        language: data.language,
        itunesCategory: data.itunesCategory,
        itunesExplicit: data.itunesExplicit,
        itunesAuthor: data.itunesAuthor,
        itunesType: data.itunesType,
        copyright: data.copyright,
        applePodcastsVerifyTxt: data.applePodcastsVerifyTxt,
        // Legacy documents pre-date the customWebsite flag. Treat a missing field as
        // "custom website on" so their stored `link` continues to drive the channel link
        // and is surfaced in the editor toggle instead of being silently overwritten
        // with the auto-generated URL.
        customWebsite: data.customWebsite ?? true,
        platformLinkApplePodcasts: data.platformLinkApplePodcasts ?? null,
        platformLinkSpotify: data.platformLinkSpotify ?? null,
        platformLinkAmazonMusic: data.platformLinkAmazonMusic ?? null,
        platformLinkYouTubeMusic: data.platformLinkYouTubeMusic ?? null,
        coverImageUrl: getHostedPublicUrl(data.gcsCoverImageName),
        episodeCount,
        feedUrl: buildFeedUrl(id),
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
    };
}

export async function createHostedPodcast(
    input: CreateHostedPodcastInput,
    gcsCoverImageName: string,
    coverImageMimeType: string,
    editorUserId: string,
    podcastId: string,
): Promise<HostedPodcast> {
    const docRef = db.collection(HOSTED_PODCASTS_COLLECTION).doc(podcastId);

    const customWebsite = input.customWebsite ?? false;
    const trimmedLink = input.link?.trim() ?? "";
    if (customWebsite && !trimmedLink) {
        throw new ValidationError("Validation failed for input", [
            "link: a valid website URL is required when customWebsite is true",
        ]);
    }
    const link = trimmedLink || "https://www.richpods.org";
    const docData = {
        title: input.title,
        description: input.description,
        link,
        language: input.language,
        itunesCategory: input.itunesCategory,
        itunesExplicit: input.itunesExplicit,
        itunesAuthor: input.itunesAuthor,
        itunesType: input.itunesType || null,
        copyright: input.copyright || null,
        applePodcastsVerifyTxt: input.applePodcastsVerifyTxt || null,
        customWebsite,
        platformLinkApplePodcasts: input.platformLinkApplePodcasts?.trim() || null,
        platformLinkSpotify: input.platformLinkSpotify?.trim() || null,
        platformLinkAmazonMusic: input.platformLinkAmazonMusic?.trim() || null,
        platformLinkYouTubeMusic: input.platformLinkYouTubeMusic?.trim() || null,
        gcsCoverImageName,
        coverImageMimeType,
        editor: getUserReference(editorUserId),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    await docRef.create(docData);
    const created = await docRef.get();
    const createdData = created.data() as HostedPodcastDocument;

    return mapToGraphQL(podcastId, createdData, 0);
}

export async function getHostedPodcastById(
    id: string,
    editorUserId: string,
): Promise<HostedPodcast | null> {
    const doc = await db.collection(HOSTED_PODCASTS_COLLECTION).doc(id).get();
    if (!doc.exists) {
        return null;
    }

    const data = doc.data() as HostedPodcastDocument;
    if (data.editor.id !== editorUserId) {
        console.warn(
            `Unauthorized podcast access attempt: user ${editorUserId} tried to access podcast ${id} owned by ${data.editor.id}`,
        );
        throw new Error("Unauthorized: You can only access your own hosted podcasts");
    }

    const episodeCount = await countEpisodes(id);
    return mapToGraphQL(id, data, episodeCount);
}

function mapToPublic(id: string, data: HostedPodcastDocument): PublicHostedPodcast {
    return {
        id,
        title: data.title,
        description: data.description,
        link: data.link,
        language: data.language,
        itunesCategory: data.itunesCategory,
        itunesExplicit: data.itunesExplicit,
        itunesAuthor: data.itunesAuthor,
        itunesType: data.itunesType,
        copyright: data.copyright,
        customWebsite: data.customWebsite ?? true,
        platformLinkApplePodcasts: data.platformLinkApplePodcasts ?? null,
        platformLinkSpotify: data.platformLinkSpotify ?? null,
        platformLinkAmazonMusic: data.platformLinkAmazonMusic ?? null,
        platformLinkYouTubeMusic: data.platformLinkYouTubeMusic ?? null,
        coverImageUrl: getHostedPublicUrl(data.gcsCoverImageName),
        feedUrl: buildFeedUrl(id),
    };
}

export async function getPublicHostedPodcast(id: string): Promise<PublicHostedPodcast | null> {
    const doc = await db.collection(HOSTED_PODCASTS_COLLECTION).doc(id).get();
    if (!doc.exists) {
        return null;
    }
    return mapToPublic(id, doc.data() as HostedPodcastDocument);
}

/**
 * Get a hosted podcast document without ownership check (for RSS feed generation).
 */
export async function getHostedPodcastDocById(
    id: string,
): Promise<{ data: HostedPodcastDocument; id: string } | null> {
    const doc = await db.collection(HOSTED_PODCASTS_COLLECTION).doc(id).get();
    if (!doc.exists) {
        return null;
    }
    return { data: doc.data() as HostedPodcastDocument, id: doc.id };
}

export async function getUserHostedPodcasts(
    editorUserId: string,
    pageSize: number,
    afterCursor?: string | null,
): Promise<PaginatedResult<HostedPodcast>> {
    const userRef = getUserReference(editorUserId);
    const baseQuery = db.collection(HOSTED_PODCASTS_COLLECTION).where("editor", "==", userRef);

    let orderedQuery = baseQuery.orderBy("updatedAt", "desc").limit(pageSize + 1);

    if (afterCursor) {
        const cursorDoc = await db.collection(HOSTED_PODCASTS_COLLECTION).doc(afterCursor).get();
        if (!cursorDoc.exists) {
            throw new ValidationError("Validation failed for after", [
                "after: invalid or stale cursor",
            ]);
        }
        orderedQuery = orderedQuery.startAfter(cursorDoc);
    }

    const snapshot = await orderedQuery.get();
    const hasNextPage = snapshot.docs.length > pageSize;
    const docs = hasNextPage ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

    const items: HostedPodcast[] = [];
    for (const doc of docs) {
        const data = doc.data() as HostedPodcastDocument;
        const episodeCount = await countEpisodes(doc.id);
        items.push(mapToGraphQL(doc.id, data, episodeCount));
    }

    const nextCursor = hasNextPage && docs.length > 0 ? docs[docs.length - 1].id : null;

    return { items, nextCursor };
}

type RichPodOriginSync = {
    title?: string;
    link?: string;
    artworkUrl?: string;
};

/**
 * Propagate denormalized hosted-podcast fields (title, link, cover artwork) to every
 * RichPod that was created for one of the podcast's episodes. RichPods store a copy
 * of these values under `origin` at creation time, so subsequent edits to the podcast
 * would otherwise drift out of sync with the player and the RSS feed.
 */
export async function syncHostedPodcastFieldsToRichPods(
    podcastId: string,
    changes: RichPodOriginSync,
): Promise<void> {
    const fieldUpdates: Record<string, unknown> = {};
    if (changes.title !== undefined) fieldUpdates["origin.title"] = changes.title;
    if (changes.link !== undefined) fieldUpdates["origin.link"] = changes.link;
    if (changes.artworkUrl !== undefined) fieldUpdates["origin.artworkUrl"] = changes.artworkUrl;
    if (Object.keys(fieldUpdates).length === 0) return;

    const podcastRef = db.collection(HOSTED_PODCASTS_COLLECTION).doc(podcastId);
    const episodesSnapshot = await db
        .collection(HOSTED_EPISODES_COLLECTION)
        .where("hostedPodcast", "==", podcastRef)
        .get();

    const richPodRefs: DocumentReference[] = [];
    for (const episodeDoc of episodesSnapshot.docs) {
        const episodeData = episodeDoc.data() as HostedEpisodeDocument;
        if (episodeData.richPod) {
            richPodRefs.push(episodeData.richPod);
        }
    }
    if (richPodRefs.length === 0) return;

    const payload = { ...fieldUpdates, updatedAt: FieldValue.serverTimestamp() };

    // Firestore batches are capped at 500 writes. Chunk conservatively.
    const CHUNK_SIZE = 400;
    for (let i = 0; i < richPodRefs.length; i += CHUNK_SIZE) {
        const batch = db.batch();
        for (const ref of richPodRefs.slice(i, i + CHUNK_SIZE)) {
            batch.update(ref, payload);
        }
        await batch.commit();
    }
}

export async function updateHostedPodcast(
    id: string,
    input: UpdateHostedPodcastInput,
    editorUserId: string,
): Promise<HostedPodcast | null> {
    const docRef = db.collection(HOSTED_PODCASTS_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
        return null;
    }

    const data = doc.data() as HostedPodcastDocument;
    if (data.editor.id !== editorUserId) {
        console.warn(
            `Unauthorized podcast update attempt: user ${editorUserId} tried to edit podcast ${id} owned by ${data.editor.id}`,
        );
        throw new Error("Unauthorized: You can only edit your own hosted podcasts");
    }

    const updates: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (input.title !== undefined && input.title !== null) updates.title = input.title;
    if (input.description !== undefined && input.description !== null)
        updates.description = input.description;

    // Determine the post-update state of (customWebsite, link) so we can reject
    // updates that leave customWebsite=true without a valid link.
    const nextCustomWebsite =
        input.customWebsite !== undefined && input.customWebsite !== null
            ? input.customWebsite
            : (data.customWebsite ?? true);
    const incomingLink = input.link !== undefined ? (input.link?.trim() ?? "") : null;
    const resolvedLink = incomingLink !== null ? incomingLink : (data.link ?? "").trim();
    if (nextCustomWebsite && !resolvedLink) {
        throw new ValidationError("Validation failed for input", [
            "link: a valid website URL is required when customWebsite is true",
        ]);
    }
    if (input.link !== undefined) {
        updates.link = incomingLink || "https://www.richpods.org";
    }

    if (input.language !== undefined && input.language !== null) updates.language = input.language;
    if (input.itunesCategory !== undefined && input.itunesCategory !== null)
        updates.itunesCategory = input.itunesCategory;
    if (input.itunesExplicit !== undefined && input.itunesExplicit !== null)
        updates.itunesExplicit = input.itunesExplicit;
    if (input.itunesAuthor !== undefined && input.itunesAuthor !== null)
        updates.itunesAuthor = input.itunesAuthor;
    if (input.itunesType !== undefined) updates.itunesType = input.itunesType || null;
    if (input.copyright !== undefined) updates.copyright = input.copyright || null;
    if (input.applePodcastsVerifyTxt !== undefined)
        updates.applePodcastsVerifyTxt = input.applePodcastsVerifyTxt || null;

    if (input.customWebsite !== undefined && input.customWebsite !== null) {
        updates.customWebsite = input.customWebsite;
    }
    if (input.platformLinkApplePodcasts !== undefined)
        updates.platformLinkApplePodcasts = input.platformLinkApplePodcasts?.trim() || null;
    if (input.platformLinkSpotify !== undefined)
        updates.platformLinkSpotify = input.platformLinkSpotify?.trim() || null;
    if (input.platformLinkAmazonMusic !== undefined)
        updates.platformLinkAmazonMusic = input.platformLinkAmazonMusic?.trim() || null;
    if (input.platformLinkYouTubeMusic !== undefined)
        updates.platformLinkYouTubeMusic = input.platformLinkYouTubeMusic?.trim() || null;

    await docRef.update(updates);

    const richPodSync: RichPodOriginSync = {};
    if (typeof updates.title === "string") richPodSync.title = updates.title;
    if (typeof updates.link === "string") richPodSync.link = updates.link;
    await syncHostedPodcastFieldsToRichPods(id, richPodSync);

    const updated = await docRef.get();
    const updatedData = updated.data() as HostedPodcastDocument;
    const episodeCount = await countEpisodes(id);
    return mapToGraphQL(id, updatedData, episodeCount);
}

export async function deleteHostedPodcast(id: string, editorUserId: string): Promise<boolean> {
    const docRef = db.collection(HOSTED_PODCASTS_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
        return false;
    }

    const data = doc.data() as HostedPodcastDocument;
    if (data.editor.id !== editorUserId) {
        console.warn(
            `Unauthorized podcast deletion attempt: user ${editorUserId} tried to delete podcast ${id} owned by ${data.editor.id}`,
        );
        throw new Error("Unauthorized: You can only delete your own hosted podcasts");
    }

    const episodeCount = await countEpisodes(id);
    if (episodeCount > 0) {
        console.warn(
            `Rejected deletion of podcast ${id} by user ${editorUserId}: still has ${episodeCount} episode(s)`,
        );
        throw new Error(
            "Cannot delete a hosted podcast that still has episodes. Delete all episodes first.",
        );
    }

    await deletePodcastChannelFiles(id);
    await docRef.delete();
    console.info(`Deleted hosted podcast: id=${id}, user=${editorUserId}`);
    return true;
}
