import { describe, it } from "node:test";
import assert from "node:assert";
import {
    MAX_CHAPTERS_PER_RICHPOD,
    TOO_MANY_CHAPTERS_MESSAGE,
    setChaptersInputSchema,
} from "../src/validation/schemas.js";
import { validate, ValidationError } from "../src/validation/validator.js";
import {
    assertChapterCountWithinLimit,
    assertChapterSetAllowed,
    uploadAndCommitChapters,
    type ChapterSetPersistence,
} from "../src/services/richpod/chapter-set.js";
import {
    EnclosureType,
    RichPodState,
    type Chapter,
    type EnclosureTypeValue,
    type RichPodStateType,
} from "../src/types/firestore.js";

const markdownChapters = (count: number) =>
    Array.from({ length: count }, () => ({
        begin: "00:00:00.000",
        enclosureType: "Markdown",
        enclosure: { title: "a", text: "b" },
    }));

const validateChapters = (count: number) =>
    validate<{ chapters: unknown[] }>(setChaptersInputSchema, {
        chapters: markdownChapters(count),
    });

const assertRejectedWithMaxMessage = (count: number) => {
    assert.throws(
        () => validateChapters(count),
        (error: unknown) =>
            error instanceof ValidationError && error.details.includes(TOO_MANY_CHAPTERS_MESSAGE),
    );
};

const richPod = (state: RichPodStateType, verified: boolean) => ({ state, origin: { verified } });

const chaptersOf = (...types: EnclosureTypeValue[]) =>
    types.map((enclosureType) => ({ enclosureType }));

type ChapterInput = { name: string };

const systemError = (message: string, code: number) => Object.assign(new Error(message), { code });

const createPersistence = (
    overrides: Partial<ChapterSetPersistence<ChapterInput, string>> = {},
) => {
    const uploads: string[] = [];
    const removed: string[] = [];
    const committed: Chapter[][] = [];
    const persistence: ChapterSetPersistence<ChapterInput, string> = {
        upload: async (input) => {
            uploads.push(input.name);
            return {
                begin: "00:00:00.000",
                enclosureType: EnclosureType.MARKDOWN,
                gcsName: `pod/${input.name}.json`,
            };
        },
        commit: async (chapters) => {
            committed.push([...chapters]);
            return "version-id";
        },
        remove: async (gcsName) => {
            removed.push(gcsName);
        },
        ...overrides,
    };
    return { persistence, uploads, removed, committed };
};

const inputs: ChapterInput[] = [{ name: "a" }, { name: "b" }, { name: "c" }];
const uploadedNames = ["pod/a.json", "pod/b.json", "pod/c.json"];

describe("setChaptersInputSchema chapter cap", () => {
    it("caps a chapter set at 200 chapters", () => {
        assert.strictEqual(MAX_CHAPTERS_PER_RICHPOD, 200);
    });

    it("accepts an empty chapter set", () => {
        assert.strictEqual(validateChapters(0).chapters.length, 0);
    });

    it("accepts exactly the maximum number of chapters", () => {
        assert.strictEqual(
            validateChapters(MAX_CHAPTERS_PER_RICHPOD).chapters.length,
            MAX_CHAPTERS_PER_RICHPOD,
        );
    });

    it("rejects one chapter above the maximum", () => {
        assertRejectedWithMaxMessage(MAX_CHAPTERS_PER_RICHPOD + 1);
    });

    it("rejects oversized chapter sets", () => {
        assertRejectedWithMaxMessage(15000);
    });
});

describe("assertChapterCountWithinLimit", () => {
    it("accepts counts up to the maximum", () => {
        assert.doesNotThrow(() => assertChapterCountWithinLimit(0));
        assert.doesNotThrow(() => assertChapterCountWithinLimit(MAX_CHAPTERS_PER_RICHPOD));
    });

    it("rejects counts above the maximum", () => {
        assert.throws(
            () => assertChapterCountWithinLimit(MAX_CHAPTERS_PER_RICHPOD + 1),
            new Error(TOO_MANY_CHAPTERS_MESSAGE),
        );
    });
});

describe("assertChapterSetAllowed", () => {
    it("rejects removing all chapters from a published RichPod", () => {
        assert.throws(
            () => assertChapterSetAllowed(richPod(RichPodState.PUBLISHED, true), []),
            /Cannot remove all chapters from a published RichPod/,
        );
    });

    it("allows an empty chapter set on a draft", () => {
        assert.doesNotThrow(() => assertChapterSetAllowed(richPod(RichPodState.DRAFT, false), []));
    });

    it("rejects Slideshow and Poll chapters on unverified RichPods", () => {
        for (const type of [EnclosureType.SLIDESHOW, EnclosureType.POLL]) {
            assert.throws(
                () =>
                    assertChapterSetAllowed(
                        richPod(RichPodState.DRAFT, false),
                        chaptersOf(EnclosureType.MARKDOWN, type),
                        null,
                    ),
                /Slideshow and Poll chapters require podcast verification/,
            );
        }
    });

    it("allows Slideshow and Poll chapters on verified RichPods", () => {
        assert.doesNotThrow(() =>
            assertChapterSetAllowed(
                richPod(RichPodState.PUBLISHED, true),
                chaptersOf(EnclosureType.SLIDESHOW, EnclosureType.POLL),
            ),
        );
    });

    it("allows Slideshow and Poll chapters for privileged roles", () => {
        assert.doesNotThrow(() =>
            assertChapterSetAllowed(
                richPod(RichPodState.DRAFT, false),
                chaptersOf(EnclosureType.SLIDESHOW, EnclosureType.POLL),
                "editor",
            ),
        );
    });

    it("allows other enclosure types on unverified RichPods", () => {
        assert.doesNotThrow(() =>
            assertChapterSetAllowed(
                richPod(RichPodState.PUBLISHED, false),
                chaptersOf(EnclosureType.MARKDOWN, EnclosureType.CARD, EnclosureType.GEO_MAP),
            ),
        );
    });
});

describe("uploadAndCommitChapters", () => {
    it("uploads every chapter in order and commits them", async () => {
        const { persistence, uploads, removed, committed } = createPersistence();

        const result = await uploadAndCommitChapters(inputs, persistence);

        assert.strictEqual(result, "version-id");
        assert.deepStrictEqual(uploads, ["a", "b", "c"]);
        assert.deepStrictEqual(
            committed.map((chapters) => chapters.map((ch) => ch.gcsName)),
            [uploadedNames],
        );
        assert.deepStrictEqual(removed, []);
    });

    it("removes uploaded objects when the commit is rejected by an app check", async () => {
        const rejection = new Error("Slideshow and Poll chapters require podcast verification");
        const { persistence, removed } = createPersistence({
            commit: async () => {
                throw rejection;
            },
        });

        await assert.rejects(uploadAndCommitChapters(inputs, persistence), (error) => {
            assert.strictEqual(error, rejection);
            return true;
        });
        assert.deepStrictEqual(removed.sort(), uploadedNames);
    });

    it("removes uploaded objects when Firestore fails before a commit attempt", async () => {
        const transportError = systemError("Deadline exceeded", 4);
        const { persistence, removed } = createPersistence({
            commit: async () => {
                throw transportError;
            },
        });

        await assert.rejects(uploadAndCommitChapters(inputs, persistence), (error) => {
            assert.strictEqual(error, transportError);
            return true;
        });
        assert.deepStrictEqual(removed.sort(), uploadedNames);
    });

    it("keeps uploaded objects when the commit fails after a commit attempt", async () => {
        const transportError = systemError("Deadline exceeded", 4);
        const { persistence, removed } = createPersistence({
            commit: async (_chapters, markCommitAttempted) => {
                markCommitAttempted();
                throw transportError;
            },
        });

        await assert.rejects(uploadAndCommitChapters(inputs, persistence), (error) => {
            assert.strictEqual(error, transportError);
            return true;
        });
        assert.deepStrictEqual(removed, []);
    });

    it("keeps uploaded objects when a retried transaction is rejected by an app check", async () => {
        const lockLost = new Error("LOCK_LOST");
        const { persistence, removed } = createPersistence({
            commit: async (_chapters, markCommitAttempted) => {
                markCommitAttempted();
                throw lockLost;
            },
        });

        await assert.rejects(uploadAndCommitChapters(inputs, persistence), (error) => {
            assert.strictEqual(error, lockLost);
            return true;
        });
        assert.deepStrictEqual(removed, []);
    });

    it("removes earlier uploads and skips the commit when an upload fails", async () => {
        const uploadError = systemError("Service unavailable", 503);
        const base = createPersistence();
        const { persistence, removed, committed } = createPersistence({
            upload: async (input) => {
                if (input.name === "c") {
                    throw uploadError;
                }
                return base.persistence.upload(input);
            },
        });

        await assert.rejects(uploadAndCommitChapters(inputs, persistence), (error) => {
            assert.strictEqual(error, uploadError);
            return true;
        });
        assert.deepStrictEqual(removed.sort(), ["pod/a.json", "pod/b.json"]);
        assert.deepStrictEqual(committed, []);
    });

    it("rethrows the original error when removing objects fails", async () => {
        const rejection = new Error("LOCK_LOST");
        const attempted: string[] = [];
        const { persistence } = createPersistence({
            commit: async () => {
                throw rejection;
            },
            remove: async (gcsName) => {
                attempted.push(gcsName);
                throw new Error("delete failed");
            },
        });

        await assert.rejects(uploadAndCommitChapters(inputs, persistence), (error) => {
            assert.strictEqual(error, rejection);
            return true;
        });
        assert.deepStrictEqual(attempted.sort(), uploadedNames);
    });

    it("does not upload or remove anything for an empty chapter set", async () => {
        const rejection = new Error("Cannot remove all chapters from a published RichPod");
        const { persistence, uploads, removed } = createPersistence({
            commit: async () => {
                throw rejection;
            },
        });

        await assert.rejects(uploadAndCommitChapters([], persistence), rejection);
        assert.deepStrictEqual(uploads, []);
        assert.deepStrictEqual(removed, []);
    });
});
