import { Storage } from "@google-cloud/storage";
import { FieldValue } from "@google-cloud/firestore";
import { v4 as uuidv4 } from "uuid";

import {
    db,
    USERS_COLLECTION,
    RICHPODS_COLLECTION,
    UPLOADS_COLLECTION,
} from "../config/firestore.js";
import { uploadConfig } from "../config/uploads.js";
import { GCS_IMMUTABLE_CACHE_CONTROL } from "../config/storage.js";
import type { UploadDocument, UploadTypeValue } from "../types/firestore.js";

const storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

if (!uploadConfig.bucketName) {
    throw new Error("GCS_UPLOAD_BUCKET_NAME environment variable is required");
}

const uploadsBucket = storage.bucket(uploadConfig.bucketName);

type SaveUploadParams = {
    buffer: Buffer;
    richPodId: string;
    extension: string;
    contentType: string;
};

export async function saveUploadToGcs({
    buffer,
    richPodId,
    extension,
    contentType,
}: SaveUploadParams): Promise<string> {
    const normalizedExtension = extension.startsWith(".") ? extension.slice(1) : extension;
    const safeExtension = normalizedExtension.toLowerCase();
    const fileName = `${uuidv4()}.${safeExtension}`;
    const gcsName = `${richPodId}/${fileName}`;

    const file = uploadsBucket.file(gcsName);

    await file.save(buffer, {
        resumable: false,
        metadata: {
            contentType,
            cacheControl: GCS_IMMUTABLE_CACHE_CONTROL,
        },
    });

    return gcsName;
}

type CreateUploadRecordParams = {
    userId: string;
    richPodId: string;
    type: UploadTypeValue;
    mimeType: string;
    extension: string;
    byteSize: number;
    width: number;
    height: number;
    gcsName: string;
    originalFilename?: string;
};

export async function createUploadRecord({
    userId,
    richPodId,
    type,
    mimeType,
    extension,
    byteSize,
    width,
    height,
    gcsName,
    originalFilename,
}: CreateUploadRecordParams): Promise<string> {
    const data: Record<string, unknown> = {
        user: db.collection(USERS_COLLECTION).doc(userId),
        richPod: db.collection(RICHPODS_COLLECTION).doc(richPodId),
        type,
        mimeType,
        extension,
        byteSize,
        width,
        height,
        gcsName,
        createdAt: FieldValue.serverTimestamp(),
    };

    if (originalFilename) {
        data.originalFilename = originalFilename;
    }

    const docRef = await db.collection(UPLOADS_COLLECTION).add(data);
    return docRef.id;
}

export async function getUploadRecord(uploadId: string): Promise<UploadDocument | null> {
    const docRef = db.collection(UPLOADS_COLLECTION).doc(uploadId);
    const doc = await docRef.get();

    if (!doc.exists) {
        return null;
    }

    return doc.data() as UploadDocument;
}

export function getPublicUrlForGcsObject(gcsName: string): string {
    const encodedPath = gcsName
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
    return `https://storage.googleapis.com/${uploadConfig.bucketName}/${encodedPath}`;
}
