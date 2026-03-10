<template>
    <div class="space-y-3">
        <div class="flex items-center justify-between">
            <label class="block text-sm font-medium text-gray-700">
                {{ t("factboxEditor.linkEditor.title", { count: links.length, maxLinks }) }}
            </label>
            <button
                v-if="links.length < maxLinks"
                type="button"
                class="text-sm text-blue-600 hover:text-blue-500 flex items-center gap-1"
                @click="addLink"
            >
                <span class="text-lg leading-none">+</span>
                {{ t("factboxEditor.linkEditor.addLink") }}
            </button>
        </div>

        <div v-if="links.length === 0" class="text-sm text-gray-500 py-2">
            {{ t("factboxEditor.linkEditor.emptyState") }}
        </div>

        <TransitionGroup name="link-list" tag="div" class="space-y-2">
            <div
                v-for="(link, index) in links"
                :key="linkKeys[index]"
                class="flex items-start gap-2 p-3 border border-gray-200 rounded-md bg-gray-50"
                :class="{
                    'border-blue-400 bg-blue-50/50': dragOverIndex === index && dragOverIndex !== dragIndex,
                    'opacity-50': dragIndex === index,
                }"
                :draggable="canReorder"
                @dragstart="onDragStart(index, $event)"
                @dragover.prevent="onDragOver(index)"
                @dragleave="onDragLeave"
                @drop.prevent="onDrop(index)"
                @dragend="onDragEnd"
            >
                <!-- Drag handle + touch reorder buttons -->
                <div
                    v-if="canReorder"
                    class="flex flex-col items-center gap-0.5 pt-1 shrink-0"
                >
                    <!-- Drag handle (hidden on touch) -->
                    <div
                        class="drag-handle cursor-grab text-gray-400 hover:text-gray-600 touch-hidden"
                        :title="t('factboxEditor.linkEditor.dragHandle')"
                        :aria-label="t('factboxEditor.linkEditor.dragHandle')"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="w-4 h-5"
                            viewBox="0 0 16 20"
                            fill="currentColor"
                        >
                            <circle cx="5" cy="4" r="1.5" />
                            <circle cx="11" cy="4" r="1.5" />
                            <circle cx="5" cy="10" r="1.5" />
                            <circle cx="11" cy="10" r="1.5" />
                            <circle cx="5" cy="16" r="1.5" />
                            <circle cx="11" cy="16" r="1.5" />
                        </svg>
                    </div>
                    <!-- Touch move buttons (hidden on pointer devices) -->
                    <div class="touch-only flex flex-col gap-0.5">
                        <button
                            type="button"
                            class="p-0.5 text-gray-400 hover:text-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            :disabled="index === 0"
                            :title="t('factboxEditor.linkEditor.moveUp')"
                            :aria-label="t('factboxEditor.linkEditor.moveUp')"
                            @click="moveLink(index, -1)"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="w-4 h-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fill-rule="evenodd"
                                    d="M10 3a1 1 0 01.707.293l5 5a1 1 0 01-1.414 1.414L10 5.414 5.707 9.707a1 1 0 01-1.414-1.414l5-5A1 1 0 0110 3z"
                                    clip-rule="evenodd"
                                />
                            </svg>
                        </button>
                        <button
                            type="button"
                            class="p-0.5 text-gray-400 hover:text-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            :disabled="index === links.length - 1"
                            :title="t('factboxEditor.linkEditor.moveDown')"
                            :aria-label="t('factboxEditor.linkEditor.moveDown')"
                            @click="moveLink(index, 1)"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="w-4 h-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fill-rule="evenodd"
                                    d="M10 17a1 1 0 01-.707-.293l-5-5a1 1 0 011.414-1.414L10 14.586l4.293-4.293a1 1 0 011.414 1.414l-5 5A1 1 0 0110 17z"
                                    clip-rule="evenodd"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="flex-1 space-y-2">
                    <div>
                        <label :for="`link-label-${linkKeys[index]}`" class="sr-only">
                            {{ t("factboxEditor.linkEditor.linkLabel") }}
                        </label>
                        <input
                            :id="`link-label-${linkKeys[index]}`"
                            :value="link.label"
                            type="text"
                            :placeholder="t('factboxEditor.linkEditor.linkLabelPlaceholder')"
                            class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            @input="updateLink(index, 'label', ($event.target as HTMLInputElement).value)"
                            @blur="handleBlur"
                        />
                    </div>
                    <div>
                        <label :for="`link-url-${linkKeys[index]}`" class="sr-only">
                            {{ t("factboxEditor.linkEditor.linkUrl") }}
                        </label>
                        <input
                            :id="`link-url-${linkKeys[index]}`"
                            :value="link.url"
                            type="url"
                            :placeholder="t('factboxEditor.linkEditor.linkUrlPlaceholder')"
                            class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            :class="{ 'border-red-300': !isValidUrl(link.url) && link.url }"
                            @input="updateLink(index, 'url', ($event.target as HTMLInputElement).value)"
                            @blur="handleBlur"
                        />
                        <p v-if="!isValidUrl(link.url) && link.url" class="mt-1 text-xs text-red-600">
                            {{ t("factboxEditor.linkEditor.invalidUrl") }}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    :title="t('factboxEditor.linkEditor.removeLink')"
                    @click="removeLink(index)"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </TransitionGroup>

        <p v-if="links.length >= 3" class="text-xs text-gray-500">
            {{ t("factboxEditor.linkEditor.maxLinksReached", { maxLinks }) }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { EditorFactboxLink } from "@/types/editor";

const props = defineProps<{
    links: EditorFactboxLink[];
}>();

const { t } = useI18n();
const maxLinks = 3;

const emit = defineEmits<{
    (e: "update:links", links: EditorFactboxLink[]): void;
    (e: "blur"): void;
}>();

// Stable keys for TransitionGroup so items keep identity across reorders
let nextKey = 0;
const linkKeys = ref<number[]>([]);

watch(
    () => props.links.length,
    (newLen, oldLen) => {
        if (newLen > (oldLen ?? 0)) {
            // Item added — append new keys for the new items
            const toAdd = newLen - linkKeys.value.length;
            for (let i = 0; i < toAdd; i++) {
                linkKeys.value.push(nextKey++);
            }
        } else if (newLen < (oldLen ?? 0)) {
            // Item removed — trim keys to match length
            linkKeys.value = linkKeys.value.slice(0, newLen);
        }
    },
    { immediate: true },
);

const canReorder = computed(() => props.links.length >= 2);

// --- Drag & drop state ---
const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

function onDragStart(index: number, event: DragEvent) {
    dragIndex.value = index;
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        // Firefox requires drag data to be set for custom draggable elements.
        event.dataTransfer.setData("text/plain", String(index));
    }
}

function onDragOver(index: number) {
    dragOverIndex.value = index;
}

function onDragLeave() {
    dragOverIndex.value = null;
}

function onDrop(targetIndex: number) {
    if (dragIndex.value === null || dragIndex.value === targetIndex) return;
    reorderLinks(dragIndex.value, targetIndex);
    dragOverIndex.value = null;
    dragIndex.value = null;
}

function onDragEnd() {
    dragIndex.value = null;
    dragOverIndex.value = null;
}

function reorderLinks(fromIndex: number, toIndex: number) {
    const newLinks = [...props.links];
    const newKeys = [...linkKeys.value];
    const [movedLink] = newLinks.splice(fromIndex, 1);
    const [movedKey] = newKeys.splice(fromIndex, 1);
    newLinks.splice(toIndex, 0, movedLink);
    newKeys.splice(toIndex, 0, movedKey);
    linkKeys.value = newKeys;
    emit("update:links", newLinks);
    emit("blur");
}

function moveLink(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= props.links.length) return;
    reorderLinks(index, targetIndex);
}

// --- Existing CRUD ---

function addLink() {
    if (props.links.length >= maxLinks) return;
    emit("update:links", [...props.links, { label: "", url: "" }]);
}

function removeLink(index: number) {
    const newLinks = [...props.links];
    newLinks.splice(index, 1);
    const newKeys = [...linkKeys.value];
    newKeys.splice(index, 1);
    linkKeys.value = newKeys;
    emit("update:links", newLinks);
    emit("blur");
}

function updateLink(index: number, field: "label" | "url", value: string) {
    const newLinks = [...props.links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    emit("update:links", newLinks);
}

function handleBlur() {
    emit("blur");
}

function isValidUrl(url: string): boolean {
    if (!url) return true;
    try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}
</script>

<style lang="scss" scoped>
.link-list-enter-active,
.link-list-leave-active {
    transition: all 0.2s ease;
}

.link-list-enter-from,
.link-list-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

.link-list-move {
    transition: transform 0.2s ease;
}

/* Show drag handle on pointer devices, hide on touch */
.touch-hidden {
    display: block;
}

.touch-only {
    display: none;
}

@media (pointer: coarse) {
    .touch-hidden {
        display: none;
    }

    .touch-only {
        display: flex;
    }
}
</style>
