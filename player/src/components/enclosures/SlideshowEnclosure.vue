<template>
    <div class="slideshow-enclosure">
        <enclosure-header :enclosure="enclosure" />
        <div class="richpod-flicking-wapper">
            <Flicking
                :options="{
                    align: 'prev',
                    circular: true,
                    disableOnInit: slides.length === 1,
                }"
                :plugins="FlickPlugins"
            >
                <div class="slide-panel" v-for="(slide, index) of slides" :key="index">
                    <img :src="slide.imageUrl" :alt="slide.imageAlt" class="slide-image" draggable="false" />
                    <div class="slide-text">
                        <span class="slide-caption">{{ slide.caption }}</span>
                        <span class="slide-credit">{{ slide.credit }}</span>
                    </div>
                </div>
                <template #viewport>
                    <template v-if="isFinePointerUser && slides.length > 1">
                        <span class="flicking-arrow-prev is-thin"></span>
                        <span class="flicking-arrow-next is-thin"></span>
                    </template>
                    <div v-if="slides.length > 1" class="flicking-pagination"></div>
                </template>
            </Flicking>
        </div>
    </div>
</template>
<script setup lang="ts">
import Flicking from "@egjs/vue3-flicking";
import { Arrow, Pagination } from "@egjs/flicking-plugins";
import "@egjs/vue3-flicking/dist/flicking.css";
import "@egjs/flicking-plugins/dist/arrow.css";
import "@egjs/flicking-plugins/dist/pagination.css";
import EnclosureHeader from "./EnclosureHeader.vue";
import type { Slideshow } from "@/graphql/generated.ts";
import { computed } from "vue";

const props = defineProps<{
    enclosure: Slideshow,
}>();

const slides = computed(() => {
    return props.enclosure.slides;
});

const isFinePointerUser = window.matchMedia("(pointer: fine)").matches;
const FlickPlugins: Array<Arrow | Pagination> = [];

if (slides.value.length > 1) {
    FlickPlugins.push(new Pagination({ type: "bullet" }));
    if (isFinePointerUser) {
        FlickPlugins.push(new Arrow());
    }
}
</script>
<style scoped lang="scss">
.slideshow-enclosure {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.richpod-flicking-wapper {
    flex: 1;
    min-height: 0;

    :deep(.flicking-viewport) {
        height: 100%;
    }

    :deep(.flicking-camera) {
        height: 100%;
    }
}

.slide-panel {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;

    // creates the space for the pagination bullets
    padding-bottom: 25px;

    .slide-image {
        width: 100%;
        flex: 1;
        min-height: 0;
        object-fit: contain;
        object-position: center;
    }

    .slide-text {
        flex-shrink: 0;
        padding: 0 12px;
        font-family: var(--richpod-font-family-text), sans-serif;

        .slide-caption {
            font-size: 12px;
        }

        .slide-credit {
            font-size: 8px;
        }
    }

    .slide-text:has(.slide-caption:not(:empty) + .slide-credit:not(:empty)) .slide-caption::after {
        content: " | ";
    }
}
</style>
