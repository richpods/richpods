import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";
import { hostingConfig } from "../config/hosting.js";
import { GCS_IMMUTABLE_CACHE_CONTROL } from "../config/storage.js";

const storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

const SIGNED_UPLOAD_MULTIPART_OVERHEAD_BYTES = 16 * 1024;

if (!hostingConfig.bucketName) {
    console.error(
        "GCS_HOSTED_BUCKET_NAME is not set. Hosted podcast features will not work.",
    );
}

function getBucket() {
    if (!hostingConfig.bucketName) {
        throw new Error("GCS_HOSTED_BUCKET_NAME environment variable is required");
    }
    return storage.bucket(hostingConfig.bucketName);
}

export async function savePodcastCover(
    podcastId: string,
    buffer: Buffer,
    extension: string,
    contentType: string,
): Promise<string> {
    const safeExt = extension.startsWith(".") ? extension.slice(1) : extension;
    const fileName = `${uuidv4()}.${safeExt}`;
    const gcsName = `${podcastId}/channel/${fileName}`;
    const bucket = getBucket();
    const file = bucket.file(gcsName);

    await file.save(buffer, {
        resumable: false,
        metadata: {
            contentType,
            cacheControl: GCS_IMMUTABLE_CACHE_CONTROL,
        },
    });

    return gcsName;
}

export function generateEpisodeAudioName(
    podcastId: string,
    episodeId: string,
): string {
    const fileName = `${uuidv4()}.mp3`;
    return `${podcastId}/${episodeId}/${fileName}`;
}

export type SignedUploadPolicy = {
    url: string;
    fields: Record<string, string>;
};

/**
 * GCS evaluates content-length-range against the full multipart/form-data
 * request body. Leave room for the signed policy fields, MIME headers, and
 * multipart boundaries so uploads close to the advertised MP3 limit still pass.
 */
export function getSignedUploadMaxRequestBytes(maxFileBytes: number): number {
    return maxFileBytes + SIGNED_UPLOAD_MULTIPART_OVERHEAD_BYTES;
}

/**
 * Creates a signed POST policy for direct browser uploads to GCS.
 * The policy enforces content-length-range and content type at the GCS level.
 * The maximum must include multipart/form-data overhead because GCS validates
 * the full POST body length rather than the MP3 bytes alone.
 */
export async function createSignedUploadPolicy(
    gcsName: string,
    contentType: string,
    minBytes: number,
    maxBytes: number,
    expiresInMinutes: number,
): Promise<SignedUploadPolicy> {
    const bucket = getBucket();
    const file = bucket.file(gcsName);
    const maxRequestBytes = getSignedUploadMaxRequestBytes(maxBytes);

    const [policy] = await file.generateSignedPostPolicyV4({
        expires: Date.now() + expiresInMinutes * 60 * 1000,
        conditions: [
            ["content-length-range", minBytes, maxRequestBytes],
            ["eq", "$Content-Type", contentType],
        ],
        fields: {
            "Content-Type": contentType,
            "Cache-Control": GCS_IMMUTABLE_CACHE_CONTROL,
            "success_action_status": "204",
        },
    });

    return { url: policy.url, fields: policy.fields };
}

/**
 * Signs a throwaway POST policy at boot so IAM misconfiguration surfaces
 * before the first user upload. If the service account lacks the
 * iam.serviceAccounts.signBlob permission, this rejects and the caller
 * should crash the process so Cloud Run keeps traffic on the old revision.
 */
export async function verifySigningCapability(): Promise<void> {
    const bucket = getBucket();
    await bucket.file("__healthcheck__").generateSignedPostPolicyV4({
        expires: Date.now() + 60_000,
        conditions: [["content-length-range", 0, 1]],
    });
}

export type GcsObjectInfo = {
    size: number;
    contentType: string;
    md5Hash: string;
};

/**
 * Reads metadata from an existing GCS object. Returns null if the object
 * does not exist, allowing the caller to distinguish "missing" from "error".
 */
export async function getGcsObjectInfo(gcsName: string): Promise<GcsObjectInfo | null> {
    const bucket = getBucket();
    const file = bucket.file(gcsName);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [metadata] = await file.getMetadata();
    return {
        size:
            typeof metadata.size === "string"
                ? Number.parseInt(metadata.size, 10)
                : Number(metadata.size),
        contentType: (metadata.contentType as string) || "",
        md5Hash: (metadata.md5Hash as string) || "",
    };
}

export async function saveEpisodeCover(
    podcastId: string,
    episodeId: string,
    buffer: Buffer,
    extension: string,
    contentType: string,
): Promise<string> {
    const safeExt = extension.startsWith(".") ? extension.slice(1) : extension;
    const fileName = `${uuidv4()}.${safeExt}`;
    const gcsName = `${podcastId}/${episodeId}/${fileName}`;
    const bucket = getBucket();
    const file = bucket.file(gcsName);

    await file.save(buffer, {
        resumable: false,
        metadata: {
            contentType,
            cacheControl: GCS_IMMUTABLE_CACHE_CONTROL,
        },
    });

    return gcsName;
}

/**
 * Deletes a single GCS object. Used to clean up uploads that fail validation
 * in /complete (oversized, wrong content type) so rejected files don't persist.
 */
export async function deleteGcsObject(gcsName: string): Promise<void> {
    try {
        const bucket = getBucket();
        await bucket.file(gcsName).delete();
        console.info(`Deleted GCS object: ${gcsName}`);
    } catch (error) {
        console.error(`Failed to delete GCS object ${gcsName}:`, error);
    }
}

export async function deleteEpisodeFiles(
    podcastId: string,
    episodeId: string,
): Promise<void> {
    try {
        const bucket = getBucket();
        const prefix = `${podcastId}/${episodeId}/`;
        await bucket.deleteFiles({ prefix });
        console.info(
            `Deleted hosted episode files: prefix=${prefix}`,
        );
    } catch (error) {
        console.error(`Error deleting hosted episode files for ${podcastId}/${episodeId}:`, error);
    }
}

export async function deletePodcastChannelFiles(podcastId: string): Promise<void> {
    try {
        const bucket = getBucket();
        const prefix = `${podcastId}/channel/`;
        await bucket.deleteFiles({ prefix });
        console.info(
            `Deleted hosted podcast channel files: prefix=${prefix}`,
        );
    } catch (error) {
        console.error(`Error deleting hosted podcast channel files for ${podcastId}:`, error);
    }
}

export function getHostedPublicUrl(gcsName: string): string {
    const encodedPath = gcsName
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
    return `https://storage.googleapis.com/${hostingConfig.bucketName}/${encodedPath}`;
}
