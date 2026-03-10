import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";
import type { Enclosure, EnclosureTypeValue } from "../types/firestore.js";
import { GCS_IMMUTABLE_CACHE_CONTROL } from "../config/storage.js";

const storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

const BUCKET_NAME = process.env.GCS_BUCKET_NAME ?? "";
if (BUCKET_NAME.length <= 2) {
    throw new Error("GCS_BUCKET_NAME environment variable is required");
}

/**
 * Generate a GCS name with the pattern:
 * /${richpod-id}/${timestamp}-${enclosure-typename}-${random-uuid}.json
 */
export function generateGcsName(richPodId: string, enclosureType: EnclosureTypeValue): string {
    if (richPodId.length < 3) {
        throw new Error("Invalid richPodId for GCS provided! Must be at least 3 characters long.");
    }

    const timestamp = new Date().toISOString().replace(/\D/g, "");
    const typeName = enclosureType.toLowerCase();
    const randomUuid = uuidv4();
    return `${richPodId}/${timestamp}-${typeName}-${randomUuid}.json`;
}

/**
 * Upload enclosure data to GCS
 */
export async function uploadEnclosure(
    richPodId: string,
    enclosureType: EnclosureTypeValue,
    data: Enclosure,
): Promise<string> {
    const gcsName = generateGcsName(richPodId, enclosureType);
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(gcsName);

    const jsonData = JSON.stringify(data);

    await file.save(jsonData, {
        metadata: {
            contentType: "application/json",
            cacheControl: GCS_IMMUTABLE_CACHE_CONTROL,
            metadata: {
                richPodId,
                enclosureType,
            },
        },
    });

    return gcsName;
}

/**
 * Get enclosure data from GCS
 */
export async function getEnclosure(gcsName: string): Promise<Enclosure | null> {
    try {
        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(gcsName);

        const [exists] = await file.exists();
        if (!exists) {
            console.error(`Error, loading non-existing enclosure: ${gcsName}`);
            return null;
        }

        const [data] = await file.download();
        return JSON.parse(data.toString("utf-8")) as Enclosure;
    } catch (error) {
        console.error(`Error fetching enclosure ${gcsName}:`, error);
        return null;
    }
}

/**
 * Delete an enclosure from GCS
 */
export async function deleteEnclosure(gcsName: string): Promise<void> {
    try {
        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(gcsName);
        await file.delete({ ignoreNotFound: true });
        console.log(`Deleted enclosure ${gcsName}`);
    } catch (error) {
        console.error(`Error deleting enclosure ${gcsName}:`, error);
    }
}

/**
 * Delete all enclosures for a RichPod
 */
export async function deleteAllEnclosures(richPodId: string): Promise<void> {
    try {
        const bucket = storage.bucket(BUCKET_NAME);
        const prefix = `${richPodId}/`;

        await bucket.deleteFiles({ prefix });
    } catch (error) {
        console.error(`Error deleting all enclosures for richpod ${richPodId}:`, error);
    }
}
