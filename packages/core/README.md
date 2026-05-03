# @cashmgr/core

Shared business logic, models, types, and utilities for Cash Mgr.

## Contents

- **models/** - Data models (Transaction, Account, Category)
- **types/** - TypeScript type definitions
- **utils/** - Utility functions (date, format)
- **constants/** - Application constants
- **db/** - Database adapter interface

## Usage

```typescript
import { Transaction, formatCurrency, generateId, getTodayDateString } from '@cashmgr/core';

const transaction: Transaction = {
  id: generateId(),
  type: 'expense',
  amount: 50.00,
  currency: 'USD',
  description: 'Groceries',
  date: getTodayDateString(),  // YYYY-MM-DD string, never a timestamp
  accountId: 'account-1',
  categoryId: 'category-1',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

console.log(formatCurrency(transaction.amount, transaction.currency));
// Output: $50.00
```

## Building

```bash
pnpm build
```

Output in `dist/` directory.
