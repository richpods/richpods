import { computed, onUnmounted, ref, type Ref } from "vue";
import { graphqlSdk } from "@/lib/graphql";
import { suggestionToEditorChapter } from "@/services/richpodService";
import type { EditorChapter } from "@/types/editor";

type GenerationState = "NONE" | "PENDING" | "TRANSCRIBING" | "GENERATING" | "COMPLETED" | "FAILED";

const ACTIVE_STATES = new Set<GenerationState>(["PENDING", "TRANSCRIBING", "GENERATING"]);

type StatusLike = {
    state: string;
    error?: string | null;
    canRegenerate: boolean;
    suggestions: Array<{
        begin: string;
        enclosure: Parameters<typeof suggestionToEditorChapter>[0]["enclosure"];
    }>;
};

/**
 * Drives the async AI chapter generation job. On open, `sync()` loads the cached
 * suggestions (no recompute) so the editor can offer "View suggestions"; `start()`
 * enqueues a fresh (expensive) run — gated server-side and surfaced via
 * `canRegenerate` — then polls the status with exponential backoff (2s → 15s).
 * `onFreshSuggestions` fires only when a job started via `start()` completes, so
 * opening the editor never auto-opens the suggestions modal.
 */
export function useChapterGeneration(
    richPodId: Ref<string | undefined>,
    sessionId: string,
    onFreshSuggestions?: () => void,
) {
    const state = ref<GenerationState>("NONE");
    const error = ref<string | null>(null);
    const suggestions = ref<EditorChapter[]>([]);
    const canRegenerate = ref(true);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let pollInterval = 2000;
    const MAX_INTERVAL = 15000;
    // True only while a job triggered by start() is in flight, so its completion
    // can open the modal once — without re-firing on plain sync() reloads.
    let activeRun = false;

    const busy = computed(() => ACTIVE_STATES.has(state.value));
    const hasCachedSuggestions = computed(
        () => state.value === "COMPLETED" && suggestions.value.length > 0,
    );

    function stopPolling() {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    }

    function applyStatus(status: StatusLike) {
        state.value = (status.state as GenerationState) ?? "NONE";
        error.value = status.error ?? null;
        canRegenerate.value = status.canRegenerate;
        suggestions.value = (status.suggestions ?? []).map(suggestionToEditorChapter);

        if (state.value === "COMPLETED" && activeRun) {
            activeRun = false;
            onFreshSuggestions?.();
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
            const response = await graphqlSdk.ChapterGenerationStatus({ richPodId: id });
            applyStatus(response.chapterGenerationStatus);
            if (ACTIVE_STATES.has(state.value)) {
                scheduleNextPoll();
            }
        } catch (err) {
            console.error("Error polling chapter generation status:", err);
            scheduleNextPoll();
        }
    }

    /**
     * Load the current (cached) status once without starting a job. Resumes
     * polling if a run is already in flight; never opens the modal.
     */
    async function sync() {
        const id = richPodId.value;
        if (!id) return;
        activeRun = false;
        try {
            const response = await graphqlSdk.ChapterGenerationStatus({ richPodId: id });
            applyStatus(response.chapterGenerationStatus);
            if (ACTIVE_STATES.has(state.value)) {
                pollInterval = 2000;
                scheduleNextPoll();
            }
        } catch (err) {
            console.error("Error fetching chapter generation status:", err);
        }
    }

    async function start() {
        const id = richPodId.value;
        if (!id) return;

        stopPolling();
        pollInterval = 2000;
        error.value = null;
        suggestions.value = [];
        state.value = "PENDING";
        activeRun = true;

        try {
            const response = await graphqlSdk.GenerateAiChapters({
                richPodId: id,
                sessionId,
            });
            applyStatus(response.generateAiChapters);
            if (ACTIVE_STATES.has(state.value)) {
                scheduleNextPoll();
            }
        } catch (err) {
            activeRun = false;
            state.value = "FAILED";
            error.value = err instanceof Error ? err.message : "Failed to start chapter generation";
        }
    }

    async function recordChapterCountBaseline() {
        const id = richPodId.value;
        if (!id) return;
        try {
            const response = await graphqlSdk.RecordChapterGenerationBaseline({
                richPodId: id,
                sessionId,
            });
            applyStatus(response.recordChapterGenerationBaseline);
        } catch (err) {
            console.error("Error recording chapter generation baseline:", err);
        }
    }

    function reset() {
        stopPolling();
        state.value = "NONE";
        error.value = null;
        suggestions.value = [];
        canRegenerate.value = true;
        activeRun = false;
    }

    onUnmounted(stopPolling);

    return {
        state,
        error,
        suggestions,
        busy,
        canRegenerate,
        hasCachedSuggestions,
        start,
        sync,
        recordChapterCountBaseline,
        reset,
    };
}
