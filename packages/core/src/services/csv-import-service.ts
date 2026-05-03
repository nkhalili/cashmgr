import type { DatabaseAdapter } from '../db/database-adapter';
import { validateAndCorrectDate, isValidISODate } from '../utils/date-validation';
import { recalculateBalances } from './balance-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Maps CSV column names to transaction fields.
 * Either `amount` OR both `debit`+`credit` must be provided.
 */
export interface CsvColumnMapping {
  /** Column whose value is the transaction date */
  date: string;
  /** Single signed-amount column. Negative = expense, positive = income. */
  amount?: string;
  /** Separate debit column (positive value = expense). Used with `credit`. */
  debit?: string;
  /** Separate credit column (positive value = income). Used with `debit`. */
  credit?: string;
  /** Optional notes / description column */
  notes?: string;
  /** Optional transaction type column (debit/credit/income/expense) */
  type?: string;
  /** Optional currency column. Falls back to `defaultCurrency` if absent. */
  currency?: string;
}

export interface CsvPreviewResult {
  /** Detected column headers */
  headers: string[];
  /** Up to 3 data rows as key→value objects */
  sampleRows: Record<string, string>[];
  /** Total number of data rows (excluding header) */
  totalRows: number;
  isValid: boolean;
  errors: string[];
}

export interface CsvImportOptions {
  mapping: CsvColumnMapping;
  /** ID of the account all imported transactions belong to */
  accountId: string;
  /** Fallback currency when no currency column is mapped */
  defaultCurrency: string;
}

export interface CsvImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------

/**
 * Minimal RFC-4180 CSV parser.
 * Handles quoted fields, escaped double-quotes, and \r\n / \n line endings.
 */
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 2;
      } else if (ch === '"') {
        inQuotes = false;
        i++;
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(field.trim());
        field = '';
        i++;
      } else if (ch === '\n') {
        row.push(field.trim());
        field = '';
        if (row.some((f) => f !== '')) rows.push(row);
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Flush last field / row
  row.push(field.trim());
  if (row.some((f) => f !== '')) rows.push(row);

  return rows;
}

function rowToObject(headers: string[], values: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    obj[h] = values[i] ?? '';
  });
  return obj;
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

export function previewCsv(content: string): CsvPreviewResult {
  if (!content?.trim()) {
    return { headers: [], sampleRows: [], totalRows: 0, isValid: false, errors: ['File is empty'] };
  }

  const rows = parseCsv(content);

  if (rows.length < 2) {
    return {
      headers: [],
      sampleRows: [],
      totalRows: 0,
      isValid: false,
      errors: ['CSV must have a header row and at least one data row'],
    };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  return {
    headers,
    sampleRows: dataRows.slice(0, 3).map((r) => rowToObject(headers, r)),
    totalRows: dataRows.length,
    isValid: true,
    errors: [],
  };
}

// ---------------------------------------------------------------------------
// Amount parser
// ---------------------------------------------------------------------------

/** Strips common currency symbols/separators and parses as a float. */
function parseAmount(raw: string): number | null {
  if (!raw?.trim()) return null;
  const cleaned = raw.trim().replace(/[$€£¥₹,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export async function importCsv(
  db: DatabaseAdapter,
  content: string,
  options: CsvImportOptions,
): Promise<CsvImportResult> {
  const { mapping, accountId, defaultCurrency } = options;

  // Validate mapping
  const mappingErrors: string[] = [];
  if (!mapping.date) mappingErrors.push('Date column mapping is required');
  if (!mapping.amount && !mapping.debit && !mapping.credit) {
    mappingErrors.push('Amount column mapping is required (single amount or debit/credit pair)');
  }
  if (mappingErrors.length > 0) {
    return { success: false, imported: 0, skipped: 0, errors: mappingErrors };
  }

  const rows = parseCsv(content);
  if (rows.length < 2) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: ['CSV must have a header row and at least one data row'],
    };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Build fingerprint set from existing transactions for this account
  const existing = await db.getTransactions({ accountId }, { limit: 100000, offset: 0 });
  const fingerprints = new Set(existing.map((tx) => `${tx.date}|${tx.amount}|${tx.accountId}`));

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let idx = 0; idx < dataRows.length; idx++) {
    const row = rowToObject(headers, dataRows[idx]);
    const rowNum = idx + 2; // 1-indexed + header row

    // --- Date ---
    const rawDate = row[mapping.date] ?? '';
    const date = validateAndCorrectDate(rawDate);
    if (!isValidISODate(date)) {
      errors.push(`Row ${rowNum}: invalid date "${rawDate}"`);
      skipped++;
      continue;
    }

    // --- Amount & type ---
    let amount: number;
    let type: 'income' | 'expense';

    if (mapping.amount) {
      const parsed = parseAmount(row[mapping.amount] ?? '');
      if (parsed === null) {
        errors.push(`Row ${rowNum}: invalid amount "${row[mapping.amount] ?? ''}"`);
        skipped++;
        continue;
      }
      amount = Math.abs(parsed);
      type = parsed < 0 ? 'expense' : 'income';
    } else {
      const debitVal = mapping.debit ? parseAmount(row[mapping.debit] ?? '') : null;
      const creditVal = mapping.credit ? parseAmount(row[mapping.credit] ?? '') : null;
      const debitAbs = debitVal !== null ? Math.abs(debitVal) : 0;
      const creditAbs = creditVal !== null ? Math.abs(creditVal) : 0;

      if (debitAbs > 0) {
        amount = debitAbs;
        type = 'expense';
      } else if (creditAbs > 0) {
        amount = creditAbs;
        type = 'income';
      } else {
        errors.push(`Row ${rowNum}: no debit or credit amount found`);
        skipped++;
        continue;
      }
    }

    // Override type from explicit type column
    if (mapping.type) {
      const rawType = (row[mapping.type] ?? '').toLowerCase().trim();
      if (['income', 'credit', 'deposit'].includes(rawType)) type = 'income';
      else if (['expense', 'debit', 'withdrawal', 'purchase'].includes(rawType)) type = 'expense';
    }

    // --- Notes ---
    const notes = mapping.notes ? (row[mapping.notes] ?? '').trim() : undefined;

    // --- Currency ---
    const currency =
      (mapping.currency ? (row[mapping.currency] ?? '').trim() : '') || defaultCurrency;

    // --- Duplicate check ---
    const fingerprint = `${date}|${amount}|${accountId}`;
    if (fingerprints.has(fingerprint)) {
      skipped++;
      continue;
    }
    fingerprints.add(fingerprint);

    // --- Create transaction ---
    try {
      await db.createTransaction({
        date,
        amount,
        type,
        currency,
        accountId,
        notes: notes || undefined,
      });
      imported++;
    } catch (err) {
      errors.push(
        `Row ${rowNum}: ${err instanceof Error ? err.message : 'failed to create transaction'}`,
      );
      skipped++;
    }
  }

  if (imported > 0) {
    await recalculateBalances(db);
  }

  return { success: true, imported, skipped, errors };
}
