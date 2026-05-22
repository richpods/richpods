export type RichPodSummary = {
    id: string;
    title: string;
    description: string;
    origin: {
        title: string;
        artworkUrl: string | null;
        verified: boolean;
        episode: {
            title: string;
            artworkUrl: string | null;
        };
    };
    createdAt: string;
};

export type RecentRichPodsPage = {
    items: RichPodSummary[];
    nextCursor: string | null;
};

type GraphQLResponse = {
    data?: { recentPublishedRichPods?: RecentRichPodsPage | null } | null;
    errors?: Array<{ message?: string | null }> | null;
};

const RECENT_RICHPODS_QUERY = `
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
                        artworkUrl
                    }
                }
                createdAt
            }
            nextCursor
        }
    }
`;

export function useRecentRichPods() {
    const config = useRuntimeConfig();
    const graphqlEndpoint = config.public.graphqlEndpoint.trim();

    const expandPlayerUrl = (id: string) =>
        config.public.playerUrlPattern.replace("{ID}", encodeURIComponent(id));

    async function fetchRichPodsPage(
        first: number,
        after?: string | null,
    ): Promise<RecentRichPodsPage> {
        if (!graphqlEndpoint) {
            throw new Error("Missing NUXT_PUBLIC_GRAPHQL_ENDPOINT runtime config value");
        }

        const response = await $fetch<GraphQLResponse>(graphqlEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: {
                query: RECENT_RICHPODS_QUERY,
                variables: { first, after: after ?? null },
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

    return { fetchRichPodsPage, expandPlayerUrl };
}
