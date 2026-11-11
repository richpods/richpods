import { describe, it } from "node:test";
import assert from "node:assert";
import type { Request, Response } from "express";
import {
    enforceGraphqlUserRateLimit,
    getClientIp,
    isAuthenticated,
    sendRateLimited,
} from "../src/middleware/graphql-rate-limit.js";

function fakeRequest(ip: string | undefined, remoteAddress?: string): Request {
    return { ip, socket: { remoteAddress } } as unknown as Request;
}

function unusedResponse(): Response {
    return {
        set: () => assert.fail("no 429 expected"),
        status: () => assert.fail("no 429 expected"),
        json: () => assert.fail("no 429 expected"),
    } as unknown as Response;
}

describe("isAuthenticated", () => {
    it("requires both a user ID and a loaded user", () => {
        assert.strictEqual(
            isAuthenticated({ userId: "u1", user: { id: "u1", socialAccounts: [] } }),
            true,
        );
        assert.strictEqual(isAuthenticated({}), false);
        assert.strictEqual(isAuthenticated({ token: "expired" }), false);
        assert.strictEqual(isAuthenticated({ userId: "u1", user: null }), false);
    });
});

describe("enforceGraphqlUserRateLimit", () => {
    it("lets anonymous and invalid-token callers through without consuming a user slot", async () => {
        assert.strictEqual(await enforceGraphqlUserRateLimit({}, unusedResponse()), true);
        assert.strictEqual(
            await enforceGraphqlUserRateLimit({ token: "expired" }, unusedResponse()),
            true,
        );
    });
});

describe("getClientIp", () => {
    it("falls back to the socket address and then to a sentinel", () => {
        assert.strictEqual(getClientIp(fakeRequest(undefined, "10.0.0.3")), "10.0.0.3");
        assert.strictEqual(getClientIp(fakeRequest(undefined, undefined)), "unknown");
    });
});

describe("sendRateLimited", () => {
    it("answers with 429, a Retry-After header and a GraphQL-shaped body", () => {
        const headers: Record<string, string> = {};
        let statusCode = 0;
        let body: unknown;
        const res = {
            set: (name: string, value: string) => {
                headers[name] = value;
                return res;
            },
            status: (code: number) => {
                statusCode = code;
                return res;
            },
            json: (payload: unknown) => {
                body = payload;
                return res;
            },
        } as unknown as Response;

        sendRateLimited(res, { ok: false, scope: "ip", retryAfterMs: 1500 });

        assert.strictEqual(statusCode, 429);
        assert.strictEqual(headers["Retry-After"], "2");
        assert.deepStrictEqual(body, { errors: [{ message: "Too many requests" }] });
    });

    it("never advertises a zero-second retry", () => {
        const headers: Record<string, string> = {};
        const res = {
            set: (name: string, value: string) => {
                headers[name] = value;
                return res;
            },
            status: () => res,
            json: () => res,
        } as unknown as Response;

        sendRateLimited(res, { ok: false, scope: "user", retryAfterMs: 0 });
        assert.strictEqual(headers["Retry-After"], "1");
    });
});
