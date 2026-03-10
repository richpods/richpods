# RichPods Player (`@richpods/player`)

The player is a Vue 3 SPA that renders a single RichPod by ID and is designed to be embeddable in other websites.

## Requirements

- Node.js 24+
- pnpm (via `corepack enable`)

## Configuration

Set the GraphQL endpoint in `player/.env` (see `.env.example`):

```env
VITE_GRAPHQL_ENDPOINT=http://localhost:4000/graphql
```

## Local development

```sh
pnpm install
pnpm --filter @richpods/player dev
```

The app is served under `/player/`. Open:

```text
http://localhost:5173/player/<richPodId>
```

## Scripts

- `pnpm --filter @richpods/player dev` - start Vite dev server
- `pnpm --filter @richpods/player build` - type-check and build for production
- `pnpm --filter @richpods/player preview` - preview production build
- `pnpm --filter @richpods/player test:unit` - run Vitest tests
- `pnpm --filter @richpods/player lint` - run ESLint with auto-fixes
- `pnpm --filter @richpods/player format` - format source files with Prettier
- `pnpm --filter @richpods/player codegen` - regenerate GraphQL types from `codegen.yml`

## Credits

- Icons from [Ionicons](https://ionic.io/ionicons) by Ionic, licensed under the [MIT License](https://github.com/ionic-team/ionicons/blob/main/LICENSE).
