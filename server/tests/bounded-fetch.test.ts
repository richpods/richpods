import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert";
import http, {
    type IncomingHttpHeaders,
    type IncomingMessage,
    type ServerResponse,
} from "node:http";
import { type Duplex, duplexPair, pipeline, Readable } from "node:stream";
import { gzipSync } from "node:zlib";
import { getMaxFeedSize } from "@richpods/shared/media/feed";
import { fetchTextWithLimit, sizeLimitError } from "../src/utils/bounded-fetch.js";
import { extractFeedUrl, getPodcastMetadata } from "../src/services/podcast.service.js";

const PUBLIC_URL = "http://93.184.216.34/feed.xml";
const SMALL_LIMIT = 64 * 1024;
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

describe("sizeLimitError", () => {
    it("should keep the existing feed size wording", () => {
        assert.strictEqual(
            sizeLimitError("feed", 40 * 1024 * 1024).message,
            "Feed exceeds maximum allowed size of 40 MB",
        );
    });

    it("should not carry a system error code", () => {
        assert.strictEqual("code" in sizeLimitError("URL", SMALL_LIMIT), false);
    });
});

describe("fetchTextWithLimit", () => {
    afterEach(() => {
        mock.restoreAll();
    });

    it("should stop a chunked body mid-transfer once it crosses the limit", async () => {
        let streamedBytes = 0;
        const { connectionCount } = serveInProcess(
            streamChunked(SMALL_LIMIT * 256, (bytes) => {
                streamedBytes += bytes;
            }),
        );

        await assert.rejects(
            fetchTextWithLimit(PUBLIC_URL, {
                subject: "feed",
                timeoutMs: 5000,
                retryLimit: 1,
                maxBytes: SMALL_LIMIT,
            }),
            { message: "Feed exceeds maximum allowed size of 64 KB" },
        );
        assert.ok(streamedBytes < SMALL_LIMIT * 64, `streamed ${streamedBytes} bytes`);
        assert.strictEqual(connectionCount(), 1);
    });

    it("should reject a declared Content-Length over the limit before any body arrives", async () => {
        serveInProcess((_req, res) => {
            res.writeHead(200, {
                "content-type": "application/rss+xml",
                "content-length": String(SMALL_LIMIT * 16),
                connection: "close",
            });
            res.flushHeaders();
        });

        await assert.rejects(
            fetchTextWithLimit(PUBLIC_URL, {
                subject: "feed",
                timeoutMs: 2000,
                retryLimit: 0,
                maxBytes: SMALL_LIMIT,
            }),
            { message: "Feed exceeds maximum allowed size of 64 KB" },
        );
    });

    it("should reject a gzip body that is small on the wire but large once decoded", async () => {
        const compressed = gzipSync(Buffer.alloc(SMALL_LIMIT * 16, "x"));
        assert.ok(compressed.length < SMALL_LIMIT);
        serveInProcess((_req, res) => {
            res.writeHead(200, {
                "content-type": "application/rss+xml",
                "content-encoding": "gzip",
                "content-length": String(compressed.length),
                connection: "close",
            });
            res.end(compressed);
        });

        await assert.rejects(
            fetchTextWithLimit(PUBLIC_URL, {
                subject: "feed",
                timeoutMs: 5000,
                maxBytes: SMALL_LIMIT,
            }),
            { message: "Feed exceeds maximum allowed size of 64 KB" },
        );
    });

    it("should resolve a body under the limit with body and headers intact", async () => {
        let requestHeaders: IncomingHttpHeaders = {};
        serveInProcess((req, res) => {
            requestHeaders = req.headers;
            respondWith(200, SMALL_FEED, {
                "content-type": "application/rss+xml; charset=utf-8",
                "x-feed-id": "small",
            })(req, res);
        });

        const result = await fetchTextWithLimit(PUBLIC_URL, {
            subject: "feed",
            timeoutMs: 5000,
            headers: { "User-Agent": "bounded-fetch-test", Accept: "application/rss+xml" },
            maxBytes: SMALL_LIMIT,
        });

        assert.strictEqual(result.body, SMALL_FEED);
        assert.strictEqual(result.headers["content-type"], "application/rss+xml; charset=utf-8");
        assert.strictEqual(result.headers["x-feed-id"], "small");
        assert.strictEqual(requestHeaders["user-agent"], "bounded-fetch-test");
        assert.strictEqual(requestHeaders.accept, "application/rss+xml");
    });

    it("should map HTTP errors to a client-safe message", async () => {
        serveInProcess(respondWith(500, "internal details"));

        await assert.rejects(
            fetchTextWithLimit(PUBLIC_URL, {
                subject: "podcast feed",
                timeoutMs: 5000,
                retryLimit: 0,
                maxBytes: SMALL_LIMIT,
            }),
            { message: "Failed to fetch podcast feed: HTTP 500" },
        );
    });

    it("should refuse non-public targets before connecting", async () => {
        const { connectionCount } = serveInProcess(respondWith(200, SMALL_FEED));

        await assert.rejects(
            fetchTextWithLimit("http://127.0.0.1/feed.xml", {
                subject: "feed",
                timeoutMs: 5000,
                maxBytes: SMALL_LIMIT,
            }),
            { message: "IP is not allowed: 127.0.0.1" },
        );
        assert.strictEqual(connectionCount(), 0);
    });
});

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
