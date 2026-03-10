<template>
    <article class="poll-enclosure">
        <ColoeusPolls v-if="isConfigured" :lang="locale" :id="enclosure.coloeus.pollId" @voted="handleVoted" />
        <div v-else class="poll-enclosure__loading">{{ t("poll.loading") }}</div>
    </article>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ColoeusPolls, configureColoeus } from "@richpods/coloeus";
import "@richpods/coloeus/style.css";
import type { Poll } from "@/graphql/generated";

const props = defineProps<{
    enclosure: Poll;
}>();
const { t, locale } = useI18n();

const isConfigured = ref(false);

function configure() {
    if (!props.enclosure.coloeus?.endpoint) {
        console.error("Poll configuration is missing");
        return;
    }

    configureColoeus({
        apiUrl: props.enclosure.coloeus.endpoint,
    });
    isConfigured.value = true;
}

onMounted(() => {
    configure();
});

watch(
    () => props.enclosure.coloeus?.endpoint,
    () => {
        isConfigured.value = false;
        configure();
    },
);

function handleVoted(pollId: string, optionIndices: number[]) {
    console.log("Voted on poll", pollId, "with options", optionIndices);
}
</script>

<style lang="scss" scoped>
.poll-enclosure {
    padding: 1rem;
    max-width: 600px;
    margin: 0 auto;

    &__loading {
        padding: 2rem;
        text-align: center;
        color: var(--color-text-secondary, #6b7280);
    }
}
</style>
