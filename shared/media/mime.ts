export const MimeCategory = {
    HTML: "html",
    IMAGE: "image",
    VIDEO: "video",
    AUDIO: "audio",
    PDF: "pdf",
    ARCHIVE: "archive",
    DOCUMENT: "document",
    OTHER: "other",
} as const;

export type MimeCategoryValue = (typeof MimeCategory)[keyof typeof MimeCategory];

const HTML_MIME_TYPES: ReadonlySet<string> = new Set([
    "text/html",
    "application/xhtml+xml",
]);

const PDF_MIME_TYPES: ReadonlySet<string> = new Set(["application/pdf"]);

const ARCHIVE_MIME_TYPES: ReadonlySet<string> = new Set([
    "application/zip",
    "application/x-zip-compressed",
    "application/x-tar",
    "application/gzip",
    "application/x-gzip",
    "application/x-bzip2",
    "application/x-7z-compressed",
    "application/x-rar-compressed",
    "application/vnd.rar",
]);

const DOCUMENT_MIME_TYPES: ReadonlySet<string> = new Set([
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.presentation",
    "application/rtf",
    "application/json",
    "application/xml",
    "text/xml",
    "text/plain",
    "text/markdown",
    "text/csv",
]);

export function normalizeMimeType(mime: string | null | undefined): string | null {
    if (!mime) {
        return null;
    }
    const trimmed = mime.trim().toLowerCase();
    if (!trimmed) {
        return null;
    }
    const semi = trimmed.indexOf(";");
    const bare = (semi >= 0 ? trimmed.slice(0, semi) : trimmed).trim();
    return bare || null;
}

export function classifyMimeType(mime: string | null | undefined): MimeCategoryValue {
    const normalized = normalizeMimeType(mime);
    if (!normalized) {
        return MimeCategory.OTHER;
    }
    if (HTML_MIME_TYPES.has(normalized)) {
        return MimeCategory.HTML;
    }
    if (PDF_MIME_TYPES.has(normalized)) {
        return MimeCategory.PDF;
    }
    if (ARCHIVE_MIME_TYPES.has(normalized)) {
        return MimeCategory.ARCHIVE;
    }
    if (DOCUMENT_MIME_TYPES.has(normalized)) {
        return MimeCategory.DOCUMENT;
    }
    if (normalized.startsWith("image/")) {
        return MimeCategory.IMAGE;
    }
    if (normalized.startsWith("video/")) {
        return MimeCategory.VIDEO;
    }
    if (normalized.startsWith("audio/")) {
        return MimeCategory.AUDIO;
    }
    if (normalized.startsWith("text/")) {
        return MimeCategory.DOCUMENT;
    }
    return MimeCategory.OTHER;
}

export function isHtmlMimeType(mime: string | null | undefined): boolean {
    return classifyMimeType(mime) === MimeCategory.HTML;
}

/**
 * Shared map of image MIME types accepted for in-player display (link card
 * OG images and user-uploaded images). The value is the canonical file
 * extension stored in Cloud Storage.
 */
export const allowedImageMimeTypes: Readonly<Record<string, string>> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
};

/**
 * Image MIME types accepted for hosted podcast / episode cover uploads. A
 * stricter subset than `allowedImageMimeTypes` because the Apple Podcasts
 * hosting spec only permits JPEG and PNG.
 */
export const allowedCoverMimeTypes: Readonly<Record<string, string>> = {
    "image/jpeg": "jpg",
    "image/png": "png",
};

export function isAllowedImageMimeType(mime: string | null | undefined): boolean {
    const normalized = normalizeMimeType(mime);
    return normalized !== null && normalized in allowedImageMimeTypes;
}

export function isAllowedCoverMimeType(mime: string | null | undefined): boolean {
    const normalized = normalizeMimeType(mime);
    return normalized !== null && normalized in allowedCoverMimeTypes;
}
