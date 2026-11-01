import { afterEach, before, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert";
import got, { type OptionsInit } from "got";
import { assertSafeRedirectTarget, ssrfSafeDnsLookup } from "@richpods/shared/utils/ssrf";

type MediaCheckService = typeof import("../src/services/media-check.service.js");
type FirestoreConfig = typeof import("../src/config/firestore.js");
type HeadStubResponse = {
    statusCode: number;
    url: string;
    headers: Record<string, string>;
};

const PUBLIC_MEDIA_URL = "http://93.184.216.34/episode.mp3";
const STORED_MEDIA_LENGTH = 1000;

let service: MediaCheckService;
let db: FirestoreConfig["db"];

function buildRichPodDocument(mediaUrl: string) {
    return {
        isHosted: false,
        state: "published",
        editor: { id: "editor-1" },
        origin: {
            feedUrl: "http://93.184.216.34/feed.xml",
            episode: {
                guid: "episode-guid",
                pubDate: null,
                media: {
                    url: mediaUrl,
                    type: "audio/mpeg",
                    length: STORED_MEDIA_LENGTH,
                    checksum: "checksum",
                },
            },
        },
    };
}

function stubRichPodDocument(mediaUrl: string): Record<string, unknown>[] {
    const document = buildRichPodDocument(mediaUrl);
    const updates: Record<string, unknown>[] = [];
    mock.method(db, "collection", () => ({
        doc: (id: string) => ({
            id,
            get: async () => ({ exists: true, data: () => document }),
            update: async (update: Record<string, unknown>) => {
                updates.push(update);
            },
        }),
    }));
    return updates;
}

function stubHead(response: HeadStubResponse) {
    return mock.method(got, "head", async (_url: string, _options?: OptionsInit) => response);
}

function headOptionsOf(head: ReturnType<typeof stubHead>): OptionsInit {
    assert.strictEqual(head.mock.callCount(), 1);
    const options = head.mock.calls[0].arguments[1];
    assert.ok(options);
    return options;
}

before(async () => {
    process.env.GCS_BUCKET_NAME ??= "test-bucket";
    service = await import("../src/services/media-check.service.js");
    ({ db } = await import("../src/config/firestore.js"));
});

beforeEach(() => {
    mock.method(got, "get", async () => {
        throw new Error("Unexpected feed request in test");
    });
});

afterEach(() => {
    mock.restoreAll();
});

describe("media check HEAD request", () => {
    it("pins DNS resolution to the SSRF-safe lookup and validates redirects", async () => {
        stubRichPodDocument(PUBLIC_MEDIA_URL);
        const head = stubHead({ statusCode: 200, url: PUBLIC_MEDIA_URL, headers: {} });

        await service.checkAndUpdateMedia("rp1", true);

        const options = headOptionsOf(head);
        assert.strictEqual(head.mock.calls[0].arguments[0], PUBLIC_MEDIA_URL);
        assert.strictEqual(options.dnsLookup, ssrfSafeDnsLookup);
        assert.deepStrictEqual(options.hooks?.beforeRedirect, [assertSafeRedirectTarget]);
        assert.strictEqual(options.followRedirect, true);
        assert.deepStrictEqual(options.retry, { limit: 0 });
        assert.strictEqual(options.throwHttpErrors, false);
    });

    it("never sends a request to a non-public IP literal and keeps the stored URL", async () => {
        const blockedUrl = "http://127.0.0.1/episode.mp3";
        const updates = stubRichPodDocument(blockedUrl);
        const head = stubHead({ statusCode: 200, url: blockedUrl, headers: {} });

        const result = await service.checkAndUpdateMedia("rp1", true);

        assert.strictEqual(head.mock.callCount(), 0);
        assert.strictEqual(result.url, blockedUrl);
        assert.strictEqual(result.mediaCheck?.status, "broken");
        assert.strictEqual(updates.length, 1);
        assert.ok(!("origin.episode.media.url" in updates[0]));
    });

    it("stores the HEAD metadata and the redirect target of a successful check", async () => {
        const redirectedUrl = "http://93.184.216.35/cdn/episode.mp3";
        const updates = stubRichPodDocument(PUBLIC_MEDIA_URL);
        stubHead({
            statusCode: 200,
            url: redirectedUrl,
            headers: {
                etag: '"v1"',
                "last-modified": "Wed, 21 Oct 2026 07:28:00 GMT",
                "content-length": String(STORED_MEDIA_LENGTH),
            },
        });

        const result = await service.checkAndUpdateMedia("rp1", true);

        assert.strictEqual(result.url, redirectedUrl);
        assert.strictEqual(updates.length, 1);
        assert.strictEqual(updates[0]["origin.episode.media.url"], redirectedUrl);
        const { checkedAt, ...storedCheck } = updates[0]["origin.episode.media.mediaCheck"] as {
            checkedAt: unknown;
        };
        assert.ok(checkedAt);
        assert.deepStrictEqual(storedCheck, {
            checkedUrl: PUBLIC_MEDIA_URL,
            status: "ok",
            httpStatus: 200,
            etag: '"v1"',
            lastModified: "Wed, 21 Oct 2026 07:28:00 GMT",
            contentLength: STORED_MEDIA_LENGTH,
        });
    });

    it("rejects a hostname resolving to a non-public address at connect time", async () => {
        stubRichPodDocument(PUBLIC_MEDIA_URL);
        const head = stubHead({ statusCode: 200, url: PUBLIC_MEDIA_URL, headers: {} });
        await service.checkAndUpdateMedia("rp1", true);
        const options = headOptionsOf(head);
        head.mock.restore();

        await assert.rejects(got.head("http://localhost/episode.mp3", options), {
            code: "EBLOCKED",
        });
    });
});
