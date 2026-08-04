import { v4 as uuidv4 } from 'uuid';
import { Account, CreateAccountInput, UpdateAccountInput, DEFAULT_CURRENCY } from '@cashmgr/core';
import { SqliteDatabase, SqliteValue } from '../sqlite/types';
import { buildUpdateClause } from '../utils/query-builder';

type AccountRow = {
  id: string;
  name: string;
  type: Account['type'];
  balance: number;
  initialBalance: number;
  currency: string;
  statementDay: number | null;
  paymentDay: number | null;
  paymentAccountId: string | null;
  autoPaymentEnabled: number;
  autoPaymentMode: Account['autoPaymentMode'] | null;
  autoPaymentFixedAmount: number | null;
  lastAutoPaymentDate: string | null;
  createdAt: number;
  updatedAt: number;
};

const ACCOUNT_SELECT_COLUMNS = `
  id,
  name,
  type,
  balance,
  initial_balance as initialBalance,
  currency,
  statement_day as statementDay,
  payment_day as paymentDay,
  payment_account_id as paymentAccountId,
  auto_payment_enabled as autoPaymentEnabled,
  auto_payment_mode as autoPaymentMode,
  auto_payment_fixed_amount as autoPaymentFixedAmount,
  last_auto_payment_date as lastAutoPaymentDate,
  created_at as createdAt,
  updated_at as updatedAt
`;

export class AccountsRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async create(input: CreateAccountInput): Promise<Account> {
    const id = uuidv4();
    const now = Date.now();
    const currency = input.currency ?? DEFAULT_CURRENCY;
    const initialBalance = input.initialBalance ?? 0;
    const balance = initialBalance;
    const statementDay = input.statementDay ?? null;
    const paymentDay = input.paymentDay ?? null;
    const paymentAccountId = input.paymentAccountId ?? null;
    const autoPaymentEnabled = input.autoPaymentEnabled ?? false;
    const autoPaymentMode = input.autoPaymentMode ?? null;
    const autoPaymentFixedAmount = input.autoPaymentFixedAmount ?? null;

    await this.db.execute(
      `
        INSERT INTO accounts (
          id,
          name,
          type,
          balance,
          initial_balance,
          currency,
          statement_day,
          payment_day,
          payment_account_id,
          auto_payment_enabled,
          auto_payment_mode,
          auto_payment_fixed_amount,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        id,
        input.name,
        input.type,
        balance,
        initialBalance,
        currency,
        statementDay,
        paymentDay,
        paymentAccountId,
        autoPaymentEnabled ? 1 : 0,
        autoPaymentMode,
        autoPaymentFixedAmount,
        now,
        now,
      ],
    );

    return {
      id,
      name: input.name,
      type: input.type,
      balance,
      initialBalance,
      currency,
      statementDay,
      paymentDay,
      paymentAccountId,
      autoPaymentEnabled,
      autoPaymentMode,
      autoPaymentFixedAmount,
      lastAutoPaymentDate: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findById(id: string): Promise<Account | null> {
    const row = await this.getAccountRow(id);
    return row ? this.mapRow(row) : null;
  }

  async findAll(): Promise<Account[]> {
    const rows = await this.db.query<AccountRow>(`
      SELECT ${ACCOUNT_SELECT_COLUMNS}
      FROM accounts
      ORDER BY created_at ASC;
    `);

    return rows.map((row) => this.mapRow(row));
  }

  async update(input: UpdateAccountInput): Promise<Account> {
    const updates: Record<string, SqliteValue> = {};

    if (input.name !== undefined) {
      updates.name = input.name;
    }

    if (input.type !== undefined) {
      updates.type = input.type;
    }

    if (input.currency !== undefined) {
      updates.currency = input.currency;
    }

    if (input.initialBalance !== undefined) {
      updates.initial_balance = input.initialBalance;
    }

    if (input.balance !== undefined) {
      updates.balance = input.balance;
    }

    if (input.statementDay !== undefined) {
      updates.statement_day = input.statementDay;
    }

    if (input.paymentDay !== undefined) {
      updates.payment_day = input.paymentDay;
    }

    if (input.paymentAccountId !== undefined) {
      updates.payment_account_id = input.paymentAccountId;
    }

    if (input.autoPaymentEnabled !== undefined) {
      updates.auto_payment_enabled = input.autoPaymentEnabled ? 1 : 0;
    }

    if (input.autoPaymentMode !== undefined) {
      updates.auto_payment_mode = input.autoPaymentMode;
    }

    if (input.autoPaymentFixedAmount !== undefined) {
      updates.auto_payment_fixed_amount = input.autoPaymentFixedAmount;
    }

    if (input.lastAutoPaymentDate !== undefined) {
      updates.last_auto_payment_date = input.lastAutoPaymentDate;
    }

    const { setClause, params } = buildUpdateClause(updates, true);

    const result = await this.db.execute(
      `UPDATE accounts SET ${setClause} WHERE id = ?`,
      [...params, input.id],
    );

    if (result.rowsAffected === 0) {
      throw new Error(`Account not found for id: ${input.id}`);
    }

    const row = await this.getAccountRow(input.id);
    if (!row) {
      throw new Error(`Failed to load account after update: ${input.id}`);
    }

    return this.mapRow(row);
  }

  async delete(id: string): Promise<void> {
    const result = await this.db.execute('DELETE FROM accounts WHERE id = ?', [id]);
    if (result.rowsAffected === 0) {
      throw new Error(`Account not found for id: ${id}`);
    }
  }

  private async getAccountRow(id: string): Promise<AccountRow | null> {
    const rows = await this.db.query<AccountRow>(
      `
        SELECT ${ACCOUNT_SELECT_COLUMNS}
        FROM accounts
        WHERE id = ?
        LIMIT 1;
      `,
      [id],
    );

    return rows.length ? rows[0] : null;
  }

  private mapRow(row: AccountRow): Account {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      balance: row.balance,
      initialBalance: row.initialBalance,
      currency: row.currency,
      statementDay: row.statementDay,
      paymentDay: row.paymentDay,
      paymentAccountId: row.paymentAccountId,
      autoPaymentEnabled: !!row.autoPaymentEnabled,
      autoPaymentMode: row.autoPaymentMode,
      autoPaymentFixedAmount: row.autoPaymentFixedAmount,
      lastAutoPaymentDate: row.lastAutoPaymentDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
