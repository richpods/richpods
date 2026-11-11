import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { uploadConfig } from "../config/uploads.js";
import { verificationConfig } from "../config/verification.js";
import { graphqlConfig } from "../config/graphql.js";
import { aiGenerationConfig } from "../config/gemini.js";

export type RateLimitScope = "user" | "ip" | "global";

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

const graphqlPerUserLimiter = new RateLimiterMemory({
    keyPrefix: "graphql-user",
    points: graphqlConfig.rateLimitPerUserPerMinute,
    duration: 60,
});

const graphqlPerIpLimiter = new RateLimiterMemory({
    keyPrefix: "graphql-ip",
    points: graphqlConfig.rateLimitPerIpPerMinute,
    duration: 60,
});

const aiGenerationPerUserLimiter = new RateLimiterMemory({
    keyPrefix: "ai-generation-user",
    points: aiGenerationConfig.rateLimitPerUser,
    duration: aiGenerationConfig.rateLimitWindowSeconds,
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

async function consumeSlot(
    limiter: RateLimiterMemory,
    scope: RateLimitScope,
    key: string,
): Promise<RateLimitResult> {
    try {
        await limiter.consume(key);
        return { ok: true };
    } catch (error) {
        if (error instanceof RateLimiterRes) {
            return mapLimiterError(scope, error);
        }
        throw error;
    }
}

export function consumeVerificationEmailSlot(): Promise<RateLimitResult> {
    return consumeSlot(verificationEmailGlobalLimiter, "global", "global");
}

export function consumeGraphqlIpSlot(ip: string): Promise<RateLimitResult> {
    return consumeSlot(graphqlPerIpLimiter, "ip", ip);
}

export function consumeGraphqlUserSlot(userId: string): Promise<RateLimitResult> {
    return consumeSlot(graphqlPerUserLimiter, "user", userId);
}

export function consumeAiGenerationSlot(userId: string): Promise<RateLimitResult> {
    return consumeSlot(aiGenerationPerUserLimiter, "user", userId);
}
