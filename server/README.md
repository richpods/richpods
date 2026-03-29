# RichPods Server (`@richpods/server`)

Node.js/TypeScript backend for RichPods. It provides the GraphQL API used by `editor`, `player`, and `website`, plus background jobs and upload endpoints.

## Local development

```sh
cp .env.example .env
pnpm install
pnpm --filter @richpods/server dev
```

GraphQL playground and API:

```text
http://localhost:4000/graphql
```

## Privileged roles

Certain server-side checks (rate limits, upload quotas, verification gates) are
bypassed for users whose Firebase Auth custom `role` claim is in the
**privileged roles** list.

The list is defined in `@richpods/shared/utils/roles` (`PRIVILEGED_ROLES`).
To change which roles are privileged, edit that file — see the
[shared package README](../shared/README.md#privileged-roles) for details.

## Hosted bucket CORS

The hosted podcast bucket needs CORS configured for browser-based POST uploads via signed policies. Apply the config with:

```sh
gcloud storage buckets update gs://$GCS_HOSTED_BUCKET_NAME --cors-file=server/hosted-bucket-cors.json
```

This is also run automatically during server deployment (see `.github/workflows/deploy_server.yml`).

Warning: there are two separate CORS allowlists that must stay in sync:

- `CORS_ALLOWED_ORIGINS` controls which editor origins may call the server API.
- `server/hosted-bucket-cors.json` controls which browser origins may `POST` the signed upload policy to Google Cloud Storage.

If an origin is allowed by `CORS_ALLOWED_ORIGINS` but missing from `server/hosted-bucket-cors.json`, the episode create request can still succeed but the direct browser upload to GCS will fail with a CORS error. Keep preview domains, production domains, and local development ports aligned in both places.

## Hosted episode uploads

Hosted episode MP3 uploads go directly from the browser to Google Cloud Storage,
bypassing Cloud Run's 32 MB request body limit. The server does not receive the
audio bytes — instead it generates a **signed POST policy** that the browser uses
to upload via `multipart/form-data`.

### How it works

1. The editor calls `POST /api/v1/hosted/podcast/:podcastId/episode/create` with
   the declared `audioByteSize`.
2. The server validates the size against the configured min/max limits, creates the
   episode document in Firestore, and calls `generateSignedPostPolicyV4` to produce
   a signed upload policy.
3. The policy includes a `content-length-range` condition (min 350 KB, max 50 MB by
   default) and locks the `Content-Type` to `audio/mpeg`. GCS rejects uploads that
   violate these constraints **before storing any bytes**.
4. The server returns `{ episodeId, gcsAudioName, uploadPolicy: { url, fields } }`.
5. The browser builds a `FormData` with all policy `fields` plus the MP3 file (as
   the last field) and POSTs it to `uploadPolicy.url`.
6. After upload, a Cloud Function validates the audio metadata and writes the result
   to Firestore. The browser polls for the outcome.

### Signing requirements

`generateSignedPostPolicyV4` needs to sign the policy. When
`GOOGLE_APPLICATION_CREDENTIALS` points to a service account key file, signing
works out of the box. If production uses metadata-based Application Default
Credentials (no key file), the service account needs
`roles/iam.serviceAccountTokenCreator` on itself.

### Upload limits

Upload limits are exposed to the editor via the `instanceInfo.hosting` GraphQL
query so the client can validate before uploading. The server-side defaults are:

| Limit | Default | Environment variable |
|---|---|---|
| Min file size | 350 KB | — (hardcoded) |
| Max file size | 50 MB | `HOSTED_MP3_MAX_FILE_SIZE_BYTES` |
| Max duration | 150 min | `HOSTED_MP3_MAX_DURATION_MINUTES` |
| Max bitrate | 256 kbps | `HOSTED_MP3_MAX_BITRATE_KBPS` |

## Request size limits

The JSON body parser (`express.json()`) is limited to **2 MB** by default. This
applies to all routes including `/graphql`. File uploads (images, MP3s) are
handled by Multer on dedicated upload routes with their own per-route limits and
are not affected by this setting.

Override the default via the `JSON_BODY_LIMIT_BYTES` environment variable (in
bytes, minimum 100,000).

## Upload quota caveats

Current upload quota enforcement is best-effort and has two known limitations:

1. Quota check and upload record write are separate steps, so concurrent uploads
   can temporarily exceed strict quota limits.
2. Quota cache is process-local (`Map` in memory), so multiple server instances
   can have temporarily diverging quota views until cache refresh.
