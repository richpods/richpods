import { computed, onUnmounted, ref, type Ref } from "vue";
import { graphqlSdk } from "@/lib/graphql";

type GenerationState = "NONE" | "PENDING" | "TRANSCRIBING" | "GENERATING" | "COMPLETED" | "FAILED";

const ACTIVE_STATES = new Set<GenerationState>(["PENDING", "TRANSCRIBING", "GENERATING"]);

/**
 * Drives the async transcript-only generation job: starts it via mutation, then
 * polls the transcript generation status query (a status doc separate from
 * chapter generation) with exponential backoff (2s → 15s) until the job
 * completes or fails. On completion the caller should reload the transcript.
 * Mirrors useChapterGeneration but produces no chapter suggestions.
 */
export function useTranscriptGeneration(
    richPodId: Ref<string | null>,
    sessionId: string,
    onCompleted: () => void,
) {
    const state = ref<GenerationState>("NONE");
    const error = ref<string | null>(null);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let pollInterval = 2000;
    const MAX_INTERVAL = 15000;

    const busy = computed(() => ACTIVE_STATES.has(state.value));

    function stopPolling() {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    }

    function applyState(next: GenerationState, nextError?: string | null) {
        const previous = state.value;
        state.value = next;
        error.value = nextError ?? null;
        if (next === "COMPLETED" && previous !== "COMPLETED") {
            onCompleted();
        }
    }

    function scheduleNextPoll() {
        stopPolling();
        timeoutId = setTimeout(() => {
            pollInterval = Math.min(pollInterval * 2, MAX_INTERVAL);
            void fetchStatus();
        }, pollInterval);
    }

    async function fetchStatus() {
        const id = richPodId.value;
        if (!id) return;
        try {
            const response = await graphqlSdk.TranscriptGenerationStatus({ richPodId: id });
            const status = response.transcriptGenerationStatus;
            applyState((status.state as GenerationState) ?? "NONE", status.error);
            if (ACTIVE_STATES.has(state.value)) {
                scheduleNextPoll();
            }
        } catch (err) {
            console.error("Error polling transcript generation status:", err);
            scheduleNextPoll();
        }
    }

    async function start() {
        const id = richPodId.value;
        if (!id) return;

        stopPolling();
        pollInterval = 2000;
        error.value = null;
        state.value = "PENDING";

        try {
            const response = await graphqlSdk.GenerateTranscript({ richPodId: id, sessionId });
            const status = response.generateTranscript;
            applyState((status.state as GenerationState) ?? "NONE", status.error);
            if (ACTIVE_STATES.has(state.value)) {
                scheduleNextPoll();
            }
        } catch (err) {
            state.value = "FAILED";
            error.value =
                err instanceof Error ? err.message : "Failed to start transcript generation";
        }
    }

    onUnmounted(stopPolling);

    return { state, error, busy, start, sync: fetchStatus };
}
