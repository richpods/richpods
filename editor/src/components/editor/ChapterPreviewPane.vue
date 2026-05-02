<template>
    <div class="pb-6">
        <template v-if="chapter">
            <div
                v-if="hiddenNotice || showViewportSelector"
                class="mb-3 flex items-center gap-3"
            >
                <div
                    v-if="hiddenNotice"
                    class="flex flex-1 min-w-0 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                >
                    <Icon icon="ion:eye-off-outline" class="w-4 h-4 flex-shrink-0" />
                    <span class="min-w-0">{{ hiddenNotice }}</span>
                </div>
                <div v-else class="flex-1"></div>
                <Listbox
                    v-if="showViewportSelector"
                    v-model="viewportId"
                    as="div"
                    class="relative flex-shrink-0"
                >
                    <ListboxButton
                        class="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <Icon :icon="currentViewport.icon" class="w-4 h-4" />
                        <span>{{ t(currentViewport.labelKey) }}</span>
                        <span class="text-xs text-gray-500">{{ currentViewport.widthLabel }}</span>
                        <Icon icon="ion:chevron-down" class="w-3 h-3 text-gray-500" />
                    </ListboxButton>
                    <ListboxOptions
                        class="absolute right-0 z-20 mt-1 max-h-60 w-56 overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none"
                    >
                        <ListboxOption
                            v-for="vp in viewports"
                            :key="vp.id"
                            :value="vp.id"
                            v-slot="{ active, selected }"
                            as="template"
                        >
                            <li
                                :class="[
                                    'flex cursor-pointer items-center gap-2 px-3 py-2',
                                    active ? 'bg-blue-50 text-blue-700' : 'text-gray-700',
                                ]"
                            >
                                <Icon :icon="vp.icon" class="w-4 h-4" />
                                <span class="flex-1">{{ t(vp.labelKey) }}</span>
                                <span class="text-xs text-gray-500">{{ vp.widthLabel }}</span>
                                <Icon
                                    v-if="selected"
                                    icon="ion:checkmark"
                                    class="w-4 h-4 text-blue-600"
                                />
                            </li>
                        </ListboxOption>
                    </ListboxOptions>
                </Listbox>
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
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/vue";
import { useRichPodStore } from "@/stores/useRichPodStore";
import type { Component } from "vue";
import type { EditorEnclosure, PreviewViewportId, PreviewViewportOption } from "@/types/editor";

const VIEWPORT_STORAGE_KEY = "richpods-editor-preview-viewport";
const VIEWPORT_SELECTOR_MIN_WIDTH = 1024;

const { componentFor } = defineProps<{
    componentFor: (type?: string) => Component;
}>();
const { t } = useI18n();

const richpodStore = useRichPodStore();
const { currentChapter, richpod } = storeToRefs(richpodStore);

const chapter = computed(() => currentChapter.value);

const viewports: PreviewViewportOption[] = [
    {
        id: "desktop",
        labelKey: "editor.preview.viewport.desktop",
        icon: "ion:desktop-outline",
        widthLabel: "100%",
        width: null,
    },
    {
        id: "tablet",
        labelKey: "editor.preview.viewport.tablet",
        icon: "ion:tablet-portrait-outline",
        widthLabel: "768px",
        width: 768,
    },
    {
        id: "smartphone",
        labelKey: "editor.preview.viewport.smartphone",
        icon: "ion:phone-portrait-outline",
        widthLabel: "390px",
        width: 390,
    },
];

function loadStoredViewport(): PreviewViewportId {
    try {
        const stored = localStorage.getItem(VIEWPORT_STORAGE_KEY);
        if (stored && viewports.some((v) => v.id === stored)) {
            return stored as PreviewViewportId;
        }
    } catch {
        // localStorage unavailable
    }
    return "desktop";
}

const viewportId = ref<PreviewViewportId>(loadStoredViewport());

const selectorMediaQuery =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia(`(min-width: ${VIEWPORT_SELECTOR_MIN_WIDTH}px)`)
        : null;
const showViewportSelector = ref(selectorMediaQuery?.matches ?? true);

function handleSelectorMediaChange(event: MediaQueryListEvent) {
    showViewportSelector.value = event.matches;
}

selectorMediaQuery?.addEventListener("change", handleSelectorMediaChange);
onBeforeUnmount(() => {
    selectorMediaQuery?.removeEventListener("change", handleSelectorMediaChange);
});

const effectiveViewport = computed<PreviewViewportOption>(() => {
    if (!showViewportSelector.value) return viewports[0];
    return viewports.find((v) => v.id === viewportId.value) ?? viewports[0];
});
const currentViewport = effectiveViewport;

watch(viewportId, (id) => {
    try {
        localStorage.setItem(VIEWPORT_STORAGE_KEY, id);
    } catch {
        // localStorage unavailable or quota exceeded
    }
});

const frameStyle = computed(() => {
    const width = effectiveViewport.value.width;
    if (!width) return {};
    return { width: `${width}px`, maxWidth: "100%" };
});

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
