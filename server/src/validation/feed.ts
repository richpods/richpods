import { findEpisodeInFeed } from "@richpods/shared/media/check";
import { normalizeMimeType } from "@richpods/shared/media/mime";

export const allowedEpisodeAudioMimeTypes: readonly string[] = [
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/m4a",
    "audio/wav",
    "audio/ogg",
    "audio/aac",
    "audio/flac",
    "audio/x-m4a",
];

export type EpisodeMedia = {
    url: string;
    type: string;
    length: number;
    checksum: string;
};

/**
 * Validate a parsed RSS feed for RSS 2.0 compliance and required fields.
 * Throws with a descriptive reason if the feed is invalid.
 */
export function validateParsedRssFeed(parsed: unknown): void {
    if (!parsed || typeof parsed !== "object" || !("rss" in parsed)) {
        throw new Error("Not a valid RSS 2.0 feed: missing <rss> root element");
    }

    const rss = (parsed as Record<string, unknown>).rss as Record<string, unknown> | undefined;
    if (!rss || !rss.channel) {
        throw new Error("Not a valid RSS 2.0 feed: missing <channel> element");
    }

    const version = rss.version;
    if (version && String(version) !== "2.0") {
        throw new Error(
            `Not a valid RSS 2.0 feed: unsupported RSS version "${String(version)}"`,
        );
    }

    const channel = rss.channel as Record<string, unknown>;
    if (!channel.title) {
        throw new Error("Not a valid RSS 2.0 feed: channel is missing <title>");
    }
    if (!channel.description) {
        throw new Error("Not a valid RSS 2.0 feed: channel is missing <description>");
    }

    const items = Array.isArray(channel.item)
        ? channel.item
        : channel.item
          ? [channel.item]
          : [];
    if (!items.length) {
        throw new Error("Not a valid RSS 2.0 feed: channel contains no <item> elements");
    }

    for (const item of items) {
        const title = item?.title;
        const hasTitle = Boolean(typeof title === "string" && title.trim().length > 0);

        const guidVal = item?.guid;
        const hasGuid =
            typeof guidVal === "string"
                ? guidVal.trim().length > 0
                : guidVal &&
                  typeof guidVal === "object" &&
                  typeof guidVal._ === "string" &&
                  guidVal._.trim().length > 0;

        const enc = item?.enclosure;
        const hasEnclosure = Boolean(
            enc && typeof enc.url === "string" && enc.url.trim().length > 0,
        );

        if (!hasTitle || !hasGuid || !hasEnclosure) {
            const missing: string[] = [];
            if (!hasTitle) missing.push("title");
            if (!hasGuid) missing.push("guid");
            if (!hasEnclosure) missing.push("enclosure with url");
            const itemLabel = hasTitle ? `"${String(title).trim()}"` : "(untitled)";
            throw new Error(
                `Not a valid RSS 2.0 feed: item ${itemLabel} is missing ${missing.join(", ")}`,
            );
        }
    }
}

/**
 * Assert that the feed is not locked via the <podcast:locked> tag.
 * A locked feed indicates the podcast owner does not allow imports.
 * @see https://github.com/Podcast-Standards-Project/PSP-1-Podcast-RSS-Specification#podcastlocked
 */
export function assertFeedNotLocked(parsed: any): void {
    const channel = parsed?.rss?.channel;
    if (!channel) return;

    const locked = channel["podcast:locked"];
    const value = typeof locked === "object" && locked !== null ? locked._ : locked;
    if (typeof value === "string" && value.trim().toLowerCase() === "yes") {
        throw new Error(
            "This podcast feed is locked by its owner and does not allow imports",
        );
    }
}

/**
 * Check if an episode with the given GUID exists in the parsed feed
 */
export function episodeExistsInFeed(parsed: any, episodeGuid: string): boolean {
    if (!parsed || !parsed.rss || !parsed.rss.channel) return false;

    const channel = parsed.rss.channel;
    const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];

    return items.some((item: any) => {
        const guid =
            typeof item.guid === "object" && item.guid["_"]
                ? item.guid["_"]
                : item.guid;
        return guid === episodeGuid;
    });
}

function toHttpUrl(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    try {
        const { protocol } = new URL(trimmed);
        return protocol === "http:" || protocol === "https:" ? trimmed : null;
    } catch {
        return null;
    }
}

function toAllowedAudioMimeType(value: unknown): string | null {
    const normalized = typeof value === "string" ? normalizeMimeType(value) : null;
    return normalized !== null && allowedEpisodeAudioMimeTypes.includes(normalized)
        ? normalized
        : null;
}

export function resolveEpisodeMediaFromFeed(
    parsedFeed: unknown,
    episodeGuid: string,
    clientMedia: EpisodeMedia,
): EpisodeMedia {
    const enclosure = findEpisodeInFeed(parsedFeed, episodeGuid, null);
    if (!enclosure) {
        throw new Error(
            `Episode with GUID "${episodeGuid}" not found in RSS feed or has no media enclosure`,
        );
    }

    const url = toHttpUrl(enclosure.url);
    if (!url) {
        throw new Error("Episode media URL in RSS feed must be a valid http/https URL");
    }

    const type = toAllowedAudioMimeType(enclosure.type);
    if (!type) {
        throw new Error("Episode media type is not a supported audio format");
    }

    const length =
        Number.isSafeInteger(enclosure.length) && enclosure.length > 0
            ? enclosure.length
            : clientMedia.length;

    return { url, type, length, checksum: clientMedia.checksum };
}
