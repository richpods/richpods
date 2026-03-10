<template>
    <dialog
        ref="dialogRef"
        class="p-0 rounded-lg shadow-xl backdrop:bg-black/40 open:flex"
        @close="handleClose"
        @keydown.esc="handleClose"
    >
        <div class="bg-white rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div class="flex items-center justify-between p-4 border-b">
                <h3 class="text-lg font-medium">{{ t("factboxEditor.wikidataSearch.title") }}</h3>
                <button
                    type="button"
                    class="text-gray-500 hover:text-gray-700 p-1"
                    @click="handleClose"
                    :aria-label="t('factboxEditor.wikidataSearch.closeModalAriaLabel')"
                >
                    ✕
                </button>
            </div>

            <div class="p-4 border-b space-y-3">
                <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input
                        ref="searchInputRef"
                        v-model="searchQuery"
                        type="text"
                        :placeholder="t('factboxEditor.wikidataSearch.searchPlaceholder')"
                        class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        @input="debouncedSearch"
                    />
                </div>

                <!-- Language Selection -->
                <div class="flex flex-wrap gap-2">
                    <span class="text-sm text-gray-600 self-center">
                        {{ t("factboxEditor.wikidataSearch.searchIn") }}
                    </span>
                    <button
                        v-for="lang in availableLanguages"
                        :key="lang.code"
                        type="button"
                        class="px-2 py-1 text-xs rounded-md border transition-colors"
                        :class="
                            selectedLanguages.includes(lang.code)
                                ? 'bg-blue-100 border-blue-300 text-blue-800'
                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        "
                        @click="toggleLanguage(lang.code)"
                    >
                        {{ lang.name }}
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto p-4">
                <div v-if="isLoading" class="flex items-center justify-center py-8">
                    <div
                        class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"
                    ></div>
                    <span class="ml-2 text-gray-600">{{ t("factboxEditor.wikidataSearch.searching") }}</span>
                </div>

                <div v-else-if="error" class="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p class="text-sm text-red-700">{{ error }}</p>
                    <button
                        type="button"
                        class="mt-2 text-sm text-red-600 underline hover:no-underline"
                        @click="performSearch"
                    >
                        {{ t("common.tryAgain") }}
                    </button>
                </div>

                <div
                    v-else-if="searchQuery && groupedResults.length === 0 && hasSearched"
                    class="py-8 text-center text-gray-500"
                >
                    {{ t("factboxEditor.wikidataSearch.noResultsFoundFor", { query: searchQuery }) }}
                </div>

                <div v-else-if="groupedResults.length === 0" class="py-8 text-center text-gray-500">
                    {{ t("factboxEditor.wikidataSearch.enterSearchTerm") }}
                </div>

                <div v-else class="space-y-4">
                    <div
                        v-for="group in groupedResults"
                        :key="group.language"
                        class="space-y-2"
                    >
                        <h4 class="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <span
                                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                            >
                                {{ group.languageName }}
                            </span>
                        </h4>

                        <div class="space-y-1">
                            <button
                                v-for="result in group.results"
                                :key="`${result.id}-${result.language}`"
                                type="button"
                                class="w-full text-left border rounded-md p-3 transition-colors"
                                :class="
                                    isSelected(result)
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                "
                                @click="selectResult(result)"
                            >
                                <div class="flex items-start justify-between gap-2">
                                    <div class="flex-1 min-w-0">
                                        <p class="font-medium text-gray-900">
                                            {{ result.label }}
                                            <span class="text-xs text-gray-400 ml-1"
                                                >({{ result.id }})</span
                                            >
                                        </p>
                                        <p
                                            v-if="result.description"
                                            class="text-sm text-gray-600 mt-0.5"
                                        >
                                            {{ result.description }}
                                        </p>
                                    </div>
                                    <span
                                        v-if="isSelected(result)"
                                        class="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                        {{ t("factboxEditor.wikidataSearch.selected") }}
                                    </span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between gap-3 p-4 border-t bg-gray-50">
                <div class="text-sm text-gray-500">
                    <span v-if="selectedResult">
                        {{ t("factboxEditor.wikidataSearch.generateFactboxIn") }}
                        <strong>{{ getLanguageName(selectedResult.language) }}</strong>
                    </span>
                </div>
                <div class="flex gap-3">
                    <button
                        type="button"
                        class="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                        @click="handleClose"
                    >
                        {{ t("common.cancel") }}
                    </button>
                    <button
                        type="button"
                        class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        :disabled="!selectedResult || isGenerating"
                        @click="handleSelect"
                    >
                        <span v-if="isGenerating" class="flex items-center gap-2">
                            <span
                                class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                            ></span>
                            {{ t("factboxEditor.wikidataSearch.generating") }}
                        </span>
                        <span v-else>{{ t("factboxEditor.wikidataSearch.useSelectedEntity") }}</span>
                    </button>
                </div>
            </div>
        </div>
    </dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import {
    searchWikidataMultiLang,
    generateFactboxFromWikidata,
    getBrowserLanguage,
    getPrioritizedLanguages,
    SUPPORTED_LANGUAGES,
    type WikidataSearchResult,
    type FactboxTemplate,
    type LanguageGroupedResults,
} from "@/services/wikidataService";

const props = defineProps<{
    open: boolean;
}>();

const emit = defineEmits<{
    (e: "close"): void;
    (e: "select", template: FactboxTemplate): void;
}>();

const { t } = useI18n();

const dialogRef = ref<HTMLDialogElement>();
const searchInputRef = ref<HTMLInputElement>();
const searchQuery = ref("");
const groupedResults = ref<LanguageGroupedResults[]>([]);
const selectedResult = ref<WikidataSearchResult | null>(null);
const isLoading = ref(false);
const isGenerating = ref(false);
const error = ref<string | null>(null);
const hasSearched = ref(false);

// Language settings
const browserLanguage = ref("en");
const selectedLanguages = ref<string[]>([]);

// Available languages for selection (prioritized)
const availableLanguages = computed(() => {
    const prioritized = getPrioritizedLanguages(browserLanguage.value);
    return prioritized.map((code) => ({
        code,
        name: SUPPORTED_LANGUAGES[code] || code,
    }));
});

onMounted(() => {
    browserLanguage.value = getBrowserLanguage();
    // Default: select browser language and English
    const defaultLangs = [browserLanguage.value];
    if (browserLanguage.value !== "en") {
        defaultLangs.push("en");
    }
    selectedLanguages.value = defaultLangs;
});

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(
    () => props.open,
    async (isOpen) => {
        if (dialogRef.value) {
            if (isOpen && !dialogRef.value.open) {
                dialogRef.value.showModal();
                await nextTick();
                searchInputRef.value?.focus();
            } else if (!isOpen && dialogRef.value.open) {
                dialogRef.value.close();
            }
        }
    }
);

function handleClose() {
    searchQuery.value = "";
    groupedResults.value = [];
    selectedResult.value = null;
    error.value = null;
    hasSearched.value = false;
    emit("close");
}

function toggleLanguage(langCode: string) {
    const index = selectedLanguages.value.indexOf(langCode);
    if (index >= 0) {
        // Don't allow deselecting all languages
        if (selectedLanguages.value.length > 1) {
            selectedLanguages.value.splice(index, 1);
        }
    } else {
        selectedLanguages.value.push(langCode);
    }

    // Re-run search if we have a query
    if (searchQuery.value.trim()) {
        performSearch();
    }
}

function debouncedSearch() {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
        performSearch();
    }, 350);
}

async function performSearch() {
    const query = searchQuery.value.trim();
    if (!query) {
        groupedResults.value = [];
        hasSearched.value = false;
        return;
    }

    if (selectedLanguages.value.length === 0) {
        return;
    }

    isLoading.value = true;
    error.value = null;
    selectedResult.value = null;

    try {
        // Sort selected languages by priority order
        const prioritized = getPrioritizedLanguages(browserLanguage.value);
        const sortedLangs = selectedLanguages.value.slice().sort((a, b) => {
            return prioritized.indexOf(a) - prioritized.indexOf(b);
        });

        groupedResults.value = await searchWikidataMultiLang(query, sortedLangs);
        hasSearched.value = true;
    } catch (e) {
        error.value = e instanceof Error ? e.message : t("factboxEditor.wikidataSearch.searchFailed");
        groupedResults.value = [];
    } finally {
        isLoading.value = false;
    }
}

function isSelected(result: WikidataSearchResult): boolean {
    return (
        selectedResult.value?.id === result.id &&
        selectedResult.value?.language === result.language
    );
}

function selectResult(result: WikidataSearchResult) {
    selectedResult.value = result;
}

function getLanguageName(langCode: string): string {
    return SUPPORTED_LANGUAGES[langCode] || langCode;
}

async function handleSelect() {
    if (!selectedResult.value) return;

    isGenerating.value = true;
    error.value = null;

    try {
        const template = await generateFactboxFromWikidata(
            selectedResult.value.id,
            selectedResult.value.language
        );
        emit("select", template);
        handleClose();
    } catch (e) {
        error.value = e instanceof Error ? e.message : t("factboxEditor.wikidataSearch.generateFailed");
    } finally {
        isGenerating.value = false;
    }
}
</script>

<style scoped>
dialog[open] {
    display: flex;
    align-items: center;
    justify-content: center;
}

dialog::backdrop {
    background-color: rgba(0, 0, 0, 0.4);
}
</style>
