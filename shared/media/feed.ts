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
