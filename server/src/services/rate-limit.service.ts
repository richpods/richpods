import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { uploadConfig } from "../config/uploads.js";
import { RateLimitScope } from "../types/uploads.js";

const perUserLimiter = new RateLimiterMemory({
    keyPrefix: "upload-user",
    points: uploadConfig.perUserRateLimitPerMinute,
    duration: 60,
});

const globalLimiter = new RateLimiterMemory({
    keyPrefix: "upload-global",
    points: uploadConfig.globalRateLimitPerMinute,
    duration: 60,
});

export type RateLimitResult =
    | { ok: true }
    | { ok: false; scope: RateLimitScope; retryAfterMs: number };

function mapLimiterError(scope: RateLimitScope, error: RateLimiterRes): RateLimitResult {
    return {
        ok: false,
        scope,
        retryAfterMs: error.msBeforeNext ?? 0,
    };
}

export async function consumeUploadSlot(userId: string): Promise<RateLimitResult> {
    try {
        await perUserLimiter.consume(userId);
    } catch (error) {
        if (error instanceof RateLimiterRes) {
            return mapLimiterError("user", error);
        }
        throw error;
    }

    try {
        await globalLimiter.consume("global");
    } catch (error) {
        if (error instanceof RateLimiterRes) {
            await perUserLimiter.reward(userId, 1);
            return mapLimiterError("global", error);
        }
        throw error;
    }

    return { ok: true };
}
