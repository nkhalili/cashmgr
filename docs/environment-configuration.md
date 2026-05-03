# Environment Configuration

This document explains how environment variables are used across the monorepo to control features like development-only tools.

## Overview

Environment configuration files control which features are available in each app. The most important use case is showing/hiding the **Development** section in Settings, which allows loading sample data for testing.

## File Structure

```text
apps/
├── mobile/
│   ├── .env.development      # Default for development
│   ├── .env.production       # Used for production builds
│   └── .env.local            # (gitignored) Local overrides
├── web/
│   ├── .env.development      # Default for development
│   ├── .env.production       # Used for production builds
│   └── .env.local            # (gitignored) Local overrides
└── desktop/
    └── (uses NODE_ENV directly)
```

## Environment Variables

### Mobile App (Expo/React Native)

**File**: `apps/mobile/.env.development` or `.env.production`

```bash
# Development mode - shows Development section in Settings
EXPO_PUBLIC_ENV=development

# Production mode - hides Development section
EXPO_PUBLIC_ENV=production
```

**In Code**:

```typescript
// Settings screen automatically checks:
const isDevelopment = __DEV__ || process.env.EXPO_PUBLIC_ENV === 'development';
```

**Notes**:

- Expo requires `EXPO_PUBLIC_` prefix for variables accessible at runtime
- `__DEV__` is a built-in React Native constant that's true in development
- Variables are embedded at build time

### Web App (Vite)

**File**: `apps/web/.env.development` or `.env.production`

```bash
# Development mode - shows Development section in Settings
VITE_ENV=development

# Production mode - hides Development section
VITE_ENV=production
```

**In Code**:

```typescript
// Settings page automatically checks:
const isDevelopment = import.meta.env.VITE_ENV === 'development' || import.meta.env.DEV;
```

**Notes**:

- Vite requires `VITE_` prefix for variables accessible in client code
- `import.meta.env.DEV` is a built-in Vite boolean that's true in dev mode
- Vite automatically loads `.env.development` in dev and `.env.production` for builds

### Desktop App (Electron)

**Environment**: Uses `process.env.NODE_ENV` directly from Node.js

```bash
# Development
NODE_ENV=development

# Production
NODE_ENV=production
```

Desktop app would check `process.env.NODE_ENV === 'development'` to show dev features.

## Local Overrides

Create a `.env.local` file in any app directory to override settings locally. These files are gitignored and won't be committed.

**Example** (`apps/mobile/.env.local`):

```bash
# Force development mode even in production build (for testing)
EXPO_PUBLIC_ENV=development
```

## Development Section Visibility

The Development section in Settings (with "Load Sample Data" button) is **only visible when**:

- **Mobile**: `__DEV__` is true OR `EXPO_PUBLIC_ENV=development`
- **Web**: `import.meta.env.DEV` is true OR `VITE_ENV=development`
- **Desktop**: `process.env.NODE_ENV === 'development'`

This ensures:

- ✅ Developers can easily load test data
- ✅ Production users never see development tools
- ✅ Safe from accidentally seeding production databases

## How to Switch Modes

### During Development

By default, when running dev servers, apps use development mode:

```bash
# Mobile - automatically uses .env.development
pnpm --filter @cashmgr/mobile start

# Web - automatically uses .env.development
pnpm --filter @cashmgr/web dev

# Desktop - set NODE_ENV if needed
NODE_ENV=development pnpm --filter @cashmgr/desktop dev
```

### Production Builds

When building for production, apps automatically use `.env.production`:

```bash
# Mobile - uses .env.production
pnpm --filter @cashmgr/mobile build

# Web - uses .env.production
pnpm --filter @cashmgr/web build

# Desktop - set NODE_ENV
NODE_ENV=production pnpm --filter @cashmgr/desktop build
```

### Testing Production Mode Locally

To test production mode locally without building:

```bash
# Create .env.local with production settings
echo "EXPO_PUBLIC_ENV=production" > apps/mobile/.env.local
echo "VITE_ENV=production" > apps/web/.env.local

# Run dev server (will use .env.local)
pnpm --filter @cashmgr/mobile start
pnpm --filter @cashmgr/web dev

# Clean up when done
rm apps/mobile/.env.local
rm apps/web/.env.local
```

## Gitignore Configuration

The root `.gitignore` includes:

```gitignore
# Committed - environment defaults
# .env.development
# .env.production

# Ignored - local overrides and secrets
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

This means:

- ✅ `.env.development` and `.env.production` are committed (team defaults)
- ✅ `.env.local` files are ignored (personal overrides)
- ✅ Plain `.env` files are ignored (could contain secrets)

## Adding New Environment Variables

### Mobile (Expo)

1. Add to `.env.development` or `.env.production`:

   ```bash
   EXPO_PUBLIC_MY_VAR=value
   ```

2. Access in code:

   ```typescript
   const myVar = process.env.EXPO_PUBLIC_MY_VAR;
   ```

3. **Important**: Restart Expo server after changing env files

### Web (Vite)

1. Add to `.env.development` or `.env.production`:

   ```bash
   VITE_MY_VAR=value
   ```

2. Access in code:

   ```typescript
   const myVar = import.meta.env.VITE_MY_VAR;
   ```

3. **Important**: Restart Vite dev server after changing env files

### Desktop (Electron)

Use Node.js environment variables directly:

```bash
MY_VAR=value pnpm --filter @cashmgr/desktop dev
```

Or use a `.env` file with `dotenv` package.

## Security Notes

⚠️ **Never commit sensitive data** like API keys or secrets to environment files that are tracked by git.

- For secrets, use `.env.local` (gitignored) or secure secret management
- Only commit non-sensitive defaults to `.env.development` and `.env.production`
- Remember: Client-side environment variables are embedded in builds and visible to users

## Troubleshooting

### Development section not showing

1. Check you're in development mode:
   - Mobile: Verify `__DEV__` or `EXPO_PUBLIC_ENV=development`
   - Web: Verify `import.meta.env.DEV` or `VITE_ENV=development`

2. Restart dev server after changing `.env` files

3. Check for `.env.local` overriding settings

### Development section showing in production

1. Verify `.env.production` has correct values:
   - Mobile: `EXPO_PUBLIC_ENV=production`
   - Web: `VITE_ENV=production`

2. Check no `.env.local` file is present

3. Rebuild the app (environment variables are embedded at build time)

## References

- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [React Native __DEV__](https://reactnative.dev/docs/javascript-environment)
