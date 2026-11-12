import { describe, it } from "node:test";
import assert from "node:assert";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import express from "express";

process.env.GCS_UPLOAD_BUCKET_NAME ??= "test-bucket";
process.env.FIREBASE_API_KEY ??= "test-api-key";
process.env.GOOGLE_CLOUD_PROJECT ??= "test-project";

describe("POST /api/v1/upload", () => {
    it("rejects an unauthenticated request before the multipart body is parsed", async (t) => {
        const { uploadRouter } = await import("../src/routes/upload.router.js");
        const app = express();
        app.use("/api/v1/upload", uploadRouter);
        const server = app.listen(0, "127.0.0.1");
        t.after(() => server.close());
        await once(server, "listening");
        const { port } = server.address() as AddressInfo;

        // Multer answers this unexpected file field with 400, so a 401 proves auth ran first.
        const form = new FormData();
        form.append("unexpected", new Blob([new Uint8Array(16)]), "a.png");

        const response = await fetch(`http://127.0.0.1:${port}/api/v1/upload`, {
            method: "POST",
            body: form,
        });

        assert.strictEqual(response.status, 401);
        assert.deepStrictEqual(await response.json(), { error: "Authentication required" });
    });
});
