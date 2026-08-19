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

## Error Logs

CashMgr keeps a local log of application errors on your device to help diagnose problems — it never leaves your device automatically.

1. Go to **Settings → Logs**
2. Tap **Share Log File** on mobile to open the share sheet, or **Download Log File** on web/desktop to save the file

Share this file when reporting a bug. If nothing has gone wrong yet, the log will be empty and the button disabled.

## Report a Bug

1. Go to **Settings → Report a Bug**
2. Tap **Email Us** to open your email app with a message pre-addressed to `cashmgr.support@gmail.com`, pre-filled with your app version and platform
3. Describe the bug and steps to reproduce it, then send

If you'd rather compose the email yourself, the address is also shown on the page with a **Copy** button.
