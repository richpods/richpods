import { parseIntEnv } from "../utils/env.js";

export const verificationConfig = {
    requestTtlMs: parseIntEnv("VERIFICATION_REQUEST_TTL_MS", 10 * 60 * 1000, { min: 60_000 }),
    globalRateLimitPerHour: parseIntEnv("VERIFICATION_RATE_LIMIT_GLOBAL", 20, { min: 1 }),
};
