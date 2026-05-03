import { describe, expect, it } from 'vitest';
import {
  buildWhereClause,
  buildUpdateClause,
  buildLimitClause,
  addConditionIf,
  type Condition,
} from '../query-builder.js';

describe('buildWhereClause', () => {
  it('should return empty WHERE clause for no conditions', () => {
    const result = buildWhereClause([]);

    expect(result.whereClause).toBe('');
    expect(result.params).toEqual([]);
  });

  it('should build WHERE clause with single condition', () => {
    const conditions: Condition[] = [{ clause: 'id = ?', params: ['123'] }];

    const result = buildWhereClause(conditions);

    expect(result.whereClause).toBe('WHERE id = ?');
    expect(result.params).toEqual(['123']);
  });

  it('should build WHERE clause with multiple conditions', () => {
    const conditions: Condition[] = [
      { clause: 'account_id = ?', params: ['acc-1'] },
      { clause: 'date >= ?', params: ['2024-01-01'] },
      { clause: 'date <= ?', params: ['2024-12-31'] },
    ];

    const result = buildWhereClause(conditions);

    expect(result.whereClause).toBe('WHERE account_id = ? AND date >= ? AND date <= ?');
    expect(result.params).toEqual(['acc-1', '2024-01-01', '2024-12-31']);
  });

  it('should handle conditions with multiple params', () => {
    const conditions: Condition[] = [
      { clause: '(account_id = ? OR to_account_id = ?)', params: ['acc-1', 'acc-1'] },
      { clause: 'type = ?', params: ['expense'] },
    ];

    const result = buildWhereClause(conditions);

    expect(result.whereClause).toBe('WHERE (account_id = ? OR to_account_id = ?) AND type = ?');
    expect(result.params).toEqual(['acc-1', 'acc-1', 'expense']);
  });
});

describe('buildUpdateClause', () => {
  it('should throw error when no fields provided', () => {
    expect(() => buildUpdateClause({}, false)).toThrow('No fields provided for update');
    expect(() => buildUpdateClause({}, true)).toThrow('No fields provided for update');
  });

  it('should build UPDATE clause with single field', () => {
    const updates = { name: 'Test Account' };

    const result = buildUpdateClause(updates, false);

    expect(result.setClause).toBe('name = ?');
    expect(result.params).toEqual(['Test Account']);
  });

  it('should build UPDATE clause with multiple fields', () => {
    const updates = { name: 'Test', balance: 1000, currency: 'USD' };

    const result = buildUpdateClause(updates, false);

    expect(result.setClause).toBe('name = ?, balance = ?, currency = ?');
    expect(result.params).toEqual(['Test', 1000, 'USD']);
  });

  it('should include updated_at timestamp when enabled', () => {
    const updates = { name: 'Test' };

    const result = buildUpdateClause(updates, true);

    expect(result.setClause).toBe('name = ?, updated_at = ?');
    expect(result.params).toHaveLength(2);
    expect(result.params[0]).toBe('Test');
    expect(typeof result.params[1]).toBe('number');
  });

  it('should handle null values', () => {
    const updates = { category_id: null, notes: null };

    const result = buildUpdateClause(updates, false);

    expect(result.setClause).toBe('category_id = ?, notes = ?');
    expect(result.params).toEqual([null, null]);
  });

  it('should handle boolean values converted to integers', () => {
    const updates = { is_active: 1, is_primary: 0 };

    const result = buildUpdateClause(updates, false);

    expect(result.setClause).toBe('is_active = ?, is_primary = ?');
    expect(result.params).toEqual([1, 0]);
  });
});

describe('buildLimitClause', () => {
  it('should build LIMIT clause with limit and offset', () => {
    const result = buildLimitClause(20, 0);

    expect(result.limitClause).toBe('LIMIT ? OFFSET ?');
    expect(result.params).toEqual([20, 0]);
  });

  it('should handle pagination', () => {
    const result = buildLimitClause(10, 30);

    expect(result.limitClause).toBe('LIMIT ? OFFSET ?');
    expect(result.params).toEqual([10, 30]);
  });
});

describe('addConditionIf', () => {
  it('should add condition when shouldAdd is true', () => {
    const conditions: Condition[] = [];

    addConditionIf(conditions, 'status = ?', ['active'], true);

    expect(conditions).toHaveLength(1);
    expect(conditions[0]).toEqual({ clause: 'status = ?', params: ['active'] });
  });

  it('should not add condition when shouldAdd is false', () => {
    const conditions: Condition[] = [];

    addConditionIf(conditions, 'status = ?', ['active'], false);

    expect(conditions).toHaveLength(0);
  });

  it('should allow chaining multiple conditional adds', () => {
    const conditions: Condition[] = [];
    const accountId = 'acc-1';
    const categoryId = undefined;
    const type = 'expense';

    addConditionIf(conditions, 'account_id = ?', [accountId], accountId !== undefined);
    addConditionIf(conditions, 'category_id = ?', [categoryId as string], categoryId !== undefined);
    addConditionIf(conditions, 'type = ?', [type], type !== undefined);

    expect(conditions).toHaveLength(2);
    expect(conditions[0].clause).toBe('account_id = ?');
    expect(conditions[1].clause).toBe('type = ?');
  });
});
