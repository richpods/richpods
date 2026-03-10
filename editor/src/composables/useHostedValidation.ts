import { ref, onUnmounted, watch, type Ref } from "vue";
import { graphqlSdk } from "@/lib/graphql";

type ValidationStatus = "pending" | "valid" | "invalid" | null;

export function useHostedValidation(hostedEpisodeId: Ref<string | null | undefined>) {
    const validationStatus = ref<ValidationStatus>(null);
    const validationError = ref<string | null>(null);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let pollInterval = 2000; // Start at 2s, backoff to 15s max
    const MAX_INTERVAL = 15000;

    async function fetchStatus() {
        const id = hostedEpisodeId.value;
        if (!id) return;

        try {
            const response = await graphqlSdk.HostedEpisode({ id });
            const episode = response.hostedEpisode;
            if (!episode) return;

            validationStatus.value = episode.validationStatus as ValidationStatus;
            validationError.value = episode.validationError ?? null;

            if (episode.validationStatus === "pending") {
                scheduleNextPoll();
            }
        } catch (err) {
            console.error("Error fetching hosted episode validation status:", err);
        }
    }

    function scheduleNextPoll() {
        stopPolling();
        timeoutId = setTimeout(() => {
            fetchStatus();
            pollInterval = Math.min(pollInterval * 2, MAX_INTERVAL);
        }, pollInterval);
    }

    function stopPolling() {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    }

    function startPolling() {
        stopPolling();
        pollInterval = 2000;
        validationStatus.value = null;
        validationError.value = null;
        fetchStatus();
    }

    watch(
        hostedEpisodeId,
        (id) => {
            if (id) {
                startPolling();
            } else {
                stopPolling();
                validationStatus.value = null;
                validationError.value = null;
            }
        },
        { immediate: true },
    );

    onUnmounted(() => {
        stopPolling();
    });

    return {
        validationStatus,
        validationError,
    };
}
