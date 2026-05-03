import { Currency, CreateCurrencyInput, UpdateCurrencyInput } from '@cashmgr/core';
import { SqliteDatabase, SqliteValue } from '../sqlite/types.js';
import { buildUpdateClause } from '../utils/query-builder.js';

/**
 * F-030: Row type matching database schema
 */
type CurrencyRow = {
  id: string;
  name: string;
  symbol: string;
  isPrimary: number; // SQLite stores boolean as integer
  exchangeRate: number;
  lastUpdated: number;
  isActive: number; // SQLite stores boolean as integer
  createdAt: number;
  updatedAt: number;
};

const CURRENCY_SELECT_COLUMNS = `
  id,
  name,
  symbol,
  is_primary as isPrimary,
  exchange_rate as exchangeRate,
  last_updated as lastUpdated,
  is_active as isActive,
  created_at as createdAt,
  updated_at as updatedAt
`;

/**
 * F-030: CurrenciesRepository
 * Handles database operations for currencies
 */
export class CurrenciesRepository {
  constructor(private readonly db: SqliteDatabase) {}

  /**
   * Create a new currency
   */
  async create(input: CreateCurrencyInput): Promise<Currency> {
    const now = Date.now();
    const isPrimary = input.isPrimary ? 1 : 0;
    const exchangeRate = input.exchangeRate ?? 1.0;

    await this.db.execute(
      `
        INSERT INTO currencies (
          id,
          name,
          symbol,
          is_primary,
          exchange_rate,
          last_updated,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [input.id, input.name, input.symbol, isPrimary, exchangeRate, now, 1, now, now],
    );

    return {
      id: input.id,
      name: input.name,
      symbol: input.symbol,
      isPrimary: input.isPrimary,
      exchangeRate,
      lastUpdated: now,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Find currency by ID
   */
  async findById(id: string): Promise<Currency | null> {
    const row = await this.getCurrencyRow(id);
    return row ? this.mapRow(row) : null;
  }

  /**
   * Find all currencies
   * @param activeOnly - If true, only return active currencies
   */
  async findAll(activeOnly = false): Promise<Currency[]> {
    const whereClause = activeOnly ? 'WHERE is_active = 1' : '';

    const rows = await this.db.query<CurrencyRow>(`
      SELECT ${CURRENCY_SELECT_COLUMNS}
      FROM currencies
      ${whereClause}
      ORDER BY is_primary DESC, name ASC;
    `);

    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Find the primary currency
   */
  async findPrimary(): Promise<Currency | null> {
    const rows = await this.db.query<CurrencyRow>(
      `
        SELECT ${CURRENCY_SELECT_COLUMNS}
        FROM currencies
        WHERE is_primary = 1
        LIMIT 1;
      `
    );

    return rows.length ? this.mapRow(rows[0]) : null;
  }

  /**
   * Update an existing currency
   */
  async update(input: UpdateCurrencyInput): Promise<Currency> {
    const updates: Record<string, SqliteValue> = {};

    if (input.name !== undefined) {
      updates.name = input.name;
    }

    if (input.symbol !== undefined) {
      updates.symbol = input.symbol;
    }

    if (input.exchangeRate !== undefined) {
      updates.exchange_rate = input.exchangeRate;
      updates.last_updated = Date.now();
    }

    if (input.isPrimary !== undefined) {
      updates.is_primary = input.isPrimary ? 1 : 0;
    }

    if (input.isActive !== undefined) {
      updates.is_active = input.isActive ? 1 : 0;
    }

    const { setClause, params } = buildUpdateClause(updates, true);

    const result = await this.db.execute(
      `UPDATE currencies SET ${setClause} WHERE id = ?`,
      [...params, input.id],
    );

    if (result.rowsAffected === 0) {
      throw new Error(`Currency not found for id: ${input.id}`);
    }

    const row = await this.getCurrencyRow(input.id);
    if (!row) {
      throw new Error(`Failed to load currency after update: ${input.id}`);
    }

    return this.mapRow(row);
  }

  /**
   * Delete a currency
   */
  async delete(id: string): Promise<void> {
    const result = await this.db.execute('DELETE FROM currencies WHERE id = ?', [id]);
    if (result.rowsAffected === 0) {
      throw new Error(`Currency not found for id: ${id}`);
    }
  }

  /**
   * Set a currency as primary (and unset all others)
   */
  async setPrimary(id: string): Promise<void> {
    // Start transaction to ensure atomicity
    await this.db.execute('BEGIN TRANSACTION');

    try {
      // Unset all primary currencies
      await this.db.execute('UPDATE currencies SET is_primary = 0');

      // Set the specified currency as primary
      const result = await this.db.execute(
        'UPDATE currencies SET is_primary = 1, exchange_rate = 1.0, updated_at = ? WHERE id = ?',
        [Date.now(), id]
      );

      if (result.rowsAffected === 0) {
        throw new Error(`Currency not found for id: ${id}`);
      }

      await this.db.execute('COMMIT');
    } catch (error) {
      await this.db.execute('ROLLBACK');
      throw error;
    }
  }

  /**
   * Helper to get a single currency row
   */
  private async getCurrencyRow(id: string): Promise<CurrencyRow | null> {
    const rows = await this.db.query<CurrencyRow>(
      `
        SELECT ${CURRENCY_SELECT_COLUMNS}
        FROM currencies
        WHERE id = ?
        LIMIT 1;
      `,
      [id],
    );

    return rows.length ? rows[0] : null;
  }

  /**
   * Map database row to Currency entity
   */
  private mapRow(row: CurrencyRow): Currency {
    return {
      id: row.id,
      name: row.name,
      symbol: row.symbol,
      isPrimary: row.isPrimary === 1,
      exchangeRate: row.exchangeRate,
      lastUpdated: row.lastUpdated,
      isActive: row.isActive === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
