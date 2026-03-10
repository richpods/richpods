<template>
    <div class="min-h-full bg-gray-50 py-4 sm:py-6">
        <div class="max-w-4xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6">
        <header>
            <h1 class="text-xl sm:text-2xl font-bold text-gray-900">{{ t("episodeSearch.title") }}</h1>
            <p class="mt-1 sm:mt-2 text-sm text-gray-600">{{ t("episodeSearch.subtitle") }}</p>
        </header>

        <!-- Tab Selection -->
        <div>
            <div class="border-b border-gray-200">
                <nav class="-mb-px flex space-x-4 sm:space-x-8">
                    <button
                        v-if="isPrivileged"
                        @click="activeTab = 'hosted'"
                        :class="[
                            'py-2 px-1 border-b-2 font-medium text-sm',
                            activeTab === 'hosted'
                                ? 'border-gray-900 text-gray-900'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                        ]"
                    >
                        <Icon icon="ion:mic-outline" class="w-5 h-5 mr-2 inline" />
                        {{ t("episodeSearch.hostedRichPods") }}
                    </button>
                    <button
                        @click="activeTab = 'myPodcasts'"
                        :class="[
                            'py-2 px-1 border-b-2 font-medium text-sm',
                            activeTab === 'myPodcasts'
                                ? 'border-gray-900 text-gray-900'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                        ]"
                    >
                        <Icon icon="ion:albums-outline" class="w-5 h-5 mr-2 inline" />
                        {{ t("episodeSearch.myPodcasts") }}
                    </button>
                    <button
                        @click="activeTab = 'search'"
                        :class="[
                            'py-2 px-1 border-b-2 font-medium text-sm',
                            activeTab === 'search'
                                ? 'border-gray-900 text-gray-900'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                        ]"
                    >
                        <Icon icon="ion:search-outline" class="w-5 h-5 mr-2 inline" />
                        {{ t("episodeSearch.searchPodcasts") }}
                    </button>
                    <button
                        @click="activeTab = 'manual'"
                        :class="[
                            'py-2 px-1 border-b-2 font-medium text-sm',
                            activeTab === 'manual'
                                ? 'border-gray-900 text-gray-900'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                        ]"
                    >
                        <Icon icon="ion:link-outline" class="w-5 h-5 mr-2 inline" />
                        {{ t("episodeSearch.manualUrl") }}
                    </button>
                </nav>
            </div>
        </div>

        <!-- Hosted RichPods Tab -->
        <div v-if="activeTab === 'hosted'">
            <HostedPodcastsList />
        </div>

        <!-- My Podcasts Tab -->
        <div v-if="activeTab === 'myPodcasts'">
            <MyPodcastEpisodes @select="handleEpisodeSelect" />
        </div>

        <!-- Search Tab -->
        <div v-if="activeTab === 'search'" class="space-y-6">
            <div class="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div class="flex-1">
                        <label for="search-query" class="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                            {{ t("episodeSearch.searchLabel") }}
                        </label>
                        <input
                            id="search-query"
                            v-model="searchQuery"
                            type="text"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="t('episodeSearch.searchPlaceholder')"
                            @keyup.enter="handleSearch"
                        />
                    </div>
                    <div class="sm:flex-shrink-0">
                        <label class="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">{{ t("episodeSearch.country") }}</label>
                        <select
                            v-model="searchCountry"
                            class="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="AT">{{ t("episodeSearch.austria") }}</option>
                            <option value="DE">{{ t("episodeSearch.germany") }}</option>
                            <option value="US">{{ t("episodeSearch.unitedStates") }}</option>
                            <option value="GB">{{ t("episodeSearch.unitedKingdom") }}</option>
                        </select>
                    </div>
                </div>
                <div class="mt-4 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3">
                    <p class="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                        {{ t("episodeSearch.searchPoweredBy") }}
                    </p>
                    <button
                        @click="handleSearch"
                        :disabled="!searchQuery.trim() || searchLoading"
                        class="w-full sm:w-auto px-6 py-2.5 sm:py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Icon
                            v-if="searchLoading"
                            icon="ion:sync-outline"
                            class="w-5 h-5 mr-2 inline animate-spin"
                        />
                        <Icon v-else icon="ion:search-outline" class="w-5 h-5 mr-2 inline" />
                        {{ searchLoading ? t("episodeSearch.searching") : t("common.search") }}
                    </button>
                </div>
            </div>

            <!-- Search Results -->
            <div v-if="searchResults.length > 0">
                <PodcastSearchResults
                    :results="searchResults"
                    :loading="searchLoading"
                    @select="handleEpisodeSelect"
                />
            </div>

            <!-- Search Error -->
            <div v-if="searchError" class="bg-red-50 border border-red-200 rounded-lg p-4">
                <p class="text-red-800">{{ searchError }}</p>
                <button @click="handleSearch" class="mt-2 text-red-600 hover:text-red-800">
                    {{ t("common.tryAgain") }}
                </button>
            </div>
        </div>

        <!-- Manual URL Tab -->
        <div v-if="activeTab === 'manual'" class="space-y-6">
            <div class="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div class="space-y-4">
                    <div>
                        <label for="manual-url" class="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                            {{ t("episodeSearch.feedUrlLabel") }}
                        </label>
                        <input
                            id="manual-url"
                            v-model="manualUrl"
                            type="url"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="t('episodeSearch.feedUrlPlaceholder')"
                            @keyup.enter="handleManualSubmit"
                        />
                        <p class="text-xs sm:text-sm text-gray-500 mt-1">
                            {{ t("episodeSearch.feedUrlHint") }}
                        </p>
                    </div>
                    <div class="flex sm:justify-end">
                    <button
                        @click="handleManualSubmit"
                        :disabled="!manualUrl.trim() || manualLoading"
                        class="w-full sm:w-auto px-6 py-2.5 sm:py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Icon
                            v-if="manualLoading"
                            icon="ion:sync-outline"
                            class="w-5 h-5 mr-2 inline animate-spin"
                        />
                        <Icon v-else icon="ion:checkmark-outline" class="w-5 h-5 mr-2 inline" />
                        {{ manualLoading ? t("episodeSearch.processing") : t("episodeSearch.extractEpisodes") }}
                    </button>
                    </div>
                </div>
            </div>

            <!-- Manual Episodes List -->
            <div v-if="manualEpisodes.length > 0">
                <PodcastEpisodeList
                    :episodes="manualEpisodes"
                    :loading="manualLoading"
                    @select="handleEpisodeSelect"
                />
            </div>

            <!-- Manual Error -->
            <div v-if="manualError" class="bg-red-50 border border-red-200 rounded-lg p-4">
                <p class="text-red-800">{{ manualError }}</p>
                <button @click="handleManualSubmit" class="mt-2 text-red-600 hover:text-red-800">
                    {{ t("common.tryAgain") }}
                </button>
            </div>
        </div>
        </div>

        <!-- Error Dialog -->
        <dialog
            ref="errorDialog"
            class="rounded-xl border-0 shadow-2xl p-0 max-w-md w-full backdrop:bg-black/50"
            @click.self="closeErrorDialog"
        >
            <div class="p-6">
                <div class="flex items-center gap-3 mb-4">
                    <div class="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <Icon icon="ion:alert-circle-outline" class="w-6 h-6 text-red-600" />
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900">
                        {{ t("episodeSearch.episodeImportError") }}
                    </h3>
                </div>
                <p class="text-sm text-gray-700 leading-relaxed">{{ episodeError }}</p>
                <div class="mt-6 flex justify-end">
                    <button
                        @click="closeErrorDialog"
                        class="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium text-sm"
                    >
                        {{ t("episodeSearch.close") }}
                    </button>
                </div>
            </div>
        </dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import { graphqlSdk } from "@/lib/graphql";
import type { PodcastEpisodeSearchResult } from "@/lib/graphql";
import { useCurrentUserRole } from "@/composables/useCurrentUserRole";
import PodcastSearchResults from "./PodcastSearchResults.vue";
import PodcastEpisodeList from "./PodcastEpisodeList.vue";
import MyPodcastEpisodes from "./MyPodcastEpisodes.vue";
import HostedPodcastsList from "./hosted/HostedPodcastsList.vue";

const { t } = useI18n();
const router = useRouter();
const { hasPrivilegedRole } = useCurrentUserRole();

const isPrivileged = computed(() => hasPrivilegedRole());

// Tab management
type TabId = "hosted" | "myPodcasts" | "search" | "manual";
const activeTab = ref<TabId>(isPrivileged.value ? "hosted" : "myPodcasts");

// Search functionality
const searchQuery = ref("");
const searchCountry = ref("AT");
const searchResults = ref<PodcastEpisodeSearchResult[]>([]);
const searchLoading = ref(false);
const searchError = ref("");

// Error dialog
const errorDialog = ref<HTMLDialogElement | null>(null);
const episodeError = ref("");

function showErrorDialog(message: string) {
    episodeError.value = message;
    errorDialog.value?.showModal();
}

function closeErrorDialog() {
    errorDialog.value?.close();
}

// Manual URL functionality
const manualUrl = ref("");
const manualEpisodes = ref<any[]>([]);
const manualLoading = ref(false);
const manualError = ref("");

// Get browser locale for default country
function getBrowserLocale() {
    const lang = navigator.language || navigator.languages?.[0] || "de-AT";
    const [language, country] = lang.split("-");
    return {
        language: language.toLowerCase(),
        country: country?.toUpperCase() || "AT",
    };
}

// Initialize with browser locale
const locale = getBrowserLocale();
searchCountry.value = locale.country;

// Handle podcast search
async function handleSearch() {
    if (!searchQuery.value.trim()) return;

    searchLoading.value = true;
    searchError.value = "";
    searchResults.value = [];

    try {
        const response = await graphqlSdk.PodcastEpisodeSearch({
            query: searchQuery.value.trim(),
            country: searchCountry.value,
            language: locale.language,
        });

        searchResults.value = response.podcastEpisodeSearch;

        if (searchResults.value.length === 0) {
            searchError.value = t("episodeSearch.noPodcastsFound");
        }
    } catch (error: any) {
        console.error("Search error:", error);
        searchError.value = error.message || t("episodeSearch.searchFailed");
    } finally {
        searchLoading.value = false;
    }
}

// Handle manual URL submission
async function handleManualSubmit() {
    if (!manualUrl.value.trim()) return;

    manualLoading.value = true;
    manualError.value = "";
    manualEpisodes.value = [];

    try {
        // First try to extract feed URL if needed
        let feedUrl = manualUrl.value.trim();
        
        try {
            const extractResponse = await graphqlSdk.ExtractFeedUrl({ url: feedUrl });
            feedUrl = extractResponse.extractFeedUrl;
        } catch (extractError) {
            console.log("Direct feed URL or extraction failed, trying as is");
        }

        // Get podcast metadata to extract episodes
        const metadataResponse = await graphqlSdk.PodcastMetadata({ 
            feedUrl,
            episodeGuid: undefined 
        });

        // Map all episodes from the podcast feed
        const podcastMeta = metadataResponse.podcastMetadata.podcast;
        manualEpisodes.value = metadataResponse.podcastMetadata.episodes.map(episode => ({
            guid: episode.guid,
            episodeGuid: episode.guid,  // Add this for compatibility
            title: episode.title,
            description: t("episodeSearch.episodeFromPodcast", {
                title: podcastMeta.title,
            }),
            feedUrl,
            artwork: episode.artwork,
            podcastArtwork: podcastMeta.artwork,
            podcastTitle: podcastMeta.title,
            podcastLink: podcastMeta.link,
            publicationDate: episode.publicationDate,
            url: episode.url,
            type: episode.type,
            length: episode.length,
            checksum: episode.checksum,
            link: episode.link,
        }));

    } catch (error: any) {
        console.error("Manual URL error:", error);
        const gqlMessage = error?.response?.errors?.[0]?.message;
        manualError.value = gqlMessage || error.message || t("episodeSearch.manualUrlFailed");
    } finally {
        manualLoading.value = false;
    }
}

// Handle episode selection from either search or manual
async function handleEpisodeSelect(episode: any) {
    try {
        let feedUrl = episode.feedUrl;
        let episodeGuid = episode.episodeGuid || episode.guid;
        
        // Fetch RSS metadata for the episode — this is the primary source for artwork
        let rssEpisode: typeof episode | undefined;
        let rssPodcast: { title: string; artwork: string; link: string } | undefined;

        if (!episode.checksum) {
            // iTunes search path: always fetch from RSS
            const metadataResponse = await graphqlSdk.PodcastMetadata({
                feedUrl,
                episodeGuid,
            });
            rssPodcast = metadataResponse.podcastMetadata.podcast;
            rssEpisode = metadataResponse.podcastMetadata.episodes.find(
                ep => ep.guid === episodeGuid
            ) || metadataResponse.podcastMetadata.episodes[0];
        } else {
            // Manual search path: episode already has RSS data
            rssEpisode = episode;
            rssPodcast = {
                title: episode.podcastTitle,
                artwork: episode.podcastArtwork || "",
                link: episode.podcastLink || "",
            };
        }

        // Validate that we have required media information
        if (!rssEpisode.url || !rssEpisode.type || !rssEpisode.checksum) {
            throw new Error(t("episodeSearch.invalidAudioMedia"));
        }

        // Validate that the media is an audio file
        const audioTypes = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/x-m4a'];
        if (!audioTypes.includes(rssEpisode.type.toLowerCase())) {
            throw new Error(
                t("episodeSearch.invalidMediaType", {
                    type: rssEpisode.type,
                }),
            );
        }

        // Artwork priority: RSS feed first, then iTunes/other sources as fallback
        const episodeArtwork = rssEpisode.artwork || episode.artwork || undefined;
        const podcastArtwork = rssPodcast.artwork || episode.artwork || undefined;

        // Create a new RichPod with the episode data
        const richPodResponse = await graphqlSdk.CreateRichPod({
            input: {
                title: rssEpisode.title || episode.episodeTitle,
                description:
                    episode.description ||
                    t("episodeSearch.episodeFromPodcast", { title: episode.podcastTitle }),
                origin: {
                    title: episode.podcastTitle,
                    link: rssPodcast.link || "",
                    feedUrl: episode.feedUrl,
                    artworkUrl: podcastArtwork,
                    episode: {
                        guid: episodeGuid || Date.now().toString(),
                        title: rssEpisode.title || episode.episodeTitle,
                        artworkUrl: episodeArtwork,
                        link: rssEpisode.link || episode.link || "",
                        media: {
                            url: rssEpisode.url,
                            type: rssEpisode.type,
                            length: rssEpisode.length,
                            checksum: rssEpisode.checksum,
                        },
                    },
                },
            },
        });

        // Navigate to editor with new RichPod
        router.push(`/edit/${richPodResponse.createRichPod.id}`);

    } catch (error: unknown) {
        console.warn("Error creating RichPod:", error);
        const err = error as Record<string, unknown>;
        const response = err?.response as Record<string, unknown> | undefined;
        const errors = response?.errors as Array<{ message: string }> | undefined;
        const gqlMessage = errors?.[0]?.message;
        const fallback = (err?.message as string) || t("episodeSearch.createRichPodFailed");
        showErrorDialog(gqlMessage || fallback);
    }
}
</script>
