<template>
    <div class="pb-6">
        <template v-if="chapter">
            <div v-if="hiddenNotice || showSelector" class="mb-3 flex items-center gap-3">
                <div
                    v-if="hiddenNotice"
                    class="flex flex-1 min-w-0 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                >
                    <Icon icon="ion:eye-off-outline" class="w-4 h-4 flex-shrink-0" />
                    <span class="min-w-0">{{ hiddenNotice }}</span>
                </div>
                <div v-else class="flex-1"></div>
                <PreviewViewportSelector />
            </div>

            <div class="chapter-preview-viewport">
                <div class="chapter-preview-frame" :style="frameStyle">
                    <div v-if="emptyHint" class="chapter-preview-empty">
                        <Icon :icon="emptyIcon" class="w-10 h-10 text-gray-400" />
                        <p class="text-sm text-gray-600 text-center max-w-md">{{ emptyHint }}</p>
                    </div>
                    <component
                        v-else
                        :is="componentFor(chapter.enclosure.__typename)"
                        :enclosure="resolvedEnclosure"
                    />
                </div>
            </div>
        </template>
        <p v-else class="text-sm text-gray-500">{{ t("editor.noChapterSelected") }}</p>
    </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import { useRichPodStore } from "@/stores/useRichPodStore";
import { usePreviewViewport } from "@/composables/usePreviewViewport";
import PreviewViewportSelector from "@/components/editor/PreviewViewportSelector.vue";
import type { Component } from "vue";
import type { EditorEnclosure } from "@/types/editor";

const { componentFor } = defineProps<{
    componentFor: (type?: string) => Component;
}>();
const { t } = useI18n();

const richpodStore = useRichPodStore();
const { currentChapter, richpod } = storeToRefs(richpodStore);

const chapter = computed(() => currentChapter.value);

const { showSelector, frameStyle } = usePreviewViewport();

const podcastArtworkUrl = computed(() => richpod.value.origin?.artworkUrl ?? null);
const episodeArtworkUrl = computed(
    () => richpod.value.origin?.episode?.artworkUrl ?? richpod.value.origin?.artworkUrl ?? null,
);

const resolvedEnclosure = computed<EditorEnclosure | undefined>(() => {
    const enclosure = chapter.value?.enclosure;
    if (!enclosure) return undefined;
    if (enclosure.__typename !== "Card" || enclosure.cardType !== "COVER") {
        return enclosure;
    }
    if (enclosure.coverImageUrl) return enclosure;
    const fallback =
        enclosure.coverSource === "episode" ? episodeArtworkUrl.value : podcastArtworkUrl.value;
    return fallback ? { ...enclosure, coverImageUrl: fallback } : enclosure;
});

const hiddenNotice = computed(() => {
    const enclosure = chapter.value?.enclosure;
    if (!enclosure || enclosure.__typename !== "Card") return null;
    if (enclosure.cardType === "BLANK") return t("editor.preview.blankCardNotice");
    if (enclosure.visibleAsChapter !== false) return null;
    return t("editor.preview.notVisibleAsChapter");
});

const emptyHint = computed(() => {
    const enclosure = chapter.value?.enclosure;
    if (!enclosure) return null;

    if (enclosure.__typename === "Slideshow" && !enclosure.slides?.length) {
        return t("editor.preview.slideshowEmpty");
    }

    if (enclosure.__typename === "Card") {
        switch (enclosure.cardType) {
            case "LINK":
                return enclosure.url ? null : t("editor.preview.cardLinkEmpty");
            case "IMAGE":
                return enclosure.imageUrl ? null : t("editor.preview.cardImageEmpty");
            case "COVER":
                return resolvedEnclosure.value?.coverImageUrl
                    ? null
                    : t("editor.preview.cardCoverEmpty");
        }
    }

    return null;
});

const emptyIcon = computed(() => {
    const enclosure = chapter.value?.enclosure;
    if (enclosure?.__typename === "Slideshow") return "ion:images-outline";
    if (enclosure?.__typename === "Card") {
        switch (enclosure.cardType) {
            case "LINK":
                return "ion:link-outline";
            case "IMAGE":
                return "ion:image-outline";
            case "COVER":
                return "ion:albums-outline";
        }
    }
    return "ion:image-outline";
});
</script>

<style scoped lang="scss">
.chapter-preview-viewport {
    display: flex;
    justify-content: center;
}

.chapter-preview-frame {
    position: relative;
    width: 100%;
    min-height: 480px;
    background: var(--richpod-chapter-background, #fffaf4);
    color: var(--richpod-chapter-color, #2f2c35);
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: width 0.2s ease;
}

.chapter-preview-empty {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 32px;
}
</style>
