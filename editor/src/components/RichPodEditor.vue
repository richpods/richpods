<template>
    <div class="flex h-full bg-gray-50 relative">
        <div
            v-if="isDeleting"
            class="absolute inset-0 bg-white/80 flex items-center justify-center z-50"
        >
            <div class="flex flex-col items-center gap-3">
                <div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span class="text-gray-700 font-medium">{{ t("editor.deleting") }}</span>
            </div>
        </div>
        <div class="flex flex-col flex-1">
            <div class="lg:hidden flex border-b border-gray-200 bg-white">
                <button
                    class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors"
                    :class="activeEditorTab === 'details' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'"
                    @click="activeEditorTab = 'details'"
                >
                    {{ t("editor.detailsTab") }}
                </button>
                <button
                    class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors"
                    :class="activeEditorTab === 'chapters' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'"
                    @click="activeEditorTab = 'chapters'"
                >
                    {{ t("editor.chaptersTab") }}
                </button>
            </div>

            <div class="flex flex-1 overflow-hidden">
                <ChapterSidebar
                    v-if="!isLoading"
                    class="hidden lg:block"
                    :class="{ '!block': activeEditorTab === 'details' }"
                    :error="error"
                    :save-status="saveStatus"
                    :disable-add-chapter="disableAddChapter"
                    :add-chapter-disabled-reason="addChapterDisabledReason"
                    :verification-badge-class="verificationBadgeClass"
                    :verification-badge-label="verificationBadgeLabel"
                    :verification-message="verificationMessage"
                    :show-verification-action="showVerificationAction"
                    :verification-action-label="verificationActionLabel"
                    :is-hosted="isHosted"
                    :hosted-validation-status="hostedValidationStatus"
                    :hosted-validation-error="hostedValidationError"
                    @save="saveChanges"
                    @save-now="saveNow"
                    @add-chapter="openTypeChooser"
                    @go-to-verification="goToVerification"
                />
                <aside v-else class="hidden lg:block w-full lg:w-96 bg-white border-r border-gray-200" :class="{ '!block': activeEditorTab === 'details' }"></aside>

                <div
                    class="flex-1 hidden lg:flex flex-col bg-gray-100"
                    :class="{ '!flex': activeEditorTab === 'chapters' }"
                >
                    <ChapterWorkspace
                        :formatted-current-time="formattedCurrentTime"
                        :component-for="componentFor"
                        :remove-current-chapter="removeCurrentChapter"
                        :move-current-chapter="moveCurrentChapter"
                        :move-current-chapter-to-beginning="moveCurrentChapterToBeginning"
                        :duplicate-current-chapter="duplicateCurrentChapter"
                        :move-to-current-time-state="moveToCurrentTimeState"
                        :move-to-beginning-state="moveToBeginningState"
                        :is-first-chapter-not-at-beginning="isFirstChapterNotAtBeginning"
                        :duplicate-at-current-time-state="duplicateAtCurrentTimeState"
                        :disable-add-chapter="disableAddChapter"
                        :add-chapter-disabled-reason="addChapterDisabledReason"
                        :start-time-add-state="startTimeAddState"
                        :has-chapter-before-current-time="hasChapterBeforeCurrentTime"
                        :add-chapter-at-current-time="addChapterAtCurrentTime"
                        :add-chapter-at-start="addChapterAtStart"
                        :is-playing="isPlaybackActive"
                        :is-deleting="isDeleting"
                        :is-saving="isSaving"
                        :is-loading="isLoading"
                    />
                </div>
            </div>

            <div class="sticky bottom-0 bg-white border-t border-gray-200 px-0 py-0 z-10 lg:ml-96">
                <PlayerControls
                    mode="inline"
                    :audio-url="audioUrl"
                    :chapters="chaptersForPlayer"
                    @timeupdate="onTimeUpdate"
                    @durationchange="onDurationChange"
                    :disable-play="disablePlayback"
                    :disable-seeking="isSaving"
                    :hide-chapter-button="true"
                    :show-invisible-chapters="true"
                    @playback-change="onPlaybackChange"
                />
            </div>
        </div>
    </div>

    <TypeChooserModal
        :open="showTypeChooser"
        :enclosure-types="enclosureTypes"
        :verified="isVerified"
        :bypass-verification="hasPrivilegedRole()"
        :has-podcast-artwork="hasPodcastArtwork"
        :has-episode-artwork="hasEpisodeArtwork"
        @close="closeTypeChooser"
        @choose="chooseType"
        @choose-card="chooseCardType"
    />

    <PollDeleteConfirmModal
        :open="showPollDeleteModal"
        :poll-id="pendingPollDelete?.pollId ?? ''"
        @close="handlePollDeleteModalClose"
        @delete-chapter-only="handleDeleteChapterOnly"
        @delete-both="handleDeleteBoth"
    />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import PlayerControls from "@player/components/PlayerControls.vue";
import { toSeconds } from "@player/utils.ts";
import { h } from "vue";
import InteractiveChartEnclosure from "@player/components/enclosures/InteractiveChartEnclosure.vue";
import GeoMapEnclosure from "@player/components/enclosures/GeoMapEnclosure.vue";
import MarkdownEnclosure from "@player/components/enclosures/MarkdownEnclosure.vue";
import SlideshowEnclosure from "@player/components/enclosures/SlideshowEnclosure.vue";
import PollEnclosure from "@player/components/enclosures/PollEnclosure.vue";
import FactboxEnclosure from "@player/components/enclosures/FactboxEnclosure.vue";
import CardEnclosure from "@player/components/enclosures/CardEnclosure.vue";
import ChapterSidebar from "@/components/editor/ChapterSidebar.vue";
import ChapterWorkspace from "@/components/editor/ChapterWorkspace.vue";
import TypeChooserModal from "@/components/editor/TypeChooserModal.vue";
import PollDeleteConfirmModal from "@/components/editor/PollDeleteConfirmModal.vue";
import { useRichPodStore } from "@/stores/useRichPodStore";
import { useEditorUiStore } from "@/stores/useEditorUiStore";
import { useValidation } from "@/composables/useValidation";
import { useAutoSave } from "@/composables/useAutoSave";
import { fetchRichPodById, saveRichPod } from "@/services/richpodService";
import { useCurrentUserRole } from "@/composables/useCurrentUserRole";
import { useHostedValidation } from "@/composables/useHostedValidation";
import type { EditorChapter, EnclosureType, StartTimeAddState } from "@/types/editor";
import type { Component } from "vue";
import { provideSaveNow } from "@/composables/useSaveNow";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { hasPrivilegedRole } = useCurrentUserRole();
const richpodStore = useRichPodStore();
const editorUiStore = useEditorUiStore();
const { richpod, chapters, currentChapter, isDirty, isVerified, isHosted, hostedEpisodeId } =
    storeToRefs(richpodStore);

const { validationStatus: hostedValidationStatus, validationError: hostedValidationError } =
    useHostedValidation(hostedEpisodeId);
const { runValidation } = useValidation();

const richpodId = computed(() => route.params.id as string | undefined);
const { saveStatus, saveNow, dispose: disposeAutoSave } = useAutoSave(richpodId);
provideSaveNow(saveNow);

const activeEditorTab = ref<"details" | "chapters">("chapters");
const error = ref("");
const isLoading = ref(false);
const isDeleting = ref(false);
const isPlayerPaused = ref(true);
const isPlaybackActive = computed(() => !isPlayerPaused.value);
const disablePlayback = computed(() => isDirty.value);
const isSaving = computed(() => saveStatus.value === "saving");

function onPlaybackChange(state: "playing" | "paused") {
    isPlayerPaused.value = state !== "playing";
}

const showTypeChooser = ref(false);
const pendingChapterTime = ref<number | null>(null);
const showPollDeleteModal = ref(false);
const pendingPollDelete = ref<{ pollId: string } | null>(null);

async function loadRichPod() {
    editorUiStore.clearValidationErrors();
    if (!richpodId.value) {
        richpodStore.resetRichPod();
        error.value = "";
        return;
    }

    isLoading.value = true;
    error.value = "";
    richpodStore.resetRichPod();

    try {
        const data = await fetchRichPodById(richpodId.value);
        richpodStore.setRichPod(data);
    } catch (err: unknown) {
        console.error("Error loading RichPod:", err);
        error.value = err instanceof Error ? err.message : t("editor.loadFailed");
    } finally {
        isLoading.value = false;
    }
}

async function saveChanges() {
    if (!richpodId.value) {
        console.warn("No RichPod ID - this should have been created already");
        return;
    }

    error.value = "";

    const currentIndex = richpodStore.activeChapterIndex;

    try {
        const updated = await saveRichPod(richpodId.value, richpod.value);
        richpodStore.setRichPod(updated);
        richpodStore.setActiveChapterIndex(
            Math.min(currentIndex, updated.chapters.length - 1),
        );
        editorUiStore.clearValidationErrors();
    } catch (err: unknown) {
        console.error("Error saving RichPod:", err);
        error.value = err instanceof Error ? err.message : t("editor.saveFailed");
    }
}

watch(
    () => richpodId.value,
    () => {
        loadRichPod();
    },
);

onMounted(() => {
    loadRichPod();
    window.addEventListener("keydown", onKeyDown);
});

onUnmounted(() => {
    disposeAutoSave();
    window.removeEventListener("keydown", onKeyDown);
});

function isSaveShortcut(e: KeyboardEvent): boolean {
    if (e.defaultPrevented || e.isComposing || e.repeat) return false;
    if (e.altKey || e.shiftKey) return false;
    if (!e.metaKey && !e.ctrlKey) return false;

    return e.code === "KeyS" || e.key.toLowerCase() === "s";
}

function onKeyDown(e: KeyboardEvent) {
    if (!isSaveShortcut(e)) return;
    e.preventDefault();
    void saveNow();
}

onBeforeRouteLeave(async () => {
    if (isDirty.value) {
        await saveNow();
    }
});

const verificationBadgeLabel = computed(() => {
    if (isHosted.value) return t("sidebar.hostedBadge");
    return isVerified.value
        ? t("verificationStatus.verified")
        : t("verificationStatus.unverified");
});

const verificationBadgeClass = computed(() => {
    if (isHosted.value) return "bg-blue-100 text-blue-800";
    return isVerified.value
        ? "bg-green-100 text-green-800"
        : "bg-gray-100 text-gray-600";
});

const verificationMessage = computed(() => {
    if (isHosted.value) return "";
    return isVerified.value ? "" : t("verificationMessages.unverified");
});

const showVerificationAction = computed(() => {
    if (isHosted.value) return false;
    return !isVerified.value;
});

const verificationActionLabel = computed(() => t("sidebar.verifyPodcast"));

function goToVerification() {
    router.push("/verification");
}

const currentTime = ref(0);
const duration = ref(0);
function onTimeUpdate(t: number) {
    currentTime.value = t;
}
function onDurationChange(d: number) {
    duration.value = d;
}

const enclosureComponentMap: Record<string, Component> = {
    InteractiveChart: InteractiveChartEnclosure,
    GeoMap: GeoMapEnclosure,
    Markdown: MarkdownEnclosure,
    Slideshow: SlideshowEnclosure,
    Poll: PollEnclosure,
    Factbox: FactboxEnclosure,
    Card: CardEnclosure,
};

function componentFor(type?: string): Component {
    if (!type) {
        return () =>
            h("div", { class: "text-gray-500 p-4" }, t("editor.noComponentTypeSpecified"));
    }

    const component = enclosureComponentMap[type];
    if (!component) {
        return () =>
            h(
                "div",
                { class: "text-red-500 p-4" },
                t("editor.unknownComponentType", { type }),
            );
    }

    return component;
}

const currentChapterIndexComputed = computed(() => {
    const list = chapters.value;
    const t = currentTime.value;
    let idx = -1;
    for (let i = 0; i < list.length; i++) {
        if (toSeconds(list[i].begin) <= t) {
            idx = i;
        } else {
            break;
        }
    }
    return idx;
});

watch(
    currentChapterIndexComputed,
    (idx) => {
        richpodStore.setActiveChapterIndex(idx);
        if (!isLoading.value) {
            runValidation();
        }
    },
    { immediate: true },
);

watch(isPlaybackActive, (active) => {
    if (active) {
        closeTypeChooser();
    }
});

const audioUrl = computed(() => richpod.value.origin?.episode?.media?.url || undefined);
const chaptersForPlayer = computed(() => chapters.value as unknown as any[]);

const enclosureTypes: EnclosureType[] = [
    { type: "Markdown", icon: "\uD83D\uDCDD" },
    { type: "Factbox", icon: "\u2139\uFE0F" },
    { type: "Slideshow", icon: "\uD83D\uDDBC\uFE0F" },
    { type: "Poll", icon: "\uD83D\uDCCB" },
    { type: "GeoMap", icon: "\uD83D\uDDFA\uFE0F" },
    { type: "InteractiveChart", icon: "\uD83D\uDCCA" },
    { type: "Card", icon: "\uD83C\uDFF7\uFE0F" },
];

const hasPodcastArtwork = computed(() => !!richpod.value.origin?.artworkUrl);
const hasEpisodeArtwork = computed(() => !!richpod.value.origin?.episode?.artworkUrl);

function openTypeChooser(event?: MouseEvent) {
    if (event) event.preventDefault();
    if (isPlaybackActive.value) {
        return;
    }
    addChapterAtTime(currentTime.value);
}

function closeTypeChooser() {
    showTypeChooser.value = false;
    pendingChapterTime.value = null;
}

function formatBegin(t: number): string {
    const hours = Math.floor(t / 3600);
    const minutes = Math.floor((t % 3600) / 60);
    const seconds = Math.floor(t % 60);
    const pad2 = (n: number) => n.toString().padStart(2, "0");
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.000`;
}

function addChapterAtTime(time: number) {
    if (isPlaybackActive.value) {
        return;
    }
    pendingChapterTime.value = time;
    showTypeChooser.value = true;
}

function chooseType(type: string) {
    if (isPlaybackActive.value) {
        closeTypeChooser();
        return;
    }
    const enclosure: EditorChapter["enclosure"] = {
        __typename: type,
        title: "",
    };
    if (type === "Markdown") {
        enclosure.text = "";
    }
    if (type === "InteractiveChart") {
        enclosure.description = "";
        // Initialize with default plain-data format for basic mode
        enclosure.chartFormat = "PLAIN_DATA";
        enclosure.chart = {
            data: [
                ["", t("chartEditor.defaultSeries")],
                [t("chartEditor.defaultCategoryA"), 10],
                [t("chartEditor.defaultCategoryB"), 20],
                [t("chartEditor.defaultCategoryC"), 30],
            ],
            metadata: {
                type: "BAR_CHART",
                aspectRatio: "16:9",
            },
        };
    }
    if (type === "GeoMap") {
        enclosure.description = "";
        enclosure.geoJSON = {};
    }
    if (type === "Slideshow") {
        enclosure.description = "";
        enclosure.slides = [];
    }
    if (type === "Poll") {
        enclosure.coloeus = {
            endpoint: "",
            pollId: "",
        };
    }
    if (type === "Factbox") {
        enclosure.text = "";
        enclosure.links = [];
    }

    // Card type should never reach here; handled by chooseCardType
    if (type === "Card") {
        closeTypeChooser();
        return;
    }

    const time = pendingChapterTime.value ?? currentTime.value;
    const begin = formatBegin(time);
    // Mark as new so mode switching is allowed until saved
    const newChapter: EditorChapter = { begin, enclosure, _isNew: true };
    richpodStore.addChapter(newChapter);
    runValidation();
    showTypeChooser.value = false;
    pendingChapterTime.value = null;
}

function chooseCardType(cardType: "LINK" | "COVER" | "CITATION" | "IMAGE" | "BLANK") {
    if (isPlaybackActive.value) {
        closeTypeChooser();
        return;
    }

    const enclosure: EditorChapter["enclosure"] = {
        __typename: "Card",
        cardType,
        visibleAsChapter: cardType !== "BLANK",
    };

    switch (cardType) {
        case "LINK":
            enclosure.title = "";
            enclosure.url = "";
            enclosure.description = "";
            enclosure.openGraph = undefined;
            break;
        case "COVER":
            enclosure.title = "";
            enclosure.coverSource = hasPodcastArtwork.value
                ? "podcast"
                : hasEpisodeArtwork.value
                    ? "episode"
                    : "podcast";
            break;
        case "CITATION":
            enclosure.title = "";
            enclosure.quoteText = "";
            enclosure.citationSource = "";
            enclosure.citationUrl = "";
            break;
        case "IMAGE":
            enclosure.title = "";
            enclosure.imageUrl = "";
            enclosure.imageAlt = "";
            enclosure.imageLink = "";
            break;
        case "BLANK":
            enclosure.title = "[empty card]";
            enclosure.visibleAsChapter = false;
            break;
    }

    const time = pendingChapterTime.value ?? currentTime.value;
    const begin = formatBegin(time);
    const newChapter: EditorChapter = { begin, enclosure, _isNew: true };
    richpodStore.addChapter(newChapter);
    runValidation();
    showTypeChooser.value = false;
    pendingChapterTime.value = null;
}

const formattedCurrentTime = computed(() => {
    const t = currentTime.value;
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
});

function chapterAddStateFor(time: number, successMessage: string, skipIndex = -1): StartTimeAddState {
    if (!richpod.value.origin?.episode?.media?.url) {
        return { disabled: true, reason: t("editor.loadAudioToAddChapters") };
    }
    for (let i = 0; i < chapters.value.length; i++) {
        if (i === skipIndex) continue;
        const diff = Math.abs(toSeconds(chapters.value[i].begin) - time);
        if (diff < 3) {
            if (diff < 0.001) {
                return { disabled: true, reason: t("editor.chapterAlreadyStartsAtTime") };
            }
            return {
                disabled: true,
                reason: t("editor.tooCloseToAnotherChapter", { seconds: diff.toFixed(1) }),
            };
        }
    }
    return { disabled: false, reason: successMessage };
}

const currentTimeAddState = computed<StartTimeAddState>(() => {
    if (isPlaybackActive.value) {
        return { disabled: true, reason: t("editor.pausePlaybackToAddChapters") };
    }
    return chapterAddStateFor(currentTime.value, t("editor.addChapterAtCurrentTimeHint"));
});
const disableAddChapter = computed(() => currentTimeAddState.value.disabled);
const addChapterDisabledReason = computed(() => currentTimeAddState.value.reason);
const startTimeAddState = computed<StartTimeAddState>(() => {
    if (isPlaybackActive.value) {
        return { disabled: true, reason: t("editor.pausePlaybackToAddChapters") };
    }
    return chapterAddStateFor(0, t("editor.addChapterAtStartHint"));
});

const hasChapterBeforeCurrentTime = computed(() => currentChapterIndexComputed.value >= 0);

function addChapterAtCurrentTime() {
    if (disableAddChapter.value) return;
    addChapterAtTime(currentTime.value);
}

function addChapterAtStart() {
    if (startTimeAddState.value.disabled) return;
    addChapterAtTime(0);
}

const moveToCurrentTimeState = computed<StartTimeAddState>(() => {
    if (isPlaybackActive.value) {
        return { disabled: true, reason: t("editor.pausePlaybackToAddChapters") };
    }
    return chapterAddStateFor(
        currentTime.value,
        t("editor.moveToCurrentTimeDescription"),
        currentChapterIndexComputed.value,
    );
});

const isFirstChapterNotAtBeginning = computed(() => {
    const idx = currentChapterIndexComputed.value;
    return idx === 0 && toSeconds(chapters.value[0]?.begin ?? "0") > 0;
});

const moveToBeginningState = computed<StartTimeAddState>(() => {
    if (isPlaybackActive.value) {
        return { disabled: true, reason: t("editor.pausePlaybackToAddChapters") };
    }
    return chapterAddStateFor(0, t("editor.moveToBeginningDescription"), 0);
});

const duplicateAtCurrentTimeState = computed<StartTimeAddState>(() => {
    if (isPlaybackActive.value) {
        return { disabled: true, reason: t("editor.pausePlaybackToAddChapters") };
    }
    return chapterAddStateFor(currentTime.value, t("editor.duplicateAtCurrentTimeDescription"));
});

function moveChapterToTime(idx: number, time: number) {
    if (idx < 0) return;
    const chapter = chapters.value[idx];
    if (!chapter) return;
    richpodStore.removeChapterAt(idx);
    richpodStore.addChapter({
        begin: formatBegin(time),
        enclosure: chapter.enclosure,
        _isNew: chapter._isNew,
    });
    saveNow();
}

function moveCurrentChapter() {
    if (moveToCurrentTimeState.value.disabled) return;
    moveChapterToTime(currentChapterIndexComputed.value, currentTime.value);
}

function moveCurrentChapterToBeginning() {
    if (moveToBeginningState.value.disabled) return;
    moveChapterToTime(0, 0);
}

function duplicateCurrentChapter() {
    if (duplicateAtCurrentTimeState.value.disabled) return;
    const chapter = currentChapter.value;
    if (!chapter) return;
    richpodStore.addChapter({
        begin: formatBegin(currentTime.value),
        enclosure: { ...chapter.enclosure },
        _isNew: true,
    });
    saveNow();
}

async function removeCurrentChapter() {
    const idx = currentChapterIndexComputed.value;
    if (idx < 0) return;

    const chapter = chapters.value[idx];
    if (chapter?.enclosure.__typename === "Poll" && chapter.enclosure.coloeus?.pollId) {
        pendingPollDelete.value = {
            pollId: chapter.enclosure.coloeus.pollId,
        };
        showPollDeleteModal.value = true;
        return;
    }

    await removeChapterAndSave(idx);
}

function handlePollDeleteModalClose() {
    showPollDeleteModal.value = false;
    pendingPollDelete.value = null;
}

async function removeChapterAndSave(idx: number) {
    if (idx < 0 || !richpodId.value) return;

    isDeleting.value = true;
    error.value = "";

    try {
        const targetIndex = Math.max(idx - 1, 0);
        richpodStore.removeChapterAt(idx);

        const updated = await saveRichPod(richpodId.value, richpod.value);
        richpodStore.setRichPod(updated, targetIndex);
        editorUiStore.clearValidationErrors();
    } catch (err: unknown) {
        console.error("Error deleting chapter:", err);
        error.value = err instanceof Error ? err.message : t("editor.deleteFailed");
    } finally {
        isDeleting.value = false;
    }
}

async function handleDeleteChapterOnly() {
    const idx = currentChapterIndexComputed.value;
    showPollDeleteModal.value = false;
    await removeChapterAndSave(idx);
    pendingPollDelete.value = null;
}

async function handleDeleteBoth() {
    const idx = currentChapterIndexComputed.value;
    showPollDeleteModal.value = false;
    await removeChapterAndSave(idx);
    pendingPollDelete.value = null;
}
</script>
