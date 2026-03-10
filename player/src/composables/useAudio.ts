import { ref, watch } from "vue";

const audioElement = ref<HTMLAudioElement | null>(null);
const canPlay = ref(false);
const isPaused = ref(false);
const currentTime = ref(0);
const mediaDuration = ref(0.0);
const volume = ref(1.0);
const playbackRate = ref(1.0);

// keep references to cleanup
let stopWatchVolume: (() => void) | null = null;
let stopWatchPlaybackRate: (() => void) | null = null;

const onPlay = () => (isPaused.value = false);
const onPause = () => (isPaused.value = true);
const onEnded = () => (isPaused.value = true);
const onTimeUpdate = () => {
    const audio = audioElement.value;
    if (audio) currentTime.value = audio.currentTime;
};
const onCanPlay = () => {
    const audio = audioElement.value;
    if (audio && isFinite(audio.duration)) {
        mediaDuration.value = audio.duration;
    }
};
const onCanPlayThrough = () => {
    const audio = audioElement.value;
    canPlay.value = true;
    if (audio && isFinite(audio?.duration)) {
        mediaDuration.value = audio.duration;
    } else {
        console.error(`Media duration could not be calculated!`);
    }
};

function setAudio(url: string) {
    if (!audioElement.value) {
        const audio = new Audio();
        audio.style.display = "none";
        document.body.appendChild(audio);
        audioElement.value = audio;

        audio.addEventListener("play", onPlay);
        audio.addEventListener("pause", onPause);
        audio.addEventListener("ended", onEnded);
        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.addEventListener("canplay", onCanPlay);
        audio.addEventListener("canplaythrough", onCanPlayThrough);

        stopWatchVolume = watch(volume, (v) => {
            audio.volume = v;
        });

        stopWatchPlaybackRate = watch(playbackRate, (r) => {
            audio.playbackRate = r;
        });
    }

    const audio = audioElement.value!;
    audio.pause();
    audio.src = url;
    audio.load();

    audio.volume = volume.value;
    audio.playbackRate = playbackRate.value;

    canPlay.value = false;

    isPaused.value = audio.paused;
}

function togglePlay() {
    if (audioElement.value) {
        if (audioElement.value.paused) {
            audioElement.value.play();
        } else {
            audioElement.value.pause();
        }
    }
}

export function useAudio(url?: string) {
    if (url) {
        setAudio(url);
    }

    return {
        audioElement,
        canPlay,
        isPaused,
        currentTime,
        mediaDuration,
        togglePlay,
        volume,
        playbackRate,
        setAudio,
        disposeAudio: () => {
            const audio = audioElement.value;
            if (audio) {
                try {
                    audio.pause();
                } catch {}
                audio.removeEventListener("play", onPlay);
                audio.removeEventListener("pause", onPause);
                audio.removeEventListener("ended", onEnded);
                audio.removeEventListener("timeupdate", onTimeUpdate);
                audio.removeEventListener("canplay", onCanPlay);
                audio.removeEventListener("canplaythrough", onCanPlayThrough);
                audio.src = "";
                audio.load();
                if (audio.parentNode) {
                    audio.parentNode.removeChild(audio);
                }
            }
            if (stopWatchVolume) {
                stopWatchVolume();
                stopWatchVolume = null;
            }
            if (stopWatchPlaybackRate) {
                stopWatchPlaybackRate();
                stopWatchPlaybackRate = null;
            }
            audioElement.value = null;
            canPlay.value = false;
            isPaused.value = false;
            currentTime.value = 0;
            mediaDuration.value = 0;
        },
    };
}
