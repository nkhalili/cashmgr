import type {
  Budget,
  BudgetWithProgress,
  CreateBudgetInput,
  UpdateBudgetInput,
} from '@cashmgr/core';
import { getMonthStartDateString, getMonthEndDateString } from '@cashmgr/core';
import { SqliteDatabase, SqliteValue } from '../sqlite/types';
import { v4 as uuidv4 } from 'uuid';
import { buildUpdateClause } from '../utils/query-builder';

type BudgetRow = {
  id: string;
  category_id: string;
  amount: number;
  month: number;
  year: number;
  created_at: number;
  updated_at: number;
};

type BudgetProgressRow = BudgetRow & {
  category_name: string;
  category_color: string | null;
  category_icon: string | null;
  spent: number;
};

const BUDGET_SELECT_COLUMNS = `
  id,
  category_id,
  amount,
  month,
  year,
  created_at,
  updated_at
`;

export class BudgetsRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async create(input: CreateBudgetInput): Promise<Budget> {
    const now = Date.now();

    // Reactivate a soft-deleted row if one exists for this (category, month, year)
    const tombstone = await this.db.query<{ id: string }>(
      `SELECT id FROM budgets WHERE category_id = ? AND month = ? AND year = ? AND is_deleted = 1 LIMIT 1`,
      [input.categoryId, input.month, input.year],
    );

    if (tombstone.length > 0) {
      await this.db.execute(
        `UPDATE budgets SET amount = ?, is_deleted = 0, updated_at = ? WHERE id = ?`,
        [input.amount, now, tombstone[0].id],
      );
      const row = await this.findById(tombstone[0].id);
      if (!row) throw new Error('Failed to reactivate budget');
      await this.clearFutureTombstones(input.categoryId, input.month, input.year, input.amount, now);
      return row;
    }

    const id = uuidv4();

    await this.db.execute(
      `INSERT INTO budgets (id, category_id, amount, month, year, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, input.categoryId, input.amount, input.month, input.year, now, now],
    );

    await this.clearFutureTombstones(input.categoryId, input.month, input.year, input.amount, now);

    return {
      id,
      categoryId: input.categoryId,
      amount: input.amount,
      month: input.month,
      year: input.year,
      createdAt: now,
      updatedAt: now,
    };
  }

  private async clearFutureTombstones(categoryId: string, month: number, year: number, amount: number, now: number): Promise<void> {
    await this.db.execute(
      `UPDATE budgets SET is_deleted = 0, amount = ?, updated_at = ?
       WHERE category_id = ? AND is_deleted = 1
         AND (year * 12 + month) > (? * 12 + ?)`,
      [amount, now, categoryId, year, month],
    );
  }

  async findById(id: string): Promise<Budget | null> {
    const rows = await this.db.query<BudgetRow>(
      `SELECT ${BUDGET_SELECT_COLUMNS} FROM budgets WHERE id = ? AND is_deleted = 0 LIMIT 1`,
      [id],
    );
    return rows.length ? this.mapRow(rows[0]) : null;
  }

  async findByPeriod(month: number, year: number): Promise<Budget[]> {
    const rows = await this.db.query<BudgetRow>(
      `SELECT ${BUDGET_SELECT_COLUMNS} FROM budgets
       WHERE month = ? AND year = ? AND is_deleted = 0
       ORDER BY created_at ASC`,
      [month, year],
    );
    return rows.map((r) => this.mapRow(r));
  }

  async findByPeriodWithProgress(month: number, year: number): Promise<BudgetWithProgress[]> {
    const startDate = getMonthStartDateString(year, month);
    const endDate = getMonthEndDateString(year, month);

    const rows = await this.db.query<BudgetProgressRow>(
      `SELECT
         b.id, b.category_id, b.amount, b.month, b.year, b.created_at, b.updated_at,
         c.name as category_name, c.color as category_color, c.icon as category_icon,
         COALESCE(SUM(t.amount), 0) as spent
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       LEFT JOIN transactions t
         ON t.type = 'expense'
         AND t.date >= ? AND t.date <= ?
         AND (
           t.category_id = b.category_id
           OR t.category_id IN (SELECT id FROM categories WHERE parent_id = b.category_id)
         )
       WHERE b.month = ? AND b.year = ? AND b.is_deleted = 0
       GROUP BY b.id
       ORDER BY c.name ASC`,
      [startDate, endDate, month, year],
    );

    return rows.map((row) => {
      const spent = row.spent;
      const remaining = row.amount - spent;
      const percentage = row.amount > 0 ? (spent / row.amount) * 100 : 0;
      return {
        id: row.id,
        categoryId: row.category_id,
        amount: row.amount,
        month: row.month,
        year: row.year,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        categoryName: row.category_name,
        categoryColor: row.category_color ?? undefined,
        categoryIcon: row.category_icon ?? undefined,
        spent,
        remaining,
        percentage,
      };
    });
  }

  // Returns the most recent prior budget per category that doesn't have a row (active or
  // deleted) for the requested period. A soft-deleted prior row acts as a stop signal —
  // the outer `b.is_deleted = 0` filter ensures we only propagate from active rows.
  async findPrecedingDefaults(month: number, year: number): Promise<{ categoryId: string; amount: number }[]> {
    const rows = await this.db.query<{ category_id: string; amount: number }>(
      `SELECT b.category_id, b.amount
       FROM budgets b
       WHERE b.is_deleted = 0
         AND (b.year * 12 + b.month) < (? * 12 + ?)
         AND NOT EXISTS (
           SELECT 1 FROM budgets ex
           WHERE ex.category_id = b.category_id
             AND ex.year = ? AND ex.month = ?
         )
         AND (b.year * 12 + b.month) = (
           SELECT MAX(b2.year * 12 + b2.month)
           FROM budgets b2
           WHERE b2.category_id = b.category_id
             AND (b2.year * 12 + b2.month) < (? * 12 + ?)
         )`,
      [year, month, year, month, year, month],
    );
    return rows.map((r) => ({ categoryId: r.category_id, amount: r.amount }));
  }

  async update(input: UpdateBudgetInput): Promise<Budget> {
    const updates: Record<string, SqliteValue> = {};

    if (input.amount !== undefined) {
      updates.amount = input.amount;
    }

    const { setClause, params } = buildUpdateClause(updates, true);

    const result = await this.db.execute(
      `UPDATE budgets SET ${setClause} WHERE id = ? AND is_deleted = 0`,
      [...params, input.id],
    );

    if (result.rowsAffected === 0) {
      throw new Error(`Budget not found for id: ${input.id}`);
    }

    const row = await this.findById(input.id);
    if (!row) throw new Error(`Failed to load budget after update: ${input.id}`);
    return row;
  }

  async delete(id: string): Promise<void> {
    const now = Date.now();

    const rows = await this.db.query<{ category_id: string; month: number; year: number }>(
      `SELECT category_id, month, year FROM budgets WHERE id = ? AND is_deleted = 0 LIMIT 1`,
      [id],
    );
    if (rows.length === 0) throw new Error(`Budget not found for id: ${id}`);
    const { category_id, month, year } = rows[0];

    await this.db.execute(
      `UPDATE budgets SET is_deleted = 1, updated_at = ? WHERE id = ? AND is_deleted = 0`,
      [now, id],
    );

    // Cascade: soft-delete all future active budgets for the same category
    await this.db.execute(
      `UPDATE budgets SET is_deleted = 1, updated_at = ?
       WHERE category_id = ? AND is_deleted = 0
         AND (year * 12 + month) > (? * 12 + ?)`,
      [now, category_id, year, month],
    );
  }

  private mapRow(row: BudgetRow): Budget {
    return {
      id: row.id,
      categoryId: row.category_id,
      amount: row.amount,
      month: row.month,
      year: row.year,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
