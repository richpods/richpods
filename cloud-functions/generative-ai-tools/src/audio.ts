import { spawn } from "node:child_process";
import got, { type BeforeRedirectHook } from "got";
import { assertSafePublicUrl } from "@richpods/shared/utils/ssrf";
import { logWarn } from "./log.js";

const REQUEST_TIMEOUT_MS = 15000;
const DOWNLOAD_TIMEOUT_MS = 120000;
const SIZE_PROBE_MAX_BYTES = 1024;

/**
 * SSRF guard: re-validate the resolved target of every redirect so a public URL
 * cannot bounce the request onto an internal / metadata address.
 */
const ssrfSafeRedirect: BeforeRedirectHook = async (options) => {
    if (options.url) {
        await assertSafePublicUrl(options.url.toString());
    }
};

const ssrfHooks = { beforeRedirect: [ssrfSafeRedirect] };

const FFPROBE_TIMEOUT_MS = 60000;

let ffprobeAvailable: boolean | null = null;

/**
 * Run ffprobe with the given args, optionally piping `input` to its stdin, and
 * resolve with stdout on a clean exit or null on any failure (missing binary,
 * non-zero exit, timeout). Never rejects, never touches the filesystem.
 */
function runFfprobe(args: string[], input?: Uint8Array): Promise<string | null> {
    return new Promise((resolve) => {
        const child = spawn("ffprobe", args, {
            stdio: [input ? "pipe" : "ignore", "pipe", "ignore"],
        });

        let stdout = "";
        let settled = false;
        const finish = (value: string | null) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(value);
        };
        const timer = setTimeout(() => {
            child.kill("SIGKILL");
            finish(null);
        }, FFPROBE_TIMEOUT_MS);

        child.on("error", () => finish(null)); // e.g. ENOENT when ffprobe is absent
        child.stdout?.on("data", (chunk: Buffer) => {
            stdout += chunk;
        });
        child.on("close", (code: number | null) => finish(code === 0 ? stdout : null));

        if (input && child.stdin) {
            child.stdin.on("error", () => {}); // ffprobe may close stdin before reading all of it
            child.stdin.end(Buffer.from(input));
        }
    });
}

/** Probe (once, cached per warm instance) whether ffprobe is callable. JSON output. */
async function isFfprobeAvailable(richPodId: string): Promise<boolean> {
    if (ffprobeAvailable !== null) return ffprobeAvailable;
    const stdout = await runFfprobe([
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_program_version",
    ]);
    ffprobeAvailable = stdout !== null && stdout.includes('"program_version"');
    if (!ffprobeAvailable) {
        logWarn(richPodId, "ffprobe unavailable; audio duration cannot be determined");
    }
    return ffprobeAvailable;
}

const DURATION_ARGS = [
    "-v",
    "error",
    "-select_streams",
    "a:0",
    "-print_format",
    "json",
    "-show_entries",
    "format=duration:stream=duration:packet=duration_time",
    "-i",
    "pipe:0",
];

type FfprobeDuration = {
    format?: { duration?: string };
    streams?: Array<{ duration?: string }>;
    packets?: Array<{ duration_time?: string }>;
};

/**
 * Exact audio duration (seconds) via ffprobe, streamed through stdin (no temp
 * files). Container formats expose the duration directly; MP3 over a non-seekable
 * pipe does not, so we sum the per-packet durations ffprobe reports — exact even
 * for headerless VBR, which has no usable header to read. Returns null when
 * ffprobe is unavailable or yields nothing.
 */
export async function probeAudioDuration(
    bytes: Uint8Array,
    richPodId: string,
): Promise<number | null> {
    if (!(await isFfprobeAvailable(richPodId))) return null;

    const stdout = await runFfprobe(DURATION_ARGS, bytes);
    if (stdout === null) return null;

    let probe: FfprobeDuration;
    try {
        probe = JSON.parse(stdout) as FfprobeDuration;
    } catch {
        return null;
    }

    const direct = Number.parseFloat(probe.format?.duration ?? probe.streams?.[0]?.duration ?? "");
    if (Number.isFinite(direct) && direct > 0) return direct;

    let sum = 0;
    for (const packet of probe.packets ?? []) {
        const seconds = Number.parseFloat(packet.duration_time ?? "");
        if (Number.isFinite(seconds)) sum += seconds;
    }
    return sum > 0 ? sum : null;
}

/**
 * Download external audio bytes (after the security checks have passed) so they
 * can be uploaded to the Gemini Files API. A HEAD request determines the
 * Content-Length up front so an oversized file is rejected before any bytes are
 * downloaded into memory.
 */
export async function downloadExternalAudio(
    url: string,
    maxFileSizeBytes: number,
): Promise<Uint8Array> {
    await assertSafePublicUrl(url);

    const head = await got.head(url, {
        timeout: { request: REQUEST_TIMEOUT_MS },
        throwHttpErrors: false,
        followRedirect: true,
        hooks: ssrfHooks,
    });
    const contentLength = Number.parseInt(head.headers["content-length"] ?? "", 10);
    if (!Number.isFinite(contentLength) || contentLength <= 0) {
        throw new Error("Could not determine a valid audio file size");
    }
    if (contentLength > maxFileSizeBytes) {
        throw new Error("The episode audio file is too large for AI chapter generation");
    }

    const response = await got(url, {
        responseType: "buffer",
        timeout: { request: DOWNLOAD_TIMEOUT_MS },
        followRedirect: true,
        hooks: ssrfHooks,
    });
    return response.rawBody;
}

/**
 * Basic, defence-in-depth checks for audio hosted on third-party servers (i.e.
 * external podcast episodes we do not control). We never download the whole
 * file — only a HEAD request plus two tiny range requests.
 */
export async function verifyExternalAudio(
    url: string,
    declaredMimeType: string,
    allowedMimeTypes: string[],
    maxFileSizeBytes: number,
): Promise<{ byteSize: number }> {
    if (!allowedMimeTypes.includes(declaredMimeType)) {
        throw new Error(`Unsupported audio MIME type: ${declaredMimeType}`);
    }

    await assertSafePublicUrl(url);

    const head = await got.head(url, {
        timeout: { request: REQUEST_TIMEOUT_MS },
        throwHttpErrors: false,
        followRedirect: true,
        hooks: ssrfHooks,
    });
    if (head.statusCode < 200 || head.statusCode >= 400) {
        throw new Error(`Audio URL returned HTTP ${head.statusCode} for HEAD request`);
    }

    const byteSize = await probeRemoteSize(url);
    if (byteSize <= 0) {
        throw new Error("Could not determine a valid audio file size");
    }
    if (byteSize > maxFileSizeBytes) {
        throw new Error("The episode audio file is too large for AI chapter generation");
    }

    await assertAudioMagicBytes(url, declaredMimeType);

    return { byteSize };
}

async function probeRemoteSize(url: string): Promise<number> {
    return await new Promise((resolve, reject) => {
        let settled = false;
        let bytesRead = 0;

        const settle = (result: { ok: true; value: number } | { ok: false; error: Error }) => {
            if (settled) return;
            settled = true;
            if (result.ok) {
                resolve(result.value);
                return;
            }
            reject(result.error);
        };

        let stream: ReturnType<typeof got.stream>;
        try {
            stream = got.stream(url, {
                headers: { range: "bytes=-200" },
                timeout: { request: REQUEST_TIMEOUT_MS },
                throwHttpErrors: false,
                followRedirect: true,
                hooks: ssrfHooks,
            });
        } catch (error) {
            const normalized = error instanceof Error ? error : new Error(String(error));
            settle({ ok: false, error: normalized });
            return;
        }

        stream.once("response", (response) => {
            const total = parseContentRangeTotal(response.headers["content-range"]);
            if (response.statusCode !== 206 || total === null) {
                const error = new Error("Audio URL must support range requests with Content-Range");
                settle({ ok: false, error });
                stream.destroy(error);
                return;
            }

            settle({ ok: true, value: total });
            stream.destroy();
        });

        stream.on("data", (chunk: Buffer | string) => {
            bytesRead += Buffer.byteLength(chunk);
            if (bytesRead > SIZE_PROBE_MAX_BYTES) {
                const error = new Error("Audio range probe exceeded the maximum response size");
                settle({ ok: false, error });
                stream.destroy(error);
            }
        });

        stream.once("error", (error) => {
            const normalized = error instanceof Error ? error : new Error(String(error));
            settle({ ok: false, error: normalized });
        });

        stream.once("end", () => {
            if (!settled) {
                settle({ ok: false, error: new Error("Audio URL did not return a valid range response") });
            }
        });
    });
}

function parseContentRangeTotal(contentRange: string | string[] | undefined): number | null {
    if (typeof contentRange !== "string") return null;

    const [, totalPart] = contentRange.split("/");
    const total = Number.parseInt(totalPart ?? "", 10);
    return Number.isFinite(total) && total > 0 ? total : null;
}

// MP3: an ID3v2 tag ("ID3") or a raw MPEG audio frame sync (11 set bits).
function isMp3(bytes: Uint8Array): boolean {
    const isId3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
    const isFrameSync = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
    return isId3 || isFrameSync;
}

// MP4 / M4A (AAC in an ISO Base Media container): the "ftyp" box type at offset 4.
function isMp4(bytes: Uint8Array): boolean {
    return (
        bytes.length >= 8 &&
        bytes[4] === 0x66 && // f
        bytes[5] === 0x74 && // t
        bytes[6] === 0x79 && // y
        bytes[7] === 0x70 // p
    );
}

// Raw AAC in an ADTS stream: a 12-bit syncword (0xFFF).
function isAdtsAac(bytes: Uint8Array): boolean {
    return bytes[0] === 0xff && (bytes[1] & 0xf0) === 0xf0;
}

/**
 * Per-MIME magic-byte matchers. MIME types in the configured allowlist without a
 * matcher here are passed through unchecked (the cheap MIME/size gate still
 * applies).
 */
const MAGIC_BYTE_CHECKS: Record<string, (bytes: Uint8Array) => boolean> = {
    "audio/mpeg": isMp3,
    "audio/mp4": isMp4,
    "audio/x-m4a": isMp4,
    "audio/aac": (bytes) => isMp4(bytes) || isAdtsAac(bytes),
};

/**
 * Read the first bytes and confirm they match the magic bytes expected for the
 * declared MIME type, so we never hand a non-audio (or wrong-format) payload to
 * Gemini.
 */
async function assertAudioMagicBytes(url: string, mimeType: string): Promise<void> {
    const check = MAGIC_BYTE_CHECKS[mimeType];
    if (!check) return;

    const response = await got(url, {
        headers: { range: "bytes=0-11" },
        responseType: "buffer",
        timeout: { request: REQUEST_TIMEOUT_MS },
        throwHttpErrors: false,
        followRedirect: true,
        hooks: ssrfHooks,
    });

    const bytes = response.rawBody;
    if (!bytes || bytes.length < 2) {
        throw new Error("Could not read audio file header");
    }

    if (!check(bytes)) {
        throw new Error(`The referenced file does not match the expected ${mimeType} audio format`);
    }
}
