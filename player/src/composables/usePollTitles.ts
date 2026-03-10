import { ref, type Ref } from "vue";
import type { PublicPoll } from "@richpods/coloeus";

type PollTitleCache = Map<string, string>;
type PendingFetch = Map<string, Promise<string>>;

const cache: PollTitleCache = new Map();
const pendingFetches: PendingFetch = new Map();

function getCacheKey(endpoint: string, pollId: string): string {
    return `${endpoint}::${pollId}`;
}

async function fetchPollFromApi(endpoint: string, pollId: string): Promise<PublicPoll> {
    const response = await fetch(`${endpoint}/polls/${pollId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch poll: ${response.status}`);
    }

    return response.json();
}

async function fetchPollTitle(endpoint: string, pollId: string): Promise<string> {
    const cacheKey = getCacheKey(endpoint, pollId);

    if (cache.has(cacheKey)) {
        return cache.get(cacheKey)!;
    }

    if (pendingFetches.has(cacheKey)) {
        return pendingFetches.get(cacheKey)!;
    }

    const fetchPromise = fetchPollFromApi(endpoint, pollId).then((poll) => {
        cache.set(cacheKey, poll.title);
        return poll.title;
    });
    pendingFetches.set(cacheKey, fetchPromise);

    try {
        return await fetchPromise;
    } finally {
        pendingFetches.delete(cacheKey);
    }
}

export function usePollTitles() {
    const titles: Ref<Map<string, string>> = ref(new Map());

    async function loadPollTitle(endpoint: string, pollId: string): Promise<void> {
        if (!endpoint || !pollId) {
            return;
        }

        const cacheKey = getCacheKey(endpoint, pollId);

        if (titles.value.has(cacheKey)) {
            return;
        }

        if (cache.has(cacheKey)) {
            titles.value.set(cacheKey, cache.get(cacheKey)!);
            return;
        }

        try {
            const title = await fetchPollTitle(endpoint, pollId);
            titles.value = new Map(titles.value).set(cacheKey, title);
        } catch (error) {
            console.error(`Failed to fetch poll title for ${pollId}:`, error);
        }
    }

    function getPollTitle(endpoint: string, pollId: string): string | undefined {
        const cacheKey = getCacheKey(endpoint, pollId);
        return titles.value.get(cacheKey);
    }

    return {
        loadPollTitle,
        getPollTitle,
    };
}
