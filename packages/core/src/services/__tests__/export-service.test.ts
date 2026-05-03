import { describe, it, expect, beforeEach } from 'vitest';
import { exportData, EXPORT_SCHEMA_VERSION } from '../export-service';
import type { ExportBackup } from '../export-service';
import { MockCoreAdapter } from './mock-core-adapter';

describe('exportData', () => {
  let adapter: MockCoreAdapter;

  beforeEach(() => {
    adapter = new MockCoreAdapter();
    adapter.seed({
      accounts: [
        { id: 'acc-1', name: 'Cash', type: 'cash', balance: 150, initialBalance: 100, currency: 'USD', createdAt: 1000, updatedAt: 2000 },
        { id: 'acc-2', name: 'Bank', type: 'bank', balance: 500, initialBalance: 500, currency: 'USD', createdAt: 1001, updatedAt: 2001 },
      ],
      categories: [
        { id: 'cat-1', name: 'Groceries', type: 'expense', isActive: true, createdAt: 1000, updatedAt: 1000 },
        { id: 'cat-2', name: 'Salary', type: 'income', isActive: true, createdAt: 1000, updatedAt: 1000 },
      ],
      currencies: [
        { id: 'USD', name: 'US Dollar', symbol: '$', isPrimary: true, exchangeRate: 1, lastUpdated: 1000, isActive: true, createdAt: 1000, updatedAt: 1000 },
      ],
      transactions: [
        { id: 'tx-1', type: 'income', amount: 50, currency: 'USD', date: '2026-01-15', accountId: 'acc-1', categoryId: 'cat-2', createdAt: 1000, updatedAt: 1000 },
        { id: 'tx-2', type: 'expense', amount: 30, currency: 'USD', date: '2026-01-16', accountId: 'acc-1', categoryId: 'cat-1', notes: 'Weekly shop', createdAt: 1001, updatedAt: 1001 },
      ],
      settings: { primary_currency: 'USD' },
    });
  });

  describe('JSON export', () => {
    it('exports all entities with correct metadata', async () => {
      const result = await exportData(adapter, { format: 'json', platform: 'web' });

      expect(result.mimeType).toBe('application/json');
      expect(result.filename).toMatch(/^cashmgr-backup-\d{4}-\d{2}-\d{2}\.json$/);

      const backup = JSON.parse(result.content) as ExportBackup;
      expect(backup.metadata.appName).toBe('CashMgr');
      expect(backup.metadata.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
      expect(backup.metadata.platform).toBe('web');
      expect(backup.metadata.exportDate).toBeTruthy();
    });

    it('exports accounts', async () => {
      const result = await exportData(adapter, { format: 'json' });
      const backup = JSON.parse(result.content) as ExportBackup;
      expect(backup.data.accounts).toHaveLength(2);
      expect(backup.data.accounts[0].id).toBe('acc-1');
    });

    it('exports categories', async () => {
      const result = await exportData(adapter, { format: 'json' });
      const backup = JSON.parse(result.content) as ExportBackup;
      expect(backup.data.categories).toHaveLength(2);
    });

    it('exports currencies', async () => {
      const result = await exportData(adapter, { format: 'json' });
      const backup = JSON.parse(result.content) as ExportBackup;
      expect(backup.data.currencies).toHaveLength(1);
      expect(backup.data.currencies[0].id).toBe('USD');
    });

    it('exports transactions', async () => {
      const result = await exportData(adapter, { format: 'json' });
      const backup = JSON.parse(result.content) as ExportBackup;
      expect(backup.data.transactions).toHaveLength(2);
      expect(backup.data.transactions[0].id).toBe('tx-1');
    });

    it('exports settings', async () => {
      const result = await exportData(adapter, { format: 'json' });
      const backup = JSON.parse(result.content) as ExportBackup;
      expect(backup.data.settings).toEqual({ primary_currency: 'USD' });
    });

    it('exports only selected entities', async () => {
      const result = await exportData(adapter, { format: 'json', entities: ['accounts'] });
      const backup = JSON.parse(result.content) as ExportBackup;
      expect(backup.data.accounts).toHaveLength(2);
      expect(backup.data.transactions).toHaveLength(0);
      expect(backup.data.categories).toHaveLength(0);
    });

    it('filters transactions by date range', async () => {
      const result = await exportData(adapter, {
        format: 'json',
        dateRange: { startDate: '2026-01-16', endDate: '2026-01-31' },
      });
      const backup = JSON.parse(result.content) as ExportBackup;
      expect(backup.data.transactions).toHaveLength(1);
      expect(backup.data.transactions[0].id).toBe('tx-2');
    });

    it('exports empty database without errors', async () => {
      const emptyAdapter = new MockCoreAdapter();
      const result = await exportData(emptyAdapter, { format: 'json' });
      const backup = JSON.parse(result.content) as ExportBackup;
      expect(backup.data.accounts).toHaveLength(0);
      expect(backup.data.transactions).toHaveLength(0);
    });
  });

  describe('CSV export', () => {
    it('uses csv mime type and filename', async () => {
      const result = await exportData(adapter, { format: 'csv' });
      expect(result.mimeType).toBe('text/csv');
      expect(result.filename).toMatch(/^cashmgr-transactions-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('includes header row', async () => {
      const result = await exportData(adapter, { format: 'csv' });
      const lines = result.content.split('\n');
      expect(lines[0]).toBe('Date,Type,Amount,Currency,Account,To Account,Category,Notes');
    });

    it('includes one row per transaction', async () => {
      const result = await exportData(adapter, { format: 'csv' });
      const lines = result.content.split('\n');
      expect(lines).toHaveLength(3); // header + 2 transactions
    });

    it('resolves account and category names', async () => {
      const result = await exportData(adapter, { format: 'csv' });
      const lines = result.content.split('\n');
      expect(lines[1]).toContain('Cash');
      expect(lines[2]).toContain('Groceries');
    });

    it('includes notes', async () => {
      const result = await exportData(adapter, { format: 'csv' });
      const lines = result.content.split('\n');
      expect(lines[2]).toContain('Weekly shop');
    });

    it('escapes cells containing commas', async () => {
      adapter.seed({
        transactions: [
          { id: 'tx-3', type: 'expense', amount: 10, currency: 'USD', date: '2026-01-17', accountId: 'acc-1', categoryId: 'cat-1', notes: 'a, b', createdAt: 1002, updatedAt: 1002 },
        ],
      });
      const result = await exportData(adapter, { format: 'csv' });
      expect(result.content).toContain('"a, b"');
    });

    it('exports empty transactions as header only', async () => {
      const emptyAdapter = new MockCoreAdapter();
      const result = await exportData(emptyAdapter, { format: 'csv' });
      const lines = result.content.split('\n');
      expect(lines).toHaveLength(1);
    });
  });
});
