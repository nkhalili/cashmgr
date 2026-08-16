import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, useTheme } from '@cashmgr/ui';
import {
  Account,
  Category,
  RecurringTransaction,
  AppError,
  RECURRING_FREQUENCY_LABELS,
  formatDate,
} from '@cashmgr/core';
import {
  useRecurringTransactionsService,
  useAccountsService,
  useCategoriesService,
} from '../services/services-context';

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function RecurringBadge({ isActive }: { isActive: boolean }) {
  const theme = useTheme();
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: isActive ? theme.colors.successSoft : theme.colors.surfaceMuted,
        color: isActive ? theme.colors.success : theme.colors.textSecondary,
      }}
    >
      {isActive ? 'Active' : 'Paused'}
    </span>
  );
}

export function SettingsRecurringTransactions() {
  const theme = useTheme();
  const navigate = useNavigate();
  const recurringService = useRecurringTransactionsService();
  const accountsService = useAccountsService();
  const categoriesService = useCategoriesService();

  const [items, setItems] = React.useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const accountsMap = React.useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const categoriesMap = React.useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const loadItems = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, accountsData, categoriesData] = await Promise.all([
        recurringService.listRecurringTransactions(),
        accountsService.listAccounts(),
        categoriesService.listCategories(true),
      ]);
      setItems(data);
      setAccounts(accountsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof AppError ? err.getUserMessage() : 'Failed to load recurring transactions');
    } finally {
      setIsLoading(false);
    }
  }, [recurringService, accountsService, categoriesService]);

  React.useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleDelete = React.useCallback(async (id: string) => {
    if (!confirm('Delete this recurring transaction? Future occurrences will be removed. Past transactions are kept.')) return;
    setDeletingId(id);
    try {
      await recurringService.deleteRecurringTransaction(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      setError(err instanceof AppError ? err.getUserMessage() : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  }, [recurringService]);

  const typeIcon: Record<string, string> = { income: '↑', expense: '↓', transfer: '⇄' };
  const typeColor: Record<string, string> = {
    income: theme.colors.success ?? '#16a34a',
    expense: theme.colors.danger,
    transfer: theme.colors.primary,
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: theme.fontFamily,
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    fontWeight: 500,
  };

  return (
    <div
      className="page"
      style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg, maxWidth: 760 }}
    >
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
        <Link
          to="/settings"
          className="settings-breadcrumb-link"
          style={{
            color: theme.colors.primary,
            fontSize: theme.typography.h1.fontSize,
            fontWeight: theme.typography.h1.fontWeight,
          }}
        >
          Settings
        </Link>
        <span style={{ color: theme.colors.textSecondary, fontSize: theme.typography.h1.fontSize }}>›</span>
        <h2 style={{ margin: 0, fontSize: theme.typography.h1.fontSize, fontWeight: theme.typography.h1.fontWeight }}>
          Recurring Transactions
        </h2>
      </div>

      <p style={{ margin: 0, color: theme.colors.textSecondary }}>
        Transactions that repeat automatically on a schedule. Future occurrences are generated each time you open the app.
      </p>

      {error && (
        <div
          style={{
            padding: theme.spacing.md,
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: theme.components.interactiveRadius,
            color: '#c00',
          }}
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <p style={{ color: theme.colors.textSecondary }}>Loading...</p>
      ) : items.length === 0 ? (
        <Card title="No recurring transactions" subtitle="Set one up when adding a transaction" tone="default">
          <p style={{ margin: 0, color: theme.colors.textSecondary }}>
            When adding a transaction, toggle "Make recurring" to schedule it to repeat automatically.
          </p>
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate('/transactions/add')}
            style={{ marginTop: theme.spacing.md }}
          >
            Add transaction
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radii.lg,
                padding: `${theme.spacing.md}px ${theme.spacing.lg}px`,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: theme.spacing.md,
              }}
            >
              {/* Left: info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: theme.typography.body.fontSize,
                      color: typeColor[item.type],
                    }}
                  >
                    {typeIcon[item.type]} {formatAmount(item.amount, item.currency)}
                  </span>
                  <span
                    style={{
                      fontSize: theme.typography.caption.fontSize,
                      color: typeColor[item.type],
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  >
                    {item.type}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: theme.typography.body.fontSize,
                      color: theme.colors.textPrimary,
                    }}
                  >
                    {RECURRING_FREQUENCY_LABELS[item.frequency]}
                  </span>
                  <RecurringBadge isActive={item.isActive} />
                </div>
                <div style={{ display: 'flex', gap: theme.spacing.lg, flexWrap: 'wrap' }}>
                  <span style={labelStyle}>
                    Starts {formatDate(item.startDate)}
                  </span>
                  <span style={labelStyle}>Ends {item.endDate ? formatDate(item.endDate) : 'Never'}</span>
                  {item.lastGeneratedDate && (
                    <span style={labelStyle}>Last generated {formatDate(item.lastGeneratedDate)}</span>
                  )}
                </div>
                {(() => {
                  const acc = accountsMap.get(item.accountId);
                  const accName = acc?.name ?? '—';
                  if (item.type === 'transfer') {
                    const toAcc = item.toAccountId ? accountsMap.get(item.toAccountId) : undefined;
                    return <span style={labelStyle}>{accName}{toAcc ? ` → ${toAcc.name}` : ''}</span>;
                  }
                  const cat = item.categoryId ? categoriesMap.get(item.categoryId) : undefined;
                  const catLabel = cat ? `${cat.icon ? cat.icon + ' ' : ''}${cat.name}` : '';
                  return <span style={labelStyle}>{accName}{catLabel ? ` | ${catLabel}` : ''}</span>;
                })()}
                {item.notes && (
                  <span style={{ ...labelStyle, fontStyle: 'italic' }}>{item.notes}</span>
                )}
              </div>

              {/* Right: actions */}
              <div style={{ display: 'flex', gap: theme.spacing.sm, flexShrink: 0 }}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate(`/settings/recurring/${item.id}/edit`)}
                  style={{ padding: `${theme.spacing.xs}px ${theme.spacing.md}px` }}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  style={{
                    padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
                    color: theme.colors.danger,
                  }}
                >
                  {deletingId === item.id ? '...' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
