import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    checkFeedVerifications,
    extractEmailFromFeed,
    feedFetchFailure,
    selectVerificationsToRevoke,
    type FeedEmailCheck,
    type VerifiedRecord,
} from "../src/verification-check.ts";

const OWNER_A = "users/owner-a";
const OWNER_B = "users/owner-b";

const record = (id: string, userPath: string, email: string): VerifiedRecord => ({
    id,
    userPath,
    email,
});

const feedShowing = (email: string | null): FeedEmailCheck => ({ ok: true, email });

const revoked = (
    records: readonly VerifiedRecord[],
    feed: FeedEmailCheck,
): Array<{ id: string; reason: string }> =>
    selectVerificationsToRevoke(records, feed)
        .map(({ record: { id }, reason }) => ({ id, reason }))
        .sort((left, right) => left.id.localeCompare(right.id));

const permutations = <T>(items: readonly T[]): T[][] =>
    items.length <= 1
        ? [[...items]]
        : items.flatMap((item, index) =>
              permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [
                  item,
                  ...rest,
              ]),
          );

describe("selectVerificationsToRevoke", () => {
    it("revokes a prior owner whose e-mail is no longer in the feed", () => {
        const records = [
            record("newer-b", OWNER_B, "b@example.com"),
            record("older-a", OWNER_A, "a@example.com"),
        ];

        assert.deepEqual(revoked(records, feedShowing("b@example.com")), [
            { id: "older-a", reason: "Email mismatch" },
        ]);
    });

    it("keeps a valid older record when the newest record is stale", () => {
        const records = [
            record("newer-b", OWNER_B, "b@example.com"),
            record("older-a", OWNER_A, "a@example.com"),
        ];

        assert.deepEqual(revoked(records, feedShowing("a@example.com")), [
            { id: "newer-b", reason: "Email mismatch" },
        ]);
    });

    it("keeps every record of a user who re-verified with the current e-mail", () => {
        const stale = record("stale-a", OWNER_A, "old@example.com");
        const current = record("current-a", OWNER_A, "new@example.com");

        assert.deepEqual(revoked([stale, current], feedShowing("new@example.com")), []);
        assert.deepEqual(revoked([current, stale], feedShowing("new@example.com")), []);
    });

    it("revokes all records of a user when none of them matches", () => {
        const records = [
            record("a-1", OWNER_A, "old@example.com"),
            record("a-2", OWNER_A, "older@example.com"),
            record("b-1", OWNER_B, "new@example.com"),
        ];

        assert.deepEqual(revoked(records, feedShowing("new@example.com")), [
            { id: "a-1", reason: "Email mismatch" },
            { id: "a-2", reason: "Email mismatch" },
        ]);
    });

    it("keeps every user that verified with the current e-mail", () => {
        const records = [
            record("a-1", OWNER_A, "shared@example.com"),
            record("b-1", OWNER_B, "shared@example.com"),
        ];

        assert.deepEqual(revoked(records, feedShowing("shared@example.com")), []);
    });

    it("compares e-mails case-insensitively and ignores surrounding whitespace", () => {
        const records = [record("a-1", OWNER_A, "  Owner@Example.com ")];

        assert.deepEqual(revoked(records, feedShowing(" owner@example.COM")), []);
    });

    it("revokes every record when the feed has no e-mail", () => {
        const records = [
            record("a-1", OWNER_A, "a@example.com"),
            record("b-1", OWNER_B, "b@example.com"),
        ];

        assert.deepEqual(revoked(records, feedShowing(null)), [
            { id: "a-1", reason: "Email not found in feed" },
            { id: "b-1", reason: "Email not found in feed" },
        ]);
    });

    it("revokes every record when the feed could not be fetched", () => {
        const records = [
            record("a-1", OWNER_A, "a@example.com"),
            record("b-1", OWNER_B, "b@example.com"),
        ];

        assert.deepEqual(revoked(records, feedFetchFailure(new Error("timeout"))), [
            { id: "a-1", reason: "Feed fetch error: timeout" },
            { id: "b-1", reason: "Feed fetch error: timeout" },
        ]);
    });

    it("does not depend on the order of the records", () => {
        const records = [
            record("a-stale", OWNER_A, "old@example.com"),
            record("a-current", OWNER_A, "new@example.com"),
            record("b-stale", OWNER_B, "old@example.com"),
            record("c-other", "users/owner-c", "other@example.com"),
        ];
        const expected = [
            { id: "b-stale", reason: "Email mismatch" },
            { id: "c-other", reason: "Email mismatch" },
        ];

        for (const ordering of permutations(records)) {
            assert.deepEqual(revoked(ordering, feedShowing("new@example.com")), expected);
        }
    });

    it("returns no revocations for an empty feed group", () => {
        assert.deepEqual(revoked([], feedShowing("a@example.com")), []);
    });
});

describe("feedFetchFailure", () => {
    it("uses the error message as the reason", () => {
        assert.deepEqual(feedFetchFailure(new Error("Not a valid RSS 2.0 feed")), {
            ok: false,
            reason: "Feed fetch error: Not a valid RSS 2.0 feed",
        });
    });

    it("falls back to a generic reason for non-Error values", () => {
        assert.deepEqual(feedFetchFailure("boom"), {
            ok: false,
            reason: "Feed fetch error: Unknown error",
        });
    });
});

describe("extractEmailFromFeed", () => {
    const feedWithChannel = (channel: Record<string, unknown>): unknown => ({ rss: { channel } });

    it("prefers the channel itunes:email over the owner e-mail", () => {
        const feed = feedWithChannel({
            "itunes:email": " direct@example.com ",
            "itunes:owner": { "itunes:email": "owner@example.com" },
        });

        assert.equal(extractEmailFromFeed(feed), "direct@example.com");
    });

    it("falls back to the owner e-mail when the channel e-mail is invalid", () => {
        const feed = feedWithChannel({
            "itunes:email": "not-an-email",
            "itunes:owner": { "itunes:email": "owner@example.com" },
        });

        assert.equal(extractEmailFromFeed(feed), "owner@example.com");
    });

    it("ignores non-string e-mail values", () => {
        const feed = feedWithChannel({
            "itunes:email": { _: "direct@example.com", type: "x" },
            "itunes:owner": { "itunes:email": ["owner@example.com"] },
        });

        assert.equal(extractEmailFromFeed(feed), null);
    });

    it("returns null when there is no channel", () => {
        assert.equal(extractEmailFromFeed({ rss: {} }), null);
        assert.equal(extractEmailFromFeed(null), null);
    });
});

describe("checkFeedVerifications", () => {
    it("attempts every revocation and counts failed writes as errors", async () => {
        const records = [
            record("a-1", OWNER_A, "old@example.com"),
            record("a-2", OWNER_A, "old@example.com"),
            record("b-1", OWNER_B, "new@example.com"),
        ];
        const attempts: Array<{ id: string; reason: string }> = [];
        const revoke = async (target: VerifiedRecord, reason: string): Promise<void> => {
            attempts.push({ id: target.id, reason });
            if (target.id === "a-1") {
                throw new Error("write failed");
            }
        };

        const tally = await checkFeedVerifications(records, feedShowing("new@example.com"), revoke);

        assert.deepEqual(tally, { checked: 3, passed: 1, failed: 1, errors: 1 });
        assert.deepEqual(attempts, [
            { id: "a-1", reason: "Email mismatch" },
            { id: "a-2", reason: "Email mismatch" },
        ]);
    });

    it("writes nothing when every record passes", async () => {
        const records = [record("a-1", OWNER_A, "a@example.com")];
        let writes = 0;
        const revoke = async (): Promise<void> => {
            writes++;
        };

        const tally = await checkFeedVerifications(records, feedShowing("a@example.com"), revoke);

        assert.deepEqual(tally, { checked: 1, passed: 1, failed: 0, errors: 0 });
        assert.equal(writes, 0);
    });
});
