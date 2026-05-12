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
.markdown-enclosure {
    display: flex;
    flex-direction: column;
}

.markdown-content {
    padding: 0 12px 12px 12px;
}

.markdown-html {
    display: block;
    font-size: 1rem;
    font-family: var(--richpod-font-family-text), "sans-serif";

    h1,
    h2 {
        font-size: 20px;
        margin: 0;
    }

    h3,
    h4,
    h5,
    h6 {
        font-size: 16px;
        margin: 0;
    }

    ul {
        margin: 0;
        padding-left: 16px;

        li {
            margin: 0.5rem 0;
            padding: 0;
        }
    }
}

.markdown-links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--richpod-border-color, #e5e7eb);
}

.markdown-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--richpod-button-text-color, #374151);
    background: var(--richpod-button-bg-color, #f3f4f6);
    border: 1px solid var(--richpod-button-border-color, #d1d5db);
    border-radius: 6px;
    text-decoration: none;
    transition: all 0.15s ease;

    &:hover {
        background: var(--richpod-button-hover-bg-color, #e5e7eb);
        border-color: var(--richpod-button-hover-border-color, #9ca3af);
        color: var(--richpod-button-hover-text-color, #111827);
    }

    &:focus {
        outline: 2px solid var(--richpod-focus-color, #3b82f6);
        outline-offset: 2px;
    }
}

.markdown-link-icon {
    flex-shrink: 0;
    opacity: 0.6;
}
</style>
