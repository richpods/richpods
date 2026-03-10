import { describe, it } from "node:test";
import assert from "node:assert";
import {
    UserRole,
    PRIVILEGED_ROLES,
    normalizeRole,
    isPrivilegedRole,
} from "@richpods/shared/utils/roles";

describe("privileged roles", () => {
    describe("PRIVILEGED_ROLES", () => {
        it("should include super_admin and editor", () => {
            assert.ok(PRIVILEGED_ROLES.includes("super_admin"));
            assert.ok(PRIVILEGED_ROLES.includes("editor"));
        });

        it("should have exactly two entries", () => {
            assert.strictEqual(PRIVILEGED_ROLES.length, 2);
        });
    });

    describe("normalizeRole", () => {
        it("should return the role for known values", () => {
            assert.strictEqual(normalizeRole("super_admin"), UserRole.SUPER_ADMIN);
            assert.strictEqual(normalizeRole("editor"), UserRole.EDITOR);
        });

        it("should return null for unknown values", () => {
            assert.strictEqual(normalizeRole("viewer"), null);
            assert.strictEqual(normalizeRole(""), null);
            assert.strictEqual(normalizeRole(null), null);
            assert.strictEqual(normalizeRole(undefined), null);
            assert.strictEqual(normalizeRole(42), null);
        });
    });

    describe("isPrivilegedRole", () => {
        it("should return true for super_admin", () => {
            assert.strictEqual(isPrivilegedRole("super_admin"), true);
        });

        it("should return true for editor", () => {
            assert.strictEqual(isPrivilegedRole("editor"), true);
        });

        it("should return false for null", () => {
            assert.strictEqual(isPrivilegedRole(null), false);
        });

        it("should return false for undefined", () => {
            assert.strictEqual(isPrivilegedRole(undefined), false);
        });

        it("should return false for empty string", () => {
            assert.strictEqual(isPrivilegedRole(""), false);
        });

        it("should return false for unknown role", () => {
            assert.strictEqual(isPrivilegedRole("viewer"), false);
        });

        it("should be case-sensitive", () => {
            assert.strictEqual(isPrivilegedRole("SUPER_ADMIN"), false);
            assert.strictEqual(isPrivilegedRole("Editor"), false);
        });
    });
});
