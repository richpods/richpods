export const MediaCheckStatus = {
    OK: "ok",
    ALTERED: "altered",
    BROKEN: "broken",
} as const;

export type MediaCheckStatusValue = (typeof MediaCheckStatus)[keyof typeof MediaCheckStatus];

export type HeadCheckResponse = {
    httpStatus: number;
    finalUrl: string;
    etag?: string;
    lastModified?: string;
    contentLength?: number;
    redirected: boolean;
};

export type CheckFlowResult = {
    status: MediaCheckStatusValue;
    resolvedUrl: string;
    httpStatus?: number;
    etag?: string;
    lastModified?: string;
    contentLength?: number;
};

export type EpisodeEnclosure = {
    url: string;
    type: string;
    length: number;
};

export type StoredMedia = {
    url: string;
    length: number;
};

/**
 * I/O dependencies injected into the check flow.
 * Both the server and the cloud function provide their own implementations.
 */
export type CheckFlowDeps = {
    performHeadCheck: (url: string, timeoutMs?: number) => Promise<HeadCheckResponse>;
    fetchAndParseFeed: (feedUrl: string) => Promise<{ parsedFeed: any }>;
};
