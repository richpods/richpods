import { ref, watch, type Ref } from "vue";
import { storeToRefs } from "pinia";
import { useRichPodStore } from "@/stores/useRichPodStore";
import { useEditorUiStore } from "@/stores/useEditorUiStore";
import { isLockLostError, saveRichPod } from "@/services/richpodService";
import type { RichPodForEdit } from "@/types/editor";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutoSave(
    richpodId: Ref<string | undefined>,
    sessionId: string,
    canWrite: Ref<boolean>,
    onLockLost: () => void | Promise<void>,
) {
    const richpodStore = useRichPodStore();
    const editorUiStore = useEditorUiStore();
    const { isDirty, richpod } = storeToRefs(richpodStore);
    const { canEditorSave } = storeToRefs(editorUiStore);

    const saveStatus = ref<SaveStatus>("idle");
    let savedTimerId: ReturnType<typeof setTimeout> | null = null;
    let saveChain: Promise<unknown> = Promise.resolve();

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

    function canSaveNow(): boolean {
        return !!richpodId.value && isDirty.value && canEditorSave.value && canWrite.value;
    }

    /**
     * Run a single save attempt. Returns the server response on a clean save
     * (no edits during save), null when the user edited mid-save and another
     * round is needed, and throws on any other error.
     */
    async function attemptSave(): Promise<RichPodForEdit | null> {
        const id = richpodId.value;
        if (!id) return null;
        saveStatus.value = "saving";
        const versionBeforeSave = localChangeVersion.value;
        try {
            const updated = await saveRichPod(id, sessionId, richpod.value);
            const changedDuringSave = localChangeVersion.value !== versionBeforeSave;
            if (changedDuringSave) {
                saveStatus.value = "idle";
                return null;
            }
            richpodStore.resetDirty();
            return updated;
        } catch (err) {
            saveStatus.value = "error";
            if (isLockLostError(err)) {
                await onLockLost();
            }
            throw err;
        }
    }

    /**
     * Queue a save behind any in-flight save. Loops while the data is dirty
     * so edits made during a save trigger a follow-up round. The "saved"
     * status is only set once the loop finishes cleanly, eliminating the
     * old "saved → idle → saving" flicker when changes piled up.
     */
    async function saveNow(): Promise<RichPodForEdit | null> {
        let resolveResult!: (v: RichPodForEdit | null) => void;
        let rejectResult!: (e: unknown) => void;
        const result = new Promise<RichPodForEdit | null>((res, rej) => {
            resolveResult = res;
            rejectResult = rej;
        });

        saveChain = saveChain.then(async () => {
            try {
                let last: RichPodForEdit | null = null;
                while (canSaveNow()) {
                    const saved = await attemptSave();
                    if (saved) {
                        last = saved;
                        break;
                    }
                }
                if (last) {
                    saveStatus.value = "saved";
                    scheduleSavedReset();
                }
                resolveResult(last);
            } catch (err) {
                rejectResult(err);
            }
        });

        return result;
    }

    // Auto-save on chapter switch
    watch(
        () => richpodStore.activeChapterIndex,
        () => {
            if (canSaveNow()) {
                void saveNow().catch(() => {
                    // Errors surface through saveStatus and onLockLost; nothing
                    // additional to do here.
                });
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

    return { saveStatus, saveNow, dispose };
}
