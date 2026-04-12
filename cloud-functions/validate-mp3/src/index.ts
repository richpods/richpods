import { cloudEvent, type CloudEvent } from "@google-cloud/functions-framework";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import { Storage } from "@google-cloud/storage";
import { parseBuffer } from "music-metadata";

const HOSTED_EPISODES_COLLECTION = "hosted_episodes";
const AUDIO_VALIDATIONS_COLLECTION = "audio_validations";
const ONE_MEGABYTE = 1024 * 1024;

function parseIntEnv(key: string, defaultValue: number): number {
    const raw = process.env[key]?.trim();
    if (!raw) return defaultValue;
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
}

const ONE_KILOBYTE = 1024;

const config = {
    minFileSizeBytes: 350 * ONE_KILOBYTE,
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

type StorageDeleteError = Error & {
    code?: number;
};

type FirestoreError = Error & {
    code?: number;
};

const INVALID_AUDIO_PARSE_ERROR_NAMES = new Set([
    "CouldNotDetermineFileTypeError",
    "UnsupportedFileTypeError",
    "UnexpectedFileContentError",
    "FieldDecodingError",
    "EndOfStreamError",
]);

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

/**
 * Extract the episodeId from a GCS object path.
 * Expected format: {podcastId}/{episodeId}/{uuid}.mp3
 */
function extractEpisodeId(objectName: string): string | null {
    const segments = objectName.split("/");
    if (segments.length < 3) {
        return null;
    }
    return segments[1];
}

async function deleteInvalidObject(bucketName: string, objectName: string): Promise<void> {
    try {
        await storage.bucket(bucketName).file(objectName).delete();
        console.info(`Deleted invalid GCS object: ${objectName}`);
    } catch (error) {
        const deleteError = error as StorageDeleteError;
        if (deleteError.code === 404) {
            console.info(`Invalid GCS object already deleted: ${objectName}`);
            return;
        }
        throw error;
    }
}

function isMissingStorageObjectError(error: unknown): error is StorageDeleteError {
    return error instanceof Error && (error as StorageDeleteError).code === 404;
}

function isInvalidAudioParseError(error: unknown): error is Error {
    return error instanceof Error && INVALID_AUDIO_PARSE_ERROR_NAMES.has(error.name);
}

/**
 * Write the validation result to the audio_validations collection.
 * This is the primary output — the browser polls this document.
 */
async function writeValidationResult(
    episodeId: string,
    gcsAudioName: string,
    status: "valid" | "invalid",
    error: string | null,
    metadata: AudioMetadataFields,
): Promise<void> {
    await db.collection(AUDIO_VALIDATIONS_COLLECTION).doc(episodeId).set({
        gcsAudioName,
        status,
        error,
        audioDurationSeconds: metadata.audioDurationSeconds,
        audioBitrate: metadata.audioBitrate,
        audioSampleRate: metadata.audioSampleRate,
        audioChannels: metadata.audioChannels,
        createdAt: FieldValue.serverTimestamp(),
    });
    console.info(`Wrote validation result for episode ${episodeId}: ${status}`);
}

/**
 * Opportunistically update the hosted episode document with validation results.
 * If the document does not exist yet (or has been deleted), silently continue —
 * the browser reads validation status from the audio_validations collection.
 */
async function tryUpdateEpisodeDoc(
    episodeId: string,
    status: "valid" | "invalid",
    error: string | null,
    metadata: AudioMetadataFields,
    actualByteSize: number,
): Promise<void> {
    try {
        const episodeRef = db.collection(HOSTED_EPISODES_COLLECTION).doc(episodeId);
        const episodeDoc = await episodeRef.get();
        if (!episodeDoc.exists) {
            console.info(`Episode ${episodeId} not found in Firestore, skipping episode update`);
            return;
        }

        const updateData: Record<string, unknown> = {
            validationStatus: status,
            validationError: error,
            audioDurationSeconds: metadata.audioDurationSeconds,
            audioBitrate: metadata.audioBitrate,
            audioSampleRate: metadata.audioSampleRate,
            audioChannels: metadata.audioChannels,
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (status === "valid") {
            updateData.audioByteSize = actualByteSize;
        }

        await episodeRef.update(updateData);
        console.info(`Updated episode ${episodeId} doc: ${status}`);
    } catch (error) {
        const fsError = error as FirestoreError;
        // NOT_FOUND (5) is expected if the document was deleted between check and update
        if (fsError.code === 5) {
            console.info(`Episode ${episodeId} vanished before update, skipping`);
            return;
        }
        console.warn(`Failed to update episode ${episodeId} doc (non-critical):`, error);
    }
}

async function recordInvalidUpload(
    episodeId: string,
    bucketName: string,
    objectName: string,
    error: string,
    metadata: AudioMetadataFields,
): Promise<void> {
    await writeValidationResult(episodeId, objectName, "invalid", error, metadata);
    await tryUpdateEpisodeDoc(episodeId, "invalid", error, metadata, 0);
    await deleteInvalidObject(bucketName, objectName);
}

cloudEvent<StorageObjectData>("validateMp3", async (event: CloudEvent<StorageObjectData>) => {
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

    const episodeId = extractEpisodeId(objectName);
    if (!episodeId) {
        console.warn(`Cannot extract episodeId from path: ${objectName}`);
        return;
    }

    console.info(`Processing MP3 file: ${objectName} (episode ${episodeId})`);

    const emptyMetadata: AudioMetadataFields = {
        audioDurationSeconds: null,
        audioBitrate: null,
        audioSampleRate: null,
        audioChannels: null,
    };

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
            const error = `Object content type ${metadataContentType} is not an MP3 type`;
            await recordInvalidUpload(episodeId, bucketName, objectName, error, emptyMetadata);
            return;
        }

        if (metadataSizeBytes !== null && metadataSizeBytes < config.minFileSizeBytes) {
            const fileSizeKB = Math.round(metadataSizeBytes / ONE_KILOBYTE);
            const minSizeKB = Math.round(config.minFileSizeBytes / ONE_KILOBYTE);
            const error = `File size ${fileSizeKB} KB is below minimum ${minSizeKB} KB`;
            await recordInvalidUpload(episodeId, bucketName, objectName, error, emptyMetadata);
            return;
        }

        if (metadataSizeBytes !== null && metadataSizeBytes > config.maxFileSizeBytes) {
            const fileSizeMB = Math.round(metadataSizeBytes / ONE_MEGABYTE);
            const maxSizeMB = Math.round(config.maxFileSizeBytes / ONE_MEGABYTE);
            const error = `File size ${fileSizeMB} MB exceeds maximum ${maxSizeMB} MB`;
            await recordInvalidUpload(episodeId, bucketName, objectName, error, emptyMetadata);
            return;
        }

        // Download the file only after metadata-based checks pass.
        const [buffer] = await file.download();

        // Check file size
        if (buffer.length < config.minFileSizeBytes) {
            const fileSizeKB = Math.round(buffer.length / ONE_KILOBYTE);
            const minSizeKB = Math.round(config.minFileSizeBytes / ONE_KILOBYTE);
            const error = `File size ${fileSizeKB} KB is below minimum ${minSizeKB} KB`;
            await recordInvalidUpload(episodeId, bucketName, objectName, error, emptyMetadata);
            return;
        }

        if (buffer.length > config.maxFileSizeBytes) {
            const fileSizeMB = Math.round(buffer.length / ONE_MEGABYTE);
            const maxSizeMB = Math.round(config.maxFileSizeBytes / ONE_MEGABYTE);
            const error = `File size ${fileSizeMB} MB exceeds maximum ${maxSizeMB} MB`;
            await recordInvalidUpload(episodeId, bucketName, objectName, error, emptyMetadata);
            return;
        }

        let metadata: Awaited<ReturnType<typeof parseBuffer>>;
        try {
            metadata = await parseBuffer(buffer, { mimeType: "audio/mpeg" });
        } catch (error) {
            if (!isInvalidAudioParseError(error)) {
                throw error;
            }

            await recordInvalidUpload(
                episodeId,
                bucketName,
                objectName,
                `Validation failed: ${error.message}`,
                emptyMetadata,
            );
            return;
        }

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
                const error = `Duration ${Math.round(durationSeconds / 60)} minutes exceeds maximum ${config.maxDurationMinutes} minutes`;
                await recordInvalidUpload(episodeId, bucketName, objectName, error, audioFields);
                return;
            }
        }

        // Validate bitrate
        if (bitrateKbps !== null && bitrateKbps > config.maxBitrateKbps) {
            const error = `Bitrate ${bitrateKbps} kbps exceeds maximum ${config.maxBitrateKbps} kbps`;
            await recordInvalidUpload(episodeId, bucketName, objectName, error, audioFields);
            return;
        }

        // All checks passed
        await writeValidationResult(episodeId, objectName, "valid", null, audioFields);
        await tryUpdateEpisodeDoc(episodeId, "valid", null, audioFields, buffer.length);

        console.info(
            `MP3 validation passed for episode ${episodeId}: ` +
                `duration=${durationSeconds}s, bitrate=${bitrateKbps}kbps, ` +
                `sampleRate=${sampleRate}Hz, channels=${channels}`,
        );
    } catch (error) {
        if (isMissingStorageObjectError(error)) {
            console.info(`Skipping validation because GCS object no longer exists: ${objectName}`);
            return;
        }

        console.error(`Unexpected MP3 validation error for episode ${episodeId}:`, error);
        throw error;
    }
});
