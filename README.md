# RichPods

**RichPods** transforms traditional podcasts into multimedia experiences. Creators use the editor to enrich podcast episodes with interactive elements — maps, info boxes, charts, images, and slideshows — that are delivered to listeners at precisely the right moment during playback via an embeddable player.

## Components

* **Editor** (`editor/`) — A Vue.js single-page application where creators author RichPods by attaching interactive elements like maps, charts, info boxes, and slideshows to podcast episode chapters.
* **Player** (`player/`) — An embeddable Vue.js-based player that delivers the enriched multimedia content to listeners in sync with podcast audio playback.
* **Server** (`server/`) — A GraphQL API that powers the editor, player, and website, backed by Google Firestore and Cloud Storage.
* **Website** (`website/`) — A public-facing Nuxt site that introduces the RichPods project and serves as its landing page.
* **Shared** (`shared/`) — A library of shared Vue components, composables, TypeScript utilities (e.g. i18n/language helpers), and static assets (SVGs, logos, fonts) consumed by the editor, player, and website.

This is a monorepo managed with [pnpm workspaces](https://pnpm.io/workspaces).

## Prerequisites

* **Node.js ≥ 24.0.0** (see `.nvmrc` — run `nvm use` if you use nvm)
* **pnpm ≥ 10.30.0** — enabled via [corepack](https://nodejs.org/api/corepack.html) (`corepack enable`)

## Install dependencies

From the repository root, a single install covers every workspace:

```bash
corepack enable
pnpm install
```

If you already have pnpm installed globally, `corepack enable` is optional — corepack only needs to be enabled if you don't have pnpm installed, as it will automatically provide the correct version declared in `package.json`.

Commit the generated `pnpm-lock.yaml` so CI and Docker builds are reproducible.

## Workspaces overview

| Workspace | Package name | Description |
|-----------|-------------|-------------|
| `editor/` | `@richpods/editor` | Vue.js SPA for authoring RichPods |
| `player/` | `@richpods/player` | Embeddable Vue.js-based RichPods player |
| `server/` | `@richpods/server` | GraphQL API server |
| `shared/` | `@richpods/shared` | Shared Vue components, composables, and assets |
| `website/` | `@richpods/website` | Public-facing Nuxt website |
| `cloud-functions/validate-mp3` | `@richpods/validate-mp3` | Cloud Function: MP3 validation on upload |
| `cloud-functions/check-verifications` | `@richpods/check-verifications` | Cloud Function: daily feed verification check |

## Running workspaces

You can start any workspace from the repo root using `pnpm` filters or root scripts. Start them in the following order:

### 1. Server (GraphQL API)

```bash
pnpm dev:server
# or: pnpm --filter @richpods/server dev
```

> The server requires environment variables. Copy `server/.env.example` to `server/.env.development` and fill in the values.

### 2. Editor (Vite dev server)

```bash
pnpm dev:editor
# or: pnpm --filter @richpods/editor dev
```

### 3. Player (Vite dev server)

```bash
pnpm dev:player
# or: pnpm --filter @richpods/player dev
```

### 4. Website (Nuxt dev server)

```bash
pnpm dev:website
# or: pnpm --filter @richpods/website dev
```

### Shared package

The `@richpods/shared` package provides shared TypeScript modules (e.g. i18n/language utilities) and static assets (SVGs, logos, fonts) consumed by the editor, player, and website. It has no dev server. When you change its TypeScript source files, you might rebuild it so other workspaces pick up the changes:

```bash
pnpm build:shared
# or: pnpm --filter @richpods/shared build
```

## Building

Build a single workspace:

```bash
pnpm build:server
pnpm build:editor
pnpm build:player
pnpm build:website
```

## User roles (Firebase custom claims)

User roles are stored in Firebase Auth custom claims under `role`.

Supported role values:

* `super_admin`
* `editor`
* `none` (removes the role claim)

Set or remove a role from the repository root:

```bash
pnpm --filter @richpods/server set-user-role <firebaseUid> <super_admin|editor|none>
```

**Notes:**

* This command updates Firebase custom claims only.
* The caller must have Firebase Admin credentials configured for the server workspace.
* Role changes take effect when the client presents a fresh ID token (for example after token refresh or re-login).

## Testing

```bash
pnpm test:server
pnpm test:player
```

## Keeping package versions in sync

Shared dependency versions are centralized in `pnpm-workspace.yaml` via the `catalog` map. Workspace packages that should stay aligned use `"catalog:"` in their dependency versions.

When you want to upgrade shared dependencies:

1. Update the version once in `pnpm-workspace.yaml`.
2. Run `pnpm install` at repo root.

## Verification

RichPods uses a verification system to help listeners trust content. Each `PodcastOrigin` embedded in a RichPod document carries a `verified` boolean that is set at creation time. When a RichPod is created, the server checks whether the user has successfully verified ownership of the podcast feed (via the email-based verification flow). If so, `origin.verified` is set to `true`; otherwise it is `false`.


## Podcast opt-out

RichPods respects the [PSP-1 `<podcast:locked>` tag](https://github.com/Podcast-Standards-Project/PSP-1-Podcast-RSS-Specification#podcastlocked). If a podcast feed contains `<podcast:locked>yes</podcast:locked>`, the server will reject any attempt to import episodes from that feed. This allows podcast owners to exclude their content from being used with RichPods.


## Open Source Projects used

This is just a quick overview over the main Open Source projects used. The whole project incorporates a much higher number of Open Source and free software.

### Frameworks & Core

* [Vue.js](https://vuejs.org/) — frontend framework for editor, player, and website
* [Nuxt](https://nuxt.com/) — meta-framework for the website
* [Express](https://expressjs.com/) — Node.js server framework
* [GraphQL](https://graphql.org/) — API query language
* [Vite](https://vite.dev/) — frontend build tool
* [pnpm](https://pnpm.io/) — dependency management

### UI & Styling

* [Tailwind CSS](https://tailwindcss.com/) — utility-first CSS framework
* [Headless UI](https://headlessui.com/) — accessible UI components
* [Ionicons](https://ionic.io/ionicons) — icons for the editor

### Content and Rendering

* [Tiptap](https://tiptap.dev/) — rich text editor
* [MapLibre GL](https://maplibre.org/) — interactive maps
* [Apache ECharts](https://echarts.apache.org/) — charts and data visualization
* [Flicking](https://naver.github.io/egjs-flicking/) — carousel/slideshow component

### Backend & Infrastructure

* [Sharp](https://sharp.pixelplumbing.com/) — image processing
* [DOMPurify](https://github.com/cure53/DOMPurify) — HTML sanitization


## Fonts

Font files are not included in this repository. Download them manually and place them in `shared/assets/fonts/`:

| Font | Download | Target directory | License |
|---|---|---|---|
| [Open Sans](https://fonts.google.com/specimen/Open+Sans) | [Google Fonts](https://fonts.google.com/specimen/Open+Sans) | `shared/assets/fonts/` | [SIL Open Font License 1.1](https://openfontlicense.org/) |
| [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) | [Google Fonts](https://fonts.google.com/specimen/Playfair+Display) | `shared/assets/fonts/` | [SIL Open Font License 1.1](https://openfontlicense.org/) |
| [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | [JetBrains](https://www.jetbrains.com/lp/mono/) | `shared/assets/fonts/` | [SIL Open Font License 1.1](https://openfontlicense.org/) |


## Supported by Netidee Call 19

Netidee supports Internet and Open Source ideas with up to 60.000 Euro in funding. If you are working on an Open Source projects and are permanent resident in Austria, [apply](https://netidee.at/einreichen) for your own funding! You find more information about our Netidee grant on our [Netidee project page](https://www.netidee.at/richpodsorg).

<img src="shared/assets/images/netidee-projekte-w1000.webp" alt="Netidee" width="300" />
