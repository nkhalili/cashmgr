import { FilterParams, CategoryAggregation } from '@cashmgr/core';
import { SqliteDatabase } from '../sqlite/types';
import { buildWhereClause, type Condition } from '../utils/query-builder';

/**
 * Handles aggregation queries for transactions
 * Separated from TransactionsRepository to maintain single responsibility
 */
export class TransactionsAggregation {
  constructor(private readonly db: SqliteDatabase) {}

  /**
   * Aggregate transactions by category
   * Returns totals grouped by category with category details
   *
   * @param filter - Filter parameters (type, dateRange, accountId)
   * @returns Array of category aggregations with totals and counts
   */
  async aggregateByCategory(filter: FilterParams): Promise<CategoryAggregation[]> {
    const conditions: Condition[] = [];

    // Filter by type (income/expense only, not transfer)
    if (filter.type) {
      conditions.push({ clause: 't.type = ?', params: [filter.type] });
    }

    // Filter by date range
    if (filter.dateRange) {
      if (filter.dateRange.startDate) {
        conditions.push({ clause: 't.date >= ?', params: [filter.dateRange.startDate] });
      }
      if (filter.dateRange.endDate) {
        conditions.push({ clause: 't.date <= ?', params: [filter.dateRange.endDate] });
      }
    }

    // Filter by account
    if (filter.accountId) {
      conditions.push({ clause: 't.account_id = ?', params: [filter.accountId] });
    }

    const { whereClause, params } = buildWhereClause(conditions);

    type AggregationRow = {
      categoryId: string;
      categoryName: string;
      categoryIcon: string | null;
      categoryColor: string | null;
      total: number;
      count: number;
    };

    const rows = await this.db.query<AggregationRow>(
      `
        SELECT
          c.id as categoryId,
          c.name as categoryName,
          c.icon as categoryIcon,
          c.color as categoryColor,
          SUM(t.amount) as total,
          COUNT(t.id) as count
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        ${whereClause}
        GROUP BY c.id, c.name, c.icon, c.color
        ORDER BY total DESC;
      `,
      params,
    );

    return rows.map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      categoryIcon: row.categoryIcon,
      categoryColor: row.categoryColor,
      total: row.total,
      count: row.count,
    }));
  }
}
