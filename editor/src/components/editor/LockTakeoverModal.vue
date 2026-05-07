<template>
    <dialog
        ref="dialogRef"
        class="p-0 rounded-lg shadow-xl backdrop:bg-black/40 open:flex"
        @cancel.prevent
        @keydown.esc.prevent
    >
        <div
            class="bg-white rounded-lg p-6 w-full max-w-md"
            :class="kicked ? 'border-2 border-red-500' : ''"
        >
            <h3 class="text-lg font-medium mb-2" :class="kicked ? 'text-red-700' : 'text-gray-900'">
                {{ kicked ? t("lock.kickedTitle") : t("lock.takeoverTitle") }}
            </h3>
            <p class="text-sm mb-2" :class="kicked ? 'text-red-700' : 'text-gray-600'">
                {{
                    kicked
                        ? t("lock.kickedMessage", { name: holderName })
                        : t("lock.lockedByMessage", { name: holderName })
                }}
            </p>
            <p class="text-sm mb-4" :class="kicked ? 'text-red-600' : 'text-gray-500'">
                {{ kicked ? t("lock.kickedWarning") : t("lock.takeoverWarning") }}
            </p>

            <div class="space-y-3" role="group" :aria-label="t('lock.actionsAriaLabel')">
                <button
                    type="button"
                    class="w-full px-4 py-3 text-left border-2 rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    :class="
                        kicked
                            ? 'border-red-500 bg-red-50 hover:bg-red-100 focus:ring-red-500'
                            : 'border-blue-500 bg-blue-50 hover:bg-blue-100 focus:ring-blue-500'
                    "
                    :disabled="busy"
                    @click="emit('go-back')"
                >
                    <span class="font-medium" :class="kicked ? 'text-red-900' : 'text-blue-900'">
                        {{ t("lock.goBack") }}
                    </span>
                    <p class="text-sm mt-1" :class="kicked ? 'text-red-700' : 'text-blue-700'">
                        {{ t("lock.goBackHint") }}
                    </p>
                </button>

                <button
                    type="button"
                    class="w-full px-4 py-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="busy"
                    @click="emit('takeover')"
                >
                    <span class="font-medium text-gray-700">
                        {{
                            busy
                                ? t("lock.takingOver")
                                : kicked
                                  ? t("lock.takeBackOver")
                                  : t("lock.takeover")
                        }}
                    </span>
                    <p class="text-sm text-gray-500 mt-1">
                        {{ kicked ? t("lock.takeBackOverHint") : t("lock.takeoverHint") }}
                    </p>
                </button>
            </div>
        </div>
    </dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { RichPodLock } from "@/services/richpodLockService";

const { t } = useI18n();

const props = defineProps<{
    open: boolean;
    lock: RichPodLock | null;
    busy: boolean;
    kicked?: boolean;
}>();

const emit = defineEmits<{
    (e: "go-back"): void;
    (e: "takeover"): void;
}>();

const dialogRef = ref<HTMLDialogElement>();

const holderName = computed(() => {
    return props.lock?.user.publicName?.trim() || t("lock.anotherUser");
});

watch(
    () => props.open,
    (isOpen) => {
        if (!dialogRef.value) return;
        if (isOpen && !dialogRef.value.open) {
            dialogRef.value.showModal();
        } else if (!isOpen && dialogRef.value.open) {
            dialogRef.value.close();
        }
    },
);
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
