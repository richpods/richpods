<template>
    <div class="podcast-episode-list">
        <div class="mb-4">
            <h3 class="text-lg font-medium text-gray-900">{{ t("episodeSearch.availableEpisodes") }}</h3>
            <p class="text-sm text-gray-500">{{ t("episodeSearch.selectEpisode") }}</p>
        </div>

        <div class="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            <div
                v-for="episode in episodes"
                :key="episode.guid"
                class="p-3 sm:p-4"
            >
                <div class="flex space-x-3 sm:space-x-4">
                    <!-- Episode artwork -->
                    <div class="flex-shrink-0">
                        <img
                            v-if="episode.artwork"
                            :src="episode.artwork"
                            :alt="t('episodeSearch.episodeArtworkAlt', { title: episode.title })"
                            class="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover border border-gray-200"
                            @error="handleImageError"
                        />
                        <div
                            v-else
                            class="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center"
                        >
                            <Icon icon="ion:musical-notes-outline" class="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                        </div>
                    </div>

                    <!-- Episode content -->
                    <div class="flex-1 min-w-0">
                        <h4 class="text-sm sm:text-base font-medium text-gray-900 line-clamp-2">
                            {{ episode.title }}
                        </h4>
                        <p v-if="episode.podcastTitle" class="text-xs sm:text-sm text-gray-600 truncate mt-0.5">
                            {{ episode.podcastTitle }}
                        </p>

                        <div v-if="episode.description" class="mt-1.5 hidden sm:block">
                            <p class="text-sm text-gray-600 line-clamp-2">
                                {{ episode.description }}
                            </p>
                        </div>

                        <div class="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-gray-500">
                            <span
                                v-if="episode.publicationDate"
                                class="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 rounded-full"
                            >
                                <Icon icon="ion:calendar-outline" class="w-3 h-3 mr-1" />
                                {{ formatDate(episode.publicationDate) }}
                            </span>
                            <span
                                v-if="episode.duration"
                                class="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 rounded-full"
                            >
                                <Icon icon="ion:time-outline" class="w-3 h-3 mr-1" />
                                {{ formatDuration(episode.duration) }}
                            </span>
                            <span
                                v-if="episode.type"
                                class="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 rounded-full"
                            >
                                <Icon icon="ion:play-outline" class="w-3 h-3 mr-1" />
                                {{ formatMediaType(episode.type) }}
                            </span>
                        </div>

                        <div class="mt-1.5 flex space-x-2 text-xs sm:text-sm">
                            <a
                                v-if="episode.link"
                                :href="episode.link"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-blue-600 hover:text-blue-800 inline-flex items-center"
                            >
                                <Icon icon="ion:open-outline" class="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                                {{ t("episodeSearch.episodeLink") }}
                            </a>
                            <a
                                v-if="episode.url"
                                :href="episode.url"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-blue-600 hover:text-blue-800 inline-flex items-center"
                            >
                                <Icon icon="ion:download-outline" class="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                                {{ t("episodeSearch.audioFile") }}
                            </a>
                        </div>
                    </div>

                    <!-- Action -->
                    <div class="flex-shrink-0 flex items-center">
                        <button
                            @click="$emit('select', episode)"
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
            <p class="text-gray-500">{{ t("episodeSearch.loadingEpisodes") }}</p>
        </div>

        <!-- Empty state -->
        <div v-if="!loading && episodes.length === 0" class="text-center py-8">
            <Icon icon="ion:document-outline" class="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p class="text-gray-500">{{ t("episodeSearch.noEpisodes") }}</p>
            <p class="text-sm text-gray-400 mt-1">{{ t("episodeSearch.feedEmptyOrUnavailable") }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";

const { t, locale } = useI18n();

interface Episode {
    guid: string;
    title: string;
    description?: string;
    podcastTitle?: string;
    artwork?: string;
    link?: string;
    url?: string;
    type?: string;
    publicationDate?: string;
    duration?: number;
    feedUrl?: string;
}

defineProps<{
    episodes: Episode[];
    loading?: boolean;
}>();

defineEmits<{
    select: [episode: Episode];
}>();

// Format publication date
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

// Format duration from seconds to human readable
function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return t("episodeSearch.durationHoursMinutes", { hours, minutes });
    } else if (minutes > 0) {
        return t("episodeSearch.durationMinutes", { minutes });
    } else {
        return t("episodeSearch.durationSeconds", { seconds });
    }
}

// Format media type to be more user-friendly
function formatMediaType(type: string): string {
    const typeMap: Record<string, string> = {
        "audio/mpeg": "MP3",
        "audio/mp3": "MP3", 
        "audio/mp4": "MP4",
        "audio/m4a": "M4A",
        "audio/wav": "WAV",
        "audio/ogg": "OGG",
        "audio/aac": "AAC",
        "audio/flac": "FLAC",
    };
    
    return typeMap[type.toLowerCase()] || type.toUpperCase();
}

// Handle broken images
function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yOCAyMEMzMC4yMDkxIDIwIDMyIDIxLjc5MDkgMzIgMjRDMzIgMjYuMjA5MSAzMC4yMDkxIDI4IDI4IDI4QzI1Ljc5MDkgMjggMjQgMjYuMjA5MSAyNCAyNEMyNCAyMS43OTA5IDI1Ljc5MDkgMjAgMjggMjBaIiBmaWxsPSIjOTlBM0FGIi8+CjxwYXRoIGQ9Ik0yMCAzNkwyNCAxNkw0MCAyOEw0NCAzMkw0NCA0NEwyMCA0NFYzNloiIGZpbGw9IiM5OUEzQUYiLz4KPC9zdmc+";
}
</script>

<style scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* Animation for episode list */
.podcast-episode-list {
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
</style>