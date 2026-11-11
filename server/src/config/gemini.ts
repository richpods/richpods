import { parseIntEnv, parseListEnv } from "../utils/env.js";

const ONE_MEGABYTE = 1024 * 1024;

export const geminiConfig = {
    maxFileSizeBytes: parseIntEnv("GEMINI_MAX_FILE_SIZE", 30 * ONE_MEGABYTE, {
        min: ONE_MEGABYTE,
    }),
    maxAudioLengthSeconds: parseIntEnv("GEMINI_MAX_AUDIO_LENGTH", 30 * 60, { min: 1 }),
    allowedMimeTypes: parseListEnv("GEMINI_ALLOWED_MIME_TYPES", ["audio/mpeg"]),
};

export const aiGenerationConfig = {
    inFlightTimeoutMs: parseIntEnv("AI_GENERATION_INFLIGHT_TIMEOUT_MS", 65 * 60 * 1000, {
        min: 60 * 1000,
    }),
    rateLimitPerUser: parseIntEnv("AI_GENERATION_RATE_LIMIT_PER_USER", 10, { min: 1 }),
    rateLimitWindowSeconds: parseIntEnv("AI_GENERATION_RATE_LIMIT_WINDOW_SECONDS", 60 * 60, {
        min: 1,
    }),
};
