/**
 * Validates a user-provided filename for safe storage as metadata.
 *
 * This function strictly validates filenames and rejects any that don't meet
 * security and filesystem compatibility requirements.
 *
 * Since we only store the original filename as metadata (not for actual file paths),
 * we reject invalid names entirely rather than attempting to fix them.
 *
 * Rejects filenames containing:
 * - Control characters (null, newlines, tabs, etc.)
 * - Path separators (/, \)
 * - Restricted characters (< > : " | ? *)
 * - Leading/trailing dots or whitespace
 * - Relative path indicators (., ..)
 * - Windows reserved names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
 * - Exceeding 255 bytes
 *
 * @param filename - The original filename from user input
 * @returns true if valid, false if invalid
 */
export function isValidFilename(filename?: string | null): boolean {
    if (!filename) {
        return false;
    }

    const trimmed = filename.trim();

    if (!trimmed || trimmed.length === 0) {
        return false;
    }

    // Reject if contains control characters (0x00-0x1f and 0x80-0x9f)
    if (/[\x00-\x1f\x80-\x9f]/.test(trimmed)) {
        return false;
    }

    // Reject if contains path separators or restricted characters
    // Restricted: < > : " / \ | ? *
    if (/[<>:"/\\|?*]/.test(trimmed)) {
        return false;
    }

    // Reject if starts or ends with dot or space (Windows restrictions)
    if (/^[. ]|[. ]$/.test(trimmed)) {
        return false;
    }

    // Reject relative path indicators
    if (trimmed === "." || trimmed === "..") {
        return false;
    }

    // Reject if exceeds 255 bytes (common filesystem limit)
    if (Buffer.byteLength(trimmed, "utf8") > 255) {
        return false;
    }

    return true;
}
