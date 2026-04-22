<template>
    <div
        class="seek-bar-holder"
        :class="{
            'seeking-disabled': disableSeeking,
            'is-hovering-active-chapter': isHoveringActiveChapter,
            'is-playing': !paused,
        }"
        ref="seekBarHolder"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
    >
        <div class="seek-bar" @click="seekBarClick">
            <template v-if="isDurationReady && segments.length">
                <button
                    v-for="(segment, index) of segments"
                    :key="segment.key"
                    type="button"
                    class="chapter-segment"
                    :class="{
                        'chapter-segment-first': index === 0,
                        'chapter-segment-last': index === segments.length - 1,
                        'chapter-segment-invisible': segment.isInvisible,
                        'chapter-segment-hovered': index === hoveredSegmentIndex,
                    }"
                    :style="{
                        '--segment-start': segment.start,
                        '--segment-end': segment.end,
                    }"
                    :tabindex="segment.chapter ? 0 : -1"
                    :aria-hidden="segment.chapter ? undefined : 'true'"
                    :aria-label="segmentAriaLabel(segment)"
                    :disabled="disableSeeking || undefined"
                    @click="handleSegmentClick($event, segment)"
                    @focus="handleSegmentFocus(index, segment, $event)"
                    @blur="handleSegmentBlur(index)"
                >
                    <div class="segment-progress"></div>
                </button>
            </template>
            <div v-else class="chapter-segment chapter-segment-first chapter-segment-last">
                <div class="segment-progress"></div>
            </div>
            <div v-if="isDurationReady" class="seek-bar-thumb" aria-hidden="true"></div>
        </div>
        <div
            v-if="isDurationReady && tooltipSegment"
            class="seek-bar-tooltip"
            role="tooltip"
            ref="tooltipRef"
        >
            <span class="seek-bar-tooltip-time">{{ tooltipTime }}</span>
            <span v-if="tooltipTitle" class="seek-bar-tooltip-title">{{ tooltipTitle }}</span>
        </div>
    </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch, computed, nextTick } from "vue";
import type { Chapter, Poll } from "../graphql/generated.ts";
import { sortedChapters as buildSortedChapters, visibleChapters } from "../utils.ts";
import type { SortedChapter } from "../types/player.ts";
import { formatTime } from "@richpods/shared/utils/time";
import { usePollTitles } from "../composables/usePollTitles.ts";
import { useAudio } from "../composables/useAudio.ts";

const { seekTo: seekAudioTo } = useAudio();

const seekBarHolderRef = useTemplateRef<HTMLDivElement>("seekBarHolder");
const tooltipRef = useTemplateRef<HTMLDivElement>("tooltipRef");

const props = defineProps<{
    audioElement: HTMLAudioElement;
    chapters: Chapter[];
    paused: boolean;
    disableSeeking?: boolean;
    showInvisibleChapters?: boolean;
}>();

const allSortedChapters = computed<SortedChapter[]>(() =>
    buildSortedChapters(props.chapters || []),
);

function isInvisibleCard(ch: SortedChapter): boolean {
    return (
        ch.enclosure.__typename === "Card" &&
        (ch.enclosure as { visibleAsChapter?: boolean }).visibleAsChapter === false
    );
}

const sortedChapters = computed<SortedChapter[]>(() =>
    props.showInvisibleChapters
        ? allSortedChapters.value
        : visibleChapters(allSortedChapters.value),
);

const { loadPollTitle, getPollTitle } = usePollTitles();

function isPollEnclosure(enclosure: SortedChapter["enclosure"]): enclosure is Poll {
    return enclosure.__typename === "Poll";
}

function getChapterTitle(chapter: SortedChapter): string {
    if (isPollEnclosure(chapter.enclosure)) {
        return (
            getPollTitle(chapter.enclosure.coloeus.endpoint, chapter.enclosure.coloeus.pollId) ??
            "…"
        );
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

type Segment = {
    key: string;
    start: number;
    end: number;
    isInvisible: boolean;
    chapter: SortedChapter | null;
};

const segments = computed<Segment[]>(() => {
    if (!isDurationReady.value) return [];
    const d = duration.value;
    const chapters = sortedChapters.value;

    const boundaryTimes = new Set<number>();
    boundaryTimes.add(0);
    for (const ch of chapters) {
        if (ch.beginSeconds > 0 && ch.beginSeconds < d) {
            boundaryTimes.add(ch.beginSeconds);
        }
    }
    boundaryTimes.add(d);

    const sorted = Array.from(boundaryTimes).sort((a, b) => a - b);

    const result: Segment[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
        const begin = sorted[i];
        const end = sorted[i + 1];
        if (end <= begin) continue;
        const chapter = chapters.find((c) => c.beginSeconds === begin) ?? null;
        result.push({
            key: `${begin}-${end}`,
            start: begin / d,
            end: end / d,
            isInvisible: chapter ? isInvisibleCard(chapter) : false,
            chapter,
        });
    }
    return result;
});

const hoveredSegmentIndex = ref<number | null>(null);
const focusedSegmentIndex = ref<number | null>(null);
const hoverRatio = ref(0);

const tooltipSegmentIndex = computed<number | null>(
    () => hoveredSegmentIndex.value ?? focusedSegmentIndex.value,
);

const tooltipSegment = computed<Segment | null>(() => {
    const idx = tooltipSegmentIndex.value;
    if (idx === null) return null;
    return segments.value[idx] ?? null;
});

const activeSegmentIndex = computed<number | null>(() => {
    if (!isDurationReady.value) return null;
    const ratio = currentTime.value / duration.value;
    const segs = segments.value;
    for (let i = 0; i < segs.length; i++) {
        if (ratio >= segs[i].start && ratio <= segs[i].end) {
            return i;
        }
    }
    return null;
});

const isHoveringActiveChapter = computed(
    () =>
        hoveredSegmentIndex.value !== null &&
        hoveredSegmentIndex.value === activeSegmentIndex.value,
);

const tooltipTime = computed(() => formatTime(hoverRatio.value * duration.value));

const tooltipTitle = computed(() => {
    const chapter = tooltipSegment.value?.chapter;
    return chapter ? getChapterTitle(chapter) : "";
});

function setHoverRatio(ratio: number) {
    hoverRatio.value = ratio;
    seekBarHolderRef.value?.style.setProperty("--seek-bar-hover-ratio", ratio.toString());
    updateTooltipClamp();
}

const TOOLTIP_VIEWPORT_MARGIN = 8;

function updateTooltipClamp() {
    const holder = seekBarHolderRef.value;
    const tooltip = tooltipRef.value;
    if (!holder) return;
    if (!tooltip) {
        holder.style.removeProperty("--seek-bar-tooltip-x");
        return;
    }

    const holderRect = holder.getBoundingClientRect();
    const tooltipWidth = tooltip.offsetWidth;
    if (holderRect.width === 0 || tooltipWidth === 0) return;

    const desiredViewportX = holderRect.left + hoverRatio.value * holderRect.width;
    const minX = tooltipWidth / 2 + TOOLTIP_VIEWPORT_MARGIN;
    const maxX = window.innerWidth - tooltipWidth / 2 - TOOLTIP_VIEWPORT_MARGIN;
    // If the tooltip is wider than the viewport, fall back to the hover point.
    const clampedViewportX =
        maxX < minX ? desiredViewportX : Math.min(maxX, Math.max(minX, desiredViewportX));

    const centerInHolder = clampedViewportX - holderRect.left;
    holder.style.setProperty("--seek-bar-tooltip-x", `${centerInHolder}px`);
}

watch(tooltipSegment, async () => {
    await nextTick();
    updateTooltipClamp();
});

watch(tooltipTitle, async () => {
    await nextTick();
    updateTooltipClamp();
});

watch(
    () => props.paused,
    async () => {
        await nextTick();
        updateTooltipClamp();
    },
);

function segmentAriaLabel(segment: Segment): string | undefined {
    if (!segment.chapter) return undefined;
    const time = formatTime(segment.chapter.beginSeconds);
    const title = getChapterTitle(segment.chapter);
    return title ? `${time} ${title}` : time;
}

function handleMouseMove(event: MouseEvent) {
    if (!isDurationReady.value) {
        hoveredSegmentIndex.value = null;
        return;
    }
    const holder = seekBarHolderRef.value;
    if (!holder) return;
    const rect = holder.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setHoverRatio(ratio);

    const segs = segments.value;
    let idx: number | null = null;
    for (let i = 0; i < segs.length; i++) {
        if (ratio >= segs[i].start && ratio <= segs[i].end) {
            idx = i;
            break;
        }
    }
    hoveredSegmentIndex.value = idx;
}

function handleMouseLeave() {
    hoveredSegmentIndex.value = null;
}

function handleSegmentFocus(index: number, segment: Segment, event: FocusEvent) {
    const target = event.target as HTMLElement | null;
    // Only show the tooltip for keyboard focus, not focus gained from mouse clicks.
    if (!target?.matches(":focus-visible")) return;
    focusedSegmentIndex.value = index;
    setHoverRatio((segment.start + segment.end) / 2);
}

function handleSegmentBlur(index: number) {
    if (focusedSegmentIndex.value === index) {
        focusedSegmentIndex.value = null;
    }
}

function handleSegmentClick(event: MouseEvent, segment: Segment) {
    // Keyboard-triggered click (Enter/Space) has event.detail === 0.
    // Jump to the chapter start in that case; mouse clicks bubble to the
    // seek bar for precise seeking.
    if (event.detail === 0 && segment.chapter) {
        event.stopPropagation();
        seekTo(segment.chapter.beginSeconds);
    }
}

function seekTo(seconds: number) {
    if (!isDurationReady.value || props.disableSeeking) return;
    seekAudioTo(seconds);
    updateSeekBarStyles();
}

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

let animationFrameId: number;
function updateSeekBarStyles() {
    const seekBarHolder = seekBarHolderRef.value;

    if (seekBarHolder) {
        currentTime.value = props.audioElement.currentTime;

        if (!isDurationReady.value) {
            seekBarHolder.style.setProperty("--seek-bar-progress-ratio", "0");
        } else {
            const ratio = Math.min(1, Math.max(0, currentTime.value / duration.value));
            seekBarHolder.style.setProperty("--seek-bar-progress-ratio", ratio.toString());
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
    const percent = Math.min(1, Math.max(0, clickX / rect.width));

    seekAudioTo(percent * duration.value);

    updateSeekBarStyles();
}

watch(
    () => props.paused,
    (isPaused) => {
        if (!isPaused) {
            animationFrameId = requestAnimationFrame(updateSeekBarStyles);
        } else if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    },
);

function handleWindowResize() {
    updateTooltipClamp();
}

onMounted(() => {
    animationFrameId = requestAnimationFrame(updateSeekBarStyles);
    window.addEventListener("resize", handleWindowResize);
});

onBeforeUnmount(() => {
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener("resize", handleWindowResize);
    props.audioElement.removeEventListener("canplay", handleDurationUpdate);
    props.audioElement.removeEventListener("loadedmetadata", handleDurationUpdate);
    props.audioElement.removeEventListener("durationchange", handleDurationUpdate);
    props.audioElement.removeEventListener("timeupdate", handleTimeUpdate);
});
</script>
<style scoped lang="scss">
@use "../assets/theme" as theme;

.seek-bar-holder {
    width: 100%;
    position: relative;
}

.seek-bar {
    width: 100%;
    height: var(--richpod-seek-bar-height);
    position: relative;
    cursor: pointer;
}

.chapter-segment {
    position: absolute;
    top: 0;
    height: 100%;
    left: calc(var(--segment-start, 0) * 100%);
    width: calc(
        (var(--segment-end, 1) - var(--segment-start, 0)) *
            100% - var(--richpod-chapter-segment-gap)
    );
    background-color: var(--richpod-seek-bar-color);
    overflow: hidden;
    padding: 0;
    border: none;
    margin: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
    transition: transform 0.12s ease-out;
    transform-origin: center center;

    &[aria-hidden="true"] {
        cursor: default;
    }

    &.chapter-segment-last {
        width: calc((var(--segment-end, 1) - var(--segment-start, 0)) * 100%);
    }

    &.chapter-segment-invisible {
        opacity: 0.45;
    }

    &.chapter-segment-hovered {
        transform: scaleY(1.6);
    }

    &:focus {
        outline: none;
    }

    &:focus-visible {
        outline: 2px solid var(--richpod-seek-bar-progress-color);
        outline-offset: 3px;
    }
}

.segment-progress {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: calc(
        clamp(
                0,
                (var(--seek-bar-progress-ratio, 0) - var(--segment-start, 0)) /
                    (var(--segment-end, 1) - var(--segment-start, 0)),
                1
            ) *
            100%
    );
    background-color: var(--richpod-seek-bar-progress-color);
}

.seek-bar-thumb {
    position: absolute;
    top: calc(var(--richpod-seek-bar-height) / 2);
    left: calc(var(--seek-bar-progress-ratio, 0) * 100%);
    transform: translate(-50%, -50%) scale(1);
    width: var(--richpod-seek-bar-thumb-size);
    height: var(--richpod-seek-bar-thumb-size);
    border-radius: 50%;
    background-color: var(--richpod-seek-bar-progress-color);
    pointer-events: none;
    transition: transform 0.12s ease-out;
}

.seek-bar-holder.is-hovering-active-chapter .seek-bar-thumb {
    transform: translate(-50%, -50%) scale(1.6);
}

.seek-bar-tooltip {
    position: absolute;
    bottom: calc(100% + 14px);
    left: var(--seek-bar-tooltip-x, calc(var(--seek-bar-hover-ratio, 0) * 100%));
    transform: translateX(-50%);
    max-width: min(420px, 90vw);
    padding: 8px 14px;
    border-radius: 999px;
    background-color: rgba(24, 22, 28, 0.88);
    color: #fff;
    font-size: 0.85rem;
    font-weight: 500;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(6px);
    z-index: 10;
}

.seek-bar-tooltip-time {
    font-variant-numeric: tabular-nums;
    opacity: 0.85;
    margin-right: 6px;
}

.seek-bar-tooltip-title {
    font-weight: 600;
}

@media (hover: none) {
    .seek-bar-holder.is-playing .seek-bar-tooltip {
        display: none;
    }
}

@media (max-width: #{theme.$richpod-desktop-breakpoint - 1}) {
    .seek-bar-holder.is-playing .seek-bar-tooltip-title {
        display: none;
    }
}

@media (hover: none), (max-width: #{theme.$richpod-desktop-breakpoint - 1}) {
    .chapter-segment.chapter-segment-hovered {
        transform: none;
    }

    .seek-bar-holder.is-hovering-active-chapter .seek-bar-thumb {
        transform: translate(-50%, -50%);
    }
}

.seek-bar-holder.seeking-disabled {
    .seek-bar {
        cursor: not-allowed;
    }

    .chapter-segment {
        background-color: var(--richpod-seek-bar-color-disabled);
    }

    .segment-progress {
        background-color: var(--richpod-seek-bar-progress-color-disabled);
    }

    .seek-bar-thumb {
        background-color: var(--richpod-seek-bar-progress-color-disabled);
    }
}
</style>
