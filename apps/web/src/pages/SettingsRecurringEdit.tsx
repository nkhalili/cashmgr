import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, DateInput, Input, useTheme } from '@cashmgr/ui';
import {
  Account,
  Category,
  AppError,
  TransactionType,
  RecurringFrequency,
  RECURRING_FREQUENCY_LABELS,
  RECURRING_FREQUENCIES,
  ACCOUNT_TYPE_GROUPS,
} from '@cashmgr/core';
import {
  useRecurringTransactionsService,
  useAccountsService,
  useCategoriesService,
} from '../services/services-context';

export function SettingsRecurringEdit() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const recurringService = useRecurringTransactionsService();
  const accountsService = useAccountsService();
  const categoriesService = useCategoriesService();

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [type, setType] = React.useState<TransactionType>('expense');
  const [amount, setAmount] = React.useState('');
  const [frequency, setFrequency] = React.useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [endDateError, setEndDateError] = React.useState<string | null>(null);
  const [accountId, setAccountId] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [toAccountId, setToAccountId] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isActive, setIsActive] = React.useState(true);

  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);

  const filteredCategories = React.useMemo(() => {
    if (type === 'transfer') return [];
    return categories.filter(c => c.type === type);
  }, [categories, type]);

  const destinationAccounts = React.useMemo(() =>
    accounts.filter(a => a.id !== accountId),
    [accounts, accountId]
  );

  const groupAccounts = React.useCallback((list: Account[]) => {
    return ACCOUNT_TYPE_GROUPS
      .map((group) => ({ ...group, accounts: list.filter((a) => a.type === group.type) }))
      .filter((group) => group.accounts.length > 0);
  }, []);
  const accountGroups = React.useMemo(() => groupAccounts(accounts), [accounts, groupAccounts]);
  const destinationAccountGroups = React.useMemo(
    () => groupAccounts(destinationAccounts),
    [destinationAccounts, groupAccounts]
  );

  React.useEffect(() => {
    if (!id) return;
    Promise.all([
      recurringService.getRecurringTransactionById(id),
      accountsService.listAccounts(),
      categoriesService.listCategories(true),
    ])
      .then(([rt, accountsData, categoriesData]) => {
        setType(rt.type);
        setAmount(String(rt.amount));
        setFrequency(rt.frequency);
        setStartDate(rt.startDate);
        setEndDate(rt.endDate ?? '');
        setAccountId(rt.accountId);
        setCategoryId(rt.categoryId ?? '');
        setToAccountId(rt.toAccountId ?? '');
        setNotes(rt.notes ?? '');
        setIsActive(rt.isActive);
        setAccounts(accountsData);
        setCategories(categoriesData);
      })
      .catch((err) => {
        setError(err instanceof AppError ? err.getUserMessage() : 'Failed to load');
      })
      .finally(() => setIsLoading(false));
  }, [id, recurringService, accountsService, categoriesService]);

  const handleSubmit = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (endDate && endDate <= startDate) {
      setEndDateError('End date must be after start date');
      return;
    }
    setEndDateError(null);
    setIsSubmitting(true);
    setError(null);
    try {
      await recurringService.updateRecurringTransaction(id, {
        amount: Number(amount),
        frequency,
        startDate,
        endDate: endDate || null,
        accountId,
        categoryId: type === 'transfer' ? null : (categoryId || null),
        toAccountId: type === 'transfer' ? (toAccountId || null) : null,
        notes: notes || null,
        isActive,
      });
      navigate('/settings/recurring');
    } catch (err) {
      setError(err instanceof AppError ? err.getUserMessage() : 'Failed to update');
    } finally {
      setIsSubmitting(false);
    }
  }, [id, type, amount, frequency, startDate, endDate, accountId, categoryId, toAccountId, notes, isActive, recurringService, navigate]);

  const selectStyle: React.CSSProperties = {
    height: theme.components.inputHeight,
    borderRadius: theme.components.interactiveRadius,
    border: `1px solid ${theme.colors.border}`,
    fontFamily: theme.fontFamily,
    fontSize: theme.typography.body.fontSize,
    padding: `0 ${theme.spacing.sm}px`,
    background: theme.colors.surface,
    color: theme.colors.textPrimary,
    width: '100%',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: theme.fontFamily,
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    fontWeight: 500,
    marginBottom: theme.spacing.xs,
    display: 'block',
  };

  return (
    <div
      className="page"
      style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg, maxWidth: 720 }}
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
        <Link
          to="/settings/recurring"
          className="settings-breadcrumb-link"
          style={{
            color: theme.colors.primary,
            fontSize: theme.typography.h1.fontSize,
            fontWeight: theme.typography.h1.fontWeight,
          }}
        >
          Recurring Transactions
        </Link>
        <span style={{ color: theme.colors.textSecondary, fontSize: theme.typography.h1.fontSize }}>›</span>
        <h2 style={{ margin: 0, fontSize: theme.typography.h1.fontSize, fontWeight: theme.typography.h1.fontWeight }}>
          Edit
        </h2>
      </div>

      <p style={{ margin: 0, color: theme.colors.textSecondary }}>
        Editing affects future occurrences only. Past transactions are not changed.
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
      ) : (
        <Card title="Edit recurring transaction" subtitle="Changes apply to future occurrences" withSurfaceGradient>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            <div>
              <label style={labelStyle}>Type</label>
              <span style={{
                display: 'inline-block',
                padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                borderRadius: theme.radii.sm,
                backgroundColor: theme.colors.surfaceMuted,
                fontSize: theme.typography.body.fontSize,
                color: theme.colors.textPrimary,
                fontWeight: 500,
                textTransform: 'capitalize',
              }}>
                {type}
              </span>
            </div>

            <Input
              label="Amount"
              type="number"
              value={amount}
              onChange={setAmount}
              placeholder="0.00"
              required
            />

            <div>
              <label style={labelStyle}>Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                style={selectStyle}
              >
                {RECURRING_FREQUENCIES.map((freq) => (
                  <option key={freq} value={freq}>
                    {RECURRING_FREQUENCY_LABELS[freq]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>{type === 'transfer' ? 'From Account' : 'Account'}</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                style={selectStyle}
                required
              >
                <option value="">Select account...</option>
                {accountGroups.map((group) => (
                  <optgroup key={group.type} label={group.label}>
                    {group.accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {type === 'transfer' && (
              <div>
                <label style={labelStyle}>To Account</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  style={selectStyle}
                  required
                >
                  <option value="">Select destination account...</option>
                  {destinationAccountGroups.map((group) => (
                    <optgroup key={group.type} label={group.label}>
                      {group.accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            {type !== 'transfer' && (
              <div>
                <label style={labelStyle}>Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  style={selectStyle}
                  required
                >
                  <option value="">Select category...</option>
                  {filteredCategories.filter(c => !c.parentId).map(category => (
                    <React.Fragment key={category.id}>
                      <option value={category.id}>
                        {category.icon ? `${category.icon} ` : ''}{category.name}
                      </option>
                      {filteredCategories.filter(sub => sub.parentId === category.id).map(sub => (
                        <option key={sub.id} value={sub.id}>
                          &nbsp;&nbsp;{sub.icon ? `${sub.icon} ` : ''}{sub.name}
                        </option>
                      ))}
                    </React.Fragment>
                  ))}
                </select>
              </div>
            )}

            <DateInput label="Start date" value={startDate} onChange={setStartDate} required />
            <DateInput
              label="End date (optional)"
              value={endDate}
              onChange={(v) => { setEndDate(v); if (endDateError) setEndDateError(null); }}
              error={endDateError ?? undefined}
            />

            <div>
              <label style={labelStyle}>Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details..."
                rows={3}
                style={{
                  ...selectStyle,
                  height: 'auto',
                  padding: theme.spacing.sm,
                  resize: 'vertical',
                  minHeight: 80,
                }}
              />
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                gap: theme.spacing.md,
              }}
            >
              <div>
                <span style={{ ...labelStyle, marginBottom: 0 }}>Active</span>
                <p style={{ margin: 0, fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary }}>
                  {isActive ? 'Generating transactions on schedule' : 'Paused — no new transactions will be created'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: theme.colors.primary, flexShrink: 0 }}
              />
            </label>

            <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end' }}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/settings/recurring')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
