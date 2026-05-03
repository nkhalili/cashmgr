# Contributing to CashMgr

Thank you for your interest in contributing. This document covers how to set up the project, the patterns and conventions you must follow, and the workflow for submitting changes.

> **AI tools:** This document is the primary context for code generation. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for data models, schemas, and file locations.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Architecture Rules](#architecture-rules)
5. [Code Conventions](#code-conventions)
6. [Testing](#testing)
7. [Adding a Feature or Fixing a Bug](#adding-a-feature-or-fixing-a-bug)
8. [Updating Documentation](#updating-documentation)
9. [Submitting a Pull Request](#submitting-a-pull-request)

---

## Getting Started

**Prerequisites:** Node.js ≥ 18, pnpm ≥ 8

```bash
# Clone and install
git clone <repo-url>
cd cashmgr-app
pnpm install

# Run the web app
pnpm dev:web

# Run the mobile app
pnpm dev:mobile

# Run tests
pnpm test

# Typecheck all packages
pnpm typecheck
```

---

## Project Structure

See [STRUCTURE.md](STRUCTURE.md) for the full folder tree and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for data models, schemas, and key file locations.

---

## Development Workflow

### Commands

```bash
# Start dev servers
pnpm dev:web
pnpm dev:mobile

# Typecheck
pnpm typecheck
pnpm --filter @cashmgr/core typecheck
pnpm --filter @cashmgr/web typecheck
pnpm --filter @cashmgr/mobile typecheck

# Tests
pnpm test
pnpm test:coverage

# Per-package tests
pnpm --filter @cashmgr/core test:coverage
pnpm --filter @cashmgr/db test:coverage
pnpm --filter @cashmgr/web test:coverage
pnpm --filter @cashmgr/mobile test:coverage

# Build
pnpm build:packages
pnpm build:web
pnpm build:mobile
```

### Before Opening a PR

```bash
pnpm test        # all tests must pass
pnpm typecheck   # no type errors
```

---

## Architecture Rules

These are hard requirements. PRs that violate them will not be merged.

### 1. Services Must Use DatabaseAdapter — Not Repositories

All services depend on the `DatabaseAdapter` interface from `@cashmgr/core`. Never import repository classes directly in services.

```typescript
// ✅ Correct
import type { DatabaseAdapter } from '@cashmgr/core';

export class MyService {
  constructor(private readonly adapter: DatabaseAdapter) {}

  async getItems() {
    return this.adapter.getItems();
  }
}
```

```typescript
// ❌ Wrong — never import repositories in services
import { ItemsRepository } from '@cashmgr/db';

export class MyService {
  constructor(private readonly repo: ItemsRepository) {}
}
```

**Why:** Services must stay platform-agnostic. The adapter pattern allows swapping implementations (e.g. local SQLite → cloud sync) without touching service code.

---

### 2. Validate All Inputs with Zod

Every service method that accepts external input must validate it using a Zod schema from `packages/core/src/validation/schemas.ts` before calling the adapter.

```typescript
// ✅ Correct
import { CreateAccountInputSchema } from '@cashmgr/core';

async createAccount(input: CreateAccountInput): Promise<Account> {
  const validated = CreateAccountInputSchema.parse(input);
  return this.adapter.createAccount(validated);
}
```

```typescript
// ❌ Wrong — no validation
async createAccount(input: CreateAccountInput): Promise<Account> {
  return this.adapter.createAccount(input);
}
```

**Why:** Catch invalid data at the service boundary with clear error messages before it reaches the database.

---

### 3. Use ErrorHandler for All Errors

Never use `console.error` or throw raw errors. Wrap all adapter calls with `ErrorHandler.handle()`.

```typescript
// ✅ Correct
import { ErrorHandler } from '@cashmgr/core';

async getItems(): Promise<Item[]> {
  try {
    return await this.adapter.getItems();
  } catch (error) {
    throw ErrorHandler.handle(error, 'MyService.getItems');
  }
}
```

```typescript
// ❌ Wrong
async getItems(): Promise<Item[]> {
  try {
    return await this.adapter.getItems();
  } catch (error) {
    console.error('Failed:', error);
    throw error;
  }
}
```

---

### 4. Schema Changes Must Be Migrations

Never modify existing migration files. Add a new numbered migration file in `packages/db/src/migrations/`.

Each migration must implement:

```typescript
{
  version: number,
  up: string,    // SQL to apply
  down: string,  // SQL to reverse
}
```

---

### 5. Keep `packages/core` Platform-Agnostic

No platform-specific imports (`expo-*`, browser APIs, Node.js APIs) are allowed in `packages/core`. It must work in all environments.

---

## Code Conventions

### File Naming

- Kebab-case for all files: `accounts-repository.ts`, `transactions-service.ts`
- PascalCase for React components: `TransactionList.tsx`

### Imports

```typescript
// Group in this order:
// 1. External packages
import { z } from 'zod';
import React from 'react';

// 2. Internal packages
import type { Account } from '@cashmgr/core';
import { ErrorHandler } from '@cashmgr/core';

// 3. Relative imports
import { formatAmount } from '../utils/format';
```

### TypeScript

- Explicit types everywhere — no implicit `any`
- Use `type` imports for type-only imports: `import type { Account }`
- No magic numbers or strings — use named constants

### Date Handling

All dates are stored and passed as `YYYY-MM-DD` strings — never as timestamps or `Date` objects.

```typescript
// ✅ Correct — use helpers from @cashmgr/core
import { getTodayDateString, toDateString, formatDate } from '@cashmgr/core';

const today = getTodayDateString();         // '2026-03-07'
const str = toDateString(new Date());       // '2026-03-07'
const display = formatDate('2026-03-07');   // 'Mar 7, 2026'
```

For date input UI components:

- **Web/Desktop:** use `DateInput` from `@cashmgr/ui`
- **Mobile:** use `DateInput` from `apps/mobile/src/components/DateInput.tsx`

Both provide a calendar picker + text input that accepts YYYY-MM-DD, MM/DD/YYYY, or DD.MM.YYYY and auto-corrects.

### Mobile-Specific

- Use `useFocusEffect` (not `useEffect`) for loading data on tab focus
- Use modal-based selectors instead of native `Picker` components
- Debounce search inputs (300ms) to prevent focus loss while typing

---

## Testing

Every feature must have corresponding tests. This is not optional.

### When to Write Tests

| Change | Where to add tests |
| --- | --- |
| New/modified repository | `packages/db/src/repositories/__tests__/<name>-repository.test.ts` |
| New/modified service | `apps/<web\|mobile>/src/services/__tests__/<name>-service.test.ts` |
| New/modified core utility | `packages/core/src/__tests__/<name>.test.ts` |
| Bug fix | Add a regression test that would have caught the bug |

### Test Frameworks

- **`packages/core`, `packages/db`, `apps/web`** — Vitest
- **`apps/mobile`** — Jest (React Native compatibility)

### Repository Test Pattern

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '@cashmgr/db';
import { AccountsRepository } from '../accounts-repository';

describe('AccountsRepository', () => {
  let db: Database.Database;
  let repo: AccountsRepository;

  beforeEach(async () => {
    db = new Database(':memory:');
    await runMigrations(db);
    repo = new AccountsRepository(db);
  });

  it('creates and retrieves an account', async () => {
    const account = await repo.create({ name: 'Wallet', type: 'cash' });
    const found = await repo.findById(account.id);
    expect(found?.name).toBe('Wallet');
  });
});
```

### Service Test Pattern

Service tests use a `MockDatabaseAdapter` — no real database required.

```typescript
import { describe, expect, it, vi } from 'vitest';
import { AccountsService } from '../accounts-service';

const mockAdapter = {
  getAccounts: vi.fn().mockResolvedValue([]),
  createAccount: vi.fn(),
  // ...
};

describe('AccountsService', () => {
  const service = new AccountsService(mockAdapter as any);

  it('returns accounts from adapter', async () => {
    mockAdapter.getAccounts.mockResolvedValueOnce([{ id: '1', name: 'Wallet' }]);
    const result = await service.getAccounts();
    expect(result).toHaveLength(1);
  });
});
```

### Coverage Exclusions

These files are excluded from coverage requirements (untestable in current environment):

- `apps/web/src/database/**` — browser WASM/IndexedDB
- `apps/web/src/hooks/**` — React hooks
- `packages/db/src/adapters/**` — platform SQLite adapters

### Checklist Before Committing

- [ ] Tests added or updated for every changed file
- [ ] `pnpm test` passes
- [ ] `pnpm typecheck` passes
- [ ] Relevant docs updated (see [Updating Documentation](#updating-documentation) below)

---

## Adding a Feature or Fixing a Bug

### For New Features

1. Check `docs/specs/` for an existing spec. If one exists, follow it.
2. If no spec exists, discuss the feature in an issue before implementing.
3. Follow the [Architecture Rules](#architecture-rules) above.
4. Use `docs/templates/service-template.ts` as a starting point for new services.

### For Bug Fixes

1. Write a failing test that reproduces the bug first.
2. Fix the bug.
3. Confirm the test now passes.
4. Check that no other tests broke.

### New Service Checklist

- [ ] Extends `DatabaseAdapter` interface if new methods are needed
- [ ] New adapter methods added to all platform adapters (web + mobile)
- [ ] Zod schema created in `packages/core/src/validation/schemas.ts`
- [ ] Service validates all inputs before calling adapter
- [ ] Service wraps all adapter calls with `ErrorHandler.handle()`
- [ ] Unit tests added for all service methods
- [ ] Migration added if new database tables or columns are needed

---

## Updating Documentation

Every feature or bug fix may require doc updates. Use this table to decide what to touch:

| Doc | Update when… |
| --- | --- |
| [README.md](README.md) | Tech stack, database adapters, or top-level scripts change |
| [SETUP.md](SETUP.md) | Prerequisites, install steps, or dev server behaviour change |
| [STRUCTURE.md](STRUCTURE.md) | Files, folders, or package dependencies are added/removed |
| [ROADMAP.md](ROADMAP.md) | A planned feature ships (move it to Shipped) or a new one is added |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data models, schema, key patterns, or platform-specific behaviour change |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | User-visible behaviour changes (new screens, renamed actions, etc.) |
| [docs/ui-patterns.md](docs/ui-patterns.md) | A reusable UI pattern is added or changed |
| [docs/environment-configuration.md](docs/environment-configuration.md) | New environment variables are added or existing ones change |
| [packages/core/README.md](packages/core/README.md) | Exported APIs, models, or utilities in `@cashmgr/core` change |
| [packages/db/README.md](packages/db/README.md) | Schema, migrations, or seeding in `@cashmgr/db` change |
| [packages/ui/README.md](packages/ui/README.md) | Components or theme tokens in `@cashmgr/ui` change |
| [apps/web/README.md](apps/web/README.md) | Web app setup, database adapter, or build behaviour changes |
| [apps/mobile/README.md](apps/mobile/README.md) | Mobile app setup or build behaviour changes |
| [apps/desktop/README.md](apps/desktop/README.md) | Desktop app setup or build behaviour changes |

---

## Submitting a Pull Request

1. Fork the repo and create a branch from `main`
2. Make your changes following the conventions above
3. Run `pnpm test` and `pnpm typecheck` — both must pass
4. Open a PR with a clear description of what changed and why
5. Link to any relevant issue or spec file

### PR Description Template

```text
## What
Brief description of the change.

## Why
Why this change is needed.

## How
Any non-obvious implementation decisions.

## Testing
How to test or verify this change.
```

---

## Reporting Issues

- **Bugs:** Open a GitHub issue with steps to reproduce, expected behaviour, and actual behaviour.
- **Feature requests:** Open a GitHub issue describing the use case. Reference `docs/specs/` if a spec already exists.
- **Security issues:** Do not open a public issue. Contact the maintainer directly.
