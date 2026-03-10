/**
 * Validate a parsed RSS feed for RSS 2.0 compliance and required fields
 * Returns the parsed feed if valid, null otherwise
 */
export function validateParsedRssFeed(parsed: any): any | null {
    if (!parsed || !parsed.rss || !parsed.rss.channel) return null;
    const version = parsed.rss.version;
    if (version && String(version) !== "2.0") return null;

    const channel = parsed.rss.channel;
    if (!channel.title || !channel.description) return null;

    const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
    if (!items.length) return null;

    for (const item of items) {
        const hasTitle = Boolean(item && typeof item.title === "string" && item.title.trim().length > 0);
        const guidVal = item?.guid;
        const hasGuid =
            typeof guidVal === "string"
                ? guidVal.trim().length > 0
                : guidVal && typeof guidVal === "object" && typeof guidVal._ === "string" && guidVal._.trim().length > 0;
        const enc = item?.enclosure;
        const hasEnclosure = Boolean(enc && typeof enc.url === "string" && enc.url.trim().length > 0);
        if (!hasTitle || !hasGuid || !hasEnclosure) return null;
    }
    return parsed;
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

/**
 * Calculate the maximum feed size based on the current year
 * 20 MB for 2025, +1 MB for each subsequent year
 */
export function getMaxFeedSize(): number {
    const currentYear = new Date().getFullYear();
    const baseYear = 2025;
    const baseSizeMB = 20;
    const yearDiff = Math.max(0, currentYear - baseYear);
    return (baseSizeMB + yearDiff) * 1024 * 1024;
}