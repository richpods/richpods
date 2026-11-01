import { describe, it } from "node:test";
import assert from "node:assert";
import { UserState } from "../src/types/firestore.js";
import { classifyUserRecords } from "../src/services/user-state.service.js";

type TestRecord = { id: string; data: { state: string } };

const active = (id: string): TestRecord => ({ id, data: { state: UserState.ACTIVE } });
const blocked = (id: string): TestRecord => ({ id, data: { state: UserState.BLOCKED } });

describe("classifyUserRecords", () => {
    it("reports missing when no documents exist", () => {
        assert.deepStrictEqual(classifyUserRecords([]), { status: "missing" });
    });

    it("returns the single active document", () => {
        const record = active("u-active");
        assert.deepStrictEqual(classifyUserRecords([record]), {
            status: "active",
            value: record,
        });
    });

    it("reports blocked for a single blocked document", () => {
        assert.deepStrictEqual(classifyUserRecords([blocked("u-blocked")]), {
            status: "blocked",
        });
    });

    it("reports blocked when a blocked document precedes an active duplicate", () => {
        assert.deepStrictEqual(classifyUserRecords([blocked("u-blocked"), active("u-recreated")]), {
            status: "blocked",
        });
    });

    it("reports blocked when an active duplicate precedes a blocked document", () => {
        assert.deepStrictEqual(classifyUserRecords([active("u-recreated"), blocked("u-blocked")]), {
            status: "blocked",
        });
    });

    it("returns the first active document when several are active", () => {
        const first = active("u-first");
        assert.deepStrictEqual(classifyUserRecords([first, active("u-second")]), {
            status: "active",
            value: first,
        });
    });

    it("reports missing when no document is active or blocked", () => {
        assert.deepStrictEqual(classifyUserRecords([{ id: "u-other", data: { state: "other" } }]), {
            status: "missing",
        });
    });
});
