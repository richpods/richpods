import type { Request, Response } from "express";
import type { AuthContext } from "./auth.js";
import {
    consumeGraphqlIpSlot,
    consumeGraphqlUserSlot,
    type RateLimitResult,
} from "../services/rate-limit.service.js";

export function getClientIp(req: Request): string {
    return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

export function isAuthenticated(auth: AuthContext): auth is AuthContext & { userId: string } {
    return Boolean(auth.userId && auth.user);
}

export function sendRateLimited(res: Response, result: Exclude<RateLimitResult, { ok: true }>) {
    res.set("Retry-After", String(Math.max(1, Math.ceil(result.retryAfterMs / 1000))));
    res.status(429).json({ errors: [{ message: "Too many requests" }] });
}

async function enforce(res: Response, pending: Promise<RateLimitResult>): Promise<boolean> {
    const result = await pending;
    if (result.ok) {
        return true;
    }
    sendRateLimited(res, result);
    return false;
}

/**
 * First gate for every request, keyed by client IP. Runs before the bearer
 * token is verified so a flood never reaches Firebase or Firestore.
 * Returns `false` after a 429 was sent.
 */
export function enforceGraphqlIpRateLimit(req: Request, res: Response): Promise<boolean> {
    return enforce(res, consumeGraphqlIpSlot(getClientIp(req)));
}

/**
 * Second gate for signed-in users, keyed by user ID. Anonymous callers are
 * covered by the IP limit alone. Returns `false` after a 429 was sent.
 */
export async function enforceGraphqlUserRateLimit(
    auth: AuthContext,
    res: Response,
): Promise<boolean> {
    if (!isAuthenticated(auth)) {
        return true;
    }
    return enforce(res, consumeGraphqlUserSlot(auth.userId));
}
