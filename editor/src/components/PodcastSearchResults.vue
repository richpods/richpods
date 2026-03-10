<template>
    <div class="podcast-search-results">
        <div class="mb-4">
            <h3 class="text-lg font-medium text-gray-900">{{ t("episodeSearch.searchResults") }}</h3>
            <p class="text-sm text-gray-500">{{ t("episodeSearch.podcastsFound", results.length) }}</p>
        </div>

        <div class="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            <div
                v-for="(result, index) in results"
                :key="index"
                class="p-3 sm:p-4"
            >
                <div class="flex space-x-3 sm:space-x-4">
                    <!-- Artwork -->
                    <div class="flex-shrink-0">
                        <img
                            v-if="result.artwork"
                            :src="result.artwork"
                            alt=""
                            class="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover border border-gray-200"
                            @error="handleImageError($event, result)"
                        />
                        <div
                            v-else
                            class="w-12 h-12 sm:w-16 sm:h-16 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center"
                        >
                            <Icon icon="ion:musical-notes-outline" class="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                        <h4 class="text-sm sm:text-base font-medium text-gray-900 line-clamp-2 leading-tight">
                            {{ result.episodeTitle }}
                        </h4>
                        <p class="text-xs sm:text-sm text-gray-600 line-clamp-1 mt-0.5">
                            {{ result.podcastTitle }}{{ result.creator ? ` • ${result.creator}` : '' }}
                        </p>

                        <div class="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-gray-500">
                            <span v-if="result.date" class="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 rounded-full">
                                <Icon icon="ion:calendar-outline" class="w-3 h-3 mr-1" />
                                {{ formatDate(result.date) }}
                            </span>
                            <span v-if="result.genre" class="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 rounded-full">
                                <Icon icon="ion:musical-notes-outline" class="w-3 h-3 mr-1" />
                                {{ result.genre }}
                            </span>
                        </div>
                    </div>

                    <!-- Action -->
                    <div class="flex-shrink-0 flex items-center">
                        <button
                            @click="$emit('select', result)"
                            class="px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
                        >
                            {{ t("common.create") }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="text-center py-8">
            <Icon icon="ion:sync-outline" class="w-8 h-8 mx-auto text-gray-400 animate-spin mb-2" />
            <p class="text-gray-500">{{ t("episodeSearch.searching") }}</p>
        </div>

        <!-- Empty state -->
        <div v-if="!loading && results.length === 0" class="text-center py-8">
            <Icon icon="ion:search-outline" class="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p class="text-gray-500">{{ t("episodeSearch.noResults") }}</p>
            <p class="text-sm text-gray-400 mt-1">{{ t("episodeSearch.tryDifferentKeywords") }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import type { PodcastEpisodeSearchResult } from "@/lib/graphql";

const { t, locale } = useI18n();

defineProps<{
    results: PodcastEpisodeSearchResult[];
    loading?: boolean;
}>();

defineEmits<{
    select: [result: PodcastEpisodeSearchResult];
}>();

// Format release date
function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString(locale.value, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return t("episodeSearch.unknownDate");
    }
}

// Handle broken images - replace with icon fallback
function handleImageError(event: Event, result: PodcastEpisodeSearchResult) {
    const img = event.target as HTMLImageElement;
    const container = img.parentElement;
    if (container) {
        container.innerHTML = `
            <div class="w-12 h-12 sm:w-16 sm:h-16 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM21 16c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"></path>
                </svg>
            </div>
        `;
    }
}
</script>

<style scoped>
/* Additional styles for hover effects and transitions */
.podcast-search-results {
    animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Line clamp utilities for text truncation */
.line-clamp-1 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    overflow: hidden;
}

.line-clamp-2 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
}
</style>