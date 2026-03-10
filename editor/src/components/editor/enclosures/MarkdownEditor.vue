<template>
    <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">{{ t("markdownEditor.contentLabel") }}</label>
        <div class="tiptap-editor-container">
            <div v-if="editor" class="editor-toolbar" :class="{ 'raw-mode': rawMode }">
                <div class="toolbar-group">
                    <button
                        @click="editor.chain().focus().toggleBold().run()"
                        :disabled="!editor.can().chain().focus().toggleBold().run()"
                        :class="{ 'is-active': editor.isActive('bold') }"
                        class="toolbar-button"
                        type="button"
                        :aria-label="t('markdownEditor.bold')"
                        :title="t('markdownEditor.bold')"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/>
                        </svg>
                    </button>
                    <button
                        @click="editor.chain().focus().toggleItalic().run()"
                        :disabled="!editor.can().chain().focus().toggleItalic().run()"
                        :class="{ 'is-active': editor.isActive('italic') }"
                        class="toolbar-button"
                        type="button"
                        :aria-label="t('markdownEditor.italic')"
                        :title="t('markdownEditor.italic')"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/>
                        </svg>
                    </button>
                    <button
                        @click="editor.chain().focus().toggleStrike().run()"
                        :disabled="!editor.can().chain().focus().toggleStrike().run()"
                        :class="{ 'is-active': editor.isActive('strike') }"
                        class="toolbar-button"
                        type="button"
                        :aria-label="t('markdownEditor.strikethrough')"
                        :title="t('markdownEditor.strikethrough')"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/>
                        </svg>
                    </button>
                    <button
                        @click="editor.chain().focus().toggleCode().run()"
                        :disabled="!editor.can().chain().focus().toggleCode().run()"
                        :class="{ 'is-active': editor.isActive('code') }"
                        class="toolbar-button"
                        type="button"
                        :aria-label="t('markdownEditor.code')"
                        :title="t('markdownEditor.code')"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
                        </svg>
                    </button>
                </div>

                <div class="toolbar-divider"></div>

                <div class="toolbar-group">
                    <button
                        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
                        :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
                        class="toolbar-button"
                        type="button"
                        :aria-label="t('markdownEditor.heading1')"
                        :title="t('markdownEditor.heading1')"
                    >
                        H1
                    </button>
                    <button
                        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
                        :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
                        class="toolbar-button"
                        type="button"
                        :aria-label="t('markdownEditor.heading2')"
                        :title="t('markdownEditor.heading2')"
                    >
                        H2
                    </button>
                    <button
                        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
                        :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
                        class="toolbar-button"
                        type="button"
                        :aria-label="t('markdownEditor.heading3')"
                        :title="t('markdownEditor.heading3')"
                    >
                        H3
                    </button>
                </div>

                <div class="toolbar-divider"></div>

                <div class="toolbar-group">
                    <button
                        @click="editor.chain().focus().toggleBulletList().run()"
                        :class="{ 'is-active': editor.isActive('bulletList') }"
                        class="toolbar-button"
                        type="button"
                        :aria-label="t('markdownEditor.bulletList')"
                        :title="t('markdownEditor.bulletList')"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M7 5h14v2H7V5zm0 8v-2h14v2H7zm0 6v-2h14v2H7zM4 5c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1zm0 6c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1zm0 6c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1z"/>
                        </svg>
                    </button>
                    <button
                        @click="editor.chain().focus().toggleOrderedList().run()"
                        :class="{ 'is-active': editor.isActive('orderedList') }"
                        class="toolbar-button"
                        type="button"
                        :aria-label="t('markdownEditor.orderedList')"
                        :title="t('markdownEditor.orderedList')"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/>
                        </svg>
                    </button>
                    <button
                        @click="editor.chain().focus().toggleBlockquote().run()"
                        :class="{ 'is-active': editor.isActive('blockquote') }"
                        class="toolbar-button"
                        type="button"
                        :aria-label="t('markdownEditor.quote')"
                        :title="t('markdownEditor.quote')"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
                        </svg>
                    </button>
                    <button
                        @click="editor.chain().focus().toggleCodeBlock().run()"
                        :class="{ 'is-active': editor.isActive('codeBlock') }"
                        class="toolbar-button"
                        type="button"
                        :aria-label="t('markdownEditor.codeBlock')"
                        :title="t('markdownEditor.codeBlock')"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M3 3h18v18H3V3zm16 16V8h-6v11h6zm-8 0v-5H5v5h6zm0-7V5H5v7h6z"/>
                        </svg>
                    </button>
                </div>

                <div class="toolbar-divider"></div>

                <div class="toolbar-group">
                    <button
                        @click="setLink"
                        :class="{ 'is-active': editor.isActive('link') }"
                        class="toolbar-button"
                        type="button"
                        :aria-label="t('markdownEditor.addLink')"
                        :title="t('markdownEditor.addLink')"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                        </svg>
                    </button>
                    <button
                        @click="addImage"
                        class="toolbar-button"
                        type="button"
                        :aria-label="t('markdownEditor.addImage')"
                        :title="t('markdownEditor.addImage')"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                        </svg>
                    </button>
                </div>

                <div class="toolbar-spacer"></div>

                <div class="toolbar-group raw-mode-group">
                    <button
                        @click="toggleRawMode"
                        :class="{ 'is-active': rawMode }"
                        class="toolbar-button"
                        type="button"
                        :aria-label="t('markdownEditor.toggleRawMode')"
                        :title="t('markdownEditor.toggleRawMode')"
                    >
                        Md
                    </button>
                </div>

                <div class="toolbar-group">
                    <button
                        @click="editor.chain().focus().undo().run()"
                        :disabled="!editor.can().chain().focus().undo().run()"
                        class="toolbar-button"
                        type="button"
                        :aria-label="t('markdownEditor.undo')"
                        :title="t('markdownEditor.undo')"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
                        </svg>
                    </button>
                    <button
                        @click="editor.chain().focus().redo().run()"
                        :disabled="!editor.can().chain().focus().redo().run()"
                        class="toolbar-button"
                        type="button"
                        :aria-label="t('markdownEditor.redo')"
                        :title="t('markdownEditor.redo')"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <EditorContent
                v-if="editor"
                v-show="!rawMode"
                :editor="editor"
                class="tiptap-editor"
                role="textbox"
                aria-multiline="true"
                :aria-label="t('markdownEditor.contentAriaLabel')"
            />
            <textarea
                v-show="rawMode"
                v-model="rawMarkdown"
                class="raw-markdown-textarea text-sm font-mono"
                :aria-label="t('markdownEditor.rawMarkdownAriaLabel')"
                @input="debouncedValidation"
            ></textarea>
        </div>
        <div class="sr-only" aria-live="polite" aria-atomic="true">
            {{ screenReaderAnnouncement }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { EditorContent } from "@tiptap/vue-3";
import { useTipTapEditor } from "@/composables/useTipTapEditor";
import { useValidation } from "@/composables/useValidation";

const { t } = useI18n();
const { runValidation } = useValidation();
const screenReaderAnnouncement = ref("");

const rawMode = ref(false);
const rawMarkdown = ref("");

const { editor, getMarkdown, setMarkdownContent, onDestroy } = useTipTapEditor();

let validationTimer: ReturnType<typeof setTimeout> | undefined;

const debouncedValidation = () => {
    clearTimeout(validationTimer);
    validationTimer = setTimeout(() => {
        runValidation();
    }, 500);
};

watch(
    editor,
    (newEditor) => {
        if (newEditor) {
            newEditor.on("update", debouncedValidation);
        }
    },
    { immediate: true }
);

const announceToScreenReader = (message: string) => {
    screenReaderAnnouncement.value = "";
    setTimeout(() => {
        screenReaderAnnouncement.value = message;
    }, 100);
};

const setLink = () => {
    if (!editor.value) return;

    const previousUrl = editor.value.getAttributes("link").href;
    const url = window.prompt(t("markdownEditor.urlPrompt"), previousUrl);

    if (url === null) return;

    if (url === "") {
        editor.value.chain().focus().extendMarkRange("link").unsetLink().run();
        announceToScreenReader(t("markdownEditor.linkRemoved"));
        return;
    }

    editor.value.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    announceToScreenReader(t("markdownEditor.linkAdded"));
};

const toggleRawMode = () => {
    if (!editor.value) return;

    if (!rawMode.value) {
        rawMarkdown.value = getMarkdown();
        rawMode.value = true;
        announceToScreenReader(t("markdownEditor.switchedToRawMode"));
    } else {
        setMarkdownContent(rawMarkdown.value);
        rawMode.value = false;
        announceToScreenReader(t("markdownEditor.switchedToWysiwygMode"));
    }
};

const addImage = () => {
    if (!editor.value) return;

    const url = window.prompt(t("markdownEditor.imageUrlPrompt"));
    if (url) {
        editor.value.chain().focus().setImage({ src: url }).run();
        announceToScreenReader(t("markdownEditor.imageAdded"));
    }
};

onBeforeUnmount(() => {
    clearTimeout(validationTimer);
    onDestroy();
});
</script>

<style lang="scss" scoped>
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
}

.tiptap-editor-container {
    position: relative;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    background: white;
    overflow: hidden;
}

.editor-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem;
    border-bottom: 1px solid #e5e7eb;
    background: #fafafa;
}

.toolbar-group {
    display: flex;
    gap: 0.125rem;
}

.toolbar-divider {
    width: 1px;
    height: 1.5rem;
    background: #d1d5db;
    margin: 0 0.125rem;
}

.toolbar-spacer {
    flex: 1;
}

.editor-toolbar.raw-mode .toolbar-group:not(.raw-mode-group) .toolbar-button {
    opacity: 0.4;
    pointer-events: none;
}

.raw-markdown-textarea {
    width: 100%;
    min-height: 16rem;
    padding: 1rem;
    border: none;
    outline: none;
    resize: vertical;
    line-height: 1.6;
    color: #1f2937;
    background: white;
}

.toolbar-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: #4b5563;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        background: #e5e7eb;
        color: #111827;
    }

    &:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 1px;
    }

    &.is-active {
        background: #dbeafe;
        color: #1e40af;

        &:hover:not(:disabled) {
            background: #bfdbfe;
        }
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    svg {
        width: 18px;
        height: 18px;
    }
}

.tiptap-editor {
    padding: 1rem;
    min-height: 16rem;
    display: flex;
    flex-direction: column;
    cursor: text;

    :deep(.tiptap) {
        flex: 1;
        outline: none;
        font-size: 1rem;
        line-height: 1.6;

        > * + * {
            margin-top: 0.75em;
        }

        p.is-editor-empty:first-child::before {
            color: #9ca3af;
            content: attr(data-placeholder);
            float: left;
            height: 0;
            pointer-events: none;
        }

        h1, h2, h3, h4, h5, h6 {
            line-height: 1.2;
            margin-top: 1.25rem;
            margin-bottom: 0.5rem;
            text-wrap: pretty;
        }

        h1, h2 {
            margin-top: 1.5rem;
        }

        h1 {
            font-size: 1.4rem;
            font-weight: 700;
        }

        h2 {
            font-size: 1.2rem;
            font-weight: 600;
        }

        h3 {
            font-size: 1.1rem;
            font-weight: 600;
        }

        ul, ol {
            padding: 0 1rem;
            margin: 1.25rem 1rem 1.25rem 0.4rem;

            li {
                display: list-item;

                p {
                    margin-top: 0.25em;
                    margin-bottom: 0.25em;
                }
            }
        }

        ul {
            list-style-type: disc;
        }

        ol {
            list-style-type: decimal;
        }

        blockquote {
            padding-left: 1rem;
            border-left: 3px solid #e5e7eb;
            font-style: italic;
            margin: 1.5rem 0;
            color: #6b7280;
        }

        code {
            background-color: #f3f4f6;
            border-radius: 0.25rem;
            color: #1f2937;
            font-family: 'JetBrains Mono', 'SF Mono', Monaco, Consolas, monospace;
            font-size: 0.85rem;
            padding: 0.125rem 0.25rem;
        }

        pre {
            background: #1e293b;
            border-radius: 0.5rem;
            color: #f1f5f9;
            font-family: 'JetBrains Mono', 'SF Mono', Monaco, Consolas, monospace;
            margin: 1.5rem 0;
            padding: 0.75rem 1rem;
            overflow-x: auto;

            code {
                background: none;
                color: inherit;
                font-size: 0.8rem;
                padding: 0;
            }
        }

        img {
            max-width: 100%;
            height: auto;
            border-radius: 0.5rem;
            margin: 1.5rem 0;
        }

        hr {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 2rem 0;
        }

        a {
            color: #2563eb;
            cursor: pointer;
            text-decoration: underline;
            text-decoration-color: #93c5fd;
            text-underline-offset: 3px;
            transition: all 0.2s;

            &:hover {
                color: #1d4ed8;
                text-decoration-color: #60a5fa;
            }
        }
    }
}
</style>
