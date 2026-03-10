import express, { NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";

import { hostingConfig, allowedCoverMimeTypes } from "../config/hosting.js";
import { getUserFromToken } from "../services/auth.service.js";
import { isPrivilegedRole } from "@richpods/shared/utils/roles";
import { validate } from "../validation/validator.js";
import { createHostedPodcastInputSchema } from "../validation/hosted-schemas.js";
import { createHostedPodcast, getHostedPodcastById } from "../services/hosted-podcast.service.js";
import { createHostedEpisode, updateHostedEpisodeChecksum } from "../services/hosted-episode.service.js";
import {
    savePodcastCover,
    generateEpisodeAudioName,
    saveEpisodeAudio,
    saveEpisodeCover,
} from "../services/hosted-storage.service.js";
import { generateRssFeed } from "../services/rss-feed.service.js";
import type { CreateHostedPodcastInput } from "../graphql.js";

export const hostedRouter = express.Router();

/**
 * GET /api/v1/hosted/podcast/:podcastId/feed.xml
 * Public RSS feed for a hosted podcast. No authentication required.
 */
hostedRouter.get("/podcast/:podcastId/feed.xml", async (req: Request, res: Response) => {
    try {
        const podcastId = req.params.podcastId as string;
        const feedXml = await generateRssFeed(podcastId);

        if (!feedXml) {
            res.status(404).json({ error: "Podcast not found" });
            return;
        }

        res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=600");
        res.status(200).send(feedXml);
    } catch (error) {
        console.error("Error generating RSS feed:", error);
        res.status(500).json({ error: "Failed to generate RSS feed" });
    }
});

// Multer for podcast creation: cover image + JSON metadata
const podcastUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        files: 1,
        fileSize: hostingConfig.imageMaxFileSizeBytes,
    },
});

// Multer for episode creation: MP3 + optional cover image
const episodeUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        files: 2,
        fileSize: hostingConfig.mp3MaxFileSizeBytes,
    },
});

type UploadedFile = {
    fieldname: string;
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
};

type HostedAuth = {
    userId: string;
    role: string;
};

type HostedAuthRequest = Request & {
    hostedAuth?: HostedAuth;
};

async function authenticatePrivileged(req: Request, res: Response): Promise<HostedAuth | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Authentication required" });
        return null;
    }

    const token = authHeader.substring(7);
    const result = await getUserFromToken(token);
    if (!result) {
        res.status(401).json({ error: "Invalid authentication token" });
        return null;
    }

    if (!isPrivilegedRole(result.role)) {
        res.status(403).json({ error: "Hosted RichPods are only available to privileged users" });
        return null;
    }

    return { userId: result.user.id, role: result.role ?? "" };
}

async function requirePrivileged(req: Request, res: Response, next: NextFunction): Promise<void> {
    const auth = await authenticatePrivileged(req, res);
    if (!auth) {
        return;
    }

    (req as HostedAuthRequest).hostedAuth = auth;
    next();
}

function getHostedAuthOrReject(req: Request, res: Response): HostedAuth | null {
    const auth = (req as HostedAuthRequest).hostedAuth;
    if (!auth) {
        res.status(500).json({ error: "Authentication middleware misconfigured" });
        return null;
    }

    return auth;
}

async function validateCoverImage(
    buffer: Buffer,
): Promise<{ processedBuffer: Buffer; mimeType: string; extension: string } | { error: string }> {
    const detectedType = await fileTypeFromBuffer(buffer);
    if (!detectedType || !(detectedType.mime in allowedCoverMimeTypes)) {
        return { error: "Cover image must be JPEG or PNG" };
    }

    const extension = allowedCoverMimeTypes[detectedType.mime];
    const image = sharp(buffer, { failOn: "truncated" }).rotate();
    const metadata = await image.metadata();

    const width = metadata.width;
    const height = metadata.height;

    if (!width || !height) {
        return { error: "Could not read image dimensions" };
    }

    // Must be 1:1 aspect ratio
    if (width !== height) {
        return { error: "Cover image must have a 1:1 (square) aspect ratio" };
    }

    if (width < hostingConfig.imageMinDimensionPx || width > hostingConfig.imageMaxDimensionPx) {
        return {
            error: `Cover image dimensions must be between ${hostingConfig.imageMinDimensionPx}x${hostingConfig.imageMinDimensionPx} and ${hostingConfig.imageMaxDimensionPx}x${hostingConfig.imageMaxDimensionPx} pixels`,
        };
    }

    let processedBuffer: Buffer;
    switch (detectedType.mime) {
        case "image/png":
            processedBuffer = await image.png({ compressionLevel: 9 }).toBuffer();
            break;
        case "image/jpeg":
            processedBuffer = await image.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
            break;
        default:
            return { error: "Cover image must be JPEG or PNG" };
    }

    if (processedBuffer.length > hostingConfig.imageMaxFileSizeBytes) {
        return { error: "Cover image exceeds maximum size after processing" };
    }

    return { processedBuffer, mimeType: detectedType.mime, extension };
}

/**
 * POST /api/v1/hosted/podcast
 * Create a hosted podcast with cover image.
 * Multipart form: "cover" (image file) + "metadata" (JSON string)
 */
hostedRouter.post(
    "/podcast",
    requirePrivileged,
    podcastUpload.single("cover"),
    async (req: Request, res: Response) => {
        try {
            const auth = getHostedAuthOrReject(req, res);
            if (!auth) {
                return;
            }

            const file = (req as unknown as { file?: UploadedFile }).file;
            if (!file) {
                res.status(400).json({ error: "Cover image is required" });
                return;
            }

            // Parse metadata from form field
            const metadataRaw = req.body.metadata;
            if (!metadataRaw) {
                res.status(400).json({ error: "Metadata field is required" });
                return;
            }

            let metadata: CreateHostedPodcastInput;
            try {
                const parsed =
                    typeof metadataRaw === "string" ? JSON.parse(metadataRaw) : metadataRaw;
                metadata = validate<CreateHostedPodcastInput>(
                    createHostedPodcastInputSchema,
                    parsed,
                );
            } catch (err) {
                const message = err instanceof Error ? err.message : "Invalid metadata";
                res.status(400).json({ error: message });
                return;
            }

            // Validate cover image
            const coverResult = await validateCoverImage(file.buffer);
            if ("error" in coverResult) {
                res.status(400).json({ error: coverResult.error });
                return;
            }

            // Generate a podcast ID once and reuse it for both storage path and Firestore doc.
            const { v4: uuidv4 } = await import("uuid");
            const podcastId = uuidv4();

            const gcsCoverName = await savePodcastCover(
                podcastId,
                coverResult.processedBuffer,
                coverResult.extension,
                coverResult.mimeType,
            );

            // Create the podcast in Firestore using the same ID.
            const podcast = await createHostedPodcast(
                metadata,
                gcsCoverName,
                coverResult.mimeType,
                auth.userId,
                podcastId,
            );

            res.status(201).json(podcast);
        } catch (error) {
            console.error("Error creating hosted podcast:", error);
            const message =
                error instanceof Error ? error.message : "Failed to create hosted podcast";
            res.status(500).json({ error: message });
        }
    },
);

/**
 * POST /api/v1/hosted/podcast/:podcastId/cover
 * Upload/replace a podcast cover image.
 */
hostedRouter.post(
    "/podcast/:podcastId/cover",
    requirePrivileged,
    podcastUpload.single("cover"),
    async (req: Request, res: Response) => {
        try {
            const auth = getHostedAuthOrReject(req, res);
            if (!auth) {
                return;
            }

            const podcastId = req.params.podcastId as string;
            const podcast = await getHostedPodcastById(podcastId, auth.userId);
            if (!podcast) {
                res.status(404).json({ error: "Hosted podcast not found" });
                return;
            }

            const file = (req as unknown as { file?: UploadedFile }).file;
            if (!file) {
                res.status(400).json({ error: "Cover image is required" });
                return;
            }

            const coverResult = await validateCoverImage(file.buffer);
            if ("error" in coverResult) {
                res.status(400).json({ error: coverResult.error });
                return;
            }

            const gcsCoverName = await savePodcastCover(
                podcastId,
                coverResult.processedBuffer,
                coverResult.extension,
                coverResult.mimeType,
            );

            // Update the Firestore document with the new cover
            const { db, HOSTED_PODCASTS_COLLECTION } = await import("../config/firestore.js");
            const { FieldValue } = await import("@google-cloud/firestore");
            await db.collection(HOSTED_PODCASTS_COLLECTION).doc(podcastId).update({
                gcsCoverImageName: gcsCoverName,
                coverImageMimeType: coverResult.mimeType,
                updatedAt: FieldValue.serverTimestamp(),
            });

            res.status(200).json({ coverImageUrl: podcast.coverImageUrl });
        } catch (error) {
            console.error("Error uploading podcast cover:", error);
            const message = error instanceof Error ? error.message : "Failed to upload cover";
            res.status(500).json({ error: message });
        }
    },
);

/**
 * POST /api/v1/hosted/podcast/:podcastId/episode
 * Upload a new episode (MP3 file + optional cover image).
 * Multipart form: "audio" (MP3 file) + optional "cover" (image file) + "title" + "description"
 */
hostedRouter.post(
    "/podcast/:podcastId/episode",
    requirePrivileged,
    episodeUpload.fields([
        { name: "audio", maxCount: 1 },
        { name: "cover", maxCount: 1 },
    ]),
    async (req: Request, res: Response) => {
        try {
            const auth = getHostedAuthOrReject(req, res);
            if (!auth) {
                return;
            }

            const podcastId = req.params.podcastId as string;
            const podcast = await getHostedPodcastById(podcastId, auth.userId);
            if (!podcast) {
                res.status(404).json({ error: "Hosted podcast not found" });
                return;
            }

            const files = (req as unknown as { files?: Record<string, UploadedFile[]> }).files;
            const audioFile = files?.audio?.[0];
            const coverFile = files?.cover?.[0];

            if (!audioFile) {
                res.status(400).json({ error: "MP3 audio file is required" });
                return;
            }

            // Validate MP3 file size
            if (audioFile.buffer.length > hostingConfig.mp3MaxFileSizeBytes) {
                res.status(413).json({
                    error: `MP3 file exceeds maximum size of ${Math.round(hostingConfig.mp3MaxFileSizeBytes / 1024 / 1024)} MB`,
                });
                return;
            }

            // Basic MP3 validation: check file magic bytes
            const audioType = await fileTypeFromBuffer(audioFile.buffer);
            if (!audioType || audioType.mime !== "audio/mpeg") {
                res.status(415).json({ error: "File must be a valid MP3 (audio/mpeg)" });
                return;
            }

            const title = req.body.title?.trim() || "Untitled Episode";
            const description = req.body.description?.trim() || "";

            // Generate episode UUID for GCS path
            const { v4: uuidv4 } = await import("uuid");
            const episodeId = uuidv4();

            // Pre-compute the GCS audio name before uploading
            const gcsAudioName = generateEpisodeAudioName(podcastId, episodeId);

            // Handle optional cover image (upload before MP3 so it's ready)
            let gcsEpisodeCoverName: string | null = null;
            let episodeCoverMimeType: string | null = null;

            if (coverFile) {
                const coverResult = await validateCoverImage(coverFile.buffer);
                if ("error" in coverResult) {
                    res.status(400).json({ error: `Episode cover: ${coverResult.error}` });
                    return;
                }

                gcsEpisodeCoverName = await saveEpisodeCover(
                    podcastId,
                    episodeId,
                    coverResult.processedBuffer,
                    coverResult.extension,
                    coverResult.mimeType,
                );
                episodeCoverMimeType = coverResult.mimeType;
            }

            // Create the Firestore documents BEFORE uploading the MP3,
            // because the GCS upload triggers the validation cloud function
            // which needs the Firestore document to already exist.
            const result = await createHostedEpisode({
                episodeId,
                podcastId,
                gcsAudioName,
                audioByteSize: audioFile.buffer.length,
                gcsEpisodeCoverName,
                episodeCoverMimeType,
                richPodTitle: title,
                richPodDescription: description,
                editorUserId: auth.userId,
            });

            // Now upload the MP3 to GCS (triggers the validation cloud function)
            const { md5Hash } = await saveEpisodeAudio(gcsAudioName, audioFile.buffer);
            await updateHostedEpisodeChecksum(result.richPodId, `md5:${md5Hash}`);

            res.status(201).json({
                episode: result.episode,
                richPodId: result.richPodId,
            });
        } catch (error) {
            console.error("Error creating hosted episode:", error);
            const message = error instanceof Error ? error.message : "Failed to create episode";
            res.status(500).json({ error: message });
        }
    },
);

// Error handler for multer errors
hostedRouter.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof MulterError) {
        const message =
            err.code === "LIMIT_FILE_SIZE" ? "File exceeds maximum size" : "Invalid upload";
        const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        res.status(status).json({ error: message });
        return;
    }

    if (err) {
        const error = err instanceof Error ? err : new Error("Unknown upload error");
        console.error("Hosted upload middleware error", error);
        res.status(500).json({ error: "Upload failed" });
        return;
    }

    next();
});
