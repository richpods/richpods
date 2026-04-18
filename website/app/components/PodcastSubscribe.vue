<template>
    <section class="podcast-section podcast-subscribe">
        <h2>{{ $t("podcastSite.subscribe.title") }}</h2>
        <ul class="podcast-subscribe__list">
            <li>
                <a
                    class="subscribe-button subscribe-button--rss"
                    :href="podcast.feedUrl"
                    target="_blank"
                    rel="noopener"
                >
                    <Icon
                        icon="ion:logo-rss"
                        class="subscribe-button__icon"
                        aria-hidden="true"
                    />
                    <span>{{ $t("podcastSite.subscribe.rss") }}</span>
                </a>
            </li>
            <li v-if="overcastUrl">
                <a
                    class="subscribe-button subscribe-button--overcast"
                    :href="overcastUrl"
                    target="_blank"
                    rel="noopener"
                >
                    <OvercastIcon class="subscribe-button__icon" />
                    <span>{{ $t("podcastSite.subscribe.overcast") }}</span>
                </a>
            </li>
            <li v-if="podcast.platformLinkApplePodcasts">
                <a
                    class="subscribe-button subscribe-button--apple"
                    :href="podcast.platformLinkApplePodcasts"
                    target="_blank"
                    rel="noopener"
                >
                    <Icon
                        icon="simple-icons:applepodcasts"
                        class="subscribe-button__icon"
                        aria-hidden="true"
                    />
                    <span>{{ $t("podcastSite.subscribe.apple") }}</span>
                </a>
            </li>
            <li v-if="podcast.platformLinkSpotify">
                <a
                    class="subscribe-button subscribe-button--spotify"
                    :href="podcast.platformLinkSpotify"
                    target="_blank"
                    rel="noopener"
                >
                    <Icon
                        icon="simple-icons:spotify"
                        class="subscribe-button__icon"
                        aria-hidden="true"
                    />
                    <span>{{ $t("podcastSite.subscribe.spotify") }}</span>
                </a>
            </li>
            <li v-if="podcast.platformLinkAmazonMusic">
                <a
                    class="subscribe-button subscribe-button--amazon"
                    :href="podcast.platformLinkAmazonMusic"
                    target="_blank"
                    rel="noopener"
                >
                    <Icon
                        icon="simple-icons:amazonmusic"
                        class="subscribe-button__icon"
                        aria-hidden="true"
                    />
                    <span>{{ $t("podcastSite.subscribe.amazon") }}</span>
                </a>
            </li>
            <li v-if="podcast.platformLinkYouTubeMusic">
                <a
                    class="subscribe-button subscribe-button--youtube"
                    :href="podcast.platformLinkYouTubeMusic"
                    target="_blank"
                    rel="noopener"
                >
                    <Icon
                        icon="simple-icons:youtubemusic"
                        class="subscribe-button__icon"
                        aria-hidden="true"
                    />
                    <span>{{ $t("podcastSite.subscribe.youtube") }}</span>
                </a>
            </li>
        </ul>
    </section>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Icon } from "@iconify/vue";
import OvercastIcon from "@richpods/shared/components/OvercastIcon.vue";
import type { PublicHostedPodcast } from "~/types";

const props = defineProps<{
    podcast: PublicHostedPodcast;
}>();

// Extract the numeric iTunes id from an Apple Podcasts URL like
// https://podcasts.apple.com/us/podcast/name/id1234567890 (optionally followed
// by query params, e.g. ?i=episode).
function extractItunesId(applePodcastsUrl: string | null): string | null {
    if (!applePodcastsUrl) return null;
    const match = /\/id(\d+)(?:[/?#]|$)/i.exec(applePodcastsUrl);
    return match?.[1] ?? null;
}

// UA is only available client-side; the deep-link switch happens after mount.
const userAgent = ref("");
onMounted(() => {
    userAgent.value = navigator.userAgent;
});

const overcastUrl = computed(() => {
    const itunesId = extractItunesId(props.podcast.platformLinkApplePodcasts);
    if (!itunesId) return null;
    if (/iPhone|iPad|iPod/i.test(userAgent.value)) {
        return `overcast://x-callback-url/add?url=${encodeURIComponent(props.podcast.feedUrl)}`;
    }
    return `https://overcast.fm/itunes${itunesId}`;
});
</script>
<style scoped lang="scss">
.podcast-section {
    display: grid;
    gap: var(--space-s);

    h2 {
        margin: 0;
        padding: 0;
        font-size: var(--step-3);
    }
}

.podcast-subscribe__list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    list-style: none;
    margin: 0;
    padding: 0;
}

.subscribe-button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);
    padding: var(--space-2xs) var(--space-s);
    border-radius: 999px;
    background-color: #2f2c35;
    color: #fff;
    font-family: var(--heading-font-family), serif;
    font-size: var(--step-0);
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition:
        opacity 0.2s ease,
        transform 0.2s ease;

    &:hover:not(:disabled) {
        opacity: 0.85;
        transform: translateY(-1px);
    }

    &--rss {
        background-color: #ee802f;
    }

    &--overcast {
        background-color: #fc7e0f;
    }

    &--apple {
        background-color: #8449ba;
    }

    &--spotify {
        background-color: #1db954;
    }

    &--amazon {
        background-color: #25d1da;
        color: #002;
    }

    &--youtube {
        background-color: #ff0000;
    }
}

.subscribe-button__icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
}
</style>
