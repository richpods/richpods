import { UserState } from "../types/firestore.js";

type UserRecord<T> = { id: string; data: T };

export type UserLookupResult<T> =
    | { status: "missing" }
    | { status: "blocked" }
    | { status: "active"; value: T };

export function classifyUserRecords<T extends { state: string }>(
    records: readonly UserRecord<T>[],
): UserLookupResult<UserRecord<T>> {
    if (records.some((record) => record.data.state === UserState.BLOCKED)) {
        return { status: "blocked" };
    }

    const active = records.find((record) => record.data.state === UserState.ACTIVE);
    if (!active) {
        return { status: "missing" };
    }

    return { status: "active", value: active };
}
