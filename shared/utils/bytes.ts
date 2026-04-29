const BINARY_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/**
 * Formats a byte count into a human-readable string using binary (1024-based)
 * units. Uses 1 decimal for values under 10 in the chosen unit, otherwise
 * rounds to a whole number.
 */
export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) {
        return "0 B";
    }
    if (bytes < 1024) {
        return `${Math.round(bytes)} B`;
    }
    let value = bytes / 1024;
    let unitIndex = 1;
    while (value >= 1024 && unitIndex < BINARY_UNITS.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
    return `${rounded} ${BINARY_UNITS[unitIndex]}`;
}
