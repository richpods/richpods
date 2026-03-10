<template>
    <div class="pb-6">
        <component
            v-if="chapter"
            :is="componentFor(chapter.enclosure.__typename)"
            :enclosure="chapter.enclosure"
            :chapter="chapter"
        />
        <p v-else class="text-sm text-gray-500">{{ t("editor.noChapterSelected") }}</p>
    </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRichPodStore } from "@/stores/useRichPodStore";
import type { Component } from "vue";

const { componentFor } = defineProps<{
    componentFor: (type?: string) => Component;
}>();
const { t } = useI18n();

const richpodStore = useRichPodStore();
const { currentChapter } = storeToRefs(richpodStore);

const chapter = computed(() => currentChapter.value);
</script>
