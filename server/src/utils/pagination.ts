const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export type PaginatedResult<T> = {
    items: T[];
    nextCursor: string | null;
};

export function resolvePageSize(first: number | undefined | null): number {
    if (first === undefined || first === null) return DEFAULT_PAGE_SIZE;
    return Math.max(1, Math.min(first, MAX_PAGE_SIZE));
}
