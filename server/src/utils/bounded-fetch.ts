import type { IncomingHttpHeaders } from "node:http";
import got, { type Progress } from "got";
import { formatBytes } from "@richpods/shared/utils/bytes";
import { getMaxFeedSize } from "@richpods/shared/media/feed";
import {
    assertSafePublicUrl,
    assertSafeRedirectTarget,
    ssrfSafeDnsLookup,
} from "@richpods/shared/utils/ssrf";
import { toClientSafeFetchError } from "./fetch-error.js";

export type BoundedFetchOptions = {
    subject: string;
    timeoutMs: number;
    retryLimit?: number;
    headers?: Record<string, string>;
    maxBytes?: number;
};

export type BoundedFetchResult = {
    body: string;
    headers: IncomingHttpHeaders;
};

export function sizeLimitError(subject: string, maxBytes: number): Error {
    const label = subject.charAt(0).toUpperCase() + subject.slice(1);
    return new Error(`${label} exceeds maximum allowed size of ${formatBytes(maxBytes)}`);
}

export async function fetchTextWithLimit(
    url: string,
    { subject, timeoutMs, retryLimit, headers, maxBytes = getMaxFeedSize() }: BoundedFetchOptions,
): Promise<BoundedFetchResult> {
    await assertSafePublicUrl(url);
    const abortController = new AbortController();
    let aborted = false;
    const request = got.get(url, {
        headers,
        responseType: "text",
        timeout: { request: timeoutMs },
        retry: retryLimit === undefined ? undefined : { limit: retryLimit },
        dnsLookup: ssrfSafeDnsLookup,
        hooks: { beforeRedirect: [assertSafeRedirectTarget] },
        signal: abortController.signal,
    });
    // got has no maxContentLength. `transferred` counts decoded bytes, so aborting
    // here also stops compressed bombs before the whole body is buffered.
    request.on("downloadProgress", (progress: Progress) => {
        if (progress.transferred > maxBytes || (progress.total ?? 0) > maxBytes) {
            aborted = true;
            abortController.abort();
        }
    });

    let response;
    try {
        response = await request;
    } catch (error) {
        throw aborted ? sizeLimitError(subject, maxBytes) : toClientSafeFetchError(error, subject);
    }

    if (aborted || Buffer.byteLength(response.body, "utf-8") > maxBytes) {
        throw sizeLimitError(subject, maxBytes);
    }
    return { body: response.body, headers: response.headers };
}
