# CashMgr Architecture

## Overview

CashMgr is a **local-first, offline personal finance app** with no required backend or cloud service. All data lives in SQLite on-device. The same domain logic runs on web, mobile, and desktop.

```text
UI (Web / Mobile / Desktop)
   ↓
Services (business logic)
   ↓
DatabaseAdapter (interface)
   ↓
Platform SQLite Adapter
   ↓
SQLite
```

---

## Monorepo Structure

| Package | Purpose |
| --- | --- |
| `packages/core` | Shared types, models, Zod schemas, utilities, services |
| `packages/db` | Repositories, DatabaseAdapter interface, migrations |
| `packages/ui` | Shared UI components and theming |
| `apps/web` | Next.js web app |
| `apps/mobile` | Expo / React Native mobile app |

---

## Data Models & Database Schema

All dates are stored as `YYYY-MM-DD` strings (not timestamps) to avoid timezone issues.

### `accounts`

| Field | Type | Nullable | Default | Notes |
| --- | --- | --- | --- | --- |
| id | string | NO | uuid | Primary key |
| name | string | NO | — | Max 100 chars |
| type | string | NO | — | `cash` \| `bank` \| `credit` |
| initialBalance | number | NO | 0 | |
| balance | number | NO | 0 | Auto-updated by service layer |
| currency | string | NO | USD | 3-letter ISO 4217 code |
| createdAt | number | NO | — | Unix timestamp ms |
| updatedAt | number | NO | — | Unix timestamp ms |

Indexes: `idx_accounts_type` on `type`

### `transactions`

| Field | Type | Nullable | Default | Notes |
| --- | --- | --- | --- | --- |
| id | string | NO | uuid | Primary key |
| type | string | NO | — | `income` \| `expense` \| `transfer` |
| amount | number | NO | — | Positive number |
| currency | string | NO | — | ISO 4217 |
| date | string | NO | — | YYYY-MM-DD |
| accountId | string | NO | — | FK → accounts |
| toAccountId | string | YES | NULL | FK → accounts (transfer only) |
| categoryId | string | YES | NULL | FK → categories |
| description | string | NO | — | 1–255 chars |
| notes | string | YES | NULL | Up to 1000 chars |
| createdAt | number | NO | — | Unix timestamp ms |
| updatedAt | number | NO | — | Unix timestamp ms |

Indexes: `idx_transactions_account_id`, `idx_transactions_date`, `idx_transactions_type`

### `categories`

| Field | Type | Nullable | Default | Notes |
| --- | --- | --- | --- | --- |
| id | string | NO | uuid | Primary key |
| name | string | NO | — | |
| type | string | NO | — | `income` \| `expense` |
| color | string | YES | NULL | Hex color |
| icon | string | YES | NULL | Emoji |
| parentId | string | YES | NULL | FK → categories (max 1 level deep) |
| isActive | boolean | NO | true | |
| createdAt | number | NO | — | Unix timestamp ms |
| updatedAt | number | NO | — | Unix timestamp ms |

### `currencies`

| Field | Type | Nullable | Default | Notes |
| --- | --- | --- | --- | --- |
| id | string | NO | — | ISO 4217 code (primary key) |
| name | string | NO | — | Full currency name |
| symbol | string | NO | — | Display symbol |
| isPrimary | boolean | NO | false | Only one can be primary |
| exchangeRate | number | NO | 1.0 | Relative to primary currency |
| lastUpdated | number | NO | — | Unix timestamp ms |
| isActive | boolean | NO | true | |
| createdAt | number | NO | — | Unix timestamp ms |
| updatedAt | number | NO | — | Unix timestamp ms |

### `settings`

| Field | Type | Notes |
| --- | --- | --- |
| key | string | Primary key |
| value | string | JSON-encoded value |
| updatedAt | number | Unix timestamp ms |

### `schema_migrations`

| Field | Type | Notes |
| --- | --- | --- |
| version | integer | Migration version number |
| applied_at | text | ISO timestamp |

---

## Key Architecture Patterns

### DatabaseAdapter Interface

All database access goes through `DatabaseAdapter` (in `packages/db/src/adapters/database-adapter.ts`). Services depend only on this interface — never on concrete repositories or platform adapters. This makes services testable and enables future cloud sync by swapping the adapter.

```text
packages/db/src/adapters/
  database-adapter.ts         ← interface
  web-database-adapter.ts     ← OPFS via WASM Worker (Comlink)
  mobile-database-adapter.ts  ← expo-sqlite
```

### Service Layer

Services live in `apps/<platform>/src/services/` and contain all business logic. They receive a `DatabaseAdapter` via dependency injection through `ServicesContext`.

```text
apps/web/src/services/
  accounts-service.ts
  transactions-service.ts
  categories-service.ts
  currencies-service.ts
  dashboard-service.ts

apps/mobile/src/services/
  (same structure)
```

**Balance update rules** (enforced by `transactions-service`):

- Income: `+amount` to `accountId`
- Expense: `-amount` from `accountId`
- Transfer: `-amount` from `accountId`, `+amount` to `toAccountId`
- On edit: reverse old effect, apply new effect
- On delete: reverse transaction's effect

### Validation

All input validation uses **Zod schemas** from `packages/core/src/validation/schemas.ts`. Validation runs in the service layer before any database operation. Errors are thrown as `ValidationError` (a subclass of `AppError`).

### Error Handling

Typed error hierarchy in `packages/core/src/errors/`:

```text
AppError
  ├── ValidationError   ← Zod validation failures
  ├── DatabaseError     ← SQLite/adapter errors
  └── NotFoundError     ← Entity not found
```

Use `ErrorHandler.handle()` for consistent logging. React `ErrorBoundary` is used at the UI level.

### Migration System

Database migrations are in `packages/db/src/migrations/`. Each migration implements `{ version, up: string, down: string }`. The runner tracks applied versions in `schema_migrations` and runs pending migrations on app startup.

### Date Handling

- **Storage format**: `YYYY-MM-DD` string (never timestamps for dates)
- **No timezone issues**: string comparison works correctly for date ranges
- **Helper functions** in `packages/core/src/utils/date.ts`:
  - `getTodayDateString()` — today in local timezone as YYYY-MM-DD
  - `toDateString(date)` — convert Date object to YYYY-MM-DD
  - `formatDate(dateString)` — format for display
  - `getMonthStartDateString()` / `getMonthEndDateString()`
- **Validation** in `packages/core/src/utils/date-validation.ts`:
  - `validateAndCorrectDate()` — auto-corrects to YYYY-MM-DD
  - Supports YYYY-MM-DD, MM/DD/YYYY, DD.MM.YYYY input formats
  - Validates leap years and month lengths

### Query Builder Utilities

`packages/db/src/utils/query-builder.ts` provides:

- `buildWhereClause(conditions)` — compose WHERE clauses from `{ clause, params }` arrays
- `buildUpdateClause(updates, withTimestamp?)` — generate SET clauses with auto `updatedAt`
- `buildLimitClause(limit?, offset?)` — pagination

---

## Repository Layer

```text
packages/db/src/repositories/
  accounts-repository.ts
  transactions-repository.ts        ← includes filtering, pagination
  transactions-aggregation.ts       ← dashboard aggregations
  categories-repository.ts
  currencies-repository.ts
  settings-repository.ts
```

Tests are co-located in `__tests__/` next to each repository, using in-memory SQLite.

---

## Platform-Specific Notes

### Web (`apps/web`)

- Vite + React (React Router)
- SQLite via `@sqlite.org/sqlite-wasm` + OPFS (`apps/web/src/database/`)
- React Router for navigation
- Settings is a navigation menu — each section (`/settings/currencies`, `/settings/appearance`, etc.) is a separate route and page component under `apps/web/src/pages/`
- `useTransactionFilters` hook syncs filter state to URL params
- `useDebounce` hook (300ms) for search inputs

### Mobile (`apps/mobile`)

- Expo / React Native
- `expo-sqlite` for local database
- Expo Router (file-based routing)
- Settings is a navigation menu — each section (`settings-currencies`, `settings-appearance`, etc.) is a separate screen at the root of `apps/mobile/app/`
- `useFocusEffect` from `@react-navigation/native` for data reload on tab focus
- Modal-based selectors (not native Picker) for better UX
- Jest for testing (not Vitest — React Native compatibility)

---

## Testing

| Package | Framework | Coverage |
| --- | --- | --- |
| `packages/core` | Vitest | utilities, validation, models |
| `packages/db` | Vitest + in-memory SQLite | all repositories |
| `apps/web` | Vitest | service layer |
| `apps/mobile` | Jest | service layer, components |

Run all tests: `pnpm test`
Run with coverage: `pnpm test:coverage`

Files excluded from coverage (untestable in current environment):

- `apps/web/src/database/**` — browser WASM/OPFS
- `apps/web/src/hooks/**` — React hooks
- `packages/db/src/adapters/**` — platform SQLite adapters

See [CONTRIBUTING.md](../CONTRIBUTING.md) for test patterns, checklists, and examples.

---

## Design Decisions

### Explicitly Out of Scope

- **No social or group features** — group expense sharing, multi-user coordination, and shared accounts are permanently out of scope. This is a personal finance tool; adding multi-user complexity would undermine its simplicity.
- **No backend or cloud sync (v1)** — all data stays on-device. No authentication, no remote APIs, no push notifications. Cloud sync is a future paid feature.
- **No ads, trackers, or data selling** — ever.
- **No financial advice or investment recommendations** — this is a tracker, not an advisor.

---

## Future Features

See [ROADMAP.md](../ROADMAP.md) for planned features and their descriptions.
