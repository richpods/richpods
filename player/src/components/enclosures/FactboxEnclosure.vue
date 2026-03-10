<template>
    <div class="factbox-enclosure">
        <EnclosureHeader :enclosure="enclosure" />
        <div class="factbox-content">
            <div class="factbox-text" v-html="parsedHtml"></div>
            <div v-if="enclosure.links && enclosure.links.length > 0" class="factbox-links">
                <a
                    v-for="(link, index) in enclosure.links"
                    :key="index"
                    :href="link.url"
                    target="_blank"
                    rel="noopener noreferrer ugc"
                    class="factbox-link"
                >
                    <span class="factbox-link-label">{{ link.label }}</span>
                    <svg
                        class="factbox-link-icon"
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
import type { Factbox } from "@/graphql/generated.ts";
import { ref, watch } from "vue";
import { Renderer, marked } from "marked";
import type { Tokens } from "marked";
import DOMPurify from "dompurify";
import EnclosureHeader from "./EnclosureHeader.vue";

const props = defineProps<{
    enclosure: Factbox;
}>();

const parsedHtml = ref("");

// Offset heading levels so they don't conflict with the title
const headingOffset = props.enclosure.title !== "" ? 2 : 1;
const renderer = {
    heading({ tokens, depth }: Tokens.Heading) {
        const level = depth + headingOffset;
        return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>\n`;
    },
    link({ href, title, tokens }: Tokens.Link) {
        const text = this.parser.parseInline(tokens);
        const titleAttr = title ? ` title="${title}"` : "";
        return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer ugc">${text}</a>`;
    },
} as Renderer;

marked.use({
    async: true,
    renderer,
});

watch(
    () => props.enclosure.text,
    async (newText) => {
        const rawHtml = await marked.parse(newText);
        parsedHtml.value = DOMPurify.sanitize(rawHtml);
    },
    { immediate: true }
);
</script>

<style lang="scss">
.factbox-enclosure {
    display: flex;
    flex-direction: column;
}

.factbox-content {
    padding: 0 12px 12px 12px;
}

.factbox-text {
    display: block;
    font-size: 0.9375rem;
    font-family: var(--richpod-font-family-text), "sans-serif";
    line-height: 1.6;

    h3,
    h4,
    h5,
    h6 {
        font-size: 1rem;
        font-weight: 600;
        margin: 1rem 0 0.5rem 0;

        &:first-child {
            margin-top: 0;
        }
    }

    p {
        margin: 0.5rem 0;

        &:first-child {
            margin-top: 0;
        }
    }

    ul,
    ol {
        margin: 0.5rem 0;
        padding-left: 1.25rem;

        li {
            margin: 0.25rem 0;
            padding: 0;
        }
    }

    strong {
        font-weight: 600;
    }

    a {
        color: var(--richpod-link-color, #2563eb);
        text-decoration: underline;
        text-underline-offset: 2px;

        &:hover {
            color: var(--richpod-link-hover-color, #1d4ed8);
        }
    }
}

.factbox-links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--richpod-border-color, #e5e7eb);
}

.factbox-link {
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

.factbox-link-icon {
    flex-shrink: 0;
    opacity: 0.6;
}
</style>
