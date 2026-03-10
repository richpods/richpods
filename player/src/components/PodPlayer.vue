<template>
    <div v-if="richPod" class="player-wrapper">
        <div
            class="podcast-meta"
            :class="{ paused: isMarqueePaused }"
            :style="{ '--marquee-duration': marqueeDuration }"
        >
            <div class="podcast-image">
                <img :src="artworkUrl" :alt="richPod.origin.title">
            </div>
            <h1 class="richpod-title">
                <span class="marquee">
                    <span class="marquee_clones">{{ richPod.title }}</span>
                    <span class="marquee_clones" aria-hidden="true">{{ richPod.title }}</span>
                </span>
            </h1>
            <span v-if="richPod.explicit" class="explicit-badge mobile-only">E</span>
            <div class="podcast-description">
                {{ richPod.origin.title }}
            </div>
            <div class="info-area">
                <button @click="toggleInfoDialog" class="control-button info-button">
                    {{ t("player.info") }}
                </button>
            </div>
        </div>
        <div v-if="isUnverified" class="unverified-banner mobile-only" role="alert" ref="mobileBanner">
            <svg class="unverified-banner-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M432 320V144a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v112m0 0V80a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v160m-64 1V96a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v224m128-80V48a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v192"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M432 320c0 117.4-64 176-152 176s-123.71-39.6-144-88L83.33 264c-6.66-18.05-3.64-34.79 11.87-43.6h0c15.52-8.82 35.91-4.28 44.31 11.68L176 320"/></svg>
            <span>{{ publisherName ? t("disclaimer.unverified", { publisherName }) : t("disclaimer.unverifiedNoPublisher") }}</span>
        </div>
        <aside class="desktop-sidebar">
            <div v-if="isUnverified" class="unverified-banner" role="alert">
                <svg class="unverified-banner-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M432 320V144a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v112m0 0V80a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v160m-64 1V96a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v224m128-80V48a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v192"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M432 320c0 117.4-64 176-152 176s-123.71-39.6-144-88L83.33 264c-6.66-18.05-3.64-34.79 11.87-43.6h0c15.52-8.82 35.91-4.28 44.31 11.68L176 320"/></svg>
                <span>{{ publisherName ? t("disclaimer.unverified", { publisherName }) : t("disclaimer.unverifiedNoPublisher") }}</span>
            </div>
            <h1 class="sidebar-title">{{ richPod.title }}</h1>
            <span v-if="richPod.explicit" class="explicit-badge">{{ t("player.explicit") }}</span>
            <p v-if="richPod.description" class="sidebar-description">
                {{ richPod.description }}
            </p>
            <div class="sidebar-artwork">
                <img :src="artworkUrl" :alt="richPod.origin.title">
            </div>
            <div v-if="richPod.origin" class="sidebar-info">
                <h3>{{ t("infoDialog.originalPodcastTitle") }}</h3>
                <p>
                    {{ richPod.origin.title }}
                </p>
                <p v-if="richPod.origin.link">
                    <a :href="richPod.origin.link" target="_blank" rel="noopener ugc">
                        {{ richPod.origin.link }}
                    </a>
                </p>
                <h3>{{ t("infoDialog.episode") }}</h3>
                <p>
                    {{ richPod.origin.episode.title }}
                </p>
                <a
                    v-if="richPod.origin.episode.link"
                    :href="richPod.origin.episode.link"
                    target="_blank"
                    rel="noopener ugc"
                    class="sidebar-episode-link"
                >
                    {{ t("sidebar.openEpisode") }}
                </a>
            </div>
        </aside>
        <div class="controls-area">
            <PlayerControls
                :audio-url="richPod?.origin.episode.media.url"
                :chapters="richPod?.chapters || []"
            />
        </div>
        <div class="chapter-flow" :style="{ '--banner-offset': `${mobileBannerHeight}px` }">
            <ChapterFlow :currentTime="currentTime" />
        </div>
        <InfoDialog ref="infoDialog" />
    </div>
</template>
<script setup lang="ts">
import { ref, computed, watch, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import ChapterFlow from "@/components/ChapterFlow.vue";
import { useRichPod } from "@/composables/useRichPod.ts";
import { useAudio } from "@/composables/useAudio.ts";
import { usePlaybackProgress } from "@/composables/usePlaybackProgress.ts";
import { useMediaSession } from "@/composables/useMediaSession.ts";
import PlayerControls from "@/components/PlayerControls.vue";
import InfoDialog from "@/components/InfoDialog.vue";
const { t } = useI18n();
const { richPod } = useRichPod();

useMediaSession(richPod);

const isUnverified = computed(() => !richPod.value?.origin.verified);

const publisherName = computed(() => richPod.value?.editor?.publicName);

const mobileBannerRef = useTemplateRef<HTMLDivElement>("mobileBanner");
const mobileBannerHeight = ref(0);

watch(mobileBannerRef, (el, _old, onCleanup) => {
    if (!el) {
        mobileBannerHeight.value = 0;
        return;
    }
    const observer = new ResizeObserver(([entry]) => {
        mobileBannerHeight.value = entry.borderBoxSize[0].blockSize;
    });
    observer.observe(el);
    onCleanup(() => observer.disconnect());
}, { flush: "post" });

const richPodId = computed(() => richPod.value?.id);
usePlaybackProgress(richPodId);

const {
    currentTime,
    isPaused,
} = useAudio(richPod.value?.origin.episode.media.url);

const isMarqueePaused = ref(isPaused.value);

const fallbackArtwork =
    "https://www.nordpost.at/wp-content/uploads/2022/09/631e68da6aae2438b76bf4ff_feed-768x768.jpg";
const artworkUrl = computed(
    () =>
        richPod.value?.origin.artworkUrl ||
        richPod.value?.origin.episode.artworkUrl ||
        fallbackArtwork,
);

const speedPerChar = 0.5; // seconds per character
const marqueeDuration = computed(() => {
    const length = richPod.value?.title.length || 0;
    return `${length * speedPerChar}s`;
});

watch(isPaused, (pauseState) => {
    isMarqueePaused.value = pauseState;
});

const infoDialog = useTemplateRef("infoDialog");
function toggleInfoDialog() {
    infoDialog.value?.toggle();
}
</script>
<style lang="scss">
@use "@/assets/theme" as theme;

.player-wrapper {
    --richpod-meta-height: 80px;
    --title-font-size: 20px;
    --title-line-height: 26px;
    --description-font-size: 16px;
    --description-line-height: 18px;
}

.chapter-flow {
    --chapter-flow-height: calc(
        100dvh - var(--chapter-offset-top) - var(--chapter-offset-bottom)
    );

    @media (min-width: #{theme.$richpod-desktop-breakpoint}) {
        --chapter-offset-top: 0px;
        --chapter-offset-bottom: 0px;
        --chapter-flow-height: 100%;
    }
}
</style>
<style scoped lang="scss">
@use "@/assets/theme" as theme;

.player-wrapper {
    position: relative;
    height: 100%;
}

.podcast-meta {
    height: var(--richpod-meta-height);
    padding: 12px;

    display: grid;
    grid-template-columns: calc(6px + var(--title-line-height) + var(--description-line-height)) 1fr auto;
    grid-template-rows: auto auto;
    grid-template-areas: "image title        info"
                         "image description  info";
    gap: 0 12px;
    --marquee-duration: 10s;

    .podcast-image {
        grid-area: image;
        display: flex;
        align-items: start;
        justify-content: center;

        > img {
            display: block;
            width: 100%;
            border-radius: 7px;
        }
    }

    .richpod-title {
        align-self: center;
        overflow: hidden;
        position: relative;
        height: var(--title-line-height);
        white-space: nowrap;
        grid-area: title;
        font-size: var(--title-font-size);
        line-height: var(--title-line-height);
        font-weight: 700;
        letter-spacing: -0.4px;
        margin: 0;
    }

    .marquee {
        display: flex;
        width: max-content;
        will-change: transform;
        animation: marquee var(--marquee-duration) linear infinite;
    }

    .marquee_clones {
        padding-right: 4rem;
        flex-shrink: 0;
    }

    &:hover .marquee {
        animation-play-state: paused;
    }

    &.paused .marquee {
        animation-play-state: paused;
    }

    .podcast-description {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 15px;
    }

    .info-area {
        grid-area: info;
        display: flex;
        align-items: start;
    }

    .info-button {
        appearance: none;
        border: 1px solid #FFFFFF;
        height: 26px;
        box-shadow: 0 3px 6px #00000029;
        border-radius: 13px;
        background-color: var(--richpod-button-background);
        background-repeat: no-repeat;
        color: var(--richpod-button-text);

        font-size: 12px;
        letter-spacing: -0.24px;

        background-image: url('@/assets/images/icon_infos.svg');
        background-size: 2px 9px;
        background-position: left 10px center;

        display: flex;
        align-items: center;
        padding-left: 15px;
        padding-right: 8px;
        gap: 6px;

        img {
            display: inline-block;
            height: 14px;
        }
    }
}

@keyframes marquee {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
}

.explicit-badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 3px;
    background-color: var(--richpod-unverified-warning-background);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    line-height: 16px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    vertical-align: middle;
}

.explicit-badge.mobile-only {
    grid-area: title;
    align-self: center;
    justify-self: end;
    margin-left: 4px;
}

.unverified-banner {
    background-color: var(--richpod-unverified-warning-background);
    color: #fff;
    font-size: 13px;
    line-height: 18px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.unverified-banner-icon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
}

.unverified-banner.mobile-only {
    position: absolute;
    top: var(--richpod-meta-height);
    left: 0;
    right: 0;
    z-index: 10;
}

.desktop-sidebar {
    display: none;
}

.chapter-flow {
    --chapter-offset-top: calc(var(--richpod-meta-height) + var(--banner-offset, 0px));
    --chapter-offset-bottom: var(--richpod-controls-height);

    position: absolute;
    top: var(--chapter-offset-top);
    bottom: var(--chapter-offset-bottom);
    width: 100%;
    overflow-y: auto;

    color: var(--richpod-chapter-color);
    background: var(--richpod-chapter-background);
}

// Desktop layout
@media (min-width: #{theme.$richpod-desktop-breakpoint}) {
    .player-wrapper {
        display: grid;
        grid-template-rows: 1fr auto;
        grid-template-columns: var(--richpod-sidebar-width) 1fr;
        grid-template-areas:
            "sidebar  content"
            "controls controls";
    }

    .podcast-meta {
        display: none;
    }

    .unverified-banner.mobile-only {
        display: none;
    }

    .controls-area {
        grid-area: controls;
        position: relative;
        z-index: 50;

        &::before {
            content: "";
            position: absolute;
            top: calc(-1 * var(--richpod-chapter-nibble-size));
            left: 0;
            right: 0;
            height: var(--richpod-chapter-nibble-size);
        }
    }

    .desktop-sidebar {
        display: block;
        grid-area: sidebar;
        overflow-y: auto;
        padding: 20px;
        color: var(--richpod-color);

        > .unverified-banner {
            margin: -20px -20px 16px;
        }

        .sidebar-artwork > img {
            display: block;
            width: 100%;
            border-radius: 10px;
        }

        .sidebar-title {
            font-size: 20px;
            line-height: 26px;
            font-weight: 700;
            letter-spacing: -0.4px;
            margin: 0 0 4px;
        }

        > .explicit-badge {
            margin-bottom: 8px;
        }

        .sidebar-description {
            font-size: 14px;
            line-height: 20px;
            margin: 0 0 12px;
            opacity: 0.85;
        }

        .sidebar-artwork {
            margin-bottom: 16px;
        }

        .sidebar-info {
            border-top: 1px solid rgba(255, 255, 255, 0.15);
            padding-top: 12px;
            font-size: 13px;
            line-height: 18px;

            h3 {
                font-size: 14px;
                margin: 16px 0 6px;

                &:first-child {
                    margin-top: 0;
                }
            }

            p {
                margin: 4px 0;
                word-break: break-word;
            }

            a {
                color: var(--richpod-header-background-color);
                text-decoration: none;

                &:hover {
                    text-decoration: underline;
                }
            }

            .sidebar-episode-link {
                display: inline-block;
                margin-top: 12px;
                padding: 6px 16px;
                border: 1px solid #FFFFFF;
                border-radius: 13px;
                background-color: var(--richpod-button-background);
                color: var(--richpod-button-text);
                font-size: 13px;
                text-decoration: none;

                &:hover {
                    text-decoration: none;
                    opacity: 0.9;
                }
            }
        }
    }

    .chapter-flow {
        position: static;
        grid-area: content;
        overflow-y: auto;
        min-height: 0;
    }
}</style>
