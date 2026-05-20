# CashMgr User Guide

CashMgr is a personal finance app that helps you track income, expenses, and transfers across multiple accounts. All your data is stored privately on your device — no account or internet connection required.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Accounts](#accounts)
3. [Transactions](#transactions)
4. [Categories](#categories)
5. [Budgets](#budgets)
6. [Dashboard](#dashboard)
7. [Currencies](#currencies)
8. [Settings & Data Management](#settings--data-management)
9. [Tips & Tricks](#tips--tricks)

---

## Getting Started

When you first open CashMgr, you'll see an empty state. A good starting flow:

1. **Add your accounts** — create one account for each real-world account (e.g. Wallet, Checking, Credit Card)
2. **Set up categories** — use the template to get started quickly, then customize
3. **Record your first transaction** — tap the + button and log an expense

---

## Accounts

Accounts represent real-world financial accounts. Your balance is automatically kept accurate as you add, edit, or delete transactions.

### Account Types

| Type | Use for |
| --- | --- |
| **Cash** | Physical wallet, cash envelope |
| **Bank** | Checking, savings, debit account |
| **Credit** | Credit cards (balance can be negative) |

### Creating an Account

1. Go to the **Accounts** tab
2. Tap **Add Account**
3. Enter a name and select the type
4. Optionally set an **initial balance** — this is your starting balance as of today
5. Tap **Save**

### Editing an Account

Tap the edit icon next to any account. You can change the name and type. The initial balance cannot be edited after creation (it would change historical balance calculations).

### Deleting an Account

Tap the delete icon and confirm. Note: you cannot delete an account that has transactions. Delete or reassign the transactions first.

### Transfers Between Accounts

Transfers move money between two of your own accounts. Both account balances update automatically. See [Recording a Transfer](#recording-a-transfer) below.

---

## Transactions

Transactions are the core of CashMgr. Every transaction is one of three types:

| Type | Effect on balance |
| --- | --- |
| **Income** | Adds to the account balance |
| **Expense** | Subtracts from the account balance |
| **Transfer** | Subtracts from source, adds to destination |

### Adding a Transaction

1. Tap the **+** button (or go to the Add tab on mobile)
2. Select the transaction type: **Income**, **Expense**, or **Transfer**
3. Fill in the required fields:
   - **Amount** — must be a positive number
   - **Date** — defaults to today; tap to pick a different date
   - **Account** — which account the money comes from (or goes to, for income)
   - **Category** — choose an existing category
   - **Description** — brief label for the transaction
4. Optionally add **Notes**
5. Tap **Save**

### Recording a Transfer

When recording a transfer:

- Select **Transfer** tab
- Choose the **From Account** (source)
- Choose the **To Account** (destination) — must be different from the source
- Both accounts update automatically

### Editing a Transaction

Tap any transaction to open it for editing. All fields can be changed. Balances are recalculated automatically — the old effect is reversed and the new one applied.

### Deleting a Transaction

Open a transaction and tap **Delete**, then confirm. The balance effect is reversed automatically.

### Filtering Transactions

On the Transactions screen you can filter by:

- **Month** — use the `< Month >` navigator at the top to move between months
- **Account** — show transactions for one specific account
- **Category** — show transactions in one category
- **Type** — Income, Expense, or Transfer only
- **Date range** — pick a custom start and end date

### Searching Transactions

Use the search bar to find transactions by description, notes, category name, account name, or amount.

### Viewing by Account

From the Accounts screen, tap an account name to see all transactions for that account, pre-filtered.

### Monthly Summary

Below the month navigator, a summary bar shows:

- **Income** (green) — total money in for the month
- **Expenses** (red) — total money out for the month
- **Net** — income minus expenses

Transfers are excluded from income/expense totals.

### Daily Grouping

Transactions are grouped by day, most recent first. Each day header shows the date and the day's income/expense totals.

---

## Categories

Categories let you organize transactions so you can see where your money goes.

### Category Types

- **Income categories** — for salary, freelance work, gifts, etc.
- **Expense categories** — for groceries, utilities, entertainment, etc.

Transfer transactions use categories too, but the same income/expense categories apply.

### Using the Default Template

If you have no categories yet, tap **Use Template** to create a standard set:

**Income:** Salary, Freelance, Investments, Gifts, Other Income

**Expense:** Groceries, Housing, Utilities, Transport, Dining, Entertainment, Shopping, Healthcare, Education

### Creating a Category

1. Go to the **Categories** screen
2. Select the **Income** or **Expense** tab
3. Tap **Add Category**
4. Enter a name, pick an emoji icon, and choose a color
5. Optionally select a **parent category** to make it a subcategory
6. Tap **Save**

### Subcategories

Categories support one level of nesting. For example:

```text
Food & Drink
  ├── Groceries
  ├── Dining Out
  └── Coffee
```

- A subcategory cannot itself be a parent
- To create a subcategory, select a parent when creating or editing

### Editing & Deleting

Tap any category to edit its name, icon, color, or parent. To delete, tap the delete icon — you'll be warned if the category has subcategories.

---

## Budgets

Budgets let you set monthly spending limits per expense category and track your progress throughout the month.

### How Budgets Work

- Each budget is tied to one expense category and one calendar month
- Spending is calculated automatically from your transactions — no manual entry needed
- Subcategory spending rolls up into the parent category's budget (e.g. transactions in "Restaurants" count toward a "Food" budget)
- You can have at most one budget per category per month

### Recurring Defaults (Auto Carry-Forward)

When you set a budget for a category, that amount becomes the **default** for every future month. You only need to set it once — the app automatically carries it forward when you navigate to each new month. If you want to change the limit for a particular month, just edit that month's budget; other months are not affected.

### Creating a Budget

1. Go to the **Budgets** screen
2. Navigate to the month you want using the `‹ Month ›` navigator
3. Tap **Add budget**
4. Select an expense category from the list (only categories without an existing budget for the month are shown)
5. Enter an amount — your spending limit for the month
6. Tap **Create budget**

Future months are created on demand the first time you visit them, so you don't need to set anything up in advance.

### Reading the Progress Bar

Each budget card shows a progress bar and a spending summary:

| Color | Meaning |
| --- | --- |
| **Green** | Under 70% spent — on track |
| **Amber** | 70–89% spent — approaching the limit |
| **Red** | 90% or over — limit reached or exceeded |

Below the bar you'll see the percentage used and either the remaining amount or how much you've gone over.

### Editing a Budget

Tap **Edit** on any budget to update the spending limit. The progress bar updates immediately to reflect the new limit. You cannot change the category or month of an existing budget — delete it and create a new one instead.

Editing one month's budget does not affect other months.

### Deleting a Budget

Tap **Delete** on any budget and confirm. This stops the carry-forward for that category — the current month and all future months lose their budget for it. Past months and your transactions are not affected.

If you want to resume tracking that category, add a new budget for any month. The carry-forward restarts from that month: all previously deleted future months are restored with the new amount.

### Navigating Months

Use the `‹` and `›` buttons to move between months. You can review past months to see how your spending compared to your limits, or set up budgets for future months in advance.

---

## Dashboard

The Dashboard gives you a financial overview for any time period.

### Period Selection

Choose how to view your data:

| Period | What it shows |
| --- | --- |
| **Monthly** | One month at a time; use `< >` arrows to navigate months |
| **Yearly** | One year at a time; use `< >` arrows to navigate years |
| **Custom** | Pick any start and end date |

### Summary Stats

At the top of the dashboard you'll see:

- **Total Income** for the period
- **Total Expenses** for the period
- **Net** (income − expenses)
- **Account balances** summary

### Pie Charts

Two pie charts show how your money is distributed:

- **Income by category** — which income sources are biggest
- **Expenses by category** — where your money is going

Tap a category slice to highlight it. The legend below shows each category's amount and percentage.

### Category Breakdown & Budget Status

In **monthly expense** view, each category row shows a small badge under the category name:

| Badge | Meaning |
| --- | --- |
| **On budget** (green) | Spending is within the budget limit for this month |
| **Over budget** (red) | Spending has exceeded the budget limit for this month |

Categories with no budget set for the month show no badge. The badge only appears in monthly mode — yearly and custom ranges don't map to a single month's budget.

### Multi-Currency

If you have accounts in different currencies, the dashboard converts everything to your primary currency using the exchange rates you've set. See [Currencies](#currencies) below.

---

## Currencies

CashMgr supports multiple currencies for users who have accounts in different currencies.

### Setting Your Primary Currency

1. Go to **Settings** → **Currencies**
2. The currency marked **Primary** is your base currency
3. All dashboard totals are displayed in this currency

### Adding a Secondary Currency

1. Go to **Settings** → **Currencies** → **Add Currency**
2. Choose a currency code from the quick-select list or type an ISO 4217 code
3. Set the exchange rate relative to your primary currency (e.g. if 1 USD = 0.92 EUR, and your primary is EUR, set USD rate to 0.92)
4. Tap **Fetch current rate** to pull the latest rate automatically, or enter it manually

### Updating Exchange Rates

Open **Settings** → **Currencies**, tap **Edit** next to a currency, then tap **Fetch latest rate** or enter a rate manually.

### Using Different Currencies on Accounts

When creating or editing an account, select its currency. Transactions on that account default to the account's currency.

---

## Settings & Data Management

### Backup & Restore

CashMgr can export all your data to a JSON backup file and restore it on any device.

#### Creating a Backup

1. Go to **Settings**
2. Tap **Export Data (JSON)**
3. Save or share the `.json` file

The backup includes accounts, categories, currencies, transactions, budgets (active and deleted), and settings. Budget tombstones (carry-forward stop signals) are included so that paused categories stay paused after a restore.

#### Restoring a Backup

1. Go to **Settings**
2. Tap **Import Data**
3. Select your `.json` backup file
4. Preview the counts and choose a mode:
   - **Replace** — clears everything and loads the backup fresh. Use this to restore to a previous state.
   - **Merge** — keeps existing data and adds anything newer from the backup. Use this to sync data from another device.
5. Confirm to proceed

**Replace mode** recalculates all account balances from transactions after import, so your balances will be accurate even if the backup's stored balances were stale.

**Merge mode** compares `updatedAt` timestamps: the backup version wins only if it is newer than the local version.

---

## Tips & Tricks

**Date entry**: You can type dates directly in YYYY-MM-DD format, or use the calendar picker. The app also accepts MM/DD/YYYY and DD.MM.YYYY formats and converts automatically.

**Quick balance check**: The account list always shows the current balance, color-coded — positive in your theme color, negative in red.

**Transfer as savings**: Record a transfer from your main account to a savings account to track savings without it appearing as an expense.

**Bulk month review**: Navigate to a past month on the Transactions screen to review everything you spent in that month. The summary bar shows the month's total income, expenses, and net at a glance.
