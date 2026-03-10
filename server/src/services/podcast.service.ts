import got from "got";
import { toASCII } from "node:punycode";
import * as xml2js from "xml2js";
import * as cheerio from "cheerio";
import { PodcastMetadata, PodcastEpisodeSearchResult } from "../graphql.js";
import type {
    ParsedPodcast,
    ITunesSearchResponse,
    EnclosureHeader,
} from "../types/services.js";
import { validateParsedRssFeed, assertFeedNotLocked } from "../validation/feed.js";

const RP_USER_AGENT = "RichPods/1.0 (+https://richpods.org/bot)";

/**
 * Search for podcast episodes using iTunes API
 */
export async function searchPodcastEpisodes(
    query: string,
    country: string = "AT",
    language: string = "de",
): Promise<PodcastEpisodeSearchResult[]> {
    try {
        const data = await got
            .get("https://itunes.apple.com/search", {
                searchParams: {
                    term: query,
                    entity: "podcastEpisode",
                    country,
                    lang: language,
                    explicit: "Yes",
                    limit: 50,
                },
                timeout: { request: 5000 },
            })
            .json<ITunesSearchResponse>();

        return data.results
            .filter((result) => result.feedUrl) // Only include results with a feedUrl
            .map((result) => ({
                feedUrl: result.feedUrl,
                podcastTitle: result.collectionName,
                episodeTitle: result.trackName,
                creator: result.artistName || null,
                artwork: result.artworkUrl600 || result.artworkUrl100 || null,
                date: result.releaseDate || null,
                genre: result.primaryGenreName || null,
                episodeGuid: result.episodeGuid?.toString() || null,
                episodeUrl: result.trackViewUrl || null,
            }));
    } catch (error) {
        console.error("Error searching podcast episodes:", error);
        throw new Error("Failed to search podcast episodes");
    }
}

/**
 * Extract RSS feed URL from HTML page
 */
export async function extractFeedUrl(url: string): Promise<string> {
    try {
        const normalizedUrl = normalizeUrl(url);
        // First check if the URL is already an RSS feed
        const response = await got.get(normalizedUrl, {
            responseType: "text",
            headers: {
                "User-Agent": RP_USER_AGENT,
                Accept:
                    "application/rss+xml, application/xml, text/xml, text/html, application/xhtml+xml",
            },
            retry: { limit: 1 },
            timeout: { request: 5000 },
        });

        // Ensure we can safely sniff the body
        const dataStr = typeof response.body === "string" ? response.body : "";
        if (dataStr.length < 100) {
            throw new Error(`Invalid response body provided by remote server.`);
        }

        const sniff = dataStr.slice(0, 2048).toLowerCase();
        const isXmlBySniff =
            /^\s*<\?xml[^>]*\?>[\s\S]*?<\s*rss\b/.test(sniff) ||
            /^\s*<\s*rss\b/.test(sniff);

        // Additionally, consider file extensions if headers are vague
        const pathname = new URL(normalizedUrl).pathname.toLowerCase();
        const looksLikeXmlExt = /\.(xml|rss)$/i.test(pathname);

        const contentType = (response.headers["content-type"] || "").toLowerCase();
        const isXmlByHeader = /(application|text)\/rss\+xml/.test(contentType);

        if (isXmlByHeader || (looksLikeXmlExt && isXmlBySniff)) {
            try {
                if (await parseRssFeed(dataStr) !== null) {
                    return normalizedUrl;
                }
            } catch {
                // fallthrough to HTML discovery
            }
        }

        // Parse HTML to find RSS feed links
        const $ = cheerio.load(dataStr);

        // Look for RSS feed links (only RSS, ignore Atom)
        const feedSelectors = [
            'link[type="application/rss+xml"]',
            'link[rel="alternate"][type*="rss"]',
        ];

        // Collect ALL candidate feed links on the page (could be multiple)
        const baseHref = $('base[href]').attr('href');
        const baseUrl = new URL(baseHref || normalizedUrl);
        const toAbsolute = (href: string): string | null => {
            try {
                return new URL(href, baseUrl).toString();
            } catch {
                return null;
            }
        };

        const candidates: string[] = [];
        for (const selector of feedSelectors) {
            $(selector).each((_, el) => {
                const href = $(el).attr('href');
                if (href) {
                    const abs = toAbsolute(href);
                    if (abs) candidates.push(normalizeUrl(abs));
                }
            });
        }

        // Dedupe while preserving order of appearance
        const uniqueCandidates = Array.from(new Set(candidates));

        // Try each candidate and return the first REAL RSS 2.0 podcast feed
        for (const candidateUrl of uniqueCandidates) {
            try {
                const parsed = await parsePodcastFeed(candidateUrl);

                // A real podcast feed should have at least one item with an audio enclosure
                const hasAudio = Array.isArray(parsed.items) && parsed.items.some((ep) => {
                    return !!(ep.enclosure && validateEnclosureMimeType(ep.enclosure));
                });

                if (hasAudio) {
                    return candidateUrl;
                }
            } catch {
                // Not a valid RSS 2.0 podcast feed, try next candidate
            }
        }

        throw new Error("No RSS 2.0 podcast feed found on the page");
    } catch (error) {
        console.error("Error extracting feed URL:", error);
        throw new Error(`Failed to fetch or parse URL: ${(error as Error).message}`);
    }
}

/**
 * Parse XML podcast feed
 */
async function parsePodcastFeed(feedUrl: string): Promise<ParsedPodcast> {
    try {
        const response = await got.get(normalizeUrl(feedUrl), {
            headers: {
                "User-Agent": "RichPods/1.0 (+https://richpods.org/bot)",
            },
            responseType: "text",
            timeout: { request: 15000 },
        });

        const parsedFeed = await parseRssFeed(response.body);
        if (!parsedFeed) {
            throw new Error("Unsupported or invalid RSS 2.0 feed");
        }

        const channel = parsedFeed.rss.channel;
        return {
            title: channel.title || "Unknown Podcast",
            description: channel.description || "",
            image: channel.image?.url || channel["itunes:image"]?.href || channel.image || "",
            link: channel.link || feedUrl,
            items: Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [],
        };
    } catch (error) {
        const isLocked =
            error instanceof Error && error.message.includes("locked by its owner");
        if (isLocked) {
            console.info(`parsePodcastFeed() - Feed is locked by owner: ${feedUrl}`);
        } else {
            console.error(`parsePodcastFeed() - Error parsing podcast feed ${feedUrl}:`, error);
        }
        throw error instanceof Error
            ? error
            : new Error(`Failed to parse podcast feed: ${String(error)}`);
    }
}

// Normalize URL to ASCII (punycode) to support internationalized domains like https://erklärmir.at/
function normalizeUrl(input: string): string {
    try {
        const u = new URL(input);
        u.hostname = toASCII(u.hostname);
        return u.toString();
    } catch {
        return input;
    }
}

// Check RSS 2.0 structure and required fields
async function parseRssFeed(rawFeed: string): Promise<any | null> {
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false, mergeAttrs: true });
    const parsed = await parser.parseStringPromise(rawFeed);
    const validated = validateParsedRssFeed(parsed);
    if (validated) {
        assertFeedNotLocked(validated);
    }
    return validated;
}

/**
 * Generate checksum for episode media
 */
async function generateChecksum(mediaUrl: string): Promise<string> {
    try {
        const response = await got.head(mediaUrl, {
            timeout: { request: 10000 },
            headers: {
                "User-Agent": "RichPods/1.0 (+https://richpods.org/bot)",
            },
        });

        const lastModified = response.headers["last-modified"] as string | undefined;
        const contentLength = response.headers["content-length"] as string | undefined;

        if (lastModified && contentLength) {
            const timestamp = new Date(lastModified).toISOString();
            return `lengthlastmodified:${contentLength}-${timestamp}`;
        } else if (contentLength) {
            return `length:${contentLength}`;
        } else if (lastModified) {
            const timestamp = new Date(lastModified).toISOString();
            return `lastmodified:${timestamp}`;
        }

        // Fallback to URL-based checksum if no headers available
        return `url:${Buffer.from(mediaUrl).toString("base64").slice(0, 32)}`;
    } catch (error) {
        console.error("Error generating checksum:", error);
        // Fallback checksum
        return `url:${Buffer.from(mediaUrl).toString("base64").slice(0, 32)}`;
    }
}

/**
 * Validate that the media file is an audio file
 */
function validateEnclosureMimeType(enclosure: EnclosureHeader): boolean {
    const audioMimeTypes = [
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

    return audioMimeTypes.includes(enclosure.type.toLowerCase());
}

/**
 * Get podcast metadata including all episodes or a specific episode
 */
export async function getPodcastMetadata(
    feedUrl: string,
    episodeGuid?: string,
    caller?: { userId?: string; email?: string },
): Promise<PodcastMetadata> {
    try {
        const podcast = await parsePodcastFeed(feedUrl);

        if (!podcast.items || podcast.items.length === 0) {
            throw new Error("No episodes found in the podcast feed");
        }

        // Process all episodes or filter by GUID
        let episodesToProcess = podcast.items;
        if (episodeGuid) {
            episodesToProcess = podcast.items.filter((item) => {
                const guid = typeof item.guid === 'object' && item.guid["_"] 
                    ? item.guid["_"] 
                    : item.guid;
                return guid === episodeGuid;
            });
            
            if (episodesToProcess.length === 0) {
                throw new Error(`Episode with GUID ${episodeGuid} not found`);
            }
        }

        // Process each episode
        const episodes = await Promise.all(
            episodesToProcess
                .filter(episode => episode.enclosure && validateEnclosureMimeType(episode.enclosure))
                .map(async (episode) => {
                    const checksum = episodeGuid
                        ? await generateChecksum(episode.enclosure!.url)
                        : "";
                    
                    // Extract artwork URL - handle itunes:image, image string, and image object formats
                    let episodeArtwork = "";
                    if (episode["itunes:image"]?.href) {
                        episodeArtwork = episode["itunes:image"].href;
                    } else if (episode.image) {
                        if (typeof episode.image === 'string') {
                            episodeArtwork = episode.image;
                        } else if (typeof episode.image === 'object' && episode.image.url) {
                            episodeArtwork = episode.image.url;
                        } else if (typeof episode.image === 'object' && episode.image.href) {
                            episodeArtwork = episode.image.href;
                        }
                    }
                    // Fallback to podcast artwork
                    if (!episodeArtwork) {
                        if (typeof podcast.image === 'string') {
                            episodeArtwork = podcast.image || "";
                        } else if (typeof podcast.image === 'object' && podcast.image.url) {
                            episodeArtwork = podcast.image.url;
                        } else if (typeof podcast.image === 'object' && podcast.image.href) {
                            episodeArtwork = podcast.image.href;
                        }
                    }
                    
                    const episodeLink = episode.link || podcast.link || feedUrl;
                    
                    // Extract GUID - handle both string and object formats
                    const guid = typeof episode.guid === 'object' && episode.guid["_"] 
                        ? episode.guid["_"] 
                        : (episode.guid || `episode-${Date.now()}-${Math.random()}`);

                    return {
                        guid: String(guid),
                        title: episode.title || "Untitled Episode",
                        publicationDate: episode.pubDate
                            ? new Date(episode.pubDate).toISOString()
                            : new Date().toISOString(),
                        artwork: episodeArtwork,
                        link: episodeLink,
                        url: episode.enclosure!.url,
                        type: episode.enclosure!.type,
                        length: parseInt(episode.enclosure!.length, 10) || 0,
                        checksum,
                    };
                })
        );

        if (episodes.length === 0) {
            throw new Error("No valid audio episodes found in the podcast feed");
        }

        // Extract podcast artwork URL - handle both string and object formats
        let podcastArtwork = "";
        if (podcast.image) {
            if (typeof podcast.image === 'string') {
                podcastArtwork = podcast.image;
            } else if (typeof podcast.image === 'object' && podcast.image.url) {
                podcastArtwork = podcast.image.url;
            } else if (typeof podcast.image === 'object' && podcast.image.href) {
                podcastArtwork = podcast.image.href;
            }
        }

        return {
            podcast: {
                title: podcast.title,
                description: podcast.description,
                artwork: podcastArtwork,
                link: podcast.link || feedUrl,
            },
            episodes,
        };
    } catch (error) {
        const isLocked =
            error instanceof Error && error.message.includes("locked by its owner");
        if (isLocked) {
            const userInfo = caller?.userId || caller?.email
                ? ` (user: ${[caller.userId, caller.email].filter(Boolean).join(", ")})`
                : "";
            console.log(`Skipping locked feed: ${feedUrl}${userInfo}`);
        } else {
            console.error(`Error getting podcast metadata for feed ${feedUrl}:`, error);
        }
        throw error;
    }
}
