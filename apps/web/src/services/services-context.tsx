import React from 'react';
import { SqliteDatabaseAdapter } from '@cashmgr/db';
import type { SqliteDatabase } from '@cashmgr/db';
import { AppError, ErrorHandler } from '@cashmgr/core';
import type { DatabaseAdapter } from '@cashmgr/core';
import { AccountsService } from './accounts-service';
import { BudgetsService } from './budgets-service';
import { CategoriesService } from './categories-service';
import { CurrenciesService } from './currencies-service';
import { DashboardService } from './dashboard-service';
import { RecurringTransactionsService } from './recurring-transactions-service';
import { TransactionsService } from './transactions-service';
import { CreditAutoPaymentService } from './credit-autopay-service';
import { createWebSqliteDatabase } from '../database/web-sqlite-database';

interface ServicesContextValue {
  database: SqliteDatabase;
  adapter: DatabaseAdapter;
  accountsService: AccountsService;
  budgetsService: BudgetsService;
  categoriesService: CategoriesService;
  currenciesService: CurrenciesService;
  dashboardService: DashboardService;
  recurringTransactionsService: RecurringTransactionsService;
  transactionsService: TransactionsService;
  creditAutoPaymentService: CreditAutoPaymentService;
}

const ServicesContext = React.createContext<ServicesContextValue | null>(null);

export const ServicesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [value, setValue] = React.useState<ServicesContextValue | null>(null);
  const [error, setError] = React.useState<AppError | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const db = createWebSqliteDatabase();
        const adapter = new SqliteDatabaseAdapter(db);
        await adapter.initialize();

        if (!isMounted) return;

        const transactionsService = new TransactionsService(adapter);
        const recurringTransactionsService = new RecurringTransactionsService(adapter, transactionsService);
        const creditAutoPaymentService = new CreditAutoPaymentService(adapter, transactionsService);

        // Generate pending recurring transactions before making the app usable
        // so the Settings > Recurring page always shows the current lastGeneratedDate.
        await recurringTransactionsService.generateDueTransactions();

        // Catch up on any due credit card auto-payments (same app-open pattern as above).
        await creditAutoPaymentService.processDuePayments();

        setValue({
          database: db,
          adapter,
          accountsService: new AccountsService(adapter),
          budgetsService: new BudgetsService(adapter),
          categoriesService: new CategoriesService(adapter),
          currenciesService: new CurrenciesService(adapter),
          dashboardService: new DashboardService(adapter),
          recurringTransactionsService,
          transactionsService,
          creditAutoPaymentService,
        });
      } catch (err) {
        // F-024: Use ErrorHandler for centralized error handling
        const appError = ErrorHandler.handle(err, 'ServicesProvider.init');
        setError(appError);
      }
    };

    void init();

    return () => {
      isMounted = false;
    };
  }, []);

  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{error.getUserMessage()}</p>
        <p style={{ marginTop: 8, color: '#666' }}>Please refresh the page to try again.</p>
      </div>
    );
  }

  if (!value) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Preparing your local data...</p>
        <p style={{ marginTop: 8, color: '#666' }}>This only takes a moment.</p>
      </div>
    );
  }

  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
};

export function useDatabase(): SqliteDatabase {
  const ctx = React.useContext(ServicesContext);
  if (!ctx) {
    throw new Error('ServicesProvider is missing from component tree.');
  }

  return ctx.database;
}

export function useDatabaseAdapter(): DatabaseAdapter {
  const ctx = React.useContext(ServicesContext);
  if (!ctx) {
    throw new Error('ServicesProvider is missing from component tree.');
  }

  return ctx.adapter;
}

export function useAccountsService(): AccountsService {
  const ctx = React.useContext(ServicesContext);
  if (!ctx) {
    throw new Error('ServicesProvider is missing from component tree.');
  }

  return ctx.accountsService;
}

export function useBudgetsService(): BudgetsService {
  const ctx = React.useContext(ServicesContext);
  if (!ctx) {
    throw new Error('ServicesProvider is missing from component tree.');
  }

  return ctx.budgetsService;
}

export function useCategoriesService(): CategoriesService {
  const ctx = React.useContext(ServicesContext);
  if (!ctx) {
    throw new Error('ServicesProvider is missing from component tree.');
  }

  return ctx.categoriesService;
}

export function useCurrenciesService(): CurrenciesService {
  const ctx = React.useContext(ServicesContext);
  if (!ctx) {
    throw new Error('ServicesProvider is missing from component tree.');
  }

  return ctx.currenciesService;
}

export function useTransactionsService(): TransactionsService {
  const ctx = React.useContext(ServicesContext);
  if (!ctx) {
    throw new Error('ServicesProvider is missing from component tree.');
  }

  return ctx.transactionsService;
}

export function useRecurringTransactionsService(): RecurringTransactionsService {
  const ctx = React.useContext(ServicesContext);
  if (!ctx) {
    throw new Error('ServicesProvider is missing from component tree.');
  }

  return ctx.recurringTransactionsService;
}

export function useDashboardService(): DashboardService {
  const ctx = React.useContext(ServicesContext);
  if (!ctx) {
    throw new Error('ServicesProvider is missing from component tree.');
  }

  return ctx.dashboardService;
}

export function useCreditAutoPaymentService(): CreditAutoPaymentService {
  const ctx = React.useContext(ServicesContext);
  if (!ctx) {
    throw new Error('ServicesProvider is missing from component tree.');
  }

  return ctx.creditAutoPaymentService;
}

