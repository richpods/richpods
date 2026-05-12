<template>
    <aside v-if="richPod" class="desktop-sidebar" :class="{ compact: isCompact }">
        <div v-if="isUnverified" class="unverified-banner" role="alert">
            <svg
                class="unverified-banner-icon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                aria-hidden="true"
            >
                <path
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="32"
                    d="M432 320V144a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v112m0 0V80a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v160m-64 1V96a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v224m128-80V48a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v192"
                />
                <path
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="32"
                    d="M432 320c0 117.4-64 176-152 176s-123.71-39.6-144-88L83.33 264c-6.66-18.05-3.64-34.79 11.87-43.6h0c15.52-8.82 35.91-4.28 44.31 11.68L176 320"
                />
            </svg>
            <span>{{
                publisherName
                    ? t("disclaimer.unverified", { publisherName })
                    : t("disclaimer.unverifiedNoPublisher")
            }}</span>
        </div>
        <div class="sidebar-scroll" ref="scrollEl">
            <div class="sidebar-top">
                <div class="sidebar-text">
                    <h1 class="sidebar-title">{{ richPod.title }}</h1>
                    <span v-if="richPod.explicit" class="explicit-badge">{{
                        t("player.explicit")
                    }}</span>
                    <p v-if="richPod.description" class="sidebar-description">
                        {{ richPod.description }}
                    </p>
                </div>
                <div class="sidebar-artwork">
                    <img :src="artworkUrl" :alt="richPod.origin.title" />
                </div>
                <ShareIconButton
                    v-if="!preview"
                    variant="labeled"
                    class="sidebar-share"
                    :label="t('player.share')"
                    @click="emit('share')"
                />
            </div>
            <div class="sidebar-chapters">
                <slot />
            </div>
            <ShareIconButton
                v-if="!preview"
                variant="labeled"
                class="sidebar-share-compact"
                :label="t('player.share')"
                @click="emit('share')"
            />
            <div v-if="richPod.origin && !preview" class="sidebar-info">
                <h3>{{ t("infoDialog.originalPodcastTitle") }}</h3>
                <p>
                    <a
                        v-if="richPod.origin.link"
                        :href="richPod.origin.link"
                        target="_blank"
                        rel="noopener ugc"
                    >
                        {{ richPod.origin.title }}
                    </a>
                    <template v-else>{{ richPod.origin.title }}</template>
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
            <a
                v-if="isUnverified && !preview"
                :href="reportMailtoLink"
                class="sidebar-report-button"
            >
                {{ t("infoDialog.reportRichPod") }}
            </a>
        </div>
    </aside>
</template>
<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRichPod } from "../composables/useRichPod.ts";
import { useAudio } from "../composables/useAudio.ts";
import ShareIconButton from "./ShareIconButton.vue";

const REPORT_EMAIL = import.meta.env.VITE_REPORT_EMAIL || "contact@richpods.org";

const props = withDefaults(defineProps<{ preview?: boolean }>(), { preview: false });

const emit = defineEmits<{
    share: [];
}>();

const { t } = useI18n();
const { richPod } = useRichPod();
const { isPaused } = useAudio();

const scrollEl = useTemplateRef<HTMLElement>("scrollEl");
const scrollTop = ref(0);

watch(scrollEl, (el, _old, onCleanup) => {
    if (!el) {
        scrollTop.value = 0;
        return;
    }
    const handler = () => {
        scrollTop.value = el.scrollTop;
    };
    el.addEventListener("scroll", handler, { passive: true });
    onCleanup(() => el.removeEventListener("scroll", handler));
});

const isCompact = computed(() => props.preview || !isPaused.value || scrollTop.value > 24);

const isUnverified = computed(() => !richPod.value?.origin.verified);
const publisherName = computed(() => richPod.value?.editor?.publicName);

const fallbackArtwork =
    "https://www.nordpost.at/wp-content/uploads/2022/09/631e68da6aae2438b76bf4ff_feed-768x768.jpg";
const artworkUrl = computed(
    () =>
        richPod.value?.origin.episode.artworkUrl ||
        richPod.value?.origin.artworkUrl ||
        fallbackArtwork,
);

const reportMailtoLink = computed(() => {
    const title = richPod.value?.title ?? "";
    const id = richPod.value?.id ?? "";
    const subject = encodeURIComponent(`Report ${title} (${id})`);
    return `mailto:${REPORT_EMAIL}?subject=${subject}`;
});
</script>
<style scoped lang="scss">
@use "../assets/theme" as theme;

.desktop-sidebar {
    display: none;
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

@container player (min-width: #{theme.$richpod-desktop-breakpoint}) {
    .desktop-sidebar {
        display: flex;
        flex-direction: column;
        grid-area: sidebar;
        overflow: hidden;
        padding: 0;
        background: var(--richpod-background-color);
        color: var(--richpod-color);
        min-height: 0;

        > .unverified-banner {
            flex-shrink: 0;
        }

        .sidebar-scroll {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            scrollbar-gutter: stable;
            display: flex;
            flex-direction: column;
        }

        .sidebar-top {
            position: sticky;
            top: 0;
            z-index: 1;
            background: var(--richpod-background-color);
            padding: 20px 20px 16px;
            display: grid;
            gap: 12px;
            grid-template-columns: 1fr;
            grid-template-areas:
                "text"
                "artwork"
                "share";
            border-bottom: 1px solid transparent;
            transition:
                padding 0.2s ease,
                border-color 0.2s ease;
        }

        .sidebar-text {
            grid-area: text;
            min-width: 0;
        }

        .sidebar-artwork {
            grid-area: artwork;
            width: 100%;
            justify-self: stretch;

            > img {
                display: block;
                width: 100%;
                aspect-ratio: 1;
                object-fit: cover;
                border-radius: 10px;
            }
        }

        .sidebar-share {
            grid-area: share;
            justify-self: start;
        }

        .sidebar-share-compact {
            display: none;
            flex: none;
            align-self: flex-start;
            margin: 4px 20px 16px;
        }

        .sidebar-title {
            font-size: 20px;
            line-height: 26px;
            font-weight: 700;
            letter-spacing: -0.4px;
            margin: 0 0 4px;
        }

        .sidebar-description {
            font-size: 13px;
            line-height: 18px;
            margin: 6px 0 0;
            opacity: 0.85;
            display: -webkit-box;
            -webkit-line-clamp: 4;
            line-clamp: 4;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        &.compact {
            .sidebar-top {
                padding: 10px 20px;
                grid-template-columns: 44px 1fr;
                grid-template-areas: "artwork text";
                gap: 12px;
                align-items: center;
                border-bottom-color: rgba(255, 255, 255, 0.08);
            }

            .sidebar-artwork {
                width: 44px;
                > img {
                    border-radius: 6px;
                }
            }

            .sidebar-title {
                font-size: 14px;
                line-height: 18px;
                margin-bottom: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .sidebar-description,
            .sidebar-share,
            .explicit-badge {
                display: none;
            }

            .sidebar-share-compact {
                display: inline-flex;
            }
        }

        .sidebar-chapters {
            padding: 12px 20px 12px;
            display: flex;
            flex-direction: column;
        }

        .sidebar-chapters:empty {
            display: none;
        }

        .sidebar-info {
            border-top: 1px solid rgba(255, 255, 255, 0.15);
            padding: 12px 20px;
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
                border: 1px solid #ffffff;
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

        .sidebar-report-button {
            display: inline-block;
            margin: 16px 20px 20px;
            padding: 6px 16px;
            border: none;
            border-radius: 13px;
            background-color: var(--richpod-unverified-warning-background);
            color: #fff;
            font-size: 13px;
            line-height: 18px;
            text-decoration: none;
            align-self: flex-start;

            &:hover {
                text-decoration: none;
                opacity: 0.9;
            }
        }
    }
}
</style>
