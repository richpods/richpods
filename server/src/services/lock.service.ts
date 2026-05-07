import { db, RICHPODS_COLLECTION } from "../config/firestore.js";
import { Timestamp } from "@google-cloud/firestore";
import { getUserById, getUserReference } from "./user.service.js";
import type { RichPodDocument, RichPodLockData } from "../types/firestore.js";
import type { RichPodLock, RichPodLockAcquireResult } from "../graphql.js";

export const LOCK_HEARTBEAT_INTERVAL_SECONDS = 90;
const LOCK_TIMEOUT_MULTIPLIER = 4;
const LOCK_TIMEOUT_MS = LOCK_HEARTBEAT_INTERVAL_SECONDS * LOCK_TIMEOUT_MULTIPLIER * 1000;

export const LOCK_LOST_ERROR = "LOCK_LOST";

function isExpired(lock: RichPodLockData, now: Timestamp): boolean {
    return now.toMillis() - lock.lastHeartbeatAt.toMillis() > LOCK_TIMEOUT_MS;
}

/**
 * Verify the caller still holds the lock. Throws LOCK_LOST when the lock
 * is missing or owned by another session. Use this inside the same
 * transaction that performs a write so the check and the write commit
 * atomically.
 */
export function verifyLockHeldOrThrow(data: RichPodDocument, sessionId: string): void {
    const lock = data.lock;
    if (!lock || lock.sessionId !== sessionId) {
        throw new Error(LOCK_LOST_ERROR);
    }
}

async function mapLockToGraphQL(lock: RichPodLockData): Promise<RichPodLock> {
    const user = await getUserById(lock.user.id, false);
    if (!user) {
        throw new Error(`Lock holder user not found: ${lock.user.id}`);
    }
    const expiresAtMs = lock.lastHeartbeatAt.toMillis() + LOCK_TIMEOUT_MS;
    return {
        user,
        sessionId: lock.sessionId,
        acquiredAt: lock.acquiredAt.toDate().toISOString(),
        lastHeartbeatAt: lock.lastHeartbeatAt.toDate().toISOString(),
        expiresAt: new Date(expiresAtMs).toISOString(),
    };
}

export async function getRichPodLock(richPodId: string): Promise<RichPodLock | null> {
    const ref = db.collection(RICHPODS_COLLECTION).doc(richPodId);
    const doc = await ref.get();
    if (!doc.exists) {
        return null;
    }
    const data = doc.data() as RichPodDocument;
    if (!data.lock) {
        return null;
    }
    if (isExpired(data.lock, Timestamp.now())) {
        return null;
    }
    return mapLockToGraphQL(data.lock);
}

export async function acquireRichPodLock(
    richPodId: string,
    userId: string,
    sessionId: string,
    takeover: boolean,
): Promise<RichPodLockAcquireResult> {
    const result = await db.runTransaction<{ acquired: boolean; lock: RichPodLockData }>(
        async (tx) => {
            const ref = db.collection(RICHPODS_COLLECTION).doc(richPodId);
            const snap = await tx.get(ref);
            if (!snap.exists) {
                throw new Error("RichPod not found");
            }
            const data = snap.data() as RichPodDocument;
            if (data.editor.id !== userId) {
                throw new Error("Unauthorized: You can only edit your own RichPods");
            }

            const now = Timestamp.now();
            const existing = data.lock ?? null;
            const sameSession = existing?.sessionId === sessionId;
            const expired = existing ? isExpired(existing, now) : true;

            if (existing && !sameSession && !expired && !takeover) {
                return { acquired: false, lock: existing };
            }

            const newLock: RichPodLockData = {
                user: getUserReference(userId),
                sessionId,
                acquiredAt: sameSession && existing ? existing.acquiredAt : now,
                lastHeartbeatAt: now,
            };
            tx.update(ref, { lock: newLock });
            return { acquired: true, lock: newLock };
        },
    );

    const lock = await mapLockToGraphQL(result.lock);
    return { acquired: result.acquired, lock };
}

export async function heartbeatRichPodLock(
    richPodId: string,
    userId: string,
    sessionId: string,
): Promise<RichPodLock> {
    const renewed = await db.runTransaction<RichPodLockData>(async (tx) => {
        const ref = db.collection(RICHPODS_COLLECTION).doc(richPodId);
        const snap = await tx.get(ref);
        if (!snap.exists) {
            throw new Error("RichPod not found");
        }
        const data = snap.data() as RichPodDocument;
        if (data.editor.id !== userId) {
            throw new Error("Unauthorized: You can only edit your own RichPods");
        }
        const existing = data.lock ?? null;
        if (!existing || existing.sessionId !== sessionId) {
            throw new Error(LOCK_LOST_ERROR);
        }
        const now = Timestamp.now();
        const next: RichPodLockData = {
            ...existing,
            lastHeartbeatAt: now,
        };
        tx.update(ref, { lock: next });
        return next;
    });

    return mapLockToGraphQL(renewed);
}

export async function releaseRichPodLock(
    richPodId: string,
    userId: string,
    sessionId: string,
): Promise<boolean> {
    return db.runTransaction(async (tx) => {
        const ref = db.collection(RICHPODS_COLLECTION).doc(richPodId);
        const snap = await tx.get(ref);
        if (!snap.exists) {
            return false;
        }
        const data = snap.data() as RichPodDocument;
        if (data.editor.id !== userId) {
            throw new Error("Unauthorized: You can only release locks on your own RichPods");
        }
        const existing = data.lock ?? null;
        if (!existing || existing.sessionId !== sessionId) {
            return false;
        }
        tx.update(ref, { lock: null });
        return true;
    });
}

/**
 * Clear locks on every RichPod owned by the user. Returns the number
 * of locks that were cleared. Used by the profile page so a user can
 * recover from stale sessions across multiple RichPods at once.
 */
export async function clearAllLocksForUser(userId: string): Promise<number> {
    const userRef = getUserReference(userId);
    const snapshot = await db
        .collection(RICHPODS_COLLECTION)
        .where("editor", "==", userRef)
        .get();

    const docsToClear = snapshot.docs.filter((doc) => {
        const data = doc.data() as RichPodDocument;
        return data.lock != null;
    });
    if (docsToClear.length === 0) return 0;

    const batch = db.batch();
    for (const doc of docsToClear) {
        batch.update(doc.ref, { lock: null });
    }
    await batch.commit();
    return docsToClear.length;
}
