<template>
    <div class="space-y-4">
        <!-- Read-only view for saved chapters with a poll -->
        <template v-if="isSavedWithPoll">
            <ColoeusPolls v-if="isConfigured" :lang="locale" :id="selectedPollId" @error="handlePreviewError" />
            <p v-if="previewError" class="text-sm text-red-600 mt-2">{{ previewError }}</p>
        </template>

        <!-- Editable view for unsaved chapters -->
        <template v-else>
            <div class="flex border-b">
                <button
                    v-for="tab in tabs"
                    :key="tab"
                    type="button"
                    @click="handleTabChange(tab)"
                    :class="[
                        'px-4 py-2 -mb-px border-b-2 text-sm',
                        activeTab === tab
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-600 hover:text-gray-800',
                    ]"
                >
                    {{ tabLabel(tab) }}
                </button>
            </div>

            <div v-if="activeTab === 'Create Poll'" class="space-y-4">
                <p class="text-sm text-gray-600">
                    {{ t("pollEditor.createPollHint") }}
                </p>
                <div v-if="!isConfigured" class="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p class="text-sm text-yellow-700">{{ t("pollEditor.configuringService") }}</p>
                </div>
                <div v-else>
                    <ColoeusEditor :lang="locale" @saved="handlePollSaved" @cancel="activeTab = 'Link Existing'" />
                </div>
            </div>

            <div v-else class="space-y-3">
                <p class="text-sm text-gray-600">{{ t("pollEditor.selectPollHint") }}</p>

                <div v-if="loadingPolls" class="py-8 text-center text-gray-500">
                    {{ t("pollEditor.loadingPolls") }}
                </div>

                <div v-else-if="pollsError" class="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p class="text-sm text-red-700">{{ pollsError }}</p>
                    <button
                        type="button"
                        class="mt-2 text-sm text-red-600 underline hover:no-underline"
                        @click="loadUserPolls"
                    >
                        {{ t("common.tryAgain") }}
                    </button>
                </div>

                <div v-else-if="userPolls.length === 0" class="py-8 text-center text-gray-500">
                    <p>{{ t("pollEditor.noPolls") }}</p>
                    <button
                        type="button"
                        class="mt-2 text-sm text-blue-600 underline hover:no-underline"
                        @click="activeTab = 'Create Poll'"
                    >
                        {{ t("pollEditor.createFirstPoll") }}
                    </button>
                </div>

                <div v-else class="space-y-2">
                    <div
                        v-for="poll in userPolls"
                        :key="poll.id"
                        class="border rounded-md p-3 cursor-pointer transition-colors"
                        :class="
                            selectedPollId === poll.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        "
                        @click="selectPoll(poll)"
                    >
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex-1 min-w-0">
                                <p class="font-medium text-gray-900 truncate">{{ poll.title }}</p>
                                <p class="text-xs text-gray-500 mt-1">
                                    {{ t("pollEditor.options", poll.options.length) }} · {{ t("pollEditor.votes", poll.totalVotes) }}
                                </p>
                            </div>
                            <div class="flex-shrink-0">
                                <span
                                    v-if="selectedPollId === poll.id"
                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                    {{ t("pollEditor.selected") }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    v-if="selectedPollId && isConfigured"
                    class="border border-gray-200 rounded-md overflow-hidden mt-4"
                >
                    <p class="text-xs text-gray-500 px-3 py-2 bg-gray-50 border-b">{{ t("pollEditor.previewLabel") }}</p>
                    <div class="p-4">
                        <ColoeusPolls :lang="locale" :id="selectedPollId" @error="handlePreviewError" />
                    </div>
                </div>
                <p v-if="previewError" class="text-sm text-red-600">{{ previewError }}</p>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useRichPodStore } from "@/stores/useRichPodStore";
import { useValidation } from "@/composables/useValidation";
import { fetchUserPolls } from "@/composables/useColoeus";
import { ColoeusEditor, ColoeusPolls, configureColoeus, type AdminPoll } from "@richpods/coloeus";
import "@richpods/coloeus/style.css";
import { auth } from "@/lib/firebase";

const { t, locale } = useI18n();

const COLOEUS_ENDPOINT = import.meta.env.VITE_COLOEUS_ENDPOINT as string;

const richpodStore = useRichPodStore();
const { currentChapter } = storeToRefs(richpodStore);
const { runValidation } = useValidation();

const tabs = ["Create Poll", "Link Existing"] as const;
type TabType = (typeof tabs)[number];
const activeTab = ref<TabType>("Create Poll");

function tabLabel(tab: TabType): string {
    return tab === "Create Poll" ? t("pollEditor.createPoll") : t("pollEditor.linkExisting");
}
const previewError = ref<string | null>(null);
const isConfigured = ref(false);

const userPolls = ref<AdminPoll[]>([]);
const loadingPolls = ref(false);
const pollsError = ref<string | null>(null);

const selectedPollId = computed({
    get: () => currentChapter.value?.enclosure.coloeus?.pollId ?? "",
    set: (value: string) => {
        richpodStore.updateCurrentChapter((chapter) => ({
            ...chapter,
            enclosure: {
                ...chapter.enclosure,
                coloeus: {
                    endpoint: COLOEUS_ENDPOINT,
                    pollId: value,
                },
            },
        }));
    },
});

const isSavedWithPoll = computed(() => {
    const chapter = currentChapter.value;
    if (!chapter) return false;
    const isNew = chapter._isNew === true;
    const hasPoll = !!chapter.enclosure.coloeus?.pollId;
    return !isNew && hasPoll;
});

function configureColoeusApi() {
    if (!COLOEUS_ENDPOINT) {
        console.error("VITE_COLOEUS_ENDPOINT is not configured");
        isConfigured.value = false;
        return;
    }

    configureColoeus({
        apiUrl: COLOEUS_ENDPOINT,
        getAuthToken: async () => {
            const user = auth.currentUser;
            if (!user) return null;
            return user.getIdToken();
        },
    });
    isConfigured.value = true;

    // Ensure the endpoint is set in the enclosure data
    if (currentChapter.value?.enclosure.coloeus?.endpoint !== COLOEUS_ENDPOINT) {
        richpodStore.updateCurrentChapter((chapter) => ({
            ...chapter,
            enclosure: {
                ...chapter.enclosure,
                coloeus: {
                    endpoint: COLOEUS_ENDPOINT,
                    pollId: chapter.enclosure.coloeus?.pollId ?? "",
                },
            },
        }));
    }
}

async function loadUserPolls() {
    loadingPolls.value = true;
    pollsError.value = null;

    try {
        const response = await fetchUserPolls();
        userPolls.value = response.polls;
    } catch (e) {
        pollsError.value = e instanceof Error ? e.message : t("pollEditor.loadFailed");
    } finally {
        loadingPolls.value = false;
    }
}

function handleTabChange(tab: (typeof tabs)[number]) {
    activeTab.value = tab;
    if (tab === "Link Existing" && userPolls.value.length === 0 && !loadingPolls.value) {
        loadUserPolls();
    }
}

onMounted(() => {
    configureColoeusApi();
    if (selectedPollId.value) {
        activeTab.value = "Link Existing";
        loadUserPolls();
    }
});

function selectPoll(poll: AdminPoll) {
    selectedPollId.value = poll.id;
    previewError.value = null;
    runValidation();
}

function handlePollSaved(poll: AdminPoll) {
    selectedPollId.value = poll.id;
    userPolls.value = [poll, ...userPolls.value];
    activeTab.value = "Link Existing";
    runValidation();
}

function handlePreviewError(error: string) {
    previewError.value = error;
}
</script>
