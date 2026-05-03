# Setup Instructions for Cash Mgr. App

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## Quick Start

From the root directory:

```bash
# 1. Install all dependencies
pnpm install

# 2. Build shared packages (required before running apps)
pnpm build:packages

# 3. Start the app you want to develop:

# Web App (opens at http://localhost:3001)
pnpm dev:web

# Mobile App (Expo Metro bundler on http://localhost:8081)
pnpm dev:mobile

# Desktop App (requires web server running, starts Electron)
pnpm dev:desktop
```

## Detailed Setup

### 1. Install Dependencies

From the root directory:

```bash
pnpm install
```

This installs all dependencies for all workspaces.

### 2. Build Shared Packages

The shared packages (`@cashmgr/core`, `@cashmgr/db`, `@cashmgr/ui`) must be built before running any app:

```bash
pnpm build:packages
```

Or build individually:

```bash
pnpm --filter @cashmgr/core build
pnpm --filter @cashmgr/db build
pnpm --filter @cashmgr/ui build
```

### 3. Start Development Servers

#### Web App

```bash
pnpm dev:web
```

Opens at [http://localhost:3001](http://localhost:3001) (or next available port if 3000-3001 are in use).

#### Mobile App

```bash
pnpm dev:mobile
```

Metro bundler starts on [http://localhost:8081](http://localhost:8081). Then:

- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your device

Note: First run may show version warnings - this is expected and won't prevent the app from working.

#### Desktop App

```bash
pnpm dev:desktop
```

This will:

1. Start the web dev server (if not already running)
2. Build the Electron TypeScript code
3. Launch Electron which loads from [http://localhost:3001](http://localhost:3001)

Note: The desktop app in dev mode requires the web dev server to be running.

## Troubleshooting

### Mobile App Issues

If you encounter module resolution errors:

1. **Clear all caches:**

    ```bash
    cd apps/mobile
    rm -rf .expo node_modules/.cache
    cd ../..
    pnpm install
    ```

2. **Restart Metro bundler with clear cache:**

    ```bash
    cd apps/mobile
    pnpm start --clear
    ```

3. **Check if dependencies are installed:**

    ```bash
    ls node_modules/.pnpm | grep "@react-navigation"
    ```

### Build Errors

If you get TypeScript errors:

1. **Clean and rebuild packages:**

    ```bash
    rm -rf packages/*/dist
    pnpm --filter @cashmgr/core build
    pnpm --filter @cashmgr/db build
    pnpm --filter @cashmgr/ui build
    ```

2. **Run typecheck:**

    ```bash
    pnpm typecheck
    ```

### Metro Bundler Issues

If Metro can't find modules in the monorepo:

1. Make sure `metro.config.js` is present in `apps/mobile/`
2. Restart Metro with `--reset-cache` flag
3. Check that `pnpm-workspace.yaml` is in the root

## Development Workflow

1. Make changes to shared packages (`packages/*`)
2. Rebuild the changed package: `pnpm --filter @cashmgr/[package] build`
3. The apps will pick up the changes automatically (web has HMR, mobile needs Metro restart)

## Notes

- The mobile app requires all React Native and Expo dependencies to be explicitly declared due to monorepo hoisting
- Desktop app loads the web app in development mode from localhost:3000
- All platforms share the same business logic from `@cashmgr/core`
- Database implementations are platform-specific (IndexedDB/Web, expo-sqlite/Mobile, better-sqlite3/Desktop)
