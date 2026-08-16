import type {
  RecurringTransaction,
  CreateRecurringTransactionInput,
  UpdateRecurringTransactionInput,
  Transaction,
} from '@cashmgr/core';
import { SqliteDatabase } from '../sqlite/types';
import { v4 as uuidv4 } from 'uuid';

type RecurringRow = {
  id: string;
  type: string;
  amount: number;
  currency: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  notes: string | null;
  frequency: string;
  start_date: string;
  end_date: string | null;
  last_generated_date: string | null;
  is_active: number;
  created_at: number;
  updated_at: number;
};

type TransactionRow = {
  id: string;
  type: string;
  amount: number;
  currency: string;
  date: string;
  account_id: string;
  category_id: string | null;
  to_account_id: string | null;
  notes: string | null;
  recurring_transaction_id: string | null;
  created_at: number;
  updated_at: number;
};

function rowToRecurring(row: RecurringRow): RecurringTransaction {
  return {
    id: row.id,
    type: row.type as RecurringTransaction['type'],
    amount: row.amount,
    currency: row.currency,
    accountId: row.account_id,
    toAccountId: row.to_account_id ?? undefined,
    categoryId: row.category_id ?? undefined,
    notes: row.notes ?? undefined,
    frequency: row.frequency as RecurringTransaction['frequency'],
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    lastGeneratedDate: row.last_generated_date ?? undefined,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type as Transaction['type'],
    amount: row.amount,
    currency: row.currency,
    date: row.date,
    accountId: row.account_id,
    categoryId: row.category_id ?? undefined,
    toAccountId: row.to_account_id ?? undefined,
    notes: row.notes ?? undefined,
    recurringTransactionId: row.recurring_transaction_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class RecurringTransactionsRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async create(input: CreateRecurringTransactionInput): Promise<RecurringTransaction> {
    const now = Date.now();
    const id = uuidv4();

    await this.db.execute(
      `INSERT INTO recurring_transactions
        (id, type, amount, currency, account_id, to_account_id, category_id, notes,
         frequency, start_date, end_date, last_generated_date, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, ?, ?)`,
      [
        id,
        input.type,
        input.amount,
        input.currency ?? 'USD',
        input.accountId,
        input.toAccountId ?? null,
        input.categoryId ?? null,
        input.notes ?? null,
        input.frequency,
        input.startDate,
        input.endDate ?? null,
        now,
        now,
      ],
    );

    const row = await this.findById(id);
    if (!row) throw new Error('Failed to create recurring transaction');
    return row;
  }

  async findById(id: string): Promise<RecurringTransaction | null> {
    const rows = await this.db.query<RecurringRow>(
      `SELECT * FROM recurring_transactions WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows.length > 0 ? rowToRecurring(rows[0]) : null;
  }

  async findAll(activeOnly = false): Promise<RecurringTransaction[]> {
    const sql = activeOnly
      ? `SELECT * FROM recurring_transactions WHERE is_active = 1 ORDER BY created_at DESC`
      : `SELECT * FROM recurring_transactions ORDER BY created_at DESC`;
    const rows = await this.db.query<RecurringRow>(sql, []);
    return rows.map(rowToRecurring);
  }

  async update(input: UpdateRecurringTransactionInput): Promise<RecurringTransaction> {
    const now = Date.now();
    const sets: string[] = ['updated_at = ?'];
    const params: (string | number | null)[] = [now];

    if (input.type !== undefined) { sets.push('type = ?'); params.push(input.type); }
    if (input.amount !== undefined) { sets.push('amount = ?'); params.push(input.amount); }
    if (input.currency !== undefined) { sets.push('currency = ?'); params.push(input.currency); }
    if (input.accountId !== undefined) { sets.push('account_id = ?'); params.push(input.accountId); }
    if ('toAccountId' in input) { sets.push('to_account_id = ?'); params.push(input.toAccountId ?? null); }
    if ('categoryId' in input) { sets.push('category_id = ?'); params.push(input.categoryId ?? null); }
    if ('notes' in input) { sets.push('notes = ?'); params.push(input.notes ?? null); }
    if (input.frequency !== undefined) { sets.push('frequency = ?'); params.push(input.frequency); }
    if (input.startDate !== undefined) { sets.push('start_date = ?'); params.push(input.startDate); }
    if ('endDate' in input) { sets.push('end_date = ?'); params.push(input.endDate ?? null); }
    if ('lastGeneratedDate' in input) { sets.push('last_generated_date = ?'); params.push(input.lastGeneratedDate ?? null); }
    if (input.isActive !== undefined) { sets.push('is_active = ?'); params.push(input.isActive ? 1 : 0); }

    params.push(input.id);
    await this.db.execute(
      `UPDATE recurring_transactions SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );

    const row = await this.findById(input.id);
    if (!row) throw new Error('Recurring transaction not found after update');
    return row;
  }

  async delete(id: string): Promise<void> {
    await this.db.execute(`DELETE FROM recurring_transactions WHERE id = ?`, [id]);
  }

  async findTransactionsByRecurringId(recurringId: string): Promise<Transaction[]> {
    const rows = await this.db.query<TransactionRow>(
      `SELECT * FROM transactions WHERE recurring_transaction_id = ? ORDER BY date ASC`,
      [recurringId],
    );
    return rows.map(rowToTransaction);
  }

  async deleteFutureGeneratedTransactions(recurringId: string, fromDate: string): Promise<void> {
    await this.db.execute(
      `DELETE FROM transactions WHERE recurring_transaction_id = ? AND date >= ?`,
      [recurringId, fromDate],
    );
  }
}
