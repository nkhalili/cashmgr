import Database from 'better-sqlite3';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CURRENCY } from '@cashmgr/core';
import { AccountsRepository } from '../accounts-repository';
import { ALL_SCHEMA_STATEMENTS } from '../../schema';
import { SqliteDatabase, SqliteParams, SqliteRunResult } from '../../sqlite/types';

class InMemorySqliteDatabase implements SqliteDatabase {
  constructor(private readonly db: Database.Database) {}

  async execute(sql: string, params?: SqliteParams): Promise<SqliteRunResult> {
    const statement = this.db.prepare(sql);
    const result = params ? statement.run(...params) : statement.run();
    const lastInsertRowId = result.lastInsertRowid;

    return {
      rowsAffected: result.changes,
      lastInsertRowId:
        typeof lastInsertRowId === 'bigint' ? Number(lastInsertRowId) : lastInsertRowId,
    };
  }

  async query<T>(sql: string, params?: SqliteParams): Promise<T[]> {
    const statement = this.db.prepare(sql);
    return (params ? statement.all(...params) : statement.all()) as T[];
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

function createRepository(): { repository: AccountsRepository; sqliteDb: InMemorySqliteDatabase } {
  const rawDb = new Database(':memory:');
  rawDb.pragma('foreign_keys = ON');
  for (const statement of ALL_SCHEMA_STATEMENTS) {
    rawDb.exec(statement);
  }

  const sqliteDb = new InMemorySqliteDatabase(rawDb);
  return {
    repository: new AccountsRepository(sqliteDb),
    sqliteDb,
  };
}

describe('AccountsRepository', () => {
  let repository: AccountsRepository;
  let sqliteDb: InMemorySqliteDatabase;

  beforeEach(() => {
    ({ repository, sqliteDb } = createRepository());
  });

  afterEach(async () => {
    await sqliteDb.close();
    vi.useRealTimers();
  });

  it('creates accounts with defaults and persists data', async () => {
    vi.useFakeTimers();
    const createdAt = new Date('2024-01-01T00:00:00Z');
    vi.setSystemTime(createdAt);

    const created = await repository.create({
      name: 'Daily Cash',
      type: 'cash',
    });

    expect(created.currency).toBe(DEFAULT_CURRENCY);
    expect(created.initialBalance).toBe(0);
    expect(created.balance).toBe(0);
    expect(created.createdAt).toBe(createdAt.getTime());
    expect(created.updatedAt).toBe(createdAt.getTime());

    const stored = await repository.findById(created.id);
    expect(stored).toEqual(created);
  });

  it('returns null when the account does not exist', async () => {
    await expect(repository.findById('missing-account')).resolves.toBeNull();
  });

  it('returns all accounts ordered by creation time', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    const first = await repository.create({ name: 'Cash Wallet', type: 'cash' });

    vi.setSystemTime(new Date('2024-01-01T01:00:00Z'));
    const second = await repository.create({ name: 'Savings', type: 'bank', initialBalance: 250 });

    const accounts = await repository.findAll();
    expect(accounts.map((account) => account.id)).toEqual([first.id, second.id]);
    expect(accounts[0].createdAt).toBeLessThan(accounts[1].createdAt);
  });

  it('updates provided fields and refreshes updatedAt', async () => {
    const original = await repository.create({
      name: 'Checking',
      type: 'bank',
      initialBalance: 100,
      currency: 'USD',
    });

    vi.useFakeTimers();
    const updatedAt = new Date('2024-02-15T12:34:00Z');
    vi.setSystemTime(updatedAt);

    const updated = await repository.update({
      id: original.id,
      name: 'Emergency Fund',
      type: 'cash',
      balance: 275,
      initialBalance: 150,
      currency: 'CAD',
    });

    expect(updated.name).toBe('Emergency Fund');
    expect(updated.type).toBe('cash');
    expect(updated.balance).toBe(275);
    expect(updated.initialBalance).toBe(150);
    expect(updated.currency).toBe('CAD');
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.updatedAt).toBe(updatedAt.getTime());

    const stored = await repository.findById(original.id);
    expect(stored).toEqual(updated);
  });

  it('throws when update is called without fields', async () => {
    const original = await repository.create({ name: 'Travel Fund', type: 'cash' });

    await expect(repository.update({ id: original.id })).rejects.toThrow(
      'No fields provided for update',
    );
  });

  it('deletes accounts and errors when the id is missing', async () => {
    const created = await repository.create({ name: 'Throwaway', type: 'cash' });

    await repository.delete(created.id);
    await expect(repository.findById(created.id)).resolves.toBeNull();
    await expect(repository.delete(created.id)).rejects.toThrow(
      `Account not found for id: ${created.id}`,
    );
  });
});
