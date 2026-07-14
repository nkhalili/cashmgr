import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MobileDatabaseAdapter } from '../database/mobile-database-adapter';
import { AccountsService } from '../services/accounts-service';
import { BudgetsService } from '../services/budgets-service';
import { CategoriesService } from '../services/categories-service';
import { CurrenciesService } from '../services/currencies-service';
import { DashboardService } from '../services/dashboard-service';
import { RecurringTransactionsService } from '../services/recurring-transactions-service';
import { TransactionsService } from '../services/transactions-service';
import { CreditAutoPaymentService } from '../services/credit-autopay-service';
import { AppError, ErrorHandler } from '@cashmgr/core';
import type { DatabaseAdapter } from '@cashmgr/core';

interface ServicesContextValue {
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
    let adapter: MobileDatabaseAdapter | null = null;

    const init = async () => {
      try {
        adapter = new MobileDatabaseAdapter();
        await adapter.initialize();

        if (!isMounted) {
          await adapter.close();
          return;
        }

        const transactionsService = new TransactionsService(adapter);
        const recurringTransactionsService = new RecurringTransactionsService(adapter, transactionsService);
        const creditAutoPaymentService = new CreditAutoPaymentService(adapter, transactionsService);

        // Generate pending recurring transactions before making the app usable
        // so the Settings > Recurring page always shows the current lastGeneratedDate.
        await recurringTransactionsService.generateDueTransactions();

        // Catch up on any due credit card auto-payments (same app-open pattern as above).
        await creditAutoPaymentService.processDuePayments();

        setValue({
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
      if (adapter) {
        void adapter.close();
      }
    };
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>{error.getUserMessage()}</Text>
        <Text style={styles.errorText}>Please restart the app to try again.</Text>
      </View>
    );
  }

  if (!value) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingTitle}>Preparing your local data...</Text>
        <Text style={styles.loadingText}>This only takes a moment.</Text>
      </View>
    );
  }

  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
};

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontWeight: '600',
    fontSize: 16,
    color: '#c00',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    color: '#666',
    textAlign: 'center',
  },
  loadingTitle: {
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingText: {
    color: '#666',
    textAlign: 'center',
  },
});
