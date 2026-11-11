import { describe, it, before } from "node:test";
import assert from "node:assert";

type RateLimitModule = typeof import("../src/services/rate-limit.service.js");

process.env.VERIFICATION_RATE_LIMIT_GLOBAL = "2";
process.env.GRAPHQL_RATE_LIMIT_PER_USER = "3";
process.env.GRAPHQL_RATE_LIMIT_PER_IP = "4";
process.env.AI_GENERATION_RATE_LIMIT_PER_USER = "2";

let rateLimit: RateLimitModule;

before(async () => {
    rateLimit = await import("../src/services/rate-limit.service.js");
});

describe("consumeVerificationEmailSlot", () => {
    it("allows sends within the global budget and rejects everyone afterwards", async () => {
        const consume = rateLimit.consumeVerificationEmailSlot;
        assert.deepStrictEqual(await consume(), { ok: true });
        assert.deepStrictEqual(await consume(), { ok: true });

        const rejected = await consume();
        assert.strictEqual(rejected.ok, false);
        assert.ok(!rejected.ok);
        assert.strictEqual(rejected.scope, "global");
        assert.ok(rejected.retryAfterMs > 0);
        assert.ok(rejected.retryAfterMs <= 60 * 60 * 1000);
    });
});

describe("consumeGraphqlUserSlot", () => {
    it("limits authenticated users per user ID", async () => {
        const consume = rateLimit.consumeGraphqlUserSlot;
        for (let i = 0; i < 3; i += 1) {
            assert.deepStrictEqual(await consume("user-a"), { ok: true });
        }

        const rejected = await consume("user-a");
        assert.ok(!rejected.ok);
        assert.strictEqual(rejected.scope, "user");
        assert.ok(rejected.retryAfterMs > 0);
        assert.ok(rejected.retryAfterMs <= 60 * 1000);

        assert.deepStrictEqual(await consume("user-b"), { ok: true });
    });
});

describe("consumeGraphqlIpSlot", () => {
    it("limits callers per IP independently of the user budget", async () => {
        const consume = rateLimit.consumeGraphqlIpSlot;
        for (let i = 0; i < 4; i += 1) {
            assert.deepStrictEqual(await consume("203.0.113.7"), { ok: true });
        }

        const rejected = await consume("203.0.113.7");
        assert.ok(!rejected.ok);
        assert.strictEqual(rejected.scope, "ip");

        assert.deepStrictEqual(await consume("203.0.113.8"), { ok: true });
        assert.deepStrictEqual(await rateLimit.consumeGraphqlUserSlot("user-c"), { ok: true });
    });
});

describe("consumeAiGenerationSlot", () => {
    it("limits generation starts per user within the window", async () => {
        const consume = rateLimit.consumeAiGenerationSlot;
        assert.deepStrictEqual(await consume("ai-user-1"), { ok: true });
        assert.deepStrictEqual(await consume("ai-user-1"), { ok: true });

        const rejected = await consume("ai-user-1");
        assert.ok(!rejected.ok);
        assert.strictEqual(rejected.scope, "user");
        assert.ok(rejected.retryAfterMs > 0);
        assert.ok(rejected.retryAfterMs <= 60 * 60 * 1000);

        assert.deepStrictEqual(await consume("ai-user-2"), { ok: true });
    });
});
