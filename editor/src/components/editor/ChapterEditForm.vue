<template>
    <div v-if="hasChapter" class="space-y-4">
        <div v-if="!isSlideshow && !isGeoMap && !isPoll && !isFactbox && !isCard">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t("chapterEdit.titleLabel") }}</label>
            <input
                v-model="chapterTitle"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                @blur="handleBlur"
            />
        </div>
        <MarkdownEditor v-if="isMarkdown" :key="editorKey" />
        <SlideshowEditor v-else-if="isSlideshow" :key="editorKey" />
        <InteractiveChartEditor v-else-if="isInteractiveChart" :key="editorKey" />
        <GeoMapEditor v-else-if="isGeoMap" :key="editorKey" />
        <PollEditor v-else-if="isPoll" :key="editorKey" />
        <FactboxEditor v-else-if="isFactbox" :key="editorKey" />
        <CardEditor v-else-if="isCard" :key="editorKey" />
        <div v-else class="text-xs text-gray-500">{{ t("chapterEdit.wysiwygComingSoon") }}</div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useRichPodStore } from "@/stores/useRichPodStore";
import { useValidation } from "@/composables/useValidation";
import MarkdownEditor from "./enclosures/MarkdownEditor.vue";
import SlideshowEditor from "./enclosures/SlideshowEditor.vue";
import InteractiveChartEditor from "./enclosures/InteractiveChartEditor.vue";
import GeoMapEditor from "./enclosures/GeoMapEditor.vue";
import PollEditor from "./enclosures/PollEditor.vue";
import FactboxEditor from "./enclosures/FactboxEditor.vue";
import CardEditor from "./enclosures/CardEditor.vue";

const { t } = useI18n();

const richpodStore = useRichPodStore();
const { currentChapter } = storeToRefs(richpodStore);
const { runValidation } = useValidation();

const hasChapter = computed(() => currentChapter.value !== null);
const chapterBegin = computed(() => currentChapter.value?.begin ?? "");
const chapterTypeLabel = computed(() => currentChapter.value?.enclosure.__typename ?? "");

const isMarkdown = computed(() => chapterTypeLabel.value === "Markdown");
const isSlideshow = computed(() => chapterTypeLabel.value === "Slideshow");
const isInteractiveChart = computed(() => chapterTypeLabel.value === "InteractiveChart");
const isGeoMap = computed(() => chapterTypeLabel.value === "GeoMap");
const isPoll = computed(() => chapterTypeLabel.value === "Poll");
const isFactbox = computed(() => chapterTypeLabel.value === "Factbox");
const isCard = computed(() => chapterTypeLabel.value === "Card");

const editorKey = computed(() => `${chapterBegin.value}:${chapterTypeLabel.value}`);

const chapterTitle = computed({
    get: () => currentChapter.value?.enclosure.title ?? "",
    set: (value: string) => {
        richpodStore.updateCurrentChapter((chapter) => ({
            ...chapter,
            enclosure: {
                ...chapter.enclosure,
                title: value,
            },
        }));
    },
});

function handleBlur() {
    richpodStore.updateCurrentChapter((chapter) => ({
        ...chapter,
        enclosure: {
            ...chapter.enclosure,
            title: (chapter.enclosure.title ?? "").trim(),
        },
    }));
    runValidation();
}
</script>
