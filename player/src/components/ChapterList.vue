<template>
    <ul class="chapter-list" ref="list">
        <li
            v-for="(item, index) of items"
            :key="index + chapterKey(item.chapter)"
            :class="{
                active: index === activeIndex,
                past: activeIndex >= 0 && index < activeIndex,
                upcoming: activeIndex < 0 || index > activeIndex,
            }"
            :aria-current="index === activeIndex ? 'true' : undefined"
        >
            <button
                @click="emit('seek', item.chapter.beginSeconds)"
                :style="index === activeIndex ? { '--progress': item.progress } : undefined"
            >
                <span class="timeline-marker" aria-hidden="true"></span>
                <span class="chapter-title">
                    <span class="visually-hidden">{{
                        t("chapterDialog.chapterN", { n: index + 1 })
                    }}</span>
                    {{ getChapterTitle(item.chapter) }}
                </span>
                <span class="chapter-offset">
                    {{ formatTime(item.chapter.beginSeconds) }}
                </span>
                <span v-if="index === activeIndex" class="chapter-progress" aria-hidden="true">
                    <span class="chapter-progress-fill"></span>
                </span>
            </button>
        </li>
    </ul>
</template>
<script setup lang="ts">
import { computed, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { Chapter, Poll } from "../graphql/generated.ts";
import type { SortedChapter } from "../types/player.ts";
import {
    chapterKey,
    currentChapterIndex,
    sortedChapters as buildSortedChapters,
    visibleChapters,
} from "../utils.ts";
import { formatTime } from "@richpods/shared/utils/time";
import { usePollTitles } from "../composables/usePollTitles.ts";
import { useAudio } from "../composables/useAudio.ts";

const { t } = useI18n();

const props = defineProps<{
    chapters: Chapter[];
}>();

const emit = defineEmits<{
    seek: [seconds: number];
}>();

const { currentTime, mediaDuration } = useAudio();

const visibleSortedChapters = computed(() =>
    visibleChapters(buildSortedChapters(props.chapters || [])),
);

const activeIndex = computed(() =>
    currentChapterIndex(visibleSortedChapters.value, currentTime.value),
);

type ChapterItem = {
    chapter: SortedChapter;
    progress: number;
};

const items = computed<ChapterItem[]>(() => {
    const list = visibleSortedChapters.value;
    const active = activeIndex.value;
    return list.map((chapter, index) => {
        if (index !== active) {
            return { chapter, progress: 0 };
        }
        const next = list[index + 1];
        const end = next ? next.beginSeconds : mediaDuration.value || chapter.beginSeconds;
        const span = end - chapter.beginSeconds;
        const raw = span > 0 ? (currentTime.value - chapter.beginSeconds) / span : 0;
        const progress = Math.max(0, Math.min(1, raw));
        return { chapter, progress };
    });
});

const { loadPollTitle, getPollTitle } = usePollTitles();

function isPollEnclosure(enclosure: SortedChapter["enclosure"]): enclosure is Poll {
    return enclosure.__typename === "Poll";
}

function getChapterTitle(chapter: SortedChapter): string {
    if (isPollEnclosure(chapter.enclosure)) {
        const pollTitle = getPollTitle(
            chapter.enclosure.coloeus.endpoint,
            chapter.enclosure.coloeus.pollId,
        );
        return pollTitle ?? t("common.ellipsis");
    }
    return (chapter.enclosure as { title: string }).title;
}

watch(
    visibleSortedChapters,
    (chapters) => {
        for (const chapter of chapters) {
            if (isPollEnclosure(chapter.enclosure)) {
                loadPollTitle(chapter.enclosure.coloeus.endpoint, chapter.enclosure.coloeus.pollId);
            }
        }
    },
    { immediate: true },
);

const list = useTemplateRef("list");

function scrollActiveIntoView() {
    const active = list.value?.querySelector<HTMLLIElement>("li.active");
    active?.scrollIntoView({ block: "center", behavior: "auto" });
}

defineExpose({
    scrollActiveIntoView,
});
</script>
<style scoped lang="scss">
$dot-center: 18px;
$marker-size: 10px;
$line-width: 2px;
$dot-column-width: $dot-center * 2;

.chapter-list {
    list-style: none;
    padding: 0;
    margin: 0;
    position: relative;
    display: flex;
    flex-direction: column;
    color: var(--richpod-color);

    &::before {
        content: "";
        position: absolute;
        top: 18px;
        bottom: 18px;
        left: calc(#{$dot-center} - #{$line-width} / 2);
        width: $line-width;
        background: rgba(255, 255, 255, 0.18);
        border-radius: 1px;
    }

    li {
        position: relative;
    }

    button {
        appearance: none;
        border: 1px solid transparent;
        background-color: transparent;
        color: inherit;
        display: grid;
        grid-template-columns: $dot-column-width 1fr 6ch;
        align-items: center;
        width: 100%;
        text-align: left;
        position: relative;

        border-radius: 10px;
        min-height: 36px;
        padding: 10px 12px 10px 0;

        font-family: var(--richpod-font-family-text), sans-serif;
        font-weight: normal;
        font-size: 14px;
        line-height: 18px;
        cursor: pointer;
        transition:
            background-color 0.15s ease,
            border-color 0.15s ease;
    }

    .timeline-marker {
        justify-self: center;
        width: $marker-size;
        height: $marker-size;
        border-radius: 50%;
        border: var(--richpod-chapter-nibble-border-width) solid var(--richpod-chapter-nibble-past);
        background: var(--richpod-chapter-nibble-upcoming);
        box-shadow: 0 0 0 3px var(--richpod-background-color);
        transition:
            background-color 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease;
    }

    li.past .timeline-marker {
        border-color: var(--richpod-chapter-nibble-upcoming);
        background: var(--richpod-chapter-nibble-past);
    }

    .chapter-offset {
        text-align: right;
        opacity: 0.7;
        font-variant-numeric: tabular-nums;
    }

    .chapter-progress {
        position: absolute;
        left: 14px;
        right: 14px;
        bottom: 6px;
        height: 3px;
        background: color-mix(in srgb, var(--richpod-background-color) 35%, transparent);
        border-radius: 2px;
        overflow: hidden;
    }

    .chapter-progress-fill {
        display: block;
        width: 100%;
        height: 100%;
        background: var(--richpod-chapter-nibble-past);
        transform-origin: left center;
        transform: scaleX(var(--progress, 0));
        transition: transform 0.2s linear;
    }

    li.active button {
        background-color: var(--richpod-chapter-nibble-upcoming);
        border-color: color-mix(in srgb, var(--richpod-chapter-nibble-past) 60%, transparent);
        color: var(--richpod-chapter-nibble-past);
        box-shadow:
            0 6px 14px rgba(0, 0, 0, 0.4),
            0 1px 0 rgba(255, 255, 255, 0.08) inset;
        padding-bottom: 14px;

        .timeline-marker {
            background: var(--richpod-chapter-nibble-current);
            border-color: var(--richpod-chapter-nibble-past);
            box-shadow:
                0 0 0 3px color-mix(in srgb, var(--richpod-chapter-nibble-current) 30%, transparent),
                0 0 12px var(--richpod-chapter-nibble-current);
        }

        .chapter-offset {
            opacity: 1;
        }
    }

    @media (hover: hover) {
        li:not(.active) button:hover {
            background-color: rgba(255, 255, 255, 0.06);
        }
    }

    button:focus-visible {
        outline: 2px solid var(--richpod-chapter-nibble-current);
        outline-offset: -2px;
    }
}
</style>
