<template>
    <div class="seek-bar-holder" :class="{ 'seeking-disabled': disableSeeking }" ref="seekBarHolder">
        <div class="seek-bar" @click="seekBarClick">
            <div class="progress" ref="progress"></div>
        </div>
        <div class="chapters" v-if="isDurationReady">
            <template v-for="(chapter, index) of sortedChapters" :key="index + chapterKey(chapter)">
                <button class="chapter-nibble"
                        :class="['chapter-nibble', nibbleState(chapter), { 'nibble-invisible': isInvisibleCard(chapter) }]"
                        @click="seekTo(chapter.beginSeconds)"
                        :style="{ '--nibble-left-offset': `max(0%, calc(${chapter.beginSeconds / duration * 100}% - (var(--richpod-chapter-nibble-size) / 2)))` }"
                >
                    <span class="chapter-nibble-label">
                        {{ index + 1 }}. Kapitel: {{ getChapterTitle(chapter) }}
                    </span>
                </button>
            </template>
        </div>
    </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch, computed } from "vue";
import type { Chapter, Poll } from "../graphql/generated.ts";
import { chapterKey, sortedChapters as buildSortedChapters, currentChapterIndex as findCurrentChapterIndex } from "../utils.ts";
import type { SortedChapter } from "../types/player.ts";
import { usePollTitles } from "../composables/usePollTitles.ts";

const seekBarHolderRef = useTemplateRef<HTMLDivElement>("seekBarHolder");

const props = defineProps<{
    audioElement: HTMLAudioElement;
    chapters: Chapter[];
    paused: boolean;
    disableSeeking?: boolean;
    showInvisibleChapters?: boolean;
}>();

const allSortedChapters = computed<SortedChapter[]>(() => buildSortedChapters(props.chapters || []));

function isInvisibleCard(ch: SortedChapter): boolean {
    return ch.enclosure.__typename === "Card"
        && (ch.enclosure as { visibleAsChapter?: boolean }).visibleAsChapter === false;
}

// In player mode, filter out invisible cards; in editor mode show all
const sortedChapters = computed<SortedChapter[]>(() =>
    props.showInvisibleChapters
        ? allSortedChapters.value
        : allSortedChapters.value.filter((ch) => !isInvisibleCard(ch)),
);

const { loadPollTitle, getPollTitle } = usePollTitles();

function isPollEnclosure(enclosure: SortedChapter["enclosure"]): enclosure is Poll {
    return enclosure.__typename === "Poll";
}

function getChapterTitle(chapter: SortedChapter): string {
    if (isPollEnclosure(chapter.enclosure)) {
        return getPollTitle(chapter.enclosure.coloeus.endpoint, chapter.enclosure.coloeus.pollId) ?? "...";
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

const duration = ref(props.audioElement.duration);
const currentTime = ref(props.audioElement.currentTime);
const isDurationReady = computed(() => Number.isFinite(duration.value) && duration.value > 0);

const handleDurationUpdate = () => {
    if (isFinite(props.audioElement.duration)) {
        duration.value = props.audioElement.duration;
    }
};

const handleTimeUpdate = () => {
    handleDurationUpdate();
    currentTime.value = props.audioElement.currentTime;
    updateSeekBarStyles();
};

props.audioElement.addEventListener("canplay", handleDurationUpdate);
props.audioElement.addEventListener("loadedmetadata", handleDurationUpdate);
props.audioElement.addEventListener("durationchange", handleDurationUpdate);
props.audioElement.addEventListener("timeupdate", handleTimeUpdate);

const remainingSeconds = () => {
    return Math.max(duration.value - currentTime.value, 0);
};

let animationFrameId: number;
function updateSeekBarStyles() {
    const seekBarHolder = seekBarHolderRef.value;

    if (seekBarHolder) {
        // ensures the most recent value is available for calulations
        currentTime.value = props.audioElement.currentTime;

        if (!isDurationReady.value) {
            seekBarHolder.style.setProperty("--seek-bar-progress-percentage", "0%");
            seekBarHolder.style.setProperty("--seek-bar-remaining-seconds", "0s");
            seekBarHolder.setAttribute("data-remaining-short", "false");
        } else {
            seekBarHolder.style.setProperty(
                "--seek-bar-remaining-seconds",
                `${remainingSeconds()}s`
            );

            seekBarHolder.style.setProperty(
                "--seek-bar-progress-percentage",
                `${currentTime.value / duration.value * 100}%`
            );

            seekBarHolder.setAttribute(
                "data-remaining-short",
                (remainingSeconds() <= 0.26).toString()
            );
        }
    }

    if (!props.paused) {
        animationFrameId = requestAnimationFrame(updateSeekBarStyles);
    }
}

function seekBarClick(event: MouseEvent) {
    if (!isDurationReady.value || props.disableSeeking) {
        return;
    }
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percent = clickX / rect.width;

    // eslint-disable-next-line vue/no-mutating-props
    props.audioElement.currentTime = percent * duration.value;

    updateSeekBarStyles();
}

function seekTo(seconds: number) {
    if (!isDurationReady.value || props.disableSeeking) {
        return;
    }
    // eslint-disable-next-line vue/no-mutating-props
    props.audioElement.currentTime = seconds;
    updateSeekBarStyles();
}

const activeChapterIndex = computed(() => findCurrentChapterIndex(sortedChapters.value, currentTime.value));

function nibbleState(chapter: SortedChapter): string {
    const chapters = sortedChapters.value;
    if (!chapters.length) return "upcoming";
    const idx = chapters.findIndex((c) => c.beginSeconds === chapter.beginSeconds);
    const activeIdx = activeChapterIndex.value;
    if (idx === activeIdx) return "active";
    if (idx !== -1 && activeIdx !== -1 && idx < activeIdx) return "past";
    return "upcoming";
}

watch(() => props.paused, (isPaused) => {
    if (!isPaused) {
        animationFrameId = requestAnimationFrame(updateSeekBarStyles);
    } else if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
});

onMounted(() => {
    animationFrameId = requestAnimationFrame(updateSeekBarStyles);
});

onBeforeUnmount(() => {
    cancelAnimationFrame(animationFrameId);
    props.audioElement.removeEventListener("canplay", handleDurationUpdate);
    props.audioElement.removeEventListener("loadedmetadata", handleDurationUpdate);
    props.audioElement.removeEventListener("durationchange", handleDurationUpdate);
    props.audioElement.removeEventListener("timeupdate", handleTimeUpdate);
});

</script>
<style scoped lang="scss">
@use "../assets/mixins.scss" as mixins;

.seek-bar-holder {
    width: 100%;
    position: relative;
}

.seek-bar {
    $height: var(--richpod-seek-bar-height);

    width: 100%;
    height: $height;
    background-color: var(--richpod-seek-bar-color);
    position: relative;

    .progress {
        position: absolute;
        height: $height;
        width: var(--seek-bar-progress-percentage, 0);
        background-color: var(--richpod-seek-bar-progress-color);
        border-radius: 0 calc($height / 2) calc($height / 2) 0;
        transition: border-radius 0.25s ease-in-out;
    }
}

.seek-bar-holder[data-remaining-short="true"] .progress {
    border-radius: 0;
}

.chapters {
    width: 100%;
    position: absolute;
    top: 0;
}

.chapter-nibble {
    appearance: none;
    position: absolute;
    left: var(--nibble-left-offset);
    top: calc((-1 * var(--richpod-chapter-nibble-size) / 2) + (var(--richpod-seek-bar-height) / 2));
    border: var(--richpod-chapter-nibble-border-width) solid var(--richpod-chapter-nibble-past);
    background: var(--richpod-chapter-nibble-upcoming);
    width: var(--richpod-chapter-nibble-size);
    height: var(--richpod-chapter-nibble-size);
    border-radius: var(--richpod-chapter-nibble-size);

    &.past {
        border-color: var(--richpod-chapter-nibble-upcoming);
        background: var(--richpod-chapter-nibble-past);
    }

    &.active {
        background: var(--richpod-chapter-nibble-current);
    }

    &.nibble-invisible {
        opacity: 0.5;
        border-style: dashed;
        border-color: var(--richpod-controls-background-color);
    }

    .chapter-nibble-label {
        @include mixins.visually-hidden();
    }
}

.seek-bar-holder.seeking-disabled {
    .seek-bar {
        cursor: not-allowed;
        background-color: var(--richpod-seek-bar-color-disabled);
        .progress {
            background-color: var(--richpod-seek-bar-progress-color-disabled);
        }
    }

    .chapter-nibble {
        cursor: not-allowed;
        background: var(--richpod-chapter-nibble-upcoming-disabled);
        border-color: var(--richpod-chapter-nibble-past-disabled);
        &.past {
            border-color: var(--richpod-chapter-nibble-upcoming-disabled);
            background: var(--richpod-chapter-nibble-past-disabled);
        }
        &.active {
            background: var(--richpod-chapter-nibble-current-disabled);
        }
    }
}
</style>
