import { cloudEvent } from "@google-cloud/functions-framework";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import { Storage } from "@google-cloud/storage";
import { parseBuffer } from "music-metadata";

const HOSTED_EPISODES_COLLECTION = "hosted_episodes";
const ONE_MEGABYTE = 1024 * 1024;

function parseIntEnv(key: string, defaultValue: number): number {
    const raw = process.env[key]?.trim();
    if (!raw) return defaultValue;
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
}

const config = {
    maxFileSizeBytes: parseIntEnv("HOSTED_MP3_MAX_FILE_SIZE_BYTES", 50 * ONE_MEGABYTE),
    maxDurationMinutes: parseIntEnv("HOSTED_MP3_MAX_DURATION_MINUTES", 150),
    maxBitrateKbps: parseIntEnv("HOSTED_MP3_MAX_BITRATE_KBPS", 256),
};

const db = new Firestore({
    databaseId: process.env.FIRESTORE_DATABASE_ID || "(default)",
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

const storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

type StorageObjectData = {
    bucket: string;
    name: string;
    size: string;
    contentType: string;
};

type AudioMetadataFields = {
    audioDurationSeconds: number | null;
    audioBitrate: number | null;
    audioSampleRate: number | null;
    audioChannels: number | null;
};

function parseByteSize(raw: string | number | undefined): number | null {
    if (raw === undefined) {
        return null;
    }

    const parsed = typeof raw === "number" ? raw : Number.parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
        return null;
    }

    return parsed;
}

async function markValid(episodeId: string, metadata: AudioMetadataFields): Promise<void> {
    await db.collection(HOSTED_EPISODES_COLLECTION).doc(episodeId).update({
        validationStatus: "valid",
        validationError: null,
        audioDurationSeconds: metadata.audioDurationSeconds,
        audioBitrate: metadata.audioBitrate,
        audioSampleRate: metadata.audioSampleRate,
        audioChannels: metadata.audioChannels,
        updatedAt: FieldValue.serverTimestamp(),
    });
    console.info(`Marked episode ${episodeId} as valid`);
}

async function markInvalid(
    episodeId: string,
    error: string,
    metadata?: AudioMetadataFields,
): Promise<void> {
    const update: Record<string, unknown> = {
        validationStatus: "invalid",
        validationError: error,
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (metadata) {
        update.audioDurationSeconds = metadata.audioDurationSeconds;
        update.audioBitrate = metadata.audioBitrate;
        update.audioSampleRate = metadata.audioSampleRate;
        update.audioChannels = metadata.audioChannels;
    }

    await db.collection(HOSTED_EPISODES_COLLECTION).doc(episodeId).update(update);
    console.info(`Marked episode ${episodeId} as invalid: ${error}`);
}

cloudEvent<StorageObjectData>("validateMp3", async (event) => {
    const data = event.data;
    if (!data) {
        console.info("No event data, skipping");
        return;
    }

    const objectName = data.name;
    const bucketName = data.bucket;

    // Only process .mp3 files
    if (!objectName.endsWith(".mp3")) {
        console.info(`Skipping non-MP3 file: ${objectName}`);
        return;
    }

    // Skip channel files (podcast covers)
    if (objectName.includes("/channel/")) {
        console.info(`Skipping channel file: ${objectName}`);
        return;
    }

    console.info(`Processing MP3 file: ${objectName} in bucket ${bucketName}`);

    // Find the hosted episode document by gcsAudioName
    const snapshot = await db
        .collection(HOSTED_EPISODES_COLLECTION)
        .where("gcsAudioName", "==", objectName)
        .limit(1)
        .get();

    if (snapshot.empty) {
        console.warn(`No hosted episode found for gcsAudioName: ${objectName}`);
        return;
    }

    const episodeDoc = snapshot.docs[0];
    const episodeId = episodeDoc.id;
    console.info(`Found hosted episode: ${episodeId}`);

    try {
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(objectName);

        // Validate object metadata from GCS before downloading file bytes.
        const [gcsMetadata] = await file.getMetadata();
        const metadataContentType = (
            gcsMetadata.contentType ??
            data.contentType ??
            ""
        ).toLowerCase();
        const metadataSizeBytes = parseByteSize(gcsMetadata.size) ?? parseByteSize(data.size);

        if (
            metadataContentType &&
            metadataContentType !== "audio/mpeg" &&
            metadataContentType !== "audio/mp3"
        ) {
            await markInvalid(
                episodeId,
                `Object content type ${metadataContentType} is not an MP3 type`,
            );
            return;
        }

        if (metadataSizeBytes !== null && metadataSizeBytes > config.maxFileSizeBytes) {
            const fileSizeMB = Math.round(metadataSizeBytes / ONE_MEGABYTE);
            const maxSizeMB = Math.round(config.maxFileSizeBytes / ONE_MEGABYTE);
            await markInvalid(
                episodeId,
                `File size ${fileSizeMB} MB exceeds maximum ${maxSizeMB} MB`,
            );
            return;
        }

        // Download the file only after metadata-based checks pass.
        const [buffer] = await file.download();

        // Check file size
        if (buffer.length > config.maxFileSizeBytes) {
            const fileSizeMB = Math.round(buffer.length / ONE_MEGABYTE);
            const maxSizeMB = Math.round(config.maxFileSizeBytes / ONE_MEGABYTE);
            await markInvalid(
                episodeId,
                `File size ${fileSizeMB} MB exceeds maximum ${maxSizeMB} MB`,
            );
            return;
        }

        // Parse MP3 metadata
        const metadata = await parseBuffer(buffer, { mimeType: "audio/mpeg" });

        const durationSeconds = metadata.format.duration ?? null;
        const bitrateBps = metadata.format.bitrate ?? null;
        const sampleRate = metadata.format.sampleRate ?? null;
        const channels = metadata.format.numberOfChannels ?? null;
        const bitrateKbps = bitrateBps !== null ? Math.round(bitrateBps / 1000) : null;

        const audioFields: AudioMetadataFields = {
            audioDurationSeconds: durationSeconds !== null ? Math.round(durationSeconds) : null,
            audioBitrate: bitrateKbps,
            audioSampleRate: sampleRate,
            audioChannels: channels,
        };

        // Validate duration
        if (durationSeconds !== null) {
            const maxDurationSeconds = config.maxDurationMinutes * 60;
            if (durationSeconds > maxDurationSeconds) {
                await markInvalid(
                    episodeId,
                    `Duration ${Math.round(durationSeconds / 60)} minutes exceeds maximum ${config.maxDurationMinutes} minutes`,
                    audioFields,
                );
                return;
            }
        }

        // Validate bitrate
        if (bitrateKbps !== null && bitrateKbps > config.maxBitrateKbps) {
            await markInvalid(
                episodeId,
                `Bitrate ${bitrateKbps} kbps exceeds maximum ${config.maxBitrateKbps} kbps`,
                audioFields,
            );
            return;
        }

        // All checks passed
        await markValid(episodeId, audioFields);

        console.info(
            `MP3 validation passed for episode ${episodeId}: ` +
                `duration=${durationSeconds}s, bitrate=${bitrateKbps}kbps, ` +
                `sampleRate=${sampleRate}Hz, channels=${channels}`,
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown validation error";
        console.error(`MP3 validation error for episode ${episodeId}:`, error);
        await markInvalid(episodeId, `Validation failed: ${message}`);
    }
});
