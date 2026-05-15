# Copilot Code Review Instructions for CashMgr

Focus reviews on correctness, architectural compliance, and security. Flag violations as errors, not style suggestions. Do not flag formatting — Prettier handles that.

---

## Architecture Violations (Always Flag)

**Services must not import repositories directly.**
Services live in `apps/<platform>/src/services/` and must depend only on the `DatabaseAdapter` interface from `@cashmgr/core`. A direct import of any class from `@cashmgr/db` inside a service file is a hard violation.

**`packages/core` must stay platform-agnostic.**
Flag any import of `expo-*`, browser-only globals (`window`, `document`, `navigator`, `indexedDB`), or Node-only modules (`fs`, `path`, `crypto`) inside `packages/core/`.

**Migrations must never be modified.**
Changes to existing files in `packages/db/src/migrations/` are always wrong. New schema changes must be new numbered migration files.

---

## Input Validation (Always Flag)

Every service method that accepts external input must call a Zod schema's `.parse()` or `.safeParse()` before any adapter call. Flag any service method that:
- Accepts a parameter typed as `unknown`, `any`, or a plain object literal without a preceding Zod parse.
- Passes unvalidated data directly to `this.db.*` calls.

---

## Error Handling (Always Flag)

- Flag any `console.error(...)`, `console.warn(...)`, or `throw new Error(...)` inside service or repository code. All errors must go through `ErrorHandler.handle(error, 'ClassName.methodName')`.
- Flag bare `catch (e) { ... }` blocks that do not call `ErrorHandler.handle`.
- Flag `throw error` re-throws without wrapping.

---

## Date Handling (Always Flag)

- Flag any `new Date()`, `Date.now()`, or `timestamp` used as a business-logic date. Dates must be `YYYY-MM-DD` strings.
- Flag passing a `Date` object to a service or repository method where a date string is expected.
- Flag manual date formatting (`.toISOString().split('T')[0]`) — use `toDateString()` or `getTodayDateString()` from `@cashmgr/core` instead.

---

## Transaction Balance Logic (Flag Incorrect Logic)

When reviewing changes to `TransactionsService`, verify the balance effect is:
- `income` → `+amount` on `accountId`
- `expense` → `-amount` on `accountId`
- `transfer` → `-amount` on `accountId`, `+amount` on `toAccountId`
- Edit → old effect reversed first, then new effect applied
- Delete → transaction's effect fully reversed

Flag any implementation that does not reverse the old effect before applying the new one on edits.

---

## TypeScript Strictness (Flag)

- Flag implicit `any` — every parameter and return type must be explicit.
- Flag `import { Foo }` when `Foo` is used only as a type — must be `import type { Foo }`.
- Flag unused variables that are not prefixed with `_`.

---

## Tests (Flag Missing Coverage)

- Every new service method needs a corresponding test in `__tests__/<service>.test.ts`.
- Every new repository method needs a test using an in-memory SQLite database (`:memory:`).
- Flag PRs that add or change service/repository logic without touching any test file.
- Service tests must mock `DatabaseAdapter` — flag any service test that instantiates a real database.

---

## Documentation (Flag Missing Updates)

Flag PRs that make the following changes without updating the corresponding doc:

| Change | Required doc update |
|---|---|
| New or changed data model / schema | `docs/ARCHITECTURE.md` |
| New or changed user-facing feature | `docs/USER_GUIDE.md` |
| New or changed UI pattern or component | `docs/ui-patterns.md` |
| Shipped roadmap item | `docs/ROADMAP.md` |
| New or changed environment variable | `docs/environment-configuration.md` |

---

## Do Not Flag

- Formatting, indentation, or whitespace — Prettier enforces this in CI.
- File length or function length unless they indicate a clear structural problem.
- Missing comments — this codebase intentionally minimizes comments.
- Suggestions to add cloud sync, multi-user features, or analytics — these are out of scope for v1.
