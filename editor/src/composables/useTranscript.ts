import { ref, watch, type Ref } from "vue";
import { graphqlSdk } from "@/lib/graphql";
import type { RichPodTranscriptQuery } from "@/graphql/generated";

export type TranscriptSegment = NonNullable<
    RichPodTranscriptQuery["richPodTranscript"]
>["segments"][number];

export type Transcript = NonNullable<RichPodTranscriptQuery["richPodTranscript"]>;

/**
 * Loads the AI-generated transcript for a RichPod on demand (editor-only).
 * The transcript is fetched lazily — call `load()` when it is first needed
 * (e.g. when the transcript tab is opened) to avoid a GCS read on every editor
 * open. Reloads automatically when the RichPod id changes after a first load.
 */
export function useTranscript(richPodId: Ref<string | null>) {
    const transcript = ref<Transcript | null>(null);
    const loading = ref(false);
    const error = ref(false);
    const loaded = ref(false);

    async function load(): Promise<void> {
        const id = richPodId.value;
        if (!id) {
            return;
        }
        loading.value = true;
        error.value = false;
        try {
            const response = await graphqlSdk.RichPodTranscript({ richPodId: id });
            transcript.value = response.richPodTranscript ?? null;
            loaded.value = true;
        } catch (err) {
            console.error("Failed to load transcript:", err);
            error.value = true;
        } finally {
            loading.value = false;
        }
    }

    watch(richPodId, () => {
        transcript.value = null;
        loaded.value = false;
        error.value = false;
    });

    return { transcript, loading, error, loaded, load };
}
