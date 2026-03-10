<template>
    <a :href="playerUrl" class="richpod-card-link">
    <article class="richpod-card">
        <div class="artwork-wrapper">
            <img
                v-if="safeArtworkUrl"
                :src="safeArtworkUrl"
                :alt="title"
                class="artwork"
                loading="lazy"
            >
            <div v-else class="artwork artwork-fallback" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                    <path d="M421.84 37.37a25.86 25.86 0 00-22.6-4.46L199.92 86.49a32.3 32.3 0 00-25.92 31.8v249.93a96 96 0 1032 90.78V223.63l175.32-42.47v135.06a96 96 0 1032 90.78V57.16a25.94 25.94 0 00-17.48-19.79z"/>
                </svg>
            </div>
            <div v-if="!isVerified" class="unverified-banner">
                <svg class="unverified-banner-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M432 320V144a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v112m0 0V80a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v160m-64 1V96a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v224m128-80V48a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v192"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M432 320c0 117.4-64 176-152 176s-123.71-39.6-144-88L83.33 264c-6.66-18.05-3.64-34.79 11.87-43.6h0c15.52-8.82 35.91-4.28 44.31 11.68L176 320"/></svg>
                <span>{{ $t("listen.unverified") }}</span>
            </div>
        </div>
        <h3 class="richpod-title">{{ title }}</h3>
        <p class="podcast-title">{{ podcastTitle }}</p>
        <p class="episode-title">{{ episodeTitle }}</p>
    </article>
    </a>
</template>
<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
    id: string;
    title: string;
    description: string;
    podcastTitle?: string;
    episodeTitle?: string;
    artworkUrl?: string;
    verified: boolean;
    createdAt: string;
    playerUrl: string;
}>();

const isVerified = computed(() => props.verified);

const safeArtworkUrl = computed(() => {
    if (!props.artworkUrl) {
        return undefined;
    }
    return /^https?:\/\//i.test(props.artworkUrl) ? props.artworkUrl : undefined;
});
</script>
<style scoped lang="scss">
.richpod-card-link {
    text-decoration: none;
    color: inherit;
    display: grid;
    grid-row: span 4;
    grid-template-rows: subgrid;
    min-width: 0;
    margin-bottom: var(--space-m);
}

.richpod-card {
    display: grid;
    grid-row: span 4;
    grid-template-rows: subgrid;
    width: 100%;
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: box-shadow 0.2s ease, transform 0.2s ease;

    &:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        transform: translateY(-2px);
    }
}

.artwork-wrapper {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    background-color: #f0ebe6;
}

.artwork {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.artwork-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c4b8a9;

    svg {
        width: 40%;
        height: 40%;
    }
}

.unverified-banner {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(213, 67, 23, 0.65);
    backdrop-filter: blur(8px);
    color: #fff;
    font-size: var(--step--2);
    line-height: 1.4;
    padding: 12px 8px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.unverified-banner-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
}

.richpod-title {
    font-size: var(--step-0);
    font-weight: 600;
    margin: 0;
    padding: var(--space-xs) var(--space-2xs) 0;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.podcast-title {
    font-size: var(--step--1);
    color: #555;
    padding: var(--space-2xs) var(--space-2xs) 0;
    margin: 0;
    align-self: end;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.episode-title {
    font-size: var(--step--2);
    color: #767676;
    padding: 2px var(--space-2xs) var(--space-s);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
