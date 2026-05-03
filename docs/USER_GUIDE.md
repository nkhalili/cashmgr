# CashMgr User Guide

CashMgr is a personal finance app that helps you track income, expenses, and transfers across multiple accounts. All your data is stored privately on your device — no account or internet connection required.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Accounts](#accounts)
3. [Transactions](#transactions)
4. [Categories](#categories)
5. [Dashboard](#dashboard)
6. [Currencies](#currencies)
7. [Tips & Tricks](#tips--tricks)

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

### Multi-Currency

If you have accounts in different currencies, the dashboard converts everything to your primary currency using the exchange rates you've set. See [Currencies](#currencies) below.

---

## Currencies

CashMgr supports multiple currencies for users who have accounts in different currencies.

### Setting Your Primary Currency

1. Go to **Settings**
2. Under **Currency**, select your primary currency
3. All dashboard totals are displayed in this currency

### Adding a Secondary Currency

1. In Settings → Currency, tap **Add Currency**
2. Choose a currency from the list
3. Set the exchange rate relative to your primary currency (e.g. if 1 USD = 0.92 EUR, and your primary is EUR, set USD rate to 0.92)

### Updating Exchange Rates

Tap **Refresh Rates** to fetch current exchange rates automatically. You can also edit rates manually.

### Using Different Currencies on Accounts

When creating or editing an account, select its currency. Transactions on that account default to the account's currency.

---

## Tips & Tricks

**Date entry**: You can type dates directly in YYYY-MM-DD format, or use the calendar picker. The app also accepts MM/DD/YYYY and DD.MM.YYYY formats and converts automatically.

**Quick balance check**: The account list always shows the current balance, color-coded — positive in your theme color, negative in red.

**Transfer as savings**: Record a transfer from your main account to a savings account to track savings without it appearing as an expense.

**Bulk month review**: Navigate to a past month on the Transactions screen to review everything you spent in that month. The summary bar shows the month's total income, expenses, and net at a glance.
