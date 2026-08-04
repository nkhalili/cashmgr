---
layout: default
title: Accounts
nav_order: 3
---

# Accounts

Accounts represent real-world financial accounts. Your balance is automatically kept accurate as you add, edit, or delete transactions.

## Account Types

| Type | Use for |
| --- | --- |
| **Cash** | Physical wallet, cash envelope |
| **Bank** | Checking, savings, debit account |
| **Credit** | Credit cards (balance can be negative) |

## Summary Bar

At the top of the Accounts page you will see three figures:

| Figure | Meaning |
| --- | --- |
| **Assets** | Sum of all account balances that are zero or positive |
| **Liabilities** | Absolute sum of all account balances that are negative |
| **Net** | Assets minus Liabilities |

All three are converted to your primary currency using the exchange rates you have configured. Net is shown in green when positive and red when negative. Liabilities are always shown in red.

## Grouped View

Below the summary, your accounts are organised into three sections — **Cash**, **Bank Accounts**, and **Credit Cards**. Each section shows a total balance for that group, converted to your primary currency. Sections with no accounts are hidden automatically.

The group total turns red when the net balance for that group is negative (e.g. outstanding credit card debt).

## Creating an Account

1. Go to the **Accounts** tab
2. Tap **Add Account** (bottom of the screen on mobile, top-right on web)
3. Enter a name and select the type
4. Optionally set an **initial balance** — this is your starting balance as of today
5. Tap **Save**

## Editing an Account

Tap the edit icon next to any account. You can change the name, type, and — for credit accounts — the statement/payment settings described below. The initial balance cannot be edited after creation (it would change historical balance calculations).

## Credit Card Statement & Auto-Payment

Credit accounts can optionally track a billing cycle, shown when adding or editing a credit account:

| Field | Meaning |
| --- | --- |
| **Statement day** | Day of the month (1–31) your statement closes |
| **Payment due day** | Day of the month (1–31) your payment is due |
| **Payment account** | The account auto-payments are drawn from |
| **Auto payment** | On/off switch — when on, automatically pays the card from the payment account on the due date |

When auto payment is on, choose how much to pay each cycle:

- **Full balance payable** — pays off the full statement balance
- **Fixed amount** — pays a fixed amount you set (e.g. a $10 minimum), capped at whatever is actually owed

Auto-payments appear as a normal transfer transaction from the payment account to the credit account, labelled "Payment" in Notes. Since this app has no background scheduler, auto-payments run as a catch-up check whenever you open the app — if a payment date has passed since you last opened the app, it will be processed then, dated on the payment day it was due.

### Balance Payable and Outstanding Balance

Once a statement day is set, the Accounts page can show two extra figures for that card (toggle this in **Settings › Appearance**):

- **Outstanding Balance** — everything you currently owe, including charges since your last statement
- **Balance Payable** — what's due by your next payment date: your balance as of the last statement close, minus any payments made since

## Deleting an Account

Tap the delete icon and confirm. Note: you cannot delete an account that has transactions. Delete or reassign the transactions first.

You also cannot delete an account that is set as a credit card's payment account. Update the credit card's payment settings (or turn off auto payment) first, then delete the account.

## Transfers Between Accounts

Transfers move money between two of your own accounts. Both account balances update automatically. See [Recording a Transfer](transactions#recording-a-transfer).
