import { HTTPError, RequestError } from "got";

/**
 * Converts low-level HTTP client errors into plain Errors with a concise,
 * client-safe message. System errors carrying a `code` property are masked by
 * the GraphQL error formatter, so fetch failures that users need to understand
 * (broken feed URL, blocked target, …) must be rethrown as plain Errors.
 */
export function toClientSafeFetchError(error: unknown, subject: string): Error {
    if (error instanceof HTTPError) {
        return new Error(`Failed to fetch ${subject}: HTTP ${error.response.statusCode}`);
    }
    if (error instanceof RequestError) {
        if (error.code === "EBLOCKED") {
            return new Error(`Failed to fetch ${subject}: blocked non-public address`);
        }
        if (error.code === "ETIMEDOUT") {
            return new Error(`Failed to fetch ${subject}: request timed out`);
        }
        return new Error(`Failed to fetch ${subject}: network error`);
    }
    return error instanceof Error ? error : new Error(`Failed to fetch ${subject}`);
}
