/**
 * Seed data for development and testing
 *
 * Usage:
 * - Run: pnpm --filter @cashmgr/db seed
 * - Clear: pnpm --filter @cashmgr/db seed:clear
 *
 * IMPORTANT: Only runs in development mode (NODE_ENV !== 'production')
 */

import type { SqliteDatabase } from './sqlite/types';
import type { Account, Category, Transaction } from '@cashmgr/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sample accounts covering different types
 */
export const SEED_ACCOUNTS: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Primary Checking',
    type: 'bank',
    currency: 'USD',
    balance: 5420.50,
    initialBalance: 5000.00,
  },
  {
    name: 'Savings Account',
    type: 'bank',
    currency: 'USD',
    balance: 15000.00,
    initialBalance: 10000.00,
  },
  {
    name: 'Credit Card',
    type: 'credit',
    currency: 'USD',
    balance: -850.25,
    initialBalance: 0,
  },
  {
    name: 'Cash Wallet',
    type: 'cash',
    currency: 'USD',
    balance: 320.00,
    initialBalance: 500.00,
  },
];

/**
 * Sample categories covering common expense and income types
 */
export const SEED_CATEGORIES: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Income categories
  { name: 'Salary', type: 'income', icon: '💼', color: '#10b981', isActive: true },
  { name: 'Freelance', type: 'income', icon: '💻', color: '#06b6d4', isActive: true },
  { name: 'Investments', type: 'income', icon: '📈', color: '#8b5cf6', isActive: true },
  { name: 'Gifts', type: 'income', icon: '🎁', color: '#ec4899', isActive: true },

  // Expense categories
  { name: 'Groceries', type: 'expense', icon: '🛒', color: '#ef4444', isActive: true },
  { name: 'Dining Out', type: 'expense', icon: '🍽️', color: '#f97316', isActive: true },
  { name: 'Transportation', type: 'expense', icon: '🚗', color: '#eab308', isActive: true },
  { name: 'Utilities', type: 'expense', icon: '💡', color: '#06b6d4', isActive: true },
  { name: 'Rent', type: 'expense', icon: '🏠', color: '#8b5cf6', isActive: true },
  { name: 'Healthcare', type: 'expense', icon: '⚕️', color: '#ef4444', isActive: true },
  { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#ec4899', isActive: true },
  { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#f97316', isActive: true },
  { name: 'Education', type: 'expense', icon: '📚', color: '#3b82f6', isActive: true },
  { name: 'Insurance', type: 'expense', icon: '🛡️', color: '#6366f1', isActive: true },
  { name: 'Subscriptions', type: 'expense', icon: '📱', color: '#8b5cf6', isActive: true },
];

/**
 * Generate sample transactions for the past 3 months
 */
function generateSeedTransactions(
  accountIds: string[],
  categoryIds: { income: string[]; expense: string[] }
): Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[] {
  const transactions: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const today = new Date();

  // Helper to format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Helper to get a random item from array
  const random = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // Generate transactions for the past 90 days
  for (let daysAgo = 0; daysAgo < 90; daysAgo++) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    const dateString = formatDate(date);

    // Monthly salary (on 1st of each month)
    if (date.getDate() === 1) {
      transactions.push({
        type: 'income',
        amount: 5500.00,
        currency: 'USD',
        date: dateString,
        accountId: accountIds[0], // Primary Checking
        categoryId: categoryIds.income[0], // Salary
        notes: 'Monthly salary deposit',
      });
    }

    // Rent (on 1st of each month)
    if (date.getDate() === 1) {
      const rentCategory = SEED_CATEGORIES.find(c => c.name === 'Rent');
      const rentCategoryIndex = rentCategory ? SEED_CATEGORIES.indexOf(rentCategory) - 4 : 4; // Subtract income categories
      transactions.push({
        type: 'expense',
        amount: 1500.00,
        currency: 'USD',
        date: dateString,
        accountId: accountIds[0], // Primary Checking
        categoryId: categoryIds.expense[rentCategoryIndex] || categoryIds.expense[0],
        notes: 'Monthly rent payment',
      });
    }

    // Random groceries (2-3 times per week)
    if (Math.random() > 0.6) {
      transactions.push({
        type: 'expense',
        amount: Math.round((Math.random() * 80 + 30) * 100) / 100,
        currency: 'USD',
        date: dateString,
        accountId: random([accountIds[0], accountIds[3]]), // Checking or Cash
        categoryId: categoryIds.expense[0], // Groceries
        notes: Math.random() > 0.5 ? 'Weekly groceries' : undefined,
      });
    }

    // Random dining out (1-2 times per week)
    if (Math.random() > 0.7) {
      transactions.push({
        type: 'expense',
        amount: Math.round((Math.random() * 50 + 15) * 100) / 100,
        currency: 'USD',
        date: dateString,
        accountId: random([accountIds[0], accountIds[2], accountIds[3]]), // Various
        categoryId: categoryIds.expense[1], // Dining Out
        notes: ['Lunch with colleagues', 'Dinner date', 'Coffee shop'][Math.floor(Math.random() * 3)],
      });
    }

    // Random entertainment
    if (Math.random() > 0.85) {
      transactions.push({
        type: 'expense',
        amount: Math.round((Math.random() * 60 + 10) * 100) / 100,
        currency: 'USD',
        date: dateString,
        accountId: random([accountIds[0], accountIds[2]]),
        categoryId: categoryIds.expense[6], // Entertainment
        notes: ['Movie tickets', 'Concert', 'Gaming'][Math.floor(Math.random() * 3)],
      });
    }

    // Utilities (on 15th of each month)
    if (date.getDate() === 15) {
      transactions.push({
        type: 'expense',
        amount: Math.round((Math.random() * 50 + 120) * 100) / 100,
        currency: 'USD',
        date: dateString,
        accountId: accountIds[0], // Primary Checking
        categoryId: categoryIds.expense[3], // Utilities
        notes: 'Electricity and water bill',
      });
    }

    // Random freelance income
    if (Math.random() > 0.9) {
      transactions.push({
        type: 'income',
        amount: Math.round((Math.random() * 800 + 200) * 100) / 100,
        currency: 'USD',
        date: dateString,
        accountId: accountIds[0], // Primary Checking
        categoryId: categoryIds.income[1], // Freelance
        notes: 'Freelance project payment',
      });
    }

    // Transfer to savings (on 5th of each month)
    if (date.getDate() === 5) {
      transactions.push({
        type: 'transfer',
        amount: 1000.00,
        currency: 'USD',
        date: dateString,
        accountId: accountIds[0], // From Primary Checking
        toAccountId: accountIds[1], // To Savings
        notes: 'Monthly savings transfer',
      });
    }
  }

  return transactions;
}

/**
 * Seed the database with sample data
 * @param db - Database instance
 * @param generateId - Optional ID generator function (defaults to uuidv4)
 */
export async function seedDatabase(
  db: SqliteDatabase,
  generateId: () => string = uuidv4
): Promise<void> {
  console.log('🌱 Starting database seeding...');

  try {
    // Check if data already exists
    const existingAccounts = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM accounts');
    if (existingAccounts[0].count > 0) {
      console.warn('⚠️  Database already has data. Run seed:clear first to reseed.');
      return;
    }

    const accountIds: string[] = [];
    const categoryIds = { income: [] as string[], expense: [] as string[] };

    // Seed accounts
    console.log('  Creating accounts...');
    for (const account of SEED_ACCOUNTS) {
      const id = generateId();
      const now = new Date().toISOString();
      await db.execute(
        `INSERT INTO accounts (id, name, type, currency, balance, initial_balance, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, account.name, account.type, account.currency, account.balance, account.initialBalance, now, now]
      );
      accountIds.push(id);
    }
    console.log(`  ✅ Created ${accountIds.length} accounts`);

    // Seed categories
    console.log('  Creating categories...');
    for (const category of SEED_CATEGORIES) {
      const id = generateId();
      const now = new Date().toISOString();
      await db.execute(
        `INSERT INTO categories (id, name, type, icon, color, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, category.name, category.type, category.icon || null, category.color || null, category.isActive ? 1 : 0, now, now]
      );
      if (category.type === 'income') {
        categoryIds.income.push(id);
      } else {
        categoryIds.expense.push(id);
      }
    }
    console.log(`  ✅ Created ${SEED_CATEGORIES.length} categories`);

    // Seed transactions
    console.log('  Creating transactions...');
    const transactions = generateSeedTransactions(accountIds, categoryIds);
    for (const transaction of transactions) {
      const id = generateId();
      const now = new Date().toISOString();
      await db.execute(
        `INSERT INTO transactions (id, type, amount, currency, date, account_id, category_id, to_account_id, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          transaction.type,
          transaction.amount,
          transaction.currency,
          transaction.date,
          transaction.accountId,
          transaction.categoryId || null,
          transaction.toAccountId || null,
          transaction.notes || null,
          now,
          now,
        ]
      );
    }
    console.log(`  ✅ Created ${transactions.length} transactions`);

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${accountIds.length} accounts`);
    console.log(`   - ${SEED_CATEGORIES.length} categories`);
    console.log(`   - ${transactions.length} transactions (past 90 days)`);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

/**
 * Clear all seeded data from the database
 */
export async function clearSeedData(db: SqliteDatabase): Promise<void> {
  console.log('🧹 Clearing seed data...');

  try {
    // Delete in reverse order due to foreign keys
    await db.execute('DELETE FROM transactions');
    await db.execute('DELETE FROM categories');
    await db.execute('DELETE FROM accounts');

    console.log('✅ All seed data cleared');
  } catch (error) {
    console.error('❌ Error clearing seed data:', error);
    throw error;
  }
}
