<template>
    <div class="space-y-3">
        <!-- Loading -->
        <div v-if="loading" class="text-center py-6">
            <Icon icon="ion:sync-outline" class="w-6 h-6 mx-auto text-gray-400 animate-spin" />
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-3">
            <p class="text-red-800 text-sm">{{ error }}</p>
        </div>

        <!-- Empty -->
        <div v-else-if="episodes.length === 0" class="text-center py-6">
            <p class="text-sm text-gray-500">{{ t("hostedEpisodes.noEpisodes") }}</p>
        </div>

        <!-- Episode list -->
        <div v-else class="space-y-4">
            <component
                :is="episode.richPodId ? RouterLink : 'div'"
                v-for="episode in episodes"
                :key="episode.id"
                :to="episode.richPodId ? `/edit/${episode.richPodId}` : undefined"
                class="border border-gray-200 rounded-lg p-4 block"
                :class="episode.richPodId ? 'hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer' : ''"
            >
                <!-- Episode header row -->
                <div class="flex items-start gap-3">
                    <!-- Cover or placeholder -->
                    <div class="flex-shrink-0">
                        <img
                            v-if="episode.episodeCoverUrl"
                            :src="episode.episodeCoverUrl"
                            alt=""
                            class="w-12 h-12 rounded object-cover border border-gray-200"
                        />
                        <div
                            v-else
                            class="w-12 h-12 rounded border border-gray-200 bg-gray-50 flex items-center justify-center"
                        >
                            <Icon icon="ion:musical-notes-outline" class="w-5 h-5 text-gray-400" />
                        </div>
                    </div>

                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 truncate">
                            {{ episode.richPodTitle || t("hostedEpisodes.untitledEpisode") }}
                        </p>

                        <!-- Status badges -->
                        <div class="flex items-center gap-2 mt-1">
                            <span
                                v-if="episode.validationStatus === 'valid'"
                                class="inline-flex items-center px-1.5 py-0.5 text-xs rounded-full bg-green-100 text-green-800"
                            >
                                {{ t("hostedEpisodes.valid") }}
                            </span>
                            <span
                                v-else-if="episode.validationStatus === 'invalid'"
                                class="inline-flex items-center px-1.5 py-0.5 text-xs rounded-full bg-red-100 text-red-800"
                                :title="episode.validationError || ''"
                            >
                                {{ t("hostedEpisodes.invalid") }}
                            </span>
                            <span
                                v-else
                                class="inline-flex items-center px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800"
                            >
                                {{ t("hostedEpisodes.pending") }}
                            </span>

                            <span v-if="episode.audioDurationSeconds" class="text-xs text-gray-500">
                                {{ formatDuration(episode.audioDurationSeconds) }}
                            </span>
                        </div>
                    </div>

                    <!-- Delete button (only for orphaned episodes without a RichPod) -->
                    <div v-if="mode === 'full' && !episode.richPodId" class="flex-shrink-0 flex items-center gap-1">
                        <button
                            @click.prevent="handleDeleteEpisode(episode)"
                            :disabled="deletingEpisodeId === episode.id"
                            class="inline-flex items-center p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                            :title="t('hostedEpisodes.deleteEpisode')"
                        >
                            <Icon icon="ion:trash-outline" class="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <!-- Recovery: Create RichPod button for valid episodes without a RichPod -->
                <div
                    v-if="episode.validationStatus === 'valid' && !episode.richPodId"
                    class="mt-3 ml-15 flex justify-end"
                >
                    <button
                        @click.prevent="handleRecoverRichPod(episode)"
                        :disabled="recoveringRichPodFor === episode.id"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        <Icon
                            v-if="recoveringRichPodFor === episode.id"
                            icon="ion:sync-outline"
                            class="w-3.5 h-3.5 animate-spin"
                        />
                        <Icon v-else icon="ion:add-outline" class="w-3.5 h-3.5" />
                        {{ t("hostedEpisodes.recoverRichPod") }}
                    </button>
                </div>
            </component>
        </div>

        <!-- Load more -->
        <div v-if="hasMore" class="text-center pt-2">
            <button
                @click="loadMoreEpisodes"
                :disabled="loadingMore"
                class="text-xs text-gray-500 hover:text-gray-700"
            >
                {{ loadingMore ? t("common.loadingMore") : t("common.loadMore") }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import { graphqlSdk, type HostedEpisodesQuery } from "@/lib/graphql";
import { auth } from "@/lib/firebase";

const props = withDefaults(
    defineProps<{
        podcastId: string;
        /** "full" shows delete episode action for orphaned episodes; "richpod-only" only shows RichPod actions */
        mode?: "full" | "richpod-only";
    }>(),
    { mode: "full" },
);

const emit = defineEmits<{
    episodeCountChanged: [];
}>();

const { t } = useI18n();
const router = useRouter();

type Episode = HostedEpisodesQuery["hostedEpisodes"]["items"][0];

const episodes = ref<Episode[]>([]);
const loading = ref(true);
const error = ref("");
const nextCursor = ref<string | null>(null);
const loadingMore = ref(false);
const deletingEpisodeId = ref<string | null>(null);
const recoveringRichPodFor = ref<string | null>(null);

const hasMore = computed(() => nextCursor.value !== null);

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${m}:${String(s).padStart(2, "0")}`;
}

function getApiBaseUrl(): string {
    const graphqlEndpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT as string;
    return new URL(graphqlEndpoint).origin;
}

async function getAuthToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error("Authentication required");
    return user.getIdToken();
}

async function loadEpisodes() {
    loading.value = true;
    error.value = "";
    try {
        const response = await graphqlSdk.HostedEpisodes({
            podcastId: props.podcastId,
            first: 10,
        });
        episodes.value = response.hostedEpisodes.items;
        nextCursor.value = response.hostedEpisodes.nextCursor ?? null;
    } catch (err: unknown) {
        error.value = err instanceof Error ? err.message : "Failed to load episodes";
    } finally {
        loading.value = false;
    }
}

async function loadMoreEpisodes() {
    if (!nextCursor.value || loadingMore.value) return;
    loadingMore.value = true;
    try {
        const response = await graphqlSdk.HostedEpisodes({
            podcastId: props.podcastId,
            first: 10,
            after: nextCursor.value,
        });
        episodes.value = [...episodes.value, ...response.hostedEpisodes.items];
        nextCursor.value = response.hostedEpisodes.nextCursor ?? null;
    } catch (err: unknown) {
        console.error("Error loading more episodes:", err);
    } finally {
        loadingMore.value = false;
    }
}

// --- Actions ---

async function handleRecoverRichPod(episode: Episode) {
    recoveringRichPodFor.value = episode.id;
    try {
        const token = await getAuthToken();
        const baseUrl = getApiBaseUrl();

        const response = await fetch(
            `${baseUrl}/api/v1/hosted/episode/${episode.id}/richpod`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        if (!response.ok) {
            const body = await response.json().catch(() => ({ error: "Failed to create RichPod" }));
            throw new Error(body.error || "Failed to create RichPod");
        }

        const result = (await response.json()) as { richPodId: string };
        router.push(`/edit/${result.richPodId}`);
    } catch (err: unknown) {
        console.error("Error creating RichPod:", err);
        alert(err instanceof Error ? err.message : "Failed to create RichPod");
    } finally {
        recoveringRichPodFor.value = null;
    }
}

async function handleDeleteEpisode(episode: Episode) {
    if (!confirm(t("hostedEpisodes.deleteConfirm"))) return;

    deletingEpisodeId.value = episode.id;
    try {
        await graphqlSdk.DeleteHostedEpisode({ id: episode.id });
        episodes.value = episodes.value.filter((e) => e.id !== episode.id);
        emit("episodeCountChanged");
    } catch (err: unknown) {
        console.error("Error deleting episode:", err);
        alert(err instanceof Error ? err.message : "Failed to delete episode");
    } finally {
        deletingEpisodeId.value = null;
    }
}

onMounted(() => {
    loadEpisodes();
});
</script>

<style lang="scss" scoped>
.ml-15 {
    margin-left: 3.75rem;
}
</style>
