import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert";
import dns, { type LookupAddress } from "node:dns";
import http, {
    type IncomingHttpHeaders,
    type IncomingMessage,
    type ServerResponse,
} from "node:http";
import { syncBuiltinESMExports } from "node:module";
import { type Duplex, duplexPair, pipeline, Readable } from "node:stream";
import { gzipSync } from "node:zlib";
import got from "got";
import {
    exceedsSizeLimit,
    fetchBufferWithLimit,
    fetchTextWithLimit,
    sizeLimitError,
    ssrfSafeRequestOptions,
} from "@richpods/shared/utils/bounded-fetch";

const PUBLIC_URL = "http://93.184.216.34/resource";
const REBINDING_URL = "http://rebind.test/resource";
const LIMIT = 64 * 1024;
const OVERSIZED_BYTES = LIMIT * 256;
const CHUNK = Buffer.alloc(16 * 1024, 1);
const TOO_LARGE = "Response exceeds the size limit";

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

function* chunksOf(totalBytes: number): Generator<Buffer> {
    for (let sent = 0; sent < totalBytes; sent += CHUNK.length) {
        yield CHUNK.subarray(0, Math.min(CHUNK.length, totalBytes - sent));
    }
}

function streamChunked(totalBytes: number, onChunk: (bytes: number) => void = () => {}): Handler {
    return (_req, res) => {
        res.writeHead(200, { "content-type": "application/octet-stream", connection: "close" });
        const source = Readable.from(chunksOf(totalBytes));
        source.on("data", (chunk: Buffer) => onChunk(chunk.length));
        pipeline(source, res, () => {});
    };
}

function respondWith(
    status: number,
    body: Uint8Array | string,
    headers: Record<string, string> = {},
): Handler {
    return (_req, res) => {
        res.writeHead(status, { ...headers, connection: "close" });
        res.end(body);
    };
}

function resolveRebinding(publicAddress: string, privateAddress: string): () => number {
    let connectTimeLookups = 0;
    mock.method(dns.promises, "lookup", async () => [{ address: publicAddress, family: 4 }]);
    mock.method(
        dns,
        "lookup",
        (
            _hostname: string,
            _options: dns.LookupAllOptions,
            callback: (error: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void,
        ) => {
            connectTimeLookups += 1;
            callback(null, [{ address: privateAddress, family: 4 }]);
        },
    );
    syncBuiltinESMExports();
    return () => connectTimeLookups;
}

afterEach(() => {
    mock.restoreAll();
    syncBuiltinESMExports();
});

describe("sizeLimitError", () => {
    it("should capitalize the subject and format the limit", () => {
        assert.strictEqual(
            sizeLimitError("feed", 40 * 1024 * 1024).message,
            "Feed exceeds maximum allowed size of 40 MB",
        );
    });

    it("should not carry a system error code", () => {
        assert.strictEqual("code" in sizeLimitError("URL", LIMIT), false);
    });
});

describe("exceedsSizeLimit", () => {
    it("should accept progress at the limit with or without a declared total", () => {
        assert.strictEqual(exceedsSizeLimit({ percent: 1, transferred: 10, total: 10 }, 10), false);
        assert.strictEqual(exceedsSizeLimit({ percent: 0, transferred: 10 }, 10), false);
        assert.strictEqual(exceedsSizeLimit({ percent: 0, transferred: 0 }, 10), false);
    });

    it("should reject when the transferred bytes exceed the limit", () => {
        assert.strictEqual(exceedsSizeLimit({ percent: 0, transferred: 11 }, 10), true);
    });

    it("should reject when the declared total exceeds the limit", () => {
        assert.strictEqual(exceedsSizeLimit({ percent: 0, transferred: 0, total: 11 }, 10), true);
    });
});

describe("fetchBufferWithLimit", () => {
    it("should abort a chunked body mid-transfer once it crosses the limit", async () => {
        let streamedBytes = 0;
        const { connectionCount } = serveInProcess(
            streamChunked(OVERSIZED_BYTES, (bytes) => {
                streamedBytes += bytes;
            }),
        );

        await assert.rejects(
            fetchBufferWithLimit(PUBLIC_URL, {
                subject: "audio",
                maxBytes: LIMIT,
                timeoutMs: 5000,
                retryLimit: 1,
            }),
            { message: "Audio exceeds maximum allowed size of 64 KB" },
        );
        assert.ok(streamedBytes < OVERSIZED_BYTES / 4, `streamed ${streamedBytes} bytes`);
        assert.strictEqual(connectionCount(), 1);
    });

    it("should use tooLargeMessage instead of the subject wording when given", async () => {
        serveInProcess(streamChunked(LIMIT + 1));

        await assert.rejects(
            fetchBufferWithLimit(PUBLIC_URL, {
                subject: "audio",
                maxBytes: LIMIT,
                timeoutMs: 5000,
                tooLargeMessage: TOO_LARGE,
            }),
            { message: TOO_LARGE },
        );
    });

    it("should reject a declared Content-Length over the limit before any body arrives", async () => {
        serveInProcess((_req, res) => {
            res.writeHead(200, {
                "content-type": "application/octet-stream",
                "content-length": String(LIMIT + 1),
                connection: "close",
            });
            res.flushHeaders();
        });

        await assert.rejects(
            fetchBufferWithLimit(PUBLIC_URL, {
                subject: "audio",
                maxBytes: LIMIT,
                timeoutMs: 2000,
                retryLimit: 0,
                tooLargeMessage: TOO_LARGE,
            }),
            { message: TOO_LARGE },
        );
    });

    it("should reject a gzip body that is small on the wire but large once decoded", async () => {
        const compressed = gzipSync(Buffer.alloc(LIMIT * 16, 1));
        assert.ok(compressed.length < LIMIT);
        serveInProcess(
            respondWith(200, compressed, {
                "content-type": "application/octet-stream",
                "content-encoding": "gzip",
                "content-length": String(compressed.length),
            }),
        );

        await assert.rejects(
            fetchBufferWithLimit(PUBLIC_URL, {
                subject: "audio",
                maxBytes: LIMIT,
                timeoutMs: 5000,
                tooLargeMessage: TOO_LARGE,
            }),
            { message: TOO_LARGE },
        );
    });

    it("should return a binary body exactly at the limit intact", async () => {
        const payload = Uint8Array.from({ length: LIMIT }, (_, index) => index % 251);
        serveInProcess(
            respondWith(200, payload, {
                "content-type": "audio/mpeg",
                "content-length": String(LIMIT),
            }),
        );

        const result = await fetchBufferWithLimit(PUBLIC_URL, {
            subject: "audio",
            maxBytes: LIMIT,
            timeoutMs: 5000,
        });

        assert.strictEqual(result.statusCode, 200);
        assert.strictEqual(result.headers["content-type"], "audio/mpeg");
        assert.deepStrictEqual(Buffer.from(result.body), Buffer.from(payload));
    });

    it("should return a chunked body without Content-Length under the limit intact", async () => {
        serveInProcess(streamChunked(LIMIT - 1));

        const result = await fetchBufferWithLimit(PUBLIC_URL, {
            subject: "audio",
            maxBytes: LIMIT,
            timeoutMs: 5000,
        });

        assert.strictEqual(result.body.byteLength, LIMIT - 1);
        assert.ok(result.body.every((byte) => byte === 1));
    });

    it("should send request headers and return a ranged response", async () => {
        const header = Uint8Array.from([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0, 0, 0]);
        let rangeHeader: string | undefined;
        serveInProcess((req, res) => {
            rangeHeader = req.headers.range;
            respondWith(206, header, {
                "content-type": "audio/mpeg",
                "content-range": "bytes 0-11/5000000",
            })(req, res);
        });

        const result = await fetchBufferWithLimit(PUBLIC_URL, {
            subject: "audio header",
            maxBytes: 1024,
            timeoutMs: 5000,
            headers: { range: "bytes=0-11" },
            throwHttpErrors: false,
        });

        assert.strictEqual(rangeHeader, "bytes=0-11");
        assert.strictEqual(result.statusCode, 206);
        assert.deepStrictEqual(Buffer.from(result.body), Buffer.from(header));
    });

    it("should abort a range-ignoring full response against a small probe limit", async () => {
        let streamedBytes = 0;
        serveInProcess(
            streamChunked(OVERSIZED_BYTES, (bytes) => {
                streamedBytes += bytes;
            }),
        );

        await assert.rejects(
            fetchBufferWithLimit(PUBLIC_URL, {
                subject: "audio header",
                maxBytes: 1024,
                timeoutMs: 5000,
                tooLargeMessage: TOO_LARGE,
                headers: { range: "bytes=0-11" },
                throwHttpErrors: false,
            }),
            { message: TOO_LARGE },
        );
        assert.ok(streamedBytes < OVERSIZED_BYTES / 4, `streamed ${streamedBytes} bytes`);
    });

    it("should return an HTTP error response when throwHttpErrors is false", async () => {
        serveInProcess(respondWith(404, "missing"));

        const result = await fetchBufferWithLimit(PUBLIC_URL, {
            subject: "audio",
            maxBytes: LIMIT,
            timeoutMs: 5000,
            throwHttpErrors: false,
        });

        assert.strictEqual(result.statusCode, 404);
        assert.strictEqual(Buffer.from(result.body).toString(), "missing");
    });

    it("should map an HTTP error to a client-safe message without retrying", async () => {
        const { connectionCount } = serveInProcess(respondWith(503, "internal details"));

        await assert.rejects(
            fetchBufferWithLimit(PUBLIC_URL, {
                subject: "audio",
                maxBytes: LIMIT,
                timeoutMs: 5000,
                retryLimit: 0,
            }),
            { message: "Failed to fetch audio: HTTP 503" },
        );
        assert.strictEqual(connectionCount(), 1);
    });

    it("should map a timeout to a client-safe message", async () => {
        serveInProcess(() => {});

        await assert.rejects(
            fetchBufferWithLimit(PUBLIC_URL, {
                subject: "audio",
                maxBytes: LIMIT,
                timeoutMs: 100,
                retryLimit: 0,
            }),
            { message: "Failed to fetch audio: request timed out" },
        );
    });

    it("should refuse a non-public target before connecting", async () => {
        const { connectionCount } = serveInProcess(respondWith(200, "body"));

        await assert.rejects(
            fetchBufferWithLimit("http://127.0.0.1/resource", {
                subject: "audio",
                maxBytes: LIMIT,
                timeoutMs: 5000,
            }),
            { message: "IP is not allowed: 127.0.0.1" },
        );
        assert.strictEqual(connectionCount(), 0);
    });

    it("should refuse a redirect onto a non-public address", async () => {
        const { connectionCount } = serveInProcess(
            respondWith(302, "", { location: "http://169.254.169.254/computeMetadata/v1/" }),
        );

        await assert.rejects(
            fetchBufferWithLimit(PUBLIC_URL, {
                subject: "audio",
                maxBytes: LIMIT,
                timeoutMs: 5000,
                retryLimit: 0,
            }),
            { message: "Failed to fetch audio: network error" },
        );
        assert.strictEqual(connectionCount(), 1);
    });

    it("should re-check DNS at connect time so a rebinding host cannot reach a private address", async () => {
        const connectTimeLookups = resolveRebinding("93.184.216.34", "127.0.0.1");

        await assert.rejects(
            fetchBufferWithLimit(REBINDING_URL, {
                subject: "audio",
                maxBytes: LIMIT,
                timeoutMs: 5000,
                retryLimit: 0,
            }),
            { message: "Failed to fetch audio: blocked non-public address" },
        );
        assert.strictEqual(connectTimeLookups(), 1);
    });
});

describe("fetchTextWithLimit", () => {
    it("should decode a UTF-8 body and keep the response headers", async () => {
        const text = "Grüße aus Österreich – 🎙️";
        let requestHeaders: IncomingHttpHeaders = {};
        serveInProcess((req, res) => {
            requestHeaders = req.headers;
            respondWith(200, text, {
                "content-type": "application/rss+xml; charset=utf-8",
                "x-feed-id": "small",
            })(req, res);
        });

        const result = await fetchTextWithLimit(PUBLIC_URL, {
            subject: "feed",
            maxBytes: LIMIT,
            timeoutMs: 5000,
            headers: { "User-Agent": "bounded-fetch-test", Accept: "application/rss+xml" },
        });

        assert.strictEqual(result.body, text);
        assert.strictEqual(result.statusCode, 200);
        assert.strictEqual(result.headers["content-type"], "application/rss+xml; charset=utf-8");
        assert.strictEqual(result.headers["x-feed-id"], "small");
        assert.strictEqual(requestHeaders["user-agent"], "bounded-fetch-test");
        assert.strictEqual(requestHeaders.accept, "application/rss+xml");
    });

    it("should apply the byte limit to the encoded body, not the decoded string length", async () => {
        const multibyte = "€".repeat(LIMIT / 2);
        assert.ok(multibyte.length < LIMIT && Buffer.byteLength(multibyte) > LIMIT);
        serveInProcess(respondWith(200, multibyte));

        await assert.rejects(
            fetchTextWithLimit(PUBLIC_URL, {
                subject: "feed",
                maxBytes: LIMIT,
                timeoutMs: 5000,
            }),
            { message: "Feed exceeds maximum allowed size of 64 KB" },
        );
    });
});

describe("ssrfSafeRequestOptions", () => {
    it("should re-check DNS at connect time for a plain got request", async () => {
        const connectTimeLookups = resolveRebinding("93.184.216.34", "10.0.0.1");

        await assert.rejects(
            got.head(REBINDING_URL, {
                timeout: { request: 2000 },
                retry: { limit: 0 },
                ...ssrfSafeRequestOptions,
            }),
            { code: "EBLOCKED" },
        );
        assert.strictEqual(connectTimeLookups(), 1);
    });

    it("should refuse a redirect onto a non-public address for a plain got request", async () => {
        const { connectionCount } = serveInProcess(
            respondWith(301, "", { location: "http://[::1]/admin" }),
        );

        await assert.rejects(
            got(PUBLIC_URL, {
                responseType: "text",
                retry: { limit: 0 },
                ...ssrfSafeRequestOptions,
            }),
            { message: "IP is not allowed: ::1" },
        );
        assert.strictEqual(connectionCount(), 1);
    });
});
