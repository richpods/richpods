import { v2 } from "@google-cloud/speech";
import type { protos } from "@google-cloud/speech";
import { config } from "./config.js";
import { log } from "./log.js";
import { formatTimecode } from "./timecode.js";
import type { TranscriptSegment } from "./types.js";

type IDuration = protos.google.protobuf.IDuration;
type ISpeechRecognitionResult = protos.google.cloud.speech.v2.ISpeechRecognitionResult;
type IBatchRecognizeRequest = protos.google.cloud.speech.v2.IBatchRecognizeRequest;

export type ChirpModelConfig = {
    apiEndpoint: string;
    location: string;
    model: string;
    enableWordTimeOffsets: boolean;
};

// Chirp returns the transcript as a sequence of result chunks, each with its
// punctuated + capitalized text and a single result-end-offset timestamp.
//
// We get a stream of timed tokens, which we re-group across the whole
// stream at SENTENCE boundaries so every segment starts at the beginning of a
// sentence: tokens accumulate until the segment reaches MIN_SEGMENT_SECONDS, then
// close on the next sentence-final token. MAX_SEGMENT_SECONDS force-closes a
// segment when speech runs that long without any sentence-ending punctuation
// (e.g. unpunctuated audio).
const MIN_SEGMENT_SECONDS = 3;
const MAX_SEGMENT_SECONDS = 30;

const SENTENCE_FINAL_PUNCTUATION = /[.!?…]$/;
const TRAILING_CLOSERS = /["'”’)\]]+$/;
const LEADING_OPENERS = /^["'“”„‚‘’«»([]+/;
const SINGLE_INITIAL = /^\p{L}\.$/u;

// Common abbreviations whose trailing period is not a sentence boundary, grouped by
// language. Stored lowercased (matching is case-insensitive) and including their
// period(s); multi-word forms like "z. B." also arrive split, which the single
// initial rule in isAbbreviation() covers regardless of language.
const COMMON_ABBREVIATIONS_DE = [
    "z.b.", "u.a.", "d.h.", "usw.", "u.s.w.", "bzw.", "ca.", "etc.", "evtl.",
    "ggf.", "inkl.", "exkl.", "max.", "min.", "mio.", "mrd.", "sog.", "vgl.",
    "v.a.", "z.t.", "u.ä.", "o.ä.", "i.d.r.", "u.u.", "m.e.", "n.chr.", "v.chr.",
    "u.v.m.", "bspw.", "dr.", "prof.", "nr.", "abb.", "bd.", "str.", "tel.",
    "jh.", "jhdt.", "hr.", "fr.", "geb.", "gest.", "lt.", "kap.", "anh.", "ggü.",
    "einschl.", "tsd.", "urspr.", "versch.",
];
const COMMON_ABBREVIATIONS_EN = [
    "mr.", "mrs.", "ms.", "dr.", "prof.", "sr.", "jr.", "st.", "mt.", "messrs.",
    "etc.", "e.g.", "i.e.", "vs.", "viz.", "cf.", "al.", "inc.", "ltd.", "corp.",
    "co.", "dept.", "univ.", "assn.", "bros.", "jan.", "feb.", "mar.", "apr.",
    "jun.", "jul.", "aug.", "sep.", "sept.", "oct.", "nov.", "dec.", "mon.",
    "tue.", "tues.", "wed.", "thu.", "thurs.", "fri.", "sat.", "sun.", "a.m.",
    "p.m.", "approx.", "vol.", "no.", "pp.", "p.", "fig.", "ed.", "est.", "esp.",
    "gov.", "gen.", "sen.", "rep.", "rev.", "hon.", "capt.", "col.", "lt.",
    "sgt.", "cmdr.", "adm.", "maj.", "ave.", "blvd.", "rd.", "u.s.", "u.k.",
    "u.s.a.", "d.c.", "ph.d.", "b.a.", "m.a.", "m.d.",
];

const ABBREVIATIONS_BY_LANGUAGE: Record<string, ReadonlySet<string>> = {
    de: new Set(COMMON_ABBREVIATIONS_DE),
    en: new Set(COMMON_ABBREVIATIONS_EN),
};

const ALL_ABBREVIATIONS: ReadonlySet<string> = new Set([
    ...COMMON_ABBREVIATIONS_DE,
    ...COMMON_ABBREVIATIONS_EN,
]);

function abbreviationsFor(language: string): ReadonlySet<string> {
    return ABBREVIATIONS_BY_LANGUAGE[language.slice(0, 2).toLowerCase()] ?? ALL_ABBREVIATIONS;
}

/**
 * Whether a token's final word is an abbreviation or single-letter initial whose
 * period must not be read as a sentence boundary, given the token's language.
 */
function isAbbreviation(word: string, language: string): boolean {
    if (SINGLE_INITIAL.test(word)) return true;
    return abbreviationsFor(language).has(word.toLowerCase());
}

/**
 * Whether a token ends a sentence. A trailing "!"/"?"/"…" always does; a trailing
 * "." does only when the final word is not a known abbreviation or initial (so
 * "z. B.", "etc.", "Dr." and "J." keep the current segment open).
 */
function endsSentence(text: string, language: string): boolean {
    const trimmed = text.replace(TRAILING_CLOSERS, "");
    if (!SENTENCE_FINAL_PUNCTUATION.test(trimmed)) return false;
    if (!trimmed.endsWith(".")) return true;
    const lastWord = (trimmed.split(/\s+/).pop() ?? "").replace(LEADING_OPENERS, "");
    return !isAbbreviation(lastWord, language);
}

type TimedToken = { text: string; start: number; end: number; language: string };

// One SpeechClient per regional endpoint — Chirp 3 (eu) and Chirp 2 (europe-west4)
// talk to different endpoints, and a client is bound to a single one.
const speechClients = new Map<string, v2.SpeechClient>();

function requireProjectId(): string {
    const projectId = config.projectId?.trim();
    if (!projectId) {
        throw new Error("GOOGLE_CLOUD_PROJECT must be set for Chirp transcription");
    }
    return projectId;
}

function getSpeechClient(apiEndpoint: string): v2.SpeechClient {
    let client = speechClients.get(apiEndpoint);
    if (!client) {
        const projectId = requireProjectId();
        client = new v2.SpeechClient({
            apiEndpoint,
            projectId,
            clientOptions: { quotaProjectId: projectId },
        });
        speechClients.set(apiEndpoint, client);
    }
    return client;
}

/**
 * Pick the Chirp model for an audio file by its length. Chirp 3 only supports
 * word timestamps for < 20 minutes, so use Chirp 2 for longer files.
 */
export function chooseChirpModelConfig(durationSeconds: number | null): ChirpModelConfig {
    const useChirp2 =
        durationSeconds === null ||
        durationSeconds >= config.chirpWordTimestampThresholdSeconds;
    return useChirp2
        ? { ...config.chirp2, enableWordTimeOffsets: true }
        : { ...config.chirp3, enableWordTimeOffsets: true };
}

function durationToSeconds(duration: IDuration | string | null | undefined): number {
    if (!duration) return 0;
    if (typeof duration === "string") {
        return Number.parseFloat(duration) || 0;
    }
    const { seconds, nanos } = duration;
    let whole = 0;
    if (typeof seconds === "number") {
        whole = seconds;
    } else if (typeof seconds === "string") {
        whole = Number.parseInt(seconds, 10) || 0;
    } else if (seconds && typeof (seconds as { toNumber?: () => number }).toNumber === "function") {
        whole = (seconds as { toNumber: () => number }).toNumber();
    }
    const fraction = typeof nanos === "number" ? nanos / 1_000_000_000 : 0;
    return whole + fraction;
}

function makeSegment(
    text: string,
    beginSeconds: number,
    endSeconds: number,
    language: string,
): TranscriptSegment {
    return {
        begin: formatTimecode(beginSeconds),
        end: formatTimecode(Math.max(beginSeconds, endSeconds)),
        text,
        language,
        emotion: "Neutral",
    };
}

/**
 * Turn Chirp's result chunks into a timed-token stream — one token per result,
 * carrying its punctuated transcript and the time span [previous end → this
 * result's end offset]. A `SpeechRecognitionResult` reports only an end offset, so
 * each chunk's start is the running cursor (the previous chunk's end); the offsets
 * are cumulative from the start of the audio.
 */
function toChunkTokens(
    results: ISpeechRecognitionResult[],
    fallbackLanguage: string,
): TimedToken[] {
    const tokens: TimedToken[] = [];
    let cursor = 0;

    for (const result of results) {
        const transcript = (result.alternatives?.[0]?.transcript ?? "").trim();
        const language = result.languageCode || fallbackLanguage;
        const end = durationToSeconds(result.resultEndOffset) || cursor;
        if (transcript) {
            tokens.push({ text: transcript, start: cursor, end, language });
        }
        cursor = end;
    }

    return tokens;
}

/**
 * Turn Chirp's word-level results (Chirp 2 or Chirp 3 with `enableWordTimeOffsets`)
 * into a timed-token stream — one token per recognized word, carrying its own
 * start/end offset. With automatic punctuation, sentence-final punctuation is
 * attached to the word, so sentence-boundary grouping works the same as for
 * chunk tokens.
 */
function toWordTokens(
    results: ISpeechRecognitionResult[],
    fallbackLanguage: string,
): TimedToken[] {
    const tokens: TimedToken[] = [];

    for (const result of results) {
        const language = result.languageCode || fallbackLanguage;
        for (const word of result.alternatives?.[0]?.words ?? []) {
            const text = (word.word ?? "").trim();
            if (!text) continue;
            const start = durationToSeconds(word.startOffset);
            const end = durationToSeconds(word.endOffset);
            tokens.push({ text, start, end: Math.max(start, end), language });
        }
    }

    return tokens;
}

/**
 * Group a timed-token stream into transcript segments aligned to sentence
 * boundaries: a segment is closed on a sentence-final token once it has reached
 * MIN_SEGMENT_SECONDS, so the next segment always begins a new sentence. The
 * MAX_SEGMENT_SECONDS guard force-closes runaway unpunctuated spans. Tokens are
 * either word tokens (the normal path for both Chirp 2 and Chirp 3) or chunk
 * tokens (the fallback when no word offsets are returned) — the grouping is
 * identical for both.
 */
function buildSegmentsFromTokens(tokens: TimedToken[]): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    if (tokens.length === 0) return segments;

    let startIndex = 0;
    let segmentStart = tokens[0].start;

    const flush = (endIndex: number) => {
        const slice = tokens.slice(startIndex, endIndex + 1);
        const text = slice
            .map((token) => token.text)
            .join(" ")
            .trim();
        if (text) {
            const lastEnd = slice[slice.length - 1].end;
            segments.push(makeSegment(text, segmentStart, lastEnd, slice[0].language));
        }
        startIndex = endIndex + 1;
        if (startIndex < tokens.length) segmentStart = tokens[startIndex].start;
    };

    for (let i = 0; i < tokens.length; i += 1) {
        const duration = tokens[i].end - segmentStart;
        if (endsSentence(tokens[i].text, tokens[i].language)) {
            if (duration >= MIN_SEGMENT_SECONDS) flush(i);
        } else if (duration >= MAX_SEGMENT_SECONDS) {
            flush(i);
        }
    }
    if (startIndex < tokens.length) flush(tokens.length - 1);

    return segments;
}

/** Pick the language code spoken across the most words; "und" when none reported. */
function dominantLanguage(results: ISpeechRecognitionResult[]): string {
    const counts = new Map<string, number>();
    for (const result of results) {
        const code = result.languageCode;
        if (!code) continue;
        const transcript = (result.alternatives?.[0]?.transcript ?? "").trim();
        const weight = transcript ? transcript.split(/\s+/).length : 1;
        counts.set(code, (counts.get(code) ?? 0) + weight);
    }
    let best = "";
    let bestCount = -1;
    for (const [code, count] of counts) {
        if (count > bestCount) {
            best = code;
            bestCount = count;
        }
    }
    return best || "und";
}

export type ChirpTranscription = {
    language: string;
    segments: TranscriptSegment[];
    durationSeconds: number | null;
};

/**
 * Parse the `BatchRecognizeResults` JSON that Chirp writes to GCS into the
 * recognition results. The file is proto3-JSON, so durations inside it are
 * strings (e.g. "12.300s") — `durationToSeconds` handles that form.
 */
function parseBatchResults(buffer: Buffer): ISpeechRecognitionResult[] {
    let parsed: unknown;
    try {
        parsed = JSON.parse(buffer.toString("utf-8"));
    } catch (err) {
        const message = err instanceof Error ? err.message : "invalid JSON";
        throw new Error(`Failed to parse Chirp output JSON: ${message}`);
    }
    return (parsed as { results?: ISpeechRecognitionResult[] } | null)?.results ?? [];
}

/**
 * Transcribe a GCS-hosted audio file with Chirp via the Speech-to-Text v2
 * BatchRecognize API. The model is chosen from `durationSeconds`
 * (chooseChirpModelConfig): short audio uses Chirp 3, longer/unknown-length audio
 * uses Chirp 2, and both request word-level timestamps. Both run in
 * language-agnostic mode with automatic punctuation (Chirp capitalizes
 * automatically; v2 has no separate toggle). Results are written by the API to
 * `outputUri` in GCS (rather than returned inline, which is size-capped and fails
 * on long episodes); `readObject` fetches that JSON file, which is mapped onto
 * sentence-aligned transcript segments.
 */
export async function transcribeWithChirp(
    gcsUri: string,
    outputUri: string,
    durationSeconds: number | null,
    readObject: (gcsUri: string) => Promise<Buffer>,
    richPodId: string,
): Promise<ChirpTranscription> {
    const modelConfig = chooseChirpModelConfig(durationSeconds);
    const client = getSpeechClient(modelConfig.apiEndpoint);
    const recognizer = `projects/${requireProjectId()}/locations/${modelConfig.location}/recognizers/_`;

    const request: IBatchRecognizeRequest = {
        recognizer,
        config: {
            model: modelConfig.model,
            languageCodes: ["auto"],
            autoDecodingConfig: {},
            features: {
                enableAutomaticPunctuation: true,
                enableWordTimeOffsets: modelConfig.enableWordTimeOffsets,
            },
        },
        files: [{ uri: gcsUri }],
        recognitionOutputConfig: { gcsOutputConfig: { uri: outputUri } },
    };

    log(
        richPodId,
        `Requesting Chirp transcription (${modelConfig.model} @ ` +
            `${modelConfig.location}, wordTimestamps=${modelConfig.enableWordTimeOffsets}) ` +
            `for ${gcsUri} (duration=${durationSeconds ?? "?"}s)`,
    );
    const [operation] = await client.batchRecognize(request);
    const [response] = await operation.promise();

    const resultsByUri = response.results ?? {};
    const fileResult = resultsByUri[gcsUri] ?? Object.values(resultsByUri)[0];
    if (!fileResult) {
        throw new Error("Chirp returned no result for the audio file");
    }
    if (fileResult.error) {
        throw new Error(`Chirp transcription failed: ${fileResult.error.message ?? "unknown error"}`);
    }

    const outputObjectUri = fileResult.cloudStorageResult?.uri;
    if (!outputObjectUri) {
        throw new Error("Chirp returned no GCS output location");
    }

    const results = parseBatchResults(await readObject(outputObjectUri));
    if (results.length === 0) {
        throw new Error("Chirp produced an empty transcript");
    }

    const language = dominantLanguage(results);
    // Word tokens (Chirp 2 and Chirp 3) when available; fall back to chunk tokens if
    // the model returned no word offsets, so a missing-words response degrades
    // gracefully to chunk-level timing rather than failing outright.
    let tokens = modelConfig.enableWordTimeOffsets
        ? toWordTokens(results, language)
        : toChunkTokens(results, language);
    if (tokens.length === 0) {
        tokens = toChunkTokens(results, language);
    }
    const segments = buildSegmentsFromTokens(tokens);
    if (segments.length === 0) {
        throw new Error("Chirp produced no transcript segments");
    }

    const recognizedDurationSeconds = results.reduce(
        (max, result) => Math.max(max, durationToSeconds(result.resultEndOffset)),
        0,
    );

    return {
        language,
        segments,
        durationSeconds: recognizedDurationSeconds > 0 ? recognizedDurationSeconds : null,
    };
}
