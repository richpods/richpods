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
import InteractiveChartEnclosure from "./enclosures/InteractiveChartEnclosure.vue";
import GeoMapEnclosure from "./enclosures/GeoMapEnclosure.vue";
import MarkdownEnclosure from "./enclosures/MarkdownEnclosure.vue";
import SlideshowEnclosure from "./enclosures/SlideshowEnclosure.vue";
import PollEnclosure from "./enclosures/PollEnclosure.vue";
import FactboxEnclosure from "./enclosures/FactboxEnclosure.vue";
import CardEnclosure from "./enclosures/CardEnclosure.vue";
import UnsupportedEnclosure from "./enclosures/UnsupportedEnclosure.vue";
import { useRichPod } from "../composables/useRichPod.ts";
import { currentChapter as findCurrentChapter } from "../utils.ts";

const enclosureComponentMap: Record<string, Component> = {
    InteractiveChart: InteractiveChartEnclosure,
    GeoMap: GeoMapEnclosure,
    Markdown: MarkdownEnclosure,
    Slideshow: SlideshowEnclosure,
    Poll: PollEnclosure,
    Factbox: FactboxEnclosure,
    Card: CardEnclosure,
};

function componentFor(type: string | undefined) {
    return enclosureComponentMap[type ?? "___invalid___"] ?? UnsupportedEnclosure;
}

const props = defineProps<{
    currentTime: number;
}>();

const { sortedChapters } = useRichPod();

const currentChapter = computed(() => findCurrentChapter(sortedChapters.value, props.currentTime));
</script>
