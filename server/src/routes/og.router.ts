import express, { Request, Response } from "express";
import got, { type OptionsInit } from "got";
import { load as cheerioLoad } from "cheerio";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import { v4 as uuidv4 } from "uuid";
import { Storage } from "@google-cloud/storage";
import {
    allowedImageMimeTypes,
    isHtmlMimeType,
    normalizeMimeType,
} from "@richpods/shared/media/mime";
import { assertSafePublicUrl, ssrfSafeDnsLookup } from "@richpods/shared/utils/ssrf";
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

const DEFAULT_USER_AGENT =
    "Mozilla/5.0 (compatible; RichPods-LinkExpanding 1.0; +https://richpods.org/)";

const BASE_REQUEST_HEADERS: Record<string, string> = {
    "User-Agent": DEFAULT_USER_AGENT,
    "Accept-Language": "en-US,en;q=0.9",
};

const DOCUMENT_FETCH_HEADERS: Record<string, string> = {
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
};

type HostHeaderRule = {
    matches: (hostname: string) => boolean;
    headers: Record<string, string>;
};

// YouTube's EU consent interstitial returns HTML without OG tags. Pre-setting the
// CONSENT/SOCS cookies skips the bounce so the real watch page is served.
const HOST_HEADER_RULES: HostHeaderRule[] = [
    {
        matches: (host) =>
            host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be",
        headers: {
            Cookie: "CONSENT=YES+1; SOCS=CAI",
        },
    },
];

function buildRequestHeaders(
    parsedUrl: URL,
    extras: Record<string, string> = {},
): Record<string, string> {
    const headers: Record<string, string> = { ...BASE_REQUEST_HEADERS, ...extras };
    const hostname = parsedUrl.hostname.toLowerCase();
    for (const rule of HOST_HEADER_RULES) {
        if (rule.matches(hostname)) {
            Object.assign(headers, rule.headers);
        }
    }
    return headers;
}

type FallbackOgData = {
    ogTitle: string | null;
    ogDescription: string | null;
    ogImageUrl: string | null;
};

type HostOgFallback = {
    name: string;
    matches: (parsedUrl: URL) => boolean;
    fetch: (parsedUrl: URL) => Promise<FallbackOgData | null>;
};

// Per-host fallbacks for sites that return HTML without usable OG tags.
const HOST_OG_FALLBACKS: HostOgFallback[] = [
    {
        name: "youtube-oembed",
        matches: (url) => {
            const host = url.hostname.toLowerCase();
            return host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be";
        },
        fetch: fetchYouTubeOembedFallback,
    },
];

function findOgFallback(parsedUrl: URL): HostOgFallback | null {
    return HOST_OG_FALLBACKS.find((rule) => rule.matches(parsedUrl)) ?? null;
}

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
    mimeType: string | null;
    resourceSize: number | null;
};

type ProbeResult = {
    mimeType: string | null;
    resourceSize: number | null;
    headerFilename: string | null;
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
    return Object.assign(new Error(`Response exceeded ${error.maxBytes} bytes`), {
        [OG_ERROR_KIND]: "download_limit_exceeded" as const,
        maxBytes: error.maxBytes,
    });
}

function isTaggedOgError(value: unknown): value is TaggedOgError {
    if (!(value instanceof Error)) {
        return false;
    }
    const tagged = value as Partial<TaggedOgError>;
    return (
        tagged[OG_ERROR_KIND] === "unsafe_target" ||
        tagged[OG_ERROR_KIND] === "download_limit_exceeded"
    );
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

function getPublicUrl(gcsName: string): string {
    const encodedPath = gcsName
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
    return `https://storage.googleapis.com/${UPLOAD_BUCKET_NAME}/${encodedPath}`;
}

async function assertSafeRemoteTarget(url: URL): Promise<Result<void, UnsafeTargetError>> {
    try {
        await assertSafePublicUrl(url.toString());
    } catch (error) {
        return fail(unsafeTarget(error instanceof Error ? error.message : "Unsafe remote URL"));
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
        // Enforce the IP blocklist again at connect time so a rebinding DNS
        // record cannot swap to an internal address between the pre-flight
        // check in assertSafeRemoteTarget and the actual request.
        dnsLookup: ssrfSafeDnsLookup,
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
            stream = got.stream(url, requestOptions);
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
        headers: buildRequestHeaders(parsedImageUrl, {
            Accept: "image/webp,image/png,image/jpeg,image/*",
        }),
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
        console.warn(
            `Failed to download/store OG image from ${imageUrl}:`,
            downloadResult.error.cause,
        );
        return null;
    }

    try {
        const buffer = downloadResult.value;
        const detectedType = await fileTypeFromBuffer(buffer);
        if (!detectedType || !(detectedType.mime in allowedImageMimeTypes)) {
            console.warn(
                `OG image unsupported type: ${detectedType?.mime ?? "unknown"} from ${imageUrl}`,
            );
            return null;
        }

        const extension = allowedImageMimeTypes[detectedType.mime];

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
        if (aspectRatio < 0.25 || aspectRatio > 4) {
            console.warn(
                `OG image aspect ratio out of range: ${metadata.width}x${metadata.height} (${aspectRatio.toFixed(2)}) from ${imageUrl} (allowed: 1:4 to 4:1)`,
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

async function fetchYouTubeOembedFallback(parsedUrl: URL): Promise<FallbackOgData | null> {
    const oembedUrl = new URL("https://www.youtube.com/oembed");
    oembedUrl.searchParams.set("url", parsedUrl.href);
    oembedUrl.searchParams.set("format", "json");
    try {
        const response = await got(oembedUrl, {
            timeout: { request: REQUEST_TIMEOUT_MS },
            headers: BASE_REQUEST_HEADERS,
            retry: { limit: 0 },
            responseType: "json",
        });
        const body = response.body as {
            title?: string;
            author_name?: string;
            thumbnail_url?: string;
        };
        return {
            ogTitle: body.title?.trim() || null,
            ogDescription: body.author_name?.trim() || null,
            ogImageUrl: body.thumbnail_url?.trim() || null,
        };
    } catch (error) {
        console.warn(`YouTube oEmbed fallback failed for ${parsedUrl.href}:`, error);
        return null;
    }
}

async function applyHostOgFallback(
    parsedUrl: URL,
    result: OgResult,
    reason: string,
): Promise<void> {
    const rule = findOgFallback(parsedUrl);
    if (!rule) {
        return;
    }
    console.info(
        `OG fallback activated for ${parsedUrl.href}: rule=${rule.name}, reason=${reason}`,
    );
    const data = await rule.fetch(parsedUrl);
    if (!data) {
        return;
    }
    if (!result.ogTitle && data.ogTitle) {
        result.ogTitle = data.ogTitle;
    }
    if (!result.ogDescription && data.ogDescription) {
        result.ogDescription = data.ogDescription;
    }
    if (!result.ogImageUrl && data.ogImageUrl) {
        const stored = await downloadAndStoreOgImage(data.ogImageUrl);
        if (stored) {
            result.ogImageUrl = stored.url;
            result.ogImageWidth = stored.width;
            result.ogImageHeight = stored.height;
        }
    }
}

function parseContentDispositionFilename(header: string | undefined): string | null {
    if (!header) {
        return null;
    }

    // RFC 5987 encoded filename (filename*=UTF-8''...)
    const starMatch = header.match(/filename\*=([^;]+)/i);
    if (starMatch) {
        const value = starMatch[1].trim();
        const parts = value.split("''");
        const encoded = parts.length === 2 ? parts[1] : parts[0];
        try {
            const decoded = decodeURIComponent(encoded).trim();
            if (decoded) {
                return decoded;
            }
        } catch {
            // fall through
        }
    }

    const quotedMatch = header.match(/filename="([^"]+)"/i);
    if (quotedMatch) {
        return quotedMatch[1].trim() || null;
    }

    const plainMatch = header.match(/filename=([^;]+)/i);
    if (plainMatch) {
        return plainMatch[1].trim() || null;
    }

    return null;
}

function extractFilenameFromUrl(parsedUrl: URL): string | null {
    const path = parsedUrl.pathname;
    if (!path || path === "/") {
        return null;
    }
    const segments = path.split("/").filter((segment) => segment.length > 0);
    if (segments.length === 0) {
        return null;
    }
    const lastSegment = segments[segments.length - 1];
    if (!/\.[A-Za-z0-9]{1,10}$/.test(lastSegment)) {
        return null;
    }
    try {
        return decodeURIComponent(lastSegment);
    } catch {
        return lastSegment;
    }
}

function resolveFallbackTitle(parsedUrl: URL, headerFilename: string | null): string {
    if (headerFilename) {
        return headerFilename;
    }
    const urlFilename = extractFilenameFromUrl(parsedUrl);
    if (urlFilename) {
        return urlFilename;
    }
    if (!parsedUrl.pathname || parsedUrl.pathname === "/") {
        return parsedUrl.href;
    }
    try {
        return decodeURIComponent(parsedUrl.pathname);
    } catch {
        return parsedUrl.pathname;
    }
}

async function probeRemoteResource(parsedUrl: URL): Promise<Result<ProbeResult, RemoteFetchError>> {
    const safeTarget = await assertSafeRemoteTarget(parsedUrl);
    if (!safeTarget.ok) {
        return fail(safeTarget.error);
    }

    try {
        const response = await got(
            parsedUrl,
            withSafeRedirectValidation({
                method: "HEAD",
                timeout: { request: REQUEST_TIMEOUT_MS },
                headers: buildRequestHeaders(parsedUrl, { Accept: "*/*" }),
            }),
        );
        const contentTypeHeader = response.headers["content-type"];
        const rawContentType = Array.isArray(contentTypeHeader)
            ? contentTypeHeader[0]
            : contentTypeHeader;
        const mimeType = normalizeMimeType(rawContentType ?? null);
        const resourceSize = parseContentLengthHeader(response.headers["content-length"]);
        const contentDisposition = response.headers["content-disposition"];
        const rawContentDisposition = Array.isArray(contentDisposition)
            ? contentDisposition[0]
            : contentDisposition;
        const headerFilename = parseContentDispositionFilename(rawContentDisposition);
        return ok({ mimeType, resourceSize, headerFilename });
    } catch (error) {
        return fail(normalizeRemoteFetchError(error));
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

        const probeResult = await probeRemoteResource(parsedUrl);
        if (!probeResult.ok) {
            if (probeResult.error.kind === "unsafe_target") {
                res.status(400).json({ error: "URL host is not allowed" });
                return;
            }
            console.warn(`HEAD probe failed for ${url}:`, probeResult.error);
        }

        const probe: ProbeResult = probeResult.ok
            ? probeResult.value
            : { mimeType: null, resourceSize: null, headerFilename: null };

        const result: OgResult = {
            ogTitle: null,
            ogDescription: null,
            ogImageUrl: null,
            ogImageWidth: null,
            ogImageHeight: null,
            mimeType: probe.mimeType,
            resourceSize: probe.resourceSize,
        };

        const treatAsHtml =
            isHtmlMimeType(probe.mimeType) &&
            (probe.resourceSize === null || probe.resourceSize <= MAX_HTML_SIZE);

        if (!treatAsHtml) {
            result.ogTitle = resolveFallbackTitle(parsedUrl, probe.headerFilename);
            res.json(result);
            return;
        }

        const htmlResult = await downloadWithLimit(parsedUrl, MAX_HTML_SIZE, {
            timeout: { request: REQUEST_TIMEOUT_MS },
            headers: buildRequestHeaders(parsedUrl, {
                ...DOCUMENT_FETCH_HEADERS,
                Accept: "text/html,application/xhtml+xml",
            }),
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
            await applyHostOgFallback(
                parsedUrl,
                result,
                `html-fetch-failed: ${htmlResult.error.message}`,
            );
            if (result.ogTitle || result.ogImageUrl) {
                if (!result.ogTitle) {
                    result.ogTitle = resolveFallbackTitle(parsedUrl, probe.headerFilename);
                }
                res.json(result);
                return;
            }
            console.warn(`Failed to fetch URL ${url}:`, htmlResult.error.cause);
            res.status(422).json({ error: "Failed to fetch URL" });
            return;
        }
        const html = htmlResult.value.toString("utf8");
        // HEAD Content-Length is unreliable for dynamic pages (YouTube returns 0,
        // others omit it entirely). Once we have the body, its byte length is authoritative.
        result.resourceSize = htmlResult.value.length;

        const $ = cheerioLoad(html);

        result.ogTitle = $('meta[property="og:title"]').attr("content")?.trim() || null;
        result.ogDescription = $('meta[property="og:description"]').attr("content")?.trim() || null;
        let resolvedImageUrl = $('meta[property="og:image"]').attr("content")?.trim() || null;

        if (!result.ogTitle && !result.ogDescription && !resolvedImageUrl) {
            await applyHostOgFallback(parsedUrl, result, "no-og-tags-in-html");
            if (result.ogImageUrl) {
                resolvedImageUrl = null;
            }
        }

        if (!result.ogTitle) {
            result.ogTitle = $("title").text().trim() || null;
        }
        if (!result.ogTitle) {
            result.ogTitle = resolveFallbackTitle(parsedUrl, probe.headerFilename);
        }

        if (resolvedImageUrl) {
            let absoluteImageUrl: string;
            try {
                absoluteImageUrl = new URL(resolvedImageUrl, parsedUrl.href).href;
            } catch {
                absoluteImageUrl = resolvedImageUrl;
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
