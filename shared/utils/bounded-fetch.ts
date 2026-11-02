import type { IncomingHttpHeaders } from "node:http";
import got, { type Progress } from "got";
import { formatBytes } from "./bytes.js";
import { assertSafePublicUrl, assertSafeRedirectTarget, ssrfSafeDnsLookup } from "./ssrf.js";
import { toClientSafeFetchError } from "./fetch-error.js";

export const ssrfSafeRequestOptions = {
    dnsLookup: ssrfSafeDnsLookup,
    hooks: { beforeRedirect: [assertSafeRedirectTarget] },
};

export type BoundedFetchOptions = {
    subject: string;
    maxBytes: number;
    timeoutMs: number;
    retryLimit?: number;
    headers?: Record<string, string>;
    throwHttpErrors?: boolean;
    tooLargeMessage?: string;
};

export type BoundedFetchResult<Body> = {
    statusCode: number;
    headers: IncomingHttpHeaders;
    body: Body;
};

export function sizeLimitError(subject: string, maxBytes: number): Error {
    const label = subject.charAt(0).toUpperCase() + subject.slice(1);
    return new Error(`${label} exceeds maximum allowed size of ${formatBytes(maxBytes)}`);
}

export function exceedsSizeLimit(progress: Progress, maxBytes: number): boolean {
    return progress.transferred > maxBytes || (progress.total ?? 0) > maxBytes;
}

export async function fetchBufferWithLimit(
    url: string,
    {
        subject,
        maxBytes,
        timeoutMs,
        retryLimit,
        headers,
        throwHttpErrors,
        tooLargeMessage,
    }: BoundedFetchOptions,
): Promise<BoundedFetchResult<Uint8Array>> {
    await assertSafePublicUrl(url);
    const tooLarge = () =>
        tooLargeMessage === undefined
            ? sizeLimitError(subject, maxBytes)
            : new Error(tooLargeMessage);
    const abortController = new AbortController();
    const request = got.get(url, {
        headers,
        responseType: "buffer",
        timeout: { request: timeoutMs },
        retry: retryLimit === undefined ? undefined : { limit: retryLimit },
        throwHttpErrors,
        signal: abortController.signal,
        ...ssrfSafeRequestOptions,
    });
    // got has no maxContentLength. `transferred` counts decoded bytes, so aborting
    // here also stops compressed bombs before the whole body is buffered.
    request.on("downloadProgress", (progress: Progress) => {
        if (exceedsSizeLimit(progress, maxBytes)) {
            abortController.abort();
        }
    });

    let response;
    try {
        response = await request;
    } catch (error) {
        throw abortController.signal.aborted ? tooLarge() : toClientSafeFetchError(error, subject);
    }

    if (abortController.signal.aborted || response.rawBody.byteLength > maxBytes) {
        throw tooLarge();
    }
    return { statusCode: response.statusCode, headers: response.headers, body: response.rawBody };
}

export async function fetchTextWithLimit(
    url: string,
    options: BoundedFetchOptions,
): Promise<BoundedFetchResult<string>> {
    const result = await fetchBufferWithLimit(url, options);
    return { ...result, body: Buffer.from(result.body).toString("utf-8") };
}
