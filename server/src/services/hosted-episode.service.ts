import { DocumentReference, FieldValue, Timestamp } from "@google-cloud/firestore";
import {
    db,
    HOSTED_PODCASTS_COLLECTION,
    HOSTED_EPISODES_COLLECTION,
    RICHPODS_COLLECTION,
    AUDIO_VALIDATIONS_COLLECTION,
} from "../config/firestore.js";
import type {
    HostedEpisodeDocument,
    HostedPodcastDocument,
    RichPodDocument,
} from "../types/firestore.js";
import { ValidationStatus, RichPodState } from "../types/firestore.js";
import { getUserReference } from "./user.service.js";
import { deleteEpisodeFiles, getHostedPublicUrl } from "./hosted-storage.service.js";
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

function mapToGraphQL(
    id: string,
    data: HostedEpisodeDocument,
    richPodTitle?: string | null,
): HostedEpisode {
    return {
        id,
        hostedPodcastId: data.hostedPodcast.id,
        richPodId: data.richPod?.id ?? null,
        richPodTitle: richPodTitle ?? null,
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
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
    };
}

type CreateHostedEpisodeParams = {
    episodeId: string;
    podcastId: string;
    gcsAudioName: string;
    audioByteSize: number;
    editorUserId: string;
};

export async function createHostedEpisode(
    params: CreateHostedEpisodeParams,
): Promise<{ episode: HostedEpisode }> {
    const {
        episodeId,
        podcastId,
        gcsAudioName,
        audioByteSize,
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

    const episodeRef = db.collection(HOSTED_EPISODES_COLLECTION).doc(episodeId);

    const episodeData = {
        hostedPodcast: podcastRef,
        richPod: null,
        gcsAudioName,
        audioMimeType: "audio/mpeg",
        audioByteSize,
        audioDurationSeconds: null,
        audioBitrate: null,
        audioSampleRate: null,
        audioChannels: null,
        validationStatus: ValidationStatus.PENDING,
        validationError: null,
        gcsEpisodeCoverName: null,
        episodeCoverMimeType: null,
        editor: getUserReference(editorUserId),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    await episodeRef.create(episodeData);

    const created = await episodeRef.get();
    const createdData = created.data() as HostedEpisodeDocument;

    return {
        episode: mapToGraphQL(episodeId, createdData),
    };
}

/**
 * Create a RichPod for a validated hosted episode. Only episodes with
 * validationStatus === "valid" can have a RichPod created. If a RichPod
 * already exists, returns the existing one (idempotent).
 *
 * Uses a Firestore transaction to prevent duplicate RichPods when two
 * concurrent requests (e.g. browser retry, double-click) race.
 */
export async function createRichPodForEpisode(
    episodeId: string,
    editorUserId: string,
): Promise<{ richPodId: string }> {
    const episodeRef = db.collection(HOSTED_EPISODES_COLLECTION).doc(episodeId);

    return db.runTransaction(async (tx) => {
        const episodeDoc = await tx.get(episodeRef);

        if (!episodeDoc.exists) {
            throw new Error("Hosted episode not found");
        }

        const episodeData = episodeDoc.data() as HostedEpisodeDocument;

        if (episodeData.editor.id !== editorUserId) {
            throw new Error("Unauthorized: You can only create RichPods for your own episodes");
        }

        // Idempotent: return existing RichPod if already created
        if (episodeData.richPod) {
            return { richPodId: episodeData.richPod.id };
        }

        if (episodeData.validationStatus !== ValidationStatus.VALID) {
            throw new Error("Cannot create a RichPod for an episode that has not passed validation");
        }

        const podcastRef = episodeData.hostedPodcast;
        const podcastDoc = await tx.get(podcastRef);
        if (!podcastDoc.exists) {
            throw new Error("Hosted podcast not found");
        }

        const podcastData = podcastDoc.data() as HostedPodcastDocument;
        const audioUrl = getHostedPublicUrl(episodeData.gcsAudioName);
        const richPodId = db.collection(RICHPODS_COLLECTION).doc().id;
        const richPodRef = db.collection(RICHPODS_COLLECTION).doc(richPodId);

        const richPodData = {
            title: "",
            description: "",
            state: RichPodState.DRAFT,
            origin: {
                id: podcastRef.id,
                title: podcastData.title,
                link: podcastData.link || null,
                feedUrl: `hosted-richpod://${podcastRef.id}`,
                artworkUrl: getHostedPublicUrl(podcastData.gcsCoverImageName),
                episode: {
                    guid: episodeId,
                    title: "",
                    artworkUrl: episodeData.gcsEpisodeCoverName
                        ? getHostedPublicUrl(episodeData.gcsEpisodeCoverName)
                        : null,
                    link: null,
                    media: {
                        url: audioUrl,
                        type: "audio/mpeg",
                        length: episodeData.audioByteSize,
                        checksum: "",
                    },
                },
                gcsFeedName: "",
                verified: true,
            },
            isHosted: true,
            hostedEpisodeId: episodeId,
            publishedAt: null,
            explicit: false,
            editor: getUserReference(editorUserId),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        tx.create(richPodRef, richPodData);
        tx.update(episodeRef, {
            richPod: richPodRef,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return { richPodId };
    });
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

    let richPodTitle: string | null = null;
    if (data.richPod) {
        const richPodDoc = await data.richPod.get();
        if (richPodDoc.exists) {
            richPodTitle = (richPodDoc.data() as RichPodDocument).title || null;
        }
    }

    return mapToGraphQL(doc.id, data, richPodTitle);
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

    // Batch-load linked RichPod titles in a single round-trip
    const richPodRefs = docs
        .map((doc) => (doc.data() as HostedEpisodeDocument).richPod)
        .filter((ref): ref is DocumentReference => ref !== null);

    const richPodTitleMap = new Map<string, string>();
    if (richPodRefs.length > 0) {
        const richPodDocs = await db.getAll(...richPodRefs);
        for (const rpDoc of richPodDocs) {
            if (rpDoc.exists) {
                richPodTitleMap.set(rpDoc.id, (rpDoc.data() as RichPodDocument).title || "");
            }
        }
    }

    const items = docs.map((doc) => {
        const data = doc.data() as HostedEpisodeDocument;
        if (data.editor.id !== editorUserId) {
            throw new Error("Unauthorized: You can only access your own hosted episodes");
        }
        const title = data.richPod ? richPodTitleMap.get(data.richPod.id) ?? null : null;
        return mapToGraphQL(doc.id, data, title);
    });

    const nextCursor = hasNextPage && docs.length > 0 ? docs[docs.length - 1].id : null;

    return { items, nextCursor };
}

export type PublishedEpisodeData = {
    richPodId: string;
    title: string;
    description: string;
    publishedAt: Timestamp;
    explicit: boolean;
    audioGcsName: string;
    audioByteSize: number;
    audioDurationSeconds: number | null;
    episodeCoverGcsName: string | null;
    episodeId: string;
};

/**
 * Get published episodes for a podcast by finding hosted episodes whose
 * linked RichPod is in "published" state. The RichPod is the single source
 * of truth for title, description, publishedAt, and explicit.
 */
export async function getPublishedEpisodesForPodcast(
    podcastId: string,
): Promise<PublishedEpisodeData[]> {
    const podcastRef = db.collection(HOSTED_PODCASTS_COLLECTION).doc(podcastId);
    const snapshot = await db
        .collection(HOSTED_EPISODES_COLLECTION)
        .where("hostedPodcast", "==", podcastRef)
        .get();

    // Filter to valid episodes with a linked RichPod
    const candidateEpisodes = snapshot.docs
        .map((doc) => ({ id: doc.id, data: doc.data() as HostedEpisodeDocument }))
        .filter((e) => e.data.validationStatus === ValidationStatus.VALID && e.data.richPod);

    if (candidateEpisodes.length === 0) {
        return [];
    }

    // Batch-read all linked RichPod documents in a single round-trip
    const richPodRefs = candidateEpisodes.map((e) => e.data.richPod!);
    const richPodDocs = await db.getAll(...richPodRefs);

    const richPodMap = new Map<string, RichPodDocument>();
    for (const doc of richPodDocs) {
        if (doc.exists) {
            richPodMap.set(doc.id, doc.data() as RichPodDocument);
        }
    }

    const results: PublishedEpisodeData[] = [];

    for (const episode of candidateEpisodes) {
        const richPodId = episode.data.richPod!.id;
        const richPodData = richPodMap.get(richPodId);
        if (!richPodData) continue;
        if (richPodData.state !== RichPodState.PUBLISHED) continue;
        if (!richPodData.publishedAt) continue;

        results.push({
            richPodId,
            title: richPodData.title,
            description: richPodData.description,
            publishedAt: richPodData.publishedAt,
            explicit: richPodData.explicit ?? false,
            audioGcsName: episode.data.gcsAudioName,
            audioByteSize: episode.data.audioByteSize,
            audioDurationSeconds: episode.data.audioDurationSeconds,
            episodeCoverGcsName: episode.data.gcsEpisodeCoverName,
            episodeId: episode.id,
        });
    }

    // Sort by publishedAt descending
    results.sort((a, b) => b.publishedAt.toMillis() - a.publishedAt.toMillis());

    return results;
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

    // Episodes with a linked RichPod must be deleted through deleteRichPod (cascade).
    if (episodeData.richPod) {
        throw new Error(
            "Cannot delete an episode with a linked RichPod. Delete the RichPod instead.",
        );
    }

    const podcastId = episodeData.hostedPodcast.id;

    // Delete GCS files for this episode
    await deleteEpisodeFiles(podcastId, episodeId);

    // Delete the hosted episode doc and its validation record
    await episodeRef.delete();
    await db.collection(AUDIO_VALIDATIONS_COLLECTION).doc(episodeId).delete();

    console.info(
        `Deleted hosted episode: episodeId=${episodeId}, podcastId=${podcastId}, user=${editorUserId}`,
    );
    return true;
}

