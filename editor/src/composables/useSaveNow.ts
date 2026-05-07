import { inject, provide, type InjectionKey } from "vue";
import type { RichPodForEdit } from "@/types/editor";

type SaveNowFn = () => Promise<RichPodForEdit | null>;

const SAVE_NOW_KEY: InjectionKey<SaveNowFn> = Symbol("saveNow");

export function provideSaveNow(saveNow: SaveNowFn) {
    provide(SAVE_NOW_KEY, saveNow);
}

export function useSaveNow(): SaveNowFn {
    const saveNow = inject(SAVE_NOW_KEY);
    if (!saveNow) {
        throw new Error("useSaveNow() requires a parent provideSaveNow()");
    }
    return saveNow;
}
