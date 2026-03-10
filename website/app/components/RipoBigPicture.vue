<template>
    <div ref="wrapper" class="big-picture-wrapper" :style="{ aspectRatio: wrapperAspectRatio }">
        <picture>
            <source
                v-for="source in sourcesList"
                :key="source.srcset + source.media"
                :srcset="source.srcset"
                :media="source.media"
            >
            <img ref="image" :src="url" :alt="alt" class="parallax-image">
        </picture>
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from "vue";

const HEIGHT_FACTOR = 0.85;

const props = defineProps<{
    url: string;
    alt: string;
    aspectRatio?: number;
    sources?: {
        srcset: string;
        media?: string;
        type?: string;
    }[];
}>();

const url = computed(() => {
    return props.url;
});

const alt = computed(() => {
    return props.alt;
});

const wrapperAspectRatio = computed(() => {
    return props.aspectRatio ? props.aspectRatio / HEIGHT_FACTOR : undefined;
});

const sourcesList = computed(() => props.sources || []);

const wrapper = ref<HTMLElement | null>(null);
const image = ref<HTMLElement | null>(null);

const handleScroll = () => {
    requestAnimationFrame(() => {
        if (!wrapper.value || !image.value) return;

        const rect = wrapper.value.getBoundingClientRect();
        const scrollTop = document.documentElement.scrollTop;
        const offsetTop = rect.top + scrollTop;
        const distance = scrollTop - offsetTop;

        image.value.style.transform = `translateY(${distance * 0.1}px)`;
    });
};

let resizeObserver: ResizeObserver | null = null;

const updateWrapperHeight = () => {
    if (wrapper.value && image.value) {
        const img = image.value as HTMLImageElement;
        const imageHeight = img.naturalHeight;
        const imageWidth = img.naturalWidth;
        if (imageHeight && imageWidth) {
            const displayedWidth = img.clientWidth;
            const displayedHeight = (imageHeight / imageWidth) * displayedWidth;
            wrapper.value.style.height = `${displayedHeight * HEIGHT_FACTOR}px`;
        }
    }
};

onMounted(() => {
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    nextTick(() => {
        if (!image.value) return;

        const handleImageLoad = () => {
            updateWrapperHeight();
            handleScroll();
        };

        image.value.addEventListener("load", handleImageLoad, { once: true });

        resizeObserver = new ResizeObserver(updateWrapperHeight);
        resizeObserver.observe(image.value);
    });
});

onUnmounted(() => {
    window.removeEventListener("scroll", handleScroll);
    if (resizeObserver) {
        if (image.value) {
            resizeObserver.unobserve(image.value);
        }
        resizeObserver.disconnect();
        resizeObserver = null;
    }
});
</script>

<style scoped lang="scss">
.big-picture-wrapper {
    width: 100%;
    position: relative;
    overflow: hidden;
    margin: 0;
    padding: 0;
}

.parallax-image {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: auto;
    will-change: transform;
    transform: translateY(0);
}
</style>