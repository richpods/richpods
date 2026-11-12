import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import { allowedImageMimeTypes } from "@richpods/shared/media/mime";

export const OG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const OG_IMAGE_MAX_PIXELS = 10_000_000;
export const OG_IMAGE_MIN_WIDTH = 460;
export const OG_IMAGE_MIN_HEIGHT = 300;

export type ProcessedOgImage = {
    buffer: Buffer;
    mimeType: string;
    extension: string;
    width: number;
    height: number;
};

export type ProcessOgImageResult =
    | ({ ok: true } & ProcessedOgImage)
    | { ok: false; reason: string };

function reject(reason: string): ProcessOgImageResult {
    return { ok: false, reason };
}

/**
 * Validates and re-encodes a downloaded og:image. Rejects with sharp's error when the image
 * is corrupt or declares more than OG_IMAGE_MAX_PIXELS pixels.
 */
export async function processOgImage(input: Buffer): Promise<ProcessOgImageResult> {
    const detectedType = await fileTypeFromBuffer(input);
    if (!detectedType || !(detectedType.mime in allowedImageMimeTypes)) {
        return reject(`unsupported type: ${detectedType?.mime ?? "unknown"}`);
    }

    const image = sharp(input, { failOn: "truncated", limitInputPixels: OG_IMAGE_MAX_PIXELS });
    const { width, height } = await image.metadata();

    if (!width || !height) {
        return reject("could not read dimensions");
    }

    if (width < OG_IMAGE_MIN_WIDTH || height < OG_IMAGE_MIN_HEIGHT) {
        return reject(
            `too small: ${width}x${height} (min: ${OG_IMAGE_MIN_WIDTH}x${OG_IMAGE_MIN_HEIGHT})`,
        );
    }

    const aspectRatio = width / height;
    if (aspectRatio < 0.25 || aspectRatio > 4) {
        return reject(
            `aspect ratio out of range: ${width}x${height} (${aspectRatio.toFixed(2)}, allowed: 1:4 to 4:1)`,
        );
    }

    const encoders: Record<string, () => Promise<Buffer>> = {
        "image/png": () => image.png({ compressionLevel: 9 }).toBuffer(),
        "image/jpeg": () => image.jpeg({ quality: 85, mozjpeg: true }).toBuffer(),
        "image/webp": () => image.webp({ quality: 85 }).toBuffer(),
    };
    const encode = encoders[detectedType.mime];
    if (!encode) {
        return reject(`unsupported type: ${detectedType.mime}`);
    }

    const buffer = await encode();
    if (buffer.length > OG_IMAGE_MAX_BYTES) {
        return reject(`processed too large: ${buffer.length} bytes`);
    }

    return {
        ok: true,
        buffer,
        mimeType: detectedType.mime,
        extension: allowedImageMimeTypes[detectedType.mime],
        width,
        height,
    };
}
