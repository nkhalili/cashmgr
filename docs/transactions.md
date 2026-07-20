---
layout: default
title: Transactions
nav_order: 4
---

# Transactions

Transactions are the core of CashMgr. Every transaction is one of three types:

| Type | Effect on balance |
| --- | --- |
| **Income** | Adds to the account balance |
| **Expense** | Subtracts from the account balance |
| **Transfer** | Subtracts from source, adds to destination |

## Adding a Transaction

1. Tap the **+** button (or go to the Add tab on mobile)
2. Select the transaction type: **Income**, **Expense**, or **Transfer**
3. Fill in the required fields:
   - **Amount** — must be a positive number
   - **Date** — defaults to today; tap to pick a different date
   - **Account** — which account the money comes from (or goes to, for income). The picker groups accounts under **Cash**, **Bank Accounts**, and **Credit Cards** headings so you can find the right one quickly
   - **Category** — choose an existing category
   - **Description** — brief label for the transaction
4. Optionally add **Notes**
5. Tap **Save**

## Recording a Transfer

When recording a transfer:

- Select **Transfer** tab
- Choose the **From Account** (source)
- Choose the **To Account** (destination) — must be different from the source
- Both accounts update automatically

## Editing a Transaction

Tap any transaction to open it for editing. All fields can be changed. Balances are recalculated automatically — the old effect is reversed and the new one applied. You can also turn on recurring here, or adjust an existing series' frequency/end date — see [Recurring Transactions](recurring-transactions.md).

## Deleting a Transaction

Open a transaction and tap **Delete**, then confirm. The balance effect is reversed automatically.

## Filtering Transactions

On the Transactions screen you can filter by:

- **Month** — use the `< Month >` navigator at the top to move between months
- **Account** — show transactions for one specific account
- **Category** — show transactions in one category
- **Type** — Income, Expense, or Transfer only
- **Date range** — pick a custom start and end date

## Searching Transactions

Use the search bar to find transactions by description, notes, category name, account name, or amount.

## Viewing by Account

From the Accounts screen, tap an account name to see all transactions for that account, pre-filtered.

## Monthly Summary

Below the month navigator, a summary bar shows:

- **Income** (green) — total money in for the month
- **Expenses** (red) — total money out for the month
- **Net** — income minus expenses

Transfers are excluded from income/expense totals.

## Daily Grouping

Transactions are grouped by day, most recent first. Each day header shows the date and the day's income/expense totals.
