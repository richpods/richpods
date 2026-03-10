import { computed, shallowRef, watch } from "vue";
import { Editor, type Content, type JSONContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { renderToMarkdown } from "@tiptap/static-renderer/pm/markdown";
import MarkdownIt from "markdown-it";
import { storeToRefs } from "pinia";
import { useRichPodStore } from "@/stores/useRichPodStore";

const extensions = [
    StarterKit.configure({
        heading: {
            levels: [1, 2, 3],
        },
    }),
    Underline,
    Link.configure({
        openOnClick: false,
        HTMLAttributes: {
            target: "_blank",
            rel: "noopener noreferrer ugc",
        },
    }),
    Image.configure({
        allowBase64: false,
        HTMLAttributes: {
            loading: "lazy",
        },
    }),
];

const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
});

type MarkdownEditorLike = {
    getJSON: () => JSONContent;
    getText: () => string;
};

function sanitizeMarkdown(markdown: string): string {
    if (!markdown) return "";

    const codeBlocks: string[] = [];
    const inlineCodes: string[] = [];

    let sanitized = markdown
        .replace(/```[\s\S]*?```/g, (match) => {
            const token = `__CODE_BLOCK_${codeBlocks.length}__`;
            codeBlocks.push(match);
            return token;
        })
        .replace(/`[^`]*`/g, (match) => {
            const token = `__INLINE_CODE_${inlineCodes.length}__`;
            inlineCodes.push(match);
            return token;
        })
        .replace(/<\s*\/??\s*[a-zA-Z!][^>]*>/g, "");

    codeBlocks.forEach((block, index) => {
        sanitized = sanitized.replace(`__CODE_BLOCK_${index}__`, block);
    });
    inlineCodes.forEach((code, index) => {
        sanitized = sanitized.replace(`__INLINE_CODE_${index}__`, code);
    });

    return sanitized;
}

export function useFactboxTipTapEditor() {
    const richpodStore = useRichPodStore();
    const { currentChapter } = storeToRefs(richpodStore);
    const isFactbox = computed(
        () => currentChapter.value?.enclosure.__typename === "Factbox"
    );
    const editor = shallowRef<Editor | null>(null);

    const editorToMarkdown = (editorInstance: MarkdownEditorLike): string => {
        try {
            const content = editorInstance.getJSON();
            return renderToMarkdown({
                extensions,
                content,
            });
        } catch (error) {
            console.error("Error converting editor to markdown:", error);
            return editorInstance.getText();
        }
    };

    const markdownToHtml = (markdown: string): string => md.render(markdown);

    const initializeEditor = (initialMarkdown: string) => {
        if (editor.value) {
            editor.value.destroy();
        }

        const htmlContent = markdownToHtml(initialMarkdown);

        editor.value = new Editor({
            content: htmlContent,
            extensions,
            editorProps: {
                attributes: {
                    "data-placeholder": "Enter factbox content with Markdown formatting...",
                },
            },
            onUpdate: ({ editor: editorInstance }) => {
                const markdown = editorToMarkdown(editorInstance);
                const sanitized = sanitizeMarkdown(markdown);

                const chapterValue = currentChapter.value;
                if (!chapterValue || chapterValue.enclosure.__typename !== "Factbox") {
                    return;
                }

                const currentText =
                    typeof chapterValue.enclosure.text === "string"
                        ? chapterValue.enclosure.text
                        : "";

                if (currentText === sanitized) {
                    return;
                }

                richpodStore.updateCurrentChapter((chapter) => {
                    if (chapter.enclosure.__typename !== "Factbox") {
                        return chapter;
                    }
                    return {
                        ...chapter,
                        enclosure: {
                            ...chapter.enclosure,
                            text: sanitized,
                        },
                    };
                });
            },
        });
    };

    const setContent = (markdown: string) => {
        if (editor.value) {
            const htmlContent = markdownToHtml(markdown);
            editor.value.commands.setContent(htmlContent as Content);
        }
    };

    watch(
        [currentChapter, isFactbox],
        ([chapterValue, factboxEnabled]) => {
            if (!factboxEnabled || !chapterValue) {
                if (editor.value) {
                    editor.value.destroy();
                    editor.value = null;
                }
                return;
            }

            const text =
                typeof chapterValue.enclosure.text === "string"
                    ? chapterValue.enclosure.text
                    : "";

            if (!editor.value) {
                initializeEditor(text);
            } else {
                const currentMarkdown = editorToMarkdown(editor.value);
                if (currentMarkdown !== text) {
                    const htmlContent = markdownToHtml(text);
                    editor.value.commands.setContent(htmlContent as Content);
                }
            }
        },
        { immediate: true }
    );

    const onDestroy = () => {
        if (editor.value) {
            editor.value.destroy();
            editor.value = null;
        }
    };

    return {
        editor,
        setContent,
        onDestroy,
    } as const;
}
