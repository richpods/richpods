<template>
    <div class="markdown-enclosure">
        <enclosure-header :enclosure="enclosure" />
        <div class="markdown-content">
            <div class="markdown-html" v-html="parsedHtml"></div>
            <div v-if="enclosure.links && enclosure.links.length > 0" class="markdown-links">
                <a
                    v-for="(link, index) in enclosure.links"
                    :key="index"
                    :href="link.url"
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    class="markdown-link"
                >
                    <span class="markdown-link-label">{{ link.label }}</span>
                    <svg
                        class="markdown-link-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                </a>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Markdown } from "@/graphql/generated.ts";
import { ref, watch } from "vue";
import { Renderer, marked } from "marked";
import type { Tokens } from "marked";
import DOMPurify from "dompurify";
import EnclosureHeader from "./EnclosureHeader.vue";

const props = defineProps<{
    enclosure: Markdown;
}>();

const parsedHtml = ref("");

const headingOffset = props.enclosure.title != "" ? 2 : 1;
const renderer = {
    heading({ tokens, depth }: Tokens.Heading) {
        const level = depth + headingOffset;
        return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>\n`;
    },
    link({ href, title, tokens }: Tokens.Link) {
        const text = this.parser.parseInline(tokens);
        const titleAttr = title ? ` title="${title}"` : "";
        return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer nofollow ugc">${text}</a>`;
    },
} as Renderer;

marked.use({
    async: true,
    renderer,
});

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.getAttribute("href")) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer nofollow ugc");
    }
});

watch(
    () => props.enclosure.text,
    async (newText) => {
        const rawHtml = await marked.parse(newText);
        parsedHtml.value = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ["target"] });
    },
    { immediate: true },
);
</script>

<style lang="scss">
@use "../../assets/theme" as theme;

.markdown-enclosure {
    display: flex;
    flex-direction: column;
}

.markdown-content {
    padding: 0 12px 16px 12px;
    max-width: var(--richpod-content-max-width, 960px);
    width: 100%;
    box-sizing: border-box;

    @container player (min-width: #{theme.$richpod-desktop-breakpoint}) {
        padding: 4px 24px 24px 24px;
    }

    @container player (min-width: #{theme.$richpod-desktop-wide-breakpoint}) {
        padding: 4px 32px 28px 32px;
    }
}

.markdown-html {
    display: block;
    font-size: var(--richpod-font-size-body);
    line-height: var(--richpod-line-height-body);
    font-family: var(--richpod-font-family-text), sans-serif;
    color: var(--richpod-chapter-color, inherit);

    > :first-child {
        margin-top: 0;
    }

    > :last-child {
        margin-bottom: 0;
    }

    p {
        margin: 0 0 0.85em;
        font-family: inherit;
    }

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
        font-family: inherit;
        font-weight: 700;
        line-height: 1.25;
        margin: 1.2em 0 0.5em;
    }

    h1 {
        font-size: 1.5em;
    }

    h2 {
        font-size: 1.3em;
    }

    h3 {
        font-size: 1.15em;
    }

    h4 {
        font-size: 1.05em;
    }

    h5,
    h6 {
        font-size: 1em;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    h6 {
        opacity: 0.75;
    }

    strong,
    b {
        font-weight: 700;
    }

    em,
    i {
        font-style: italic;
    }

    a {
        color: var(--richpod-link-color, #2563eb);
        text-decoration: underline;
        text-underline-offset: 2px;

        &:hover {
            color: var(--richpod-link-hover-color, #1d4ed8);
        }
    }

    ul,
    ol {
        margin: 0 0 0.85em;
        padding-left: 1.5em;

        li {
            margin: 0.35em 0;
            padding: 0;
        }

        ul,
        ol {
            margin: 0.35em 0;
        }
    }

    ul {
        list-style: disc;
    }

    ol {
        list-style: decimal;
    }

    blockquote {
        margin: 1em 0;
        padding: 0.25em 0 0.25em 1em;
        border-left: 4px solid var(--richpod-border-color, #d1d5db);
        color: var(--richpod-text-secondary-color, #6b7280);
        font-style: italic;

        p:last-child {
            margin-bottom: 0;
        }
    }

    code {
        font-family:
            ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
        font-size: 0.9em;
        padding: 0.1em 0.35em;
        background: var(--richpod-code-bg-color, rgba(0, 0, 0, 0.07));
        border-radius: 4px;
    }

    pre {
        margin: 1em 0;
        padding: 12px 14px;
        background: var(--richpod-code-bg-color, rgba(0, 0, 0, 0.07));
        border-radius: 6px;
        overflow-x: auto;
        font-size: 0.9em;
        line-height: 1.5;

        code {
            padding: 0;
            background: transparent;
            border-radius: 0;
            font-size: inherit;
        }
    }

    hr {
        margin: 1.5em 0;
        border: 0;
        border-top: 1px solid var(--richpod-border-color, #d1d5db);
    }

    table {
        margin: 1em 0;
        width: 100%;
        border-collapse: collapse;
        font-size: 0.95em;

        th,
        td {
            padding: 8px 10px;
            border: 1px solid var(--richpod-border-color, #d1d5db);
            text-align: left;
            vertical-align: top;
        }

        th {
            font-weight: 700;
            background: var(--richpod-surface-muted-color, rgba(0, 0, 0, 0.04));
        }
    }

    img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
    }
}

.markdown-links {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--richpod-border-color, #e5e7eb);

    @container player (min-width: #{theme.$richpod-desktop-breakpoint}) {
        gap: 12px;
        margin-top: 28px;
        padding-top: 20px;
    }
}

.markdown-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.65em 1.2em;
    font-size: var(--richpod-font-size-cta);
    font-weight: 600;
    line-height: 1.2;
    color: var(--richpod-cta-text-color, #ffffff);
    background: var(--richpod-cta-bg-color, var(--richpod-seek-bar-progress-color, #fa8702));
    border: 1px solid
        var(--richpod-cta-border-color, var(--richpod-seek-bar-progress-color, #fa8702));
    border-radius: 999px;
    text-decoration: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
    transition:
        transform 0.15s ease,
        box-shadow 0.15s ease,
        background 0.15s ease,
        filter 0.15s ease;

    &:hover {
        filter: brightness(1.05);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);
        transform: translateY(-1px);
    }

    &:focus-visible {
        outline: 2px solid var(--richpod-focus-color, #3b82f6);
        outline-offset: 2px;
    }

    @container player (min-width: #{theme.$richpod-desktop-breakpoint}) {
        padding: 0.75em 1.4em;
    }
}

.markdown-link-icon {
    flex-shrink: 0;
    width: 1em;
    height: 1em;
    opacity: 0.95;
}
</style>
