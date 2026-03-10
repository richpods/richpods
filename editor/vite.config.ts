import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const basePath = env.VITE_BASE_PATH || "/";

    return {
        base: basePath,
        plugins: [
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
