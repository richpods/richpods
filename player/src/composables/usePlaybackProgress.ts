import { watch, onBeforeUnmount, type Ref } from "vue";
import { useAudio } from "./useAudio";

const STORAGE_KEY = "richpods-playback-progress";
const MAX_ENTRIES = 100;
const SAVE_THROTTLE_MS = 5000;
const NEAR_END_THRESHOLD_S = 10;

type PlaybackEntry = {
    time: number;
    lastPlayed: number;
};

type PlaybackStore = Record<string, PlaybackEntry>;

function isValidEntry(v: unknown): v is PlaybackEntry {
    if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
    const keys = Object.keys(v);
    if (keys.length !== 2 || !keys.includes("time") || !keys.includes("lastPlayed")) return false;
    const e = v as PlaybackEntry;
    return isFinite(e.time) && e.time >= 0 && isFinite(e.lastPlayed);
}

function readStore(): PlaybackStore {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};

        const parsed: unknown = JSON.parse(raw);
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};

        const store: PlaybackStore = {};
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
            if (isValidEntry(value)) {
                store[key] = value;
            }
        }
        return store;
    } catch {
        return {};
    }
}

function writeStore(store: PlaybackStore): void {
    try {
        const entries = Object.entries(store);
        if (entries.length > MAX_ENTRIES) {
            entries.sort((a, b) => b[1].lastPlayed - a[1].lastPlayed);
            store = Object.fromEntries(entries.slice(0, MAX_ENTRIES / 2));
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
        // localStorage unavailable or quota exceeded
    }
}

function isNearEnd(time: number, duration: number): boolean {
    return duration > 0 && duration - time < NEAR_END_THRESHOLD_S;
}

export function usePlaybackProgress(richPodId: Ref<string | undefined>): void {
    const { canPlay, currentTime, mediaDuration, audioElement, isPaused } = useAudio();

    let restoredForId: string | null = null;
    let lastSaveAt = 0;

    function save(): void {
        const id = richPodId.value;
        if (!id) return;

        const store = readStore();
        if (isNearEnd(currentTime.value, mediaDuration.value)) {
            delete store[id];
        } else if (currentTime.value > 0) {
            store[id] = { time: currentTime.value, lastPlayed: Date.now() };
        }
        writeStore(store);
    }

    const stopWatchIdChange = watch(richPodId, (id, previousId) => {
        if (id !== previousId) {
            restoredForId = null;
        }
    });

    const stopWatchRestore = watch(
        canPlay,
        (ready) => {
            const id = richPodId.value;
            if (ready && id && restoredForId !== id) {
                const entry = readStore()[id];
                if (entry && audioElement.value) {
                    try {
                        audioElement.value.currentTime = entry.time;
                    } catch {
                        // Ignore seek failures from browser/media state edge cases.
                    }
                }
                restoredForId = id;
            }
        },
        { immediate: true },
    );

    const stopWatchTime = watch(currentTime, () => {
        const now = Date.now();
        if (now - lastSaveAt >= SAVE_THROTTLE_MS) {
            lastSaveAt = now;
            save();
        }
    });

    const stopWatchPause = watch(isPaused, (paused) => {
        if (paused) save();
    });

    onBeforeUnmount(() => {
        stopWatchIdChange();
        stopWatchRestore();
        stopWatchTime();
        stopWatchPause();
        save();
    });
}
