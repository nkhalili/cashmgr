# Project Structure

Complete folder tree of the Cash Mgr monorepo:

```text
cashmgr/
│
├── Root Configuration
│   ├── package.json                    # Monorepo root with workspace scripts
│   ├── pnpm-workspace.yaml            # pnpm workspace definition
│   ├── tsconfig.json                  # Base TypeScript configuration
│   ├── .eslintrc.json                 # ESLint configuration
│   ├── .prettierrc.json               # Prettier configuration
│   ├── .gitignore                     # Git ignore patterns
│   └── README.md                      # Main documentation
│
├── apps/
│   │
│   ├── web/                           # React + Vite + TypeScript Web App
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx      # Dashboard with balance cards
│   │   │   │   ├── AddTransaction.tsx # Transaction form
│   │   │   │   ├── Accounts.tsx       # Accounts list
│   │   │   │   ├── Categories.tsx     # Categories management
│   │   │   │   └── Settings.tsx       # Settings page
│   │   │   ├── App.tsx                # Main app component with routing
│   │   │   ├── App.css                # App styles
│   │   │   ├── main.tsx               # Entry point
│   │   │   └── index.css              # Global styles
│   │   ├── index.html                 # HTML template
│   │   ├── vite.config.ts             # Vite configuration
│   │   ├── package.json               # Web app dependencies
│   │   ├── tsconfig.json              # TypeScript config
│   │   └── README.md                  # Web app documentation
│   │
│   ├── desktop/                       # Electron Desktop App
│   │   ├── src/
│   │   │   ├── main.ts                # Electron main process
│   │   │   ├── preload.ts             # IPC bridge & context isolation
│   │   │   └── database.ts            # better-sqlite3 wrapper
│   │   ├── package.json               # Desktop app dependencies
│   │   ├── tsconfig.json              # TypeScript config (CommonJS)
│   │   └── README.md                  # Desktop app documentation
│   │
│   └── mobile/                        # React Native + Expo Mobile App
│       ├── app/
│       │   ├── (tabs)/                # Tab-based navigation
│       │   │   ├── _layout.tsx        # Tab layout
│       │   │   ├── index.tsx          # Home screen with balance cards
│       │   │   ├── add.tsx            # Add transaction screen
│       │   │   ├── accounts.tsx       # Accounts screen
│       │   │   └── settings.tsx       # Settings screen
│       │   └── _layout.tsx            # Root layout
│       ├── src/
│       │   └── database/
│       │       └── index.ts           # expo-sqlite wrapper
│       ├── app.json                   # Expo configuration
│       ├── babel.config.js            # Babel configuration
│       ├── package.json               # Mobile app dependencies
│       ├── tsconfig.json              # TypeScript config
│       └── README.md                  # Mobile app documentation
│
├── packages/
│   │
│   ├── core/                          # Shared Business Logic
│   │   ├── src/
│   │   │   ├── models/
│   │   │   │   ├── Transaction.ts     # Transaction model & types
│   │   │   │   ├── Account.ts         # Account model & types
│   │   │   │   └── Category.ts        # Category model & types
│   │   │   ├── types/
│   │   │   │   └── index.ts           # Shared TypeScript types
│   │   │   ├── utils/
│   │   │   │   ├── date.ts            # Date utility functions
│   │   │   │   └── format.ts          # Formatting utilities
│   │   │   ├── constants/
│   │   │   │   └── index.ts           # Application constants
│   │   │   ├── db/
│   │   │   │   └── database-adapter.ts # Database adapter interface
│   │   │   └── index.ts               # Package exports
│   │   ├── dist/                      # Build output (generated)
│   │   ├── package.json               # Core package config
│   │   ├── tsconfig.json              # TypeScript config
│   │   └── README.md                  # Core package documentation
│   │
│   ├── db/                            # Database Layer
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   └── index.ts           # SQLite schema definitions
│   │   │   ├── migrations/
│   │   │   │   └── index.ts           # Migration system (placeholder)
│   │   │   ├── init/
│   │   │   │   └── index.ts           # Database initialization
│   │   │   └── index.ts               # Package exports
│   │   ├── dist/                      # Build output (generated)
│   │   ├── package.json               # DB package config
│   │   ├── tsconfig.json              # TypeScript config
│   │   └── README.md                  # DB package documentation
│   │
│   └── ui/                            # Shared UI Components
│       ├── src/
│       │   ├── Button.tsx             # Button component
│       │   ├── Input.tsx              # Input component
│       │   ├── Card.tsx               # Card component
│       │   └── index.ts               # Package exports
│       ├── dist/                      # Build output (generated)
│       ├── package.json               # UI package config
│       ├── tsconfig.json              # TypeScript config
│       └── README.md                  # UI package documentation
│
└── STRUCTURE.md                       # This file
```

## Key Files Overview

### Root Configuration Files

| File | Purpose |
| --- | --- |
| `package.json` | Monorepo configuration with workspace scripts |
| `pnpm-workspace.yaml` | Defines workspace packages |
| `tsconfig.json` | Base TypeScript configuration |
| `.eslintrc.json` | Linting rules |
| `.prettierrc.json` | Code formatting rules |
| `.gitignore` | Git ignore patterns for all platforms |

### Package Dependencies

```text
apps/web     → depends on → core, db, ui
apps/desktop → depends on → core, db
apps/mobile  → depends on → core, db
packages/db  → depends on → core
packages/ui  → depends on → core
packages/core → no dependencies (base package)
```

### Build Order

1. `@cashmgr/core` (build first - no dependencies)
2. `@cashmgr/db` and `@cashmgr/ui` (depend on core)
3. Apps (depend on packages)

### Scripts Available

From root directory:

```bash
# Development
pnpm dev:web              # Start web app on localhost:3000
pnpm dev:desktop          # Start Electron desktop app
pnpm dev:mobile           # Start Expo mobile app

# Building
pnpm build:web            # Build web app
pnpm build:desktop        # Build desktop app
pnpm build:mobile         # Build mobile app
pnpm build:all            # Build everything

# Quality
pnpm lint                 # Run ESLint
pnpm format               # Format code with Prettier
pnpm typecheck            # Type check all packages
```

### Database Configuration

| Platform | Library | Storage Location |
| --- | --- | --- |
| Web | @sqlite.org/sqlite-wasm | OPFS (Origin Private File System) |
| Desktop | better-sqlite3 | User data directory |
| Mobile | expo-sqlite | App documents directory |

All platforms share the same schema defined in `packages/db/src/schema`.

## Architecture Notes

- **Offline-First**: No cloud backend, all data stored locally
- **Type Safety**: Full TypeScript coverage across all packages
- **Code Sharing**: Business logic in `core`, shared by all apps
- **Platform-Specific**: Database adapters for each platform
- **Monorepo**: Single repository with multiple packages
- **Workspace**: pnpm workspaces for efficient dependency management
