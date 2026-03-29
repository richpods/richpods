#!/usr/bin/env node

const gcsPath = (process.argv[2] ?? "").replace(/^gs:\/\//, "");
if (!gcsPath) {
    console.error("Usage: node trigger.mjs <bucket>/<object-path>");
    process.exit(1);
}

const slashIndex = gcsPath.indexOf("/");
const bucket = gcsPath.substring(0, slashIndex);
const name = gcsPath.substring(slashIndex + 1);

const response = await fetch("http://localhost:8081", {
    method: "POST",
    headers: { "Content-Type": "application/cloudevents+json" },
    body: JSON.stringify({
        specversion: "1.0",
        type: "google.cloud.storage.object.v1.finalized",
        source: `//storage.googleapis.com/projects/_/buckets/${bucket}`,
        id: `test-${Date.now()}`,
        time: new Date().toISOString(),
        data: {
            bucket,
            name,
        },
    }),
});

console.log(`${response.status} ${response.statusText}`);
const body = await response.text();
if (body) console.log(body);
