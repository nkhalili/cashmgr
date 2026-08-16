import { v4 as uuidv4 } from 'uuid';
import {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionType,
  FilterParams,
  PaginationParams,
  CategoryAggregation,
  DEFAULT_CURRENCY,
} from '@cashmgr/core';
import { SqliteDatabase, SqliteValue } from '../sqlite/types';
import { buildWhereClause, buildUpdateClause, buildLimitClause, type Condition } from '../utils/query-builder';
import { TransactionsAggregation } from './transactions-aggregation';

/**
 * F-002: Row type matching database schema
 */
type TransactionRow = {
  id: string;
  type: string;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD format (B-001: timezone-agnostic)
  accountId: string;
  categoryId: string | null; // Null for transfers
  toAccountId: string | null;
  notes: string | null;
  recurringTransactionId: string | null;
  createdAt: number;
  updatedAt: number;
};

const TRANSACTION_SELECT_COLUMNS = `
  id,
  type,
  amount,
  currency,
  date,
  account_id as accountId,
  category_id as categoryId,
  to_account_id as toAccountId,
  notes,
  recurring_transaction_id as recurringTransactionId,
  created_at as createdAt,
  updated_at as updatedAt
`;

/**
 * F-002: TransactionsRepository
 * Handles database operations for transactions
 */
export class TransactionsRepository {
  private readonly aggregation: TransactionsAggregation;

  constructor(private readonly db: SqliteDatabase) {
    this.aggregation = new TransactionsAggregation(db);
  }

  /**
   * Create a new transaction
   */
  async create(input: CreateTransactionInput): Promise<Transaction> {
    const id = uuidv4();
    const now = Date.now();
    const currency = input.currency ?? DEFAULT_CURRENCY;

    await this.db.execute(
      `
        INSERT INTO transactions (
          id,
          type,
          amount,
          currency,
          date,
          account_id,
          category_id,
          to_account_id,
          notes,
          recurring_transaction_id,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        id,
        input.type,
        input.amount,
        currency,
        input.date,
        input.accountId,
        input.categoryId ?? null, // Null for transfers
        input.toAccountId ?? null,
        input.notes ?? null,
        input.recurringTransactionId ?? null,
        now,
        now,
      ],
    );

    return {
      id,
      type: input.type,
      amount: input.amount,
      currency,
      date: input.date,
      accountId: input.accountId,
      categoryId: input.categoryId,
      toAccountId: input.toAccountId,
      notes: input.notes,
      recurringTransactionId: input.recurringTransactionId,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Find transaction by ID
   */
  async findById(id: string): Promise<Transaction | null> {
    const row = await this.getTransactionRow(id);
    return row ? this.mapRow(row) : null;
  }

  /**
   * Find all transactions with optional filtering and pagination
   */
  async findAll(filter?: FilterParams, pagination?: PaginationParams): Promise<Transaction[]> {
    const conditions: Condition[] = [];

    if (filter?.accountId) {
      conditions.push({
        clause: '(account_id = ? OR to_account_id = ?)',
        params: [filter.accountId, filter.accountId],
      });
    }

    if (filter?.categoryId) {
      conditions.push({ clause: 'category_id = ?', params: [filter.categoryId] });
    }

    if (filter?.type) {
      conditions.push({ clause: 'type = ?', params: [filter.type] });
    }

    if (filter?.dateRange) {
      if (filter.dateRange.startDate) {
        conditions.push({ clause: 'date >= ?', params: [filter.dateRange.startDate] });
      }
      if (filter.dateRange.endDate) {
        conditions.push({ clause: 'date <= ?', params: [filter.dateRange.endDate] });
      }
    }

    const { whereClause, params } = buildWhereClause(conditions);

    let limitClause = '';
    let allParams = params;

    if (pagination) {
      const limitResult = buildLimitClause(pagination.limit, pagination.offset);
      limitClause = limitResult.limitClause;
      allParams = [...params, ...limitResult.params];
    }

    const rows = await this.db.query<TransactionRow>(
      `
      SELECT ${TRANSACTION_SELECT_COLUMNS}
      FROM transactions
      ${whereClause}
      ORDER BY date DESC, created_at DESC
      ${limitClause};
    `,
      allParams,
    );

    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Find transactions by account ID
   */
  async findByAccount(accountId: string, pagination?: PaginationParams): Promise<Transaction[]> {
    return this.findAll({ accountId }, pagination);
  }

  /**
   * Find transactions by category ID
   */
  async findByCategory(categoryId: string, pagination?: PaginationParams): Promise<Transaction[]> {
    return this.findAll({ categoryId }, pagination);
  }

  /**
   * Find transactions within a date range
   */
  async findByDateRange(
    startDate: string,
    endDate: string,
    pagination?: PaginationParams,
  ): Promise<Transaction[]> {
    return this.findAll({ dateRange: { startDate, endDate } }, pagination);
  }

  /**
   * Search transactions by notes
   */
  async search(query: string, pagination?: PaginationParams): Promise<Transaction[]> {
    const params: SqliteValue[] = [`%${query}%`];

    let limitClause = '';
    if (pagination) {
      limitClause = `LIMIT ? OFFSET ?`;
      params.push(pagination.limit, pagination.offset);
    }

    const rows = await this.db.query<TransactionRow>(
      `
        SELECT ${TRANSACTION_SELECT_COLUMNS}
        FROM transactions
        WHERE notes LIKE ?
        ORDER BY date DESC, created_at DESC
        ${limitClause};
      `,
      params,
    );

    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Count transactions with optional filtering
   */
  async count(filter?: FilterParams): Promise<number> {
    const conditions: Condition[] = [];

    if (filter?.accountId) {
      conditions.push({
        clause: '(account_id = ? OR to_account_id = ?)',
        params: [filter.accountId, filter.accountId],
      });
    }

    if (filter?.categoryId) {
      conditions.push({ clause: 'category_id = ?', params: [filter.categoryId] });
    }

    if (filter?.type) {
      conditions.push({ clause: 'type = ?', params: [filter.type] });
    }

    if (filter?.dateRange) {
      if (filter.dateRange.startDate) {
        conditions.push({ clause: 'date >= ?', params: [filter.dateRange.startDate] });
      }
      if (filter.dateRange.endDate) {
        conditions.push({ clause: 'date <= ?', params: [filter.dateRange.endDate] });
      }
    }

    const { whereClause, params } = buildWhereClause(conditions);

    const rows = await this.db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM transactions ${whereClause};`,
      params,
    );

    return rows[0]?.count ?? 0;
  }

  /**
   * Update an existing transaction
   */
  async update(input: UpdateTransactionInput): Promise<Transaction> {
    const updates: Record<string, SqliteValue> = {};

    if (input.type !== undefined) {
      updates.type = input.type;
    }

    if (input.amount !== undefined) {
      updates.amount = input.amount;
    }

    if (input.currency !== undefined) {
      updates.currency = input.currency;
    }

    if (input.date !== undefined) {
      updates.date = input.date;
    }

    if (input.accountId !== undefined) {
      updates.account_id = input.accountId;
    }

    if (input.categoryId !== undefined) {
      updates.category_id = input.categoryId ?? null; // Null for transfers
    }

    if (input.toAccountId !== undefined) {
      updates.to_account_id = input.toAccountId ?? null;
    }

    if (input.notes !== undefined) {
      updates.notes = input.notes ?? null;
    }

    const { setClause, params } = buildUpdateClause(updates, true);

    const result = await this.db.execute(
      `UPDATE transactions SET ${setClause} WHERE id = ?`,
      [...params, input.id],
    );

    if (result.rowsAffected === 0) {
      throw new Error(`Transaction not found for id: ${input.id}`);
    }

    const row = await this.getTransactionRow(input.id);
    if (!row) {
      throw new Error(`Failed to load transaction after update: ${input.id}`);
    }

    return this.mapRow(row);
  }

  /**
   * Delete a transaction (hard delete)
   */
  async delete(id: string): Promise<void> {
    const result = await this.db.execute('DELETE FROM transactions WHERE id = ?', [id]);
    if (result.rowsAffected === 0) {
      throw new Error(`Transaction not found for id: ${id}`);
    }
  }

  /**
   * F-004: Aggregate transactions by category
   * Returns totals grouped by category with category details
   * Delegates to TransactionsAggregation for separation of concerns
   */
  async aggregateByCategory(filter: FilterParams): Promise<CategoryAggregation[]> {
    return this.aggregation.aggregateByCategory(filter);
  }

  /**
   * Helper to get a single transaction row
   */
  private async getTransactionRow(id: string): Promise<TransactionRow | null> {
    const rows = await this.db.query<TransactionRow>(
      `
        SELECT ${TRANSACTION_SELECT_COLUMNS}
        FROM transactions
        WHERE id = ?
        LIMIT 1;
      `,
      [id],
    );

    return rows.length ? rows[0] : null;
  }

  /**
   * Map database row to Transaction entity
   */
  private mapRow(row: TransactionRow): Transaction {
    return {
      id: row.id,
      type: row.type as TransactionType,
      amount: row.amount,
      currency: row.currency,
      date: row.date,
      accountId: row.accountId,
      categoryId: row.categoryId ?? undefined, // Undefined for transfers
      toAccountId: row.toAccountId ?? undefined,
      notes: row.notes ?? undefined,
      recurringTransactionId: row.recurringTransactionId ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
