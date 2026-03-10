import { watch, onBeforeUnmount, type Ref } from "vue";
import type { RichPod } from "@/graphql/generated.ts";
import { useAudio } from "@/composables/useAudio.ts";

const SKIP_SECONDS = 15;
const FALLBACK_ARTWORK = buildBaseUrlAssetPath("apple-touch-icon.png");

function buildBaseUrlAssetPath(fileName: string): string {
    const baseUrl = import.meta.env.BASE_URL.endsWith("/")
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`;
    return `${baseUrl}${fileName}`;
}

function artworkFor(pod: RichPod): MediaImage[] {
    const src = pod.origin.episode.artworkUrl || pod.origin.artworkUrl;
    return src ? [{ src }] : [{ src: FALLBACK_ARTWORK }];
}

export function useMediaSession(richPod: Ref<RichPod | null>) {
    if (!("mediaSession" in navigator)) {
        return;
    }

    const { audioElement, currentTime, mediaDuration } = useAudio();

    function playAudio() {
        const audio = audioElement.value;
        if (!audio || !audio.paused) return;
        void audio.play();
    }

    function pauseAudio() {
        const audio = audioElement.value;
        if (!audio || audio.paused) return;
        audio.pause();
    }

    function seekBy(seconds: number) {
        const audio = audioElement.value;
        if (!audio) return;
        audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, audio.duration));
    }

    function seekTo(time: number) {
        const audio = audioElement.value;
        if (!audio) return;
        audio.currentTime = Math.max(0, Math.min(time, audio.duration));
    }

    navigator.mediaSession.setActionHandler("play", playAudio);
    navigator.mediaSession.setActionHandler("pause", pauseAudio);
    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        seekBy(-(details.seekOffset ?? SKIP_SECONDS));
    });
    navigator.mediaSession.setActionHandler("seekforward", (details) => {
        seekBy(details.seekOffset ?? SKIP_SECONDS);
    });
    navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime != null) {
            seekTo(details.seekTime);
        }
    });

    const stopWatchMetadata = watch(
        richPod,
        (pod) => {
            if (!pod) return;
            navigator.mediaSession.metadata = new MediaMetadata({
                title: pod.title,
                artist: pod.description || "",
                artwork: artworkFor(pod),
            });
        },
        { immediate: true },
    );

    const stopWatchPosition = watch(
        [currentTime, mediaDuration],
        ([time, duration]) => {
            if (duration > 0) {
                navigator.mediaSession.setPositionState({
                    duration,
                    playbackRate: audioElement.value?.playbackRate ?? 1,
                    position: Math.min(time, duration),
                });
            }
        },
        { immediate: true },
    );

    onBeforeUnmount(() => {
        stopWatchMetadata();
        stopWatchPosition();
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("seekbackward", null);
        navigator.mediaSession.setActionHandler("seekforward", null);
        navigator.mediaSession.setActionHandler("seekto", null);
    });
}
