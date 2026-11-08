import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { uploadConfig } from "../config/uploads.js";
import { verificationConfig } from "../config/verification.js";

export type RateLimitScope = "user" | "global";

export type RateLimitResult =
    | { ok: true }
    | { ok: false; scope: RateLimitScope; retryAfterMs: number };

const uploadPerUserLimiter = new RateLimiterMemory({
    keyPrefix: "upload-user",
    points: uploadConfig.perUserRateLimitPerMinute,
    duration: 60,
});

const uploadGlobalLimiter = new RateLimiterMemory({
    keyPrefix: "upload-global",
    points: uploadConfig.globalRateLimitPerMinute,
    duration: 60,
});

const verificationEmailGlobalLimiter = new RateLimiterMemory({
    keyPrefix: "verification-email-global",
    points: verificationConfig.globalRateLimitPerHour,
    duration: 60 * 60,
});

function mapLimiterError(scope: RateLimitScope, error: RateLimiterRes): RateLimitResult {
    return {
        ok: false,
        scope,
        retryAfterMs: error.msBeforeNext ?? 0,
    };
}

export async function consumeUploadSlot(userId: string): Promise<RateLimitResult> {
    try {
        await uploadPerUserLimiter.consume(userId);
    } catch (error) {
        if (error instanceof RateLimiterRes) {
            return mapLimiterError("user", error);
        }
        throw error;
    }

    try {
        await uploadGlobalLimiter.consume("global");
    } catch (error) {
        if (error instanceof RateLimiterRes) {
            await uploadPerUserLimiter.reward(userId, 1);
            return mapLimiterError("global", error);
        }
        throw error;
    }

    return { ok: true };
}

export async function consumeVerificationEmailSlot(): Promise<RateLimitResult> {
    try {
        await verificationEmailGlobalLimiter.consume("global");
        return { ok: true };
    } catch (error) {
        if (error instanceof RateLimiterRes) {
            return mapLimiterError("global", error);
        }
        throw error;
    }
}
