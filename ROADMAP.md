# Roadmap

CashMgr is a local-first personal finance app. The local version is free, ad-free, and fully featured — no account required.

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
| Data Export / Import | Available in JSON and CSV to be used for restore or migration purposes |
| Budgets | Monthly spending limits per expense category with green → yellow → red progress tracking |
| Recurring Transactions | 10 frequencies (daily through annually); on-startup generation; enable/edit from Add or Edit Transaction, manage via Settings |
| Credit Card Statement & Auto-Pay | Statement/payment day, Balance Payable & Outstanding Balance on Accounts page, optional auto-pay (full or fixed amount) from a linked account |
| Local Error Logging | Per-platform local file logger with global error/rejection capture; shareable from Settings → Logs. Local-only by design — no remote crash reporting |
| Report a Bug | Settings → Report a Bug opens a pre-filled `mailto:` to the support address (app version + platform included); email also shown with a Copy button |

---

## Planned

### Reports & Charts

Multi-period trend views beyond the current month-level dashboard: 12-month spending trend, income vs. expenses bar chart, net worth over time, and category breakdown with custom date ranges.

### Audit Trail

Full change history for all data modifications (create, update, delete) with soft-delete support and a UI to browse and restore deleted items from Settings.

### Cloud Sync

Optional cross-device sync using PowerSync + Supabase. Local-only storage continues to work with no account required.
