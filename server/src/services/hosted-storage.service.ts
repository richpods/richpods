import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";
import { hostingConfig } from "../config/hosting.js";
import { GCS_IMMUTABLE_CACHE_CONTROL } from "../config/storage.js";

const storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

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

export async function saveEpisodeAudio(
    gcsName: string,
    buffer: Buffer,
): Promise<{ md5Hash: string }> {
    const bucket = getBucket();
    const file = bucket.file(gcsName);

    await file.save(buffer, {
        resumable: false,
        metadata: {
            contentType: "audio/mpeg",
            cacheControl: GCS_IMMUTABLE_CACHE_CONTROL,
        },
    });

    const [metadata] = await file.getMetadata();
    return { md5Hash: metadata.md5Hash as string };
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
