import type { Chapter } from "./graphql/generated.ts";
import type { SortedChapter } from "./types/player.ts";

/**
 * Returns true if a timestamp string is in the form "hh:mm:ss.mmm".
 */
export function isValidTimestamp(timestamp: string): boolean {
    return /^\d{2,}:[0-5][0-9]:[0-5][0-9]\.\d{3}$/.test(timestamp);
}

/**
 * Removes any '0' characters from the beginning of a string.
 */
export function stripLeadingZeros(str: string): string {
    return str.replace(/^0+(?=\d)/, "");
}

/**
 * Converts a timestamp in the form "hh:mm:ss.mmm" to total seconds.
 */
export function toSeconds(timestamp: string): number {
    const [hours, minutes, rest] = timestamp.split(":");
    const [seconds, millis] = rest.split(".");

    return (
        Number.parseInt(stripLeadingZeros(hours), 10) * 3600 +
        Number.parseInt(stripLeadingZeros(minutes), 10) * 60 +
        Number.parseInt(stripLeadingZeros(seconds), 10) +
        Number.parseInt(stripLeadingZeros(millis), 10) / 1000
    );
}

export function chapterKey(chapter: Chapter) {
    return `${chapter.begin}-${chapter.enclosure.__typename}`;
}

/**
 * Returns chapters sorted by begin time, with begin/end in seconds.
 * Filters out chapters with invalid timestamps and logs an error.
 */
export function sortedChapters(chapters: Chapter[] = []): SortedChapter[] {
    return chapters
        .filter((chapter) => {
            const validStart = isValidTimestamp(chapter.begin);
            if (!validStart) {
                console.error(`Invalid chapter timestamp (begin: ${chapter.begin})`, chapter);
                return false;
            }
            return true;
        })
        .map((chapter) => ({
            ...chapter,
            beginSeconds: toSeconds(chapter.begin),
        }))
        .sort((a, b) => a.beginSeconds - b.beginSeconds);
}

/**
 * Returns the index of the current chapter for a given time.
 * The current chapter is the last chapter whose beginSeconds <= time.
 * If no chapter has started yet, returns -1.
 */
export function currentChapterIndex(chapters: SortedChapter[], timeSeconds: number): number {
    if (!chapters || chapters.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < chapters.length; i++) {
        if (chapters[i].beginSeconds <= timeSeconds) idx = i; else break;
    }
    return idx;
}

/**
 * Returns the current chapter object for a given time, or null if none started.
 */
export function currentChapter(chapters: SortedChapter[], timeSeconds: number): SortedChapter | null {
    const idx = currentChapterIndex(chapters, timeSeconds);
    return idx >= 0 ? chapters[idx] : null;
}
