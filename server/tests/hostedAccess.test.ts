import { describe, it } from "node:test";
import assert from "node:assert";
import { UserRole } from "@richpods/shared/utils/roles";
import { assertHostedAccess, HOSTED_ACCESS_ERROR } from "../src/services/hosted-access.service.js";

describe("assertHostedAccess", () => {
    it("allows privileged roles on hosted RichPods", () => {
        assert.doesNotThrow(() => assertHostedAccess({ isHosted: true }, UserRole.SUPER_ADMIN));
        assert.doesNotThrow(() => assertHostedAccess({ isHosted: true }, UserRole.EDITOR));
    });

    it("rejects hosted RichPods without a privileged role", () => {
        assert.throws(() => assertHostedAccess({ isHosted: true }, null), {
            message: HOSTED_ACCESS_ERROR,
        });
        assert.throws(() => assertHostedAccess({ isHosted: true }, undefined), {
            message: HOSTED_ACCESS_ERROR,
        });
    });

    it("ignores the role for regular RichPods", () => {
        assert.doesNotThrow(() => assertHostedAccess({ isHosted: false }, null));
        assert.doesNotThrow(() => assertHostedAccess({}, undefined));
    });
});
