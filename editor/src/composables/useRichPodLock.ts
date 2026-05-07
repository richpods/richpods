import { onUnmounted, ref, watch, type Ref } from "vue";
import {
    acquireRichPodLock,
    fetchCurrentAuthToken,
    getRichPodLock,
    heartbeatRichPodLock,
    releaseRichPodLock,
    releaseRichPodLockViaKeepalive,
    type RichPodLock,
} from "@/services/richpodLockService";
import { isLockLostError } from "@/services/richpodService";

/**
 * Maximum interval (ms) between heartbeats from the editor. Must mirror the
 * server-side LOCK_HEARTBEAT_INTERVAL_SECONDS in lock.service.ts. The server
 * times out the lock after 4 × this interval, so an editor crash can never
 * permanently lock a RichPod.
 */
export const LOCK_HEARTBEAT_INTERVAL_MS = 90 * 1000;

export type LockState =
    | { status: "idle" }
    | { status: "acquiring" }
    | { status: "held"; lock: RichPodLock }
    | { status: "conflict"; lock: RichPodLock | null }
    | { status: "error"; message: string };

const SESSION_STORAGE_KEY = "richpod-lock-session-id";

/**
 * Stable per-tab session id. Stored in sessionStorage so a hard reload
 * re-uses the same id and re-acquires through the sameSession branch on
 * the server, avoiding a "you're locked by yourself" modal after refresh.
 * Some browsers clone sessionStorage when duplicating a tab; in that case
 * we rotate the id on initial "navigate" loads so each live tab is unique.
 */
function getOrCreateSessionId(): string {
    const fresh = crypto.randomUUID();
    try {
        const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (existing) {
            const nav = performance.getEntriesByType("navigation")[0] as
                | PerformanceNavigationTiming
                | undefined;
            const navType = nav?.type;
            if (navType === "reload" || navType === "back_forward") return existing;
        }
        sessionStorage.setItem(SESSION_STORAGE_KEY, fresh);
        return fresh;
    } catch {
        return fresh;
    }
}

export function useRichPodLock(richpodId: Ref<string | undefined>) {
    const sessionId = getOrCreateSessionId();
    const state = ref<LockState>({ status: "idle" });
    const wasHeld = ref(false);
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let currentId: string | undefined;
    let cachedAuthToken: string | null = null;
    let releasedForUnmount = false;

    function stopHeartbeat() {
        if (heartbeatTimer !== null) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    }

    function startHeartbeat() {
        stopHeartbeat();
        heartbeatTimer = setInterval(() => {
            void sendHeartbeat();
        }, LOCK_HEARTBEAT_INTERVAL_MS);
    }

    async function refreshCachedAuthToken() {
        cachedAuthToken = await fetchCurrentAuthToken();
    }

    async function transitionToConflict(id: string): Promise<void> {
        stopHeartbeat();
        wasHeld.value = true;
        let holder: RichPodLock | null = null;
        try {
            holder = await getRichPodLock(id);
        } catch (lookupErr) {
            console.warn("Failed to fetch new lock holder:", lookupErr);
        }
        if (currentId !== id) return;
        state.value = { status: "conflict", lock: holder };
    }

    async function sendHeartbeat() {
        const id = currentId;
        if (!id) return;
        if (state.value.status !== "held") return;
        try {
            const lock = await heartbeatRichPodLock(id, sessionId);
            if (currentId === id && state.value.status === "held") {
                state.value = { status: "held", lock };
            }
            void refreshCachedAuthToken();
        } catch (err) {
            // Only treat an explicit LOCK_LOST as a conflict. Transient network
            // or 5xx errors should not kick the user out of their own session;
            // the next heartbeat will retry, and the 6-min server timeout is
            // the ultimate fallback.
            if (isLockLostError(err)) {
                await transitionToConflict(id);
            } else {
                console.warn("Heartbeat failed (transient):", err);
            }
        }
    }

    async function tryAcquire(takeover: boolean): Promise<LockState> {
        const id = currentId;
        if (!id) {
            state.value = { status: "idle" };
            return state.value;
        }
        state.value = { status: "acquiring" };
        try {
            const result = await acquireRichPodLock(id, sessionId, takeover);
            if (currentId !== id) {
                // The pod changed while we were acquiring. If we won the lock
                // for the old pod, release it server-side so it doesn't sit
                // until the 6-minute timeout.
                if (result.acquired) {
                    void releaseRichPodLock(id, sessionId).catch(() => undefined);
                }
                return state.value;
            }
            if (result.acquired) {
                wasHeld.value = false;
                releasedForUnmount = false;
                state.value = { status: "held", lock: result.lock };
                startHeartbeat();
                void refreshCachedAuthToken();
            } else {
                stopHeartbeat();
                state.value = { status: "conflict", lock: result.lock };
            }
        } catch (err) {
            if (currentId !== id) return state.value;
            stopHeartbeat();
            state.value = {
                status: "error",
                message: err instanceof Error ? err.message : "Failed to acquire lock",
            };
        }
        return state.value;
    }

    async function acquire(): Promise<LockState> {
        return tryAcquire(false);
    }

    async function takeover(): Promise<LockState> {
        return tryAcquire(true);
    }

    async function releaseId(id: string): Promise<void> {
        const wasHeldHere = state.value.status === "held" && currentId === id;
        if (wasHeldHere) {
            stopHeartbeat();
            state.value = { status: "idle" };
        } else {
            // Don't bother RPCing if we never held the lock.
            return;
        }
        try {
            await releaseRichPodLock(id, sessionId);
        } catch (err) {
            console.warn("Failed to release lock:", err);
        }
    }

    async function release(): Promise<void> {
        const id = currentId;
        if (!id) return;
        if (state.value.status !== "held") return;
        await releaseId(id);
    }

    /**
     * Drive the lock state into "conflict" without waiting for the next
     * heartbeat. Call this when a save mutation fails with LOCK_LOST so the
     * UI can react immediately rather than wait up to 90s.
     */
    async function notifyLost(): Promise<void> {
        const id = currentId;
        if (!id) return;
        if (state.value.status !== "held") return;
        await transitionToConflict(id);
    }

    watch(
        richpodId,
        (next, prev) => {
            if (prev && prev !== next) {
                // releaseId checks state.status === "held" itself; calling it
                // before mutating state ensures it can still see we held the
                // prev lock and actually issue the server release.
                void releaseId(prev);
            }
            currentId = next;
            wasHeld.value = false;
            releasedForUnmount = false;
            if (next) {
                void acquire();
            } else {
                state.value = { status: "idle" };
            }
        },
        { immediate: true },
    );

    /**
     * Best-effort release on tab close via fetch keepalive so the request
     * outlives the page. Uses the cached auth token because pagehide cannot
     * await an async token refresh. The 6-minute server-side timeout still
     * acts as the ultimate fallback.
     */
    function flushReleaseSync() {
        const id = currentId;
        if (!id) return;
        if (state.value.status !== "held") return;
        if (releasedForUnmount) return;
        releasedForUnmount = true;
        stopHeartbeat();
        releaseRichPodLockViaKeepalive(id, sessionId, cachedAuthToken);
    }

    function onPageHide() {
        flushReleaseSync();
    }
    window.addEventListener("pagehide", onPageHide);

    function onVisibilityChange() {
        if (document.visibilityState !== "visible") return;
        if (state.value.status !== "held") return;
        // The tab may have been backgrounded long enough for another session
        // to take over. Verify with an immediate heartbeat — on failure
        // sendHeartbeat() routes us to the "kicked" warning.
        void sendHeartbeat();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    onUnmounted(() => {
        window.removeEventListener("pagehide", onPageHide);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        stopHeartbeat();
        if (releasedForUnmount) return;
        releasedForUnmount = true;
        void release();
    });

    return {
        state,
        wasHeld,
        sessionId,
        acquire,
        takeover,
        release,
        notifyLost,
    };
}
