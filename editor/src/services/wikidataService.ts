/**
 * Wikidata API service for searching entities and generating Factbox templates.
 *
 * Uses the Wikidata API:
 * - wbsearchentities: Search for entities by label
 * - wbgetentities: Fetch detailed entity data
 */

import type { EditorFactboxLink } from "@/types/editor";
import enMessages from "@/i18n/locales/en.json";
import deMessages from "@/i18n/locales/de.json";

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";

type WikidataMessages = {
    propertyLabels: Record<string, string>;
    keyFactsHeading: string;
    links: {
        wikipedia: string;
        officialWebsite: string;
        wikidata: string;
    };
    dateLocale: string;
};

function resolveWikidataMessages(language: string): WikidataMessages {
    const locale = language.toLowerCase().startsWith("de")
        ? ((deMessages as { wikidata?: WikidataMessages }).wikidata ?? null)
        : null;
    if (locale) {
        return locale;
    }
    return (enMessages as { wikidata: WikidataMessages }).wikidata;
}

// Properties to extract for different entity types
const PERSON_PROPERTIES = ["P569", "P570", "P19", "P106", "P27", "P69", "P800"];
const ORGANIZATION_PROPERTIES = ["P571", "P159", "P17", "P856", "P154"];
const PLACE_PROPERTIES = ["P17", "P131", "P625", "P1566"];
const WORK_PROPERTIES = ["P577", "P50", "P57", "P136", "P495"];

export type WikidataSearchResult = {
    id: string;
    label: string;
    description: string;
    language: string;
};

export type WikidataProperty = {
    id: string;
    label: string;
    value: string;
};

export type WikidataEntityDetail = {
    id: string;
    label: string;
    description: string;
    properties: WikidataProperty[];
    wikipediaUrl?: string;
    officialWebsite?: string;
    imageUrl?: string;
};

export type FactboxTemplate = {
    title: string;
    text: string;
    links: EditorFactboxLink[];
};

// Simple in-memory cache with TTL
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
        cache.delete(key);
        return null;
    }
    return entry.data as T;
}

function setCache(key: string, data: unknown): void {
    cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

/**
 * Common language codes with their display names
 */
export const SUPPORTED_LANGUAGES: Record<string, string> = {
    en: "English",
    de: "Deutsch",
    fr: "Français",
    es: "Español",
    it: "Italiano",
    pt: "Português",
    nl: "Nederlands",
    pl: "Polski",
    ru: "Русский",
    ja: "日本語",
    zh: "中文",
    ko: "한국어",
    ar: "العربية",
};

/**
 * Get the user's preferred language from the browser
 */
export function getBrowserLanguage(): string {
    const lang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || "en";
    // Extract just the language code (e.g., "en" from "en-US")
    return lang.split("-")[0].toLowerCase();
}

/**
 * Get prioritized list of languages for search
 * Order: user's browser language, English (if different), then others
 */
export function getPrioritizedLanguages(userLang: string): string[] {
    const priority: string[] = [];

    // Add user's language first if supported
    if (SUPPORTED_LANGUAGES[userLang]) {
        priority.push(userLang);
    }

    // Add English second if not already added
    if (userLang !== "en") {
        priority.push("en");
    }

    // Add remaining languages
    for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
        if (!priority.includes(lang)) {
            priority.push(lang);
        }
    }

    return priority;
}

/**
 * Search Wikidata for entities matching a query in a single language
 */
export async function searchWikidata(
    query: string,
    language: string = "en",
    limit: number = 10
): Promise<WikidataSearchResult[]> {
    if (!query.trim()) return [];

    const cacheKey = `search:${language}:${query}`;
    const cached = getCached<WikidataSearchResult[]>(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
        action: "wbsearchentities",
        search: query,
        language,
        uselang: language,
        limit: String(limit),
        format: "json",
        origin: "*",
    });

    const response = await fetch(`${WIKIDATA_API}?${params}`);
    if (!response.ok) {
        throw new Error(`Wikidata search failed: ${response.statusText}`);
    }

    const data = await response.json();
    const results: WikidataSearchResult[] = (data.search || []).map(
        (item: { id: string; label?: string; description?: string }) => ({
            id: item.id,
            label: item.label || item.id,
            description: item.description || "",
            language,
        })
    );

    setCache(cacheKey, results);
    return results;
}

/**
 * Search result grouped by language
 */
export type LanguageGroupedResults = {
    language: string;
    languageName: string;
    results: WikidataSearchResult[];
};

/**
 * Search Wikidata in multiple languages and return grouped results
 */
export async function searchWikidataMultiLang(
    query: string,
    languages: string[],
    limit: number = 5
): Promise<LanguageGroupedResults[]> {
    if (!query.trim()) return [];

    // Search in all languages concurrently
    const searchPromises = languages.map((lang) => searchWikidata(query, lang, limit));
    const allResults = await Promise.all(searchPromises);

    // Group results by language, filtering out empty results
    const grouped: LanguageGroupedResults[] = [];

    for (let i = 0; i < languages.length; i++) {
        const lang = languages[i];
        const results = allResults[i];

        if (results.length > 0) {
            grouped.push({
                language: lang,
                languageName: SUPPORTED_LANGUAGES[lang] || lang,
                results,
            });
        }
    }

    return grouped;
}

/**
 * Intermediate property with potential entity reference
 */
type RawProperty = {
    id: string;
    label: string;
    value: string;
    entityRef?: string; // If value is an entity ID that needs resolution
};

/**
 * Fetch detailed entity information from Wikidata
 */
export async function getWikidataEntity(
    entityId: string,
    language: string = "en"
): Promise<WikidataEntityDetail> {
    const messages = resolveWikidataMessages(language);
    const cacheKey = `entity:${language}:${entityId}`;
    const cached = getCached<WikidataEntityDetail>(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
        action: "wbgetentities",
        ids: entityId,
        languages: language,
        props: "labels|descriptions|claims|sitelinks",
        format: "json",
        origin: "*",
    });

    const response = await fetch(`${WIKIDATA_API}?${params}`);
    if (!response.ok) {
        throw new Error(`Wikidata entity fetch failed: ${response.statusText}`);
    }

    const data = await response.json();
    const entity = data.entities?.[entityId];
    if (!entity) {
        throw new Error(`Entity ${entityId} not found`);
    }

    const label = entity.labels?.[language]?.value || entityId;
    const description = entity.descriptions?.[language]?.value || "";

    // Extract Wikipedia URL from sitelinks
    const wikipediaUrl =
        entity.sitelinks?.[`${language}wiki`]?.url ||
        (entity.sitelinks?.[`${language}wiki`]?.title
            ? `https://${language}.wikipedia.org/wiki/${encodeURIComponent(entity.sitelinks[`${language}wiki`].title)}`
            : undefined);

    // First pass: Extract raw properties and collect entity references
    const rawProperties: RawProperty[] = [];
    const entityRefsToResolve: string[] = [];
    let officialWebsite: string | undefined;
    let imageUrl: string | undefined;

    const claims = entity.claims || {};

    // Determine entity type and select relevant properties
    const instanceOf = claims.P31?.[0]?.mainsnak?.datavalue?.value?.id;
    let relevantProps = [
        ...PERSON_PROPERTIES,
        ...ORGANIZATION_PROPERTIES,
        ...PLACE_PROPERTIES,
        ...WORK_PROPERTIES,
    ];

    // Check if it's a person (Q5)
    if (instanceOf === "Q5") {
        relevantProps = PERSON_PROPERTIES;
    }

    for (const propId of relevantProps) {
        const propClaims = claims[propId];
        if (!propClaims || propClaims.length === 0) continue;

        const propLabel = messages.propertyLabels[propId] || propId;

        // For some properties, collect multiple values (e.g., occupations)
        const isMultiValueProp = ["P106", "P27", "P69", "P800"].includes(propId);
        const claimsToProcess = isMultiValueProp ? propClaims.slice(0, 3) : [propClaims[0]];

        for (const claim of claimsToProcess) {
            const extracted = extractClaimValueWithRef(claim, language);

            if (extracted) {
                if (extracted.entityRef) {
                    entityRefsToResolve.push(extracted.entityRef);
                }
                rawProperties.push({
                    id: propId,
                    label: propLabel,
                    value: extracted.value,
                    entityRef: extracted.entityRef,
                });
            }
        }
    }

    // Extract official website (P856)
    if (claims.P856?.[0]?.mainsnak?.datavalue?.value) {
        officialWebsite = claims.P856[0].mainsnak.datavalue.value;
    }

    // Extract image URL (P18)
    if (claims.P18?.[0]?.mainsnak?.datavalue?.value) {
        const imageName = claims.P18[0].mainsnak.datavalue.value;
        imageUrl = getCommonsImageUrl(imageName);
    }

    // Second pass: Resolve entity references
    let entityLabels: Record<string, string> = {};
    if (entityRefsToResolve.length > 0) {
        entityLabels = await getEntityLabels(entityRefsToResolve, language);
    }

    // Build final properties with resolved labels, merging multi-value properties
    const propertyMap = new Map<string, WikidataProperty>();

    for (const rawProp of rawProperties) {
        const resolvedValue = rawProp.entityRef
            ? entityLabels[rawProp.entityRef] || rawProp.value
            : rawProp.value;

        const existing = propertyMap.get(rawProp.id);
        if (existing) {
            // Merge multiple values with comma separator
            existing.value = `${existing.value}, ${resolvedValue}`;
        } else {
            propertyMap.set(rawProp.id, {
                id: rawProp.id,
                label: rawProp.label,
                value: resolvedValue,
            });
        }
    }

    const properties = Array.from(propertyMap.values());

    const result: WikidataEntityDetail = {
        id: entityId,
        label,
        description,
        properties,
        wikipediaUrl,
        officialWebsite,
        imageUrl,
    };

    setCache(cacheKey, result);
    return result;
}

/**
 * Result of extracting a claim value, including potential entity reference
 */
type ExtractedClaimValue = {
    value: string;
    entityRef?: string;
} | null;

/**
 * Extract a value from a Wikidata claim, returning entity reference if applicable
 */
function extractClaimValueWithRef(claim: {
    mainsnak?: {
        datatype?: string;
        datavalue?: {
            type?: string;
            value?: unknown;
        };
    };
}, language: string = "en"): ExtractedClaimValue {
    const datavalue = claim.mainsnak?.datavalue;
    if (!datavalue) return null;

    const datatype = claim.mainsnak?.datatype;
    const value = datavalue.value;

    switch (datatype) {
        case "wikibase-item": {
            // This is a reference to another entity - mark it for resolution
            const entityValue = value as { id?: string };
            const entityId = entityValue?.id;
            if (!entityId) return null;
            return { value: entityId, entityRef: entityId };
        }
        case "time": {
            const timeValue = value as { time?: string; precision?: number };
            const formatted = formatWikidataTime(timeValue, language);
            return formatted ? { value: formatted } : null;
        }
        case "quantity": {
            const quantityValue = value as { amount?: string; unit?: string };
            const amount = quantityValue?.amount?.replace(/^\+/, "");
            return amount ? { value: amount } : null;
        }
        case "monolingualtext": {
            const textValue = value as { text?: string; language?: string };
            return textValue?.text ? { value: textValue.text } : null;
        }
        case "string":
        case "url":
        case "external-id":
            return typeof value === "string" ? { value } : null;
        case "globe-coordinate": {
            const coordValue = value as { latitude?: number; longitude?: number };
            if (coordValue?.latitude !== undefined && coordValue?.longitude !== undefined) {
                return {
                    value: `${coordValue.latitude.toFixed(4)}°, ${coordValue.longitude.toFixed(4)}°`,
                };
            }
            return null;
        }
        default:
            if (typeof value === "string") return { value };
            return null;
    }
}

/**
 * Format a Wikidata time value to a human-readable date
 */
function formatWikidataTime(
    timeValue: { time?: string; precision?: number },
    language: string = "en",
): string | null {
    if (!timeValue?.time) return null;

    // Wikidata time format: +YYYY-MM-DDT00:00:00Z
    const match = timeValue.time.match(/^[+-]?(\d+)-(\d{2})-(\d{2})/);
    if (!match) return timeValue.time;

    const [, year, month, day] = match;
    const precision = timeValue.precision || 11;
    const locale = resolveWikidataMessages(language).dateLocale;

    // Precision: 9 = year, 10 = month, 11 = day
    if (precision <= 9) {
        return year;
    } else if (precision === 10) {
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString(locale, { year: "numeric", month: "long" });
    } else {
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString(locale, {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }
}

/**
 * Get Wikimedia Commons image URL from filename
 */
function getCommonsImageUrl(filename: string, width: number = 300): string {
    const normalizedName = filename.replace(/ /g, "_");
    const encodedName = encodeURIComponent(normalizedName);
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodedName}?width=${width}`;
}

/**
 * Generate a Factbox template from a Wikidata entity
 */
export async function generateFactboxFromWikidata(
    entityId: string,
    language: string = "en"
): Promise<FactboxTemplate> {
    const messages = resolveWikidataMessages(language);
    const entity = await getWikidataEntity(entityId, language);

    // Build the markdown text
    let text = "";

    if (entity.description) {
        text += `**${entity.label}** — ${entity.description}\n\n`;
    }

    if (entity.properties.length > 0) {
        text += `## ${messages.keyFactsHeading}\n\n`;
        for (const prop of entity.properties) {
            text += `- **${prop.label}:** ${prop.value}\n`;
        }
    }

    // Build CTA links (max 3)
    const links: EditorFactboxLink[] = [];

    if (entity.wikipediaUrl) {
        links.push({ label: messages.links.wikipedia, url: entity.wikipediaUrl });
    }

    if (entity.officialWebsite && links.length < 3) {
        links.push({ label: messages.links.officialWebsite, url: entity.officialWebsite });
    }

    // Add Wikidata link if we have room
    if (links.length < 3) {
        links.push({
            label: messages.links.wikidata,
            url: `https://www.wikidata.org/wiki/${entityId}`,
        });
    }

    return {
        title: entity.label,
        text: text.trim(),
        links,
    };
}

/**
 * Fetch labels for multiple entity IDs in a single request
 * Useful for resolving entity references in property values
 */
export async function getEntityLabels(
    entityIds: string[],
    language: string = "en"
): Promise<Record<string, string>> {
    if (entityIds.length === 0) return {};

    const uniqueIds = [...new Set(entityIds)];
    const cacheKey = `labels:${language}:${uniqueIds.sort().join(",")}`;
    const cached = getCached<Record<string, string>>(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
        action: "wbgetentities",
        ids: uniqueIds.join("|"),
        languages: language,
        props: "labels",
        format: "json",
        origin: "*",
    });

    const response = await fetch(`${WIKIDATA_API}?${params}`);
    if (!response.ok) {
        throw new Error(`Wikidata labels fetch failed: ${response.statusText}`);
    }

    const data = await response.json();
    const labels: Record<string, string> = {};

    for (const id of uniqueIds) {
        const entity = data.entities?.[id];
        labels[id] = entity?.labels?.[language]?.value || id;
    }

    setCache(cacheKey, labels);
    return labels;
}
