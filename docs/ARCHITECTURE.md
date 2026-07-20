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
| statementDay | number | YES | NULL | 1–31, day of month the statement closes. Credit accounts only |
| paymentDay | number | YES | NULL | 1–31, day of month payment is due. Credit accounts only |
| paymentAccountId | string | YES | NULL | FK → accounts, account auto-payments are drawn from |
| autoPaymentEnabled | boolean | NO | false | Whether auto-pay is turned on for this credit account |
| autoPaymentMode | string | YES | NULL | `full` \| `fixed` — see "Credit Account Statement Cycle" below |
| autoPaymentFixedAmount | number | YES | NULL | Used when `autoPaymentMode = 'fixed'` |
| lastAutoPaymentDate | string | YES | NULL | YYYY-MM-DD, last payment due date auto-pay has processed. Internal bookkeeping, not user-editable |
| createdAt | number | NO | — | Unix timestamp ms |
| updatedAt | number | NO | — | Unix timestamp ms |

Indexes: `idx_accounts_type` on `type`, `idx_accounts_auto_payment` on `autoPaymentEnabled`

Statement/payment fields, `paymentAccountId`, and auto-pay fields are only meaningful when `type = 'credit'`; `validateAccountBusinessRules` (`packages/core/src/validation/schemas.ts`) rejects them on non-credit accounts and clears them server-side (`AccountsService.updateAccount`, duplicated per app) when an account's type changes away from `credit`.

`AccountsService.deleteAccount` (duplicated per app) blocks deletion with a `ValidationError` if any other account references the target as `paymentAccountId` — otherwise deleting a payment account would leave a credit account's auto-pay pointing at a nonexistent account.

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

| recurringTransactionId | string | YES | NULL | FK → recurring_transactions (nullable) |

Indexes: `idx_transactions_account_id`, `idx_transactions_date`, `idx_transactions_type`, `idx_transactions_recurring`

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

### `budgets`

| Field | Type | Nullable | Default | Notes |
| --- | --- | --- | --- | --- |
| id | string | NO | uuid | Primary key |
| categoryId | string | NO | — | FK → categories (ON DELETE CASCADE) |
| amount | number | NO | — | Positive number — the spending limit |
| month | integer | NO | — | 1–12 |
| year | integer | NO | — | Four-digit year |
| isDeleted | boolean | NO | 0 | Soft-delete flag — see Budget Lifecycle below |
| createdAt | number | NO | — | Unix timestamp ms |
| updatedAt | number | NO | — | Unix timestamp ms |

Unique constraint: `(category_id, month, year)` — one budget per category per month.
Indexes: `idx_budgets_period` on `(year, month)`, `idx_budgets_category` on `category_id`, `idx_budgets_active` on `(is_deleted)`

### `recurring_transactions`

| Field | Type | Nullable | Default | Notes |
| --- | --- | --- | --- | --- |
| id | string | NO | uuid | Primary key |
| type | string | NO | — | `income` \| `expense` \| `transfer` |
| amount | number | NO | — | Positive number |
| currency | string | NO | USD | ISO 4217 |
| accountId | string | NO | — | FK → accounts (ON DELETE CASCADE) |
| toAccountId | string | YES | NULL | FK → accounts (transfer only) |
| categoryId | string | YES | NULL | FK → categories |
| notes | string | YES | NULL | |
| frequency | string | NO | — | See `RecurringFrequency` |
| startDate | string | NO | — | YYYY-MM-DD — anchor date for schedule |
| endDate | string | YES | NULL | YYYY-MM-DD — stop generating after this date |
| lastGeneratedDate | string | YES | NULL | YYYY-MM-DD — last date a transaction was created |
| isActive | boolean | NO | true | Deactivated on delete |
| createdAt | number | NO | — | Unix timestamp ms |
| updatedAt | number | NO | — | Unix timestamp ms |

`frequency` values: `daily`, `weekdays`, `weekends`, `weekly`, `biweekly`, `every4weeks`, `monthly`, `last_day_of_month`, `every6months`, `annually`

Indexes: `idx_recurring_active` on `is_active`, `idx_recurring_account` on `account_id`

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
  recurring-transactions-service.ts

apps/mobile/src/services/
  (same structure)
```

**Balance update rules** (enforced by `transactions-service`):

- Income: `+amount` to `accountId`
- Expense: `-amount` from `accountId`
- Transfer: `-amount` from `accountId`, `+amount` to `toAccountId`
- On edit: reverse old effect, apply new effect
- On delete: reverse transaction's effect

### Recurring Transactions

Recurring transactions automate periodic expense/income generation. The feature has three layers:

**Template (`recurring_transactions` table)**
Stores the schedule: frequency, startDate, endDate, lastGeneratedDate. A template is never edited in-place for past dates — only future-dated generated transactions are affected.

**Generation (`RecurringTransactionsService.generateDueTransactions`)**
Called at app startup. For each active template, `getDueOccurrences(frequency, startDate, lastGeneratedDate, endDate, today)` computes all dates between `lastGeneratedDate + 1 day` and today, then `transactionsService.createTransaction` is called for each date. The template's `lastGeneratedDate` is advanced to the last generated date.

Edit/Delete semantics:

- Edit: deletes all generated transactions dated ≥ today and resets `lastGeneratedDate` to yesterday, so they regenerate with the updated template values on next startup.
- Delete: deactivates the template (`isActive = false`) and deletes all generated transactions dated ≥ today.

**`getDueOccurrences` utility** (`packages/core/src/utils/recurring-dates.ts`)
Pure function with no side effects. Used by the service and fully tested independently. Weekly/biweekly/every4weeks anchor from `startDate` to avoid interval drift. Monthly/every6months/annually anchor from `startDate` to preserve the original calendar day (e.g. Jan 31 → Mar 31, not Mar 28 via Feb 28).

**Enabling recurring from Edit Transaction**
The Add Transaction screen has always supported creating a transaction as recurring. Edit Transaction (both apps) now supports two additional cases, both driven by whether `transaction.recurringTransactionId` is set:

- *Not yet recurring*: the same "Make recurring" toggle + frequency/end-date fields as Add Transaction. Saving calls `RecurringTransactionsService.createRecurringTransactionFromExisting(input, anchorDate)`, which creates the template with `startDate = anchorDate` (the transaction's own date) and immediately backfills `lastGeneratedDate = anchorDate` before the caller runs `generateDueTransactions()`. This makes the edited transaction the series' de facto first occurrence without retroactively linking it (`recurringTransactionId` on that transaction is left unset — `UpdateTransactionInput` doesn't support setting it), while still backfilling any gap occurrences between the anchor date and today.
- *Already recurring*: frequency/end date are pre-filled from the linked template (fetched via `getRecurringTransactionById`) and shown without the toggle. Saving a change calls the existing `updateRecurringTransaction`, so the edit/regenerate semantics above apply unchanged.

### Credit Account Statement Cycle & Auto-Pay

Credit accounts (`type = 'credit'`) can optionally track a billing cycle — a statement day and payment day (both day-of-month, 1–31) — and auto-pay themselves from a linked account.

**Balance Payable vs. Outstanding Balance** (`calculateCreditAccountSummary`, `packages/core/src/services/credit-account-utils.ts`)

- **Outstanding Balance** = `max(0, -account.balance)` — the total currently owed (billed + unbilled), read directly from the live, incrementally-maintained `balance` column.
- **Balance Payable** = the debt as of the last closed statement date, minus any payments (transfers into the account) made since. Computed by replaying `initialBalance` plus every transaction touching the account up to `lastStatementDate` (reusing `getAccountBalanceDelta` from `balance-utils.ts`, the same per-transaction math `recalculateBalances` uses), then subtracting later payments. `null` when `statementDay` isn't configured.
- `getMostRecentDayOfMonthOnOrBefore` / `getNextDayOfMonthAfter` (same file) do the day-of-month arithmetic, clamping short months (e.g. day 31 in February → the 28th/29th).

Both apps compose this with a live account/transaction fetch via `getCreditAccountSummaries` (`apps/{web,mobile}/src/services/credit-account-summary.ts`), used by the Accounts page to render the two figures per credit account (gated by the "show balance payable / outstanding balance" setting — see `credit-display-context.tsx` in each app, persisted the same way as theme preference).

**Auto-Pay (`CreditAutoPaymentService.processDuePayments`, duplicated per app like `RecurringTransactionsService`)**
There is no background scheduler in this app — auto-pay follows the exact same "catch-up on app open" pattern as recurring transactions: called once during `ServicesProvider` init, right after `recurringTransactionsService.generateDueTransactions()`. For each credit account with `autoPaymentEnabled` and all of `statementDay`/`paymentDay`/`paymentAccountId` set:

1. Compute the most recent payment due date on or before today. Skip if `lastAutoPaymentDate` already covers it (bookkeeping field, mirrors `RecurringTransaction.lastGeneratedDate`).
2. Compute Balance Payable as of that due date's preceding statement.
3. Pay the full amount, or a fixed amount capped at what's owed, depending on `autoPaymentMode`.
4. Create the payment via the existing `TransactionsService.createTransaction({ type: 'transfer', accountId: paymentAccountId, toAccountId: creditAccountId, notes: 'Payment', ... })` — reuses the existing transfer + balance-update logic untouched. (`Transaction` has no `description` column — see the `transactions` table above — so `notes` is the field used.)
5. Stamp `lastAutoPaymentDate` to prevent reprocessing, even when nothing was owed.

Errors are non-fatal (logged via `ErrorHandler`, loop continues), matching `generateDueTransactions`'s error handling.

### Export / Import Service

`packages/core/src/services/export-service.ts` and `import-service.ts` implement backup/restore. Both are platform-agnostic and receive a `DatabaseAdapter` — no platform code needed.

#### Backup format (`ExportBackup`, schema version 5)

```typescript
{
  metadata: {
    appName: 'CashMgr',
    version: string,        // app semver
    schemaVersion: 5,       // bumped when shape changes
    exportDate: string,     // ISO 8601
    platform: string,
  },
  data: {
    accounts:       Account[],
    categories:     Category[],
    currencies:     Currency[],
    transactions:   Transaction[],
    budgets:        Budget[],         // active rows only
    deletedBudgets: Budget[],         // effective tombstones only
    settings:       Record<string, string>,
  },
}
```

`deletedBudgets` contains at most one row per category — the most-recent deleted row where it is also the most-recent row for that category (see [Budget Lifecycle](#budget-lifecycle-soft-delete-and-carry-forward)). This keeps backup size bounded by category count, not month count.

#### Import modes

| Mode | Behaviour |
| --- | --- |
| **replace** | Clears all existing data, imports backup, recalculates account balances from transactions |
| **merge** | Keeps existing data; overwrites only if the backup's `updatedAt` is newer; skips duplicate transactions |

#### `DatabaseAdapter` methods used

- `getAllBudgets()` — returns all active budget rows across all periods
- `getEffectiveTombstones()` — returns the effective tombstone set (at most one per category)
- `bulkUpsert(data: BulkUpsertData)` — atomic batch write used by both modes

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

### Budget Lifecycle (Soft-Delete and Carry-Forward)

Budgets use a soft-delete pattern to support automatic monthly carry-forward without losing history.

#### `is_deleted` flag

Rows are never physically removed. Instead, `is_deleted = 1` marks a row as a *tombstone*. All read queries filter `AND is_deleted = 0`. A tombstone for period P acts as a *stop signal* — it blocks carry-forward propagation for that category past P.

#### Auto carry-forward

`getBudgetsWithProgress(month, year)` (service layer, current/future months only) calls `getBudgetDefaults(month, year)` first. That query finds the most-recent prior active row per category that has no existing row (active or deleted) for the requested period. The service then calls `createBudget` for each result, creating rows on demand — one month at a time, only when navigated to.

#### Tombstone reactivation

`createBudget` checks for a soft-deleted row matching `(categoryId, month, year)` before inserting. If found, it reactivates the existing row (`is_deleted = 0`, new amount) instead of inserting a duplicate. This preserves the unique constraint.

#### Cascade delete

Deleting a budget soft-deletes the target row *and* all future active rows for the same category:

```sql
UPDATE budgets SET is_deleted = 1
WHERE category_id = ? AND is_deleted = 0
  AND (year * 12 + month) > (? * 12 + ?)
```

This cleans up already-created future rows so they disappear immediately without waiting for the stop-signal to take effect.

#### Cascade create (resume)

Creating or reactivating a budget for month M clears all future tombstones for the same category *and* updates their amounts to match:

```sql
UPDATE budgets SET is_deleted = 0, amount = ?
WHERE category_id = ? AND is_deleted = 1
  AND (year * 12 + month) > (? * 12 + ?)
```

This resumes carry-forward from M with the new amount, restoring all future months in one operation.

#### Period math

`year * 12 + month` is used as an ordinal throughout — both in SQL expressions and in-memory mock logic — to compare calendar periods without date parsing.

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
  recurring-transactions-repository.ts
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
