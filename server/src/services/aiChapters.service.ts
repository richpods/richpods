import { CloudTasksClient } from "@google-cloud/tasks";
import { FieldValue } from "@google-cloud/firestore";
import {
    db,
    RICHPODS_COLLECTION,
    CHAPTERS_SUBCOLLECTION,
    CHAPTER_GENERATIONS_COLLECTION,
    TRANSCRIPT_GENERATIONS_COLLECTION,
    TRANSCRIPTIONS_COLLECTION,
} from "../config/firestore.js";
import { geminiConfig } from "../config/gemini.js";
import { cloudTasksConfig, genAiTasksQueue } from "../config/tasks.js";
import {
    ChapterGenerationState as FsChapterGenerationState,
    RichPodState as FirestoreRichPodState,
} from "../types/firestore.js";
import type {
    ChapterGenerationDocument,
    ChapterGenerationStateValue,
    RichPodDocument,
    TranscriptionDocument,
    UserRoleValue,
} from "../types/firestore.js";
import { isPrivilegedRole } from "@richpods/shared/utils/roles";
import { ChapterGenerationState as GqlChapterGenerationState } from "../graphql.js";
import type { ChapterGenerationStatus, Transcript } from "../graphql.js";
import { verifyLockHeldOrThrow } from "./lock.service.js";
import { mapEnclosureToGraphQL } from "./richpod.service.js";
import { getUserReference } from "./user.service.js";
import { getHostedEpisodeDoc } from "./hosted-episode.service.js";
import { downloadTranscriptObject } from "./storage.service.js";

type GenerationMode = "transcript" | "chapters";
type StoredTranscriptSegment = {
    begin: string;
    end: string;
    text: string;
    language: string;
    emotion?: string;
    speaker?: string;
};
type StoredTranscript = {
    summary: string;
    language: string;
    segments: StoredTranscriptSegment[];
};

const EMPTY_STATUS: ChapterGenerationStatus = {
    state: GqlChapterGenerationState.None,
    error: null,
    suggestions: [],
    updatedAt: null,
    canRegenerate: true,
};

const STATE_MAP: Record<ChapterGenerationStateValue, GqlChapterGenerationState> = {
    [FsChapterGenerationState.PENDING]: GqlChapterGenerationState.Pending,
    [FsChapterGenerationState.TRANSCRIBING]: GqlChapterGenerationState.Transcribing,
    [FsChapterGenerationState.GENERATING]: GqlChapterGenerationState.Generating,
    [FsChapterGenerationState.COMPLETED]: GqlChapterGenerationState.Completed,
    [FsChapterGenerationState.FAILED]: GqlChapterGenerationState.Failed,
};

type AudioInfo = {
    mimeType: string;
    byteSize: number | null;
    durationSeconds: number | null;
};

// Re-generating chapter suggestions is expensive, so a re-run is only permitted
// once the editor has pruned some chapters produced by the previous run.
const REGENERATE_MIN_DELETED = 5;
const REGENERATE_DELETED_FRACTION = 0.5;

/**
 * Decide whether a (re-)generation may be started right now. The first run is
 * always allowed. Once suggestions are cached, a re-run requires that more than
 * `REGENERATE_MIN_DELETED` chapters — or more than half — have been deleted
 * since the suggestions were applied, measured against `baselineChapterCount`.
 */
function isRegenerationAllowed(
    baselineChapterCount: number,
    currentChapterCount: number,
    hasCachedSuggestions: boolean,
): boolean {
    if (!hasCachedSuggestions) return true;
    const deleted = baselineChapterCount - currentChapterCount;
    return (
        deleted > REGENERATE_MIN_DELETED ||
        deleted > baselineChapterCount * REGENERATE_DELETED_FRACTION
    );
}

/**
 * Number of chapters in the latest saved chapter version of a RichPod (0 when
 * the RichPod has no chapters yet).
 */
async function getLatestChapterCount(richPodId: string): Promise<number> {
    const latest = await db
        .collection(RICHPODS_COLLECTION)
        .doc(richPodId)
        .collection(CHAPTERS_SUBCOLLECTION)
        .orderBy("version", "desc")
        .limit(1)
        .get();
    if (latest.empty) return 0;
    const chapters = latest.docs[0].data().chapters as unknown[] | undefined;
    return chapters?.length ?? 0;
}

let tasksClient: CloudTasksClient | null = null;
function getTasksClient(): CloudTasksClient {
    if (!tasksClient) {
        tasksClient = new CloudTasksClient();
    }
    return tasksClient;
}

/**
 * Soft gate for the UI, final hard check is done in the Cloud function.
 */
async function resolveAudioInfo(data: RichPodDocument): Promise<AudioInfo> {
    if (data.isHosted && data.hostedEpisodeId) {
        const episode = await getHostedEpisodeDoc(data.hostedEpisodeId);
        if (episode) {
            return {
                mimeType: episode.data.audioMimeType,
                byteSize: episode.data.audioByteSize,
                durationSeconds: episode.data.audioDurationSeconds,
            };
        }
    }

    const media = data.origin.episode.media;
    return { mimeType: media.type, byteSize: media.length, durationSeconds: null };
}

function assertAudioEligible(info: AudioInfo): void {
    if (!geminiConfig.allowedMimeTypes.includes(info.mimeType)) {
        throw new Error(
            `AI chapter generation only supports ${geminiConfig.allowedMimeTypes.join(", ")} audio`,
        );
    }
    if (info.byteSize !== null && info.byteSize > geminiConfig.maxFileSizeBytes) {
        throw new Error("The episode audio file is too large for AI chapter generation");
    }
    if (info.durationSeconds !== null && info.durationSeconds > geminiConfig.maxAudioLengthSeconds) {
        throw new Error("The episode audio is too long for AI chapter generation");
    }
}

async function enqueueChapterGeneration(
    richPodId: string,
    requestedByUserId: string,
    mode: GenerationMode,
): Promise<void> {
    if (!genAiTasksQueue.url) {
        throw new Error("Chapter generation function URL is not configured");
    }

    const payloadBody = JSON.stringify({ richPodId, requestedByUserId, mode });

    // Local development: invoke the function's HTTP endpoint directly
    // (fire-and-forget) since Cloud Tasks has no local emulator. The editor
    // tracks progress by polling the status document.
    if (cloudTasksConfig.directInvoke) {
        void fetch(genAiTasksQueue.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payloadBody,
        }).catch((error) => {
            console.error("Direct chapter-generation invocation failed:", error);
        });
        return;
    }

    if (!genAiTasksQueue.queue) {
        throw new Error("Cloud Tasks dispatch for chapter generation is not configured");
    }

    const client = getTasksClient();
    const parent = client.queuePath(
        cloudTasksConfig.project,
        cloudTasksConfig.location,
        genAiTasksQueue.queue,
    );

    await client.createTask({
        parent,
        task: {
            httpRequest: {
                httpMethod: "POST",
                url: genAiTasksQueue.url,
                headers: { "Content-Type": "application/json" },
                body: Buffer.from(payloadBody).toString("base64"),
                oidcToken: cloudTasksConfig.invokerServiceAccount
                    ? { serviceAccountEmail: cloudTasksConfig.invokerServiceAccount }
                    : undefined,
            },
        },
    });
}

function mapStatus(
    data: ChapterGenerationDocument,
    canRegenerate = false,
): ChapterGenerationStatus {
    return {
        state: STATE_MAP[data.state] ?? GqlChapterGenerationState.Pending,
        error: data.error ?? null,
        suggestions: (data.suggestions ?? []).map((suggestion) => ({
            begin: suggestion.begin,
            enclosure: mapEnclosureToGraphQL(suggestion.enclosureType, suggestion.enclosure),
        })),
        updatedAt: data.updatedAt?.toDate().toISOString() ?? null,
        canRegenerate,
    };
}

type GenerationStatusCollection =
    | typeof CHAPTER_GENERATIONS_COLLECTION
    | typeof TRANSCRIPT_GENERATIONS_COLLECTION;

/**
 * Write (or reset) the pending status document the editor polls. Transcript and
 * chapter jobs use separate collections so their progress can never overwrite
 * each other; the shape is identical, so writing to Firestore is shared.
 */
async function writePendingStatus(
    collection: GenerationStatusCollection,
    richPodId: string,
    userId: string,
): Promise<ChapterGenerationStatus> {
    const docRef = db.collection(collection).doc(richPodId);
    const existing = await docRef.get();

    await docRef.set({
        richPod: db.collection(RICHPODS_COLLECTION).doc(richPodId),
        requestedBy: getUserReference(userId),
        state: FsChapterGenerationState.PENDING,
        error: null,
        suggestions: [],
        createdAt: existing.exists ? existing.data()!.createdAt : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });

    const written = await docRef.get();
    return mapStatus(written.data() as ChapterGenerationDocument);
}

async function readStatus(
    collection: GenerationStatusCollection,
    richPodId: string,
): Promise<ChapterGenerationStatus> {
    const snap = await db.collection(collection).doc(richPodId).get();
    if (!snap.exists) {
        return EMPTY_STATUS;
    }
    return mapStatus(snap.data() as ChapterGenerationDocument);
}

async function loadOwnedRichPod(richPodId: string, userId: string): Promise<RichPodDocument> {
    const snap = await db.collection(RICHPODS_COLLECTION).doc(richPodId).get();
    if (!snap.exists) {
        throw new Error("RichPod not found");
    }
    const data = snap.data() as RichPodDocument;
    if (data.state === FirestoreRichPodState.DELETED) {
        throw new Error("RichPod not found");
    }
    if (data.editor.id !== userId) {
        throw new Error("Unauthorized: You can only generate chapters for your own RichPods");
    }
    return data;
}

/**
 * AI features (transcription and chapter generation) are available only for
 * verified podcasts. Privileged users bypass this and may use them for any
 * podcast.
 */
function assertAiFeaturesAllowed(
    richPod: RichPodDocument,
    userRole: UserRoleValue | null | undefined,
): void {
    if (isPrivilegedRole(userRole)) {
        return;
    }
    if (richPod.origin?.verified) {
        return;
    }
    throw new Error("AI features are only available for verified podcasts");
}

async function loadRegenerationGate(
    richPodId: string,
): Promise<{ canRegenerate: boolean; data: ChapterGenerationDocument | null }> {
    const [genSnap, currentChapterCount] = await Promise.all([
        db.collection(CHAPTER_GENERATIONS_COLLECTION).doc(richPodId).get(),
        getLatestChapterCount(richPodId),
    ]);

    if (!genSnap.exists) {
        return { canRegenerate: true, data: null };
    }

    const data = genSnap.data() as ChapterGenerationDocument;
    const suggestionCount = data.suggestions?.length ?? 0;
    const hasCachedSuggestions =
        data.state === FsChapterGenerationState.COMPLETED && suggestionCount > 0;

    const baseline = data.baselineChapterCount ?? suggestionCount;
    return {
        canRegenerate: isRegenerationAllowed(baseline, currentChapterCount, hasCachedSuggestions),
        data,
    };
}

export async function startChapterGeneration(
    richPodId: string,
    userId: string,
    sessionId: string,
    userRole?: UserRoleValue | null,
): Promise<ChapterGenerationStatus> {
    const data = await loadOwnedRichPod(richPodId, userId);
    assertAiFeaturesAllowed(data, userRole);
    verifyLockHeldOrThrow(data, sessionId);

    const transcript = await db.collection(TRANSCRIPTIONS_COLLECTION).doc(richPodId).get();
    if (!transcript.exists) {
        throw new Error("Generate a transcript before generating chapters");
    }

    const { canRegenerate } = await loadRegenerationGate(richPodId);
    if (!canRegenerate) {
        throw new Error(
            "Chapter suggestions are already available. Delete more than 5 chapters, or over " +
                "half of them, before regenerating.",
        );
    }

    const status = await writePendingStatus(CHAPTER_GENERATIONS_COLLECTION, richPodId, userId);
    await enqueueChapterGeneration(richPodId, userId, "chapters");
    return status;
}

export async function recordChapterGenerationBaseline(
    richPodId: string,
    userId: string,
    sessionId: string,
    userRole?: UserRoleValue | null,
): Promise<ChapterGenerationStatus> {
    const data = await loadOwnedRichPod(richPodId, userId);
    assertAiFeaturesAllowed(data, userRole);
    verifyLockHeldOrThrow(data, sessionId);

    const baselineChapterCount = await getLatestChapterCount(richPodId);
    await db
        .collection(CHAPTER_GENERATIONS_COLLECTION)
        .doc(richPodId)
        .set({ baselineChapterCount }, { merge: true });

    return getChapterGenerationStatus(richPodId, userId);
}

export async function startTranscriptGeneration(
    richPodId: string,
    userId: string,
    sessionId: string,
    userRole?: UserRoleValue | null,
): Promise<ChapterGenerationStatus> {
    const data = await loadOwnedRichPod(richPodId, userId);
    assertAiFeaturesAllowed(data, userRole);
    verifyLockHeldOrThrow(data, sessionId);

    assertAudioEligible(await resolveAudioInfo(data));

    const status = await writePendingStatus(TRANSCRIPT_GENERATIONS_COLLECTION, richPodId, userId);
    await enqueueChapterGeneration(richPodId, userId, "transcript");
    return status;
}

export async function getChapterGenerationStatus(
    richPodId: string,
    userId: string,
): Promise<ChapterGenerationStatus> {
    await loadOwnedRichPod(richPodId, userId);

    const { canRegenerate, data } = await loadRegenerationGate(richPodId);
    if (!data) {
        return EMPTY_STATUS;
    }
    return mapStatus(data, canRegenerate);
}

export async function getTranscriptGenerationStatus(
    richPodId: string,
    userId: string,
): Promise<ChapterGenerationStatus> {
    await loadOwnedRichPod(richPodId, userId);
    return readStatus(TRANSCRIPT_GENERATIONS_COLLECTION, richPodId);
}

export async function getRichPodTranscript(
    richPodId: string,
    userId: string,
): Promise<Transcript | null> {
    await loadOwnedRichPod(richPodId, userId);

    const snap = await db.collection(TRANSCRIPTIONS_COLLECTION).doc(richPodId).get();
    if (!snap.exists) {
        return null;
    }

    const doc = snap.data() as TranscriptionDocument;
    const stored = await downloadTranscriptObject<StoredTranscript>(doc.gcsTranscriptName);
    if (!stored) {
        return null;
    }

    return {
        language: stored.language ?? doc.language,
        summary: stored.summary ?? doc.summary,
        segments: (stored.segments ?? []).map((segment) => ({
            begin: segment.begin,
            end: segment.end,
            text: segment.text,
            language: segment.language,
            speaker: segment.speaker ?? null,
        })),
    };
}
