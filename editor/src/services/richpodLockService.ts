import { graphqlSdk } from "@/lib/graphql";
import { auth } from "@/lib/firebase";
import type { RichPodLockFieldsFragment } from "@/graphql/generated";

export type RichPodLock = RichPodLockFieldsFragment;

export async function getRichPodLock(id: string): Promise<RichPodLock | null> {
    const response = await graphqlSdk.GetRichPodLock({ id });
    return response.richPodLock ?? null;
}

export type AcquireResult =
    | { acquired: true; lock: RichPodLock }
    | { acquired: false; lock: RichPodLock };

export async function acquireRichPodLock(
    id: string,
    sessionId: string,
    takeover = false,
): Promise<AcquireResult> {
    const response = await graphqlSdk.AcquireRichPodLock({ id, sessionId, takeover });
    const result = response.acquireRichPodLock;
    return result.acquired
        ? { acquired: true, lock: result.lock }
        : { acquired: false, lock: result.lock };
}

export async function heartbeatRichPodLock(id: string, sessionId: string): Promise<RichPodLock> {
    const response = await graphqlSdk.HeartbeatRichPodLock({ id, sessionId });
    return response.heartbeatRichPodLock;
}

export async function releaseRichPodLock(id: string, sessionId: string): Promise<boolean> {
    const response = await graphqlSdk.ReleaseRichPodLock({ id, sessionId });
    return response.releaseRichPodLock;
}

export async function clearAllOwnRichPodLocks(): Promise<number> {
    const response = await graphqlSdk.ClearAllOwnRichPodLocks();
    return response.clearAllOwnRichPodLocks;
}

const RELEASE_LOCK_QUERY =
    "mutation ReleaseRichPodLock($id: ID!, $sessionId: String!) { releaseRichPodLock(id: $id, sessionId: $sessionId) }";

/**
 * Fire a release request that survives the page unload. Uses fetch with
 * keepalive so the browser can complete the request after the tab closes.
 * The auth token is captured ahead of time because pagehide handlers cannot
 * await an asynchronous token refresh reliably. Falls back silently — the
 * server-side lock timeout recovers any stranded lock.
 */
export function releaseRichPodLockViaKeepalive(
    id: string,
    sessionId: string,
    authToken: string | null,
): void {
    const endpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT;
    if (!endpoint) return;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    try {
        void fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify({
                query: RELEASE_LOCK_QUERY,
                variables: { id, sessionId },
            }),
            keepalive: true,
        }).catch(() => undefined);
    } catch {
        // Intentionally ignored — server-side lock timeout is the fallback.
    }
}

/**
 * Resolves to the current Firebase ID token, or null if no user is signed in
 * or the lookup fails. Used to keep an auth token cached for the keepalive
 * release fetch on tab close.
 */
export async function fetchCurrentAuthToken(): Promise<string | null> {
    try {
        const user = auth.currentUser;
        return user ? await user.getIdToken() : null;
    } catch {
        return null;
    }
}
