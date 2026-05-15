# GitHub Copilot Instructions for CashMgr

CashMgr is an **offline-first personal finance manager** built as a TypeScript monorepo targeting web (React + Vite), mobile (Expo + React Native), and desktop (Electron). There is no backend; all data lives in platform-specific SQLite adapters.

---

## Monorepo Layout

```
cashmgr/
├── packages/
│   ├── core/     # Platform-agnostic models, Zod schemas, errors, utilities
│   ├── db/       # DatabaseAdapter interface, repositories, migrations
│   └── ui/       # Shared React components and design-token theme
├── apps/
│   ├── web/      # React Router + Vite + sqlite-wasm (OPFS Web Worker)
│   ├── mobile/   # Expo Router + expo-sqlite
│   └── desktop/  # Electron wrapping web + better-sqlite3
└── docs/         # ARCHITECTURE.md, ui-patterns.md, USER_GUIDE.md
```

Package manager: **pnpm**. Internal packages are imported as `@cashmgr/core`, `@cashmgr/db`, `@cashmgr/ui`.

---

## Hard Architectural Rules

### 1. Services Use DatabaseAdapter, Never Repositories Directly

Services live in `apps/<platform>/src/services/` and receive a `DatabaseAdapter` (defined in `packages/core/src/db/database-adapter.ts`) via constructor injection. They must **never** import repository classes directly. This keeps services testable without a real database and allows future cloud-sync by swapping the adapter.

```ts
// CORRECT
export class AccountsService {
  constructor(private db: DatabaseAdapter) {}
}

// WRONG — never do this in a service
import { AccountsRepository } from '@cashmgr/db';
```

### 2. Validate All External Input with Zod

Every service method that accepts external input must validate it with a Zod schema from `packages/core/src/validation/schemas.ts` **before** calling the adapter.

```ts
import { CreateAccountSchema } from '@cashmgr/core';

async createAccount(input: unknown) {
  const data = CreateAccountSchema.parse(input); // throws ValidationError on failure
  return this.db.accounts.create(data);
}
```

### 3. Error Handling via ErrorHandler

- Never use `console.error` or throw raw errors.
- Wrap every adapter call: `ErrorHandler.handle(error, 'ServiceName.methodName')`.
- The error hierarchy is `AppError → ValidationError | DatabaseError | NotFoundError` (all in `packages/core/src/errors/`).

### 4. Never Modify Existing Migrations

Schema changes go in `packages/db/src/migrations/` as new numbered files. Each migration has `{ version: number, up: string, down: string }`. The `schema_migrations` table tracks applied versions.

### 5. Keep `packages/core` Platform-Agnostic

No Expo, browser, or Node-only APIs inside `packages/core`. It must run in all three environments.

---

## Date Handling

All dates are stored and passed as **`YYYY-MM-DD` strings**. Never use `Date` objects or Unix timestamps for business-logic dates.

Use helpers from `@cashmgr/core`:

```ts
import { getTodayDateString, toDateString, formatDate, validateAndCorrectDate } from '@cashmgr/core';
```

In the UI, always use the `DateInput` component — `@cashmgr/ui` on web/desktop, `apps/mobile/src/components/DateInput.tsx` on mobile.

---

## Transaction Balance Rules

Applied in `TransactionsService`:

| Type | Effect |
|---|---|
| `income` | `+amount` to `accountId` |
| `expense` | `-amount` from `accountId` |
| `transfer` | `-amount` from `accountId`, `+amount` to `toAccountId` |
| Edit | Reverse old effect, apply new effect |
| Delete | Reverse the transaction's effect |

---

## TypeScript Conventions

- Strict mode is on (`strict: true`). No implicit `any`.
- Use `import type { Foo }` for type-only imports.
- Target ES2020, module resolution: `bundler`, JSX: `react-jsx` (no `React` import needed).
- `noUnusedLocals` and `noUnusedParameters` are enforced.

**Import order** (enforced by ESLint):

1. External packages (`react`, `zod`, …)
2. Internal monorepo packages (`@cashmgr/core`, `@cashmgr/db`, `@cashmgr/ui`)
3. Relative imports (`../utils/format`)

---

## File & Component Naming

| Thing | Convention | Example |
|---|---|---|
| Utilities / services / repositories | kebab-case | `accounts-service.ts` |
| React components | PascalCase | `TransactionList.tsx` |
| Test files | co-located `__tests__/` | `__tests__/accounts-service.test.ts` |

---

## UI Patterns

Always read `docs/ui-patterns.md` before writing UI code. Key patterns:

**Period Navigator** — left/right buttons + centered label for month/year navigation. Circular 36×36 px buttons, `theme.colors.surface` background, 18 px border radius. Used on Transactions (month) and Dashboard (year) screens.

**Shared components** (`@cashmgr/ui`): `Button`, `Input`, `Card`, `DateInput`, `Tabs`, `Badge`, `ListItem`, `Modal`, `EmptyState`, `ErrorBoundary`. Use these before creating new primitives.

**Mobile-specific**:
- Use `useFocusEffect` (not `useEffect`) to reload data when a tab is focused.
- Use modal-based selectors instead of native `Picker`.
- Debounce search inputs at 300 ms to prevent focus loss.

**Web-specific**:
- Use `useTransactionFilters` hook to sync filter state to URL params.
- Use `useDebounce` (300 ms) for search inputs.

---

## Service Layer Shape

```ts
class FooService {
  constructor(private db: DatabaseAdapter) {}

  async getItems(): Promise<Foo[]> { ... }
  async getItemById(id: string): Promise<Foo> { ... }
  async createItem(input: unknown): Promise<Foo> { ... }
  async updateItem(input: unknown): Promise<Foo> { ... }
  async deleteItem(id: string): Promise<void> { ... }
}
```

Services are provided to the UI via `ServicesContext` in each app (`apps/<platform>/src/services/services-context.tsx`).

---

## Testing

| Layer | Framework | Pattern |
|---|---|---|
| Repositories | Vitest | In-memory SQLite (`:memory:`), run migrations in `beforeEach` |
| Services | Vitest (web) / Jest (mobile) | Mock `DatabaseAdapter` with `vi.fn()` / `jest.fn()` |
| Components | — | Not currently tested |

Coverage is excluded for browser WASM/OPFS code, React hooks, and platform SQLite adapters.

---

## Code Style

Prettier (`.prettierrc.json`):
- Line width: 100
- Indentation: 2 spaces
- Semicolons: true
- Trailing commas: `es5`
- Single quotes
- LF line endings

ESLint: TypeScript + React + React Hooks plugins. Unused vars warn unless prefixed with `_`.

Comments: Only write a comment when the **why** is non-obvious. Never describe what the code does.

---

## Common Commands

```sh
pnpm test              # run all tests
pnpm test:coverage     # with coverage
pnpm typecheck         # TypeScript check all packages
pnpm lint              # ESLint
pnpm format            # Prettier
pnpm dev:web           # web dev server
pnpm dev:mobile        # Expo dev server
pnpm dev:desktop       # Electron dev
pnpm build:all         # build everything
```

---

## What Is Out of Scope (Do Not Suggest)

- Multi-user or group features
- Cloud sync (v1 is local-only)
- Analytics, ads, or user tracking
- Financial advice or investment recommendations

---

## Documentation Updates

After any feature change, update the relevant docs:

| Change | Update |
|---|---|
| Data models / schemas | `docs/ARCHITECTURE.md` |
| User-facing features | `docs/USER_GUIDE.md` |
| UI patterns | `docs/ui-patterns.md` |
| Roadmap items shipped | `docs/ROADMAP.md` |
| Env vars | `docs/environment-configuration.md` |
