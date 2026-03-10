import { ref, watch, type Ref } from "vue";
import { storeToRefs } from "pinia";
import { useRichPodStore } from "@/stores/useRichPodStore";
import { useEditorUiStore } from "@/stores/useEditorUiStore";
import { saveRichPod } from "@/services/richpodService";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutoSave(richpodId: Ref<string | undefined>) {
    const richpodStore = useRichPodStore();
    const editorUiStore = useEditorUiStore();
    const { isDirty, richpod } = storeToRefs(richpodStore);
    const { canEditorSave } = storeToRefs(editorUiStore);

    const saveStatus = ref<SaveStatus>("idle");
    const isSaving = ref(false);
    let pendingSave = false;
    let savedTimerId: ReturnType<typeof setTimeout> | null = null;

    function scheduleSavedReset() {
        if (savedTimerId !== null) clearTimeout(savedTimerId);
        savedTimerId = setTimeout(() => {
            if (saveStatus.value === "saved") {
                saveStatus.value = "idle";
            }
            savedTimerId = null;
        }, 3000);
    }
    const localChangeVersion = ref(0);

    watch(
        richpod,
        () => {
            localChangeVersion.value += 1;
        },
        { deep: true },
    );

    async function performSave() {
        const id = richpodId.value;
        if (!id || !isDirty.value || !canEditorSave.value) return;

        if (isSaving.value) {
            pendingSave = true;
            return;
        }

        isSaving.value = true;
        saveStatus.value = "saving";
        const saveStartVersion = localChangeVersion.value;

        try {
            await saveRichPod(id, richpod.value);
            const changedDuringSave = localChangeVersion.value !== saveStartVersion;
            if (changedDuringSave) {
                pendingSave = true;
                saveStatus.value = "idle";
            } else {
                richpodStore.resetDirty();
                saveStatus.value = "saved";
                scheduleSavedReset();
            }
        } catch (err) {
            console.error("Auto-save failed:", err);
            saveStatus.value = "error";
        } finally {
            isSaving.value = false;
        }

        if (pendingSave) {
            pendingSave = false;
            await performSave();
        }
    }

    // Auto-save on chapter switch
    watch(
        () => richpodStore.activeChapterIndex,
        () => {
            if (isDirty.value && canEditorSave.value) {
                performSave();
            }
        },
    );

    // Warn on tab close with unsaved changes
    function onBeforeUnload(e: BeforeUnloadEvent) {
        if (isDirty.value) {
            e.preventDefault();
        }
    }
    window.addEventListener("beforeunload", onBeforeUnload);

    function dispose() {
        window.removeEventListener("beforeunload", onBeforeUnload);
        if (savedTimerId !== null) clearTimeout(savedTimerId);
    }

    async function saveNow() {
        if (!isDirty.value || !canEditorSave.value) return;
        await performSave();
    }

    return { saveStatus, saveNow, dispose };
}
