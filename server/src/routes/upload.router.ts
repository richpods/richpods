import express, { NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";

import { uploadConfig, allowedImageMimeTypes } from "../config/uploads.js";
import { consumeUploadSlot } from "../services/rate-limit.service.js";
import {
    createUploadRecord,
    getPublicUrlForGcsObject,
    getUploadRecord,
    saveUploadToGcs,
} from "../services/upload.service.js";
import { createAuthContext } from "../middleware/auth.js";
import { db, RICHPODS_COLLECTION, USERS_COLLECTION } from "../config/firestore.js";
import type { RichPodDocument, UserDocument } from "../types/firestore.js";
import { UploadType, RichPodState } from "../types/firestore.js";
import { getUserQuotaInfo, updateQuotaCache } from "../services/quota.service.js";
import type { UploadContext, UploadedFile } from "../types/uploads.js";
import { isValidFilename } from "../utils/sanitization.js";
import { isPrivilegedRole } from "@richpods/shared/utils/roles";
import { validateField, ValidationError } from "../validation/validator.js";
import { idSchema } from "../validation/schemas.js";

export const uploadRouter = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        files: 1,
        fileSize: uploadConfig.maxFileSizeBytes,
    },
});

function logUploadFailure(reason: string, { ip, userId, richPodId }: UploadContext): void {
    console.warn(
        `Upload failed: ${reason}` +
            ` | ip=${ip}` +
            (userId ? ` | user=${userId}` : "") +
            (richPodId ? ` | richPod=${richPodId}` : ""),
    );
}

function logUploadSuccess(uploadId: string, { ip, userId, richPodId }: UploadContext): void {
    console.info(
        `Upload successful: upload=${uploadId}` +
            ` | ip=${ip}` +
            (userId ? ` | user=${userId}` : "") +
            (richPodId ? ` | richPod=${richPodId}` : ""),
    );
}

async function getRichPodDocument(richPodId: string): Promise<RichPodDocument | null> {
    const doc = await db.collection(RICHPODS_COLLECTION).doc(richPodId).get();
    if (!doc.exists) {
        return null;
    }
    return doc.data() as RichPodDocument;
}

async function getUserDocument(userId: string): Promise<UserDocument | null> {
    const doc = await db.collection(USERS_COLLECTION).doc(userId).get();
    if (!doc.exists) {
        return null;
    }
    return doc.data() as UserDocument;
}

uploadRouter.post(
    "/",
    upload.single("file"),
    async (req: Request, res: Response) => {
        req.setTimeout(uploadConfig.timeoutMs);
        res.setTimeout(uploadConfig.timeoutMs);

        const context: UploadContext = {
            ip: req.ip ?? "unknown",
        };

        try {
            const auth = await createAuthContext(req);
            if (!auth.userId || !auth.user) {
                logUploadFailure(auth.token ? "invalid token" : "missing bearer token", context);
                res.status(401).json({ error: "Authentication required" });
                return;
            }

            context.userId = auth.userId;
            const user = auth.user;
            const role = auth.role;
            const isPrivileged = isPrivilegedRole(role);

            if (!isPrivileged) {
                const rateLimitResult = await consumeUploadSlot(user.id);
                if (!rateLimitResult.ok) {
                    const retryAfterSeconds = Math.ceil(rateLimitResult.retryAfterMs / 1000);
                    res.setHeader("Retry-After", `${retryAfterSeconds}`);
                    logUploadFailure(
                        `${rateLimitResult.scope} rate limit exceeded`,
                        context,
                    );
                    res.status(429).json({
                        error: "Upload rate limit exceeded"
                    });
                    return;
                }
            }

            const normalizedRichPodId = validateField<string>(
                idSchema,
                req.body.richPodId,
                "richPodId",
            );
            context.richPodId = normalizedRichPodId;

            const richPod = await getRichPodDocument(normalizedRichPodId);
            if (!richPod || richPod.state === RichPodState.DELETED) {
                logUploadFailure("richPod not found", context);
                res.status(404).json({ error: "RichPod not found" });
                return;
            }

            const editorUserId = richPod.editor.id;
            if (editorUserId !== user.id) {
                logUploadFailure("richPod owned by another user", context);
                res.status(403).json({ error: "You cannot upload to this RichPod" });
                return;
            }

            if (!isPrivileged) {
                if (!richPod.origin.verified) {
                    logUploadFailure("richPod origin is not verified", context);
                    res.status(403).json({ error: "RichPod origin must be verified" });
                    return;
                }
            }

            const file = (req as unknown as { file?: UploadedFile }).file;
            if (!file) {
                logUploadFailure("missing file", context);
                res.status(400).json({ error: "No file uploaded" });
                return;
            }

            if (!file.buffer || file.buffer.length === 0) {
                logUploadFailure("empty file buffer", context);
                res.status(400).json({ error: "Uploaded file is empty" });
                return;
            }

            if (file.buffer.length > uploadConfig.maxFileSizeBytes || file.size > uploadConfig.maxFileSizeBytes) {
                logUploadFailure("file exceeds max size", context);
                res.status(413).json({ error: "File exceeds maximum size" });
                return;
            }

            const detectedType = await fileTypeFromBuffer(file.buffer);
            if (!detectedType || !(detectedType.mime in allowedImageMimeTypes)) {
                logUploadFailure("unsupported file type", context);
                res.status(415).json({ error: "Unsupported file type" });
                return;
            }

            const extension = allowedImageMimeTypes[detectedType.mime];

            let processedBuffer: Buffer;
            let width: number | undefined;
            let height: number | undefined;

            const image = sharp(file.buffer, { failOn: "truncated" }).rotate();
            const metadata = await image.metadata();

            width = metadata.width;
            height = metadata.height;

            if (!width || !height) {
                logUploadFailure("could not read image dimensions", context);
                res.status(400).json({ error: "Invalid image" });
                return;
            }

            const minDimension = Math.min(width, height);
            const maxDimension = Math.max(width, height);

            if (minDimension < uploadConfig.minDimensionPx) {
                logUploadFailure("image below minimum dimensions", context);
                res.status(400).json({ error: "Image is too small in pixels" });
                return;
            }

            if (maxDimension > uploadConfig.maxDimensionPx) {
                logUploadFailure("image exceeds maximum dimensions", context);
                res.status(400).json({ error: "Image exceeds maximum pixel dimensions" });
                return;
            }

            switch (detectedType.mime) {
                case "image/png":
                    processedBuffer = await image.png({ compressionLevel: 9 }).toBuffer();
                    break;
                case "image/jpeg":
                    processedBuffer = await image.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
                    break;
                case "image/webp":
                    processedBuffer = await image.webp({ quality: 90 }).toBuffer();
                    break;
                default:
                    logUploadFailure("unexpected mime type after detection", context);
                    res.status(415).json({ error: "Unsupported file type" });
                    return;
            }

            if (processedBuffer.length > uploadConfig.maxFileSizeBytes) {
                logUploadFailure("processed file exceeds max size", context);
                res.status(413).json({ error: "File exceeds maximum size" });
                return;
            }

            const userDoc = await getUserDocument(user.id);
            if (!userDoc) {
                logUploadFailure("user document missing", context);
                res.status(401).json({ error: "Authentication required" });
                return;
            }

            let totalQuotaBytes: number | undefined;
            if (!isPrivileged) {
                const quotaInfo = await getUserQuotaInfo(user.id, userDoc);
                totalQuotaBytes = quotaInfo.totalQuotaBytes;

                if (quotaInfo.usedBytes + processedBuffer.length > totalQuotaBytes) {
                    logUploadFailure("user quota exceeded", context);
                    res.status(403).json({ error: "Upload quota exceeded" });
                    return;
                }
            }

            const gcsName = await saveUploadToGcs({
                buffer: processedBuffer,
                richPodId: normalizedRichPodId,
                extension,
                contentType: detectedType.mime,
            });

            const originalFilename = file.originalname?.trim();
            const validatedFilename =
                originalFilename && isValidFilename(originalFilename)
                    ? originalFilename
                    : undefined;

            const uploadId = await createUploadRecord({
                userId: user.id,
                richPodId: normalizedRichPodId,
                type: UploadType.IMAGE,
                mimeType: detectedType.mime,
                extension,
                byteSize: processedBuffer.length,
                width,
                height,
                gcsName,
                originalFilename: validatedFilename,
            });

            if (!isPrivileged && totalQuotaBytes !== undefined) {
                updateQuotaCache(user.id, processedBuffer.length, totalQuotaBytes);
            }

            logUploadSuccess(uploadId, context);

            res.status(201).json({
                id: uploadId,
                richPodId: normalizedRichPodId,
                type: UploadType.IMAGE,
                mimeType: detectedType.mime,
                byteSize: processedBuffer.length,
                width,
                height,
                downloadUrl: `/api/v1/upload/${uploadId}`,
            });
            return;
        } catch (error) {
            if (error instanceof ValidationError) {
                logUploadFailure("validation error", context);
                res.status(400).json({ error: error.message, details: error.details });
                return;
            }
            console.error("Unexpected upload error", error);
            logUploadFailure("unexpected error", context);
            res.status(500).json({ error: "Failed to upload file" });
            return;
        }
    },
);

/**
 * GET /api/v1/upload/:uploadId
 * Resolve an upload ID to its public GCS URL. No authentication required —
 * uploaded images must be servable in published RichPods without auth.
 */
uploadRouter.get("/:uploadId", async (req: Request, res: Response) => {
    const context: UploadContext = {
        ip: req.ip ?? "unknown",
        userId: undefined,
        richPodId: undefined,
    };

    try {
        const uploadId = req.params.uploadId;
        if (!uploadId || Array.isArray(uploadId)) {
            logUploadFailure("missing upload id", context);
            res.status(400).json({ error: "uploadId is required" });
            return;
        }

        const uploadRecord = await getUploadRecord(uploadId);
        if (!uploadRecord) {
            logUploadFailure("upload not found", context);
            res.status(404).json({ error: "Upload not found" });
            return;
        }

        const publicUrl = getPublicUrlForGcsObject(uploadRecord.gcsName);
        res.redirect(303, publicUrl);
        return;
    } catch (error) {
        console.error("Failed to resolve upload", error);
        logUploadFailure("unexpected error", context);
        res.status(500).json({ error: "Failed to resolve upload" });
        return;
    }
});

uploadRouter.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof MulterError) {
        const context: UploadContext = { ip: req.ip ?? "unknown" };
        const message = err.code === "LIMIT_FILE_SIZE" ? "File exceeds maximum size" : "Invalid upload";
        logUploadFailure(`multer error: ${err.code}`, context);
        const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        res.status(status).json({ error: message });
        return;
    }

    if (err) {
        const error = err instanceof Error ? err : new Error("Unknown upload error");
        console.error("Upload middleware error", error);
        res.status(500).json({ error: "Upload failed" });
        return;
    }

    next();
});
