<template>
    <div>
        <RipoHero>
            <h1>{{ $t("listen.title") }}</h1>
            <p>{{ $t("listen.subtitle") }}</p>
        </RipoHero>
        <div class="listen-content">
            <p v-if="error" class="error-message">{{ $t("listen.loadError") }}</p>
            <div v-else-if="status === 'idle' || status === 'pending'" class="loading-wrapper">
                <div class="spinner" role="status">
                    <span class="visually-hidden">{{ $t("listen.loading") }}</span>
                </div>
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
                        :artwork-url="pod.origin.artworkUrl ?? undefined"
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

definePageMeta({
    i18n: {
        paths: {
            de: "/anhoeren",
            en: "/listen",
        },
    },
});

const config = useRuntimeConfig();
const { t } = useI18n();

const expandPlayerUrl = (id: string) =>
    config.public.playerUrlPattern.replace("{ID}", encodeURIComponent(id));

useHead({
    title: t("listen.title"),
});

const PAGE_SIZE = 24;
const MAX_TOTAL = 120;

type RichPodResponse = {
    id: string;
    title: string;
    description: string;
    origin: {
        title: string;
        artworkUrl: string | null;
        verified: boolean;
        episode: {
            title: string;
        };
    };
    createdAt: string;
};

type PaginatedResponse = {
    items: RichPodResponse[];
    nextCursor: string | null;
};

type GraphQLResponse = {
    data?: { recentPublishedRichPods?: PaginatedResponse | null } | null;
    errors?: Array<{ message?: string | null }> | null;
};

const graphqlEndpoint = config.public.graphqlEndpoint.trim();

const RICHPODS_QUERY = `
    query RecentPublishedRichPods($first: Int, $after: String) {
        recentPublishedRichPods(first: $first, after: $after) {
            items {
                id
                title
                description
                origin {
                    title
                    artworkUrl
                    verified
                    episode {
                        title
                    }
                }
                createdAt
            }
            nextCursor
        }
    }
`;

async function fetchPage(after?: string | null): Promise<PaginatedResponse> {
    if (!graphqlEndpoint) {
        throw new Error("Missing NUXT_PUBLIC_GRAPHQL_ENDPOINT runtime config value");
    }

    const response = await $fetch<GraphQLResponse>(graphqlEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
            query: RICHPODS_QUERY,
            variables: { first: PAGE_SIZE, after: after ?? null },
        },
    });

    const firstErrorMessage = response.errors
        ?.map((errorItem) => errorItem.message?.trim())
        .find((message) => Boolean(message));

    if (firstErrorMessage) {
        throw new Error(firstErrorMessage);
    }

    if (response.errors?.length) {
        throw new Error("GraphQL query failed without a detailed error message");
    }

    const result = response.data?.recentPublishedRichPods;
    if (!result) {
        throw new Error("No data received from API");
    }

    return result;
}

const loadingMore = ref(false);

const { data: paginationState, error, status } = await useAsyncData(
    "recentRichPods",
    async () => {
        const page = await fetchPage();
        return { items: page.items, nextCursor: page.nextCursor };
    },
    {
        server: false,
        lazy: true,
        default: () => ({ items: [] as RichPodResponse[], nextCursor: null as string | null }),
    },
);

const allRichPods = computed(() => paginationState.value.items);
const nextCursor = computed(() => paginationState.value.nextCursor);

async function loadMore() {
    if (!nextCursor.value || loadingMore.value || allRichPods.value.length >= MAX_TOTAL) return;
    loadingMore.value = true;
    try {
        const page = await fetchPage(nextCursor.value);
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

.spinner {
    width: 48px;
    height: 48px;
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-top-color: var(--color-primary, #333);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
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
