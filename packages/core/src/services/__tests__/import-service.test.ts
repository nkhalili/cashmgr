import { describe, it, expect, beforeEach } from 'vitest';
import { previewImport, importData } from '../import-service';
import { EXPORT_SCHEMA_VERSION } from '../export-service';
import type { ExportBackup } from '../export-service';
import { MockCoreAdapter } from './mock-core-adapter';

function makeBackup(overrides: Partial<ExportBackup> = {}): string {
  const base: ExportBackup = {
    metadata: {
      appName: 'CashMgr',
      version: '1.0.0',
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportDate: '2026-01-01T00:00:00.000Z',
      platform: 'web',
    },
    data: {
      accounts: [
        { id: 'acc-1', name: 'Cash', type: 'cash', balance: 150, initialBalance: 100, currency: 'USD', createdAt: 1000, updatedAt: 2000 },
      ],
      categories: [
        { id: 'cat-1', name: 'Groceries', type: 'expense', isActive: true, createdAt: 1000, updatedAt: 1000 },
      ],
      currencies: [
        { id: 'USD', name: 'US Dollar', symbol: '$', isPrimary: true, exchangeRate: 1, lastUpdated: 1000, isActive: true, createdAt: 1000, updatedAt: 1000 },
      ],
      transactions: [
        { id: 'tx-1', type: 'income', amount: 50, currency: 'USD', date: '2026-01-15', accountId: 'acc-1', categoryId: 'cat-1', createdAt: 1000, updatedAt: 1000 },
      ],
      budgets: [
        { id: 'bud-1', categoryId: 'cat-1', amount: 200, month: 1, year: 2026, createdAt: 1000, updatedAt: 1000 },
      ],
      deletedBudgets: [],
      settings: {},
    },
    ...overrides,
  };
  return JSON.stringify(base);
}

describe('previewImport', () => {
  it('returns valid preview for a correct backup', () => {
    const preview = previewImport(makeBackup());
    expect(preview.isValid).toBe(true);
    expect(preview.errors).toHaveLength(0);
    expect(preview.counts.accounts).toBe(1);
    expect(preview.counts.transactions).toBe(1);
    expect(preview.counts.categories).toBe(1);
    expect(preview.counts.currencies).toBe(1);
    expect(preview.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
  });

  it('rejects invalid JSON', () => {
    const preview = previewImport('not json {{{');
    expect(preview.isValid).toBe(false);
    expect(preview.errors[0]).toMatch(/invalid json/i);
  });

  it('rejects non-object JSON', () => {
    const preview = previewImport('"just a string"');
    expect(preview.isValid).toBe(false);
  });

  it('rejects missing metadata', () => {
    const preview = previewImport(JSON.stringify({ data: {} }));
    expect(preview.isValid).toBe(false);
    expect(preview.errors[0]).toMatch(/metadata/i);
  });

  it('rejects wrong appName', () => {
    const preview = previewImport(
      makeBackup({ metadata: { appName: 'Other', version: '1.0.0', schemaVersion: EXPORT_SCHEMA_VERSION, exportDate: '', platform: '' } }),
    );
    expect(preview.isValid).toBe(false);
    expect(preview.errors[0]).toMatch(/app name/i);
  });

  it('rejects schema version newer than supported', () => {
    const preview = previewImport(
      makeBackup({ metadata: { appName: 'CashMgr', version: '1.0.0', schemaVersion: EXPORT_SCHEMA_VERSION + 1, exportDate: '', platform: '' } }),
    );
    expect(preview.isValid).toBe(false);
    expect(preview.errors[0]).toMatch(/schema version/i);
  });

  it('rejects missing data field', () => {
    const preview = previewImport(JSON.stringify({ metadata: { appName: 'CashMgr', schemaVersion: EXPORT_SCHEMA_VERSION } }));
    expect(preview.isValid).toBe(false);
  });

  it('flags missing required account fields', () => {
    const backup = JSON.parse(makeBackup()) as ExportBackup;
    (backup.data.accounts as unknown[]) = [{ id: 'acc-1' }]; // missing name and type
    const preview = previewImport(JSON.stringify(backup));
    expect(preview.isValid).toBe(false);
    expect(preview.errors.some((e) => e.includes('name'))).toBe(true);
  });

  it('flags invalid transaction date', () => {
    const backup = JSON.parse(makeBackup()) as ExportBackup;
    backup.data.transactions[0].date = 'not-a-date';
    const preview = previewImport(JSON.stringify(backup));
    expect(preview.isValid).toBe(false);
    expect(preview.errors.some((e) => e.includes('date'))).toBe(true);
  });

  it('flags invalid transaction amount', () => {
    const backup = JSON.parse(makeBackup()) as ExportBackup;
    (backup.data.transactions[0] as unknown as Record<string, unknown>).amount = -5;
    const preview = previewImport(JSON.stringify(backup));
    expect(preview.isValid).toBe(false);
    expect(preview.errors.some((e) => e.includes('amount'))).toBe(true);
  });

  it('handles empty data arrays without errors', () => {
    const backup: ExportBackup = {
      metadata: { appName: 'CashMgr', version: '1.0.0', schemaVersion: EXPORT_SCHEMA_VERSION, exportDate: '', platform: '' },
      data: { accounts: [], categories: [], currencies: [], transactions: [], budgets: [], deletedBudgets: [], settings: {} },
    };
    const preview = previewImport(JSON.stringify(backup));
    expect(preview.isValid).toBe(true);
    expect(preview.counts.accounts).toBe(0);
  });
});

describe('importData', () => {
  let adapter: MockCoreAdapter;

  beforeEach(() => {
    adapter = new MockCoreAdapter();
  });

  describe('replace mode', () => {
    it('imports all entities into empty database', async () => {
      const result = await importData(adapter, makeBackup(), 'replace');

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.imported.accounts).toBe(1);
      expect(result.imported.transactions).toBe(1);
      expect(result.imported.categories).toBe(1);
      expect(result.imported.currencies).toBe(1);
    });

    it('clears existing data before import', async () => {
      adapter.seed({
        accounts: [
          { id: 'old-acc', name: 'Old Account', type: 'cash', balance: 0, initialBalance: 0, currency: 'USD', createdAt: 500, updatedAt: 500 },
        ],
      });

      await importData(adapter, makeBackup(), 'replace');

      const accounts = await adapter.getAccounts();
      expect(accounts.some((a) => a.id === 'old-acc')).toBe(false);
      expect(accounts.some((a) => a.id === 'acc-1')).toBe(true);
    });

    it('rejects invalid JSON', async () => {
      const result = await importData(adapter, 'not json', 'replace');
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects backup with unknown account references in transactions', async () => {
      const backup = JSON.parse(makeBackup()) as ExportBackup;
      backup.data.transactions[0].accountId = 'nonexistent-acc';
      const result = await importData(adapter, JSON.stringify(backup), 'replace');
      expect(result.success).toBe(false);
      expect(result.errors[0]).toMatch(/accountId/);
    });

    it('recalculates account balances after import', async () => {
      const content = makeBackup(); // acc-1 has initialBalance=100, 1 income tx of 50
      await importData(adapter, content, 'replace');

      const accounts = await adapter.getAccounts();
      const acc = accounts.find((a) => a.id === 'acc-1');
      expect(acc?.balance).toBe(150); // 100 initialBalance + 50 income
    });
  });

  describe('merge mode', () => {
    it('adds new entities without removing existing', async () => {
      adapter.seed({
        accounts: [
          { id: 'existing-acc', name: 'Existing', type: 'cash', balance: 0, initialBalance: 0, currency: 'USD', createdAt: 500, updatedAt: 500 },
        ],
        categories: [
          { id: 'cat-1', name: 'Groceries', type: 'expense', isActive: true, createdAt: 1000, updatedAt: 1000 },
        ],
        currencies: [
          { id: 'USD', name: 'US Dollar', symbol: '$', isPrimary: true, exchangeRate: 1, lastUpdated: 1000, isActive: true, createdAt: 1000, updatedAt: 1000 },
        ],
      });

      await importData(adapter, makeBackup(), 'merge');

      const accounts = await adapter.getAccounts();
      expect(accounts.some((a) => a.id === 'existing-acc')).toBe(true);
      expect(accounts.some((a) => a.id === 'acc-1')).toBe(true);
    });

    it('skips entities with same ID and same or older updatedAt', async () => {
      adapter.seed({
        accounts: [
          { id: 'acc-1', name: 'Original Name', type: 'cash', balance: 50, initialBalance: 50, currency: 'USD', createdAt: 1000, updatedAt: 9999 },
        ],
        categories: [
          { id: 'cat-1', name: 'Groceries', type: 'expense', isActive: true, createdAt: 1000, updatedAt: 1000 },
        ],
        currencies: [
          { id: 'USD', name: 'US Dollar', symbol: '$', isPrimary: true, exchangeRate: 1, lastUpdated: 1000, isActive: true, createdAt: 1000, updatedAt: 1000 },
        ],
      });

      // backup acc-1 has updatedAt: 2000, existing has 9999 → should not overwrite
      const result = await importData(adapter, makeBackup(), 'merge');
      expect(result.imported.accounts).toBe(0);

      const accounts = await adapter.getAccounts();
      const acc = accounts.find((a) => a.id === 'acc-1');
      expect(acc?.name).toBe('Original Name');
    });

    it('updates entity when backup has newer updatedAt', async () => {
      adapter.seed({
        accounts: [
          { id: 'acc-1', name: 'Old Name', type: 'cash', balance: 50, initialBalance: 50, currency: 'USD', createdAt: 1000, updatedAt: 100 },
        ],
        categories: [
          { id: 'cat-1', name: 'Groceries', type: 'expense', isActive: true, createdAt: 1000, updatedAt: 1000 },
        ],
        currencies: [
          { id: 'USD', name: 'US Dollar', symbol: '$', isPrimary: true, exchangeRate: 1, lastUpdated: 1000, isActive: true, createdAt: 1000, updatedAt: 1000 },
        ],
      });

      // backup acc-1 has updatedAt: 2000, existing has 100 → should overwrite
      const result = await importData(adapter, makeBackup(), 'merge');
      expect(result.imported.accounts).toBe(1);
    });

    it('skips duplicate transactions', async () => {
      adapter.seed({
        accounts: [
          { id: 'acc-1', name: 'Cash', type: 'cash', balance: 150, initialBalance: 100, currency: 'USD', createdAt: 1000, updatedAt: 2000 },
        ],
        categories: [
          { id: 'cat-1', name: 'Groceries', type: 'expense', isActive: true, createdAt: 1000, updatedAt: 1000 },
        ],
        currencies: [
          { id: 'USD', name: 'US Dollar', symbol: '$', isPrimary: true, exchangeRate: 1, lastUpdated: 1000, isActive: true, createdAt: 1000, updatedAt: 1000 },
        ],
        transactions: [
          { id: 'tx-1', type: 'income', amount: 50, currency: 'USD', date: '2026-01-15', accountId: 'acc-1', categoryId: 'cat-1', createdAt: 1000, updatedAt: 1000 },
        ],
      });

      const result = await importData(adapter, makeBackup(), 'merge');
      expect(result.imported.transactions).toBe(0);
    });
  });

  describe('round-trip', () => {
    it('export then import restores all data', async () => {
      const { exportData } = await import('../export-service');

      adapter.seed({
        accounts: [
          { id: 'acc-1', name: 'Cash', type: 'cash', balance: 200, initialBalance: 100, currency: 'USD', createdAt: 1000, updatedAt: 2000 },
        ],
        categories: [
          { id: 'cat-1', name: 'Salary', type: 'income', isActive: true, createdAt: 1000, updatedAt: 1000 },
        ],
        currencies: [
          { id: 'USD', name: 'US Dollar', symbol: '$', isPrimary: true, exchangeRate: 1, lastUpdated: 1000, isActive: true, createdAt: 1000, updatedAt: 1000 },
        ],
        transactions: [
          { id: 'tx-1', type: 'income', amount: 100, currency: 'USD', date: '2026-01-10', accountId: 'acc-1', categoryId: 'cat-1', createdAt: 1000, updatedAt: 1000 },
        ],
        settings: {},
      });

      const exportResult = await exportData(adapter, { format: 'json' });

      const freshAdapter = new MockCoreAdapter();
      const importResult = await importData(freshAdapter, exportResult.content, 'replace');

      expect(importResult.success).toBe(true);
      const accounts = await freshAdapter.getAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0].id).toBe('acc-1');
      const txs = await freshAdapter.getTransactions();
      expect(txs).toHaveLength(1);
    });
  });
});
