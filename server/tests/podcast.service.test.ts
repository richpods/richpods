import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert";
import { EventEmitter } from "node:events";
import got from "got";
import {
    extractFeedUrl,
    getPodcastMetadata,
    selectEpisodesForGuid,
    selectFeedCandidates,
} from "../src/services/podcast.service.js";
import type { ParsedEpisode } from "../src/types/services.js";

const ORIGIN = "http://93.184.216.34";
const FEED_URL = `${ORIGIN}/feed.xml`;
const PAGE_URL = `${ORIGIN}/page.html`;
const FANOUT = 300;

type FixtureItem = {
    title: string;
    guid: string;
    enclosureUrl: string;
    enclosureType: string;
    guidAttributes?: string;
};

type FixtureResponse = {
    statusCode: number;
    rawBody: Buffer;
    headers: Record<string, string>;
};

type RequestOptions = {
    retry?: unknown;
};

const range = (count: number): number[] => Array.from({ length: count }, (_, i) => i);

const audioItem = (index: number, guid: string): FixtureItem => ({
    title: `Episode ${index}`,
    guid,
    enclosureUrl: `${ORIGIN}/audio-${index}.mp3`,
    enclosureType: "audio/mpeg",
});

const pdfItem = (index: number, guid: string): FixtureItem => ({
    title: `Document ${index}`,
    guid,
    enclosureUrl: `${ORIGIN}/doc-${index}.pdf`,
    enclosureType: "application/pdf",
});

const renderItem = (item: FixtureItem): string =>
    `<item><title>${item.title}</title>` +
    `<guid${item.guidAttributes ?? ""}>${item.guid}</guid>` +
    `<enclosure url="${item.enclosureUrl}" type="${item.enclosureType}" length="1"/></item>`;

const renderFeed = (items: readonly FixtureItem[]): string =>
    `<?xml version="1.0"?><rss version="2.0"><channel><title>Fixture</title>` +
    `<description>Fixture feed</description>${items.map(renderItem).join("")}</channel></rss>`;

const renderPage = (feedHrefs: readonly string[]): string =>
    "<html><head>" +
    feedHrefs.map((href) => `<link type="application/rss+xml" href="${href}">`).join("") +
    `</head><body>${"x".repeat(200)}</body></html>`;

const candidateUrl = (index: number): string => `${ORIGIN}/candidate-${index}.xml`;

const xmlResponse = (body: string): FixtureResponse => ({
    statusCode: 200,
    rawBody: Buffer.from(body),
    headers: { "content-type": "application/rss+xml" },
});

const htmlResponse = (body: string): FixtureResponse => ({
    statusCode: 200,
    rawBody: Buffer.from(body),
    headers: { "content-type": "text/html" },
});

const toEpisode = (item: FixtureItem): ParsedEpisode => ({
    title: item.title,
    guid: item.guid,
    enclosure: { url: item.enclosureUrl, type: item.enclosureType, length: "1" },
});

const mockGet = (routes: (url: string) => FixtureResponse) =>
    mock.method(got, "get", (url: string) => {
        const events = new EventEmitter();
        return Object.assign(Promise.resolve(routes(url)), { on: events.on.bind(events) });
    });

const mockHead = () =>
    mock.method(got, "head", async (_url: string, _options: RequestOptions) => ({
        headers: { "content-length": "1234" },
    }));

const noAudioFeed = renderFeed([pdfItem(0, "doc")]);
const audioFeed = renderFeed([audioItem(0, "ep")]);

describe("podcast service outbound fan-out", () => {
    beforeEach(() => {
        mock.method(console, "error", () => undefined);
        mock.method(console, "info", () => undefined);
        mock.method(console, "log", () => undefined);
    });

    afterEach(() => {
        mock.restoreAll();
    });

    describe("selectFeedCandidates", () => {
        it("caps a large candidate list at five entries", () => {
            const candidates = range(FANOUT).map(candidateUrl);
            assert.deepStrictEqual(selectFeedCandidates(candidates), range(5).map(candidateUrl));
        });

        it("deduplicates in first-seen order without spending the cap on duplicates", () => {
            const candidates = [
                candidateUrl(3),
                candidateUrl(3),
                candidateUrl(1),
                candidateUrl(3),
                candidateUrl(1),
                candidateUrl(7),
                candidateUrl(2),
                candidateUrl(9),
                candidateUrl(4),
            ];
            assert.deepStrictEqual(selectFeedCandidates(candidates), [
                candidateUrl(3),
                candidateUrl(1),
                candidateUrl(7),
                candidateUrl(2),
                candidateUrl(9),
            ]);
        });

        it("returns fewer than the cap when fewer unique candidates exist", () => {
            const candidates = [candidateUrl(1), candidateUrl(1), candidateUrl(2)];
            assert.deepStrictEqual(selectFeedCandidates(candidates), [
                candidateUrl(1),
                candidateUrl(2),
            ]);
        });

        it("respects an explicit maximum", () => {
            const candidates = range(10).map(candidateUrl);
            assert.deepStrictEqual(selectFeedCandidates(candidates, 2), [
                candidateUrl(0),
                candidateUrl(1),
            ]);
        });
    });

    describe("selectEpisodesForGuid", () => {
        it("returns only the first matching audio episode out of many duplicates", () => {
            const items = range(FANOUT).map((i) => toEpisode(audioItem(i, "g")));
            const selected = selectEpisodesForGuid(items, "g");
            assert.strictEqual(selected.length, 1);
            assert.strictEqual(selected[0], items[0]);
        });

        it("skips matching items without audio and returns a later audio match", () => {
            const items = [
                toEpisode(audioItem(0, "other")),
                toEpisode(pdfItem(1, "g")),
                toEpisode(audioItem(2, "g")),
                toEpisode(audioItem(3, "g")),
            ];
            assert.deepStrictEqual(selectEpisodesForGuid(items, "g"), [items[2]]);
        });

        it("matches guids given as objects", () => {
            const items: ParsedEpisode[] = [
                { ...toEpisode(audioItem(0, "x")), guid: { _: "other" } },
                { ...toEpisode(audioItem(1, "x")), guid: { _: "g" } },
            ];
            assert.deepStrictEqual(selectEpisodesForGuid(items, "g"), [items[1]]);
        });

        it("throws when no item matches the guid", () => {
            const items = [toEpisode(audioItem(0, "a")), toEpisode(audioItem(1, "b"))];
            assert.throws(() => selectEpisodesForGuid(items, "g"), {
                message: "Episode with GUID g not found",
            });
        });

        it("returns no episodes when every match lacks an audio enclosure", () => {
            const items = [toEpisode(pdfItem(0, "g")), toEpisode(pdfItem(1, "g"))];
            assert.deepStrictEqual(selectEpisodesForGuid(items, "g"), []);
        });
    });

    describe("getPodcastMetadata", () => {
        it("sends a single HEAD request for a feed repeating the guid across many items", async () => {
            const items = range(FANOUT).map((i) => ({
                ...audioItem(i, "g"),
                guidAttributes: i % 2 === 0 ? ' isPermaLink="false"' : "",
            }));
            const get = mockGet(() => xmlResponse(renderFeed(items)));
            const head = mockHead();

            const result = await getPodcastMetadata(FEED_URL, "g");

            assert.strictEqual(get.mock.callCount(), 1);
            assert.strictEqual(head.mock.callCount(), 1);
            assert.strictEqual(head.mock.calls[0].arguments[0], `${ORIGIN}/audio-0.mp3`);
            assert.strictEqual(result.episodes.length, 1);
            assert.strictEqual(result.episodes[0].guid, "g");
            assert.strictEqual(result.episodes[0].url, `${ORIGIN}/audio-0.mp3`);
            assert.strictEqual(result.episodes[0].checksum, "length:1234");
        });

        it("disables retries for the checksum HEAD request", async () => {
            mockGet(() => xmlResponse(renderFeed([audioItem(0, "g")])));
            const head = mockHead();

            await getPodcastMetadata(FEED_URL, "g");

            assert.strictEqual(head.mock.callCount(), 1);
            assert.deepStrictEqual(head.mock.calls[0].arguments[1]?.retry, { limit: 0 });
        });

        it("uses the first matching item that has an audio enclosure", async () => {
            const items = [pdfItem(0, "g"), ...range(FANOUT).map((i) => audioItem(i + 1, "g"))];
            mockGet(() => xmlResponse(renderFeed(items)));
            const head = mockHead();

            const result = await getPodcastMetadata(FEED_URL, "g");

            assert.strictEqual(head.mock.callCount(), 1);
            assert.strictEqual(result.episodes.length, 1);
            assert.strictEqual(result.episodes[0].url, `${ORIGIN}/audio-1.mp3`);
        });

        it("rejects without HEAD requests when the guid is unknown", async () => {
            mockGet(() => xmlResponse(renderFeed(range(FANOUT).map((i) => audioItem(i, "a")))));
            const head = mockHead();

            await assert.rejects(getPodcastMetadata(FEED_URL, "g"), {
                message: "Episode with GUID g not found",
            });
            assert.strictEqual(head.mock.callCount(), 0);
        });

        it("rejects without HEAD requests when every guid match lacks audio", async () => {
            mockGet(() => xmlResponse(renderFeed(range(FANOUT).map((i) => pdfItem(i, "g")))));
            const head = mockHead();

            await assert.rejects(getPodcastMetadata(FEED_URL, "g"), {
                message: "No valid audio episodes found in the podcast feed",
            });
            assert.strictEqual(head.mock.callCount(), 0);
        });

        it("still returns every audio episode without HEAD requests when no guid is given", async () => {
            const items = [
                ...range(FANOUT).map((i) => audioItem(i, `g-${i}`)),
                pdfItem(FANOUT, "doc"),
            ];
            mockGet(() => xmlResponse(renderFeed(items)));
            const head = mockHead();

            const result = await getPodcastMetadata(FEED_URL);

            assert.strictEqual(head.mock.callCount(), 0);
            assert.strictEqual(result.episodes.length, FANOUT);
            assert.deepStrictEqual(
                result.episodes.map((episode) => episode.guid),
                range(FANOUT).map((i) => `g-${i}`),
            );
            assert.ok(result.episodes.every((episode) => episode.checksum === ""));
        });
    });

    describe("extractFeedUrl", () => {
        it("fetches at most five feed candidates from a page listing many", async () => {
            const page = renderPage(range(FANOUT).map(candidateUrl));
            const get = mockGet((url) =>
                url === PAGE_URL ? htmlResponse(page) : xmlResponse(noAudioFeed),
            );

            await assert.rejects(extractFeedUrl(PAGE_URL), {
                message: "Failed to fetch or parse URL: No RSS 2.0 podcast feed found on the page",
            });

            assert.strictEqual(get.mock.callCount(), 1 + 5);
            assert.deepStrictEqual(
                get.mock.calls.map((call) => call.arguments[0]),
                [PAGE_URL, ...range(5).map(candidateUrl)],
            );
        });

        it("does not spend the candidate budget on repeated links", async () => {
            const hrefs = [
                ...range(FANOUT).map(() => candidateUrl(0)),
                ...range(FANOUT).map(candidateUrl),
            ];
            const page = renderPage(hrefs);
            const get = mockGet((url) =>
                url === PAGE_URL ? htmlResponse(page) : xmlResponse(noAudioFeed),
            );

            await assert.rejects(extractFeedUrl(PAGE_URL));

            assert.deepStrictEqual(
                get.mock.calls.map((call) => call.arguments[0]),
                [PAGE_URL, ...range(5).map(candidateUrl)],
            );
        });

        it("returns an audio feed found within the candidate budget", async () => {
            const page = renderPage(range(FANOUT).map(candidateUrl));
            const get = mockGet((url) => {
                if (url === PAGE_URL) return htmlResponse(page);
                return url === candidateUrl(4) ? xmlResponse(audioFeed) : xmlResponse(noAudioFeed);
            });

            assert.strictEqual(await extractFeedUrl(PAGE_URL), candidateUrl(4));
            assert.strictEqual(get.mock.callCount(), 1 + 5);
        });

        it("ignores audio feeds listed beyond the candidate budget", async () => {
            const page = renderPage(range(FANOUT).map(candidateUrl));
            const get = mockGet((url) => {
                if (url === PAGE_URL) return htmlResponse(page);
                return url === candidateUrl(5) ? xmlResponse(audioFeed) : xmlResponse(noAudioFeed);
            });

            await assert.rejects(extractFeedUrl(PAGE_URL), {
                message: "Failed to fetch or parse URL: No RSS 2.0 podcast feed found on the page",
            });
            assert.strictEqual(get.mock.callCount(), 1 + 5);
        });
    });
});
