import { describe, expect, it } from 'vitest';
import { parseCsv, previewCsv, importCsv } from '../csv-import-service';
import type { CsvColumnMapping } from '../csv-import-service';
import { MockCoreAdapter } from './mock-core-adapter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAdapter() {
  const adapter = new MockCoreAdapter();
  adapter.seed({
    accounts: [
      {
        id: 'acc-1',
        name: 'Checking',
        type: 'bank',
        balance: 1000,
        initialBalance: 1000,
        currency: 'USD',
        autoPaymentEnabled: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    currencies: [
      {
        id: 'USD',
        name: 'US Dollar',
        symbol: '$',
        isPrimary: true,
        exchangeRate: 1,
        lastUpdated: 1000,
        isActive: true,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
  });
  return adapter;
}

const SIGNED_CSV = `Date,Amount,Description
2026-01-01,-50.00,Groceries
2026-01-02,200.00,Paycheck
2026-01-03,-12.50,"Coffee, shop"
`;

const DEBIT_CREDIT_CSV = `Date,Debit,Credit,Memo
2026-01-01,50.00,,Groceries
2026-01-02,,200.00,Paycheck
2026-01-03,12.50,,Coffee
`;

const SIGNED_MAPPING: CsvColumnMapping = {
  date: 'Date',
  amount: 'Amount',
  notes: 'Description',
};

// ---------------------------------------------------------------------------
// parseCsv
// ---------------------------------------------------------------------------

describe('parseCsv', () => {
  it('parses a simple CSV', () => {
    const rows = parseCsv('a,b,c\n1,2,3');
    expect(rows).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('handles quoted fields with commas', () => {
    const rows = parseCsv('a,"b,c",d\n1,2,3');
    expect(rows[0]).toEqual(['a', 'b,c', 'd']);
  });

  it('handles escaped double-quotes inside quoted fields', () => {
    const rows = parseCsv('a,"he said ""hi""",c');
    expect(rows[0][1]).toBe('he said "hi"');
  });

  it('handles \\r\\n line endings', () => {
    const rows = parseCsv('a,b\r\n1,2');
    expect(rows).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('skips empty rows', () => {
    const rows = parseCsv('a,b\n\n1,2\n\n');
    expect(rows).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('trims whitespace from fields', () => {
    const rows = parseCsv(' a , b \n 1 , 2 ');
    expect(rows[0]).toEqual(['a', 'b']);
  });
});

// ---------------------------------------------------------------------------
// previewCsv
// ---------------------------------------------------------------------------

describe('previewCsv', () => {
  it('returns headers and sample rows', () => {
    const result = previewCsv(SIGNED_CSV);
    expect(result.isValid).toBe(true);
    expect(result.headers).toEqual(['Date', 'Amount', 'Description']);
    expect(result.totalRows).toBe(3);
    expect(result.sampleRows).toHaveLength(3);
    expect(result.sampleRows[0]).toEqual({ Date: '2026-01-01', Amount: '-50.00', Description: 'Groceries' });
  });

  it('caps sample rows at 3', () => {
    const csv = 'h\n1\n2\n3\n4\n5';
    expect(previewCsv(csv).sampleRows).toHaveLength(3);
  });

  it('rejects empty content', () => {
    expect(previewCsv('').isValid).toBe(false);
    expect(previewCsv('   ').isValid).toBe(false);
  });

  it('rejects header-only CSV', () => {
    const result = previewCsv('Date,Amount');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toMatch(/header row/);
  });
});

// ---------------------------------------------------------------------------
// importCsv — mapping validation
// ---------------------------------------------------------------------------

describe('importCsv mapping validation', () => {
  it('fails when date column is missing', async () => {
    const adapter = makeAdapter();
    const result = await importCsv(adapter, SIGNED_CSV, {
      mapping: { date: '', amount: 'Amount' },
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toMatch(/date/i);
  });

  it('fails when no amount column is provided', async () => {
    const adapter = makeAdapter();
    const result = await importCsv(adapter, SIGNED_CSV, {
      mapping: { date: 'Date' },
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toMatch(/amount/i);
  });
});

// ---------------------------------------------------------------------------
// importCsv — signed amount column
// ---------------------------------------------------------------------------

describe('importCsv with signed amount column', () => {
  it('imports all rows', async () => {
    const adapter = makeAdapter();
    const result = await importCsv(adapter, SIGNED_CSV, {
      mapping: SIGNED_MAPPING,
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    expect(result.success).toBe(true);
    expect(result.imported).toBe(3);
    expect(result.skipped).toBe(0);
  });

  it('infers expense for negative amounts', async () => {
    const adapter = makeAdapter();
    await importCsv(adapter, SIGNED_CSV, {
      mapping: SIGNED_MAPPING,
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    const txs = await adapter.getTransactions({ accountId: 'acc-1' });
    const grocery = txs.find((t) => t.notes === 'Groceries');
    expect(grocery?.type).toBe('expense');
    expect(grocery?.amount).toBe(50);
  });

  it('infers income for positive amounts', async () => {
    const adapter = makeAdapter();
    await importCsv(adapter, SIGNED_CSV, {
      mapping: SIGNED_MAPPING,
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    const txs = await adapter.getTransactions({ accountId: 'acc-1' });
    const paycheck = txs.find((t) => t.notes === 'Paycheck');
    expect(paycheck?.type).toBe('income');
    expect(paycheck?.amount).toBe(200);
  });

  it('strips currency symbols from amounts', async () => {
    const csv = 'Date,Amount\n2026-01-01,$-45.00';
    const adapter = makeAdapter();
    const result = await importCsv(adapter, csv, {
      mapping: { date: 'Date', amount: 'Amount' },
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    expect(result.imported).toBe(1);
    const txs = await adapter.getTransactions({ accountId: 'acc-1' });
    expect(txs[0].amount).toBe(45);
  });
});

// ---------------------------------------------------------------------------
// importCsv — debit/credit columns
// ---------------------------------------------------------------------------

describe('importCsv with debit/credit columns', () => {
  it('imports all rows', async () => {
    const adapter = makeAdapter();
    const result = await importCsv(adapter, DEBIT_CREDIT_CSV, {
      mapping: { date: 'Date', debit: 'Debit', credit: 'Credit', notes: 'Memo' },
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    expect(result.success).toBe(true);
    expect(result.imported).toBe(3);
  });

  it('debit rows become expenses', async () => {
    const adapter = makeAdapter();
    await importCsv(adapter, DEBIT_CREDIT_CSV, {
      mapping: { date: 'Date', debit: 'Debit', credit: 'Credit', notes: 'Memo' },
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    const txs = await adapter.getTransactions({ accountId: 'acc-1' });
    expect(txs.find((t) => t.notes === 'Groceries')?.type).toBe('expense');
  });

  it('credit rows become income', async () => {
    const adapter = makeAdapter();
    await importCsv(adapter, DEBIT_CREDIT_CSV, {
      mapping: { date: 'Date', debit: 'Debit', credit: 'Credit', notes: 'Memo' },
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    const txs = await adapter.getTransactions({ accountId: 'acc-1' });
    expect(txs.find((t) => t.notes === 'Paycheck')?.type).toBe('income');
  });

  it('skips row with no debit or credit value', async () => {
    const csv = 'Date,Debit,Credit\n2026-01-01,,';
    const adapter = makeAdapter();
    const result = await importCsv(adapter, csv, {
      mapping: { date: 'Date', debit: 'Debit', credit: 'Credit' },
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    expect(result.skipped).toBe(1);
    expect(result.errors[0]).toMatch(/no debit or credit/i);
  });
});

// ---------------------------------------------------------------------------
// importCsv — duplicate detection
// ---------------------------------------------------------------------------

describe('importCsv duplicate detection', () => {
  it('skips rows already in the database', async () => {
    const adapter = makeAdapter();
    // First import
    await importCsv(adapter, SIGNED_CSV, {
      mapping: SIGNED_MAPPING,
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    // Second import of same file
    const result = await importCsv(adapter, SIGNED_CSV, {
      mapping: SIGNED_MAPPING,
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(3);
  });

  it('skips duplicate rows within the same CSV', async () => {
    const csv = 'Date,Amount\n2026-01-01,-50.00\n2026-01-01,-50.00';
    const adapter = makeAdapter();
    const result = await importCsv(adapter, csv, {
      mapping: { date: 'Date', amount: 'Amount' },
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// importCsv — validation errors
// ---------------------------------------------------------------------------

describe('importCsv row validation', () => {
  it('skips rows with invalid dates', async () => {
    const csv = 'Date,Amount\nnot-a-date,-50.00\n2026-01-02,-10.00';
    const adapter = makeAdapter();
    const result = await importCsv(adapter, csv, {
      mapping: { date: 'Date', amount: 'Amount' },
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.errors[0]).toMatch(/invalid date/i);
  });

  it('skips rows with invalid amounts', async () => {
    const csv = 'Date,Amount\n2026-01-01,not-a-number\n2026-01-02,-10.00';
    const adapter = makeAdapter();
    const result = await importCsv(adapter, csv, {
      mapping: { date: 'Date', amount: 'Amount' },
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.errors[0]).toMatch(/invalid amount/i);
  });
});

// ---------------------------------------------------------------------------
// importCsv — type column override
// ---------------------------------------------------------------------------

describe('importCsv type column override', () => {
  it('uses type column value to override inferred type', async () => {
    // Amount is positive but type column says "debit" → should be expense
    const csv = 'Date,Amount,Type\n2026-01-01,50.00,debit';
    const adapter = makeAdapter();
    await importCsv(adapter, csv, {
      mapping: { date: 'Date', amount: 'Amount', type: 'Type' },
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    const txs = await adapter.getTransactions({ accountId: 'acc-1' });
    expect(txs[0].type).toBe('expense');
  });
});

// ---------------------------------------------------------------------------
// importCsv — balance recalculation
// ---------------------------------------------------------------------------

describe('importCsv balance recalculation', () => {
  it('recalculates account balance after import', async () => {
    const adapter = makeAdapter(); // initialBalance = 1000
    await importCsv(adapter, SIGNED_CSV, {
      mapping: SIGNED_MAPPING,
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    // net: -50 + 200 - 12.50 = +137.50 → 1137.50
    const account = await adapter.getAccountById('acc-1');
    expect(account?.balance).toBeCloseTo(1137.5);
  });

  it('does not recalculate when nothing was imported', async () => {
    const adapter = makeAdapter();
    // import once to populate fingerprints
    await importCsv(adapter, SIGNED_CSV, {
      mapping: SIGNED_MAPPING,
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    // manually set balance to something unexpected
    await adapter.updateAccount({ id: 'acc-1', balance: 9999 });
    // re-import (all duplicates) — balance should NOT be touched
    await importCsv(adapter, SIGNED_CSV, {
      mapping: SIGNED_MAPPING,
      accountId: 'acc-1',
      defaultCurrency: 'USD',
    });
    const account = await adapter.getAccountById('acc-1');
    expect(account?.balance).toBe(9999);
  });
});
