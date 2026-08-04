import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, DateInput, Input, Tabs, useTheme } from '@cashmgr/ui';
import {
  Account,
  Category,
  TransactionType,
  AppError,
  CreateTransactionInputSchema,
  DEFAULT_CURRENCY,
  getTodayDateString,
  RecurringFrequency,
  RECURRING_FREQUENCY_LABELS,
  RECURRING_FREQUENCIES,
  ACCOUNT_TYPE_GROUPS,
} from '@cashmgr/core';
import {
  useAccountsService,
  useCategoriesService,
  useRecurringTransactionsService,
  useTransactionsService,
} from '../services/services-context';
import { useFormValidation } from '../hooks/useFormValidation';

const TRANSACTION_TYPES: { key: TransactionType; label: string }[] = [
  { key: 'expense', label: 'Expense' },
  { key: 'income', label: 'Income' },
  { key: 'transfer', label: 'Transfer' },
];

/**
 * F-002: AddTransaction Page
 * Form for creating and editing transactions (income, expense, transfer)
 */
export function AddTransaction() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id: transactionId } = useParams<{ id: string }>();
  const accountsService = useAccountsService();
  const categoriesService = useCategoriesService();
  const recurringTransactionsService = useRecurringTransactionsService();
  const transactionsService = useTransactionsService();

  // Edit mode detection
  const isEditMode = Boolean(transactionId);

  // Form state
  const [type, setType] = React.useState<TransactionType>('expense');
  const [amount, setAmount] = React.useState('');
  // B-001: Use local date string to avoid timezone issues
  const [date, setDate] = React.useState(() => getTodayDateString());
  const [accountId, setAccountId] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [toAccountId, setToAccountId] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // Recurrence state
  const [isRecurring, setIsRecurring] = React.useState(false);
  const [recurringFrequency, setRecurringFrequency] = React.useState<RecurringFrequency>('monthly');
  const [recurringEndDate, setRecurringEndDate] = React.useState('');
  // Set when the transaction being edited already belongs to a recurring series
  const [recurringTemplateId, setRecurringTemplateId] = React.useState<string | null>(null);
  const [originalRecurringFrequency, setOriginalRecurringFrequency] = React.useState<RecurringFrequency>('monthly');
  const [originalRecurringEndDate, setOriginalRecurringEndDate] = React.useState('');

  // Data state
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);

  // UI state
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Form validation
  const { errors, validateField, validateAll, clearErrors } = useFormValidation(
    CreateTransactionInputSchema,
  );

  // Helper to get form values for validation
  const getFormValues = React.useCallback(() => ({
    type,
    amount: amount.trim() ? Number(amount) : 0,
    currency: accounts.find(a => a.id === accountId)?.currency || DEFAULT_CURRENCY,
    date: date || getTodayDateString(), // B-001: Use date string directly (YYYY-MM-DD)
    accountId,
    categoryId: type === 'transfer' ? undefined : categoryId, // No category for transfers
    toAccountId: type === 'transfer' ? toAccountId : undefined,
    notes: notes.trim() || undefined,
  }), [type, amount, date, accountId, categoryId, toAccountId, notes, accounts]);

  // Load accounts, categories, and existing transaction (if editing)
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [accountsData, categoriesData] = await Promise.all([
        accountsService.listAccounts(),
        categoriesService.listCategories(true),
      ]);
      setAccounts(accountsData);
      setCategories(categoriesData);

      // Load existing transaction if in edit mode
      if (isEditMode && transactionId) {
        const transaction = await transactionsService.getTransactionById(transactionId);

        // Pre-populate form with existing data
        setType(transaction.type);
        setAmount(String(transaction.amount));
        setDate(transaction.date); // B-001: Date is already YYYY-MM-DD string
        setAccountId(transaction.accountId);
        setCategoryId(transaction.categoryId || '');
        setToAccountId(transaction.toAccountId || '');
        setNotes(transaction.notes || '');

        // If this transaction already belongs to a recurring series, pre-fill
        // the series' frequency/end date so they can be edited inline
        if (transaction.recurringTransactionId) {
          const template = await recurringTransactionsService.getRecurringTransactionById(
            transaction.recurringTransactionId,
          );
          setRecurringTemplateId(template.id);
          setRecurringFrequency(template.frequency);
          setRecurringEndDate(template.endDate || '');
          setOriginalRecurringFrequency(template.frequency);
          setOriginalRecurringEndDate(template.endDate || '');
        }
      } else if (accountsData.length > 0 && !accountId) {
        // Set default account if available (only for new transactions)
        setAccountId(accountsData[0].id);
      }
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to load data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [accountsService, categoriesService, transactionsService, recurringTransactionsService, isEditMode, transactionId, accountId]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  // Filter categories by transaction type
  const filteredCategories = React.useMemo(() => {
    if (type === 'transfer') {
      // For transfers, show all categories (both income and expense)
      return categories;
    }
    // For income/expense, filter by matching type
    return categories.filter(c => c.type === type);
  }, [categories, type]);

  // Reset category when type changes if current category doesn't match
  React.useEffect(() => {
    if (type !== 'transfer' && categoryId) {
      const currentCategory = categories.find(c => c.id === categoryId);
      if (currentCategory && currentCategory.type !== type) {
        setCategoryId('');
      }
    }
  }, [type, categoryId, categories]);

  // Filter accounts for transfer destination (exclude source account)
  const destinationAccounts = React.useMemo(() => {
    return accounts.filter(a => a.id !== accountId);
  }, [accounts, accountId]);

  // Group accounts by type (Cash / Bank Accounts / Credit Cards) for the account pickers
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

  // Reset destination account when source account changes
  React.useEffect(() => {
    if (toAccountId && toAccountId === accountId) {
      setToAccountId('');
    }
  }, [accountId, toAccountId]);

  // Reset form
  const resetForm = React.useCallback(() => {
    setType('expense');
    setAmount('');
    setDate(getTodayDateString()); // B-001: Use local date string
    setCategoryId('');
    setToAccountId('');
    setNotes('');
    setIsRecurring(false);
    setRecurringFrequency('monthly');
    setRecurringEndDate('');
    clearErrors();
    setError(null);
    setSuccess(null);
  }, [clearErrors]);

  // Handle form submission
  const handleSubmit = React.useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();

      const formValues = getFormValues();

      if (!validateAll(formValues)) {
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        if (isEditMode && transactionId) {
          // Update existing transaction
          await transactionsService.updateTransaction(transactionId, {
            type: formValues.type,
            amount: formValues.amount,
            currency: formValues.currency,
            date: formValues.date,
            accountId: formValues.accountId,
            categoryId: formValues.categoryId,
            toAccountId: formValues.toAccountId,
            notes: formValues.notes,
          });

          if (recurringTemplateId) {
            // Already part of a series — update the template if frequency/end date changed
            if (
              recurringFrequency !== originalRecurringFrequency ||
              recurringEndDate !== originalRecurringEndDate
            ) {
              await recurringTransactionsService.updateRecurringTransaction(recurringTemplateId, {
                frequency: recurringFrequency,
                endDate: recurringEndDate || null,
              });
            }
          } else if (isRecurring) {
            // Turning recurring on: this transaction becomes the series' start
            await recurringTransactionsService.createRecurringTransactionFromExisting(
              {
                type: formValues.type,
                amount: formValues.amount,
                currency: formValues.currency,
                accountId: formValues.accountId,
                categoryId: formValues.categoryId,
                toAccountId: formValues.toAccountId,
                notes: formValues.notes,
                frequency: recurringFrequency,
                startDate: formValues.date,
                endDate: recurringEndDate || undefined,
              },
              formValues.date,
            );
            await recurringTransactionsService.generateDueTransactions();
          }

          setSuccess('Transaction updated successfully!');
        } else if (isRecurring) {
          // Create recurring template (which will also generate the first occurrence)
          await recurringTransactionsService.createRecurringTransaction({
            type: formValues.type,
            amount: formValues.amount,
            currency: formValues.currency,
            accountId: formValues.accountId,
            categoryId: formValues.categoryId,
            toAccountId: formValues.toAccountId,
            notes: formValues.notes,
            frequency: recurringFrequency,
            startDate: formValues.date,
            endDate: recurringEndDate || undefined,
          });
          // Immediately generate due transactions (first occurrence today)
          await recurringTransactionsService.generateDueTransactions();
          setSuccess('Recurring transaction created successfully!');
        } else {
          // Create one-time transaction
          await transactionsService.createTransaction(formValues);
          setSuccess('Transaction created successfully!');
        }

        // Navigate to transactions list after short delay
        setTimeout(() => {
          navigate('/transactions');
        }, 1500);
      } catch (err) {
        const errorMessage = err instanceof AppError
          ? err.getUserMessage()
          : `Failed to ${isEditMode ? 'update' : 'create'} transaction`;
        setError(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [getFormValues, validateAll, transactionsService, recurringTransactionsService, isEditMode, transactionId, isRecurring, recurringFrequency, recurringEndDate, recurringTemplateId, originalRecurringFrequency, originalRecurringEndDate, resetForm, navigate],
  );

  // Handle type change
  const handleTypeChange = React.useCallback((newType: string) => {
    setType(newType as TransactionType);
    clearErrors();
  }, [clearErrors]);

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

  if (isLoading) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg, maxWidth: 720 }}>
        <p style={{ color: theme.colors.textSecondary }}>Loading...</p>
      </div>
    );
  }

  return (
    <div
      className="page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.lg,
        maxWidth: 720,
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: theme.typography.h1.fontSize,
            fontWeight: theme.typography.h1.fontWeight,
          }}
        >
          {isEditMode ? 'Edit Transaction' : 'Add Transaction'}
        </h2>
        <p style={{ marginTop: theme.spacing.xs, color: theme.colors.textSecondary }}>
          {isEditMode
            ? 'Update the transaction details and balances will be adjusted automatically.'
            : `Log a new ${type === 'transfer' ? 'transfer' : type} and watch your balance update automatically.`}
        </p>
      </div>

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
          <p style={{ margin: 0, fontWeight: 500 }}>{error}</p>
        </div>
      )}

      {success && (
        <div
          style={{
            padding: theme.spacing.md,
            backgroundColor: '#efe',
            border: '1px solid #cfc',
            borderRadius: theme.components.interactiveRadius,
            color: '#070',
          }}
        >
          <p style={{ margin: 0, fontWeight: 500 }}>{success}</p>
        </div>
      )}

      <Card
        title={isEditMode ? 'Edit details' : 'Transaction details'}
        subtitle="Balances update immediately on save"
        withSurfaceGradient
      >
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}
        >
          <Tabs
            items={TRANSACTION_TYPES.map(t => ({ key: t.key, label: t.label }))}
            activeKey={type}
            onChange={handleTypeChange}
          />

          <Input
            label="Amount"
            type="number"
            value={amount}
            onChange={(value) => {
              setAmount(value);
              if (errors.amount) {
                validateField('amount', { ...getFormValues(), amount: Number(value) || 0 });
              }
            }}
            onBlur={() => validateField('amount', getFormValues())}
            placeholder="0.00"
            error={errors.amount}
            autoFocus={!isEditMode}
            helperText={
              type === 'expense'
                ? 'Amount will be subtracted from account balance'
                : type === 'income'
                ? 'Amount will be added to account balance'
                : 'Amount will be moved between accounts'
            }
            required
          />

          <DateInput
            label="Date"
            value={date}
            onChange={setDate}
            required
          />

          <div>
            <label style={labelStyle}>
              {type === 'transfer' ? 'From Account' : 'Account'}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              style={{
                ...selectStyle,
                borderColor: errors.accountId ? theme.colors.danger : theme.colors.border,
              }}
              required
            >
              <option value="">Select account...</option>
              {accountGroups.map((group) => (
                <optgroup key={group.type} label={group.label}>
                  {group.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errors.accountId && (
              <p style={{ color: theme.colors.danger, fontSize: theme.typography.caption.fontSize, marginTop: 4 }}>
                {errors.accountId}
              </p>
            )}
          </div>

          {type === 'transfer' && (
            <div>
              <label style={labelStyle}>To Account</label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                style={{
                  ...selectStyle,
                  borderColor: errors.toAccountId ? theme.colors.danger : theme.colors.border,
                }}
                required
              >
                <option value="">Select destination account...</option>
                {destinationAccountGroups.map((group) => (
                  <optgroup key={group.type} label={group.label}>
                    {group.accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.currency})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {errors.toAccountId && (
                <p style={{ color: theme.colors.danger, fontSize: theme.typography.caption.fontSize, marginTop: 4 }}>
                  {errors.toAccountId}
                </p>
              )}
            </div>
          )}

          {/* Category selector - hidden for transfers */}
          {type !== 'transfer' && (
            <div>
              <label style={labelStyle}>Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  ...selectStyle,
                  borderColor: errors.categoryId ? theme.colors.danger : theme.colors.border,
                }}
                required
              >
                <option value="">Select category...</option>
                {filteredCategories
                  .filter(c => !c.parentId) // Top-level categories
                  .map((category) => (
                    <React.Fragment key={category.id}>
                      <option value={category.id}>
                        {category.icon ? `${category.icon} ` : ''}{category.name}
                      </option>
                      {/* Subcategories */}
                      {filteredCategories
                        .filter(sub => sub.parentId === category.id)
                        .map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            &nbsp;&nbsp;{sub.icon ? `${sub.icon} ` : ''}{sub.name}
                          </option>
                        ))}
                    </React.Fragment>
                  ))}
              </select>
              {errors.categoryId && (
                <p style={{ color: theme.colors.danger, fontSize: theme.typography.caption.fontSize, marginTop: 4 }}>
                  {errors.categoryId}
                </p>
              )}
              {filteredCategories.length === 0 && (
                <p style={{ color: theme.colors.warning, fontSize: theme.typography.caption.fontSize, marginTop: 4 }}>
                  No {type} categories found. Please add categories in Settings first.
                </p>
              )}
            </div>
          )}

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

          {/* Recurrence section */}
          <div
            style={{
              borderTop: `1px solid ${theme.colors.border}`,
              paddingTop: theme.spacing.md,
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.md,
            }}
          >
            {recurringTemplateId ? (
              <>
                <div>
                  <span
                    style={{
                      fontFamily: theme.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      fontWeight: 500,
                      color: theme.colors.textPrimary,
                    }}
                  >
                    Recurring settings
                  </span>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: theme.fontFamily,
                      fontSize: theme.typography.caption.fontSize,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    This transaction is part of a recurring series. Changes here apply to future occurrences.
                  </p>
                </div>
                <div>
                  <label style={labelStyle}>Frequency</label>
                  <select
                    value={recurringFrequency}
                    onChange={(e) => setRecurringFrequency(e.target.value as RecurringFrequency)}
                    style={selectStyle}
                  >
                    {RECURRING_FREQUENCIES.map((freq) => (
                      <option key={freq} value={freq}>
                        {RECURRING_FREQUENCY_LABELS[freq]}
                      </option>
                    ))}
                  </select>
                </div>
                <DateInput
                  label="End date (optional)"
                  value={recurringEndDate}
                  onChange={setRecurringEndDate}
                />
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span
                      style={{
                        fontFamily: theme.fontFamily,
                        fontSize: theme.typography.body.fontSize,
                        fontWeight: 500,
                        color: theme.colors.textPrimary,
                      }}
                    >
                      Make recurring
                    </span>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: theme.fontFamily,
                        fontSize: theme.typography.caption.fontSize,
                        color: theme.colors.textSecondary,
                      }}
                    >
                      Automatically repeat this transaction on a schedule
                    </p>
                  </div>
                  <label
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: theme.spacing.sm }}
                  >
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: theme.colors.primary }}
                    />
                  </label>
                </div>

                {isRecurring && (
                  <>
                    <div>
                      <label style={labelStyle}>Frequency</label>
                      <select
                        value={recurringFrequency}
                        onChange={(e) => setRecurringFrequency(e.target.value as RecurringFrequency)}
                        style={selectStyle}
                      >
                        {RECURRING_FREQUENCIES.map((freq) => (
                          <option key={freq} value={freq}>
                            {RECURRING_FREQUENCY_LABELS[freq]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <DateInput
                      label="End date (optional)"
                      value={recurringEndDate}
                      onChange={setRecurringEndDate}
                    />
                  </>
                )}
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {isEditMode ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/transactions')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Reset form
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || accounts.length === 0 || (type !== 'transfer' && filteredCategories.length === 0)}
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update transaction' : isRecurring ? 'Save recurring transaction' : 'Save transaction'}
            </Button>
          </div>
        </form>
      </Card>

      {accounts.length === 0 && (
        <Card title="No accounts" subtitle="Create an account first" tone="default">
          <p style={{ margin: 0, color: theme.colors.textSecondary }}>
            You need to create at least one account before adding transactions.
          </p>
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate('/accounts')}
            style={{ marginTop: theme.spacing.md }}
          >
            Go to Accounts
          </Button>
        </Card>
      )}
    </div>
  );
}
