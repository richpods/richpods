import { describe, it } from "node:test";
import assert from "node:assert";
import sharp from "sharp";
import { OG_IMAGE_MAX_PIXELS, processOgImage } from "../src/utils/og-image.js";

const demoWebp = (width: number, height: number): Promise<Buffer> =>
    sharp({ create: { width, height, channels: 3, background: "#3366cc" } })
        .webp()
        .toBuffer();

const uint32le = (value: number): Buffer => {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32LE(value >>> 0);
    return buffer;
};

/** A lossless WebP that only consists of its header, declaring the given dimensions. */
const webpHeaderOnly = (width: number, height: number): Buffer => {
    const payload = Buffer.alloc(16);
    payload[0] = 0x2f;
    payload.writeUInt32LE(((width - 1) | ((height - 1) << 14)) >>> 0, 1);
    const chunk = Buffer.concat([Buffer.from("VP8L"), uint32le(payload.length), payload]);
    return Buffer.concat([
        Buffer.from("RIFF"),
        uint32le(4 + chunk.length),
        Buffer.from("WEBP"),
        chunk,
    ]);
};

describe("processOgImage", () => {
    it("should re-encode a 1200x630 WebP og:image", async () => {
        const result = await processOgImage(await demoWebp(1200, 630));

        assert.ok(result.ok);
        assert.strictEqual(result.mimeType, "image/webp");
        assert.strictEqual(result.extension, "webp");
        assert.strictEqual(result.width, 1200);
        assert.strictEqual(result.height, 630);

        const metadata = await sharp(result.buffer).metadata();
        assert.strictEqual(metadata.format, "webp");
        assert.strictEqual(metadata.width, 1200);
        assert.strictEqual(metadata.height, 630);
    });

    it("should reject a WebP og:image below the minimum dimensions", async () => {
        const result = await processOgImage(await demoWebp(400, 300));

        assert.ok(!result.ok);
        assert.match(result.reason, /too small/);
    });

    it("should refuse a tiny WebP that declares more pixels than the limit", async () => {
        const input = webpHeaderOnly(5000, 5000);
        assert.ok(input.length < 100);
        assert.ok(5000 * 5000 > OG_IMAGE_MAX_PIXELS);

        await assert.rejects(processOgImage(input), /exceeds pixel limit/);
    });
});
