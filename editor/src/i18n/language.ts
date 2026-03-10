/**
 * Re-exports shared language utilities for the editor.
 * The editor uses browser-based language detection.
 */

export {
    supportedLanguages as supportedEditorLanguages,
    type SupportedLanguage as EditorLanguage,
    resolveBrowserLanguage as resolveEditorLanguage,
    normalizeLanguageCode,
} from "@richpods/shared/i18n/language";
