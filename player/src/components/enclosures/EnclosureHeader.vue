<template>
<div v-if="title || description" class="enclosure-header">
    <h1 v-if="title" class="title">{{ title }}</h1>
    <p v-if="description" class="description">{{ description }}</p>
</div>
</template>
<script setup lang="ts">
import type { Enclosure, Poll } from "../../graphql/generated.ts";
import { computed, watch } from "vue";
import { usePollTitles } from "../../composables/usePollTitles.ts";

const props = defineProps<{
    enclosure: Enclosure,
}>();

const { loadPollTitle, getPollTitle } = usePollTitles();

function isPollEnclosure(enclosure: Enclosure): enclosure is Poll {
    return enclosure.__typename === "Poll";
}

const title = computed(() => {
    if (isPollEnclosure(props.enclosure)) {
        return getPollTitle(props.enclosure.coloeus.endpoint, props.enclosure.coloeus.pollId);
    }
    return (props.enclosure as { title: string }).title;
});

watch(
    () => props.enclosure,
    (enclosure) => {
        if (isPollEnclosure(enclosure)) {
            loadPollTitle(enclosure.coloeus.endpoint, enclosure.coloeus.pollId);
        }
    },
    { immediate: true },
);

const description = computed(() => {
    switch (props.enclosure.__typename) {
        case "InteractiveChart":
        case "Slideshow":
            return props.enclosure.description;
    }

    return undefined;
});
</script>
<style scoped lang="scss">
.enclosure-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 10px 12px 10px;

    .title {
        margin: 0;
        padding: 0;
        font-size: 20px;
        line-height: 24px;
    }

    .description {
        margin: 0;
        padding: 0;
        font-size: 15px;
        line-height: 20px;
    }

    .title + .description {
        padding-top: 6px;
    }
}
</style>
