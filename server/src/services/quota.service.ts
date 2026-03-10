import { AggregateField } from "@google-cloud/firestore";
import { db, USERS_COLLECTION, UPLOADS_COLLECTION } from "../config/firestore.js";
import { uploadConfig } from "../config/uploads.js";
import type { UserDocument } from "../types/firestore.js";

/**
 * Quota caveats:
 * 1) Enforcement is currently non-atomic (check + write happen in separate steps),
 *    so concurrent uploads can temporarily bypass strict limits.
 * 2) Cache is process-local and not shared across instances, so quota views can
 *    diverge in distributed deployments until cache refresh.
 */
type QuotaInfo = {
    usedBytes: number;
    totalQuotaBytes: number;
};

type CacheEntry = {
    value: QuotaInfo;
    expiresAt: number;
};

const quotaCache = new Map<string, CacheEntry>();

function pruneCacheIfNeeded(): void {
    if (quotaCache.size <= uploadConfig.quotaCacheMaxEntries) {
        return;
    }

    const now = Date.now();
    for (const [key, entry] of quotaCache) {
        if (entry.expiresAt <= now) {
            quotaCache.delete(key);
        }
    }

    if (quotaCache.size <= uploadConfig.quotaCacheMaxEntries) {
        return;
    }

    const keys = Array.from(quotaCache.keys());
    const keysToRemove = keys.slice(0, quotaCache.size - uploadConfig.quotaCacheMaxEntries);
    for (const key of keysToRemove) {
        quotaCache.delete(key);
    }
}

function setCacheEntry(userId: string, value: QuotaInfo): void {
    const expiresAt = Date.now() + uploadConfig.quotaCacheTtlMs;
    quotaCache.set(userId, { value, expiresAt });
    pruneCacheIfNeeded();
}

function resolveTotalQuotaBytes(userDoc?: UserDocument | null): number {
    const override = userDoc?.uploadsQuotaBytes;
    if (typeof override === "number" && override > 0) {
        return override;
    }
    return uploadConfig.defaultUserQuotaBytes;
}

export async function getUserQuotaInfo(
    userId: string,
    userDoc?: UserDocument | null,
): Promise<QuotaInfo> {
    const totalQuotaBytes = resolveTotalQuotaBytes(userDoc);

    const cached = quotaCache.get(userId);
    if (cached && cached.expiresAt > Date.now() && cached.value.totalQuotaBytes === totalQuotaBytes) {
        return cached.value;
    }

    const userRef = db.collection(USERS_COLLECTION).doc(userId);
    const query = db.collection(UPLOADS_COLLECTION).where("user", "==", userRef);

    const aggregateSnapshot = await query
        .aggregate({
            usedBytes: AggregateField.sum("byteSize"),
        })
        .get();

    const aggregateData = aggregateSnapshot.data() as { usedBytes?: number | bigint };
    const usedBytesRaw = aggregateData?.usedBytes ?? 0;
    const usedBytes = typeof usedBytesRaw === "bigint" ? Number(usedBytesRaw) : usedBytesRaw;

    const quotaInfo: QuotaInfo = {
        usedBytes: Number.isFinite(usedBytes) ? usedBytes : 0,
        totalQuotaBytes,
    };

    setCacheEntry(userId, quotaInfo);

    return quotaInfo;
}

export function updateQuotaCache(
    userId: string,
    bytesDelta: number,
    totalQuotaBytes: number,
): void {
    const cached = quotaCache.get(userId);
    const baseValue: QuotaInfo = cached && cached.expiresAt > Date.now()
        ? cached.value
        : { usedBytes: 0, totalQuotaBytes };

    const nextUsed = Math.max(0, baseValue.usedBytes + bytesDelta);
    setCacheEntry(userId, {
        usedBytes: nextUsed,
        totalQuotaBytes,
    });
}

export function clearQuotaCacheForUser(userId: string): void {
    quotaCache.delete(userId);
}

export { resolveTotalQuotaBytes };
