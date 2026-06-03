/**
 * Every log line emitted while processing a job is prefixed with the RichPod ID
 * it belongs to, so concurrent jobs can be told apart in Cloud Logging. Extra
 * arguments are forwarded to the underlying console call unchanged, so structured
 * values (e.g. an Error) keep their native formatting.
 */
function emit(
    sink: (message: string, ...args: unknown[]) => void,
    richPodId: string,
    message: string,
    args: unknown[],
): void {
    sink(`[generativeAiTools] [${richPodId}] ${message}`, ...args);
}

export function log(richPodId: string, message: string, ...args: unknown[]): void {
    emit(console.info, richPodId, message, args);
}

export function logWarn(richPodId: string, message: string, ...args: unknown[]): void {
    emit(console.warn, richPodId, message, args);
}

export function logError(richPodId: string, message: string, ...args: unknown[]): void {
    emit(console.error, richPodId, message, args);
}

/** Format an elapsed wall-clock span (since `startedAt`, in ms) as whole seconds. */
export function elapsedSeconds(startedAt: number): number {
    return (Date.now() - startedAt) / 1000;
}

/**
 * Summarize how long a transcription took: the wall-clock seconds and, when the
 * audio length is known, the runtime-to-audio-length factor (a "× realtime"
 * metric — below 1 means faster than the audio plays).
 */
export function formatTranscriptionTiming(
    startedAt: number,
    audioDurationSeconds: number | null,
): string {
    const seconds = elapsedSeconds(startedAt);
    if (audioDurationSeconds && audioDurationSeconds > 0) {
        const factor = seconds / audioDurationSeconds;
        return (
            `in ${seconds.toFixed(1)}s for ${Math.round(audioDurationSeconds)}s of audio ` +
            `(${factor.toFixed(2)}× realtime)`
        );
    }
    return `in ${seconds.toFixed(1)}s (audio length unknown — no realtime factor)`;
}
