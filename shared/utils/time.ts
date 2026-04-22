/**
 * Shared time formatting utilities used across player, editor, and website.
 */

/**
 * Formats a number of seconds as "m:ss" or, when >= 1 hour, "h:mm:ss".
 * Negative or non-finite inputs are clamped to 0.
 */
export function formatTime(seconds: number): string {
    const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    if (h > 0) {
        return `${h}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
}
