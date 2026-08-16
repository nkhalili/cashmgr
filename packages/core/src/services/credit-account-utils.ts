import type { Account } from '../models/Account';
import type { Transaction } from '../models/Transaction';
import { getAccountBalanceDelta } from './balance-utils';
import { parseDate } from '../utils/recurring-dates';
import { getTodayDateString } from '../utils/date';

/**
 * Clamps `day` to the last valid day of the given month (e.g. day 31 in
 * February becomes the 28th/29th) and returns it as a YYYY-MM-DD string.
 */
function clampDayOfMonth(year: number, month: number, day: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  const clampedDay = Math.min(day, lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

/**
 * Most recent occurrence of the given day-of-month on or before `asOf`.
 */
export function getMostRecentDayOfMonthOnOrBefore(day: number, asOf: string): string {
  const { year, month } = parseDate(asOf);
  const candidate = clampDayOfMonth(year, month, day);
  if (candidate <= asOf) return candidate;

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return clampDayOfMonth(prevYear, prevMonth, day);
}

/**
 * Next occurrence of the given day-of-month strictly after `after`.
 */
export function getNextDayOfMonthAfter(day: number, after: string): string {
  const { year, month } = parseDate(after);
  const candidate = clampDayOfMonth(year, month, day);
  if (candidate > after) return candidate;

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return clampDayOfMonth(nextYear, nextMonth, day);
}

export interface CreditAccountSummary {
  /** Total amount currently owed on the account (billed + unbilled), i.e. max(0, -balance). */
  outstandingBalance: number;
  /** Amount due by the next payment date: the last statement balance minus payments made since. Null if statementDay isn't configured. */
  balancePayable: number | null;
  lastStatementDate: string | null;
  nextPaymentDueDate: string | null;
}

/**
 * Computes Outstanding Balance and Balance Payable for a credit account.
 *
 * `transactionsForAccount` must include every income/expense/transfer
 * transaction where this account is either the source or destination
 * (accountId or toAccountId), from the account's inception through `today`.
 */
export function calculateCreditAccountSummary(
  account: Account,
  transactionsForAccount: Transaction[],
  today: string = getTodayDateString(),
): CreditAccountSummary {
  const outstandingBalance = Math.max(0, -account.balance);

  if (account.statementDay == null) {
    return {
      outstandingBalance,
      balancePayable: null,
      lastStatementDate: null,
      nextPaymentDueDate: null,
    };
  }

  const lastStatementDate = getMostRecentDayOfMonthOnOrBefore(account.statementDay, today);

  let balanceAtStatement = account.initialBalance;
  let paymentsSinceStatement = 0;

  for (const tx of transactionsForAccount) {
    if (tx.date <= lastStatementDate) {
      balanceAtStatement += getAccountBalanceDelta(tx, account.id);
    } else if (tx.date <= today && tx.type === 'transfer' && tx.toAccountId === account.id) {
      paymentsSinceStatement += tx.amount;
    }
  }

  const debtAtStatement = Math.max(0, -balanceAtStatement);
  const balancePayable = Math.max(0, debtAtStatement - paymentsSinceStatement);

  const nextPaymentDueDate = account.paymentDay != null
    ? getNextDayOfMonthAfter(account.paymentDay, lastStatementDate)
    : null;

  return {
    outstandingBalance,
    balancePayable,
    lastStatementDate,
    nextPaymentDueDate,
  };
}
