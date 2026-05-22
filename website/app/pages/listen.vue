<template>
    <div>
        <RipoHero>
            <h1>{{ $t("listen.title") }}</h1>
            <p>{{ $t("listen.subtitle") }}</p>
        </RipoHero>
        <div class="listen-content">
            <p v-if="error" class="error-message">{{ $t("listen.loadError") }}</p>
            <div v-else-if="status === 'idle' || status === 'pending'" class="loading-wrapper">
                <RipoSpinner
                    :size="48"
                    color="var(--color-primary, #333)"
                    :label="$t('listen.loading')"
                />
            </div>
            <template v-else-if="allRichPods.length > 0">
                <div class="richpods-grid">
                    <RichPodCard
                        v-for="pod in allRichPods"
                        :key="pod.id"
                        :id="pod.id"
                        :title="pod.title"
                        :description="pod.description"
                        :podcast-title="pod.origin.title"
                        :episode-title="pod.origin.episode.title"
                        :artwork-url="
                            pod.origin.episode.artworkUrl ?? pod.origin.artworkUrl ?? undefined
                        "
                        :verified="pod.origin.verified"
                        :created-at="pod.createdAt"
                        :player-url="expandPlayerUrl(pod.id)"
                    />
                </div>
                <div v-if="nextCursor && allRichPods.length < MAX_TOTAL" class="load-more-wrapper">
                    <button class="load-more-button" :disabled="loadingMore" @click="loadMore">
                        {{ loadingMore ? $t("listen.loading") : $t("listen.loadMore") }}
                    </button>
                </div>
            </template>
            <p v-else class="empty-message">{{ $t("listen.empty") }}</p>
        </div>
    </div>
</template>
<script setup lang="ts">
import RipoHero from "~/components/RipoHero.vue";
import RichPodCard from "~/components/RichPodCard.vue";
import RipoSpinner from "@richpods/shared/components/RipoSpinner.vue";
import type { RichPodSummary } from "~/composables/useRecentRichPods";

definePageMeta({
    i18n: {
        paths: {
            de: "/anhoeren",
            en: "/listen",
        },
    },
});

const { t } = useI18n();
const { fetchRichPodsPage, expandPlayerUrl } = useRecentRichPods();

useHead({
    title: t("listen.title"),
});

useSeoMeta({
    description: () => t("listen.description"),
    ogTitle: () => `${t("listen.title")} | ${t("meta.siteTitle")}`,
    ogDescription: () => t("listen.description"),
    twitterTitle: () => `${t("listen.title")} | ${t("meta.siteTitle")}`,
    twitterDescription: () => t("listen.description"),
});

const PAGE_SIZE = 24;
const MAX_TOTAL = 120;

const loadingMore = ref(false);

const { data: paginationState, error, status } = await useAsyncData(
    "recentRichPods",
    async () => {
        const page = await fetchRichPodsPage(PAGE_SIZE);
        return { items: page.items, nextCursor: page.nextCursor };
    },
    {
        server: false,
        lazy: true,
        default: () => ({ items: [] as RichPodSummary[], nextCursor: null as string | null }),
    },
);

const allRichPods = computed(() => paginationState.value.items);
const nextCursor = computed(() => paginationState.value.nextCursor);

async function loadMore() {
    if (!nextCursor.value || loadingMore.value || allRichPods.value.length >= MAX_TOTAL) return;
    loadingMore.value = true;
    try {
        const page = await fetchRichPodsPage(PAGE_SIZE, nextCursor.value);
        paginationState.value = {
            items: [...paginationState.value.items, ...page.items],
            nextCursor: page.nextCursor,
        };
    } finally {
        loadingMore.value = false;
    }
}
</script>
<style scoped lang="scss">
.listen-content {
    max-width: var(--content-max-width);
    margin: 0 auto;
    padding: var(--space-l) 0 var(--space-xl);
}

.richpods-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    column-gap: var(--space-s);

    @include mq($from: md) {
        grid-template-columns: repeat(3, 1fr);
        column-gap: var(--space-m);
    }

    @include mq($from: lg) {
        grid-template-columns: repeat(4, 1fr);
    }
}

.load-more-wrapper {
    display: flex;
    justify-content: center;
    padding: var(--space-l) 0 0;
}

.load-more-button {
    font-family: var(--heading-font-family), serif;
    font-size: var(--step-0);
    padding: var(--space-xs) var(--space-l);
    background: var(--color-primary, #333);
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:hover:not(:disabled) {
        opacity: 0.85;
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
}

.loading-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl) 0;
}


.error-message,
.empty-message {
    text-align: center;
    font-family: var(--heading-font-family), serif;
    font-size: var(--step-1);
    color: #666;
    padding: var(--space-xl) 0;
}

.error-message {
    color: #c44;
}
</style>
