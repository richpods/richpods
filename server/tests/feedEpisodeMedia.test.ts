import { describe, it } from "node:test";
import assert from "node:assert";
import { parseFeed } from "@richpods/shared/media/feed";
import {
    allowedEpisodeAudioMimeTypes,
    resolveEpisodeMediaFromFeed,
    type EpisodeMedia,
} from "../src/validation/feed.js";
import { podcastMediaInputSchema } from "../src/validation/schemas.js";

const buildFeed = (items: string): Promise<unknown> =>
    parseFeed(
        `<?xml version="1.0"?><rss version="2.0"><channel><title>Show</title><description>Desc</description>${items}</channel></rss>`,
    );

const buildItem = (guid: string, enclosureAttrs: string): string =>
    `<item><title>Episode</title>${guid}<enclosure ${enclosureAttrs}/></item>`;

const clientMedia: EpisodeMedia = {
    url: "https://example.com/spoofed.mp3",
    type: "audio/mpeg",
    length: 4242,
    checksum: "etag:abc123",
};

describe("resolveEpisodeMediaFromFeed", () => {
    it("replaces a differing client media URL with the feed enclosure URL", async () => {
        const feed = await buildFeed(
            buildItem(
                "<guid>ep-1</guid>",
                'url="https://example.com/ep-1.mp3" type="audio/mpeg" length="1000"',
            ),
        );

        const media = resolveEpisodeMediaFromFeed(feed, "ep-1", clientMedia);

        assert.deepStrictEqual(media, {
            url: "https://example.com/ep-1.mp3",
            type: "audio/mpeg",
            length: 1000,
            checksum: "etag:abc123",
        });
    });

    it("selects the enclosure of the episode matching the GUID", async () => {
        const feed = await buildFeed(
            buildItem(
                "<guid>ep-1</guid>",
                'url="https://example.com/1.mp3" type="audio/mpeg"',
            ) +
                buildItem(
                    "<guid>ep-2</guid>",
                    'url="https://example.com/2.mp3" type="audio/mpeg"',
                ),
        );

        const media = resolveEpisodeMediaFromFeed(feed, "ep-2", clientMedia);

        assert.strictEqual(media.url, "https://example.com/2.mp3");
    });

    it("returns a tracking-prefix URL decoded and otherwise verbatim", async () => {
        const feed = await buildFeed(
            buildItem(
                "<guid>ep-1</guid>",
                'url="https://example.com/redirect.mp3/example.com/a%20b.mp3?x=1&amp;y=2" type="audio/mpeg" length="1"',
            ),
        );

        const media = resolveEpisodeMediaFromFeed(feed, "ep-1", clientMedia);

        assert.strictEqual(
            media.url,
            "https://example.com/redirect.mp3/example.com/a%20b.mp3?x=1&y=2",
        );
    });

    it("trims whitespace around the enclosure URL", async () => {
        const feed = await buildFeed(
            buildItem(
                "<guid>ep-1</guid>",
                'url="  https://example.com/ep-1.mp3 " type="audio/mpeg"',
            ),
        );

        const media = resolveEpisodeMediaFromFeed(feed, "ep-1", clientMedia);

        assert.strictEqual(media.url, "https://example.com/ep-1.mp3");
    });

    it("matches a GUID given in object form with an isPermaLink attribute", async () => {
        const feed = await buildFeed(
            buildItem(
                '<guid isPermaLink="false">urn:uuid:1234</guid>',
                'url="https://example.com/ep.mp3" type="audio/mpeg"',
            ),
        );

        const media = resolveEpisodeMediaFromFeed(feed, "urn:uuid:1234", clientMedia);

        assert.strictEqual(media.url, "https://example.com/ep.mp3");
    });

    it("throws for an unknown GUID", async () => {
        const feed = await buildFeed(
            buildItem(
                "<guid>ep-1</guid>",
                'url="https://example.com/ep.mp3" type="audio/mpeg"',
            ),
        );

        assert.throws(
            () => resolveEpisodeMediaFromFeed(feed, "ep-unknown", clientMedia),
            /not found in RSS feed/,
        );
    });

    for (const url of [
        "javascript:alert(1)",
        "ftp://example.com/ep.mp3",
        "data:audio/mpeg;base64,AAAA",
        "not a url",
    ]) {
        it(`throws for a non-http(s) enclosure URL: ${url}`, async () => {
            const feed = await buildFeed(
                buildItem("<guid>ep-1</guid>", `url="${url}" type="audio/mpeg"`),
            );

            assert.throws(
                () => resolveEpisodeMediaFromFeed(feed, "ep-1", clientMedia),
                /must be a valid http\/https URL/,
            );
        });
    }

    it("lowercases the enclosure type", async () => {
        const feed = await buildFeed(
            buildItem(
                "<guid>ep-1</guid>",
                'url="https://example.com/ep.m4a" type="Audio/X-M4A"',
            ),
        );

        const media = resolveEpisodeMediaFromFeed(feed, "ep-1", clientMedia);

        assert.strictEqual(media.type, "audio/x-m4a");
    });

    it("strips parameters from the enclosure type", async () => {
        const feed = await buildFeed(
            buildItem(
                "<guid>ep-1</guid>",
                'url="https://example.com/ep.mp3" type="audio/mpeg; charset=binary"',
            ),
        );

        const media = resolveEpisodeMediaFromFeed(feed, "ep-1", clientMedia);

        assert.strictEqual(media.type, "audio/mpeg");
    });

    it("defaults a missing enclosure type to audio/mpeg", async () => {
        const feed = await buildFeed(
            buildItem("<guid>ep-1</guid>", 'url="https://example.com/ep.mp3"'),
        );

        const media = resolveEpisodeMediaFromFeed(feed, "ep-1", {
            ...clientMedia,
            type: "audio/ogg",
        });

        assert.strictEqual(media.type, "audio/mpeg");
    });

    for (const type of ["video/mp4", "text/html", "application/octet-stream"]) {
        it(`throws for the non-audio enclosure type ${type}`, async () => {
            const feed = await buildFeed(
                buildItem("<guid>ep-1</guid>", `url="https://example.com/ep" type="${type}"`),
            );

            assert.throws(
                () => resolveEpisodeMediaFromFeed(feed, "ep-1", clientMedia),
                /Episode media type is not a supported audio format/,
            );
        });
    }

    it("uses a positive enclosure length instead of the client length", async () => {
        const feed = await buildFeed(
            buildItem(
                "<guid>ep-1</guid>",
                'url="https://example.com/ep.mp3" type="audio/mpeg" length="98765"',
            ),
        );

        const media = resolveEpisodeMediaFromFeed(feed, "ep-1", clientMedia);

        assert.strictEqual(media.length, 98765);
    });

    for (const [label, lengthAttr] of [
        ["missing", ""],
        ["empty", 'length=""'],
        ["zero", 'length="0"'],
        ["negative", 'length="-5"'],
        ["non-numeric", 'length="unknown"'],
    ]) {
        it(`falls back to the client length when the enclosure length is ${label}`, async () => {
            const feed = await buildFeed(
                buildItem(
                    "<guid>ep-1</guid>",
                    `url="https://example.com/ep.mp3" type="audio/mpeg" ${lengthAttr}`,
                ),
            );

            const media = resolveEpisodeMediaFromFeed(feed, "ep-1", clientMedia);

            assert.strictEqual(media.length, clientMedia.length);
        });
    }

    it("keeps the client checksum and leaves the client media untouched", async () => {
        const original = { ...clientMedia };
        const feed = await buildFeed(
            buildItem(
                "<guid>ep-1</guid>",
                'url="https://example.com/ep.mp3" type="audio/mpeg" length="7"',
            ),
        );

        const media = resolveEpisodeMediaFromFeed(feed, "ep-1", clientMedia);

        assert.strictEqual(media.checksum, clientMedia.checksum);
        assert.notStrictEqual(media, clientMedia);
        assert.deepStrictEqual(clientMedia, original);
    });
});

describe("podcastMediaInputSchema media type", () => {
    const validMedia = {
        url: "https://example.com/ep.mp3",
        length: 1,
        checksum: "etag:abc",
    };

    for (const type of allowedEpisodeAudioMimeTypes) {
        it(`accepts the allowed audio type ${type}`, () => {
            const result = podcastMediaInputSchema.validate({ ...validMedia, type });
            assert.strictEqual(result.error, undefined);
        });
    }

    it("rejects a type outside the shared allowed list with the full list in the message", () => {
        const result = podcastMediaInputSchema.validate({ ...validMedia, type: "video/mp4" });
        assert.strictEqual(
            result.error?.message,
            "Media type must be a valid audio format: audio/mpeg, audio/mp3, audio/mp4, audio/m4a, audio/wav, audio/ogg, audio/aac, audio/flac, audio/x-m4a",
        );
    });
});
