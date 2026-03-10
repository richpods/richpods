import { parseIntEnv } from "../utils/env.js";

const ONE_MEGABYTE = 1024 * 1024;

export const hostingConfig = {
    bucketName: process.env.GCS_HOSTED_BUCKET_NAME || "",
    mp3MaxFileSizeBytes: parseIntEnv("HOSTED_MP3_MAX_FILE_SIZE_BYTES", 50 * ONE_MEGABYTE, {
        min: ONE_MEGABYTE,
    }),
    imageMaxFileSizeBytes: parseIntEnv("HOSTED_IMAGE_MAX_FILE_SIZE_BYTES", 5 * ONE_MEGABYTE, {
        min: ONE_MEGABYTE,
    }),
    imageMinDimensionPx: 1400,
    imageMaxDimensionPx: 3000,
    mp3MaxDurationMinutes: parseIntEnv("HOSTED_MP3_MAX_DURATION_MINUTES", 150, { min: 1 }),
    mp3MaxBitrateKbps: parseIntEnv("HOSTED_MP3_MAX_BITRATE_KBPS", 256, { min: 64 }),
};

export const allowedCoverMimeTypes: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
};
