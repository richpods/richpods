# RichPods Editor (`@richpods/editor`)

A Vue.js SPA for managing and editing RichPods.

## Architecture

- **Vue 3 + TypeScript**: Modern Vue composition API with TypeScript support
- **Vite**: Fast build tool and development server
- **Firebase Auth**: Client-side authentication
- **GraphQL**: API communication using graphql-request
- **Component-based**: Modular components for authentication, profile, and RichPod management

## Auto-Save Architecture

The editor persists RichPod changes through a central save pipeline that is coordinated in
`src/composables/useAutoSave.ts`.

### State and Dirty Tracking

- `src/stores/useRichPodStore.ts` owns the editable `richpod`, `isDirty`, and `activeChapterIndex`.
- Store mutators such as `setTitle`, `setDescription`, `updateCurrentChapter`, `addChapter`,
  `removeChapterAt`, and `setChapters` mark the document dirty.
- `isDirty` is reset only after a successful save cycle that did not receive newer local changes.

### Save Pipeline

- `useAutoSave(richpodId)` is created in `src/components/RichPodEditor.vue`.
- Guard conditions prevent saves when one of these is true:
  - no `richpodId`
  - not dirty
  - `canEditorSave` is false (`useEditorUiStore`)
- Save status lifecycle: `idle` -> `saving` -> `saved`/`error`.
- After `saved`, status is reset back to `idle` after 3 seconds.
- Concurrency control:
  - while a save is in flight, additional save requests set `pendingSave = true`
  - after the request finishes, pending work is flushed by recursively running `performSave()`
- Change coalescing:
  - a deep watch increments a local change version on every RichPod mutation
  - if data changed during the in-flight request, the result is not treated as final and another save
    is queued

### Auto and Explicit Triggers

- Automatic save trigger:
  - chapter switch (`activeChapterIndex` watcher)
- Explicit save triggers:
  - `Ctrl/Cmd + S` keyboard shortcut in `RichPodEditor.vue`
  - route leave hook (`onBeforeRouteLeave`) awaits `saveNow()`
  - chapter operations such as move/duplicate call `saveNow()`
  - child editors can request an immediate save via DI (`useSaveNow`)

### Child Component Access (`useSaveNow`)

- `RichPodEditor.vue` provides the `saveNow` function using
  `src/composables/useSaveNow.ts` (`provideSaveNow(saveNow)`).
- Descendant components call `useSaveNow()` to execute the same central save pipeline without prop
  drilling.
- Example: `src/components/editor/enclosures/GeoMapEditor.vue` calls `saveNow()` after setting or
  resetting the initial map view (`bbox`).

### Lifecycle and Unload Handling

- `useAutoSave` registers a `beforeunload` listener and prevents tab close when there are unsaved
  changes.
- `RichPodEditor.vue` calls `disposeAutoSave()` on unmount to remove listeners and clear timers.

## API Integration

The app integrates with the RichPods GraphQL server:
- Authenticates users via Firebase Auth
- Sends JWT tokens in Authorization headers
- Handles GraphQL mutations for profile and RichPod operations
- Client-side Zod validation for editor UX, with server-side Joi validation as the source of truth

## Development Notes

- Path alias `@/` points to `src/` directory
- TypeScript configuration supports Vue SFC files
- Firebase SDK v9 modular imports for optimal bundle size
- GraphQL client with automatic JWT token attachment
- Scoped styling with Tailwind CSS

## Security

- JWT tokens automatically attached to GraphQL requests
- Client-side input validation prevents malformed requests
- Firebase Auth handles secure authentication flow
- Environment variables protect sensitive configuration
