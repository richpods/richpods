<template>
    <component
        v-if="currentChapter"
        :is="componentFor(currentChapter.enclosure.__typename)"
        :enclosure="currentChapter.enclosure"
        :key="currentChapter.begin + currentChapter.enclosure.__typename"
    />
    <div v-else>
        <!-- Empty -->
    </div>
</template>
<script setup lang="ts">
import { type Component, computed } from "vue";
import InteractiveChartEnclosure from "@/components/enclosures/InteractiveChartEnclosure.vue";
import GeoMapEnclosure from "@/components/enclosures/GeoMapEnclosure.vue";
import MarkdownEnclosure from "@/components/enclosures/MarkdownEnclosure.vue";
import SlideshowEnclosure from "@/components/enclosures/SlideshowEnclosure.vue";
import PollEnclosure from "@/components/enclosures/PollEnclosure.vue";
import FactboxEnclosure from "@/components/enclosures/FactboxEnclosure.vue";
import CardEnclosure from "@/components/enclosures/CardEnclosure.vue";
import UnsupportedEnclosure from "@/components/enclosures/UnsupportedEnclosure.vue";
import { useRichPod } from "@/composables/useRichPod.ts";
import { currentChapter as findCurrentChapter } from "@/utils.ts";

const enclosureComponentMap: Record<string, Component> = {
    "InteractiveChart": InteractiveChartEnclosure,
    "GeoMap": GeoMapEnclosure,
    "Markdown": MarkdownEnclosure,
    "Slideshow": SlideshowEnclosure,
    "Poll": PollEnclosure,
    "Factbox": FactboxEnclosure,
    "Card": CardEnclosure,
};

function componentFor(type: string|undefined) {
    return enclosureComponentMap[type ?? "___invalid___"] ?? UnsupportedEnclosure;
}

const props = defineProps<{
    currentTime: number;
}>();

const {
    sortedChapters,
} = useRichPod();

const currentChapter = computed(() => findCurrentChapter(sortedChapters.value, props.currentTime));
</script>
