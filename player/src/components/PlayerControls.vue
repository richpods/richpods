<template>
    <footer :class="['player-controls', modeClass, isPaused ? 'player-paused' : 'player-playing']">
        <PodSeekBar v-if="audioElement"
                    :audio-element="audioElement"
                    :paused="isPaused"
                    :chapters="props.chapters || []"
                    :disable-seeking="props.disableSeeking"
                    :show-invisible-chapters="props.showInvisibleChapters"
        />

        <div class="control-bar">
            <div v-if="!props.hideChapterButton" class="addition-controls">
                <button @click="toggleChapterDialog" class="control-button chapter-dialog-button" :disabled="!(props.chapters?.length)">{{ t("player.chapters") }}</button>
            </div>
            <div  class="media-buttons">
                <div class="left">
                    <button class="control-button skip-button skip-backward" :disabled="props.disableSeeking" @click="skip(-15)" :aria-label="t('player.skipBackward')">15s</button>
                </div>
                <div class="center">
                    <button class="play-button" :disabled="!canPlay || disablePlay" @click="handleTogglePlay">
                        <img :src="playIcon" :alt="playButtonLabel">
                    </button>
                </div>
                <div class="right">
                    <button class="control-button skip-button skip-forward" :disabled="props.disableSeeking" @click="skip(15)" :aria-label="t('player.skipForward')">15s</button>
                </div>
            </div>
        </div>
    </footer>
    <ChapterDialog v-if="!props.hideChapterButton" ref="chapterDialog" :chapters="props.chapters || []" />
</template>
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useAudio } from "../composables/useAudio.ts";
import { computed, useTemplateRef, watch, onBeforeUnmount } from "vue";
import PodSeekBar from "./PodSeekBar.vue";
import type { Chapter } from "../graphql/generated.ts";

const { t } = useI18n();

import play from "../assets/images/icon_play.svg";
import pause from "../assets/images/icon_pause.svg";
import ChapterDialog from "./ChapterDialog.vue";

const props = defineProps<{
    audioUrl?: string;
    chapters?: Chapter[];
    mode?: 'fixed' | 'inline';
    disablePlay?: boolean;
    disableSeeking?: boolean;
    hideChapterButton?: boolean;
    showInvisibleChapters?: boolean;
}>();

const emit = defineEmits<{
    (e: 'timeupdate', currentTime: number): void;
    (e: 'durationchange', duration: number): void;
    (e: 'playback-change', state: 'playing' | 'paused'): void;
}>();

const { canPlay, isPaused, togglePlay, audioElement, setAudio, disposeAudio, currentTime, mediaDuration } = useAudio();

if (props.audioUrl) {
    setAudio(props.audioUrl);
}

watch(
    () => props.audioUrl,
    (url) => {
        if (url) setAudio(url);
    }
);

// Bubble up current time and duration for editor integration
watch(currentTime, (t) => emit('timeupdate', t));
watch(mediaDuration, (d) => emit('durationchange', d));

const playButtonLabel = computed(() => (isPaused.value ? t("player.play") : t("player.pause")));
const playIcon = computed(() => (isPaused.value ? play : pause));
const disablePlay = computed(() => !!props.disablePlay);

watch(
    isPaused,
    (paused) => {
        emit('playback-change', paused ? 'paused' : 'playing');
    },
    { immediate: true },
);

const modeClass = computed(() => (props.mode === 'inline' ? 'player-inline' : 'player-fixed'));

function skip(seconds: number) {
    if (!audioElement.value) {
        return;
    }
    const duration = audioElement.value.duration;
    const newTime = audioElement.value.currentTime + seconds;
    audioElement.value.currentTime = Math.max(0, Math.min(newTime, duration));
}

const chapterDialog = useTemplateRef("chapterDialog");
function toggleChapterDialog() {
    chapterDialog.value?.toggle();
}

function handleTogglePlay() {
    if (disablePlay.value) {
        return;
    }
    togglePlay();
}

onBeforeUnmount(() => {
    // Stop playback and free resources when controls unmount
    disposeAudio();
});
</script>
<style scoped lang="scss">
.player-controls {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 50;
    height: var(--richpod-controls-height);
    background: var(--richpod-controls-background-color);
    box-shadow: -5px -5px 6px #0000006E;

    &.player-inline {
        position: static;
    }

    &.player-fixed {
        @media (min-width: 1024px) {
            position: static;
            box-shadow: none;
        }
    }

    .control-bar {
        display: grid;
        grid-template-columns: auto 1fr;
        padding-top: calc(var(--richpod-seek-bar-height) + (var(--richpod-chapter-nibble-size) / 3));
    }

    .media-buttons {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 15px;

        &:only-child {
            grid-column: 1 / -1;
        }

        > div {
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .left {
            justify-content: flex-end;
        }

        .right {
            justify-content: flex-start;
        }
    }

    .addition-controls {
        display: flex;
        justify-content: start;
        align-items: center;
        padding-left: 12px;
        gap: 10px;

    }

    .play-button {
        appearance: none;
        width: 58px;
        height: 58px;
        border-radius: 58px;
        background: transparent linear-gradient(162deg, var(--richpod-play-button-gradient-start) 0%, var(--richpod-play-button-gradient-end) 100%) 0 0 no-repeat padding-box;
        box-shadow: 0 3px 6px #00000029;
        border: 1px solid var(--richpod-play-button-border);
        display: flex;
        align-items: center;
        justify-content: center;

        > img {
            display: inline-block;
            height: 20px;
        }

        &:disabled {
            cursor: not-allowed;
            background: transparent linear-gradient(162deg, var(--richpod-play-button-gradient-start-disabled) 0%, var(--richpod-play-button-gradient-end-disabled) 100%) 0 0 no-repeat padding-box;
            border-color: var(--richpod-play-button-border-disabled);
            box-shadow: none;
            > img { filter: grayscale(100%) opacity(0.5); }
        }
    }

    $bg-offset: 10px;
    $padding: 20px + $bg-offset;

    .control-button {
        appearance: none;
        border: 1px solid var(--richpod-control-button-border);
        height: 26px;
        box-shadow: 0 3px 6px #00000029;
        border-radius: 13px;
        background-color: var(--richpod-button-background);
        background-repeat: no-repeat;
        background-size: 16px 10px;
        padding-top: 2px;
        padding-bottom: 2px;
        color: var(--richpod-button-text);

        font-size: 12px;
        letter-spacing: -0.24px;

        &:disabled {
            cursor: not-allowed;
            background-color: var(--richpod-button-background-disabled);
            color: var(--richpod-button-text-disabled);
            border-color: var(--richpod-control-button-border-disabled);
            box-shadow: none;
        }
    }

    .skip-button {
        &.skip-forward {
        background-image: url('../assets/images/icon_skip_forward.svg');
            background-position: right $bg-offset center;
            padding-left: $bg-offset;
            padding-right: $padding;
        }

        &.skip-backward {
        background-image: url('../assets/images/icon_skip_backward.svg');
            background-position: left $bg-offset center;
            padding-left: $padding;
            padding-right: $bg-offset;
        }
    }

    .chapter-dialog-button {
        background-image: url('../assets/images/icon_chevron_right.svg');
        background-size: 6px 10px;
        background-position: left $bg-offset center;
        padding-left: 18px;
        padding-right: $bg-offset;
    }
}

.player-paused .media-buttons .play-button > img {
    padding-left: 5px;
}
</style>
