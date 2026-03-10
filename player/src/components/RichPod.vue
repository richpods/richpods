<template>
    <div v-if="loading" class="richpod-loading">
        <div class="richpod-spinner" role="status">
            <span class="visually-hidden">{{ t("common.loading") }}</span>
        </div>
    </div>
    <div v-else-if="error" class="richpod-error">
        <p>{{ t("common.error", { message: error.message }) }}</p>
        <button @click="reload" class="underline">{{ t("common.retry") }}</button>
    </div>
    <PodPlayer v-else-if="richPod" />
    <div v-else class="richpod-error">
        {{ t("common.noRichPodLoaded") }}
    </div>
</template>
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRichPod } from "@/composables/useRichPod";
import PodPlayer from "@/components/PodPlayer.vue";

const { t } = useI18n();

interface Props {
    id: string;
}

const props = defineProps<Props>();

const {
    richPod,
    loading,
    error,
    load,
} = useRichPod();

load(props.id);

function reload() {
    load(props.id);
}

</script>

<style lang="scss" scoped>
.richpod-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
}

.richpod-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid rgba(255, 255, 255, 0.15);
    border-top-color: var(--richpod-header-background-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
