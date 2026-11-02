import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { type Duplex, duplexPair, pipeline, Readable } from "node:stream";
import { getMaxFeedSize } from "@richpods/shared/media/feed";
import { extractFeedUrl, getPodcastMetadata } from "../src/services/podcast.service.js";

const PUBLIC_URL = "http://93.184.216.34/feed.xml";
const FILLER_CHUNK = "x".repeat(64 * 1024);
const RSS_HEAD =
    '<?xml version="1.0"?><rss version="2.0"><channel><title>Bounded</title>' +
    "<description>Bounded fetch test feed</description><item><title>Episode</title>" +
    '<guid>episode-1</guid><enclosure url="http://93.184.216.34/a.mp3" type="audio/mpeg" length="1"/>' +
    "</item>";
const RSS_TAIL = "</channel></rss>";
const SMALL_FEED = RSS_HEAD + RSS_TAIL;

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

function withSocketShims(side: Duplex): Duplex {
    return Object.assign(side, {
        setTimeout: () => side,
        setNoDelay: () => side,
        setKeepAlive: () => side,
        ref: () => side,
        unref: () => side,
    });
}

function serveInProcess(handler: Handler): { connectionCount: () => number } {
    const server = http.createServer(handler);
    let connections = 0;
    mock.method(http.globalAgent, "createConnection", () => {
        connections += 1;
        const [clientSide, serverSide] = duplexPair();
        server.emit("connection", withSocketShims(serverSide));
        return withSocketShims(clientSide);
    });
    return { connectionCount: () => connections };
}

function* paddedFeedChunks(fillerBytes: number): Generator<string> {
    yield `${RSS_HEAD}<!--`;
    for (let sent = 0; sent < fillerBytes; sent += FILLER_CHUNK.length) {
        yield FILLER_CHUNK;
    }
    yield `-->${RSS_TAIL}`;
}

function streamChunked(fillerBytes: number, onChunk: (bytes: number) => void = () => {}): Handler {
    return (_req, res) => {
        res.writeHead(200, { "content-type": "application/rss+xml", connection: "close" });
        const source = Readable.from(paddedFeedChunks(fillerBytes));
        source.on("data", (chunk: string) => onChunk(chunk.length));
        pipeline(source, res, () => {});
    };
}

function respondWith(status: number, body: string, headers: Record<string, string> = {}): Handler {
    return (_req, res) => {
        res.writeHead(status, { ...headers, connection: "close" });
        res.end(body);
    };
}

describe("feed fetching services", () => {
    const maxFeedMb = getMaxFeedSize() / 1024 / 1024;
    const overLimitFiller = getMaxFeedSize() + FILLER_CHUNK.length;

    beforeEach(() => {
        mock.method(console, "error", () => {});
        mock.method(console, "info", () => {});
    });

    afterEach(() => {
        mock.restoreAll();
    });

    it("getPodcastMetadata should reject a feed larger than the feed size limit", async () => {
        serveInProcess(streamChunked(overLimitFiller));

        await assert.rejects(getPodcastMetadata(PUBLIC_URL), {
            message: `Podcast feed exceeds maximum allowed size of ${maxFeedMb} MB`,
        });
    });

    it("getPodcastMetadata should still parse a feed within the limit", async () => {
        serveInProcess(respondWith(200, SMALL_FEED, { "content-type": "application/rss+xml" }));

        const metadata = await getPodcastMetadata(PUBLIC_URL);

        assert.strictEqual(metadata.podcast.title, "Bounded");
        assert.deepStrictEqual(
            metadata.episodes.map((episode) => episode.guid),
            ["episode-1"],
        );
    });

    it("extractFeedUrl should reject a response larger than the feed size limit", async () => {
        const { connectionCount } = serveInProcess(streamChunked(overLimitFiller));

        await assert.rejects(extractFeedUrl(PUBLIC_URL), {
            message: `Failed to fetch or parse URL: URL exceeds maximum allowed size of ${maxFeedMb} MB`,
        });
        assert.strictEqual(connectionCount(), 1);
    });

    it("extractFeedUrl should still detect a feed within the limit by its content type", async () => {
        serveInProcess(respondWith(200, SMALL_FEED, { "content-type": "application/rss+xml" }));

        assert.strictEqual(await extractFeedUrl(PUBLIC_URL), PUBLIC_URL);
    });

    it("fetchFeed should reject a feed larger than the feed size limit", async () => {
        process.env.GCS_BUCKET_NAME ??= "bounded-fetch-test-bucket";
        const { fetchFeed } = await import("../src/services/feed.service.js");
        serveInProcess(streamChunked(overLimitFiller));

        await assert.rejects(fetchFeed(PUBLIC_URL), {
            message: `Feed exceeds maximum allowed size of ${maxFeedMb} MB`,
        });
    });
});
