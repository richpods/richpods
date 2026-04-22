<template>
    <modal-dialog :aria-labelledby="headingId" ref="dialog">
        <h1 :id="headingId" class="title">{{ t("chapterDialog.title") }}</h1>
        <ChapterList ref="chapterList" :chapters="chapters" @seek="seekTo" />
    </modal-dialog>
</template>
<script setup lang="ts">
import { nextTick, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import type { Chapter } from "../graphql/generated.ts";
import { useAudio } from "../composables/useAudio.ts";
import ModalDialog from "./ModalDialog.vue";
import ChapterList from "./ChapterList.vue";

const { t } = useI18n();
const dialog = useTemplateRef("dialog");
const chapterList = useTemplateRef("chapterList");
const headingId = `dialog-heading-${Math.floor(Math.random() * 100)}`;

defineProps<{
    chapters: Chapter[];
}>();

const { seekTo: seekAudioTo } = useAudio();

function seekTo(seconds: number) {
    seekAudioTo(seconds);
    dialog.value?.close();
}

async function toggle() {
    dialog.value?.toggle();
    await nextTick();
    chapterList.value?.scrollActiveIntoView();
}

defineExpose({
    toggle,
});
</script>
<style scoped lang="scss">
@use "../assets/mixins.scss" as mixins;

.modal-dialog {
    &::backdrop {
        background-color: var(--richpod-overlay-backdrop);
        backdrop-filter: blur(2px);
    }

    background: var(--richpod-background-color);
    color: var(--richpod-color);
    border: 1px solid color-mix(in srgb, var(--richpod-color) 22%, transparent);
    border-radius: 11px;
    box-shadow: 0 3px 6px #00000029;
}

:deep(.modal-dialog-body) {
    padding: 44px 36px 24px 24px;
}

.title {
    @include mixins.visually-hidden();
}
</style>
