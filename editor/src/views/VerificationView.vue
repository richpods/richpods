<template>
    <div class="min-h-full bg-gray-50 py-4 sm:py-6">
        <div class="max-w-4xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6">
            <header>
                <h1 class="text-xl sm:text-2xl font-bold text-gray-900">{{ t("verification.title") }}</h1>
                <p class="mt-2 text-sm text-gray-600">
                    {{ t("verification.subtitle") }}
                </p>
            </header>

            <section class="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 class="text-lg font-semibold text-gray-900">{{ t("verification.startVerification") }}</h2>

                <div v-if="errorMessage" class="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
                    {{ errorMessage }}
                </div>
                <div v-if="statusMessage" class="rounded border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
                    {{ statusMessage }}
                </div>

                <div class="space-y-3">
                    <label for="feed-url" class="block text-sm font-medium text-gray-700">{{ t("verification.feedUrlLabel") }}</label>
                    <input
                        ref="feedUrlInput"
                        id="feed-url"
                        v-model="feedUrl"
                        type="url"
                        :placeholder="t('verification.feedUrlPlaceholder')"
                        class="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        :disabled="isSubmitting"
                    />
                    <p class="text-xs text-gray-500">
                        {{ t("verification.rateLimitHint") }}
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                    <button
                        class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        :disabled="!canStartVerification || isSubmitting"
                        @click="startVerification"
                    >
                        <Icon icon="ion:mail-outline" class="h-4 w-4" />
                        {{ t("verification.sendVerificationEmail") }}
                    </button>
                    <span v-if="activePending" class="text-sm text-yellow-700">
                        {{ t("verification.verificationSent", { email: activePending.email, expiresAt: formatDateTime(activePending.expiresAt) }) }}
                    </span>
                </div>
            </section>

            <section v-if="uniqueOrigins.length" class="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 class="text-lg font-semibold text-gray-900">{{ t("verification.yourFeeds") }}</h2>
                <p class="text-sm text-gray-600">{{ t("verification.selectFeedHint") }}</p>
                <ul class="space-y-3">
                    <li
                        v-for="origin in uniqueOrigins"
                        :key="origin.feedUrl"
                        class="flex flex-col gap-2 rounded-md border border-gray-200 p-3 md:flex-row md:items-center md:justify-between"
                    >
                        <div class="flex-1">
                            <div class="flex items-center gap-2">
                                <p class="font-medium text-gray-900">{{ origin.title }}</p>
                                <span v-if="origin.isVerified" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <Icon icon="ion:checkmark-circle" class="mr-1 h-3 w-3" />
                                    {{ t("verificationStatus.verified") }}
                                </span>
                            </div>
                            <p class="break-all text-sm text-gray-500">{{ origin.feedUrl }}</p>
                        </div>
                        <button
                            class="inline-flex items-center gap-2 self-start rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                            @click="selectFeed(origin.feedUrl)"
                        >
                            {{ origin.isVerified ? t("verification.reVerify") : t("verification.useFeed") }}
                        </button>
                    </li>
                </ul>
                <!-- Load more feeds -->
                <div v-if="hasMoreRichPods" class="text-center pt-2">
                    <button
                        @click="loadMoreRichPods"
                        :disabled="loadingMoreRichPods"
                        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        {{ loadingMoreRichPods ? t("common.loadingMore") : t("common.loadMore") }}
                    </button>
                </div>
            </section>

            <section v-if="activePending" class="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 class="text-lg font-semibold text-gray-900">{{ t("verification.enterCode") }}</h2>
                <p class="text-sm text-gray-600">
                    {{ t("verification.enterCodeHint", { email: activePending.email, feedUrl: activePending.feedUrl }) }}
                </p>
                <div class="flex flex-wrap items-center gap-3">
                    <input
                        v-model="verificationCode"
                        type="text"
                        inputmode="numeric"
                        pattern="[0-9]*"
                        maxlength="8"
                        placeholder="12345678"
                        class="w-40 rounded-md border border-gray-300 px-3 py-2 text-base text-center tracking-widest focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        :disabled="isSubmitting"
                    />
                    <button
                        class="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                        :disabled="!canSubmitCode || isSubmitting"
                        @click="completeVerification"
                    >
                        <Icon icon="ion:checkmark-done-outline" class="h-4 w-4" />
                        {{ t("verification.submitCode") }}
                    </button>
                </div>
            </section>

            <section class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center justify-between">
                    <h2 class="text-lg font-semibold text-gray-900">{{ t("verification.history") }}</h2>
                    <button
                        class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
                        @click="refreshData"
                        :disabled="isSubmitting || loading"
                    >
                        <Icon icon="ion:refresh-outline" class="h-4 w-4" />
                        {{ t("common.refresh") }}
                    </button>
                </div>
                <div v-if="loading" class="py-6 text-sm text-gray-500">{{ t("verification.loadingVerifications") }}</div>
                <div v-else-if="!verifications.length" class="py-6 text-sm text-gray-500">{{ t("verification.noVerifications") }}</div>
                <div v-else class="mt-4 overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-2 text-left font-medium text-gray-500">{{ t("verification.feed") }}</th>
                                <th class="px-4 py-2 text-left font-medium text-gray-500">{{ t("verification.email") }}</th>
                                <th class="px-4 py-2 text-left font-medium text-gray-500">{{ t("verification.status") }}</th>
                                <th class="px-4 py-2 text-left font-medium text-gray-500">{{ t("verification.created") }}</th>
                                <th class="px-4 py-2 text-left font-medium text-gray-500">{{ t("verification.verifiedAt") }}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            <tr v-for="verification in verifications" :key="verification.id">
                                <td class="px-4 py-2 align-top">
                                    <p class="font-medium text-gray-900">{{ verification.feedUrl }}</p>
                                </td>
                                <td class="px-4 py-2 align-top text-gray-600">{{ verification.email }}</td>
                                <td class="px-4 py-2 align-top">
                                    <span
                                        :class="[
                                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                            verificationStatusClass(verification.state),
                                        ]"
                                    >
                                        {{ verificationStatusLabel(verification.state) }}
                                    </span>
                                </td>
                                <td class="px-4 py-2 align-top text-gray-600">{{ formatDateTime(verification.createdAt) }}</td>
                                <td class="px-4 py-2 align-top text-gray-600">
                                    {{ verification.verificationTimestamp ? formatDateTime(verification.verificationTimestamp) : '--' }}
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
                </div>
            </section>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import {
    graphqlSdk,
    DEFAULT_PAGE_SIZE,
    type UserRichPodsQuery,
    type UserVerificationsQuery,
} from "@/lib/graphql";

const { t } = useI18n();

const loading = ref(true);
const isSubmitting = ref(false);
const errorMessage = ref("");
const statusMessage = ref("");

const feedUrlInput = ref<HTMLInputElement | null>(null);
const feedUrl = ref("");
const verificationCode = ref("");

const richPods = ref<UserRichPodsQuery["userRichPods"]["items"]>([]);
const richPodsNextCursor = ref<string | null>(null);
const loadingMoreRichPods = ref(false);
const verifications = ref<UserVerificationsQuery["userVerifications"]["items"]>([]);
const verificationNextCursor = ref<string | null>(null);
const loadingMore = ref(false);

const hasMore = computed(() => verificationNextCursor.value !== null);

async function loadMore() {
    if (!verificationNextCursor.value || loadingMore.value) return;
    loadingMore.value = true;
    try {
        const response = await graphqlSdk.UserVerifications({
            first: DEFAULT_PAGE_SIZE,
            after: verificationNextCursor.value,
        });
        verifications.value = [...verifications.value, ...response.userVerifications.items];
        verificationNextCursor.value = response.userVerifications.nextCursor ?? null;
    } catch (err: unknown) {
        console.error("Error loading more verifications:", err);
        await loadData();
    } finally {
        loadingMore.value = false;
    }
}

const hasMoreRichPods = computed(() => richPodsNextCursor.value !== null);

async function loadMoreRichPods() {
    if (!richPodsNextCursor.value || loadingMoreRichPods.value) return;
    loadingMoreRichPods.value = true;
    try {
        const response = await graphqlSdk.UserRichPods({
            first: DEFAULT_PAGE_SIZE,
            after: richPodsNextCursor.value,
        });
        richPods.value = [...richPods.value, ...response.userRichPods.items];
        richPodsNextCursor.value = response.userRichPods.nextCursor ?? null;
    } catch (err: unknown) {
        console.error("Error loading more RichPods:", err);
    } finally {
        loadingMoreRichPods.value = false;
    }
}

const uniqueOrigins = computed(() => {
    const items: Array<{ title: string; feedUrl: string; isVerified: boolean }> = [];
    const seen = new Set<string>();
    for (const pod of richPods.value) {
        const url = pod.origin.feedUrl;
        if (!seen.has(url)) {
            seen.add(url);
            const isVerified = pod.origin.verified || verifications.value.some(
                v => v.feedUrl === url && v.state === "verified"
            );
            items.push({ title: pod.origin.title, feedUrl: url, isVerified });
        }
    }
    return items.sort((a, b) => a.title.localeCompare(b.title));
});

const activePending = computed(() => {
    const now = Date.now();
    const pending = verifications.value
        .filter((verification) => verification.state === "pending")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return pending.find((verification) => new Date(verification.expiresAt).getTime() > now) || null;
});

async function selectFeed(url: string) {
    feedUrl.value = url;
    await nextTick();
    feedUrlInput.value?.scrollIntoView({ behavior: "smooth", block: "center" });
    feedUrlInput.value?.focus();
}

const canStartVerification = computed(() => {
    return Boolean(feedUrl.value.trim()) && !activePending.value;
});

const canSubmitCode = computed(() => {
    return verificationCode.value.trim().length === 8 && Boolean(activePending.value);
});

function verificationStatusLabel(status: string): string {
    switch (status) {
        case "verified":
            return t("verificationStatus.verified");
        case "pending":
            return t("verificationStatus.pending");
        case "failed":
            return t("verificationStatus.failed");
        default:
            return t("verificationStatus.unverified");
    }
}

function verificationStatusClass(status: string): string {
    switch (status) {
        case "verified":
            return "bg-green-100 text-green-800";
        case "pending":
            return "bg-yellow-100 text-yellow-800";
        case "failed":
            return "bg-red-100 text-red-800";
        default:
            return "bg-gray-100 text-gray-600";
    }
}

function formatDateTime(value: string): string {
    const date = new Date(value);
    return date.toLocaleString();
}

async function loadData() {
    loading.value = true;
    errorMessage.value = "";
    try {
        const [richPodsResponse, verificationsResponse] = await Promise.all([
            graphqlSdk.UserRichPods({ first: DEFAULT_PAGE_SIZE }),
            graphqlSdk.UserVerifications({ first: DEFAULT_PAGE_SIZE }),
        ]);
        richPods.value = richPodsResponse.userRichPods.items;
        richPodsNextCursor.value = richPodsResponse.userRichPods.nextCursor ?? null;
        verifications.value = verificationsResponse.userVerifications.items;
        verificationNextCursor.value = verificationsResponse.userVerifications.nextCursor ?? null;
    } catch (error: unknown) {
        console.error("Failed to load verification data", error);
        errorMessage.value = error instanceof Error ? error.message : t("verification.loadFailed");
    } finally {
        loading.value = false;
    }
}

async function refreshData() {
    await loadData();
}

async function startVerification() {
    if (!canStartVerification.value) return;
    isSubmitting.value = true;
    errorMessage.value = "";
    statusMessage.value = "";
    try {
        const response = await graphqlSdk.StartRichPodVerification({ feedUrl: feedUrl.value.trim() });
        statusMessage.value = t("verification.emailSent", { email: response.startRichPodVerification.email });
        verificationCode.value = "";
        await loadData();
    } catch (error: any) {
        console.error("Failed to start verification", error);
        errorMessage.value = error.message || t("verification.startFailed");
    } finally {
        isSubmitting.value = false;
    }
}

async function completeVerification() {
    if (!canSubmitCode.value || !activePending.value) return;
    isSubmitting.value = true;
    errorMessage.value = "";
    statusMessage.value = "";
    try {
        const response = await graphqlSdk.CompleteRichPodVerification({
            feedUrl: activePending.value.feedUrl,
            code: verificationCode.value.trim(),
        });
        statusMessage.value = t("verification.verificationSuccess", { feedUrl: response.completeRichPodVerification.feedUrl });
        verificationCode.value = "";
        await loadData();
    } catch (error: any) {
        console.error("Failed to complete verification", error);
        errorMessage.value = error.message || t("verification.completeFailed");
    } finally {
        isSubmitting.value = false;
    }
}

onMounted(() => {
    loadData();
});
</script>

<style scoped>
</style>
