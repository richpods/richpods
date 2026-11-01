export type FeedEmailCheck = { ok: true; email: string | null } | { ok: false; reason: string };

export type VerifiedRecord = { id: string; userPath: string; email: string };

export type Revocation<T extends VerifiedRecord> = { record: T; reason: string };

export type FeedCheckTally = { checked: number; passed: number; failed: number; errors: number };

type UnknownRecord = Record<string, unknown>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_NOT_FOUND_REASON = "Email not found in feed";
const EMAIL_MISMATCH_REASON = "Email mismatch";

function asRecord(value: unknown): UnknownRecord | null {
    return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

function readItunesEmail(element: UnknownRecord | null): string | null {
    const value = element?.["itunes:email"];
    if (typeof value !== "string") {
        return null;
    }
    const email = value.trim();
    return EMAIL_REGEX.test(email) ? email : null;
}

export function extractEmailFromFeed(parsedFeed: unknown): string | null {
    const channel = asRecord(asRecord(asRecord(parsedFeed)?.rss)?.channel);
    if (!channel) {
        return null;
    }
    return readItunesEmail(channel) ?? readItunesEmail(asRecord(channel["itunes:owner"]));
}

export function feedFetchFailure(error: unknown): FeedEmailCheck {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, reason: `Feed fetch error: ${message}` };
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function revokeAll<T extends VerifiedRecord>(
    records: readonly T[],
    reason: string,
): Revocation<T>[] {
    return records.map((record) => ({ record, reason }));
}

export function selectVerificationsToRevoke<T extends VerifiedRecord>(
    records: readonly T[],
    feed: FeedEmailCheck,
): Revocation<T>[] {
    if (!feed.ok) {
        return revokeAll(records, feed.reason);
    }
    if (!feed.email) {
        return revokeAll(records, EMAIL_NOT_FOUND_REASON);
    }
    const currentEmail = normalizeEmail(feed.email);
    const confirmedUsers = new Set(
        records
            .filter((record) => normalizeEmail(record.email) === currentEmail)
            .map((record) => record.userPath),
    );
    return revokeAll(
        records.filter((record) => !confirmedUsers.has(record.userPath)),
        EMAIL_MISMATCH_REASON,
    );
}

export async function checkFeedVerifications<T extends VerifiedRecord>(
    records: readonly T[],
    feed: FeedEmailCheck,
    revoke: (record: T, reason: string) => Promise<void>,
): Promise<FeedCheckTally> {
    const revocations = selectVerificationsToRevoke(records, feed);
    const writes = await Promise.allSettled(
        revocations.map(({ record, reason }) => revoke(record, reason)),
    );
    const revoked = writes.filter((write) => write.status === "fulfilled").length;
    return {
        checked: records.length,
        passed: records.length - revocations.length,
        failed: revoked,
        errors: revocations.length - revoked,
    };
}
