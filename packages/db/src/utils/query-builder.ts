import type { SqliteValue } from '../sqlite/types.js';

/**
 * Represents a SQL condition with its parameters
 */
export interface Condition {
  clause: string;
  params: SqliteValue[];
}

/**
 * Result of building a WHERE clause
 */
export interface WhereClauseResult {
  whereClause: string;
  params: SqliteValue[];
}

/**
 * Result of building an UPDATE SET clause
 */
export interface UpdateClauseResult {
  setClause: string;
  params: SqliteValue[];
}

/**
 * Builds a WHERE clause from an array of conditions
 * @param conditions - Array of SQL conditions with their parameters
 * @returns WHERE clause string and flat array of parameters
 *
 * @example
 * const { whereClause, params } = buildWhereClause([
 *   { clause: 'account_id = ?', params: ['acc-123'] },
 *   { clause: 'date >= ?', params: ['2024-01-01'] }
 * ]);
 * // whereClause: 'WHERE account_id = ? AND date >= ?'
 * // params: ['acc-123', '2024-01-01']
 */
export function buildWhereClause(conditions: Condition[]): WhereClauseResult {
  if (conditions.length === 0) {
    return { whereClause: '', params: [] };
  }

  const clauses = conditions.map((c) => c.clause);
  const params = conditions.flatMap((c) => c.params);

  return {
    whereClause: `WHERE ${clauses.join(' AND ')}`,
    params,
  };
}

/**
 * Builds a SET clause for UPDATE queries with automatic timestamp management
 * @param updates - Object mapping column names to values
 * @param includeTimestamp - Whether to automatically add updated_at timestamp (default: true)
 * @returns SET clause string and array of parameters
 *
 * @example
 * const { setClause, params } = buildUpdateClause(
 *   { name: 'John', email: 'john@example.com' },
 *   true
 * );
 * // setClause: 'name = ?, email = ?, updated_at = ?'
 * // params: ['John', 'john@example.com', 1234567890]
 */
export function buildUpdateClause(
  updates: Record<string, SqliteValue>,
  includeTimestamp = true,
): UpdateClauseResult {
  const entries = Object.entries(updates);

  if (entries.length === 0) {
    throw new Error('No fields provided for update');
  }

  const setClauses: string[] = [];
  const params: SqliteValue[] = [];

  for (const [column, value] of entries) {
    setClauses.push(`${column} = ?`);
    params.push(value);
  }

  if (includeTimestamp) {
    const now = Date.now();
    setClauses.push('updated_at = ?');
    params.push(now);
  }

  return {
    setClause: setClauses.join(', '),
    params,
  };
}

/**
 * Builds a LIMIT/OFFSET clause with parameters
 * @param limit - Maximum number of rows to return
 * @param offset - Number of rows to skip
 * @returns LIMIT clause string and parameters
 *
 * @example
 * const { limitClause, params } = buildLimitClause(20, 40);
 * // limitClause: 'LIMIT ? OFFSET ?'
 * // params: [20, 40]
 */
export function buildLimitClause(
  limit: number,
  offset: number,
): { limitClause: string; params: SqliteValue[] } {
  return {
    limitClause: 'LIMIT ? OFFSET ?',
    params: [limit, offset],
  };
}

/**
 * Helper to add a condition only if the value is defined
 * @param conditions - Array to push condition to
 * @param clause - SQL clause string
 * @param params - Parameters for the clause
 *
 * @example
 * const conditions: Condition[] = [];
 * addConditionIf(conditions, 'status = ?', [status], status !== undefined);
 */
export function addConditionIf(
  conditions: Condition[],
  clause: string,
  params: SqliteValue[],
  shouldAdd: boolean,
): void {
  if (shouldAdd) {
    conditions.push({ clause, params });
  }
}
