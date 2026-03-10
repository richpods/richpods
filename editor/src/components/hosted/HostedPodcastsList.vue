<template>
    <div class="space-y-4">
        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center py-8">
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
        <div v-else-if="podcasts.length === 0" class="bg-white rounded-lg border border-gray-200 text-center py-10">
            <Icon icon="ion:mic-outline" class="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p class="text-gray-500">{{ t("hosted.noPodcastsYet") }}</p>
            <p class="text-sm text-gray-400 mt-1">{{ t("hosted.noPodcastsHint") }}</p>
            <button
                @click="router.push('/hosted/create')"
                class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
            >
                <Icon icon="ion:add-outline" class="w-4 h-4" />
                {{ t("hosted.createPodcast") }}
            </button>
        </div>

        <!-- Podcast list -->
        <div v-else class="space-y-3">
            <div
                v-for="podcast in podcasts"
                :key="podcast.id"
                class="bg-white rounded-lg border border-gray-200 p-4"
            >
                <div class="flex items-center gap-4">
                    <img
                        :src="podcast.coverImageUrl"
                        :alt="podcast.title"
                        class="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-gray-900 truncate">{{ podcast.title }}</h3>
                        <p class="text-xs text-gray-500 mt-0.5">
                            {{ podcast.episodeCount }}
                            {{
                                podcast.episodeCount === 1
                                    ? t("hosted.episodeSingular")
                                    : t("hosted.episodePlural")
                            }}
                        </p>
                    </div>
                    <button
                        @click="router.push(`/hosted/${podcast.id}/add-episode`)"
                        class="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                        <Icon icon="ion:add-outline" class="w-4 h-4" />
                        {{ t("hosted.addEpisode") }}
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

onMounted(() => {
    loadPodcasts();
});
</script>
