<template>
    <div class="markdown-enclosure">
        <enclosure-header :enclosure="enclosure" />
        <div class="markdown-html" v-html="parsedHtml"></div>
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

// Enforce anti-spam attributes on all links, including raw HTML links in markdown
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
    { immediate: true }
);
</script>
<style lang="scss">
.markdown-html {
    display: block;
    padding: 0 12px 12px 12px;

    font-size: 1rem;
    font-family: var(--richpod-font-family-text), "sans-serif";

    h1, h2 {
        font-size: 20px;
        margin: 0;
    }

    h3, h4, h5, h6 {
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
</style>
