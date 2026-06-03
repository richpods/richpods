import got, { type BeforeRedirectHook } from "got";
import { v4 as uuidv4 } from "uuid";
import { assertSafePublicUrl } from "@richpods/shared/utils/ssrf";
import { config } from "./config.js";
import { disambiguateWikidata } from "./gemini.js";
import { logWarn } from "./log.js";
import { normalizeTimecode } from "./timecode.js";
import { EnclosureType } from "./types.js";
import type {
    AnalysisEntityType,
    AnalysisPlace,
    AnalysisResult,
    AnalysisTopic,
    CardOpenGraph,
    ChapterSuggestion,
    GeocodedLocation,
    MarkdownLink,
    Transcript,
    WikidataCandidate,
} from "./types.js";

const NOTICE: Record<string, { title: string; text: string }> = {
    en: {
        title: "AI-generated chapters",
        text: "The chapters in this RichPod were generated automatically with the help of AI. Please review them for accuracy before publishing.",
    },
    de: {
        title: "KI-generierte Kapitel",
        text: "Die Kapitel in diesem RichPod wurden automatisch mit Hilfe von KI erstellt. Bitte überprüfe sie vor der Veröffentlichung auf ihre Richtigkeit.",
    },
};

const QUOTE_TITLE: Record<string, string> = { en: "Quote", de: "Zitat" };
const WIKIDATA_LABEL: Record<string, string> = { en: "Wikidata", de: "Wikidata" };
const WIKIPEDIA_LABEL: Record<string, string> = { en: "Wikipedia", de: "Wikipedia" };
const OFFICIAL_SITE_LABEL: Record<string, string> = {
    en: "Official website",
    de: "Offizielle Website",
};

const HTTP_USER_AGENT =
    "Mozilla/5.0 (compatible; RichPodsBot/1.0; +https://www.richpods.org)";

/**
 * SSRF guard: re-validate the resolved target of every redirect so a public URL
 * cannot bounce the request onto an internal / metadata address.
 */
const ssrfSafeRedirect: BeforeRedirectHook = async (options) => {
    if (options.url) {
        await assertSafePublicUrl(options.url.toString());
    }
};

// A chapter spans until the next chapter begins, so consecutive chapters must
// be at least this far apart to guarantee a minimum chapter length and prevent
// overlapping/colliding chapters.
const MIN_CHAPTER_GAP_SECONDS = 10;

// Hard ceiling on how many suggestions a single generation may produce. This is
// the last line of defence — independent of the prompt and JSON-schema caps —
// that keeps the chapter_generations document (and the RichPod document once
// the suggestions are accepted) comfortably within Firestore's 1 MiB limit.
const MAX_TOTAL_SUGGESTIONS = 50;

// Half-extent (in degrees) of the bbox drawn around a marker when the geocoder
// returns no viewport (or we fall back to the model's own coordinates). The
// authoritative path uses the geocoder's recommended viewport instead. A
// city-block-sized default keeps MapLibre from over-zooming on a lone point.
const DEFAULT_BBOX_PADDING_DEG = 0.06;

// Marker styling shared by every generated map point.
const MARKER_SYMBOL = "location";
const MARKER_COLOR = "#8a9436";

function toLangCode(language: string): string {
    const lower = (language || "").trim().toLowerCase();
    if (lower.startsWith("de")) return "de";
    if (lower.startsWith("en")) return "en";
    const code = lower.slice(0, 2);
    return /^[a-z]{2}$/.test(code) ? code : "en";
}

function truncate(value: string, max: number): string {
    const trimmed = value.trim();
    return trimmed.length > max ? trimmed.slice(0, max).trim() : trimmed;
}

function normalizeBegin(raw: string): string {
    return normalizeTimecode(raw) ?? "00:00:00.000";
}

function validHttpUrl(value: string): string | null {
    try {
        const url = new URL(value.trim());
        if (url.protocol !== "http:" && url.protocol !== "https:") return null;
        return url.toString();
    } catch {
        return null;
    }
}

function beginToSeconds(begin: string): number {
    const match = /^(\d+):(\d{2}):(\d{2})\.(\d{3})$/.exec(begin);
    if (!match) return 0;
    return (
        Number(match[1]) * 3600 +
        Number(match[2]) * 60 +
        Number(match[3]) +
        Number(match[4]) / 1000
    );
}

/**
 * Greedily keep suggestions that are at least `minGapSeconds` apart (input must
 * be sorted by begin ascending). This enforces the minimum chapter length and
 * guarantees no two *suggestions* collide on the same / near-identical timecode.
 */
function enforceMinSpacing(
    suggestions: ChapterSuggestion[],
    minGapSeconds: number,
): ChapterSuggestion[] {
    const kept: ChapterSuggestion[] = [];
    let lastSeconds = Number.NEGATIVE_INFINITY;
    for (const suggestion of suggestions) {
        const seconds = beginToSeconds(suggestion.begin);
        if (kept.length === 0 || seconds - lastSeconds >= minGapSeconds) {
            kept.push(suggestion);
            lastSeconds = seconds;
        }
    }
    return kept;
}

/**
 * Drop only the suggestions that fall within ±`minGapSeconds` of an existing
 * chapter. Each existing chapter is just a small exclusion zone — its presence
 * never blocks suggestions outside that ±window.
 */
function dropNearExistingChapters(
    suggestions: ChapterSuggestion[],
    existingSeconds: number[],
    minGapSeconds: number,
): ChapterSuggestion[] {
    if (existingSeconds.length === 0) return suggestions;
    return suggestions.filter((suggestion) => {
        const seconds = beginToSeconds(suggestion.begin);
        return !existingSeconds.some((existing) => Math.abs(existing - seconds) < minGapSeconds);
    });
}

/**
 * Compute the initial-view bbox for a marker. The geocoder's recommended
 * viewport is authoritative and used as-is; when it is missing (fallback to the
 * model's own coordinates) a fixed default half-extent is drawn around the point
 * instead. Longitude degrees shrink with latitude, so the longitude half-extent
 * is widened by 1/cos(lat) to keep the synthetic box balanced.
 */
function viewBbox(location: GeocodedLocation): [number, number, number, number] {
    if (location.viewport) {
        const { south, west, north, east } = location.viewport;
        return [
            Math.max(-180, west),
            Math.max(-90, south),
            Math.min(180, east),
            Math.min(90, north),
        ];
    }

    const { latitude: lat, longitude: lng } = location;
    const latPadding = DEFAULT_BBOX_PADDING_DEG;
    const lngPadding = latPadding / Math.max(0.1, Math.cos((lat * Math.PI) / 180));
    return [
        Math.max(-180, lng - lngPadding),
        Math.max(-90, lat - latPadding),
        Math.min(180, lng + lngPadding),
        Math.min(90, lat + latPadding),
    ];
}

/**
 * Build a single-marker map. The only feature is one `Point` (never lines or
 * polygons) carrying a `location` marker, placed at the resolved (geocoded or
 * fallback) coordinate, with the initial view driven by `viewBbox`.
 */
function pointFeatureCollection(
    place: AnalysisPlace,
    location: GeocodedLocation,
): Record<string, unknown> {
    const lng = location.longitude;
    const lat = location.latitude;
    const id = `richpods-${uuidv4().replace(/-/g, "").slice(0, 12)}-1`;

    const [minLng, minLat, maxLng, maxLat] = viewBbox(location);

    const properties: Record<string, unknown> = {
        id,
        "marker-symbol": MARKER_SYMBOL,
        "marker-color": MARKER_COLOR,
        title: truncate(place.name, 200),
    };
    const description = truncate(place.description ?? "", 500);
    if (description) {
        properties.description = description;
    }

    return {
        type: "FeatureCollection",
        bbox: [minLng, minLat, maxLng, maxLat],
        features: [
            {
                type: "Feature",
                id,
                geometry: {
                    type: "Point",
                    coordinates: [lng, lat],
                },
                properties,
            },
        ],
    };
}

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const QID_PATTERN = /^Q\d+$/;

type WikidataClaims = { P856?: Array<{ mainsnak?: { datavalue?: { value?: unknown } } }> };
type WikidataSitelinks = Record<string, { url?: string }>;

type WikidataEntity = {
    conceptUri: string;
    officialWebsite: string | null;
    wikipediaUrl: string | null;
};

/** Curated official website (P856), only when it is a valid http(s) URL. */
function extractOfficialWebsite(claims: WikidataClaims | undefined): string | null {
    const value = claims?.P856?.[0]?.mainsnak?.datavalue?.value;
    return typeof value === "string" ? validHttpUrl(value) : null;
}

/** Wikipedia article URL, preferring the transcript language, then English. */
function extractWikipediaUrl(
    sitelinks: WikidataSitelinks | undefined,
    langCode: string,
): string | null {
    const url = sitelinks?.[`${langCode}wiki`]?.url ?? sitelinks?.enwiki?.url;
    return typeof url === "string" ? validHttpUrl(url) : null;
}

/**
 * Resolve a Wikidata item by its exact ID to the CTA data shown on a topic
 * chapter: concept URI, Wikipedia article and (P856) official website. Returns
 * null for a missing item or any request failure.
 */
async function fetchWikidataByQid(qid: string, langCode: string): Promise<WikidataEntity | null> {
    try {
        const response = await got(WIKIDATA_API, {
            searchParams: {
                action: "wbgetentities",
                ids: qid,
                props: "claims|sitelinks/urls",
                sitefilter: `${langCode}wiki|enwiki`,
                format: "json",
            },
            timeout: { request: 3500 },
            responseType: "json",
            headers: { "user-agent": HTTP_USER_AGENT },
        });
        const entity = (
            response.body as {
                entities?: Record<
                    string,
                    { missing?: string; claims?: WikidataClaims; sitelinks?: WikidataSitelinks }
                >;
            }
        ).entities?.[qid];
        if (!entity || entity.missing !== undefined) return null;

        return {
            conceptUri: `https://www.wikidata.org/entity/${qid}`,
            officialWebsite: extractOfficialWebsite(entity.claims),
            wikipediaUrl: extractWikipediaUrl(entity.sitelinks, langCode),
        };
    } catch {
        return null;
    }
}

// How many search hits to offer the model per topic when disambiguating. A
// handful is enough to surface the right item alongside its common confusions
// (e.g. "Mercury" the planet vs. the element vs. the singer) without bloating
// the prompt.
const WIKIDATA_SEARCH_LIMIT = 5;

/**
 * Search Wikidata for a term and return up to WIKIDATA_SEARCH_LIMIT candidate
 * items with their label and description. These real hits are the only QIDs the
 * model is later allowed to choose from, so a topic can never link to an item
 * that was merely recalled rather than actually found.
 */
async function searchWikidataCandidates(
    query: string,
    langCode: string,
): Promise<WikidataCandidate[]> {
    if (!query.trim()) return [];
    try {
        const search = await got(WIKIDATA_API, {
            searchParams: {
                action: "wbsearchentities",
                search: query.trim(),
                language: langCode,
                uselang: langCode,
                format: "json",
                limit: WIKIDATA_SEARCH_LIMIT,
            },
            timeout: { request: 3500 },
            responseType: "json",
            headers: { "user-agent": HTTP_USER_AGENT },
        });
        const hits =
            (
                search.body as {
                    search?: Array<{ id?: string; label?: string; description?: string }>;
                }
            ).search ?? [];
        return hits
            .filter(
                (hit): hit is { id: string; label?: string; description?: string } =>
                    typeof hit.id === "string" && QID_PATTERN.test(hit.id),
            )
            .map((hit) => ({
                qid: hit.id,
                label: hit.label ?? "",
                description: hit.description ?? "",
            }));
    } catch {
        return [];
    }
}

// Wikidata "instance of" (P31) values that mark an item as Wikimedia
// infrastructure rather than a real-world entity. A topic must never link to one
// of these, so any candidate that is an instance of one is rejected outright —
// this is what removes the disambiguation-page and category hits that
// wbsearchentities readily returns.
const BLOCKED_INSTANCE_OF = new Set<string>([
    "Q4167410", // Wikimedia disambiguation page
    "Q22808320", // Wikimedia human name disambiguation page
    "Q4167836", // Wikimedia category
    "Q13406463", // Wikimedia list article
    "Q11266439", // Wikimedia template
    "Q4663903", // Wikimedia portal
    "Q15184295", // Wikimedia module
    "Q17442446", // Wikimedia internal item
]);

// P31 values accepted when the model classified a topic as a `person`. A real
// person is always an instance of human; fictional people carry one of the
// character types instead. Requiring one of these cheaply rejects the common
// "named after a person" confusions (a song, film or company sharing the name).
const PERSON_INSTANCE_OF = new Set<string>([
    "Q5", // human
    "Q15632617", // fictional human
    "Q95074", // fictional character
    "Q3658341", // literary character
]);

// wbgetentities accepts up to 50 ids per request.
const WBGETENTITIES_BATCH_SIZE = 50;

type P31Snak = { mainsnak?: { datavalue?: { value?: { id?: string } } } };

/**
 * Batch-fetch the `instance of` (P31) target QIDs for every candidate across all
 * topics in as few requests as possible. The returned map only contains items
 * the Wikidata API actually resolved; a QID absent from the map is treated as
 * unverifiable by the caller and dropped (fail-safe — a missing link beats a
 * wrong one).
 */
async function fetchInstanceOfByQid(qids: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    const unique = [...new Set(qids)];
    for (let offset = 0; offset < unique.length; offset += WBGETENTITIES_BATCH_SIZE) {
        const batch = unique.slice(offset, offset + WBGETENTITIES_BATCH_SIZE);
        try {
            const response = await got(WIKIDATA_API, {
                searchParams: {
                    action: "wbgetentities",
                    ids: batch.join("|"),
                    props: "claims",
                    format: "json",
                },
                timeout: { request: 3500 },
                responseType: "json",
                headers: { "user-agent": HTTP_USER_AGENT },
            });
            const entities =
                (
                    response.body as {
                        entities?: Record<
                            string,
                            { missing?: string; claims?: { P31?: P31Snak[] } }
                        >;
                    }
                ).entities ?? {};
            for (const [qid, entity] of Object.entries(entities)) {
                if (entity.missing !== undefined) continue;
                const instanceOf = (entity.claims?.P31 ?? [])
                    .map((claim) => claim.mainsnak?.datavalue?.value?.id)
                    .filter((id): id is string => typeof id === "string");
                result.set(qid, instanceOf);
            }
        } catch {
            // Leave this batch's QIDs unmapped; the caller drops them as unverified.
        }
    }
    return result;
}

/**
 * Decide whether a search candidate may be used, given the `instance of` (P31)
 * QIDs the Wikidata API reports for it and the entity kind the model expected.
 * Returns false for anything unverifiable (no API data), every Wikimedia
 * meta-item, and persons that do not actually resolve to a person item.
 */
function passesVerification(
    instanceOf: string[] | undefined,
    entityType: AnalysisEntityType | undefined,
): boolean {
    if (!instanceOf) return false;
    if (instanceOf.some((id) => BLOCKED_INSTANCE_OF.has(id))) return false;
    if (entityType === "person") {
        return instanceOf.some((id) => PERSON_INSTANCE_OF.has(id));
    }
    return true;
}

/**
 * Resolve each topic to the Wikidata QID it refers to, aligned with the input
 * `topics` array (null when there is no confident match). The pipeline keeps
 * every identifier grounded in the Wikidata API and never in the model:
 *
 *  1. Search real candidates per topic (concurrently) using the model's query.
 *  2. Look up each candidate's `instance of` (P31) in one batched request and
 *     keep only candidates that pass verification — dropping disambiguation
 *     pages, Wikimedia meta-items and type-mismatched persons.
 *  3. Let a single batched model call pick the best of the *verified* candidates
 *     for each topic.
 *
 * If the disambiguation call fails, fall back to each topic's top verified hit.
 * Either way the QID is always a real, verified search result — never one the
 * model recalled, invented or mistyped.
 */
async function resolveTopicWikidataQids(
    topics: AnalysisTopic[],
    language: string,
    langCode: string,
    richPodId: string,
): Promise<(string | null)[]> {
    const candidatesPerTopic = await Promise.all(
        topics.map((topic) => {
            const query = topic.wikidataQuery?.trim();
            return query ? searchWikidataCandidates(query, langCode) : Promise.resolve([]);
        }),
    );

    const instanceOfByQid = await fetchInstanceOfByQid(
        candidatesPerTopic.flat().map((candidate) => candidate.qid),
    );

    const verifiedPerTopic = topics.map((topic, index) =>
        candidatesPerTopic[index].filter((candidate) =>
            passesVerification(instanceOfByQid.get(candidate.qid), topic.entityType),
        ),
    );

    const pending = topics
        .map((topic, index) => ({ topic, index, candidates: verifiedPerTopic[index] }))
        .filter((entry) => entry.candidates.length > 0);

    const resolved: (string | null)[] = topics.map(() => null);
    if (pending.length === 0) return resolved;

    try {
        const selections = await disambiguateWikidata(
            pending.map((entry) => ({
                title: entry.topic.title,
                explainer: entry.topic.explainer,
                entityType: entry.topic.entityType,
                candidates: entry.candidates,
            })),
            language,
            richPodId,
        );
        pending.forEach((entry, i) => {
            resolved[entry.index] = selections[i] ?? null;
        });
    } catch (error) {
        logWarn(
            richPodId,
            "Wikidata disambiguation failed; falling back to top verified hits",
            error,
        );
        for (const entry of pending) {
            resolved[entry.index] = entry.candidates[0].qid;
        }
    }
    return resolved;
}

const GEOCODING_API = "https://maps.googleapis.com/maps/api/geocode/json";

/**
 * Resolve a place query to authoritative coordinates and the geocoder's
 * recommended map viewport via the Google Maps Geocoding API. Returns null when
 * no API key is configured, the query is empty, or the lookup yields no usable
 * result — the caller then falls back to the model's own approximate coordinates.
 */
async function geocodePlace(query: string, langCode: string): Promise<GeocodedLocation | null> {
    const apiKey = config.geocodingApiKey;
    if (!apiKey || !query.trim()) return null;
    try {
        const response = await got(GEOCODING_API, {
            searchParams: { address: query.trim(), language: langCode, key: apiKey },
            timeout: { request: 3500 },
            responseType: "json",
        });
        const body = response.body as {
            status?: string;
            results?: Array<{
                geometry?: {
                    location?: { lat?: number; lng?: number };
                    viewport?: {
                        northeast?: { lat?: number; lng?: number };
                        southwest?: { lat?: number; lng?: number };
                    };
                };
            }>;
        };
        if (body.status !== "OK") return null;

        const geometry = body.results?.[0]?.geometry;
        const lat = geometry?.location?.lat;
        const lng = geometry?.location?.lng;
        if (typeof lat !== "number" || typeof lng !== "number") return null;

        const ne = geometry?.viewport?.northeast;
        const sw = geometry?.viewport?.southwest;
        const viewport =
            typeof ne?.lat === "number" &&
            typeof ne?.lng === "number" &&
            typeof sw?.lat === "number" &&
            typeof sw?.lng === "number"
                ? { north: ne.lat, east: ne.lng, south: sw.lat, west: sw.lng }
                : undefined;

        return { latitude: lat, longitude: lng, viewport };
    } catch {
        return null;
    }
}

function decodeEntities(value: string): string {
    return value
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&#x27;/gi, "'");
}

function parseMetaTags(html: string): Record<string, string> {
    const result: Record<string, string> = {};
    const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
    for (const tag of tags) {
        const key = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
        const content = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
        if (key && content !== undefined && !(key in result)) {
            result[key] = decodeEntities(content);
        }
    }
    return result;
}

/**
 * Best-effort Open Graph preview fetch for a referenced URL. Returns null on
 * any failure or non-HTML response — link cards remain valid without a preview.
 */
async function fetchOpenGraph(url: string): Promise<CardOpenGraph | null> {
    try {
        await assertSafePublicUrl(url);
        const response = await got(url, {
            timeout: { request: 3500 },
            followRedirect: true,
            responseType: "text",
            headers: { "user-agent": HTTP_USER_AGENT },
            hooks: { beforeRedirect: [ssrfSafeRedirect] },
        });
        const contentType = String(response.headers["content-type"] ?? "");
        if (!contentType.includes("text/html")) return null;

        const meta = parseMetaTags(response.body.slice(0, 200000));
        const title = meta["og:title"] ?? meta["twitter:title"];
        const description = meta["og:description"] ?? meta["description"];
        const rawImage = meta["og:image"] ?? meta["twitter:image"];

        let ogImageUrl: string | undefined;
        if (rawImage) {
            try {
                const resolved = new URL(rawImage, url).toString();
                if (resolved.length <= 1000 && validHttpUrl(resolved)) {
                    ogImageUrl = resolved;
                }
            } catch {
                // ignore unparseable image URL
            }
        }

        const openGraph: CardOpenGraph = {};
        if (title) openGraph.ogTitle = truncate(title, 500);
        if (description) openGraph.ogDescription = truncate(description, 2000);
        if (ogImageUrl) openGraph.ogImageUrl = ogImageUrl;

        return Object.keys(openGraph).length > 0 ? openGraph : null;
    } catch {
        return null;
    }
}

/**
 * Turn the analysis result into ordered chapter suggestions. On a fresh RichPod
 * (no existing chapters) the first chapter is an AI-notice Markdown chapter; on
 * a re-run the notice is omitted. Suggestions that would collide with an
 * existing chapter (within the minimum gap) are dropped. Each suggestion is
 * shaped to match the server's Enclosure schema so it validates unchanged when
 * accepted.
 */
export async function buildSuggestions(
    transcript: Transcript,
    analysis: AnalysisResult,
    richPodId: string,
    existingChapterBegins: string[] = [],
): Promise<ChapterSuggestion[]> {
    const langCode = toLangCode(transcript.language);
    const rest: ChapterSuggestion[] = [];

    // Resolve each topic's Wikidata item up front: search real candidates and let
    // the model pick the right one per topic. Every QID used below is therefore an
    // actual search hit, never one the model merely recalled.
    const topicQids = await resolveTopicWikidataQids(
        analysis.topics,
        transcript.language,
        langCode,
        richPodId,
    );

    // Entity lookups are independent per topic — fetch them concurrently so
    // wall-clock is the slowest single request, not the sum of all of them.
    const topicSuggestions = await Promise.all(
        analysis.topics.map(async (topic, index): Promise<ChapterSuggestion | null> => {
            const text = (topic.explainer || "").trim();
            if (!text || !topic.title?.trim()) return null;

            // Add call-to-action buttons for the entity: its official website
            // (only when Wikidata records one, so we know it is legitimate), its
            // Wikipedia article, and Wikidata.
            const links: MarkdownLink[] = [];
            const qid = topicQids[index];
            if (qid) {
                const wikidata = await fetchWikidataByQid(qid, langCode);
                if (wikidata) {
                    if (wikidata.officialWebsite) {
                        links.push({
                            label: OFFICIAL_SITE_LABEL[langCode] ?? OFFICIAL_SITE_LABEL.en,
                            url: wikidata.officialWebsite,
                        });
                    }
                    if (wikidata.wikipediaUrl) {
                        links.push({
                            label: WIKIPEDIA_LABEL[langCode] ?? WIKIPEDIA_LABEL.en,
                            url: wikidata.wikipediaUrl,
                        });
                    }
                    links.push({
                        label: WIKIDATA_LABEL[langCode] ?? WIKIDATA_LABEL.en,
                        url: wikidata.conceptUri,
                    });
                }
            }

            return {
                begin: normalizeBegin(topic.begin),
                enclosureType: EnclosureType.MARKDOWN,
                enclosure: { title: truncate(topic.title, 200), text: truncate(text, 5000), links },
            };
        }),
    );
    rest.push(...topicSuggestions.filter((s): s is ChapterSuggestion => s !== null));

    for (const quote of analysis.quotes) {
        const quoteText = (quote.quoteText || "").trim();
        if (!quoteText) continue;
        const source = truncate(quote.source || "", 100);
        rest.push({
            begin: normalizeBegin(quote.begin),
            enclosureType: EnclosureType.CARD,
            enclosure: {
                title: truncate(source || QUOTE_TITLE[langCode] || QUOTE_TITLE.en, 200),
                cardType: "CITATION",
                visibleAsChapter: true,
                quoteText: truncate(quoteText, 1500),
                ...(source ? { citationSource: source } : {}),
            },
        });
    }

    // OpenGraph previews are independent per link — fetch them concurrently.
    const linkSuggestions = await Promise.all(
        analysis.links.map(async (link): Promise<ChapterSuggestion | null> => {
            const url = validHttpUrl(link.url || "");
            if (!url || url.length > 500) return null;
            const openGraph = await fetchOpenGraph(url);
            return {
                begin: normalizeBegin(link.begin),
                enclosureType: EnclosureType.CARD,
                enclosure: {
                    title: truncate(
                        link.title?.trim() || openGraph?.ogTitle?.trim() || url,
                        200,
                    ),
                    cardType: "LINK",
                    visibleAsChapter: true,
                    url,
                    ...(openGraph ? { openGraph } : {}),
                },
            };
        }),
    );
    rest.push(...linkSuggestions.filter((s): s is ChapterSuggestion => s !== null));

    // Geocoding lookups are independent per place — resolve them concurrently.
    // The geocoded coordinate + viewport are authoritative; the model's own
    // coordinates are only a fallback for the rare geocoding miss, and a place
    // with neither is dropped rather than placed at a guessed point.
    const placeSuggestions = await Promise.all(
        analysis.places.map(async (place): Promise<ChapterSuggestion | null> => {
            if (!place.name?.trim()) return null;

            const geocoded = await geocodePlace(place.geocodeQuery?.trim() || place.name, langCode);
            const { latitude: lat, longitude: lng } = place;
            const fallback: GeocodedLocation | null =
                typeof lat === "number" &&
                Number.isFinite(lat) &&
                typeof lng === "number" &&
                Number.isFinite(lng)
                    ? { latitude: lat, longitude: lng }
                    : null;
            const location = geocoded ?? fallback;
            if (!location) return null;

            return {
                begin: normalizeBegin(place.begin),
                enclosureType: EnclosureType.GEO_MAP,
                enclosure: {
                    title: truncate(place.name, 200),
                    description: "",
                    geoJSON: pointFeatureCollection(place, location),
                },
            };
        }),
    );
    rest.push(...placeSuggestions.filter((s): s is ChapterSuggestion => s !== null));

    rest.sort((a, b) => a.begin.localeCompare(b.begin));

    const occupiedSeconds = existingChapterBegins.map((begin) =>
        beginToSeconds(normalizeBegin(begin)),
    );

    // On a fresh RichPod, prepend the AI-notice chapter at 0. On a re-run (the
    // RichPod already has chapters) skip it — it would collide with the existing
    // opening chapter and the RichPod is no longer purely AI-generated.
    const isFresh = occupiedSeconds.length === 0;
    const ordered = isFresh
        ? [
              {
                  begin: "00:00:00.000",
                  enclosureType: EnclosureType.MARKDOWN,
                  enclosure: {
                      title: (NOTICE[langCode] ?? NOTICE.en).title,
                      text: (NOTICE[langCode] ?? NOTICE.en).text,
                      links: [],
                  },
              } satisfies ChapterSuggestion,
              ...rest,
          ]
        : rest;

    // First space the suggestions among themselves (min chapter length), then
    // drop only those that land within ±MIN_CHAPTER_GAP_SECONDS of an existing
    // chapter. Existing chapters are mere exclusion zones — they never block
    // suggestions beyond their own ±window.
    const spaced = enforceMinSpacing(ordered, MIN_CHAPTER_GAP_SECONDS);
    const filtered = dropNearExistingChapters(spaced, occupiedSeconds, MIN_CHAPTER_GAP_SECONDS);
    return filtered.slice(0, MAX_TOTAL_SUGGESTIONS);
}
