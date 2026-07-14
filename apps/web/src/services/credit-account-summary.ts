import type { Account, CreditAccountSummary } from '@cashmgr/core';
import { calculateCreditAccountSummary, getTodayDateString, toDateString } from '@cashmgr/core';
import type { TransactionsService } from './transactions-service';

const PAGE_SIZE = 500;

/**
 * Computes Outstanding Balance / Balance Payable for every credit account in
 * `accounts`. Skips accounts without a statementDay configured (nothing to compute).
 */
export async function getCreditAccountSummaries(
  transactionsService: TransactionsService,
  accounts: Account[],
): Promise<Map<string, CreditAccountSummary>> {
  const today = getTodayDateString();
  const summaries = new Map<string, CreditAccountSummary>();

  for (const account of accounts) {
    if (account.type !== 'credit') continue;

    if (account.statementDay == null) {
      summaries.set(account.id, calculateCreditAccountSummary(account, [], today));
      continue;
    }

    const transactions = [];
    let offset = 0;
    while (true) {
      const page = await transactionsService.listTransactions(
        {
          accountId: account.id,
          dateRange: { startDate: toDateString(new Date(account.createdAt)), endDate: today },
        },
        { limit: PAGE_SIZE, offset },
      );
      transactions.push(...page);
      if (page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    summaries.set(account.id, calculateCreditAccountSummary(account, transactions, today));
  }

  return summaries;
}
