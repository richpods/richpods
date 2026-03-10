/**
 * Shared language utilities for i18n across all modules.
 * This ensures consistent language detection and validation.
 */

export const supportedLanguages = ["en", "de"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

type ParsedLanguagePreference = {
    language: string;
    quality: number;
    index: number;
};

/**
 * Normalizes a language code to a supported language.
 * Handles formats like "en-US", "de-AT", "en", etc.
 */
export function normalizeLanguageCode(value?: string | null): SupportedLanguage | null {
    if (!value) {
        return null;
    }

    const primary = value.split(",")[0]?.trim();
    if (!primary) {
        return null;
    }

    const code = primary.split(";")[0]?.trim().split("-")[0]?.toLowerCase();
    if (!code) {
        return null;
    }

    return supportedLanguages.includes(code as SupportedLanguage)
        ? (code as SupportedLanguage)
        : null;
}

function parseLanguagePreference(part: string, index: number): ParsedLanguagePreference | null {
    const segments = part
        .split(";")
        .map((segment) => segment.trim())
        .filter(Boolean);

    const languageToken = segments[0];
    if (!languageToken) {
        return null;
    }

    const primary = languageToken.split("-")[0]?.toLowerCase();
    if (!primary) {
        return null;
    }

    const qualitySegment = segments.find((segment) => segment.startsWith("q="));
    if (!qualitySegment) {
        return { language: primary, quality: 1, index };
    }

    const quality = Number.parseFloat(qualitySegment.slice(2));
    if (!Number.isFinite(quality) || quality < 0 || quality > 1) {
        return null;
    }

    return { language: primary, quality, index };
}

/**
 * Parses an Accept-Language header and returns the preferred supported language.
 * Respects q-values and preserves original order for ties.
 */
export function parseAcceptLanguageHeader(
    headerValue?: string | string[] | null,
): SupportedLanguage | null {
    const value = Array.isArray(headerValue) ? headerValue.join(",") : headerValue;

    if (!value) {
        return null;
    }

    const parsedPreferences = value
        .split(",")
        .map((part, index) => parseLanguagePreference(part, index))
        .filter((entry): entry is ParsedLanguagePreference => entry !== null)
        .sort((a, b) => {
            if (b.quality !== a.quality) {
                return b.quality - a.quality;
            }

            return a.index - b.index;
        });

    for (const preference of parsedPreferences) {
        if (supportedLanguages.includes(preference.language as SupportedLanguage)) {
            return preference.language as SupportedLanguage;
        }
    }

    return null;
}

/**
 * Resolves the language to use, with fallback to English.
 * @param preferred - A preferred language code (from user settings, etc.)
 * @param browserLanguage - The browser's navigator.language value (optional, browser-only)
 */
export function resolveLanguage(
    preferred?: string | null,
    browserLanguage?: string | null,
): SupportedLanguage {
    const normalizedPreferred = normalizeLanguageCode(preferred);
    if (normalizedPreferred) {
        return normalizedPreferred;
    }

    const normalizedBrowser = normalizeLanguageCode(browserLanguage);
    if (normalizedBrowser) {
        return normalizedBrowser;
    }

    return "en";
}

/**
 * Browser-specific helper that uses navigator.language for detection.
 * Only use this in browser environments.
 */
export function resolveBrowserLanguage(preferred?: string | null): SupportedLanguage {
    // Check if we're in a browser environment
    let browserLang: string | null = null;

    if (typeof globalThis !== "undefined" && "navigator" in globalThis) {
        const nav = (globalThis as unknown as { navigator?: { language?: unknown } }).navigator;
        if (nav && typeof nav.language === "string") {
            browserLang = nav.language;
        }
    }

    return resolveLanguage(preferred, browserLang);
}
