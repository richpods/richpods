<template>
    <div class="flex-1 flex items-start justify-center p-2 lg:p-6 overflow-y-auto pb-28 w-full">
        <div :class="['w-full mx-auto p-0 bg-white border border-gray-200 rounded-lg shadow-sm', wideMode ? '' : 'max-w-4xl']">
            <template v-if="isLoading">
                <div class="px-3 lg:px-6 py-16 flex flex-col items-center justify-center text-gray-600">
                    <div
                        class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
                    ></div>
                    <p class="mt-4 text-sm">{{ t("editor.loadingChapterEditor") }}</p>
                </div>
            </template>
            <template v-else-if="isPlaying">
                <div class="px-3 lg:px-6 py-10 text-gray-600">
                    <p class="text-sm mb-4">
                        {{ t("editor.playbackActive") }}
                    </p>
                    <ChapterPreviewPane :component-for="componentFor" />
                </div>
            </template>
            <template v-else>
                <template v-if="currentChapter">
                    <div class="px-3 lg:px-6 pt-4 pb-6">
                        <div class="flex items-center border-b mb-4">
                            <button
                                v-for="tab in tabs"
                                :key="tab"
                                @click="activeTab = tab"
                                :class="[
                                    'px-4 py-2 -mb-px border-b-2',
                                    activeTab === tab
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-600 hover:text-gray-800',
                                ]"
                            >
                                <Icon :icon="tabIcons[tab]" class="w-4 h-4 mr-1.5 inline" />{{ tabLabels[tab] }}
                            </button>
                        </div>

                        <ChapterEditForm
                            v-if="activeTab === 'Edit'"
                        />

                        <ChapterPreviewPane
                            v-else-if="activeTab === 'Preview'"
                            :component-for="componentFor"
                        />

                        <div v-else-if="activeTab === 'Actions'" class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-4 items-center pt-2">
                            <button
                                class="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                @click="moveCurrentChapter(); activeTab = 'Edit'"
                                :disabled="moveToCurrentTimeState.disabled || isSaving"
                                :title="moveToCurrentTimeState.reason"
                            >
                                {{ t("editor.moveToCurrentTime") }}
                            </button>
                            <p class="text-sm text-gray-500">{{ t("editor.moveToCurrentTimeDescription") }}</p>

                            <template v-if="isFirstChapterNotAtBeginning">
                                <button
                                    class="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                    @click="moveCurrentChapterToBeginning(); activeTab = 'Edit'"
                                    :disabled="moveToBeginningState.disabled || isSaving"
                                    :title="moveToBeginningState.reason"
                                >
                                    {{ t("editor.moveToBeginning") }}
                                </button>
                                <p class="text-sm text-gray-500">{{ t("editor.moveToBeginningDescription") }}</p>
                            </template>

                            <button
                                class="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                @click="duplicateCurrentChapter(); activeTab = 'Edit'"
                                :disabled="duplicateAtCurrentTimeState.disabled || isSaving"
                                :title="duplicateAtCurrentTimeState.reason"
                            >
                                {{ t("editor.duplicateAtCurrentTime") }}
                            </button>
                            <p class="text-sm text-gray-500">{{ t("editor.duplicateAtCurrentTimeDescription") }}</p>

                            <hr class="col-span-2 border-gray-200 my-3" />

                            <button
                                class="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 hover:border-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                @click="removeCurrentChapter(); activeTab = 'Edit'"
                                :disabled="!currentChapter || isDeleting || isSaving || isLastChapterOfPublished"
                                :title="isLastChapterOfPublished ? t('editor.cannotDeleteLastPublishedChapter') : currentChapter ? t('editor.removeThisChapter') : t('editor.noChapterToRemove')"
                            >
                                {{ t("editor.deleteChapter") }}
                            </button>
                            <p class="text-sm text-gray-500">{{ t("editor.deleteChapterDescription") }}</p>
                        </div>
                    </div>
                </template>
                <template v-else>
                    <div class="px-3 lg:px-6 py-10 text-center text-gray-500">
                        <p>{{ t("editor.noCurrentChapter", { time: formattedCurrentTime }) }}</p>
                        <div class="mt-6 flex flex-col items-center gap-3">
                            <button
                                v-if="!hasChapterBeforeCurrentTime"
                                class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                :disabled="startTimeAddState.disabled"
                                @click="addChapterAtStart"
                                :title="startTimeAddState.reason"
                            >
                                {{ t("editor.addChapterAtStart") }}
                            </button>
                            <button
                                class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                :disabled="disableAddChapter"
                                @click="addChapterAtCurrentTime"
                                :title="addChapterDisabledReason"
                            >
                                {{ t("editor.addChapterAtCurrentTime") }}
                            </button>
                        </div>
                    </div>
                </template>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, watch } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useRichPodStore } from "@/stores/useRichPodStore";
import { RichPodState } from "@/graphql/generated";
import { Icon } from "@iconify/vue";
import ChapterEditForm from "./ChapterEditForm.vue";
import ChapterPreviewPane from "./ChapterPreviewPane.vue";
import type { StartTimeAddState } from "@/types/editor";
import type { Component } from "vue";

const { t } = useI18n();

const props = defineProps<{
    formattedCurrentTime: string;
    componentFor: (type?: string) => Component;
    removeCurrentChapter: () => void;
    moveCurrentChapter: () => void;
    moveCurrentChapterToBeginning: () => void;
    duplicateCurrentChapter: () => void;
    moveToCurrentTimeState: StartTimeAddState;
    moveToBeginningState: StartTimeAddState;
    isFirstChapterNotAtBeginning: boolean;
    duplicateAtCurrentTimeState: StartTimeAddState;
    disableAddChapter: boolean;
    addChapterDisabledReason: string;
    startTimeAddState: StartTimeAddState;
    hasChapterBeforeCurrentTime: boolean;
    addChapterAtCurrentTime: () => void;
    addChapterAtStart: () => void;
    isPlaying: boolean;
    isDeleting: boolean;
    isSaving: boolean;
    isLoading: boolean;
}>();

const {
    formattedCurrentTime,
    componentFor,
    moveToCurrentTimeState,
    moveToBeginningState,
    isFirstChapterNotAtBeginning,
    duplicateAtCurrentTimeState,
    disableAddChapter,
    addChapterDisabledReason,
    startTimeAddState,
    hasChapterBeforeCurrentTime,
    isPlaying,
    isDeleting,
    isSaving,
    isLoading,
} = toRefs(props);

const {
    removeCurrentChapter,
    moveCurrentChapter,
    moveCurrentChapterToBeginning,
    duplicateCurrentChapter,
    addChapterAtCurrentTime,
    addChapterAtStart,
} = props;

const richpodStore = useRichPodStore();
const { currentChapter, chapters, state } = storeToRefs(richpodStore);

const isLastChapterOfPublished = computed(
    () => state.value === RichPodState.Published && chapters.value.length <= 1,
);

const wideMode = computed(
    () => currentChapter.value?.enclosure.__typename === "GeoMap",
);

const tabs = ["Edit", "Preview", "Actions"] as const;
type Tab = typeof tabs[number];
const activeTab = ref<Tab>("Edit");

const tabLabels = computed<Record<Tab, string>>(() => ({
    Edit: t("editor.editTab"),
    Preview: t("editor.previewTab"),
    Actions: t("editor.actionsTab"),
}));

const tabIcons: Record<Tab, string> = {
    Edit: "ion:build-outline",
    Preview: "ion:search-outline",
    Actions: "ion:ellipsis-horizontal",
};

watch(currentChapter, (chapter) => {
    if (!chapter) {
        activeTab.value = "Edit";
    }
});
</script>
