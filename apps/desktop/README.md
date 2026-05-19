# Cash Mgr. Desktop App

Electron-based desktop application that wraps the web app with native SQLite database support.

## Development

```bash
pnpm dev
```

This will:

1. Start the web dev server
2. Launch Electron with the app loaded from localhost:3000

## Building

```bash
pnpm build
```

Creates production builds for your platform in `release/` directory.

### Docker Build (Linux / Windows)

Produces distributable packages inside a container, then copies them out. All commands run from the repo root.

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

### macOS (.dmg)

macOS builds cannot be produced on Linux — run natively on macOS:

```bash
pnpm build:packages
pnpm --filter @cashmgr/desktop build:electron
cd apps/desktop && pnpm exec electron-builder --mac
```

## Database

Uses better-sqlite3 for native SQLite support. Database stored in user data directory.

## IPC Bridge

The preload script exposes safe IPC methods for:

- Database operations
- App information
- Future sync features
