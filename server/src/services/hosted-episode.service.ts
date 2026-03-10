import { FieldValue } from "@google-cloud/firestore";
import {
    db,
    HOSTED_PODCASTS_COLLECTION,
    HOSTED_EPISODES_COLLECTION,
    RICHPODS_COLLECTION,
} from "../config/firestore.js";
import type {
    HostedEpisodeDocument,
    HostedPodcastDocument,
    RichPodDocument,
} from "../types/firestore.js";
import { ValidationStatus, RichPodState } from "../types/firestore.js";
import { getUserReference } from "./user.service.js";
import { deleteEpisodeFiles, getHostedPublicUrl } from "./hosted-storage.service.js";
import { deleteAllEnclosures } from "./storage.service.js";
import type { HostedEpisode } from "../graphql.js";
import { HostedEpisodeValidationStatus } from "../graphql.js";
import type { PaginatedResult } from "../utils/pagination.js";
import { ValidationError } from "../validation/validator.js";

function mapValidationStatus(status: string): HostedEpisodeValidationStatus {
    switch (status) {
        case ValidationStatus.VALID:
            return HostedEpisodeValidationStatus.Valid;
        case ValidationStatus.INVALID:
            return HostedEpisodeValidationStatus.Invalid;
        default:
            return HostedEpisodeValidationStatus.Pending;
    }
}

function mapToGraphQL(id: string, data: HostedEpisodeDocument): HostedEpisode {
    return {
        id,
        hostedPodcastId: data.hostedPodcast.id,
        richPodId: data.richPod.id,
        audioUrl: getHostedPublicUrl(data.gcsAudioName),
        audioByteSize: data.audioByteSize,
        audioDurationSeconds: data.audioDurationSeconds,
        audioBitrate: data.audioBitrate,
        audioSampleRate: data.audioSampleRate,
        audioChannels: data.audioChannels,
        validationStatus: mapValidationStatus(data.validationStatus),
        validationError: data.validationError,
        episodeCoverUrl: data.gcsEpisodeCoverName
            ? getHostedPublicUrl(data.gcsEpisodeCoverName)
            : null,
        itunesExplicit: data.itunesExplicit,
        publishedAt: data.publishedAt?.toDate().toISOString() || null,
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
    };
}

type CreateHostedEpisodeParams = {
    episodeId: string;
    podcastId: string;
    gcsAudioName: string;
    audioByteSize: number;
    gcsEpisodeCoverName: string | null;
    episodeCoverMimeType: string | null;
    richPodTitle: string;
    richPodDescription: string;
    editorUserId: string;
};

export async function updateHostedEpisodeChecksum(
    richPodId: string,
    checksum: string,
): Promise<void> {
    const richPodRef = db.collection(RICHPODS_COLLECTION).doc(richPodId);
    await richPodRef.update({
        "origin.episode.media.checksum": checksum,
        updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function createHostedEpisode(
    params: CreateHostedEpisodeParams,
): Promise<{ episode: HostedEpisode; richPodId: string }> {
    const {
        episodeId,
        podcastId,
        gcsAudioName,
        audioByteSize,
        gcsEpisodeCoverName,
        episodeCoverMimeType,
        richPodTitle,
        richPodDescription,
        editorUserId,
    } = params;

    const podcastRef = db.collection(HOSTED_PODCASTS_COLLECTION).doc(podcastId);
    const podcastDoc = await podcastRef.get();
    if (!podcastDoc.exists) {
        console.warn(`Cannot create hosted episode: podcast ${podcastId} not found, requested by user ${editorUserId}`);
        throw new Error("Hosted podcast not found");
    }

    const podcastData = podcastDoc.data() as HostedPodcastDocument;
    if (podcastData.editor.id !== editorUserId) {
        console.warn(`Unauthorized episode creation attempt: user ${editorUserId} tried to add episode to podcast ${podcastId} owned by ${podcastData.editor.id}`);
        throw new Error("Unauthorized: You can only add episodes to your own hosted podcasts");
    }

    const richPodId = db.collection(RICHPODS_COLLECTION).doc().id;
    const audioUrl = getHostedPublicUrl(gcsAudioName);

    // Create the RichPod document for this hosted episode
    const richPodData = {
        title: richPodTitle,
        description: richPodDescription,
        state: RichPodState.DRAFT,
        origin: {
            id: podcastId,
            title: podcastData.title,
            link: podcastData.link || null,
            feedUrl: `hosted-richpod://${podcastId}`,
            artworkUrl: getHostedPublicUrl(podcastData.gcsCoverImageName),
            episode: {
                guid: episodeId,
                title: richPodTitle,
                artworkUrl: gcsEpisodeCoverName ? getHostedPublicUrl(gcsEpisodeCoverName) : null,
                link: null,
                media: {
                    url: audioUrl,
                    type: "audio/mpeg",
                    length: audioByteSize,
                    checksum: "",
                },
            },
            gcsFeedName: "",
        },
        isHosted: true,
        hostedEpisodeId: episodeId,
        publishedAt: null,
        explicit: false,
        editor: getUserReference(editorUserId),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    const richPodRef = db.collection(RICHPODS_COLLECTION).doc(richPodId);
    await richPodRef.create(richPodData);

    // Create the hosted episode document
    const episodeData = {
        hostedPodcast: podcastRef,
        richPod: richPodRef,
        gcsAudioName,
        audioMimeType: "audio/mpeg",
        audioByteSize,
        audioDurationSeconds: null,
        audioBitrate: null,
        audioSampleRate: null,
        audioChannels: null,
        validationStatus: ValidationStatus.PENDING,
        validationError: null,
        gcsEpisodeCoverName,
        episodeCoverMimeType,
        itunesExplicit: false,
        publishedAt: null,
        editor: getUserReference(editorUserId),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    const episodeRef = db.collection(HOSTED_EPISODES_COLLECTION).doc(episodeId);
    await episodeRef.create(episodeData);

    const created = await episodeRef.get();
    const createdData = created.data() as HostedEpisodeDocument;

    return {
        episode: mapToGraphQL(episodeId, createdData),
        richPodId,
    };
}

export async function getHostedEpisode(
    episodeId: string,
    editorUserId: string,
): Promise<HostedEpisode | null> {
    const doc = await db.collection(HOSTED_EPISODES_COLLECTION).doc(episodeId).get();
    if (!doc.exists) {
        return null;
    }

    const data = doc.data() as HostedEpisodeDocument;
    if (data.editor.id !== editorUserId) {
        console.warn(`Unauthorized episode access attempt: user ${editorUserId} tried to access episode ${episodeId} owned by ${data.editor.id}`);
        throw new Error("Unauthorized: You can only access your own hosted episodes");
    }

    return mapToGraphQL(doc.id, data);
}

export async function getHostedEpisodeDoc(
    episodeId: string,
): Promise<{ data: HostedEpisodeDocument; id: string } | null> {
    const doc = await db.collection(HOSTED_EPISODES_COLLECTION).doc(episodeId).get();
    if (!doc.exists) {
        return null;
    }
    return { data: doc.data() as HostedEpisodeDocument, id: doc.id };
}

export async function getHostedEpisodesForPodcast(
    podcastId: string,
    editorUserId: string,
    pageSize: number,
    afterCursor?: string | null,
): Promise<PaginatedResult<HostedEpisode>> {
    const podcastRef = db.collection(HOSTED_PODCASTS_COLLECTION).doc(podcastId);
    const podcastDoc = await podcastRef.get();
    if (!podcastDoc.exists) {
        return { items: [], nextCursor: null };
    }

    const podcastData = podcastDoc.data() as HostedPodcastDocument;
    if (podcastData.editor.id !== editorUserId) {
        console.warn(`Unauthorized podcast episodes access attempt: user ${editorUserId} tried to list episodes for podcast ${podcastId} owned by ${podcastData.editor.id}`);
        throw new Error("Unauthorized: You can only access episodes from your own hosted podcasts");
    }

    const baseQuery = db
        .collection(HOSTED_EPISODES_COLLECTION)
        .where("hostedPodcast", "==", podcastRef);

    let orderedQuery = baseQuery.orderBy("createdAt", "desc").limit(pageSize + 1);

    if (afterCursor) {
        const cursorDoc = await db.collection(HOSTED_EPISODES_COLLECTION).doc(afterCursor).get();
        if (!cursorDoc.exists) {
            throw new ValidationError("Validation failed for after", ["after: invalid or stale cursor"]);
        }
        orderedQuery = orderedQuery.startAfter(cursorDoc);
    }

    const snapshot = await orderedQuery.get();
    const hasNextPage = snapshot.docs.length > pageSize;
    const docs = hasNextPage ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

    const items = docs.map((doc) => {
        const data = doc.data() as HostedEpisodeDocument;
        if (data.editor.id !== editorUserId) {
            throw new Error("Unauthorized: You can only access your own hosted episodes");
        }
        return mapToGraphQL(doc.id, data);
    });

    const nextCursor = hasNextPage && docs.length > 0 ? docs[docs.length - 1].id : null;

    return { items, nextCursor };
}

export async function getPublishedEpisodesForPodcast(
    podcastId: string,
): Promise<Array<{ data: HostedEpisodeDocument; id: string }>> {
    const podcastRef = db.collection(HOSTED_PODCASTS_COLLECTION).doc(podcastId);
    const snapshot = await db
        .collection(HOSTED_EPISODES_COLLECTION)
        .where("hostedPodcast", "==", podcastRef)
        .where("validationStatus", "==", ValidationStatus.VALID)
        .orderBy("publishedAt", "desc")
        .get();

    return snapshot.docs
        .filter((doc) => {
            const data = doc.data() as HostedEpisodeDocument;
            return data.publishedAt !== null;
        })
        .map((doc) => ({
            data: doc.data() as HostedEpisodeDocument,
            id: doc.id,
        }));
}

export async function deleteHostedEpisode(
    episodeId: string,
    editorUserId: string,
): Promise<boolean> {
    const episodeRef = db.collection(HOSTED_EPISODES_COLLECTION).doc(episodeId);
    const episodeDoc = await episodeRef.get();

    if (!episodeDoc.exists) {
        return false;
    }

    const episodeData = episodeDoc.data() as HostedEpisodeDocument;
    if (episodeData.editor.id !== editorUserId) {
        console.warn(`Unauthorized episode deletion attempt: user ${editorUserId} tried to delete episode ${episodeId} owned by ${episodeData.editor.id}`);
        throw new Error("Unauthorized: You can only delete your own hosted episodes");
    }

    if (episodeData.publishedAt !== null) {
        console.info(`Rejected deletion of published episode ${episodeId} by user ${editorUserId}`);
        throw new Error("Cannot delete a published episode. Unpublish it first.");
    }

    const podcastId = episodeData.hostedPodcast.id;
    const richPodId = episodeData.richPod.id;

    // Delete GCS files for this episode
    await deleteEpisodeFiles(podcastId, episodeId);

    // Delete enclosure GCS files for the associated RichPod
    await deleteAllEnclosures(richPodId);

    // Soft-delete the RichPod
    const richPodRef = db.collection(RICHPODS_COLLECTION).doc(richPodId);
    await richPodRef.update({
        state: RichPodState.DELETED,
        updatedAt: FieldValue.serverTimestamp(),
    });

    // Delete the hosted episode doc
    await episodeRef.delete();

    console.info(
        `Deleted hosted episode: episodeId=${episodeId}, richPodId=${richPodId}, podcastId=${podcastId}, user=${editorUserId}`,
    );
    return true;
}

/**
 * Sync hosted episode publish state with RichPod state.
 * Called when a RichPod's state changes.
 */
export async function syncHostedEpisodePublishState(
    richPodId: string,
    newState: string,
): Promise<void> {
    // Find the hosted episode linked to this RichPod
    const richPodRef = db.collection(RICHPODS_COLLECTION).doc(richPodId);
    const snapshot = await db
        .collection(HOSTED_EPISODES_COLLECTION)
        .where("richPod", "==", richPodRef)
        .limit(1)
        .get();

    if (snapshot.empty) {
        return; // Not a hosted episode
    }

    const episodeDoc = snapshot.docs[0];
    const episodeData = episodeDoc.data() as HostedEpisodeDocument;

    if (newState === "published" && episodeData.publishedAt === null) {
        // Publishing: set publishedAt
        await episodeDoc.ref.update({
            publishedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
    } else if (newState === "draft" && episodeData.publishedAt !== null) {
        // Unpublishing: clear publishedAt
        await episodeDoc.ref.update({
            publishedAt: null,
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
}
