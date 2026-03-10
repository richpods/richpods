<template>
    <div class="drafts-view px-3 py-4 sm:px-6 sm:py-6">
        <div class="mb-6 flex items-center justify-between">
            <div>
                <h1 class="text-xl sm:text-2xl font-bold text-gray-900">{{ t("drafts.title") }}</h1>
                <p class="text-gray-500 mt-1">{{ t("drafts.subtitle") }}</p>
            </div>
            <router-link
                v-if="!loading"
                to="/new-episode"
                class="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium flex items-center gap-2"
            >
                <Icon icon="ion:add-outline" class="w-5 h-5" />
                {{ t("drafts.newRichPod") }}
            </router-link>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center py-12">
            <div class="text-gray-500">{{ t("drafts.loadingDrafts") }}</div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-red-800">{{ error }}</p>
            <button @click="loadRichPods" class="mt-2 text-red-600 hover:text-red-800">
                {{ t("common.tryAgain") }}
            </button>
        </div>

        <!-- Drafts list -->
        <div v-else class="bg-white rounded-lg shadow overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th
                                scope="col"
                                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                {{ t("myRichPods.tableTitle") }}
                            </th>
                            <th
                                scope="col"
                                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                {{ t("myRichPods.tableOriginalPodcast") }}
                            </th>
                            <th
                                scope="col"
                                class="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                {{ t("myRichPods.tableCreated") }}
                            </th>
                            <th
                                scope="col"
                                class="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                {{ t("myRichPods.tableUpdated") }}
                            </th>
                            <th scope="col" class="relative px-6 py-3">
                                <span class="sr-only">{{ t("common.actions") }}</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr
                            v-for="richpod in formattedRichPods"
                            :key="richpod.id"
                            class="hover:bg-gray-50"
                        >
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div>
                                    <div class="text-sm font-medium text-gray-900">
                                        {{ richpod.title }}
                                    </div>
                                    <div class="text-xs text-gray-500 mt-1 line-clamp-2">
                                        {{ richpod.description }}
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <a
                                    v-if="richpod.originalPodcast.link"
                                    :href="richpod.originalPodcast.link"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    @click.stop
                                >
                                    <span class="truncate max-w-[200px]">{{
                                        richpod.originalPodcast.name
                                    }}</span>
                                    <Icon icon="ion:open-outline" class="w-3 h-3 flex-shrink-0" />
                                </a>
                                <span v-else class="text-sm text-gray-500">
                                    {{ richpod.originalPodcast.name }}
                                </span>
                            </td>
                            <td
                                class="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                            >
                                {{ richpod.createdAt }}
                            </td>
                            <td
                                class="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                            >
                                {{ richpod.updatedAt }}
                            </td>
                            <td
                                class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                            >
                                <div class="flex gap-2 justify-end">
                                    <router-link
                                        :to="`/edit/${richpod.id}`"
                                        class="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        :title="t('myRichPods.editRichPod')"
                                    >
                                        <Icon icon="ion:create-outline" class="w-4 h-4" />
                                    </router-link>
                                    <button
                                        @click="handleDelete(richpod.id)"
                                        class="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        :title="t('myRichPods.deleteRichPod')"
                                    >
                                        <Icon icon="ion:trash-outline" class="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
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

            <!-- Empty state -->
            <div v-if="!loading && richPods.length === 0" class="text-center py-12">
                <Icon icon="ion:document-text-outline" class="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p class="text-gray-500">{{ t("drafts.noDrafts") }}</p>
                <p class="text-sm text-gray-400 mt-1">{{ t("drafts.createFirst") }}</p>
                <router-link
                    to="/new-episode"
                    class="mt-4 inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
                >
                    <Icon icon="ion:add-outline" class="w-5 h-5 mr-2" />
                    {{ t("drafts.createFirstRichPod") }}
                </router-link>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import { graphqlSdk, DEFAULT_PAGE_SIZE, type UserRichPodsQuery, RichPodState } from "@/lib/graphql";

const { t, locale } = useI18n();

type RichPod = UserRichPodsQuery["userRichPods"]["items"][0];

const richPods = ref<RichPod[]>([]);
const loading = ref(false);
const error = ref("");
const nextCursor = ref<string | null>(null);
const loadingMore = ref(false);

const formattedRichPods = computed(() => {
    return richPods.value.map((richPod) => ({
        id: richPod.id,
        title: richPod.title,
        description: richPod.description,
        originalPodcast: {
            name: richPod.origin.title || t("myRichPods.unknownPodcast"),
            link: richPod.origin.link,
        },
        createdAt: formatDate(richPod.createdAt),
        updatedAt: formatDate(richPod.updatedAt),
    }));
});

const hasMore = computed(() => nextCursor.value !== null);

async function loadMore() {
    if (!nextCursor.value || loadingMore.value) return;
    loadingMore.value = true;
    try {
        const response = await graphqlSdk.UserRichPods({
            first: DEFAULT_PAGE_SIZE,
            after: nextCursor.value,
            state: RichPodState.Draft,
        });
        richPods.value = [...richPods.value, ...response.userRichPods.items];
        nextCursor.value = response.userRichPods.nextCursor ?? null;
    } catch (err: unknown) {
        console.error("Error loading more drafts:", err);
        await loadRichPods();
    } finally {
        loadingMore.value = false;
    }
}

// Format date for display (same logic as MyPodcasts)
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return diffMinutes === 0
                ? t("dates.justNow")
                : t("dates.minutesAgo", { n: diffMinutes });
        }
        return t("dates.hoursAgo", { n: diffHours });
    } else if (diffDays === 1) {
        return t("dates.yesterday");
    } else if (diffDays < 7) {
        return t("dates.daysAgo", { n: diffDays });
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return t("dates.weeksAgo", weeks);
    } else {
        return date.toLocaleDateString(locale.value, {
            month: "short",
            day: "numeric",
            year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
        });
    }
}

async function loadRichPods() {
    loading.value = true;
    error.value = "";

    try {
        const response = await graphqlSdk.UserRichPods({ first: DEFAULT_PAGE_SIZE, state: RichPodState.Draft, });
        richPods.value = response.userRichPods.items;
        nextCursor.value = response.userRichPods.nextCursor ?? null;
    } catch (err: unknown) {
        console.error("Error loading drafts:", err);
        error.value = err instanceof Error ? err.message : t("drafts.loadFailed");
    } finally {
        loading.value = false;
    }
}

async function handleDelete(id: string) {
    if (!confirm(t("drafts.deleteConfirm"))) {
        return;
    }

    try {
        await graphqlSdk.DeleteRichPod({ id });
        richPods.value = richPods.value.filter((rp) => rp.id !== id);
    } catch (err: unknown) {
        console.error("Error deleting RichPod:", err);
        alert(err instanceof Error ? err.message : t("drafts.deleteFailed"));
    }
}

onMounted(() => {
    loadRichPods();
});
</script>

<style scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>