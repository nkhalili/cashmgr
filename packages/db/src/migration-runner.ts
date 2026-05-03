/**
 * Migration Runner
 * F-022: Handles execution of database migrations
 */

import { SqliteDatabase } from './sqlite/types';
import {
  getMigrationsToRun,
  getMigrationsToRollback,
  getLatestVersion,
  SCHEMA_MIGRATIONS_TABLE,
  Migration,
} from './migrations';

/**
 * Get the current schema version from the database
 */
export async function getCurrentVersion(db: SqliteDatabase): Promise<number> {
  // Ensure schema_migrations table exists
  await db.execute(SCHEMA_MIGRATIONS_TABLE);

  // Get the highest version number
  const result = await db.query<{ version: number }>(
    'SELECT MAX(version) as version FROM schema_migrations'
  );

  return result.length > 0 && result[0].version !== null ? result[0].version : 0;
}

/**
 * Record a migration as applied
 */
async function recordMigration(
  db: SqliteDatabase,
  migration: Migration
): Promise<void> {
  await db.execute(
    'INSERT INTO schema_migrations (version, description, applied_at) VALUES (?, ?, ?)',
    [migration.version, migration.description, new Date().toISOString()]
  );
}

/**
 * Remove a migration record (for rollback)
 */
async function removeMigrationRecord(
  db: SqliteDatabase,
  version: number
): Promise<void> {
  await db.execute('DELETE FROM schema_migrations WHERE version = ?', [version]);
}

/**
 * Run pending migrations up to the target version
 * If targetVersion is not provided, runs all pending migrations
 */
export async function runMigrations(
  db: SqliteDatabase,
  targetVersion?: number
): Promise<void> {
  const currentVersion = await getCurrentVersion(db);
  const target = targetVersion ?? getLatestVersion();

  if (currentVersion >= target) {
    console.log(`Database is already at version ${currentVersion}, no migrations needed`);
    return;
  }

  const migrationsToRun = getMigrationsToRun(currentVersion).filter(
    (m) => m.version <= target
  );

  if (migrationsToRun.length === 0) {
    console.log('No pending migrations');
    return;
  }

  console.log(`Running ${migrationsToRun.length} migration(s)...`);

  for (const migration of migrationsToRun) {
    console.log(`Applying migration ${migration.version}: ${migration.description}`);

    try {
      // Execute all UP statements
      for (const statement of migration.up) {
        await db.execute(statement);
      }

      // Record the migration
      await recordMigration(db, migration);

      console.log(`✓ Migration ${migration.version} applied successfully`);
    } catch (error) {
      // Error will be handled by ErrorHandler in adapter/service layer
      throw new Error(
        `Migration ${migration.version} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  const newVersion = await getCurrentVersion(db);
  console.log(`Database migrated from version ${currentVersion} to ${newVersion}`);
}

/**
 * Rollback migrations to the target version
 */
export async function rollbackMigrations(
  db: SqliteDatabase,
  targetVersion: number
): Promise<void> {
  const currentVersion = await getCurrentVersion(db);

  if (currentVersion <= targetVersion) {
    console.log(`Database is already at version ${currentVersion}, no rollback needed`);
    return;
  }

  const migrationsToRollback = getMigrationsToRollback(currentVersion, targetVersion);

  if (migrationsToRollback.length === 0) {
    console.log('No migrations to rollback');
    return;
  }

  console.log(`Rolling back ${migrationsToRollback.length} migration(s)...`);

  for (const migration of migrationsToRollback) {
    console.log(`Rolling back migration ${migration.version}: ${migration.description}`);

    try {
      // Execute all DOWN statements
      for (const statement of migration.down) {
        await db.execute(statement);
      }

      // Remove the migration record
      await removeMigrationRecord(db, migration.version);

      console.log(`✓ Migration ${migration.version} rolled back successfully`);
    } catch (error) {
      // Error will be handled by ErrorHandler in adapter/service layer
      throw new Error(
        `Rollback of migration ${migration.version} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  const newVersion = await getCurrentVersion(db);
  console.log(`Database rolled back from version ${currentVersion} to ${newVersion}`);
}

/**
 * Get migration status information
 */
export async function getMigrationStatus(db: SqliteDatabase): Promise<{
  currentVersion: number;
  latestVersion: number;
  pendingMigrations: Migration[];
  appliedMigrations: number[];
}> {
  const currentVersion = await getCurrentVersion(db);
  const latestVersion = getLatestVersion();
  const pendingMigrations = getMigrationsToRun(currentVersion);

  // Get list of applied migration versions
  const appliedResult = await db.query<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version'
  );
  const appliedMigrations = appliedResult.map((r) => r.version);

  return {
    currentVersion,
    latestVersion,
    pendingMigrations,
    appliedMigrations,
  };
}
