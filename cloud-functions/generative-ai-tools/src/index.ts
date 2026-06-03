import { http, type Request, type Response } from "@google-cloud/functions-framework";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config.js";
import { downloadExternalAudio, probeAudioDuration, verifyExternalAudio } from "./audio.js";
import { transcribeWithChirp } from "./chirp.js";
import { analyzeTranscript, summarizeTranscript } from "./gemini.js";
import { elapsedSeconds, formatTranscriptionTiming, log, logError, logWarn } from "./log.js";
import { buildSuggestions } from "./suggestions.js";
import { validateTranscript } from "./transcript.js";
import {
    CHAPTERS_SUBCOLLECTION,
    CHAPTER_GENERATIONS_COLLECTION,
    ChapterGenerationState,
    HOSTED_EPISODES_COLLECTION,
    RICHPODS_COLLECTION,
    TRANSCRIPTIONS_COLLECTION,
    TRANSCRIPT_GENERATIONS_COLLECTION,
} from "./types.js";
import type {
    AudioSource,
    ChapterGenerationStateValue,
    ChapterSuggestion,
    Transcript,
} from "./types.js";

const GCS_IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

console.log(`Using: ${config.projectId} - ${config.databaseId}`);

const db = new Firestore({
    databaseId: config.databaseId,
    projectId: config.projectId,
    ignoreUndefinedProperties: true,
});

const storage = new Storage({ projectId: config.projectId });

type RichPodMediaDoc = {
    isHosted?: boolean;
    hostedEpisodeId?: string;
    origin: { episode: { media: { url: string; type: string; length: number } } };
};

type HostedEpisodeDoc = {
    gcsAudioName: string;
    audioMimeType: string;
    audioByteSize: number;
    audioDurationSeconds: number | null;
};

function hostedPublicUrl(gcsName: string): string {
    const encodedPath = gcsName.split("/").map(encodeURIComponent).join("/");
    return `https://storage.googleapis.com/${config.hostedBucketName}/${encodedPath}`;
}

// Transcript and chapter jobs track their progress in separate status
// collections so the two job types can never overwrite each other's state. The
// "transcript" mode transcribes with Chirp (Speech-to-Text v2).
type GenerationMode = "transcript" | "chapters";

const GENERATION_COLLECTION: Record<GenerationMode, string> = {
    transcript: TRANSCRIPT_GENERATIONS_COLLECTION,
    chapters: CHAPTER_GENERATIONS_COLLECTION,
};

async function writeState(
    richPodId: string,
    collection: string,
    update: {
        state: ChapterGenerationStateValue;
        error?: string | null;
        suggestions?: ChapterSuggestion[];
    },
): Promise<void> {
    const payload: Record<string, unknown> = {
        state: update.state,
        updatedAt: FieldValue.serverTimestamp(),
    };
    if (update.error !== undefined) payload.error = update.error;
    if (update.suggestions !== undefined) payload.suggestions = update.suggestions;

    await db.collection(collection).doc(richPodId).set(payload, { merge: true });
}

async function loadRichPod(richPodId: string): Promise<RichPodMediaDoc> {
    const snap = await db.collection(RICHPODS_COLLECTION).doc(richPodId).get();
    if (!snap.exists) {
        throw new Error("RichPod not found");
    }
    return snap.data() as RichPodMediaDoc;
}

async function getExistingChapterBegins(richPodId: string): Promise<string[]> {
    const latest = await db
        .collection(RICHPODS_COLLECTION)
        .doc(richPodId)
        .collection(CHAPTERS_SUBCOLLECTION)
        .orderBy("version", "desc")
        .limit(1)
        .get();
    if (latest.empty) return [];
    const chapters =
        (latest.docs[0].data().chapters as Array<{ begin?: unknown }> | undefined) ?? [];
    return chapters
        .map((chapter) => chapter.begin)
        .filter((begin): begin is string => typeof begin === "string");
}

async function resolveAudioSource(richpod: RichPodMediaDoc): Promise<AudioSource> {
    if (richpod.isHosted && richpod.hostedEpisodeId) {
        const episodeSnap = await db
            .collection(HOSTED_EPISODES_COLLECTION)
            .doc(richpod.hostedEpisodeId)
            .get();
        if (!episodeSnap.exists) {
            throw new Error("Hosted episode not found");
        }
        const episode = episodeSnap.data() as HostedEpisodeDoc;

        if (!config.allowedMimeTypes.includes(episode.audioMimeType)) {
            throw new Error(`Unsupported audio MIME type: ${episode.audioMimeType}`);
        }
        if (episode.audioByteSize > config.maxFileSizeBytes) {
            throw new Error("The episode audio file is too large for AI chapter generation");
        }
        if (
            episode.audioDurationSeconds !== null &&
            episode.audioDurationSeconds > config.maxAudioLengthSeconds
        ) {
            throw new Error("The episode audio is too long for AI chapter generation");
        }

        return {
            url: hostedPublicUrl(episode.gcsAudioName),
            mimeType: episode.audioMimeType,
            byteSize: episode.audioByteSize,
            durationSeconds: episode.audioDurationSeconds,
            trusted: true,
            gcsAudioName: episode.gcsAudioName,
        };
    }

    const media = richpod.origin.episode.media;
    const { byteSize } = await verifyExternalAudio(
        media.url,
        media.type,
        config.allowedMimeTypes,
        config.maxFileSizeBytes,
    );

    return {
        url: media.url,
        mimeType: media.type,
        byteSize,
        durationSeconds: null,
        trusted: false,
    };
}

/**
 * Fetch the raw audio bytes for upload to the Gemini Files API. Hosted episodes
 * are read from our own GCS bucket; external (untrusted) episodes are fetched
 * from their URL after the security checks have already passed.
 */
async function downloadAudio(source: AudioSource): Promise<Uint8Array> {
    if (source.gcsAudioName) {
        const [buffer] = await storage
            .bucket(config.hostedBucketName)
            .file(source.gcsAudioName)
            .download();
        return buffer;
    }
    return downloadExternalAudio(source.url, config.maxFileSizeBytes);
}

/**
 * Resolve the audio duration (seconds) via ffprobe and enforce the
 * GEMINI_MAX_AUDIO_LENGTH cap before the metered transcription call. Returns the
 * resolved duration (or null when ffprobe is unavailable or cannot determine it)
 * so it can be handed to the transcription prompt as the audio's true length.
 * When the duration cannot be determined the cap cannot be enforced — log and
 * fall through rather than rejecting a valid (size-capped) file.
 */
async function resolveAndCheckDuration(
    richPodId: string,
    source: AudioSource,
    audioBytes: Uint8Array,
): Promise<number | null> {
    const durationSeconds = await probeAudioDuration(audioBytes, richPodId);

    if (durationSeconds === null) {
        log(
            richPodId,
            `Could not determine audio duration for ${source.mimeType}; duration cap not enforced`,
        );
        return null;
    }

    log(
        richPodId,
        `Audio duration ≈ ${Math.round(durationSeconds)}s (cap ${config.maxAudioLengthSeconds}s)`,
    );
    if (durationSeconds > config.maxAudioLengthSeconds) {
        throw new Error("The episode audio is too long for AI chapter generation");
    }
    return durationSeconds;
}

type TranscriptProvider = "chirp";

/**
 * Load the cached transcript for a RichPod, or null if it has never been
 * transcribed. Used by chapter generation, which requires an existing
 * transcript and never transcribes on its own. When `requiredProvider` is set,
 * a transcript produced by a different provider is treated as a miss so the
 * caller regenerates it (e.g. Chirp never reuses a legacy Gemini transcript).
 */
type ResolvedTranscript = { transcript: Transcript; durationSeconds: number | null };

async function loadCachedTranscript(
    richPodId: string,
    requiredProvider?: TranscriptProvider,
): Promise<ResolvedTranscript | null> {
    const existing = await db.collection(TRANSCRIPTIONS_COLLECTION).doc(richPodId).get();
    if (!existing.exists) return null;
    const data = existing.data()!;
    if (requiredProvider && (data.provider as string | undefined) !== requiredProvider) return null;
    const gcsTranscriptName = data.gcsTranscriptName as string;
    const durationSeconds =
        typeof data.audioDurationSeconds === "number" ? data.audioDurationSeconds : null;
    log(richPodId, `Reusing cached transcript from gs://.../${gcsTranscriptName}`);
    const [buffer] = await storage
        .bucket(config.transcriptBucketName)
        .file(gcsTranscriptName)
        .download();
    return {
        transcript: validateTranscript(JSON.parse(buffer.toString("utf-8"))),
        durationSeconds,
    };
}

/**
 * Persist a transcript: write the immutable JSON object to GCS and (re)write the
 * transcription document the server reads. `.set` replaces the document so a
 * regenerated transcript fully supersedes any earlier provider's entry.
 */
async function storeTranscript(
    richPodId: string,
    transcript: Transcript,
    durationSeconds: number | null,
    provider: TranscriptProvider,
): Promise<void> {
    const gcsTranscriptName = `transcripts/${richPodId}/${uuidv4()}.json`;
    log(richPodId, `Storing transcript at ${gcsTranscriptName} (provider=${provider})`);
    await storage
        .bucket(config.transcriptBucketName)
        .file(gcsTranscriptName)
        .save(JSON.stringify(transcript), {
            metadata: {
                contentType: "application/json",
                cacheControl: GCS_IMMUTABLE_CACHE_CONTROL,
                metadata: { richPodId },
            },
        });

    await db.collection(TRANSCRIPTIONS_COLLECTION).doc(richPodId).set({
        richPod: db.collection(RICHPODS_COLLECTION).doc(richPodId),
        gcsTranscriptName,
        language: transcript.language,
        summary: transcript.summary,
        audioDurationSeconds: durationSeconds,
        provider,
        createdAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Download a Chirp GCS output object as raw bytes. Chirp reports the exact
 * result-file URI in the operation response, so the bucket and object are taken
 * verbatim from that gs:// URI rather than assumed.
 */
async function downloadGcsObject(gcsUri: string): Promise<Buffer> {
    const match = /^gs:\/\/([^/]+)\/(.+)$/.exec(gcsUri);
    if (!match) {
        throw new Error(`Unexpected GCS URI from Chirp: ${gcsUri}`);
    }
    const [, bucketName, objectName] = match;
    const [buffer] = await storage.bucket(bucketName).file(objectName).download();
    return buffer;
}

/**
 * Stage the GCS in/out locations for one Chirp run. Chirp's BatchRecognize only
 * reads from and writes to GCS: it reads the input audio (hosted episodes in
 * place; external episodes downloaded — after the security checks — and staged in
 * the transcript bucket) and writes the transcript JSON under an output prefix in
 * the transcript bucket. Writing results to GCS (rather than inline) keeps long
 * episodes from overflowing the size-capped inline response. The returned
 * `cleanup` removes both the staged input (if any) and every output object.
 */
async function prepareChirpGcs(
    richPodId: string,
    source: AudioSource,
): Promise<{
    inputUri: string;
    outputUri: string;
    durationSeconds: number | null;
    cleanup: () => Promise<void>;
}> {
    const bucket = storage.bucket(config.transcriptBucketName);
    const outputPrefix = `chirp-output/${richPodId}/${uuidv4()}`;
    const outputUri = `gs://${config.transcriptBucketName}/${outputPrefix}`;

    const deleteOutput = async () => {
        const [files] = await bucket.getFiles({ prefix: outputPrefix });
        await Promise.all(
            files.map((file) =>
                file.delete().catch((err) => {
                    logWarn(richPodId, `Failed to delete Chirp output ${file.name}:`, err);
                }),
            ),
        );
    };

    if (source.gcsAudioName) {
        const inputUri = `gs://${config.hostedBucketName}/${source.gcsAudioName}`;
        log(richPodId, `Using hosted audio at ${inputUri}`);
        return {
            inputUri,
            outputUri,
            durationSeconds: source.durationSeconds,
            cleanup: deleteOutput,
        };
    }

    log(richPodId, "External audio — staging in GCS for Chirp");
    const audioBytes = await downloadAudio(source);
    log(richPodId, `Downloaded ${audioBytes.byteLength} bytes`);
    const durationSeconds = await resolveAndCheckDuration(richPodId, source, audioBytes);

    const stagedName = `chirp-input/${richPodId}/${uuidv4()}`;
    const inputFile = bucket.file(stagedName);
    log(richPodId, `Staging audio at gs://.../${stagedName}`);
    await inputFile.save(Buffer.from(audioBytes), {
        metadata: { contentType: source.mimeType },
    });

    return {
        inputUri: `gs://${config.transcriptBucketName}/${stagedName}`,
        outputUri,
        durationSeconds,
        cleanup: async () => {
            await inputFile.delete().catch((err) => {
                logWarn(richPodId, `Failed to delete staged Chirp input ${stagedName}:`, err);
            });
            await deleteOutput();
        },
    };
}

async function getOrCreateChirpTranscript(
    richPodId: string,
    source: AudioSource,
): Promise<ResolvedTranscript> {
    const cached = await loadCachedTranscript(richPodId, "chirp");
    if (cached) return cached;

    const staged = await prepareChirpGcs(richPodId, source);
    try {
        const chirp = await transcribeWithChirp(
            staged.inputUri,
            staged.outputUri,
            staged.durationSeconds,
            downloadGcsObject,
            richPodId,
        );
        log(
            richPodId,
            `Chirp produced ${chirp.segments.length} segment(s), language=${chirp.language}`,
        );

        const summary = await summarizeTranscript(chirp.segments, chirp.language, richPodId);
        log(richPodId, `Generated summary (${summary.length} chars)`);

        const transcript = validateTranscript({
            summary,
            language: chirp.language,
            segments: chirp.segments,
        });

        const durationSeconds =
            chirp.durationSeconds ?? staged.durationSeconds ?? source.durationSeconds;
        await storeTranscript(richPodId, transcript, durationSeconds, "chirp");
        return { transcript, durationSeconds };
    } finally {
        await staged.cleanup();
    }
}

/**
 * Step 1 (default) — transcription via Chirp (Speech-to-Text v2). Uses Google's
 * speech recognizer for more accurate timings — Chirp 3 for short audio and Chirp 2
 * for longer audio (both with word-level timestamps), chosen by duration — then generates the
 * summary with Gemini. Produces a validated Transcript that chapter generation
 * consumes unchanged.
 */
async function runTranscriptChirp(richPodId: string): Promise<void> {
    const startedAt = Date.now();
    log(richPodId, "Starting Chirp transcript generation");

    const richpod = await loadRichPod(richPodId);
    log(richPodId, `Loaded RichPod (hosted=${richpod.isHosted === true})`);

    await writeState(richPodId, TRANSCRIPT_GENERATIONS_COLLECTION, {
        state: ChapterGenerationState.TRANSCRIBING,
        error: null,
    });
    log(richPodId, "State → TRANSCRIBING");

    const source = await resolveAudioSource(richpod);
    log(
        richPodId,
        `Resolved audio: mime=${source.mimeType}, size=${source.byteSize ?? "?"} bytes, ` +
            `duration=${source.durationSeconds ?? "?"}s, trusted=${source.trusted}`,
    );

    const { transcript, durationSeconds } = await getOrCreateChirpTranscript(richPodId, source);
    log(
        richPodId,
        `Transcript ready: ${transcript.segments.length} segment(s), language=${transcript.language}`,
    );

    await writeState(richPodId, TRANSCRIPT_GENERATIONS_COLLECTION, {
        state: ChapterGenerationState.COMPLETED,
        error: null,
        suggestions: [],
    });
    log(
        richPodId,
        `State → COMPLETED (chirp transcript) ${formatTranscriptionTiming(startedAt, durationSeconds)}`,
    );
}

/**
 * Step 2 — chapter suggestions. Requires an existing transcript (never
 * transcribes). Re-runnable at any time; existing chapters are passed to the
 * suggestion builder so new suggestions never collide with them.
 */
async function runChapters(richPodId: string): Promise<void> {
    const startedAt = Date.now();
    log(richPodId, "Starting chapter generation");

    await loadRichPod(richPodId);

    const cached = await loadCachedTranscript(richPodId);
    if (!cached) {
        throw new Error("No transcript available — generate a transcript first");
    }
    const { transcript } = cached;

    await writeState(richPodId, CHAPTER_GENERATIONS_COLLECTION, {
        state: ChapterGenerationState.GENERATING,
        error: null,
    });
    log(richPodId, "State → GENERATING");

    const analysis = await analyzeTranscript(transcript, richPodId);
    log(
        richPodId,
        `Analysis complete: ${analysis.topics.length} topic(s), ${analysis.quotes.length} quote(s), ` +
            `${analysis.links.length} link(s), ${analysis.places.length} place(s)`,
    );

    const existingBegins = await getExistingChapterBegins(richPodId);
    log(richPodId, `Avoiding collisions with ${existingBegins.length} existing chapter(s)`);

    const suggestions = await buildSuggestions(transcript, analysis, richPodId, existingBegins);
    log(richPodId, `Built ${suggestions.length} chapter suggestion(s)`);

    await writeState(richPodId, CHAPTER_GENERATIONS_COLLECTION, {
        state: ChapterGenerationState.COMPLETED,
        error: null,
        suggestions,
    });
    log(
        richPodId,
        `State → COMPLETED (chapters) in ${elapsedSeconds(startedAt).toFixed(1)}s`,
    );
}

http("generativeAiTools", async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { richPodId?: unknown; mode?: unknown };
    const richPodId = typeof body.richPodId === "string" ? body.richPodId : "";
    const mode: GenerationMode = body.mode === "chapters" ? "chapters" : "transcript";

    if (!richPodId) {
        res.status(400).json({ error: "richPodId is required" });
        return;
    }

    log(richPodId, `Received ${mode} request`);
    try {
        if (mode === "chapters") {
            await runChapters(richPodId);
        } else {
            await runTranscriptChirp(richPodId);
        }
        res.status(200).json({ ok: true });
    } catch (error) {
        logError(richPodId, `Failed (${mode})`, error);
        const clientMessage =
            mode === "chapters"
                ? "Chapter generation failed. Please try again later."
                : "Transcript generation failed. Please try again later.";
        try {
            await writeState(richPodId, GENERATION_COLLECTION[mode], {
                state: ChapterGenerationState.FAILED,
                error: clientMessage,
                suggestions: [],
            });
        } catch (writeError) {
            logError(richPodId, "Could not record failure state:", writeError);
        }

        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
});
