<template>
    <div class="flex-1 flex items-start justify-center p-2 lg:p-6 overflow-y-auto pb-28 w-full">
        <div
            class="w-full max-w-4xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm"
        >
            <div class="px-3 lg:px-6 py-16 flex flex-col items-center justify-center">
                <Icon icon="ion:alert-circle-outline" class="w-12 h-12 text-amber-500 mb-4" />
                <h2 class="text-lg font-semibold text-gray-800 mb-2">
                    {{ t("brokenMedia.title") }}
                </h2>
                <p class="text-sm text-gray-600 text-center max-w-md mb-6">
                    {{ t("brokenMedia.description") }}
                </p>
                <p v-if="refreshError" class="text-sm text-red-600 mb-4">
                    {{ refreshError }}
                </p>
                <button
                    :disabled="isRefreshing"
                    class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    @click="handleRefresh"
                >
                    <div
                        v-if="isRefreshing"
                        class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                    />
                    {{
                        isRefreshing
                            ? t("brokenMedia.refreshing")
                            : t("brokenMedia.refreshButton")
                    }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import { refreshEpisodeMedia } from "@/services/richpodService";

const { t } = useI18n();

const props = defineProps<{
    richPodId: string;
}>();

const emit = defineEmits<{
    (
        e: "media-refreshed",
        media: { url: string; mimeType: string },
    ): void;
}>();

const isRefreshing = ref(false);
const refreshError = ref("");

async function handleRefresh() {
    isRefreshing.value = true;
    refreshError.value = "";

    try {
        const media = await refreshEpisodeMedia(props.richPodId);
        emit("media-refreshed", media);
    } catch (err: unknown) {
        console.error("Failed to refresh episode media:", err);
        refreshError.value = t("brokenMedia.refreshFailed");
    } finally {
        isRefreshing.value = false;
    }
}
</script>

<style lang="scss" scoped></style>
