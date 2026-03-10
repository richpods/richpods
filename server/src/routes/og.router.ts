import dns from "node:dns";
import net from "node:net";
import express, { Request, Response } from "express";
import got, { type OptionsInit } from "got";
import { load as cheerioLoad } from "cheerio";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import { v4 as uuidv4 } from "uuid";
import { Storage } from "@google-cloud/storage";
import { createAuthContext } from "../middleware/auth.js";
import { GCS_IMMUTABLE_CACHE_CONTROL } from "../config/storage.js";

export const ogRouter = express.Router();

const storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

const UPLOAD_BUCKET_NAME = process.env.GCS_UPLOAD_BUCKET_NAME ?? "";

const MAX_HTML_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MIN_IMAGE_WIDTH = 460;
const MIN_IMAGE_HEIGHT = 300;
const MAX_URL_LENGTH = 500;
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_REDIRECTS = 5;
const REQUEST_RETRY_LIMIT = 2;
const REQUEST_RETRY_BASE_DELAY_MS = 250;

const ALLOWED_IMAGE_MIMES: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
};

const BLOCKED_HOSTNAMES = new Set([
    "localhost",
    "metadata.google.internal",
    "metadata",
]);

const BLOCKED_HOST_SUFFIXES = [
    ".localhost",
    ".local",
    ".internal",
    ".home.arpa",
];

const OG_ERROR_KIND = "ogErrorKind";

type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

type UnsafeTargetError = {
    kind: "unsafe_target";
    message: string;
};

type DownloadLimitError = {
    kind: "download_limit_exceeded";
    maxBytes: number;
};

type FetchFailedError = {
    kind: "fetch_failed";
    message: string;
    cause?: unknown;
};

type RemoteFetchError = UnsafeTargetError | DownloadLimitError | FetchFailedError;

type TaggedOgError = Error & {
    [OG_ERROR_KIND]: "unsafe_target" | "download_limit_exceeded";
    maxBytes?: number;
};

type OgResult = {
    ogTitle: string | null;
    ogDescription: string | null;
    ogImageUrl: string | null;
    ogImageWidth: number | null;
    ogImageHeight: number | null;
};

function ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
}

function fail<E>(error: E): Result<never, E> {
    return { ok: false, error };
}

function unsafeTarget(message: string): UnsafeTargetError {
    return { kind: "unsafe_target", message };
}

function downloadLimitExceeded(maxBytes: number): DownloadLimitError {
    return { kind: "download_limit_exceeded", maxBytes };
}

function fetchFailed(message: string, cause?: unknown): FetchFailedError {
    return { kind: "fetch_failed", message, cause };
}

function toTaggedError(error: UnsafeTargetError | DownloadLimitError): TaggedOgError {
    if (error.kind === "unsafe_target") {
        return Object.assign(new Error(error.message), {
            [OG_ERROR_KIND]: "unsafe_target" as const,
        });
    }
    return Object.assign(
        new Error(`Response exceeded ${error.maxBytes} bytes`),
        {
            [OG_ERROR_KIND]: "download_limit_exceeded" as const,
            maxBytes: error.maxBytes,
        },
    );
}

function isTaggedOgError(value: unknown): value is TaggedOgError {
    if (!(value instanceof Error)) {
        return false;
    }
    const tagged = value as Partial<TaggedOgError>;
    return tagged[OG_ERROR_KIND] === "unsafe_target"
        || tagged[OG_ERROR_KIND] === "download_limit_exceeded";
}

function normalizeRemoteFetchError(error: unknown): RemoteFetchError {
    if (isTaggedOgError(error)) {
        if (error[OG_ERROR_KIND] === "unsafe_target") {
            return unsafeTarget(error.message);
        }
        return downloadLimitExceeded(error.maxBytes ?? MAX_HTML_SIZE);
    }
    if (error instanceof Error) {
        return fetchFailed(error.message, error);
    }
    return fetchFailed("Unknown request failure", error);
}

function createBlockedIpv4BlockList(): net.BlockList {
    const blockList = new net.BlockList();
    blockList.addSubnet("0.0.0.0", 8, "ipv4");
    blockList.addSubnet("10.0.0.0", 8, "ipv4");
    blockList.addSubnet("100.64.0.0", 10, "ipv4");
    blockList.addSubnet("127.0.0.0", 8, "ipv4");
    blockList.addSubnet("169.254.0.0", 16, "ipv4");
    blockList.addSubnet("172.16.0.0", 12, "ipv4");
    blockList.addSubnet("192.0.0.0", 24, "ipv4");
    blockList.addSubnet("192.0.2.0", 24, "ipv4");
    blockList.addSubnet("192.168.0.0", 16, "ipv4");
    blockList.addSubnet("198.18.0.0", 15, "ipv4");
    blockList.addSubnet("198.51.100.0", 24, "ipv4");
    blockList.addSubnet("203.0.113.0", 24, "ipv4");
    blockList.addSubnet("224.0.0.0", 4, "ipv4");
    blockList.addSubnet("240.0.0.0", 4, "ipv4");
    return blockList;
}

function createBlockedIpv6BlockList(): net.BlockList {
    const blockList = new net.BlockList();
    blockList.addSubnet("::", 128, "ipv6");
    blockList.addSubnet("::1", 128, "ipv6");
    blockList.addSubnet("::ffff:0:0", 96, "ipv6");
    blockList.addSubnet("fc00::", 7, "ipv6");
    blockList.addSubnet("fe80::", 10, "ipv6");
    blockList.addSubnet("ff00::", 8, "ipv6");
    return blockList;
}

const blockedIpv4BlockList = createBlockedIpv4BlockList();
const blockedIpv6BlockList = createBlockedIpv6BlockList();

function getPublicUrl(gcsName: string): string {
    const encodedPath = gcsName
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
    return `https://storage.googleapis.com/${UPLOAD_BUCKET_NAME}/${encodedPath}`;
}

function normalizeHostname(hostname: string): string {
    return hostname.trim().replace(/\.$/, "").toLowerCase();
}

function isBlockedHostname(hostname: string): boolean {
    if (BLOCKED_HOSTNAMES.has(hostname)) {
        return true;
    }
    return BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

function isBlockedIpAddress(ipAddress: string): boolean {
    const ipVersion = net.isIP(ipAddress);
    if (ipVersion === 4) {
        return blockedIpv4BlockList.check(ipAddress, "ipv4");
    }
    if (ipVersion === 6) {
        return blockedIpv6BlockList.check(ipAddress, "ipv6");
    }
    return true;
}

async function assertSafeRemoteTarget(url: URL): Promise<Result<void, UnsafeTargetError>> {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return fail(unsafeTarget("URL must use HTTP or HTTPS protocol"));
    }

    const hostname = normalizeHostname(url.hostname);
    if (!hostname) {
        return fail(unsafeTarget("URL host is required"));
    }

    if (isBlockedHostname(hostname)) {
        return fail(unsafeTarget(`Host is not allowed: ${hostname}`));
    }

    const ipVersion = net.isIP(hostname);
    if (ipVersion > 0) {
        if (isBlockedIpAddress(hostname)) {
            return fail(unsafeTarget(`IP is not allowed: ${hostname}`));
        }
        return ok(undefined);
    }

    let addresses: dns.LookupAddress[];
    try {
        addresses = await dns.promises.lookup(hostname, {
            all: true,
            verbatim: true,
        });
    } catch {
        return fail(unsafeTarget(`Unable to resolve host: ${hostname}`));
    }

    if (addresses.length === 0) {
        return fail(unsafeTarget(`Unable to resolve host: ${hostname}`));
    }

    const blockedAddress = addresses.find((address) => isBlockedIpAddress(address.address));
    if (blockedAddress) {
        return fail(unsafeTarget(`Resolved to disallowed IP: ${blockedAddress.address}`));
    }

    return ok(undefined);
}

function parseContentLengthHeader(contentLength: string | string[] | undefined): number | null {
    const rawValue = Array.isArray(contentLength) ? contentLength[0] : contentLength;
    if (!rawValue) {
        return null;
    }
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return null;
    }
    return parsed;
}

function wait(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, delayMs);
    });
}

function shouldRetryFetchError(error: RemoteFetchError): error is FetchFailedError {
    return error.kind === "fetch_failed";
}

function withSafeRedirectValidation(options: OptionsInit): OptionsInit {
    const existingBeforeRedirect = options.hooks?.beforeRedirect ?? [];
    return {
        ...options,
        retry: { limit: 0 },
        throwHttpErrors: true,
        maxRedirects: MAX_REDIRECTS,
        hooks: {
            ...options.hooks,
            beforeRedirect: [
                ...existingBeforeRedirect,
                async (updatedOptions) => {
                    if (!updatedOptions.url) {
                        throw toTaggedError(unsafeTarget("Redirect target URL is missing"));
                    }
                    const redirectUrl = new URL(updatedOptions.url.toString());
                    const safeRedirect = await assertSafeRemoteTarget(redirectUrl);
                    if (!safeRedirect.ok) {
                        throw toTaggedError(safeRedirect.error);
                    }
                },
            ],
        },
    };
}

async function downloadWithLimitOnce(
    url: URL,
    maxBytes: number,
    options: OptionsInit,
): Promise<Result<Buffer, RemoteFetchError>> {
    const safeTarget = await assertSafeRemoteTarget(url);
    if (!safeTarget.ok) {
        return fail(safeTarget.error);
    }

    const requestOptions = withSafeRedirectValidation(options);

    return await new Promise((resolve) => {
        const chunks: Buffer[] = [];
        let totalBytes = 0;
        let settled = false;

        const settle = (result: Result<Buffer, RemoteFetchError>) => {
            if (settled) {
                return;
            }
            settled = true;
            resolve(result);
        };

        let stream: ReturnType<typeof got.stream>;
        try {
            stream = got.stream(url, { ...requestOptions, isStream: true });
        } catch (error) {
            settle(fail(normalizeRemoteFetchError(error)));
            return;
        }

        stream.once("response", (response) => {
            const contentLength = parseContentLengthHeader(response.headers["content-length"]);
            if (contentLength !== null && contentLength > maxBytes) {
                stream.destroy(toTaggedError(downloadLimitExceeded(maxBytes)));
            }
        });

        stream.on("data", (chunk: Buffer | string) => {
            const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            totalBytes += bufferChunk.length;
            if (totalBytes > maxBytes) {
                stream.destroy(toTaggedError(downloadLimitExceeded(maxBytes)));
                return;
            }
            chunks.push(bufferChunk);
        });

        stream.once("error", (error) => {
            settle(fail(normalizeRemoteFetchError(error)));
        });

        stream.once("end", () => {
            settle(ok(Buffer.concat(chunks, totalBytes)));
        });
    });
}

async function downloadWithLimit(
    url: URL,
    maxBytes: number,
    options: OptionsInit,
): Promise<Result<Buffer, RemoteFetchError>> {
    for (let attempt = 0; attempt <= REQUEST_RETRY_LIMIT; attempt += 1) {
        const result = await downloadWithLimitOnce(url, maxBytes, options);
        if (result.ok) {
            return result;
        }

        const isLastAttempt = attempt === REQUEST_RETRY_LIMIT;
        if (isLastAttempt || !shouldRetryFetchError(result.error)) {
            return result;
        }

        const nextAttempt = attempt + 2;
        const totalAttempts = REQUEST_RETRY_LIMIT + 1;
        console.warn(
            `Retrying remote fetch ${url.href} (attempt ${nextAttempt}/${totalAttempts}) due to: ${result.error.message}`,
        );
        await wait(REQUEST_RETRY_BASE_DELAY_MS * (attempt + 1));
    }

    return fail(fetchFailed("Request retries exhausted"));
}

type StoredImage = { url: string; width: number; height: number };

async function downloadAndStoreOgImage(imageUrl: string): Promise<StoredImage | null> {
    let parsedImageUrl: URL;
    try {
        parsedImageUrl = new URL(imageUrl);
    } catch {
        console.warn(`Invalid OG image URL: ${imageUrl}`);
        return null;
    }

    const downloadResult = await downloadWithLimit(parsedImageUrl, MAX_IMAGE_SIZE, {
        timeout: { request: REQUEST_TIMEOUT_MS },
        headers: {
            "User-Agent": "RichPods/1.0 (OpenGraph Image Fetcher)",
            Accept: "image/webp,image/png,image/jpeg,image/*",
        },
    });
    if (!downloadResult.ok) {
        if (downloadResult.error.kind === "unsafe_target") {
            console.warn(`Blocked OG image URL ${imageUrl}: ${downloadResult.error.message}`);
            return null;
        }
        if (downloadResult.error.kind === "download_limit_exceeded") {
            console.warn(`OG image exceeded max size (${MAX_IMAGE_SIZE} bytes) from ${imageUrl}`);
            return null;
        }
        console.warn(`Failed to download/store OG image from ${imageUrl}:`, downloadResult.error.cause);
        return null;
    }

    try {
        const buffer = downloadResult.value;
        const detectedType = await fileTypeFromBuffer(buffer);
        if (!detectedType || !(detectedType.mime in ALLOWED_IMAGE_MIMES)) {
            console.warn(`OG image unsupported type: ${detectedType?.mime ?? "unknown"} from ${imageUrl}`);
            return null;
        }

        const extension = ALLOWED_IMAGE_MIMES[detectedType.mime];

        const image = sharp(buffer, { failOn: "truncated" });
        const metadata = await image.metadata();

        if (!metadata.width || !metadata.height) {
            console.warn(`OG image: could not read dimensions from ${imageUrl}`);
            return null;
        }

        if (metadata.width < MIN_IMAGE_WIDTH || metadata.height < MIN_IMAGE_HEIGHT) {
            console.warn(
                `OG image too small: ${metadata.width}x${metadata.height} from ${imageUrl} (min: ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT})`,
            );
            return null;
        }

        const aspectRatio = metadata.width / metadata.height;
        if (aspectRatio < 1.5 || aspectRatio > 2.5) {
            console.warn(
                `OG image aspect ratio out of range: ${metadata.width}x${metadata.height} (${aspectRatio.toFixed(2)}) from ${imageUrl} (allowed: 1.5:1 to 2.5:1)`,
            );
            return null;
        }

        // Re-encode the image to strip metadata and validate
        let processedBuffer: Buffer;
        switch (detectedType.mime) {
            case "image/png":
                processedBuffer = await image.png({ compressionLevel: 9 }).toBuffer();
                break;
            case "image/jpeg":
                processedBuffer = await image.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
                break;
            case "image/webp":
                processedBuffer = await image.webp({ quality: 85 }).toBuffer();
                break;
            default:
                return null;
        }

        if (processedBuffer.length > MAX_IMAGE_SIZE) {
            console.warn(`OG image processed too large: ${processedBuffer.length} bytes`);
            return null;
        }

        const gcsName = `og-images/${uuidv4()}.${extension}`;
        const bucket = storage.bucket(UPLOAD_BUCKET_NAME);
        const file = bucket.file(gcsName);

        await file.save(processedBuffer, {
            resumable: false,
            metadata: {
                contentType: detectedType.mime,
                cacheControl: GCS_IMMUTABLE_CACHE_CONTROL,
            },
        });

        return { url: getPublicUrl(gcsName), width: metadata.width, height: metadata.height };
    } catch (error) {
        console.warn(`Failed to download/store OG image from ${imageUrl}:`, error);
        return null;
    }
}

ogRouter.post("/parse", express.json(), async (req: Request, res: Response) => {
    try {
        const auth = await createAuthContext(req);
        if (!auth.userId || !auth.user) {
            res.status(401).json({ error: "Authentication required" });
            return;
        }

        const { url } = req.body;
        if (!url || typeof url !== "string") {
            res.status(400).json({ error: "URL is required" });
            return;
        }

        if (url.length > MAX_URL_LENGTH) {
            res.status(400).json({ error: `URL cannot exceed ${MAX_URL_LENGTH} characters` });
            return;
        }

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
            if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
                res.status(400).json({ error: "URL must use HTTP or HTTPS protocol" });
                return;
            }
        } catch {
            res.status(400).json({ error: "Invalid URL format" });
            return;
        }

        const htmlResult = await downloadWithLimit(parsedUrl, MAX_HTML_SIZE, {
            timeout: { request: REQUEST_TIMEOUT_MS },
            headers: {
                "User-Agent": "RichPods/1.0 (OpenGraph Parser)",
                Accept: "text/html,application/xhtml+xml",
            },
        });
        if (!htmlResult.ok) {
            if (htmlResult.error.kind === "unsafe_target") {
                res.status(400).json({ error: "URL host is not allowed" });
                return;
            }
            if (htmlResult.error.kind === "download_limit_exceeded") {
                res.status(422).json({ error: "Page content too large to parse" });
                return;
            }
            console.warn(`Failed to fetch URL ${url}:`, htmlResult.error.cause);
            res.status(422).json({ error: "Failed to fetch URL" });
            return;
        }
        const html = htmlResult.value.toString("utf8");

        const $ = cheerioLoad(html);

        const result: OgResult = {
            ogTitle: null,
            ogDescription: null,
            ogImageUrl: null,
            ogImageWidth: null,
            ogImageHeight: null,
        };

        // Parse OG tags
        result.ogTitle =
            $('meta[property="og:title"]').attr("content")?.trim() || null;
        result.ogDescription =
            $('meta[property="og:description"]').attr("content")?.trim() || null;
        const ogImage =
            $('meta[property="og:image"]').attr("content")?.trim() || null;

        // Fallback to <title> if no og:title
        if (!result.ogTitle) {
            result.ogTitle = $("title").text().trim() || null;
        }

        // Download and store OG image if present
        if (ogImage) {
            let absoluteImageUrl: string;
            try {
                absoluteImageUrl = new URL(ogImage, parsedUrl.href).href;
            } catch {
                absoluteImageUrl = ogImage;
            }

            const stored = await downloadAndStoreOgImage(absoluteImageUrl);
            if (stored) {
                result.ogImageUrl = stored.url;
                result.ogImageWidth = stored.width;
                result.ogImageHeight = stored.height;
            }
        }

        res.json(result);
    } catch (error) {
        console.error("OG parse error:", error);
        res.status(500).json({ error: "Failed to parse Open Graph data" });
    }
});
