<template>
    <aside
        class="w-full lg:w-[28rem] 2xl:w-[30rem] bg-white border-r border-gray-200 p-3 lg:p-6 overflow-y-auto"
    >
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
                <!-- Saving spinner -->
                <template v-if="saveStatus === 'saving'">
                    <RipoSpinner :size="16" color="#4b5563" :label="t('sidebar.saving')" />
                    <span class="text-sm text-gray-500">{{ t("sidebar.saving") }}</span>
                </template>
                <!-- Save error with retry -->
                <template v-else-if="saveStatus === 'error'">
                    <Icon icon="ion:warning" class="w-4 h-4 text-red-500" />
                    <span class="text-sm text-red-600">{{ t("sidebar.saveError") }}</span>
                    <button
                        class="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-500"
                        @click="emit('save-now')"
                    >
                        {{ t("common.tryAgain") }}
                    </button>
                </template>
                <!-- Saved indicator -->
                <template v-else-if="saveStatus === 'saved' && !isDirty">
                    <Icon icon="ion:checkmark" class="w-4 h-4 text-gray-400" />
                    <span class="text-sm text-gray-400">{{ t("sidebar.saved") }}</span>
                </template>
                <!-- Manual save fallback: dirty + validation errors -->
                <template v-else-if="isDirty && !canEditorSave">
                    <button
                        class="px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md opacity-40 cursor-not-allowed"
                        disabled
                        :title="t('sidebar.resolveValidation')"
                    >
                        {{ t("common.save") }}
                    </button>
                </template>
                <!-- Manual save fallback: dirty + can save -->
                <template v-else-if="isDirty && canEditorSave">
                    <button
                        class="px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800"
                        @click="emit('save-now')"
                        :title="t('sidebar.saveChanges')"
                    >
                        {{ t("common.save") }}
                    </button>
                </template>
            </div>
            <div class="flex items-center gap-2">
                <RouterLink
                    v-if="richpodId"
                    :to="{ name: 'preview', params: { id: richpodId } }"
                    target="_blank"
                    rel="noopener"
                    role="button"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
                    :class="{ 'opacity-40 pointer-events-none cursor-not-allowed': isSaving }"
                    :aria-disabled="isSaving"
                    :tabindex="isSaving ? -1 : undefined"
                    :title="t('editor.openPreviewHint')"
                >
                    <Icon icon="ion:eye-outline" class="w-4 h-4" />
                    <span class="hidden sm:inline">{{ t("editor.openPreview") }}</span>
                </RouterLink>
                <button
                    class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="disableAddChapter || isSaving"
                    @click="emit('add-chapter')"
                    :title="addChapterDisabledReason"
                >
                    {{ t("sidebar.addChapter") }}
                </button>
            </div>
        </div>

        <TabGroup>
            <TabList class="flex border-b border-gray-200 mb-4">
                <Tab as="template" v-slot="{ selected }">
                    <button
                        type="button"
                        :class="[
                            'px-4 py-2 -mb-px text-sm font-medium border-b-2 focus:outline-none',
                            selected
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700',
                        ]"
                    >
                        {{ t("sidebar.tabEpisode") }}
                    </button>
                </Tab>
                <Tab as="template" v-slot="{ selected }">
                    <button
                        type="button"
                        :class="[
                            'px-4 py-2 -mb-px text-sm font-medium border-b-2 focus:outline-none',
                            selected
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700',
                        ]"
                    >
                        {{ t("sidebar.tabChapters") }}
                    </button>
                </Tab>
            </TabList>
            <TabPanels>
                <TabPanel :unmount="false" class="focus:outline-none">
                    <fieldset :disabled="isSaving" class="m-0 p-0 border-0 space-y-6">
                        <div
                            v-if="validationErrors.length > 0"
                            class="bg-red-50 border border-red-200 rounded-lg p-3"
                        >
                            <p class="text-sm font-medium text-red-800 mb-2">
                                {{ t("sidebar.validationErrors") }}
                            </p>
                            <div class="space-y-3">
                                <!-- Global errors -->
                                <div v-if="validationErrorsByChapter.has('global')">
                                    <p class="text-xs font-medium text-red-700 mb-1">
                                        {{ t("sidebar.general") }}
                                    </p>
                                    <ul
                                        class="text-sm text-red-800 list-disc list-inside space-y-1"
                                    >
                                        <li
                                            v-for="(error, idx) in validationErrorsByChapter.get(
                                                'global',
                                            )"
                                            :key="`global-${idx}`"
                                        >
                                            {{ error.message }}
                                        </li>
                                    </ul>
                                </div>
                                <!-- Chapter-specific errors -->
                                <div
                                    v-for="chapterIndex in Array.from(
                                        validationErrorsByChapter.keys(),
                                    ).filter((k) => k !== 'global')"
                                    :key="`chapter-${chapterIndex}`"
                                >
                                    <p class="text-xs font-medium text-red-700 mb-1">
                                        {{
                                            t("sidebar.chapterN", {
                                                n: (chapterIndex as number) + 1,
                                                time: formatChapterTime(chapterIndex as number),
                                            })
                                        }}
                                    </p>
                                    <ul
                                        class="text-sm text-red-800 list-disc list-inside space-y-1"
                                    >
                                        <li
                                            v-for="(error, idx) in validationErrorsByChapter.get(
                                                chapterIndex,
                                            )"
                                            :key="`chapter-${chapterIndex}-${idx}`"
                                        >
                                            {{ error.message }}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div
                            v-else-if="error"
                            class="bg-red-50 border border-red-200 rounded-lg p-3"
                        >
                            <p class="text-sm text-red-800">{{ error }}</p>
                        </div>

                        <div>
                            <label
                                for="richpod-title"
                                class="block text-sm font-medium text-gray-700 mb-2"
                                >{{ t("sidebar.titleLabel") }}</label
                            >
                            <input
                                id="richpod-title"
                                v-model="titleValue"
                                type="text"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                                :placeholder="t('sidebar.titlePlaceholder')"
                                :aria-label="t('sidebar.titleAriaLabel')"
                                :aria-invalid="titleLength > RICHPOD_TITLE_MAX_LENGTH"
                                aria-describedby="title-counter"
                                :maxlength="RICHPOD_TITLE_MAX_LENGTH"
                                @blur="handleBlur"
                            />
                            <div
                                id="title-counter"
                                class="text-right text-xs text-gray-500 mt-1"
                                aria-live="off"
                            >
                                {{ formatNumber(titleLength) }}/{{
                                    formatNumber(RICHPOD_TITLE_MAX_LENGTH)
                                }}
                            </div>
                        </div>

                        <div>
                            <label
                                for="richpod-description"
                                class="block text-sm font-medium text-gray-700 mb-2"
                                >{{ t("sidebar.descriptionLabel") }}</label
                            >
                            <textarea
                                id="richpod-description"
                                v-model="descriptionValue"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                rows="3"
                                :placeholder="t('sidebar.descriptionPlaceholder')"
                                :aria-label="t('sidebar.descriptionAriaLabel')"
                                :aria-invalid="descriptionLength > RICHPOD_DESCRIPTION_MAX_LENGTH"
                                aria-describedby="description-counter"
                                :maxlength="RICHPOD_DESCRIPTION_MAX_LENGTH"
                                @blur="handleBlur"
                            ></textarea>
                            <div
                                id="description-counter"
                                class="text-right text-xs text-gray-500 mt-1"
                                aria-live="off"
                            >
                                {{ formatNumber(descriptionLength) }}/{{
                                    formatNumber(RICHPOD_DESCRIPTION_MAX_LENGTH)
                                }}
                            </div>
                        </div>

                        <div>
                            <label
                                for="richpod-state"
                                class="block text-sm font-medium text-gray-700 mb-2"
                                >{{ t("sidebar.publicationStatus") }}</label
                            >
                            <select
                                id="richpod-state"
                                v-model="stateValue"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                                :aria-label="t('sidebar.publicationStatusAriaLabel')"
                                :disabled="publishSelectDisabled"
                            >
                                <option :value="RichPodState.Draft">
                                    {{ t("sidebar.draftStatus") }}
                                </option>
                                <option :value="RichPodState.Published">
                                    {{ t("sidebar.publishedStatus") }}
                                </option>
                            </select>
                            <p class="text-xs text-gray-500 mt-1">
                                {{
                                    publishDisabledReason ||
                                    (stateValue === "published"
                                        ? t("sidebar.publishedHint")
                                        : t("sidebar.draftHint"))
                                }}
                            </p>
                        </div>

                        <div>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    v-model="explicitValue"
                                    class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                />
                                <span class="text-sm font-medium text-gray-700">{{
                                    t("sidebar.explicitLabel")
                                }}</span>
                            </label>
                        </div>

                        <div v-if="origin" class="border border-gray-200 rounded-lg p-4">
                            <h3 class="font-medium text-gray-900 mb-3">
                                {{ t("sidebar.originalPodcast") }}
                            </h3>

                            <div class="flex gap-3">
                                <div class="flex-shrink-0 group relative">
                                    <img
                                        v-if="artworkUrl"
                                        :src="artworkUrl"
                                        alt=""
                                        class="w-24 h-24 object-cover rounded border border-gray-200"
                                    />
                                    <div
                                        v-else
                                        class="w-24 h-24 rounded border border-gray-200 bg-gray-100 flex items-center justify-center"
                                    >
                                        <Icon icon="ion:image" class="w-12 h-12 text-gray-400" />
                                    </div>
                                    <template v-if="isHosted && hostedEpisodeId">
                                        <input
                                            ref="coverFileInput"
                                            type="file"
                                            accept="image/jpeg,image/png"
                                            class="hidden"
                                            @change="handleCoverFileSelected"
                                        />
                                        <button
                                            v-if="!coverUploading"
                                            @click="coverFileInput?.click()"
                                            class="absolute inset-0 bg-black/50 rounded flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                            :title="t('sidebar.changeCover')"
                                        >
                                            <Icon icon="ion:camera" class="w-6 h-6 text-white" />
                                            <span class="text-xs text-white mt-1">{{
                                                t("sidebar.changeCover")
                                            }}</span>
                                        </button>
                                        <div
                                            v-else
                                            class="absolute inset-0 bg-black/50 rounded flex items-center justify-center"
                                        >
                                            <RipoSpinner :size="24" color="#ffffff" />
                                        </div>
                                    </template>
                                    <p
                                        v-if="coverUploadError"
                                        class="absolute -bottom-5 left-0 right-0 text-xs text-red-600 truncate"
                                    >
                                        {{ coverUploadError }}
                                    </p>
                                </div>

                                <div class="flex-1 space-y-2 text-sm min-w-0">
                                    <div>
                                        <a
                                            v-if="origin.episode?.link"
                                            :href="origin.episode.link || ''"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="text-blue-600 hover:underline inline-flex items-center gap-1"
                                        >
                                            {{ origin.episode?.title }}
                                            <Icon
                                                icon="ion:open-outline"
                                                class="w-3 h-3 flex-shrink-0"
                                            />
                                        </a>
                                        <span v-else class="text-gray-900">
                                            {{ origin.episode?.title }}
                                        </span>
                                    </div>

                                    <div class="text-xs">
                                        <a
                                            v-if="origin.link"
                                            :href="origin.link || ''"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
                                        >
                                            {{ origin.title }}
                                            <Icon
                                                icon="ion:open-outline"
                                                class="w-3 h-3 flex-shrink-0"
                                            />
                                        </a>
                                        <span v-else class="text-gray-500 font-medium">
                                            {{ origin.title }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div class="mt-4 border-t border-gray-200 pt-4">
                                <div v-if="!showVerificationAction" class="flex items-center gap-2">
                                    <span
                                        :class="[
                                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                            verificationBadgeClass,
                                        ]"
                                    >
                                        {{ verificationBadgeLabel }}
                                    </span>
                                </div>

                                <!-- Hosted episode validation status -->
                                <div v-if="isHosted" class="mt-3">
                                    <div
                                        v-if="hostedValidationStatus === 'pending'"
                                        class="flex items-center gap-2 text-sm text-yellow-700"
                                    >
                                        <div
                                            class="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"
                                        ></div>
                                        {{ t("sidebar.validating") }}
                                    </div>
                                    <Transition name="fade-validation">
                                        <div
                                            v-if="showValidBanner"
                                            class="flex items-center gap-2 text-sm text-green-700"
                                        >
                                            <Icon icon="ion:checkmark-circle" class="w-4 h-4" />
                                            {{ t("sidebar.validationValid") }}
                                        </div>
                                    </Transition>
                                    <div
                                        v-if="hostedValidationStatus === 'invalid'"
                                        class="text-sm text-red-700"
                                    >
                                        <div class="flex items-center gap-2">
                                            <Icon icon="ion:close-circle" class="w-4 h-4" />
                                            {{ t("sidebar.validationInvalid") }}
                                        </div>
                                        <p v-if="hostedValidationError" class="text-xs mt-1 ml-6">
                                            {{ hostedValidationError }}
                                        </p>
                                    </div>
                                </div>

                                <p v-if="verificationMessage" class="text-sm text-gray-500 mt-2">
                                    {{ verificationMessage }}
                                </p>
                                <button
                                    v-if="showVerificationAction"
                                    class="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-500 transition-colors"
                                    @click="emit('go-to-verification')"
                                >
                                    {{ verificationActionLabel }}
                                    <Icon icon="ion:open-outline" class="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div v-else class="border border-gray-200 rounded-lg p-4">
                            <div class="text-center py-4">
                                <svg
                                    class="w-12 h-12 mx-auto text-gray-400 mb-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM21 16c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
                                    />
                                </svg>
                                <p class="text-gray-500">{{ t("sidebar.noEpisodeData") }}</p>
                                <p class="text-sm text-gray-400 mt-1">
                                    {{ t("sidebar.createFromEpisode") }}
                                </p>
                            </div>
                        </div>
                    </fieldset>
                </TabPanel>

                <TabPanel class="focus:outline-none">
                    <div
                        v-if="chapterListItems.length === 0"
                        class="text-center py-8 text-sm text-gray-500"
                    >
                        {{ t("sidebar.chapterListEmpty") }}
                    </div>
                    <ul v-else class="space-y-1">
                        <li v-for="item in chapterListItems" :key="item.key">
                            <button
                                type="button"
                                class="w-full flex items-center gap-3 px-2 py-2 rounded-md text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                :class="[
                                    item.index === activeChapterIndex
                                        ? 'bg-blue-50 ring-1 ring-blue-200'
                                        : '',
                                    item.visible ? '' : 'opacity-60',
                                ]"
                                @click="goToChapter(item.index)"
                            >
                                <span
                                    class="font-mono tabular-nums text-xs text-gray-500 w-14 flex-shrink-0"
                                >
                                    {{ item.time }}
                                </span>
                                <Icon
                                    :icon="item.typeIcon"
                                    class="w-4 h-4 flex-shrink-0 text-gray-600"
                                    aria-hidden="true"
                                />
                                <Icon
                                    :icon="item.visible ? 'ion:eye-outline' : 'ion:eye-off-outline'"
                                    class="w-4 h-4 flex-shrink-0"
                                    :class="item.visible ? 'text-gray-500' : 'text-gray-400'"
                                    role="img"
                                    :aria-label="
                                        item.visible
                                            ? t('sidebar.chapterVisible')
                                            : t('sidebar.chapterHidden')
                                    "
                                    :title="
                                        item.visible
                                            ? t('sidebar.chapterVisible')
                                            : t('sidebar.chapterHidden')
                                    "
                                />
                                <span
                                    class="flex-1 truncate text-sm text-gray-800"
                                    :class="item.untitled ? 'italic' : ''"
                                >
                                    {{ item.title }}
                                </span>
                            </button>
                        </li>
                    </ul>
                </TabPanel>
            </TabPanels>
        </TabGroup>
    </aside>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from "@headlessui/vue";
import { storeToRefs } from "pinia";
import { RouterLink, useRoute } from "vue-router";
import { toSeconds } from "@player/utils.ts";
import { useAudio } from "@player/composables/useAudio.ts";
import { formatTime } from "@richpods/shared/utils/time";
import type { EditorChapter } from "@/types/editor";
import { useRichPodStore } from "@/stores/useRichPodStore";
import { useEditorUiStore } from "@/stores/useEditorUiStore";
import { useValidation } from "@/composables/useValidation";
import { useEpisodeCoverUpload } from "@/composables/useEpisodeCoverUpload";
import { RichPodState } from "@/graphql/generated";
import type { SaveStatus } from "@/composables/useAutoSave";
import RipoSpinner from "@richpods/shared/components/RipoSpinner.vue";

const { t, locale } = useI18n();
const route = useRoute();
const richpodId = computed(() => {
    const id = route.params.id;
    return typeof id === "string" && id.length > 0 ? id : null;
});

const isSaving = computed(() => props.saveStatus === "saving");

const props = defineProps<{
    error: string;
    saveStatus: SaveStatus;
    disableAddChapter: boolean;
    addChapterDisabledReason: string;
    verificationBadgeClass: string;
    verificationBadgeLabel: string;
    verificationMessage: string;
    showVerificationAction: boolean;
    verificationActionLabel: string;
    isHosted: boolean;
    hostedValidationStatus: string | null;
    hostedValidationError: string | null;
}>();

const emit = defineEmits<{
    (e: "save"): void;
    (e: "save-now"): void;
    (e: "add-chapter"): void;
    (e: "go-to-verification"): void;
    (e: "open-chapter"): void;
}>();

const richpodStore = useRichPodStore();
const editorUiStore = useEditorUiStore();
const { richpod, isDirty, chapters, hostedEpisodeId, activeChapterIndex } =
    storeToRefs(richpodStore);
const { seekTo } = useAudio();
const { validationErrors, validationErrorsByChapter, canEditorSave } = storeToRefs(editorUiStore);
const { runValidation } = useValidation();
const {
    uploading: coverUploading,
    uploadError: coverUploadError,
    uploadCover,
} = useEpisodeCoverUpload();

const coverFileInput = ref<HTMLInputElement | null>(null);

async function handleCoverFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = "";
    if (!file || !hostedEpisodeId.value) return;

    try {
        const newUrl = await uploadCover(hostedEpisodeId.value, file);
        richpodStore.updateEpisodeArtworkUrl(newUrl);
    } catch {
        // error is already set in uploadError by the composable
    }
}

// Track validation transitions: only show "valid" banner when it transitions from pending→valid
const wasEverPending = ref(false);
const showValidBanner = ref(false);
let validBannerTimeout: ReturnType<typeof setTimeout> | null = null;

watch(
    () => props.hostedValidationStatus,
    (status) => {
        if (status === "pending") {
            wasEverPending.value = true;
        } else if (status === "valid" && wasEverPending.value) {
            showValidBanner.value = true;
            validBannerTimeout = setTimeout(() => {
                showValidBanner.value = false;
            }, 3000);
        }
    },
);

onUnmounted(() => {
    if (validBannerTimeout) clearTimeout(validBannerTimeout);
});

const RICHPOD_TITLE_MAX_LENGTH = 200;
const RICHPOD_DESCRIPTION_MAX_LENGTH = 1000;
const numberFormatter = computed(() => new Intl.NumberFormat(locale.value));

function formatNumber(value: number): string {
    return numberFormatter.value.format(value);
}

function handleBlur() {
    runValidation();
}

function formatChapterTime(chapterIndex: number): string {
    const chapter = chapters.value[chapterIndex];
    if (!chapter) return "";
    const seconds = toSeconds(chapter.begin);
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function isChapterVisible(chapter: EditorChapter): boolean {
    if (chapter.enclosure.__typename === "Card") {
        return chapter.enclosure.visibleAsChapter !== false;
    }
    return true;
}

function isChapterUntitled(chapter: EditorChapter): boolean {
    const title = chapter.enclosure.title?.trim();
    return !title || title.length === 0;
}

function chapterTitle(chapter: EditorChapter): string {
    const title = chapter.enclosure.title?.trim();
    return title && title.length > 0 ? title : t("sidebar.chapterUntitled");
}

function chapterTypeIcon(chapter: EditorChapter): string {
    const enclosure = chapter.enclosure;
    if (enclosure.__typename === "Card") {
        switch (enclosure.cardType) {
            case "LINK":
                return "ion:link-outline";
            case "COVER":
                return "ion:easel-outline";
            case "CITATION":
                return "ion:chatbox-ellipses-outline";
            case "IMAGE":
                return "ion:image-outline";
            case "BLANK":
                return "ion:square-outline";
            default:
                return "ion:card-outline";
        }
    }
    switch (enclosure.__typename) {
        case "Markdown":
            return "ion:document-text-outline";
        case "Slideshow":
            return "ion:images-outline";
        case "Poll":
            return "ion:chatbubbles-outline";
        case "GeoMap":
            return "ion:map-outline";
        case "InteractiveChart":
            return "ion:bar-chart-outline";
        default:
            return "ion:cube-outline";
    }
}

const chapterListItems = computed(() =>
    chapters.value.map((chapter, index) => ({
        index,
        key: `${chapter.begin}-${chapter.enclosure.__typename}-${index}`,
        time: formatTime(toSeconds(chapter.begin)),
        visible: isChapterVisible(chapter),
        title: chapterTitle(chapter),
        untitled: isChapterUntitled(chapter),
        typeIcon: chapterTypeIcon(chapter),
    })),
);

function goToChapter(index: number) {
    const chapter = chapters.value[index];
    if (!chapter) return;
    richpodStore.setActiveChapterIndex(index);
    seekTo(toSeconds(chapter.begin));
    emit("open-chapter");
}

const titleValue = computed({
    get: () => richpod.value.title,
    set: (value: string) => {
        richpodStore.setTitle(value);
    },
});

const descriptionValue = computed({
    get: () => richpod.value.description,
    set: (value: string) => {
        richpodStore.setDescription(value);
    },
});

const titleLength = computed(() => titleValue.value.length);
const descriptionLength = computed(() => descriptionValue.value.length);

const explicitValue = computed({
    get: () => richpod.value.explicit,
    set: (value: boolean) => {
        richpodStore.setExplicit(value);
    },
});

const stateValue = computed({
    get: () => richpod.value.state,
    set: (value: (typeof RichPodState)[keyof typeof RichPodState]) => {
        richpodStore.setState(value);
    },
});

const publishSelectDisabled = computed(() => {
    if (chapters.value.length === 0) return true;
    if (isDirty.value) return true;
    if (props.isHosted && props.hostedValidationStatus !== "valid") return true;
    return false;
});

const publishDisabledReason = computed(() => {
    if (!publishSelectDisabled.value) return "";
    if (chapters.value.length === 0) return t("sidebar.publishRequiresChapters");
    if (isDirty.value) return t("sidebar.publishRequiresSave");
    if (props.isHosted && props.hostedValidationStatus !== "valid") {
        return t("sidebar.publishRequiresValidation");
    }
    return "";
});

// Auto-revert to draft if all chapters are removed while published
watch(
    () => chapters.value.length,
    (length) => {
        if (length === 0 && stateValue.value === RichPodState.Published) {
            richpodStore.setState(RichPodState.Draft);
        }
    },
);

const origin = computed(() => richpod.value.origin);
const artworkUrl = computed(
    () => origin.value?.episode?.artworkUrl || origin.value?.artworkUrl || "",
);
</script>

<style lang="scss" scoped>
.fade-validation-leave-active {
    transition: opacity 1s ease;
}

.fade-validation-leave-to {
    opacity: 0;
}
</style>
