import { computed, shallowRef, watch } from "vue";
import { Editor, type Content, type JSONContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { renderToMarkdown } from "@tiptap/static-renderer/pm/markdown";
import MarkdownIt from "markdown-it";
import { storeToRefs } from "pinia";
import { useRichPodStore } from "@/stores/useRichPodStore";

const extensions = [
    StarterKit.configure({
        heading: {
            levels: [1, 2, 3, 4, 5, 6],
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
    Table.configure({
        resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
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

export function useTipTapEditor() {
    const richpodStore = useRichPodStore();
    const { currentChapter } = storeToRefs(richpodStore);
    const isMarkdown = computed(() => currentChapter.value?.enclosure.__typename === "Markdown");
    const editor = shallowRef<Editor | null>(null);

    const editorToMarkdown = (editorInstance: MarkdownEditorLike): string => {
        try {
            const content = editorInstance.getJSON();
            let markdown = renderToMarkdown({
                extensions,
                content,
            });
            // Fix: TipTap's round-trip (markdown → HTML → markdown) adds a trailing
            // newline to code blocks on each conversion. Collapse multiple newlines
            // before closing fences (``` not followed by a language identifier).
            markdown = markdown.replace(/\n{2,}(```(?!\w))/g, "\n$1");
            return markdown;
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
                    "data-placeholder": "Start writing your markdown content...",
                },
            },
            onUpdate: ({ editor: editorInstance }) => {
                const markdown = editorToMarkdown(editorInstance);

                const chapterValue = currentChapter.value;
                if (!chapterValue || chapterValue.enclosure.__typename !== "Markdown") {
                    return;
                }

                const currentText =
                    typeof chapterValue.enclosure.text === "string"
                        ? chapterValue.enclosure.text
                        : "";

                if (currentText === markdown) {
                    return;
                }

                richpodStore.updateCurrentChapter((chapter) => {
                    if (chapter.enclosure.__typename !== "Markdown") {
                        return chapter;
                    }
                    return {
                        ...chapter,
                        enclosure: {
                            ...chapter.enclosure,
                            text: markdown,
                        },
                    };
                });
            },
        });
    };

    watch(
        [currentChapter, isMarkdown],
        ([chapterValue, markdownEnabled]) => {
            if (!markdownEnabled || !chapterValue) {
                if (editor.value) {
                    editor.value.destroy();
                    editor.value = null;
                }
                return;
            }

            const text =
                typeof chapterValue.enclosure.text === "string" ? chapterValue.enclosure.text : "";

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
        { immediate: true },
    );

    const getMarkdown = (): string => {
        if (!editor.value) return "";
        return editorToMarkdown(editor.value);
    };

    const setMarkdownContent = (markdown: string) => {
        if (!editor.value) return;
        const htmlContent = markdownToHtml(markdown);
        editor.value.commands.setContent(htmlContent as Content);
    };

    const onDestroy = () => {
        if (editor.value) {
            editor.value.destroy();
            editor.value = null;
        }
    };

    return {
        editor,
        getMarkdown,
        setMarkdownContent,
        onDestroy,
    } as const;
}
