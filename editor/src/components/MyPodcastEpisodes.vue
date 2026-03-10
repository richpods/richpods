<template>
    <div class="space-y-4">
        <!-- Loading -->
        <div v-if="loading" class="text-center py-12">
            <Icon icon="ion:sync-outline" class="w-8 h-8 mx-auto text-gray-400 animate-spin mb-2" />
            <p class="text-gray-500">{{ t("myPodcastEpisodes.loadingPodcasts") }}</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-red-800">{{ error }}</p>
        </div>

        <!-- No RichPods yet -->
        <div v-else-if="podcasts.length === 0" class="text-center py-12">
            <Icon icon="ion:albums-outline" class="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p class="text-gray-600 font-medium">{{ t("myPodcastEpisodes.noRichPodsTitle") }}</p>
            <p class="text-sm text-gray-400 mt-1">{{ t("myPodcastEpisodes.noRichPodsHint") }}</p>
        </div>

        <!-- Content -->
        <template v-else>
            <!-- Filters -->
            <div class="bg-white rounded-lg border border-gray-200 p-4">
                <div class="flex flex-col sm:flex-row gap-3">
                    <div class="flex-1">
                        <input
                            v-model="searchFilter"
                            type="text"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="t('myPodcastEpisodes.searchPlaceholder')"
                        />
                    </div>
                    <select
                        v-model="verificationFilter"
                        class="px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">{{ t("myPodcastEpisodes.allPodcasts") }}</option>
                        <option value="verified" :disabled="!hasVerifiedPodcasts">
                            {{ t("myPodcastEpisodes.verifiedPodcasts") }}
                        </option>
                        <option value="unverified">
                            {{ t("myPodcastEpisodes.unverifiedPodcasts") }}
                        </option>
                    </select>
                </div>
            </div>

            <!-- Partial load warning -->
            <div v-if="feedErrors.length > 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p class="text-sm text-yellow-800 font-medium">
                    <Icon icon="ion:warning-outline" class="w-4 h-4 inline mr-1" />
                    {{ t("myPodcastEpisodes.partialLoadWarning") }}
                </p>
                <ul class="mt-1.5 space-y-1">
                    <li
                        v-for="(fe, idx) in feedErrors.slice(0, 5)"
                        :key="idx"
                        class="text-sm text-yellow-700"
                    >
                        <strong>{{ fe.podcastTitle }}</strong>:
                        {{ humanReadableError(fe.message) }}
                    </li>
                    <li v-if="feedErrors.length > 5" class="text-sm text-yellow-600 italic">
                        {{ t("myPodcastEpisodes.moreErrors", feedErrors.length - 5) }}
                    </li>
                </ul>
            </div>

            <!-- Episode list -->
            <div v-if="filteredEpisodes.length > 0" class="my-podcast-episodes">
                <div class="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                    <div
                        v-for="episode in filteredEpisodes"
                        :key="`${episode.feedUrl}-${episode.guid}`"
                        class="p-3 sm:p-4"
                    >
                        <div class="flex space-x-3 sm:space-x-4">
                            <!-- Artwork -->
                            <div class="flex-shrink-0">
                                <img
                                    v-if="episode.artwork"
                                    :src="episode.artwork"
                                    alt=""
                                    class="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover border border-gray-200"
                                    @error="handleImageError"
                                />
                                <div
                                    v-else
                                    class="w-12 h-12 sm:w-16 sm:h-16 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center"
                                >
                                    <Icon
                                        icon="ion:musical-notes-outline"
                                        class="w-6 h-6 sm:w-8 sm:h-8 text-gray-400"
                                    />
                                </div>
                            </div>

                            <!-- Content -->
                            <div class="flex-1 min-w-0">
                                <h4
                                    class="text-sm sm:text-base font-medium text-gray-900 line-clamp-2 leading-tight"
                                >
                                    {{ episode.title }}
                                </h4>
                                <p class="text-xs sm:text-sm text-gray-600 line-clamp-1 mt-0.5">
                                    {{ episode.podcastTitle }}
                                </p>

                                <div
                                    class="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-gray-500"
                                >
                                    <span
                                        v-if="episode.publicationDate"
                                        class="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 rounded-full"
                                    >
                                        <Icon icon="ion:calendar-outline" class="w-3 h-3 mr-1" />
                                        {{ formatDate(episode.publicationDate) }}
                                    </span>
                                    <span
                                        v-if="episode.hasRichPod"
                                        class="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 text-blue-800 rounded-full font-medium"
                                    >
                                        {{ t("myPodcastEpisodes.richPodExists", episode.richPodIds.length) }}
                                    </span>
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="flex-shrink-0 w-28 flex flex-col items-stretch justify-center gap-3">
                                <template v-if="episode.hasRichPod">
                                    <RouterLink
                                        :to="`/edit/${episode.richPodIds[0]}`"
                                        class="py-1.5 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors text-center"
                                    >
                                        {{ t("common.edit") }}
                                    </RouterLink>
                                    <button
                                        @click="handleSelect(episode)"
                                        class="py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors text-center"
                                    >
                                        {{ t("myPodcastEpisodes.createAnother") }}
                                    </button>
                                </template>
                                <button
                                    v-else
                                    @click="handleSelect(episode)"
                                    class="py-1.5 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors text-center"
                                >
                                    {{ t("common.create") }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- No matching episodes after filter -->
            <div v-else class="text-center py-8">
                <Icon icon="ion:search-outline" class="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p class="text-gray-500">{{ t("myPodcastEpisodes.noMatchingEpisodes") }}</p>
                <p class="text-sm text-gray-400 mt-1">
                    {{ t("myPodcastEpisodes.noMatchingEpisodesHint") }}
                </p>
            </div>

            <!-- Load more -->
            <div v-if="shouldShowLoadMore" class="text-center mt-4">
                <button
                    @click="loadMore"
                    :disabled="loadingMore"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    {{ loadingMore ? t("common.loadingMore") : t("common.loadMore") }}
                </button>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import { Icon } from "@iconify/vue";
import { graphqlSdk, DEFAULT_PAGE_SIZE, type UserRichPodsQuery } from "@/lib/graphql";

const { t, locale } = useI18n();

const emit = defineEmits<{
    select: [episode: Record<string, unknown>];
}>();

type VerificationFilter = "all" | "verified" | "unverified";

type PodcastFeed = {
    feedUrl: string;
    podcastTitle: string;
    artworkUrl: string | null | undefined;
    verified: boolean;
};

type MergedEpisode = {
    guid: string;
    title: string;
    publicationDate: string;
    artwork: string;
    link: string;
    url: string;
    type: string;
    length: number;
    checksum: string;
    feedUrl: string;
    podcastTitle: string;
    podcastLink: string;
    podcastArtwork: string;
    hasRichPod: boolean;
    richPodIds: string[];
    verified: boolean;
};

const loading = ref(true);
const error = ref("");
type FeedError = { podcastTitle: string; message: string };
const feedErrors = ref<FeedError[]>([]);
const searchFilter = ref("");
const verificationFilter = ref<VerificationFilter>("all");
const podcasts = ref<PodcastFeed[]>([]);
const allEpisodes = ref<MergedEpisode[]>([]);
const guidToRichPodIds = new Map<string, string[]>();
const hasVerifiedPodcasts = ref(false);
const richPodsNextCursor = ref<string | null>(null);
const loadingMore = ref(false);
const fetchedFeedUrls = new Set<string>();

const filteredEpisodes = computed(() => {
    let episodes = allEpisodes.value;

    if (verificationFilter.value === "verified") {
        episodes = episodes.filter((e) => e.verified);
    } else if (verificationFilter.value === "unverified") {
        episodes = episodes.filter((e) => !e.verified);
    }

    if (searchFilter.value.trim()) {
        const q = searchFilter.value.toLowerCase();
        episodes = episodes.filter(
            (e) =>
                e.title.toLowerCase().includes(q) ||
                e.podcastTitle.toLowerCase().includes(q),
        );
    }

    return episodes;
});

const hasMore = computed(() => richPodsNextCursor.value !== null);
const isFilterActive = computed(
    () => verificationFilter.value !== "all" || searchFilter.value.trim().length > 0,
);
const shouldShowLoadMore = computed(
    () => hasMore.value && (filteredEpisodes.value.length > 0 || isFilterActive.value),
);

function isBetterVerified(a: boolean, b: boolean): boolean {
    return a && !b;
}

type RichPodItem = UserRichPodsQuery["userRichPods"]["items"][0];

async function processRichPodsPage(items: RichPodItem[]) {
    // Update guidToRichPodIds incrementally
    for (const rp of items) {
        const guid = rp.origin.episode.guid;
        const ids = guidToRichPodIds.get(guid) ?? [];
        ids.push(rp.id);
        guidToRichPodIds.set(guid, ids);
    }

    // Discover feeds not yet fetched
    const feedMap = new Map<string, PodcastFeed>();
    for (const rp of items) {
        const existing = feedMap.get(rp.origin.feedUrl);
        const verified = rp.origin.verified;
        if (!existing || isBetterVerified(verified, existing.verified)) {
            feedMap.set(rp.origin.feedUrl, {
                feedUrl: rp.origin.feedUrl,
                podcastTitle: rp.origin.title,
                artworkUrl: rp.origin.artworkUrl,
                verified,
            });
        }
    }

    // Also update existing podcasts with better status
    for (const [feedUrl, newPodcast] of feedMap) {
        const existingIdx = podcasts.value.findIndex((p) => p.feedUrl === feedUrl);
        if (existingIdx >= 0) {
            if (isBetterVerified(newPodcast.verified, podcasts.value[existingIdx].verified)) {
                podcasts.value[existingIdx] = newPodcast;
            }
        } else {
            podcasts.value.push(newPodcast);
        }
    }

    hasVerifiedPodcasts.value = podcasts.value.some((p) => p.verified);

    // Fetch episodes only from new feeds
    const newFeeds = Array.from(feedMap.values()).filter((p) => !fetchedFeedUrls.has(p.feedUrl));
    for (const podcast of newFeeds) {
        fetchedFeedUrls.add(podcast.feedUrl);
    }

    if (newFeeds.length > 0) {
        const results = await Promise.allSettled(
            newFeeds.map(async (podcast) => {
                const response = await graphqlSdk.PodcastMetadata({
                    feedUrl: podcast.feedUrl,
                    episodeGuid: undefined,
                });
                return { podcast, metadata: response.podcastMetadata };
            }),
        );

        const newEpisodes: MergedEpisode[] = [];
        const errors: FeedError[] = [];

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const podcast = newFeeds[i];
            if (result.status === "fulfilled") {
                const { metadata } = result.value;
                for (const ep of metadata.episodes) {
                    newEpisodes.push({
                        ...ep,
                        feedUrl: podcast.feedUrl,
                        podcastTitle: metadata.podcast.title || podcast.podcastTitle,
                        podcastLink: metadata.podcast.link,
                        podcastArtwork: metadata.podcast.artwork,
                        hasRichPod: guidToRichPodIds.has(ep.guid),
                        richPodIds: guidToRichPodIds.get(ep.guid) ?? [],
                        verified: podcast.verified,
                    });
                }
            } else {
                errors.push({
                    podcastTitle: podcast.podcastTitle,
                    message: result.reason?.message || "Unknown error",
                });
            }
        }

        feedErrors.value = [...feedErrors.value, ...errors];
        allEpisodes.value = [...allEpisodes.value, ...newEpisodes];
    }

    // Refresh hasRichPod on all existing episodes
    allEpisodes.value = allEpisodes.value.map((ep) => ({
        ...ep,
        hasRichPod: guidToRichPodIds.has(ep.guid),
        richPodIds: guidToRichPodIds.get(ep.guid) ?? [],
    }));

    // Sort by publication date, newest first
    allEpisodes.value.sort(
        (a, b) =>
            new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime(),
    );
}

async function loadMore() {
    if (!richPodsNextCursor.value || loadingMore.value) return;
    loadingMore.value = true;
    try {
        const response = await graphqlSdk.UserRichPods({
            first: DEFAULT_PAGE_SIZE,
            after: richPodsNextCursor.value,
        });
        richPodsNextCursor.value = response.userRichPods.nextCursor ?? null;
        await processRichPodsPage(response.userRichPods.items);
    } catch (err: unknown) {
        console.error("Error loading more RichPods:", err);
    } finally {
        loadingMore.value = false;
    }
}

onMounted(async () => {
    try {
        const response = await graphqlSdk.UserRichPods({ first: DEFAULT_PAGE_SIZE });
        richPodsNextCursor.value = response.userRichPods.nextCursor ?? null;

        if (response.userRichPods.items.length === 0) {
            loading.value = false;
            return;
        }

        await processRichPodsPage(response.userRichPods.items);

        if (hasVerifiedPodcasts.value) {
            verificationFilter.value = "verified";
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        error.value = message || t("myPodcastEpisodes.loadFailed");
    } finally {
        loading.value = false;
    }
});

function handleSelect(episode: MergedEpisode) {
    emit("select", {
        feedUrl: episode.feedUrl,
        guid: episode.guid,
        episodeGuid: episode.guid,
        checksum: episode.checksum,
        url: episode.url,
        type: episode.type,
        length: episode.length,
        title: episode.title,
        podcastTitle: episode.podcastTitle,
        artwork: episode.artwork,
        link: episode.link,
        podcastLink: episode.podcastLink,
        podcast: {
            link: episode.podcastLink,
            artwork: episode.podcastArtwork,
        },
    });
}

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

function humanReadableError(message: string): string {
    if (message.includes("locked by its owner")) {
        return t("myPodcastEpisodes.errorFeedLocked");
    }
    if (message.includes("Not a valid RSS")) {
        return t("myPodcastEpisodes.errorInvalidFeed");
    }
    if (message.includes("No episodes found")) {
        return t("myPodcastEpisodes.errorNoEpisodes");
    }
    return t("myPodcastEpisodes.errorGeneric");
}

function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src =
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiNGM0Y0RjYiLz48cGF0aCBkPSJNMjQgNDRWMjBMMjggMThMNDQgMzBMNDAgMzZMMzYgMzJMMjQgNDRaIiBmaWxsPSIjOUNBM0FGIi8+PGNpcmNsZSBjeD0iMjgiIGN5PSIyNCIgcj0iNCIgZmlsbD0iIzlDQTNBRiIvPjwvc3ZnPg==";
}
</script>

<style lang="scss" scoped>
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

.my-podcast-episodes {
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
