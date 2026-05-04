import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

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

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const basePath = env.VITE_BASE_PATH || "/";

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
        ],
        resolve: {
            alias: {
                "@": resolve(__dirname, "src"),
                "@richpods/shared": resolve(__dirname, "../shared"),
                "@player": resolve(__dirname, "../player/src"),
            },
        },
        server: {
            fs: {
                // allow serving files from one level up to import from ../player/src
                allow: [".."],
            },
        },
    };
});
