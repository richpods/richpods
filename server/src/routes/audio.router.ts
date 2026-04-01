import { Router, type Request, type Response } from "express";
import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { db, RICHPODS_COLLECTION } from "../config/firestore.js";
import { audioConfig } from "../config/audio.js";
import { checkAndUpdateMedia } from "../services/media-check.service.js";
import type { RichPodDocument } from "../types/firestore.js";

export const audioRouter = Router();

const audioRateLimiter = new RateLimiterMemory({
    keyPrefix: "audio-ip",
    points: audioConfig.rateLimitPerIpPerMinute,
    duration: 60,
});

const AUDIO_MIME_PATTERNS = [
    "audio/mpeg",
    "audio/mp3",
    "audio/aac",
    "audio/mp4",
    "audio/m4a",
    "audio/wav",
    "audio/ogg",
    "audio/flac",
    "audio/x-m4a",
    "audio/*",
];

function wantsAudioRedirect(acceptHeader: string | undefined): boolean {
    if (!acceptHeader) return false;
    const lower = acceptHeader.toLowerCase();
    return AUDIO_MIME_PATTERNS.some((mime) => lower.includes(mime));
}

audioRouter.get("/:richPodId", async (req: Request, res: Response) => {
    try {
        const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
        await audioRateLimiter.consume(ip);
    } catch (error) {
        if (error instanceof RateLimiterRes) {
            res.set("Retry-After", String(Math.ceil(error.msBeforeNext / 1000)));
            res.status(429).json({ error: "Too many requests" });
            return;
        }
        throw error;
    }

    try {
        const richPodId = req.params.richPodId as string;

        // Only serve published RichPods
        const docRef = db.collection(RICHPODS_COLLECTION).doc(richPodId);
        const doc = await docRef.get();

        if (!doc.exists) {
            res.status(404).json({ error: "RichPod not found" });
            return;
        }

        const data = doc.data() as RichPodDocument;
        if (data.state !== "published") {
            res.status(404).json({ error: "RichPod not found" });
            return;
        }

        const media = await checkAndUpdateMedia(richPodId, false);
        const accept = Array.isArray(req.headers.accept)
            ? req.headers.accept.join(",")
            : req.headers.accept;

        if (wantsAudioRedirect(accept)) {
            res.redirect(303, media.url);
        } else {
            res.json({ url: media.url });
        }
    } catch (error: any) {
        console.error("Audio endpoint error:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
});
