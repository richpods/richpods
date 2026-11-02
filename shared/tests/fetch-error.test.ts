import { describe, it } from "node:test";
import assert from "node:assert";
import { toClientSafeFetchError } from "@richpods/shared/utils/fetch-error";

describe("toClientSafeFetchError", () => {
    it("should pass a plain Error through unchanged", () => {
        const error = new Error("Feed exceeds maximum allowed size of 40 MB");

        assert.strictEqual(toClientSafeFetchError(error, "feed"), error);
    });

    it("should wrap a non-Error value in a generic message", () => {
        const result = toClientSafeFetchError("socket hang up", "feed");

        assert.ok(result instanceof Error);
        assert.strictEqual(result.message, "Failed to fetch feed");
    });
});
