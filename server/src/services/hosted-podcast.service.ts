import { FieldValue } from "@google-cloud/firestore";
import { db, HOSTED_PODCASTS_COLLECTION, HOSTED_EPISODES_COLLECTION } from "../config/firestore.js";
import type { HostedPodcastDocument } from "../types/firestore.js";
import { getUserReference } from "./user.service.js";
import { deletePodcastChannelFiles, getHostedPublicUrl } from "./hosted-storage.service.js";
import type {
    HostedPodcast,
    CreateHostedPodcastInput,
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

    const docData = {
        title: input.title,
        description: input.description,
        link: input.link?.trim() || "https://www.richpods.org",
        language: input.language,
        itunesCategory: input.itunesCategory,
        itunesExplicit: input.itunesExplicit,
        itunesAuthor: input.itunesAuthor,
        itunesType: input.itunesType || null,
        copyright: input.copyright || null,
        applePodcastsVerifyTxt: input.applePodcastsVerifyTxt || null,
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
        console.warn(`Unauthorized podcast access attempt: user ${editorUserId} tried to access podcast ${id} owned by ${data.editor.id}`);
        throw new Error("Unauthorized: You can only access your own hosted podcasts");
    }

    const episodeCount = await countEpisodes(id);
    return mapToGraphQL(id, data, episodeCount);
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
    const baseQuery = db
        .collection(HOSTED_PODCASTS_COLLECTION)
        .where("editor", "==", userRef);

    let orderedQuery = baseQuery.orderBy("updatedAt", "desc").limit(pageSize + 1);

    if (afterCursor) {
        const cursorDoc = await db.collection(HOSTED_PODCASTS_COLLECTION).doc(afterCursor).get();
        if (!cursorDoc.exists) {
            throw new ValidationError("Validation failed for after", ["after: invalid or stale cursor"]);
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
        console.warn(`Unauthorized podcast update attempt: user ${editorUserId} tried to edit podcast ${id} owned by ${data.editor.id}`);
        throw new Error("Unauthorized: You can only edit your own hosted podcasts");
    }

    const updates: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (input.title !== undefined && input.title !== null) updates.title = input.title;
    if (input.description !== undefined && input.description !== null)
        updates.description = input.description;
    if (input.link !== undefined) updates.link = input.link?.trim() || "https://www.richpods.org";
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

    await docRef.update(updates);

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
        console.warn(`Unauthorized podcast deletion attempt: user ${editorUserId} tried to delete podcast ${id} owned by ${data.editor.id}`);
        throw new Error("Unauthorized: You can only delete your own hosted podcasts");
    }

    const episodeCount = await countEpisodes(id);
    if (episodeCount > 0) {
        console.warn(`Rejected deletion of podcast ${id} by user ${editorUserId}: still has ${episodeCount} episode(s)`);
        throw new Error(
            "Cannot delete a hosted podcast that still has episodes. Delete all episodes first.",
        );
    }

    await deletePodcastChannelFiles(id);
    await docRef.delete();
    console.info(`Deleted hosted podcast: id=${id}, user=${editorUserId}`);
    return true;
}
