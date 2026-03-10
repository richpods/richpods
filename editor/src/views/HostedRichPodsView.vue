<template>
    <div class="min-h-full bg-gray-50 py-4 sm:py-6">
        <div class="max-w-4xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6">
            <header class="flex items-start justify-between">
                <div>
                    <h1 class="text-xl sm:text-2xl font-bold text-gray-900">
                        {{ t("hosted.title") }}
                    </h1>
                    <p class="mt-1 text-sm text-gray-600">
                        {{ t("hosted.subtitle") }}
                    </p>
                </div>
                <button
                    @click="router.push('/hosted/create')"
                    class="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                    <Icon icon="ion:add-outline" class="w-5 h-5" />
                    {{ t("hosted.createPodcast") }}
                </button>
            </header>

            <!-- Mobile create button -->
            <button
                @click="router.push('/hosted/create')"
                class="sm:hidden w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
                <Icon icon="ion:add-outline" class="w-5 h-5" />
                {{ t("hosted.createPodcast") }}
            </button>

            <!-- Loading state -->
            <div v-if="loading" class="flex justify-center py-12">
                <div class="text-gray-500">{{ t("hosted.loadingPodcasts") }}</div>
            </div>

            <!-- Error state -->
            <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
                <p class="text-red-800">{{ error }}</p>
                <button @click="loadPodcasts" class="mt-2 text-red-600 hover:text-red-800">
                    {{ t("common.tryAgain") }}
                </button>
            </div>

            <!-- Empty state -->
            <div
                v-else-if="podcasts.length === 0"
                class="bg-white rounded-lg shadow text-center py-12"
            >
                <Icon
                    icon="ion:mic-outline"
                    class="w-12 h-12 mx-auto text-gray-400 mb-3"
                />
                <p class="text-gray-500">{{ t("hosted.noPodcastsYet") }}</p>
                <p class="text-sm text-gray-400 mt-1">{{ t("hosted.noPodcastsHint") }}</p>
            </div>

            <!-- Podcast list -->
            <div v-else class="space-y-4">
                <div
                    v-for="podcast in podcasts"
                    :key="podcast.id"
                    class="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6"
                >
                    <div class="flex gap-4">
                        <!-- Cover image -->
                        <img
                            :src="podcast.coverImageUrl"
                            :alt="podcast.title"
                            class="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover flex-shrink-0"
                        />

                        <!-- Info -->
                        <div class="flex-1 min-w-0">
                            <h2 class="text-lg font-semibold text-gray-900 truncate">
                                {{ podcast.title }}
                            </h2>
                            <p class="text-sm text-gray-600 mt-1 line-clamp-2">
                                {{ podcast.description }}
                            </p>
                            <div class="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                                <span>{{ podcast.itunesCategory }}</span>
                                <span>&middot;</span>
                                <span>{{ podcast.episodeCount }} {{ podcast.episodeCount === 1 ? t("hosted.episodeSingular") : t("hosted.episodePlural") }}</span>
                                <span>&middot;</span>
                                <span>{{ podcast.language }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Feed URL (only shown when episodes exist) -->
                    <div v-if="podcast.episodeCount > 0" class="mt-4 flex items-center gap-2 bg-gray-50 rounded-md px-3 py-2">
                        <Icon icon="ion:link-outline" class="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <code class="text-xs text-gray-600 truncate flex-1">{{ podcast.feedUrl }}</code>
                        <button
                            @click="copyFeedUrl(podcast.feedUrl)"
                            class="text-gray-500 hover:text-gray-700 flex-shrink-0"
                            :title="t('hosted.copyFeedUrl')"
                        >
                            <Icon icon="ion:copy-outline" class="w-4 h-4" />
                        </button>
                    </div>

                    <!-- Actions -->
                    <div class="mt-4 flex flex-wrap gap-2">
                        <button
                            @click="router.push(`/hosted/${podcast.id}/add-episode`)"
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
                        >
                            <Icon icon="ion:add-outline" class="w-4 h-4" />
                            {{ t("hosted.addEpisode") }}
                        </button>
                        <button
                            @click="router.push(`/hosted/${podcast.id}/edit`)"
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                            <Icon icon="ion:create-outline" class="w-4 h-4" />
                            {{ t("hosted.editPodcast") }}
                        </button>
                        <button
                            @click="handleDelete(podcast)"
                            :disabled="podcast.episodeCount > 0"
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-700 disabled:hover:border-gray-300"
                            :title="podcast.episodeCount > 0 ? t('hosted.deleteHasEpisodes') : t('hosted.deletePodcast')"
                        >
                            <Icon icon="ion:trash-outline" class="w-4 h-4" />
                            {{ t("hosted.deletePodcast") }}
                        </button>
                    </div>
                </div>

                <!-- Load more -->
                <div v-if="hasMore" class="text-center py-4">
                    <button
                        @click="loadMore"
                        :disabled="loadingMore"
                        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        {{ loadingMore ? t("common.loadingMore") : t("common.loadMore") }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import { graphqlSdk, DEFAULT_PAGE_SIZE, type HostedPodcastsQuery } from "@/lib/graphql";

const { t } = useI18n();
const router = useRouter();

type HostedPodcast = HostedPodcastsQuery["hostedPodcasts"]["items"][0];

const podcasts = ref<HostedPodcast[]>([]);
const loading = ref(false);
const error = ref("");
const nextCursor = ref<string | null>(null);
const loadingMore = ref(false);

const hasMore = computed(() => nextCursor.value !== null);

async function loadMore() {
    if (!nextCursor.value || loadingMore.value) return;
    loadingMore.value = true;
    try {
        const response = await graphqlSdk.HostedPodcasts({
            first: DEFAULT_PAGE_SIZE,
            after: nextCursor.value,
        });
        podcasts.value = [...podcasts.value, ...response.hostedPodcasts.items];
        nextCursor.value = response.hostedPodcasts.nextCursor ?? null;
    } catch (err: unknown) {
        console.error("Error loading more hosted podcasts:", err);
        await loadPodcasts();
    } finally {
        loadingMore.value = false;
    }
}

async function loadPodcasts() {
    loading.value = true;
    error.value = "";

    try {
        const response = await graphqlSdk.HostedPodcasts({ first: DEFAULT_PAGE_SIZE });
        podcasts.value = response.hostedPodcasts.items;
        nextCursor.value = response.hostedPodcasts.nextCursor ?? null;
    } catch (err: unknown) {
        console.error("Error loading hosted podcasts:", err);
        error.value = err instanceof Error ? err.message : t("hosted.loadFailed");
    } finally {
        loading.value = false;
    }
}

async function handleDelete(podcast: HostedPodcast) {
    if (podcast.episodeCount > 0) {
        alert(t("hosted.deleteHasEpisodes"));
        return;
    }

    if (!confirm(t("hosted.deleteConfirm"))) {
        return;
    }

    try {
        await graphqlSdk.DeleteHostedPodcast({ id: podcast.id });
        podcasts.value = podcasts.value.filter((p) => p.id !== podcast.id);
    } catch (err: unknown) {
        console.error("Error deleting hosted podcast:", err);
        alert(err instanceof Error ? err.message : t("hosted.deleteFailed"));
    }
}

function copyFeedUrl(feedUrl: string) {
    navigator.clipboard.writeText(feedUrl).then(() => {
        alert(t("hosted.feedUrlCopied"));
    });
}

onMounted(() => {
    loadPodcasts();
});
</script>

<style lang="scss" scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
