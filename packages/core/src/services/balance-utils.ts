import type { DatabaseAdapter } from '../db/database-adapter';
import type { Transaction } from '../models/Transaction';

const PAGE_SIZE = 1000;

/**
 * The balance delta a transaction applies to a given account (0 if the
 * transaction doesn't touch that account). Shared by full balance replay
 * (recalculateBalances) and single-account historical replay
 * (credit-account-utils' statement balance calculation).
 */
export function getAccountBalanceDelta(tx: Transaction, accountId: string): number {
  if (tx.type === 'income' && tx.accountId === accountId) return tx.amount;
  if (tx.type === 'expense' && tx.accountId === accountId) return -tx.amount;
  if (tx.type === 'transfer') {
    if (tx.accountId === accountId) return -tx.amount;
    if (tx.toAccountId === accountId) return tx.amount;
  }
  return 0;
}

/**
 * Recalculates all account balances from scratch by replaying every transaction.
 * Called after bulk import operations to ensure balances are consistent.
 */
export async function recalculateBalances(db: DatabaseAdapter): Promise<void> {
  const accounts = await db.getAccounts();

  // Reset all balances to initialBalance
  for (const account of accounts) {
    await db.updateAccount({ id: account.id, balance: account.initialBalance });
  }

  // Re-apply all transactions in order
  let offset = 0;
  while (true) {
    const txs = await db.getTransactions({}, { limit: PAGE_SIZE, offset });
    for (const tx of txs) {
      const account = await db.getAccountById(tx.accountId);
      if (!account) continue;

      const delta = getAccountBalanceDelta(tx, account.id);
      if (delta !== 0) {
        await db.updateAccount({ id: account.id, balance: account.balance + delta });
      }

      if (tx.type === 'transfer' && tx.toAccountId) {
        const toAccount = await db.getAccountById(tx.toAccountId);
        if (toAccount) {
          const toDelta = getAccountBalanceDelta(tx, toAccount.id);
          await db.updateAccount({ id: toAccount.id, balance: toAccount.balance + toDelta });
        }
      }
    }
    if (txs.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
}
