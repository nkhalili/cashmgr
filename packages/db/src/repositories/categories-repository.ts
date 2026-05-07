import { Category, CreateCategoryInput, UpdateCategoryInput, CategoryType } from '@cashmgr/core';
import { SqliteDatabase, SqliteValue } from '../sqlite/types';
import { v4 as uuidv4 } from 'uuid';
import { buildUpdateClause } from '../utils/query-builder';

/**
 * F-003: Row type matching database schema
 */
type CategoryRow = {
  id: string;
  name: string;
  type: string;
  color: string | null;
  icon: string | null;
  parentId: string | null;
  isActive: number; // SQLite stores boolean as integer
  createdAt: number;
  updatedAt: number;
};

const CATEGORY_SELECT_COLUMNS = `
  id,
  name,
  type,
  color,
  icon,
  parent_id as parentId,
  is_active as isActive,
  created_at as createdAt,
  updated_at as updatedAt
`;

/**
 * F-003: CategoriesRepository
 * Handles database operations for categories
 */
export class CategoriesRepository {
  constructor(private readonly db: SqliteDatabase) {}

  /**
   * Create a new category
   */
  async create(input: CreateCategoryInput): Promise<Category> {
    const id = uuidv4();
    const now = Date.now();

    await this.db.execute(
      `
        INSERT INTO categories (
          id,
          name,
          type,
          color,
          icon,
          parent_id,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        id,
        input.name,
        input.type,
        input.color ?? null,
        input.icon ?? null,
        input.parentId ?? null,
        1,
        now,
        now,
      ],
    );

    return {
      id,
      name: input.name,
      type: input.type,
      color: input.color,
      icon: input.icon,
      parentId: input.parentId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Find category by ID
   */
  async findById(id: string): Promise<Category | null> {
    const row = await this.getCategoryRow(id);
    return row ? this.mapRow(row) : null;
  }

  /**
   * Find all categories
   * @param activeOnly - If true, only return active categories
   */
  async findAll(activeOnly = false): Promise<Category[]> {
    const whereClause = activeOnly ? 'WHERE is_active = 1' : '';

    const rows = await this.db.query<CategoryRow>(`
      SELECT ${CATEGORY_SELECT_COLUMNS}
      FROM categories
      ${whereClause}
      ORDER BY parent_id NULLS FIRST, name ASC;
    `);

    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Find categories by type
   * @param type - 'income' or 'expense'
   * @param activeOnly - If true, only return active categories
   */
  async findByType(type: CategoryType, activeOnly = false): Promise<Category[]> {
    const activeClause = activeOnly ? ' AND is_active = 1' : '';

    const rows = await this.db.query<CategoryRow>(
      `
        SELECT ${CATEGORY_SELECT_COLUMNS}
        FROM categories
        WHERE type = ?${activeClause}
        ORDER BY parent_id NULLS FIRST, name ASC;
      `,
      [type],
    );

    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Find subcategories by parent ID
   * @param parentId - The parent category ID
   * @param activeOnly - If true, only return active categories
   */
  async findByParentId(parentId: string, activeOnly = false): Promise<Category[]> {
    const activeClause = activeOnly ? ' AND is_active = 1' : '';

    const rows = await this.db.query<CategoryRow>(
      `
        SELECT ${CATEGORY_SELECT_COLUMNS}
        FROM categories
        WHERE parent_id = ?${activeClause}
        ORDER BY name ASC;
      `,
      [parentId],
    );

    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Find top-level categories (no parent)
   * @param activeOnly - If true, only return active categories
   */
  async findTopLevel(activeOnly = false): Promise<Category[]> {
    const activeClause = activeOnly ? ' AND is_active = 1' : '';

    const rows = await this.db.query<CategoryRow>(`
      SELECT ${CATEGORY_SELECT_COLUMNS}
      FROM categories
      WHERE parent_id IS NULL${activeClause}
      ORDER BY type, name ASC;
    `);

    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Update an existing category
   */
  async update(input: UpdateCategoryInput): Promise<Category> {
    const updates: Record<string, SqliteValue> = {};

    if (input.name !== undefined) {
      updates.name = input.name;
    }

    if (input.type !== undefined) {
      updates.type = input.type;
    }

    if (input.color !== undefined) {
      updates.color = input.color ?? null;
    }

    if (input.icon !== undefined) {
      updates.icon = input.icon ?? null;
    }

    if (input.parentId !== undefined) {
      updates.parent_id = input.parentId ?? null;
    }

    if (input.isActive !== undefined) {
      updates.is_active = input.isActive ? 1 : 0;
    }

    const { setClause, params } = buildUpdateClause(updates, true);

    const result = await this.db.execute(
      `UPDATE categories SET ${setClause} WHERE id = ?`,
      [...params, input.id],
    );

    if (result.rowsAffected === 0) {
      throw new Error(`Category not found for id: ${input.id}`);
    }

    const row = await this.getCategoryRow(input.id);
    if (!row) {
      throw new Error(`Failed to load category after update: ${input.id}`);
    }

    return this.mapRow(row);
  }

  /**
   * Delete a category (soft delete - sets isActive to false)
   */
  async delete(id: string): Promise<void> {
    const result = await this.db.execute(
      'UPDATE categories SET is_active = 0, updated_at = ? WHERE id = ?',
      [Date.now(), id],
    );
    if (result.rowsAffected === 0) {
      throw new Error(`Category not found for id: ${id}`);
    }
  }

  /**
   * Hard delete a category (permanent removal)
   */
  async hardDelete(id: string): Promise<void> {
    const result = await this.db.execute('DELETE FROM categories WHERE id = ?', [id]);
    if (result.rowsAffected === 0) {
      throw new Error(`Category not found for id: ${id}`);
    }
  }

  /**
   * Check if a category has subcategories
   */
  async hasSubcategories(id: string): Promise<boolean> {
    const rows = await this.db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = ? AND is_active = 1',
      [id],
    );
    return rows[0]?.count > 0;
  }

  /**
   * Helper to get a single category row
   */
  private async getCategoryRow(id: string): Promise<CategoryRow | null> {
    const rows = await this.db.query<CategoryRow>(
      `
        SELECT ${CATEGORY_SELECT_COLUMNS}
        FROM categories
        WHERE id = ?
        LIMIT 1;
      `,
      [id],
    );

    return rows.length ? rows[0] : null;
  }

  /**
   * Map database row to Category entity
   */
  private mapRow(row: CategoryRow): Category {
    return {
      id: row.id,
      name: row.name,
      type: row.type as CategoryType,
      color: row.color ?? undefined,
      icon: row.icon ?? undefined,
      parentId: row.parentId ?? undefined,
      isActive: row.isActive === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
