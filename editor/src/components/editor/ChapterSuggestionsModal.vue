<template>
    <dialog
        ref="dialogRef"
        class="p-0 rounded-lg shadow-xl backdrop:bg-black/40 open:flex"
        @close="handleClose"
        @keydown.esc="handleClose"
    >
        <div class="bg-white rounded-lg p-6 w-full max-w-xl flex flex-col max-h-[80vh]">
            <div class="flex items-start justify-between mb-2">
                <h3 class="text-lg font-medium">{{ t("chapterGeneration.modalTitle") }}</h3>
                <button
                    type="button"
                    class="text-gray-500 hover:text-gray-700 p-1"
                    @click="handleClose"
                    :aria-label="t('common.close')"
                >
                    <Icon icon="ion:close" class="w-5 h-5" />
                </button>
            </div>
            <p class="text-sm text-gray-500 mb-4">{{ t("chapterGeneration.modalDescription") }}</p>

            <div v-if="suggestions.length === 0" class="py-8 text-center text-sm text-gray-500">
                {{ t("chapterGeneration.empty") }}
            </div>

            <template v-else>
                <label
                    v-if="selectableIndices.length > 0"
                    class="flex items-center gap-2 mb-3 text-sm text-gray-700 cursor-pointer"
                >
                    <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        :checked="allSelected"
                        @change="toggleAll"
                    />
                    {{ t("chapterGeneration.selectAll") }}
                </label>

                <ul class="space-y-1 overflow-y-auto flex-1 -mx-1 px-1">
                    <li v-for="(item, index) in items" :key="index">
                        <label
                            class="w-full flex items-center gap-3 px-2 py-2 rounded-md text-left"
                            :class="
                                item.disabled
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:bg-gray-50 cursor-pointer'
                            "
                            :title="item.disabled ? t('chapterGeneration.collision') : undefined"
                        >
                            <input
                                type="checkbox"
                                class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
                                :checked="selected.has(index)"
                                :disabled="item.disabled"
                                @change="toggle(index)"
                            />
                            <span
                                class="font-mono tabular-nums text-xs text-gray-500 w-14 flex-shrink-0"
                            >
                                {{ item.time }}
                            </span>
                            <Icon
                                :icon="item.icon"
                                class="w-4 h-4 flex-shrink-0 text-gray-600"
                                aria-hidden="true"
                            />
                            <span class="flex-1 min-w-0">
                                <span class="block truncate text-sm text-gray-800">{{
                                    item.title
                                }}</span>
                                <span class="block text-xs text-gray-400">
                                    {{ item.typeLabel
                                    }}<template v-if="item.disabled">
                                        · {{ t("chapterGeneration.collision") }}</template
                                    >
                                </span>
                            </span>
                        </label>
                    </li>
                </ul>
            </template>

            <div class="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-gray-200">
                <button
                    type="button"
                    class="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
                    @click="handleClose"
                >
                    {{ t("chapterGeneration.cancel") }}
                </button>
                <button
                    type="button"
                    class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="selected.size === 0"
                    @click="accept"
                >
                    {{ t("chapterGeneration.accept", { n: selected.size }) }}
                </button>
            </div>
        </div>
    </dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import { toSeconds } from "@player/utils.ts";
import { formatTime } from "@richpods/shared/utils/time";
import type { EditorChapter, EditorEnclosure } from "@/types/editor";

const { t } = useI18n();

const props = defineProps<{
    open: boolean;
    suggestions: EditorChapter[];
    existingChapterBegins: string[];
}>();

// Mirrors the Cloud Function's MIN_CHAPTER_GAP_SECONDS: a chapter spans until the
// next one begins, so a suggestion landing within this many seconds of an existing
// chapter would collide with it. Such suggestions are shown but cannot be selected.
const MIN_CHAPTER_GAP_SECONDS = 10;

const emit = defineEmits<{
    (e: "close"): void;
    (e: "accept", chapters: EditorChapter[]): void;
}>();

const dialogRef = ref<HTMLDialogElement>();
const selected = ref<Set<number>>(new Set());

function typeMeta(enclosure: EditorEnclosure): { icon: string; typeLabel: string } {
    if (enclosure.__typename === "Card") {
        if (enclosure.cardType === "CITATION") {
            return {
                icon: "ion:chatbox-ellipses-outline",
                typeLabel: t("chapterGeneration.typeCitation"),
            };
        }
        return { icon: "ion:link-outline", typeLabel: t("chapterGeneration.typeLink") };
    }
    if (enclosure.__typename === "GeoMap") {
        return { icon: "ion:map-outline", typeLabel: t("chapterGeneration.typeGeoMap") };
    }
    return { icon: "ion:document-text-outline", typeLabel: t("chapterGeneration.typeMarkdown") };
}

function titleFor(enclosure: EditorEnclosure): string {
    const title = enclosure.title?.trim();
    if (title) return title;
    if (enclosure.quoteText?.trim()) return enclosure.quoteText.trim();
    return t("sidebar.chapterUntitled");
}

const existingSeconds = computed(() =>
    props.existingChapterBegins.map((begin) => toSeconds(begin)),
);

function collidesWithExisting(beginSeconds: number): boolean {
    return existingSeconds.value.some(
        (existing) => Math.abs(existing - beginSeconds) < MIN_CHAPTER_GAP_SECONDS,
    );
}

const items = computed(() =>
    props.suggestions.map((chapter) => {
        const meta = typeMeta(chapter.enclosure);
        const seconds = toSeconds(chapter.begin);
        return {
            time: formatTime(seconds),
            icon: meta.icon,
            typeLabel: meta.typeLabel,
            title: titleFor(chapter.enclosure),
            disabled: collidesWithExisting(seconds),
        };
    }),
);

const selectableIndices = computed(() =>
    items.value.reduce<number[]>((acc, item, index) => {
        if (!item.disabled) acc.push(index);
        return acc;
    }, []),
);

const allSelected = computed(
    () =>
        selectableIndices.value.length > 0 &&
        selected.value.size === selectableIndices.value.length,
);

function toggle(index: number) {
    if (items.value[index]?.disabled) return;
    const next = new Set(selected.value);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    selected.value = next;
}

function toggleAll() {
    if (allSelected.value) {
        selected.value = new Set();
    } else {
        selected.value = new Set(selectableIndices.value);
    }
}

function handleClose() {
    emit("close");
}

function accept() {
    const chapters = props.suggestions.filter(
        (_, index) => selected.value.has(index) && !items.value[index]?.disabled,
    );
    emit("accept", chapters);
}

watch(
    () => props.open,
    (isOpen) => {
        if (isOpen) {
            selected.value = new Set(selectableIndices.value);
            if (!dialogRef.value?.open) dialogRef.value?.showModal();
        } else if (dialogRef.value?.open) {
            dialogRef.value?.close();
        }
    },
);
</script>

<style lang="scss" scoped>
dialog[open] {
    display: flex;
    align-items: center;
    justify-content: center;
}

dialog::backdrop {
    background-color: rgba(0, 0, 0, 0.4);
}
</style>
