import { watch } from "vue";
import { useRoute } from "vue-router";
import { useAudio } from "./useAudio";
import { useRichPod } from "./useRichPod";
import { visibleChapters } from "../utils";

export function useDeepLink(): void {
    const route = useRoute();
    const { canPlay, mediaDuration, seekTo } = useAudio();
    const { sortedChapters } = useRichPod();

    let applied = false;

    watch(
        canPlay,
        (ready) => {
            if (!ready || applied) return;
            applied = true;

            const rawT = route.query.t;
            const rawC = route.query.c;

            if (typeof rawT === "string") {
                applyTimestamp(rawT);
            } else if (typeof rawC === "string") {
                applyChapterIndex(rawC);
            }
        },
        { immediate: true },
    );

    function applyTimestamp(raw: string): void {
        const seconds = Number(raw);
        if (!Number.isFinite(seconds)) return;
        if (seconds < 0) return;
        if (mediaDuration.value > 0 && seconds > mediaDuration.value) return;

        seekTo(seconds);
    }

    function applyChapterIndex(raw: string): void {
        const index = Number(raw);
        if (!Number.isInteger(index)) return;

        const chapters = visibleChapters(sortedChapters.value);
        if (index < 1 || index > chapters.length) return;

        seekTo(chapters[index - 1].beginSeconds);
    }
}
