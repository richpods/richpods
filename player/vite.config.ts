/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";

import { defineConfig, loadEnv } from "vite";
import { configDefaults } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
function typekitPlugin() {
    let typekitId: string | undefined;

    return {
        name: "richpods-typekit",
        configResolved(config: { env: Record<string, string> }) {
            typekitId = config.env.VITE_TYPEKIT_ID;
        },
        transformIndexHtml(html: string) {
            if (!typekitId) return html;
            return html.replace(
                "</head>",
                `    <link rel="stylesheet" href="https://use.typekit.net/${typekitId}.css">\n</head>`,
            );
        },
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const basePath = env.VITE_BASE_PATH || "/player/";

    return {
        base: basePath,
        plugins: [
            typekitPlugin(),
            vue({
                template: {
                    compilerOptions: {
                        // Treat echarts-sandbox as a custom element (web component)
                        isCustomElement: (tag) => tag === "echarts-sandbox",
                    },
                },
            }),
            vueDevTools(),
        ],
        resolve: {
            alias: {
                "@": fileURLToPath(new URL("./src", import.meta.url)),
                "@richpods/shared": fileURLToPath(new URL("../shared", import.meta.url)),
            },
        },
        test: {
            environment: "jsdom",
            exclude: [...configDefaults.exclude, "e2e/**"],
            root: fileURLToPath(new URL("./", import.meta.url)),
        },
    };
});
