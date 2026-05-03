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

## Database

Uses better-sqlite3 for native SQLite support. Database stored in user data directory.

## IPC Bridge

The preload script exposes safe IPC methods for:

- Database operations
- App information
- Future sync features
