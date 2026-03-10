/**
 * Re-exports shared language utilities for the player.
 * The player uses browser-based language detection.
 */

export {
    supportedLanguages,
    type SupportedLanguage,
    resolveBrowserLanguage,
    normalizeLanguageCode,
} from "@richpods/shared/i18n/language";
