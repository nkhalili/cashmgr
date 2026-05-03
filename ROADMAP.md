# Roadmap

CashMgr is a local-first personal finance app. The free tier is a complete, fully-functional product — not a crippled trial. Revenue comes from offering genuine additional value (cross-device cloud sync) rather than locking core features behind a paywall.

## Tiers

| Tier | Price | Storage |
| --- | --- | --- |
| **Free** | $0, no account required | Local SQLite on each device |
| **Paid** | Subscription (App Store / Google Play / Stripe) | Local + cloud sync across all devices |

All core features (accounts, transactions, categories, budgets, reports, currencies) are available on the free tier.

---

## Shipped

| Feature | Notes |
| --- | --- |
| Accounts | Cash, bank, and credit account types |
| Transactions | Income, expense, and transfer with balance auto-update |
| Categories | Hierarchical (one level), income and expense |
| Multi-Currency | Exchange rates, primary currency, dashboard conversion |
| Dashboard | Period summary, pie charts by category |
| Web SQLite WASM + OPFS | Replaced sql.js + IndexedDB; full-speed local SQLite in the browser |

---

## Planned

### Data Export / Import

Allow users to export all data as JSON or CSV and import it back to restore or migrate across devices. Serves as the manual backup path and the downgrade path from paid to free.

### Budgets

Monthly spending limits per expense category with progress tracking. Visual feedback (green → yellow → red) as the month progresses; no push notifications in v1.

### Reports & Charts

Multi-period trend views beyond the current month-level dashboard: 12-month spending trend, income vs. expenses bar chart, net worth over time, and category breakdown with custom date ranges.

### Audit Trail

Full change history for all data modifications (create, update, delete) with soft-delete support and a UI to browse and restore deleted items from Settings.

### Cloud Sync (Paid)

Optional cross-device sync using PowerSync + Supabase, gated behind a subscription. Free users are unaffected — local-only storage continues to work with no account required.
