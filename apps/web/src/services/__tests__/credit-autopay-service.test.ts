import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CreditAutoPaymentService } from '../credit-autopay-service';
import { TransactionsService } from '../transactions-service';
import { MockDatabaseAdapter } from './mocks/mock-adapter';
import type { Account } from '@cashmgr/core';

// Fix "today" so date-dependent logic is deterministic
vi.mock('@cashmgr/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@cashmgr/core')>();
  return {
    ...original,
    getTodayDateString: () => '2026-02-10',
  };
});

describe('CreditAutoPaymentService', () => {
  let adapter: MockDatabaseAdapter;
  let transactionsService: TransactionsService;
  let service: CreditAutoPaymentService;
  let checking: Account;

  beforeEach(async () => {
    adapter = new MockDatabaseAdapter();
    transactionsService = new TransactionsService(adapter);
    service = new CreditAutoPaymentService(adapter, transactionsService);

    // Accounts must be "created" before the historical transaction dates used below
    // (the service bounds its transaction query by account.createdAt).
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    checking = await adapter.createAccount({ name: 'Checking', type: 'bank', initialBalance: 1000 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function makeCreditAccount(overrides: Partial<Account> = {}): Promise<Account> {
    const account = await adapter.createAccount({
      name: 'Credit Card',
      type: 'credit',
      initialBalance: 0,
      statementDay: 20,
      paymentDay: 5,
      paymentAccountId: checking.id,
      autoPaymentEnabled: true,
      autoPaymentMode: 'full',
    });
    if (Object.keys(overrides).length > 0) {
      return adapter.updateAccount({ id: account.id, ...overrides });
    }
    return account;
  }

  it('pays the full balance payable and stamps lastAutoPaymentDate', async () => {
    const credit = await makeCreditAccount();
    await adapter.createTransaction({
      type: 'expense',
      amount: 500,
      currency: 'USD',
      date: '2026-01-10', // before the Jan 20 statement close
      accountId: credit.id,
      categoryId: undefined,
    });
    // Manually push the account into debt (mirrors what applyBalanceChange would do)
    await adapter.updateAccount({ id: credit.id, balance: -500 });

    await service.processDuePayments();

    const transactions = await adapter.getTransactions();
    const payment = transactions.find((t) => t.notes === 'Payment');
    expect(payment).toBeTruthy();
    expect(payment?.type).toBe('transfer');
    expect(payment?.accountId).toBe(checking.id);
    expect(payment?.toAccountId).toBe(credit.id);
    expect(payment?.amount).toBe(500);
    expect(payment?.date).toBe('2026-02-05'); // most recent payment day on/before today

    const updatedCredit = await adapter.getAccountById(credit.id);
    expect(updatedCredit?.lastAutoPaymentDate).toBe('2026-02-05');
    expect(updatedCredit?.balance).toBe(0); // -500 + 500 payment

    const updatedChecking = await adapter.getAccountById(checking.id);
    expect(updatedChecking?.balance).toBe(500); // 1000 - 500 payment
  });

  it('does not double-pay when already processed this cycle', async () => {
    const credit = await makeCreditAccount({ balance: -500, lastAutoPaymentDate: '2026-02-05' });
    await adapter.createTransaction({
      type: 'expense',
      amount: 500,
      currency: 'USD',
      date: '2026-01-10',
      accountId: credit.id,
      categoryId: undefined,
    });

    await service.processDuePayments();

    const transactions = await adapter.getTransactions();
    expect(transactions.find((t) => t.notes === 'Payment')).toBeUndefined();
  });

  it('stamps lastAutoPaymentDate without creating a transaction when nothing is owed', async () => {
    const credit = await makeCreditAccount({ balance: 0 });

    await service.processDuePayments();

    const transactions = await adapter.getTransactions();
    expect(transactions.find((t) => t.notes === 'Payment')).toBeUndefined();

    const updatedCredit = await adapter.getAccountById(credit.id);
    expect(updatedCredit?.lastAutoPaymentDate).toBe('2026-02-05');
  });

  it('pays only the fixed amount when autoPaymentMode is fixed', async () => {
    const credit = await makeCreditAccount({
      balance: -500,
      autoPaymentMode: 'fixed',
      autoPaymentFixedAmount: 50,
    });
    await adapter.createTransaction({
      type: 'expense',
      amount: 500,
      currency: 'USD',
      date: '2026-01-10',
      accountId: credit.id,
      categoryId: undefined,
    });

    await service.processDuePayments();

    const transactions = await adapter.getTransactions();
    const payment = transactions.find((t) => t.notes === 'Payment');
    expect(payment?.amount).toBe(50);
  });

  it('caps the fixed amount at the balance payable', async () => {
    const credit = await makeCreditAccount({
      balance: -200,
      autoPaymentMode: 'fixed',
      autoPaymentFixedAmount: 1000,
    });
    await adapter.createTransaction({
      type: 'expense',
      amount: 200,
      currency: 'USD',
      date: '2026-01-10',
      accountId: credit.id,
      categoryId: undefined,
    });

    await service.processDuePayments();

    const transactions = await adapter.getTransactions();
    const payment = transactions.find((t) => t.notes === 'Payment');
    expect(payment?.amount).toBe(200);
  });

  it('skips credit accounts with auto payment disabled', async () => {
    await makeCreditAccount({ balance: -500, autoPaymentEnabled: false });

    await service.processDuePayments();

    const transactions = await adapter.getTransactions();
    expect(transactions.find((t) => t.notes === 'Payment')).toBeUndefined();
  });
});
