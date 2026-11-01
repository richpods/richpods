# Check Verifications Cloud Function

A Google Cloud Function (Gen2) that checks all verified podcast feed verifications daily. It fetches each verified feed's RSS, extracts the `itunes:email`, and compares it against the email stored on each verification. Verifications that no longer match are marked as failed.

## What it does

1. Queries all Firestore verification documents with state `verified`
2. Groups verifications by feed URL to avoid redundant fetches
3. For each unique feed, fetches the RSS and extracts the `itunes:email`
4. Compares the current email against the email stored on each verification, per user: a user keeps all of their verifications for the feed if at least one of them matches, otherwise all of them fail
5. Marks mismatched or unreachable verifications as `failed` in Firestore

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_CLOUD_PROJECT` | Yes | — | GCP project ID |
| `FIRESTORE_DATABASE_ID` | No | `(default)` | Firestore database ID |

## Local Development

### Build

```bash
pnpm --filter @richpods/check-verifications build
```

### Test

```bash
pnpm --filter @richpods/check-verifications test
```

### Run locally

Start the functions framework locally:

```bash
pnpm --filter @richpods/check-verifications start
```

Then trigger a check:

```bash
curl -X POST http://localhost:8080
```

## Deployment

Deploy using `gcloud`:

```bash
gcloud functions deploy check-verifications \
    --gen2 \
    --runtime=nodejs24 \
    --region=YOUR_REGION \
    --source=cloud-functions/check-verifications \
    --entry-point=checkVerifications \
    --trigger-http \
    --no-allow-unauthenticated \
    --set-env-vars="GOOGLE_CLOUD_PROJECT=YOUR_PROJECT,FIRESTORE_DATABASE_ID=YOUR_DB_ID" \
    --memory=512Mi \
    --timeout=540s
```

Automated deployment is configured via GitHub Actions in `.github/workflows/deploy-check-verifications.yml`.
