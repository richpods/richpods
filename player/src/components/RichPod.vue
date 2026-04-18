<template>
    <div v-if="loading" class="richpod-loading">
        <RipoSpinner
            :size="48"
            color="var(--richpod-header-background-color)"
            track-color="rgba(255, 255, 255, 0.15)"
            :label="t('common.loading')"
        />
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
import RipoSpinner from "@richpods/shared/components/RipoSpinner.vue";

const { t } = useI18n();

interface Props {
    id: string;
}

const props = defineProps<Props>();

const { richPod, loading, error, load } = useRichPod();

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
</style>
