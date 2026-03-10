import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: "2025-05-15",
    devtools: { enabled: true },
    modules: ["@nuxt/eslint", "@nuxtjs/i18n"],
    alias: {
        "@richpods/shared": resolve(__dirname, "../shared"),
    },
    i18n: {
        locales: [
            { code: "en", language: "en-US", file: "en.json", name: "English" },
            { code: "de", language: "de-DE", file: "de.json", name: "Deutsch" },
        ],
        defaultLocale: "de",
        langDir: "locales",
        strategy: "prefix_except_default",
        customRoutes: "meta",
        detectBrowserLanguage: {
            useCookie: true,
            cookieKey: "i18n_redirected",
            redirectOn: "root",
        },
    },
    app: {
        head: {
            title: "RichPods",
            titleTemplate: "%s - RichPods",
            link: [
                { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
                { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
                { rel: "apple-touch-icon", href: "/apple-touch-icon.png" }
            ]
        }
    },
    runtimeConfig: {
        public: {
            baseURL: "",
            graphqlEndpoint: process.env.NUXT_PUBLIC_GRAPHQL_ENDPOINT || "http://localhost:4000/graphql",
            playerUrlPattern: process.env.NUXT_PUBLIC_PLAYER_URL_PATTERN || "http://localhost:5174/player/{ID}",
        },
    },
    vite: {
        css: {
            preprocessorOptions: {
                scss: {
                    additionalData: "@use '~/assets/styles/global' as *;",
                    silenceDeprecations: ["global-builtin"],
                },
            },
        },
    },
});
