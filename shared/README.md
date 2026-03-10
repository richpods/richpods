# RichPods Shared (`@richpods/shared`)

This package contains shared code and assets used across all RichPods modules (editor, server, player, website).

## Structure

```
shared/
├── assets/
│   ├── images/     # Shared images (logos, backgrounds, etc.)
│   ├── icons/      # Shared icons
│   ├── fonts/      # Shared fonts
│   └── styles/     # Shared styles (CSS, SCSS)
├── i18n/           # Shared language utilities
├── utils/          # Shared utility modules
└── README.md
```

## Usage

Each module can import from the `@richpods/shared` package.

### In Editor/Player (Vite)
```javascript
import logo from "@richpods/shared/assets/images/logo.png";
import "@richpods/shared/assets/styles/common.css";
```

### In Server (TypeScript)
```typescript
import { resolveLanguage } from "@richpods/shared/i18n/language";
```

## Privileged roles

`utils/roles.ts` defines the single source of truth for which user roles are
considered **privileged**. Privileged users bypass server-side rate limits,
upload quotas, and verification gates. The editor also uses this list for
UI-level privilege checks.

To add or remove a role, update all role definitions in `utils/roles.ts`:
1. `UserRole`
2. `PRIVILEGED_ROLES` (if the new role should bypass checks)
3. `normalizeRole` (so claim parsing accepts the role)

Then rebuild the shared package:
`pnpm --filter @richpods/shared build`.

```typescript
import { isPrivilegedRole } from "@richpods/shared/utils/roles";
```

## Adding New Assets

When adding new shared assets:
1. Place them in the appropriate subdirectory
2. Use `@richpods/shared` imports to reference them from any module
3. Document any special usage requirements here
