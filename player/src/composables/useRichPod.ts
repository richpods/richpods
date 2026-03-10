import { ref, computed } from "vue";
import { api } from "@/graphql/client.ts";
import type { RichPod, RichPodQuery } from "@/graphql/generated.ts";
import { sortedChapters as buildSortedChapters } from "../utils.ts";
import type { SortedChapter } from "@/types/player.ts";

const richPod = ref<RichPod | null>(null);

export function useRichPod() {
    const loading = ref(false);
    const error = ref<Error | null>(null);

    const load = async (id: string) => {
        const data = ref<RichPodQuery | null>(null);
        loading.value = true;
        error.value = null;
        try {
            data.value = await api.RichPod({ id });
            // fixme: why do I need a typecast here?
            // was RichPodQuery["richPod"]
            richPod.value = data.value.richPod as RichPod;
            if (richPod.value?.title) {
                document.title = `${richPod.value.title} - RichPods.org`;
            }
        } catch (err) {
            error.value = err as Error;
        } finally {
            loading.value = false;
        }
    };

    const sortedChapters = computed<SortedChapter[]>(() => buildSortedChapters(richPod.value?.chapters || []));

    return { richPod, sortedChapters, loading, error, load };
}
