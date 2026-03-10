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
