const ONE_MEGABYTE = 1024 * 1024;

function parseIntEnv(key: string, defaultValue: number): number {
    const raw = process.env[key]?.trim();
    if (!raw) return defaultValue;
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
}

function parseListEnv(key: string, defaultValue: string[]): string[] {
    const raw = process.env[key]?.trim();
    if (!raw) return defaultValue;
    const items = raw
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    return items.length > 0 ? items : defaultValue;
}

/**
 * Read a required environment variable, throwing at module load so a missing
 * value fails the function instance on cold start instead of surfacing later as
 * an opaque runtime error (e.g. `storage.bucket("")`).
 */
function requireEnv(key: string): string {
    const value = process.env[key]?.trim() ?? "";
    if (value.length <= 2) {
        throw new Error(`${key} environment variable is required`);
    }
    return value;
}

const DEFAULT_SUMMARY_MODEL = "gemini-3-flash-preview";
const DEFAULT_CHAPTER_MODEL = "gemini-3-flash-preview";

// Chirp transcription (Speech-to-Text v2) uses two models depending on audio
// length. Short audio uses Chirp 3 — newer and higher quality — which emits
// word-level timestamps only up to ~20 minutes. Longer audio uses Chirp 2, which
// supports word-level timestamps with no length-related cap (BatchRecognize
// accepts up to 8h).
// The two models live in different locations: chirp_3 in the `eu` multi-region,
// chirp_2 in the `europe-west4` region — each needs its own regional endpoint.
const DEFAULT_CHIRP3_API_ENDPOINT = "eu-speech.googleapis.com";
const DEFAULT_CHIRP3_LOCATION = "eu";
const DEFAULT_CHIRP3_MODEL = "chirp_3";

const DEFAULT_CHIRP2_API_ENDPOINT = "europe-west4-speech.googleapis.com";
const DEFAULT_CHIRP2_LOCATION = "europe-west4";
const DEFAULT_CHIRP2_MODEL = "chirp_2";

// Audio at or beyond this length is transcribed with Chirp 2; shorter audio uses
// Chirp 3. Both emit word-level timestamps, but 20 minutes is the limit beyond
// which Chirp 3 stops emitting them.
const DEFAULT_CHIRP_WORD_TIMESTAMP_THRESHOLD_SECONDS = (20 * 60) - 5;

/**
 * Resolve the Gemini model for one task: the task-specific override, or the task
 * default.
 */
function resolveModel(taskEnvKey: string, defaultModel: string): string {
    return process.env[taskEnvKey]?.trim() || defaultModel;
}

export const config = {
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    // Google Maps Geocoding API key. Optional: when unset, place suggestions fall
    // back to the model's own (approximate) coordinates instead of authoritative
    // geocoded ones.
    geocodingApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
    chapterModel: resolveModel("GEMINI_CHAPTER_MODEL", DEFAULT_CHAPTER_MODEL),
    // Used to summarize Chirp transcripts (Chirp emits no summary). A cheap Flash
    // model fits.
    summaryModel: resolveModel("GEMINI_SUMMARY_MODEL", DEFAULT_SUMMARY_MODEL),
    // Short-audio model.
    chirp3: {
        apiEndpoint: process.env.CHIRP3_API_ENDPOINT?.trim() || DEFAULT_CHIRP3_API_ENDPOINT,
        location: process.env.CHIRP3_LOCATION?.trim() || DEFAULT_CHIRP3_LOCATION,
        model: process.env.CHIRP3_MODEL?.trim() || DEFAULT_CHIRP3_MODEL,
    },
    // Long-audio model.
    chirp2: {
        apiEndpoint: process.env.CHIRP2_API_ENDPOINT?.trim() || DEFAULT_CHIRP2_API_ENDPOINT,
        location: process.env.CHIRP2_LOCATION?.trim() || DEFAULT_CHIRP2_LOCATION,
        model: process.env.CHIRP2_MODEL?.trim() || DEFAULT_CHIRP2_MODEL,
    },
    chirpWordTimestampThresholdSeconds: parseIntEnv(
        "CHIRP_WORD_TIMESTAMP_THRESHOLD_SECONDS",
        DEFAULT_CHIRP_WORD_TIMESTAMP_THRESHOLD_SECONDS,
    ),
    maxFileSizeBytes: parseIntEnv("GEMINI_MAX_FILE_SIZE", 30 * ONE_MEGABYTE),
    maxAudioLengthSeconds: parseIntEnv("GEMINI_MAX_AUDIO_LENGTH", 30 * 60),
    allowedMimeTypes: parseListEnv("GEMINI_ALLOWED_MIME_TYPES", ["audio/mpeg"]),
    transcriptBucketName: requireEnv("GCS_TRANSCRIPT_BUCKET_NAME"),
    hostedBucketName: process.env.GCS_HOSTED_BUCKET_NAME || "",
    databaseId: process.env.FIRESTORE_DATABASE_ID || "(default)",
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
};
