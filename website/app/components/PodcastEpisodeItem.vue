<template>
    <a
        class="podcast-episode"
        :href="playerUrl"
        :aria-label="$t('podcastSite.episodes.listen', { title: episode.title })"
    >
        <div v-if="episode.episodeCoverUrl" class="podcast-episode__cover-wrapper">
            <img
                :src="episode.episodeCoverUrl"
                :alt="episode.title"
                class="podcast-episode__cover"
                loading="lazy"
                width="120"
                height="120"
            />
        </div>
        <div class="podcast-episode__body">
            <p class="podcast-episode__meta">
                <time :datetime="episode.publishedAt">
                    {{ formatDate(episode.publishedAt) }}
                </time>
                <span v-if="episode.audioDurationSeconds">
                    · {{ formatDuration(episode.audioDurationSeconds) }}
                </span>
                <span
                    v-if="episode.explicit"
                    class="podcast-episode__explicit"
                    :title="$t('podcastSite.episodes.explicit')"
                    >E</span
                >
            </p>
            <h3 class="podcast-episode__title">{{ episode.title }}</h3>
            <p v-if="episode.description" class="podcast-episode__description">
                {{ episode.description }}
            </p>
        </div>
    </a>
</template>
<script setup lang="ts">
import { computed } from "vue";
import type { PublicHostedEpisode } from "~/types";

defineProps<{
    episode: PublicHostedEpisode;
    playerUrl: string;
}>();

const { t, locale } = useI18n();

const dateFormatter = computed(
    () =>
        new Intl.DateTimeFormat(locale.value, {
            year: "numeric",
            month: "long",
            day: "numeric",
        }),
);

function formatDate(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : dateFormatter.value.format(date);
}

function formatDuration(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) {
        return t("podcastSite.episodes.durationHoursMinutes", {
            hours: h,
            minutes: m,
        });
    }
    if (m > 0) {
        return t("podcastSite.episodes.durationMinutes", { minutes: m });
    }
    return t("podcastSite.episodes.durationSeconds", { seconds: s });
}
</script>
<style scoped lang="scss">
.podcast-episode {
    display: flex;
    gap: var(--space-s);
    padding: var(--space-s);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 10px;
    background-color: #fff;
    color: inherit;
    text-decoration: none;
    transition:
        box-shadow 0.2s ease,
        transform 0.2s ease,
        border-color 0.2s ease;

    &:hover,
    &:focus-visible {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        border-color: rgba(0, 0, 0, 0.15);
        transform: translateY(-1px);
    }

    &:focus-visible {
        outline: 2px solid var(--button-secondary-color);
        outline-offset: 2px;
    }

    @include mq($from: md) {
        gap: var(--space-m);
    }
}

.podcast-episode__cover-wrapper {
    flex: 0 0 96px;
    aspect-ratio: 1;
    border-radius: 6px;
    overflow: hidden;
    background-color: #f0ebe6;

    @include mq($from: md) {
        flex-basis: 120px;
    }
}

.podcast-episode__cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.podcast-episode__body {
    flex: 1 1 auto;
    min-width: 0;
    display: grid;
    gap: var(--space-2xs);
    align-content: start;
}

.podcast-episode__meta {
    font-size: var(--step--2);
    color: #767676;
    margin: 0;
    padding: 0;
    display: inline-flex;
    gap: 4px;
    align-items: center;
    flex-wrap: wrap;
}

.podcast-episode__explicit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 3px;
    background-color: #d54317;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
}

.podcast-episode__title {
    font-size: var(--step-1);
    line-height: 1.3;
    margin: 0;
    padding: 0;
    font-weight: 600;
}

.podcast-episode__description {
    font-size: var(--step--1);
    color: #444;
    margin: 0;
    padding: 0;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
    white-space: pre-wrap;
}
</style>
