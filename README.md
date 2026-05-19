# Cash Mgr. - Offline-First Cash Manager

[![stable](https://img.shields.io/github/actions/workflow/status/nkhalili/cashmgr/ci.yml?branch=main&label=stable)](https://github.com/nkhalili/cashmgr/actions/workflows/ci.yml?query=branch%3Amain) [![dev](https://img.shields.io/github/actions/workflow/status/nkhalili/cashmgr/ci.yml?branch=dev&label=dev)](https://github.com/nkhalili/cashmgr/actions/workflows/ci.yml?query=branch%3Adev) [![Latest Release](https://img.shields.io/github/v/release/nkhalili/cashmgr)](https://github.com/nkhalili/cashmgr/releases/latest)

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
- **Build Tool**: Vite (web)
- **Package Manager**: pnpm
- **Database**: SQLite with platform-specific adapters (OPFS/wasm on web, expo-sqlite on mobile, better-sqlite3 on desktop)

## Getting Started

See [SETUP.md](SETUP.md) for full prerequisites and step-by-step setup.

```bash
pnpm install
pnpm build:packages
pnpm dev:web      # http://localhost:3001
pnpm dev:mobile   # Expo Metro
pnpm dev:desktop  # Electron
```

## Documentation

| Doc | Description |
| --- | ----------- |
| [SETUP.md](SETUP.md) | Prerequisites, install steps, dev server details, and troubleshooting |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contributor guide, code conventions, and PR workflow |
| [ROADMAP.md](ROADMAP.md) | Planned features and product tiers |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data models, schemas, patterns, and file locations |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | End-user feature documentation |
| [docs/ui-patterns.md](docs/ui-patterns.md) | Reusable UI patterns and styling guidelines |
| [docs/environment-configuration.md](docs/environment-configuration.md) | Environment variables and feature flags |

---

## Docker — Web App

Build the web app and serve it with nginx (all commands run from repo root).

```bash
docker compose up --build        # build and start  →  http://localhost:8080
docker compose up                # start (no rebuild)
docker compose down              # stop and remove container
```

---

## License

AGPL-3.0 — see [LICENSE](LICENSE)
