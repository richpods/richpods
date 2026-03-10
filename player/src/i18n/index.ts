import { createI18n } from "vue-i18n";
import merge from "lodash.merge";
import en from "./locales/en.json";
import de from "./locales/de.json";
import sharedEn from "@richpods/shared/i18n/locales/en.json";
import sharedDe from "@richpods/shared/i18n/locales/de.json";
import { resolveBrowserLanguage } from "./language";

export const i18n = createI18n({
    legacy: false,
    locale: resolveBrowserLanguage(),
    fallbackLocale: "en",
    messages: {
        en: merge({}, sharedEn, en),
        de: merge({}, sharedDe, de),
    },
});

export default i18n;
