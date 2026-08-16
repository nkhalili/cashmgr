---
layout: default
title: Recurring Transactions
nav_order: 7
---

# Recurring Transactions

Recurring transactions let you schedule a transaction to repeat automatically on a fixed frequency — useful for subscriptions, salaries, rent, and other regular payments.

## Setting Up a Recurring Transaction

When adding a transaction, enable the **Make recurring** toggle (below the Notes field). Choose a frequency and optionally set an end date.

Forgot to mark a transaction as recurring? Open it from **Transactions → Edit** and enable the same toggle there. The transaction you're editing becomes the start of the new series — no duplicate is created for its date, and any occurrences due between then and today are generated automatically the next time you open the app.

If you're editing a transaction that's already part of a recurring series, the toggle is replaced with the series' **Frequency** and **End date** fields, pre-filled from the template. Changing them updates the series (same as editing from Settings → Recurring Transactions) and applies to future occurrences only.

Supported frequencies:

| Frequency | Repeats |
| --- | --- |
| Every Day | Daily |
| Weekdays | Mon–Fri only |
| Weekends | Sat–Sun only |
| Every Week | Same day each week |
| Every 2 Weeks | Every 14 days |
| Every 4 Weeks | Every 28 days |
| Every Month | Same calendar day each month |
| Last Day of Month | Last calendar day of each month |
| Every 6 Months | Twice a year |
| Annually | Once a year |

When you save, the app creates a recurring template and immediately generates all transactions due up to today.

## How Generation Works

Each time the app starts, it checks all active recurring templates and creates any transactions that have come due since the last run. This means if you haven't opened the app in a week, a daily recurring transaction will generate 7 entries automatically.

## Managing Recurring Transactions

Go to **Settings → Recurring Transactions** to see all your templates. Each entry shows the transaction type, amount, frequency, account, category, start/end dates, and active status at a glance.

From there you can:

- **Edit** — update the template's amount, frequency, account, category, dates, notes, or active state. Changes apply to future occurrences only; past transactions are not affected. Note: transaction type (expense/income/transfer) cannot be changed after creation.
- **Pause / Resume** — toggle the **Active** switch in the edit screen to pause a template without deleting it. Paused templates are kept in the list but skipped during generation; no new transactions are created until you re-activate it. Transactions already created are not affected.
- **Delete** — removes the template and deletes any future-dated generated transactions. Past transactions are kept.
