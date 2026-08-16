import { describe, it, expect } from 'vitest';
import {
  getMostRecentDayOfMonthOnOrBefore,
  getNextDayOfMonthAfter,
  calculateCreditAccountSummary,
} from '../credit-account-utils';
import type { Account } from '../../models/Account';
import type { Transaction } from '../../models/Transaction';

function makeCreditAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'credit-1',
    name: 'Credit Card',
    type: 'credit',
    balance: 0,
    initialBalance: 0,
    currency: 'USD',
    statementDay: null,
    paymentDay: null,
    paymentAccountId: null,
    autoPaymentEnabled: false,
    autoPaymentMode: null,
    autoPaymentFixedAmount: null,
    lastAutoPaymentDate: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function makeTx(overrides: Partial<Transaction>): Transaction {
  return {
    id: `tx-${Math.random()}`,
    type: 'expense',
    amount: 0,
    currency: 'USD',
    date: '2026-01-01',
    accountId: 'credit-1',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('getMostRecentDayOfMonthOnOrBefore', () => {
  it('returns same month when day has already occurred', () => {
    expect(getMostRecentDayOfMonthOnOrBefore(15, '2026-01-20')).toBe('2026-01-15');
  });

  it('returns same date when day is exactly today', () => {
    expect(getMostRecentDayOfMonthOnOrBefore(15, '2026-01-15')).toBe('2026-01-15');
  });

  it('falls back to previous month when day has not occurred yet', () => {
    expect(getMostRecentDayOfMonthOnOrBefore(20, '2026-01-05')).toBe('2025-12-20');
  });

  it('clamps day 31 to the last day of a 30-day month', () => {
    expect(getMostRecentDayOfMonthOnOrBefore(31, '2026-04-15')).toBe('2026-03-31');
  });

  it('clamps day 31 to February 28 in a non-leap year', () => {
    expect(getMostRecentDayOfMonthOnOrBefore(31, '2026-03-01')).toBe('2026-02-28');
  });
});

describe('getNextDayOfMonthAfter', () => {
  it('returns later date in same month when day has not occurred yet', () => {
    expect(getNextDayOfMonthAfter(20, '2026-01-05')).toBe('2026-01-20');
  });

  it('rolls to next month when day has already passed', () => {
    expect(getNextDayOfMonthAfter(5, '2026-01-20')).toBe('2026-02-05');
  });

  it('rolls to next month when day equals the given date (strictly after)', () => {
    expect(getNextDayOfMonthAfter(15, '2026-01-15')).toBe('2026-02-15');
  });

  it('clamps day 31 into February', () => {
    expect(getNextDayOfMonthAfter(31, '2026-02-01')).toBe('2026-02-28');
  });
});

describe('calculateCreditAccountSummary', () => {
  it('returns outstanding balance but null balancePayable when statementDay is not configured', () => {
    const account = makeCreditAccount({ balance: -250 });
    const summary = calculateCreditAccountSummary(account, [], '2026-01-20');

    expect(summary.outstandingBalance).toBe(250);
    expect(summary.balancePayable).toBeNull();
    expect(summary.lastStatementDate).toBeNull();
    expect(summary.nextPaymentDueDate).toBeNull();
  });

  it('outstandingBalance is 0 when account is not in debt', () => {
    const account = makeCreditAccount({ balance: 100 });
    const summary = calculateCreditAccountSummary(account, [], '2026-01-20');
    expect(summary.outstandingBalance).toBe(0);
  });

  it('computes balancePayable as the debt at the last statement date, ignoring later charges', () => {
    // Statement closes on the 15th. As of 2026-01-20: last statement = 2026-01-15.
    const account = makeCreditAccount({ statementDay: 15, paymentDay: 5, balance: -300 });
    const transactions = [
      makeTx({ type: 'expense', amount: 200, date: '2026-01-10' }), // before statement: counts
      makeTx({ type: 'expense', amount: 100, date: '2026-01-18' }), // after statement: excluded from payable
    ];

    const summary = calculateCreditAccountSummary(account, transactions, '2026-01-20');

    expect(summary.lastStatementDate).toBe('2026-01-15');
    expect(summary.balancePayable).toBe(200);
    expect(summary.outstandingBalance).toBe(300);
    expect(summary.nextPaymentDueDate).toBe('2026-02-05');
  });

  it('reduces balancePayable by payments made after the statement date', () => {
    const account = makeCreditAccount({ statementDay: 15, paymentDay: 5, balance: -50 });
    const transactions = [
      makeTx({ type: 'expense', amount: 200, date: '2026-01-10' }),
      makeTx({
        type: 'transfer',
        amount: 150,
        date: '2026-01-18',
        accountId: 'checking-1',
        toAccountId: 'credit-1',
      }),
    ];

    const summary = calculateCreditAccountSummary(account, transactions, '2026-01-20');

    expect(summary.balancePayable).toBe(50); // 200 owed at statement - 150 paid since
  });

  it('floors balancePayable at 0 when payments exceed the statement debt', () => {
    const account = makeCreditAccount({ statementDay: 15, paymentDay: 5, balance: 50 });
    const transactions = [
      makeTx({ type: 'expense', amount: 100, date: '2026-01-10' }),
      makeTx({
        type: 'transfer',
        amount: 150,
        date: '2026-01-18',
        accountId: 'checking-1',
        toAccountId: 'credit-1',
      }),
    ];

    const summary = calculateCreditAccountSummary(account, transactions, '2026-01-20');

    expect(summary.balancePayable).toBe(0);
  });

  it('ignores payments made before the statement date when computing balancePayable', () => {
    const account = makeCreditAccount({ statementDay: 15, paymentDay: 5, balance: -100 });
    const transactions = [
      makeTx({ type: 'expense', amount: 200, date: '2026-01-05' }),
      makeTx({
        type: 'transfer',
        amount: 100,
        date: '2026-01-08', // before statement date, already reflected in balance at statement
        accountId: 'checking-1',
        toAccountId: 'credit-1',
      }),
    ];

    const summary = calculateCreditAccountSummary(account, transactions, '2026-01-20');

    // balance at statement (Jan 15) = 0 (initial) - 200 (expense) + 100 (payment before statement) = -100
    expect(summary.balancePayable).toBe(100);
  });
});
