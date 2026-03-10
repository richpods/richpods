<template>
    <modal-dialog :aria-labelledby="headingId" ref="dialog">
        <h1 :id="headingId" class="title">{{ t("chapterDialog.title") }}</h1>
        <div class="chapter-list">
            <button @click="seekTo(chapter.beginSeconds)" v-for="(chapter, index) of sortedChapters" :key="index + chapterKey(chapter)">
                <span class="chapter-title">
                    <span class="visually-hidden">{{ t("chapterDialog.chapterN", { n: index + 1 }) }}</span>
                    {{ getChapterTitle(chapter) }}
                </span>
                <span class="chapter-offset">
                    {{ formatTime(chapter.beginSeconds) }}
                </span>
            </button>
        </div>
    </modal-dialog>
</template>
<script setup lang="ts">
import { useTemplateRef, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { Chapter, Poll } from "../graphql/generated.ts";
import type { SortedChapter } from "../types/player.ts";
import { chapterKey, sortedChapters as buildSortedChapters } from "../utils.ts";
import { useAudio } from "../composables/useAudio.ts";
import { usePollTitles } from "../composables/usePollTitles.ts";
import ModalDialog from "./ModalDialog.vue";

const { t } = useI18n();
const dialog = useTemplateRef("dialog");
const headingId = `dialog-heading-${Math.floor(Math.random() * 100)}`;

const props = defineProps<{
    chapters: Chapter[];
}>();

const allSortedChapters = computed(() => buildSortedChapters(props.chapters || []));

// Filter out invisible Card chapters from the chapter list
const sortedChapters = computed(() =>
    allSortedChapters.value.filter((ch) => {
        if (ch.enclosure.__typename === "Card") {
            return (ch.enclosure as { visibleAsChapter?: boolean }).visibleAsChapter !== false;
        }
        return true;
    }),
);

const { audioElement } = useAudio();
const { loadPollTitle, getPollTitle } = usePollTitles();

function isPollEnclosure(enclosure: SortedChapter["enclosure"]): enclosure is Poll {
    return enclosure.__typename === "Poll";
}

function getChapterTitle(chapter: SortedChapter): string {
    if (isPollEnclosure(chapter.enclosure)) {
        const pollTitle = getPollTitle(chapter.enclosure.coloeus.endpoint, chapter.enclosure.coloeus.pollId);
        return pollTitle ?? t("common.ellipsis");
    }
    return (chapter.enclosure as { title: string }).title;
}

watch(
    sortedChapters,
    (chapters) => {
        for (const chapter of chapters) {
            if (isPollEnclosure(chapter.enclosure)) {
                loadPollTitle(chapter.enclosure.coloeus.endpoint, chapter.enclosure.coloeus.pollId);
            }
        }
    },
    { immediate: true },
);

function seekTo(seconds: number) {
    if (audioElement.value) {
        audioElement.value.currentTime = seconds;
        dialog.value?.close();
    }
}

function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (n: number) => n.toString().padStart(2, "0");
    if (h > 0) {
        return `${h}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
}

function toggle() {
    dialog.value?.toggle();
}

defineExpose({
    toggle,
});
</script>
<style scoped lang="scss">
@use "../assets/mixins.scss" as mixins;

.modal-dialog {
    &::backdrop {
        background-color: var(--richpod-overlay-backdrop);
        backdrop-filter: blur(2px);
    }

    background: var(--richpod-overlay-background-color);
    border: none;
    border-radius: 11px;
    box-shadow: 0 3px 6px #00000029;

    .title {
        @include mixins.visually-hidden();
    }

    .close-button {
        appearance: none;
        position: absolute;
        top: 4px;
        right: 4px;
        background-color: transparent;
        background-image: url("../assets/images/icon_close.svg");
        background-size: contain;
        width: 22px;
        height: 22px;
        border: none;
        text-indent: -9999rem;
    }

    .chapter-list {
        padding-top: 12px;

        button {
            appearance: none;
            border: none;
            background-color: var(--richpod-chapter-background);
            color: var(--richpod-chapter-color);
            display: grid;
            grid-template-columns: 1fr 8ch;
            width: 100%;
            text-align: left;

            border-radius: 13px;
            min-height: 36px;
            padding: 10px;

            font-family: var(--richpod-font-family-text), sans-serif;
            font-weight: normal;
            font-size: 14px;
            line-height: 18px;
        }

        .chapter-offset {
            text-align: right;
        }

        button + button {
            margin-top: 10px;
        }
    }
}
</style>
