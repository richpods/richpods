import * as xml2js from "xml2js";

export const RP_USER_AGENT = "RichPods/1.0 (+https://richpods.org/bot)";

export const RSS_ACCEPT_HEADERS = {
    "User-Agent": RP_USER_AGENT,
    Accept: "application/rss+xml, application/xml, text/xml",
};

/**
 * Parse an RSS feed XML string into a JavaScript object.
 * Uses the shared xml2js configuration so that all consumers
 * (server, cloud functions) produce identical parsed structures.
 */
export async function parseFeed(feedXml: string): Promise<any> {
    const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true,
    });
    return parser.parseStringPromise(feedXml);
}

/**
 * Maximum allowed feed size based on the current year:
 * 40 MB for 2026, +1 MB for each subsequent year.
 * The single limit for feed downloads — apply it to the transferred
 * (possibly compressed) bytes and to the decoded body alike.
 */
export function getMaxFeedSize(): number {
    const currentYear = new Date().getFullYear();
    const baseYear = 2026;
    const baseSizeMB = 40;
    const yearDiff = Math.max(0, currentYear - baseYear);
    return (baseSizeMB + yearDiff) * 1024 * 1024;
}
