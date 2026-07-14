import type { DatabaseAdapter } from '@cashmgr/core';
import {
  ErrorHandler,
  getTodayDateString,
  getMostRecentDayOfMonthOnOrBefore,
  calculateCreditAccountSummary,
  toDateString,
} from '@cashmgr/core';
import type { TransactionsService } from './transactions-service';

const PAGE_SIZE = 500;

/**
 * Auto-pays credit accounts that have auto-payment turned on.
 * There is no background scheduler in this app — this follows the same
 * "catch-up on app open" pattern as RecurringTransactionsService.generateDueTransactions().
 */
export class CreditAutoPaymentService {
  constructor(
    private readonly adapter: DatabaseAdapter,
    private readonly transactionsService: TransactionsService,
  ) {}

  async processDuePayments(): Promise<void> {
    try {
      const today = getTodayDateString();
      const accounts = await this.adapter.getAccounts();

      const eligible = accounts.filter(
        (a) =>
          a.type === 'credit' &&
          a.autoPaymentEnabled &&
          a.statementDay != null &&
          a.paymentDay != null &&
          a.paymentAccountId != null,
      );

      for (const account of eligible) {
        const dueDate = getMostRecentDayOfMonthOnOrBefore(account.paymentDay!, today);

        // Already processed this cycle (or a later one)
        if (account.lastAutoPaymentDate && account.lastAutoPaymentDate >= dueDate) continue;

        const transactions = [];
        let offset = 0;
        while (true) {
          const page = await this.transactionsService.listTransactions(
            {
              accountId: account.id,
              dateRange: { startDate: toDateString(new Date(account.createdAt)), endDate: dueDate },
            },
            { limit: PAGE_SIZE, offset },
          );
          transactions.push(...page);
          if (page.length < PAGE_SIZE) break;
          offset += PAGE_SIZE;
        }

        const summary = calculateCreditAccountSummary(account, transactions, dueDate);
        const owed = summary.balancePayable ?? 0;

        if (owed <= 0) {
          await this.adapter.updateAccount({ id: account.id, lastAutoPaymentDate: dueDate });
          continue;
        }

        const amount =
          account.autoPaymentMode === 'fixed'
            ? Math.min(account.autoPaymentFixedAmount ?? 0, owed)
            : owed;

        if (amount > 0) {
          await this.transactionsService.createTransaction({
            type: 'transfer',
            amount,
            currency: account.currency,
            date: dueDate,
            accountId: account.paymentAccountId!,
            toAccountId: account.id,
            notes: 'Payment',
          });
        }

        await this.adapter.updateAccount({ id: account.id, lastAutoPaymentDate: dueDate });
      }
    } catch (error) {
      // Auto-payment errors are non-fatal — log and continue, same as recurring generation
      ErrorHandler.handle(error, 'CreditAutoPaymentService.processDuePayments');
    }
  }
}
