import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { toSeconds } from "@player/utils.ts";
import { RichPodState } from "@/graphql/generated";
import type {
    EditorChapter,
    EditorEnclosure,
    EditorSlide,
    RichPodForEdit,
} from "@/types/editor";

function cloneSlide(slide: EditorSlide): EditorSlide {
    return { ...slide };
}

function cloneEnclosure(enclosure: EditorEnclosure): EditorEnclosure {
    return {
        ...enclosure,
        chart: enclosure.chart ? { ...enclosure.chart } : enclosure.chart,
        geoJSON: enclosure.geoJSON ? { ...enclosure.geoJSON } : enclosure.geoJSON,
        slides: enclosure.slides ? enclosure.slides.map(cloneSlide) : enclosure.slides,
    };
}

function cloneChapter(chapter: EditorChapter): EditorChapter {
    return {
        begin: chapter.begin,
        enclosure: cloneEnclosure(chapter.enclosure),
        _isNew: chapter._isNew,
    };
}

function cloneRichPod(richpod: RichPodForEdit): RichPodForEdit {
    return {
        id: richpod.id,
        title: richpod.title,
        description: richpod.description,
        state: richpod.state,
        origin: richpod.origin
            ? {
                  ...richpod.origin,
                  episode: richpod.origin.episode
                      ? {
                            ...richpod.origin.episode,
                            media: richpod.origin.episode.media
                                ? { ...richpod.origin.episode.media }
                                : undefined,
                        }
                      : undefined,
              }
            : null,
        chapters: richpod.chapters.map(cloneChapter),
        isHosted: richpod.isHosted,
        hostedEpisodeId: richpod.hostedEpisodeId,
        explicit: richpod.explicit,
    };
}

export function createEmptyRichPod(): RichPodForEdit {
    return {
        id: undefined,
        title: "",
        description: "",
        state: RichPodState.Draft,
        origin: null,
        chapters: [],
        isHosted: false,
        hostedEpisodeId: null,
        explicit: false,
    };
}

export const useRichPodStore = defineStore("richpod", () => {
    const richpod = ref<RichPodForEdit>(createEmptyRichPod());
    const isDirty = ref(false);
    const activeChapterIndex = ref<number>(-1);

    const chapters = computed(() => richpod.value.chapters);
    const currentChapter = computed<EditorChapter | null>(() => {
        const index = activeChapterIndex.value;
        if (index < 0 || index >= chapters.value.length) {
            return null;
        }
        return chapters.value[index];
    });

    const isVerified = computed(() => richpod.value.origin?.verified ?? false);
    const state = computed(() => richpod.value.state);
    const isHosted = computed(() => richpod.value.isHosted);
    const hostedEpisodeId = computed(() => richpod.value.hostedEpisodeId);

    function setRichPod(next: RichPodForEdit, chapterIndex?: number) {
        richpod.value = cloneRichPod(next);
        isDirty.value = false;
        if (chapterIndex !== undefined && chapterIndex >= 0) {
            activeChapterIndex.value =
                next.chapters.length > 0
                    ? Math.min(chapterIndex, next.chapters.length - 1)
                    : -1;
        } else {
            activeChapterIndex.value = next.chapters.length > 0 ? 0 : -1;
        }
    }

    function resetRichPod() {
        setRichPod(createEmptyRichPod());
    }

    function markDirty() {
        isDirty.value = true;
    }

    function resetDirty() {
        isDirty.value = false;
    }

    function setTitle(title: string) {
        richpod.value = { ...richpod.value, title };
        markDirty();
    }

    function setDescription(description: string) {
        richpod.value = { ...richpod.value, description };
        markDirty();
    }

    function setState(newState: RichPodForEdit["state"]) {
        richpod.value = { ...richpod.value, state: newState };
        markDirty();
    }

    function setExplicit(value: boolean) {
        richpod.value = { ...richpod.value, explicit: value };
        markDirty();
    }

    function setChapters(nextChapters: EditorChapter[]) {
        const sorted = [...nextChapters.map(cloneChapter)].sort(
            (a, b) => toSeconds(a.begin) - toSeconds(b.begin),
        );
        richpod.value = { ...richpod.value, chapters: sorted };
        markDirty();
        activeChapterIndex.value =
            sorted.length > 0
                ? Math.min(Math.max(activeChapterIndex.value, 0), sorted.length - 1)
                : -1;
    }

    function addChapter(chapter: EditorChapter) {
        const newChapter = cloneChapter(chapter);
        const next = [...chapters.value.map(cloneChapter), newChapter];
        next.sort((a, b) => toSeconds(a.begin) - toSeconds(b.begin));
        richpod.value = { ...richpod.value, chapters: next };
        markDirty();
        activeChapterIndex.value = next.indexOf(newChapter);
    }

    function removeChapterAt(index: number) {
        if (index < 0 || index >= chapters.value.length) {
            return;
        }
        const next = chapters.value.slice();
        next.splice(index, 1);
        richpod.value = { ...richpod.value, chapters: next };
        markDirty();
        if (next.length === 0) {
            activeChapterIndex.value = -1;
            return;
        }
        activeChapterIndex.value = Math.min(Math.max(index - 1, 0), next.length - 1);
    }

    function updateChapterAt(index: number, updater: (chapter: EditorChapter) => EditorChapter) {
        if (index < 0 || index >= chapters.value.length) {
            return;
        }
        const next = chapters.value.slice();
        const cloned = cloneChapter(next[index]);
        const updated = cloneChapter(updater(cloned));
        next[index] = updated;
        richpod.value = { ...richpod.value, chapters: next };
        markDirty();
    }

    function updateCurrentChapter(updater: (chapter: EditorChapter) => EditorChapter) {
        const index = activeChapterIndex.value;
        if (index < 0) {
            return;
        }
        updateChapterAt(index, updater);
    }

    function setActiveChapterIndex(index: number) {
        activeChapterIndex.value = index;
    }

    return {
        richpod,
        chapters,
        currentChapter,
        isVerified,
        state,
        isHosted,
        hostedEpisodeId,
        isDirty,
        activeChapterIndex,
        setRichPod,
        resetRichPod,
        markDirty,
        resetDirty,
        setTitle,
        setDescription,
        setState,
        setExplicit,
        setChapters,
        addChapter,
        removeChapterAt,
        updateChapterAt,
        updateCurrentChapter,
        setActiveChapterIndex,
    };
});
