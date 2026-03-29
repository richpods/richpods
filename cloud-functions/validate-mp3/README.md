# Validate MP3 Cloud Function

A Google Cloud Function (Gen2) that validates uploaded MP3 files for the Hosted RichPods feature. It triggers on GCS object finalization in the hosted bucket, parses the MP3 metadata, and writes the validation result to a dedicated `audio_validations` Firestore collection.

## What it does

1. Triggers when a new file is uploaded to the hosted GCS bucket
2. Skips non-MP3 files and podcast cover images
3. Extracts the `episodeId` from the GCS path (`{podcastId}/{episodeId}/{uuid}.mp3`)
4. Downloads and parses the MP3 file using `music-metadata`
5. Validates:
   - Content type (must be `audio/mpeg` or `audio/mp3`)
   - File size (default: max 50 MB)
   - Duration (default: max 150 minutes)
   - Bitrate (default: max 256 kbps)
6. Writes validation result to `audio_validations/{episodeId}`:
   - `status`: `"valid"` or `"invalid"`
   - `error`: error message or `null`
   - `audioDurationSeconds`, `audioBitrate`, `audioSampleRate`, `audioChannels`
7. Opportunistically updates the `hosted_episodes` document and reconciles the RichPod (tolerates missing documents)
8. Deletes non-audio files from GCS as a security measure

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_CLOUD_PROJECT` | Yes | — | GCP project ID |
| `FIRESTORE_DATABASE_ID` | No | `(default)` | Firestore database ID |
| `HOSTED_MP3_MAX_FILE_SIZE_BYTES` | No | `52428800` (50 MB) | Maximum MP3 file size in bytes |
| `HOSTED_MP3_MAX_DURATION_MINUTES` | No | `150` | Maximum MP3 duration in minutes |
| `HOSTED_MP3_MAX_BITRATE_KBPS` | No | `256` | Maximum MP3 bitrate in kbps |

## Local Development

### Prerequisites

You need GCP credentials that can access both the GCS hosted bucket and Firestore:
- `GOOGLE_APPLICATION_CREDENTIALS` env var pointing to a service account JSON, or
- Application Default Credentials via `gcloud auth application-default login`

### Build

```bash
pnpm --filter @richpods/validate-mp3 build
```

### Run locally

Start the functions framework locally:

```bash
pnpm --filter @richpods/validate-mp3 dev
```

This command loads `cloud-functions/validate-mp3/.env.development` and starts:

```bash
npx @google-cloud/functions-framework --target=validateMp3 --signature-type=cloudevent --port=8081
```

### Test with a real MP3

1. Upload an MP3 to the hosted GCS bucket:

```bash
gsutil cp test.mp3 gs://<hosted-bucket>/<podcastId>/<episodeId>/test.mp3
```

2. Send a simulated GCS finalize CloudEvent:

```bash
curl -X POST http://localhost:8081 \
  -H "Content-Type: application/cloudevents+json" \
  -d '{
    "specversion": "1.0",
    "type": "google.cloud.storage.object.v1.finalized",
    "source": "//storage.googleapis.com/projects/_/buckets/<hosted-bucket>",
    "id": "test-event-1",
    "time": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "data": {
      "bucket": "<hosted-bucket>",
      "name": "<podcastId>/<episodeId>/test.mp3",
      "size": "<actual-byte-size>",
      "contentType": "audio/mpeg"
    }
  }'
```

3. Verify:
   - Check the terminal output for validation logs
   - Check Firestore for the `audio_validations/<episodeId>` document
   - If the episode doc exists, check that it was opportunistically updated

## Deployment

Deploy using `gcloud`:

```bash
gcloud functions deploy validate-mp3 \
    --gen2 \
    --runtime=nodejs24 \
    --region=YOUR_REGION \
    --source=cloud-functions/validate-mp3 \
    --entry-point=validateMp3 \
    --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
    --trigger-event-filters="bucket=YOUR_HOSTED_BUCKET_NAME" \
    --set-env-vars="GOOGLE_CLOUD_PROJECT=YOUR_PROJECT,FIRESTORE_DATABASE_ID=YOUR_DB_ID" \
    --memory=512Mi \
    --timeout=120s \
    --retry
```

Automated deployment is configured via GitHub Actions in `.github/workflows/deploy-validate-mp3.yml`.
