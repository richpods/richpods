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
    enclosure: Enclosure;
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
        case "Card":
            return props.enclosure.description;
    }

    return undefined;
});
</script>
<style scoped lang="scss">
@use "../../assets/theme" as theme;

.enclosure-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 12px 12px 8px;
    font-family: var(--richpod-font-family-text), sans-serif;

    .title {
        margin: 0;
        padding: 0;
        font-size: var(--richpod-font-size-chapter-title);
        line-height: 1.2;
        font-weight: 700;
        letter-spacing: -0.2px;
    }

    .description {
        margin: 0;
        padding: 0;
        font-size: var(--richpod-font-size-chapter-description);
        line-height: 1.4;
        color: var(--richpod-text-secondary-color, #6b7280);
    }

    .title + .description {
        padding-top: 6px;
    }

    @container player (min-width: #{theme.$richpod-desktop-breakpoint}) {
        padding: 20px 24px 12px;

        .title + .description {
            padding-top: 8px;
        }
    }

    @container player (min-width: #{theme.$richpod-desktop-wide-breakpoint}) {
        padding: 24px 32px 14px;
    }
}
</style>
