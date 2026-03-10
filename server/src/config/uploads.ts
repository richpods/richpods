import { parseIntEnv } from "../utils/env.js";

const ONE_MEGABYTE = 1024 * 1024;

export const uploadConfig = {
    bucketName: process.env.GCS_UPLOAD_BUCKET_NAME || "",
    timeoutMs: parseIntEnv("UPLOAD_TIMEOUT_MS", 60_000, { min: 1_000 }),
    maxFileSizeBytes: parseIntEnv("UPLOAD_MAX_FILE_SIZE_BYTES", 10 * ONE_MEGABYTE, {
        min: ONE_MEGABYTE,
    }),
    minDimensionPx: parseIntEnv("UPLOAD_MIN_DIMENSION_PX", 320, { min: 1 }),
    maxDimensionPx: parseIntEnv("UPLOAD_MAX_DIMENSION_PX", 5_000, { min: 1 }),
    perUserRateLimitPerMinute: parseIntEnv("UPLOAD_RATE_LIMIT_PER_USER", 20, { min: 1 }),
    globalRateLimitPerMinute: parseIntEnv("UPLOAD_RATE_LIMIT_GLOBAL", 100, { min: 1 }),
    defaultUserQuotaBytes: parseIntEnv("UPLOAD_DEFAULT_USER_QUOTA_BYTES", 50 * ONE_MEGABYTE, {
        min: ONE_MEGABYTE,
    }),
    quotaCacheTtlMs: parseIntEnv("UPLOAD_QUOTA_CACHE_TTL_MS", 30_000, { min: 1_000 }),
    quotaCacheMaxEntries: parseIntEnv("UPLOAD_QUOTA_CACHE_MAX_ENTRIES", 500, { min: 10 }),
};

export const allowedImageMimeTypes: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
};