import { describe, it, before } from "node:test";
import assert from "node:assert";

type RateLimitModule = typeof import("../src/services/rate-limit.service.js");

describe("consumeVerificationEmailSlot", () => {
    let consume: RateLimitModule["consumeVerificationEmailSlot"];

    before(async () => {
        process.env.VERIFICATION_RATE_LIMIT_GLOBAL = "2";
        ({ consumeVerificationEmailSlot: consume } =
            await import("../src/services/rate-limit.service.js"));
    });

    it("allows sends within the global budget and rejects everyone afterwards", async () => {
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
