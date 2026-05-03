import { SqliteDatabase } from '../sqlite/types';

/**
 * F-030: Row type matching settings database schema
 */
type SettingRow = {
  key: string;
  value: string;
  updatedAt: number;
};

/**
 * F-030: SettingsRepository
 * Handles database operations for application settings (key-value store)
 */
export class SettingsRepository {
  constructor(private readonly db: SqliteDatabase) {}

  /**
   * Get a setting value by key
   */
  async get(key: string): Promise<string | null> {
    const rows = await this.db.query<SettingRow>(
      `
        SELECT key, value, updated_at as updatedAt
        FROM settings
        WHERE key = ?
        LIMIT 1;
      `,
      [key],
    );

    return rows.length ? rows[0].value : null;
  }

  /**
   * Set a setting value
   * Creates if doesn't exist, updates if exists
   */
  async set(key: string, value: string): Promise<void> {
    const now = Date.now();

    await this.db.execute(
      `
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at;
      `,
      [key, value, now],
    );
  }

  /**
   * Delete a setting
   */
  async delete(key: string): Promise<void> {
    await this.db.execute('DELETE FROM settings WHERE key = ?', [key]);
  }

  /**
   * Get all settings
   */
  async getAll(): Promise<Record<string, string>> {
    const rows = await this.db.query<SettingRow>(`
      SELECT key, value, updated_at as updatedAt
      FROM settings;
    `);

    return rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>);
  }
}
