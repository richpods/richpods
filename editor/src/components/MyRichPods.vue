<template>
    <div class="my-podcasts px-3 py-4 sm:px-6 sm:py-6">
        <div class="mb-6 flex items-start justify-between">
            <div>
                <h1 class="text-xl sm:text-2xl font-bold text-gray-900">{{ t("myRichPods.title") }}</h1>
            </div>
            <button
                @click="createNewRichPod"
                class="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
                <Icon icon="ion:add-outline" class="w-5 h-5" />
                {{ t("myRichPods.createRichPod") }}
            </button>
        </div>

        <!-- Filters -->
        <div class="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center" v-if="richPods.length > 0">
                <!-- Filter input -->
                <div class="relative">
                    <Icon icon="ion:filter-outline" class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        v-model="searchQuery"
                        type="text"
                        :placeholder="t('myRichPods.searchPlaceholder')"
                        class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                    />
                </div>
                
                <!-- Status filter -->
                <select
                    v-model="statusFilter"
                    class="px-3 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="all">{{ t("myRichPods.allStatus") }}</option>
                    <option value="draft">{{ t("myRichPods.draft") }}</option>
                    <option value="published">{{ t("myRichPods.published") }}</option>
                </select>
                
                <!-- Verification filter -->
                <select
                    v-model="verificationFilter"
                    class="px-3 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="all">{{ t("myRichPods.allPodcasts") }}</option>
                    <option value="verified">{{ t("myRichPods.verifiedPodcasts") }}</option>
                    <option value="unverified">{{ t("myRichPods.unverifiedPodcasts") }}</option>
                </select>

                <!-- Date filter -->
                <select
                    v-model="dateFilter"
                    class="px-3 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="all">{{ t("myRichPods.allTime") }}</option>
                    <option value="today">{{ t("myRichPods.today") }}</option>
                    <option value="week">{{ t("myRichPods.thisWeek") }}</option>
                    <option value="month">{{ t("myRichPods.thisMonth") }}</option>
                    <option value="year">{{ t("myRichPods.thisYear") }}</option>
                </select>
            </div>
            
            <div></div>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center py-12">
            <div class="text-gray-500">{{ t("myRichPods.loadingRichPods") }}</div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-red-800">{{ error }}</p>
            <button @click="loadRichPods" class="mt-2 text-red-600 hover:text-red-800">
                {{ t("common.tryAgain") }}
            </button>
        </div>

        <!-- Table -->
        <div v-else class="bg-white rounded-lg shadow overflow-hidden">
            <table class="w-full divide-y divide-gray-200 table-auto">
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
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                            {{ t("myRichPods.tableStatus") }}
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
                        v-for="richpod in filteredRichPods"
                        :key="richpod.id"
                        class="hover:bg-gray-50"
                    >
                        <td class="px-6 py-4 align-top">
                            <router-link :to="`/edit/${richpod.id}`" class="block group/link">
                                <div class="text-sm font-medium text-gray-900 group-hover/link:text-blue-600 break-words">
                                    {{ richpod.title }}
                                </div>
                                <div class="text-xs text-gray-500 group-hover/link:text-blue-500 mt-1 line-clamp-2 break-words">
                                    {{ richpod.description }}
                                </div>
                            </router-link>
                        </td>
                        <td class="px-6 py-4 align-top">
                            <span class="text-sm text-gray-500 break-words">
                                {{ richpod.originalPodcast.name }}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex flex-wrap gap-2">
                                <span
                                    :class="[
                                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                        richpod.status === 'published'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                    ]"
                                >
                                    {{ richpod.status === 'published' ? t("myRichPods.published") : t("myRichPods.draft") }}
                                </span>
                                <span
                                    v-if="richpod.isHosted"
                                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                    {{ t("myRichPods.hosted") }}
                                </span>
                                <span
                                    v-else
                                    :class="[
                                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                        richpod.verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600',
                                    ]"
                                >
                                    {{ richpod.verified ? t("verificationStatus.verified") : t("verificationStatus.unverified") }}
                                </span>
                            </div>
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
                                <a
                                    v-if="richpod.status === 'published' && playerUrlPattern"
                                    :href="playerUrl(richpod.id)"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    :title="t('myRichPods.openPlayer')"
                                >
                                    <Icon icon="ion:play-circle-outline" class="w-4 h-4" />
                                </a>
                                <button
                                    @click="handleEdit(richpod.id)"
                                    class="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    :title="t('myRichPods.editRichPod')"
                                >
                                    <Icon icon="ion:create-outline" class="w-4 h-4" />
                                </button>
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
                <Icon icon="ion:folder-open-outline" class="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p class="text-gray-500">{{ t("myRichPods.noRichPodsYet") }}</p>
                <p class="text-sm text-gray-400 mt-1">{{ t("myRichPods.createFirstRichPod") }}</p>
            </div>
            
            <!-- Filtered empty state -->
            <div v-else-if="!loading && richPods.length > 0 && filteredRichPods.length === 0" class="text-center py-12">
                <Icon icon="ion:search-outline" class="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p class="text-gray-500">{{ t("myRichPods.noRichPodsMatchFilter") }}</p>
                <p class="text-sm text-gray-400 mt-1">{{ t("myRichPods.adjustFilters") }}</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import { graphqlSdk, DEFAULT_PAGE_SIZE, type UserRichPodsQuery } from "@/lib/graphql";

const { t, locale } = useI18n();
const router = useRouter();

type RichPod = UserRichPodsQuery["userRichPods"]["items"][0];

const playerUrlPattern = import.meta.env.VITE_PLAYER_URL_PATTERN as string | undefined;

const richPods = ref<RichPod[]>([]);
const loading = ref(false);
const error = ref("");
const searchQuery = ref("");
const statusFilter = ref("all");
const verificationFilter = ref("all");
const dateFilter = ref("all");
const nextCursor = ref<string | null>(null);
const loadingMore = ref(false);

// Format RichPods for table display
const formattedRichPods = computed(() => {
    return richPods.value.map((richPod) => ({
        id: richPod.id,
        title: richPod.title,
        description: richPod.description,
        status: richPod.state,
        verified: richPod.origin.verified,
        isHosted: richPod.isHosted,
        originalPodcast: {
            name: richPod.origin.title || t("myRichPods.unknownPodcast"),
            link: richPod.origin.link,
        },
        createdAt: formatDate(richPod.createdAt),
        updatedAt: formatDate(richPod.updatedAt),
        createdAtDate: new Date(richPod.createdAt), // Keep original date for filtering
    }));
});

// Filter RichPods based on search, status, and date filters
const filteredRichPods = computed(() => {
    let filtered = formattedRichPods.value;

    // Apply search filter
    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase().trim();
        filtered = filtered.filter(richPod =>
            richPod.title.toLowerCase().includes(query) ||
            richPod.description.toLowerCase().includes(query) ||
            richPod.originalPodcast.name.toLowerCase().includes(query)
        );
    }

    // Apply status filter
    if (statusFilter.value !== "all") {
        filtered = filtered.filter(richPod => richPod.status === statusFilter.value);
    }

    // Apply verification filter
    if (verificationFilter.value === "verified") {
        filtered = filtered.filter(richPod => richPod.verified);
    } else if (verificationFilter.value === "unverified") {
        filtered = filtered.filter(richPod => !richPod.verified);
    }

    // Apply date filter
    if (dateFilter.value !== "all") {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        filtered = filtered.filter(richPod => {
            const createdAt = richPod.createdAtDate;
            switch (dateFilter.value) {
                case "today":
                    return createdAt >= startOfDay;
                case "week":
                    return createdAt >= startOfWeek;
                case "month":
                    return createdAt >= startOfMonth;
                case "year":
                    return createdAt >= startOfYear;
                default:
                    return true;
            }
        });
    }

    return filtered;
});

const hasMore = computed(() => nextCursor.value !== null);

async function loadMore() {
    if (!nextCursor.value || loadingMore.value) return;
    loadingMore.value = true;
    try {
        const response = await graphqlSdk.UserRichPods({
            first: DEFAULT_PAGE_SIZE,
            after: nextCursor.value,
        });
        richPods.value = [...richPods.value, ...response.userRichPods.items];
        nextCursor.value = response.userRichPods.nextCursor ?? null;
    } catch (err: unknown) {
        console.error("Error loading more RichPods:", err);
        await loadRichPods();
    } finally {
        loadingMore.value = false;
    }
}

function playerUrl(id: string): string {
    return playerUrlPattern!.replace("{ID}", id);
}

// Format date for display
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

// Load user's RichPods
async function loadRichPods() {
    loading.value = true;
    error.value = "";

    try {
        const response = await graphqlSdk.UserRichPods({ first: DEFAULT_PAGE_SIZE });
        richPods.value = response.userRichPods.items;
        nextCursor.value = response.userRichPods.nextCursor ?? null;
    } catch (err: unknown) {
        console.error("Error loading RichPods:", err);
        error.value = err instanceof Error ? err.message : t("myRichPods.loadFailed");
    } finally {
        loading.value = false;
    }
}

// Handle edit action
function handleEdit(id: string) {
    router.push(`/edit/${id}`);
}

// Handle delete action
async function handleDelete(id: string) {
    if (!confirm(t("myRichPods.deleteConfirm"))) {
        return;
    }

    try {
        await graphqlSdk.DeleteRichPod({ id });
        // Remove from local list
        richPods.value = richPods.value.filter((rp) => rp.id !== id);
    } catch (err: any) {
        console.error("Error deleting RichPod:", err);
        alert(err.message || t("myRichPods.deleteFailed"));
    }
}

// Handle create new RichPod action
function createNewRichPod() {
    router.push("/new-episode");
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
