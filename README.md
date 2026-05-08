# Cash Mgr. - Offline-First Cash Manager

A cross-platform, offline-first money management application built with a monorepo architecture.

## Architecture

This is a monorepo project using pnpm workspaces with the following structure:

- **[apps/web](apps/web/README.md)** - Web application (React + Vite + TypeScript)
- **[apps/desktop](apps/desktop/README.md)** - Desktop application (Electron)
- **[apps/mobile](apps/mobile/README.md)** - Mobile application (React Native + Expo)
- **[packages/core](packages/core/README.md)** - Shared business logic and utilities
- **[packages/db](packages/db/README.md)** - Database schema and abstractions
- **[packages/ui](packages/ui/README.md)** - Shared UI components

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for data models, schemas, and patterns, and [STRUCTURE.md](STRUCTURE.md) for the full folder tree.

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Mobile**: React Native + Expo
- **Desktop**: Electron
- **Build Tool**: Vite (for web)
- **Package Manager**: pnpm
- **Database**: SQLite (platform-specific adapters)
  - Web: `@sqlite.org/sqlite-wasm` + OPFS via Web Worker
  - Mobile: `expo-sqlite`
  - Desktop: `better-sqlite3`

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## Getting Started

> For full prerequisites and platform-specific setup see [SETUP.md](SETUP.md).

### Installation

```bash
# Install dependencies
pnpm install

# Build shared packages
pnpm --filter @cashmgr/core build
pnpm --filter @cashmgr/db build
pnpm --filter @cashmgr/ui build
```

### Development

#### Web App

```bash
pnpm dev:web
```

Opens at <http://localhost:3000>

#### Desktop App

```bash
pnpm dev:desktop
```

Launches Electron window with the web app loaded from dev server.

#### Mobile App

```bash
pnpm dev:mobile
```

Starts Expo dev server. Scan QR code with Expo Go app on your device.

### Building

```bash
# Build all apps
pnpm build:all

# Build specific app
pnpm build:web
pnpm build:desktop
pnpm build:mobile
```

## Project Structure

See [STRUCTURE.md](STRUCTURE.md) for the complete folder tree.

## Scripts

### Development Scripts

- `pnpm dev:web` - Start web development server
- `pnpm dev:desktop` - Start desktop app in development mode
- `pnpm dev:mobile` - Start mobile app with Expo

### Build Scripts

- `pnpm build:all` - Build all applications
- `pnpm build:web` - Build web app only
- `pnpm build:desktop` - Build desktop app only
- `pnpm build:mobile` - Build mobile app only

### Code Quality Scripts

- `pnpm test` - Run tests with Vitest
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - Run TypeScript type checking

## Database

The application uses SQLite for local storage with platform-specific adapters:

- **Web**: `@sqlite.org/sqlite-wasm` + OPFS via Web Worker; falls back to sql.js + IndexedDB on older browsers
- **Desktop**: `better-sqlite3` (native Node.js)
- **Mobile**: `expo-sqlite`

All platforms share the same schema defined in `packages/db`.

## Documentation

| Doc | Description |
| --- | ----------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data models, schemas, patterns, and file locations |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | End-user feature documentation |
| [docs/ui-patterns.md](docs/ui-patterns.md) | Reusable UI patterns and styling guidelines |
| [docs/environment-configuration.md](docs/environment-configuration.md) | Environment variables and feature flags |
| [ROADMAP.md](ROADMAP.md) | Planned features and product tiers |

## Development Guidelines

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor guide, code conventions, and PR workflow.

### Package Organization

1. Shared logic goes in `packages/core`
2. Database changes go in `packages/db`
3. UI components go in `packages/ui`
4. App-specific code stays in respective `apps/*` directories

---

## Docker — Web App

Build the web app and serve it with nginx (all commands run from repo root).

```bash
docker compose up --build        # build and start  →  http://localhost:8080
docker compose up                # start (no rebuild)
docker compose down              # stop and remove container
```

---

## Docker — Desktop App (Build Only)

Produces distributable packages inside the container, then copies them out.

```bash
# Build Linux AppImage (default)
docker build -f apps/desktop/Dockerfile -t cashmgr-desktop-builder .

# Build Linux AppImage + Windows NSIS installer (Wine is included in the image)
# This will fail on Apple Silicon but works fine on x86_64 
docker build -f apps/desktop/Dockerfile \
  --build-arg PLATFORMS="--linux --win" \
  -t cashmgr-desktop-builder .

# Copy artifacts out of the container  →  ./release/
docker create --name extract cashmgr-desktop-builder
docker cp extract:/app/apps/desktop/release ./release
docker rm extract
```

> **macOS (.dmg)** cannot be built on Linux. Run natively on macOS:
>
> ```bash
> pnpm build:packages
> pnpm --filter @cashmgr/desktop build:electron
> cd apps/desktop && pnpm exec electron-builder --mac
> ```

---

## Mobile — EAS Build (iOS & Android)

Builds run locally — no cloud queue. Requires [EAS CLI](https://docs.expo.dev/eas/) and platform SDKs.

```bash
# One-time setup
npm install -g eas-cli
eas login          # authenticate with your Expo account
```

### Android (any machine with JDK 17 + Android SDK)

```bash
# APK for direct device install / QA
eas build --platform android --profile preview --local

# AAB for Google Play Store
eas build --platform android --profile production --local
```

### iOS (macOS + Xcode only)

```bash
# Ad Hoc build for real-device testing
eas build --platform ios --profile preview --local

# App Store build
eas build --platform ios --profile production --local
```

### Submit to Stores

Fill in the placeholder values in `apps/mobile/eas.json` first, then:

```bash
eas submit --platform ios --latest
eas submit --platform android --latest
```

---

## License

AGPL-3.0 — see [LICENSE](LICENSE)
