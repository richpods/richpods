# Validate MP3 Cloud Function

A Google Cloud Function (Gen2) that validates uploaded MP3 files for the Hosted RichPods feature. It triggers on GCS object finalization in the hosted bucket, parses the MP3 metadata, and writes the validation result to the corresponding Firestore document.

## What it does

1. Triggers when a new file is uploaded to the hosted GCS bucket
2. Skips non-MP3 files and podcast cover images
3. Finds the matching `hosted_episodes` Firestore document by `gcsAudioName`
4. Downloads and parses the MP3 file using `music-metadata`
5. Validates:
   - File size (default: max 50 MB)
   - Duration (default: max 150 minutes)
   - Bitrate (default: max 256 kbps)
6. Writes validation result and extracted metadata to Firestore:
   - `validationStatus`: `"valid"` or `"invalid"`
   - `validationError`: error message or `null`
   - `audioDurationSeconds`, `audioBitrate`, `audioSampleRate`, `audioChannels`

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_CLOUD_PROJECT` | Yes | — | GCP project ID |
| `FIRESTORE_DATABASE_ID` | No | `(default)` | Firestore database ID |
| `HOSTED_MP3_MAX_FILE_SIZE_BYTES` | No | `52428800` (50 MB) | Maximum MP3 file size in bytes |
| `HOSTED_MP3_MAX_DURATION_MINUTES` | No | `150` | Maximum MP3 duration in minutes |
| `HOSTED_MP3_MAX_BITRATE_KBPS` | No | `256` | Maximum MP3 bitrate in kbps |

## Local Development

### Build

```bash
pnpm --filter @richpods/validate-mp3 build
```

### Run locally

Start the functions framework locally:

```bash
pnpm --filter @richpods/validate-mp3 start
```

Then send a test CloudEvent:

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/cloudevents+json" \
  -d '{
    "specversion": "1.0",
    "type": "google.cloud.storage.object.v1.finalized",
    "source": "//storage.googleapis.com/projects/_/buckets/YOUR_BUCKET",
    "id": "test-event-1",
    "data": {
      "bucket": "your-hosted-bucket",
      "name": "podcast-id/episode-id/audio.mp3",
      "size": "1024000",
      "contentType": "audio/mpeg"
    }
  }'
```

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
    --timeout=120s
```

Automated deployment is configured via GitHub Actions in `.github/workflows/deploy-validate-mp3.yml`.
