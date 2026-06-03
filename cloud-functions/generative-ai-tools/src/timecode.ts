/**
 * Format a number of seconds as a canonical `hh:mm:ss.mmm` timecode (hours
 * zero-padded to at least two digits).
 */
export function formatTimecode(totalSeconds: number): string {
    const clamped = Math.max(0, totalSeconds);
    let whole = Math.floor(clamped);
    let millis = Math.round((clamped - whole) * 1000);
    if (millis === 1000) {
        millis = 0;
        whole += 1;
    }
    const seconds = whole % 60;
    const minutes = Math.floor(whole / 60) % 60;
    const hours = Math.floor(whole / 3600);
    const pad = (value: number, length = 2): string => String(value).padStart(length, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
}

const TIMECODE_PART = /^\d+(\.\d+)?$/;

/**
 * Normalize a loose timecode into canonical `hh:mm:ss.mmm`. Accepts the
 * variants Gemini returns — `hh:mm:ss(.mmm)`, `mm:ss(.mmm)`, or bare seconds —
 * with or without a fractional component. Returns null if the value cannot be
 * parsed as a timecode.
 */
export function normalizeTimecode(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const parts = value.trim().split(":");
    if (parts.length < 1 || parts.length > 3) return null;
    if (!parts.every((part) => TIMECODE_PART.test(part))) return null;

    const nums = parts.map(Number);
    if (nums.some((n) => !Number.isFinite(n))) return null;

    // Every field except the most significant one is a sexagesimal sub-unit and
    // must be < 60. A value like "00:01:90" is a model miscount, not 00:02:30, so
    // reject it instead of silently rolling it over into a wrong timestamp.
    if (nums.slice(1).some((n) => n >= 60)) return null;

    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    if (nums.length === 3) {
        [hours, minutes, seconds] = nums;
    } else if (nums.length === 2) {
        [minutes, seconds] = nums;
    } else {
        [seconds] = nums;
    }

    return formatTimecode(hours * 3600 + minutes * 60 + seconds);
}
