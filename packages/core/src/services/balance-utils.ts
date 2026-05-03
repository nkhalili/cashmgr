import type { DatabaseAdapter } from '../db/database-adapter';

const PAGE_SIZE = 1000;

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

      if (tx.type === 'income') {
        await db.updateAccount({ id: account.id, balance: account.balance + tx.amount });
      } else if (tx.type === 'expense') {
        await db.updateAccount({ id: account.id, balance: account.balance - tx.amount });
      } else if (tx.type === 'transfer' && tx.toAccountId) {
        await db.updateAccount({ id: account.id, balance: account.balance - tx.amount });
        const toAccount = await db.getAccountById(tx.toAccountId);
        if (toAccount) {
          await db.updateAccount({ id: toAccount.id, balance: toAccount.balance + tx.amount });
        }
      }
    }
    if (txs.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
}
