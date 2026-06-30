---
layout: default
title: Settings & Data Management
nav_order: 10
---

# Settings & Data Management

## Backup & Restore

CashMgr can export all your data to a JSON backup file and restore it on any device.

### Creating a Backup

1. Go to **Settings**
2. Tap **Export Data (JSON)**
3. Save or share the `.json` file

The backup includes accounts, categories, currencies, transactions, budgets (active and deleted), recurring transaction templates, and settings. Budget tombstones (carry-forward stop signals) are included so that paused categories stay paused after a restore.

### Restoring a Backup

1. Go to **Settings**
2. Tap **Import Data**
3. Select your `.json` backup file
4. Preview the counts and choose a mode:
   - **Replace** — clears everything and loads the backup fresh. Use this to restore to a previous state.
   - **Merge** — keeps existing data and adds anything newer from the backup. Use this to sync data from another device.
5. Confirm to proceed

**Replace mode** recalculates all account balances from transactions after import, so your balances will be accurate even if the backup's stored balances were stale.

**Merge mode** compares `updatedAt` timestamps: the backup version wins only if it is newer than the local version.
