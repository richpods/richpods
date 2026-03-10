<template>
    <dialog
        ref="dialogRef"
        class="p-0 rounded-lg shadow-xl backdrop:bg-black/40 open:flex"
        @close="handleCancel"
        @keydown.esc="handleCancel"
    >
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900">{{ t("pollDeleteModal.title") }}</h3>
                <button
                    type="button"
                    class="text-gray-500 hover:text-gray-700 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="isDeleting"
                    @click="handleCancel"
                    :aria-label="t('common.close')"
                >
                    ✕
                </button>
            </div>

            <p class="text-sm text-gray-600 mb-4">
                {{ t("pollDeleteModal.description") }}
            </p>

            <div class="space-y-3" role="group" :aria-label="t('pollDeleteModal.deleteOptionsAriaLabel')">
                <button
                    type="button"
                    role="button"
                    tabindex="0"
                    class="w-full px-4 py-3 text-left border-2 border-blue-500 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="isDeleting"
                    @click="handleDeleteChapterOnly"
                    @keydown.enter="handleDeleteChapterOnly"
                    @keydown.space.prevent="handleDeleteChapterOnly"
                >
                    <span class="font-medium text-blue-900">{{ t("pollDeleteModal.removeChapterOnly") }}</span>
                    <p class="text-sm text-blue-700 mt-1">
                        {{ t("pollDeleteModal.removeChapterOnlyHint") }}
                    </p>
                </button>

                <button
                    type="button"
                    role="button"
                    tabindex="0"
                    class="w-full px-4 py-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="isDeleting"
                    @click="handleDeleteBoth"
                    @keydown.enter="handleDeleteBoth"
                    @keydown.space.prevent="handleDeleteBoth"
                >
                    <span class="font-medium text-gray-700">
                        {{ isDeleting ? t("pollDeleteModal.deletingPoll") : t("pollDeleteModal.deleteBoth") }}
                    </span>
                    <p class="text-sm text-gray-500 mt-1">
                        {{ t("pollDeleteModal.deleteBothHint") }}
                    </p>
                </button>
            </div>

            <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>

            <div class="mt-4 flex justify-end">
                <button
                    type="button"
                    class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="isDeleting"
                    @click="handleCancel"
                >
                    {{ t("common.cancel") }}
                </button>
            </div>
        </div>
    </dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { deleteColoeussPoll } from "@/composables/useColoeus";

const { t } = useI18n();

const props = defineProps<{
    open: boolean;
    pollId: string;
}>();

const emit = defineEmits<{
    (e: "close"): void;
    (e: "delete-chapter-only"): void;
    (e: "delete-both"): void;
}>();

const dialogRef = ref<HTMLDialogElement>();
const isDeleting = ref(false);
const error = ref<string | null>(null);

watch(
    () => props.open,
    (isOpen) => {
        if (dialogRef.value) {
            if (isOpen && !dialogRef.value.open) {
                dialogRef.value.showModal();
                error.value = null;
            } else if (!isOpen && dialogRef.value.open) {
                dialogRef.value.close();
            }
        }
    },
);

function handleCancel() {
    if (isDeleting.value) return;
    emit("close");
}

function handleDeleteChapterOnly() {
    emit("delete-chapter-only");
}

async function handleDeleteBoth() {
    if (!props.pollId) {
        error.value = t("pollDeleteModal.missingPollId");
        return;
    }

    isDeleting.value = true;
    error.value = null;

    try {
        await deleteColoeussPoll(props.pollId);
        emit("delete-both");
    } catch (e) {
        error.value = e instanceof Error ? e.message : t("pollDeleteModal.deleteFailed");
    } finally {
        isDeleting.value = false;
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
