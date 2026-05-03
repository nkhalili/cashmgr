import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState, Input, ListItem, useTheme } from '@cashmgr/ui';
import { Account, AccountType, AppError, ErrorHandler, CreateAccountInputSchema, DEFAULT_CURRENCY, formatCurrency, Currency } from '@cashmgr/core';
import { useAccountsService, useCurrenciesService } from '../services/services-context';
import { useFormValidation } from '../hooks/useFormValidation';

const ACCOUNT_TYPE_OPTIONS: { label: string; value: AccountType }[] = [
  { label: 'Cash on hand', value: 'cash' },
  { label: 'Bank', value: 'bank' },
  { label: 'Credit', value: 'credit' },
];

export function Accounts() {
  const theme = useTheme();
  const navigate = useNavigate();
  const accountsService = useAccountsService();
  const currenciesService = useCurrenciesService();
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [name, setName] = React.useState('');
  const [accountType, setAccountType] = React.useState<AccountType>('cash');
  const [initialBalance, setInitialBalance] = React.useState('');

  // F-030: Currency state
  const [currencies, setCurrencies] = React.useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = React.useState(DEFAULT_CURRENCY);

  // F-027: Edit state
  const [editingAccount, setEditingAccount] = React.useState<Account | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editType, setEditType] = React.useState<AccountType>('cash');
  const [isEditSubmitting, setIsEditSubmitting] = React.useState(false);

  // F-026: Helper to get current form values for validation
  const getFormValues = React.useCallback(() => ({
    name: name.trim(),
    type: accountType,
    initialBalance: initialBalance.trim() ? Number(initialBalance) : 0,
    currency: selectedCurrency,
  }), [name, accountType, initialBalance, selectedCurrency]);

  // F-026: Client-side form validation for create
  const { errors, validateField, validateAll, clearErrors, isValid } = useFormValidation(
    CreateAccountInputSchema
  );

  // F-027: Client-side form validation for edit
  const {
    errors: editErrors,
    validateField: validateEditField,
    validateAll: validateEditAll,
    clearErrors: clearEditErrors,
    isValid: isEditValid,
  } = useFormValidation(CreateAccountInputSchema);

  const loadAccounts = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await accountsService.listAccounts();
      setAccounts(data);
    } catch (err) {
      // F-024: Display user-friendly error message from AppError
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to load accounts';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [accountsService]);

  React.useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  // F-030: Load currencies on mount
  const loadCurrencies = React.useCallback(async () => {
    try {
      const data = await currenciesService.listCurrencies(true); // activeOnly
      setCurrencies(data);
      // Set default to primary currency if available
      const primary = data.find(c => c.isPrimary);
      if (primary) {
        setSelectedCurrency(primary.id);
      }
    } catch (err) {
      // Currencies are not critical for account creation, use default if load fails
      ErrorHandler.handle(err, 'Accounts.loadCurrencies');
    }
  }, [currenciesService]);

  React.useEffect(() => {
    void loadCurrencies();
  }, [loadCurrencies]);

  const resetForm = React.useCallback(() => {
    setName('');
    setAccountType('cash');
    setInitialBalance('');
    // F-030: Reset to primary currency
    const primary = currencies.find(c => c.isPrimary);
    setSelectedCurrency(primary?.id || DEFAULT_CURRENCY);
    clearErrors(); // F-026: Clear validation errors on reset
  }, [clearErrors, currencies]);

  const handleSubmit = React.useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();

      // F-026: Validate all fields before submission
      const formValues = getFormValues();

      if (!validateAll(formValues)) {
        return; // Stop submission if validation fails
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await accountsService.createAccount(formValues);
        setShowAddModal(false);
        resetForm();
        await loadAccounts();
      } catch (err) {
        // F-024: Display user-friendly error message from AppError
        const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to create account';
        setError(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [getFormValues, accountsService, validateAll, resetForm, loadAccounts],
  );

  // Handle use template - creates default accounts (Cash, Chequing, Savings)
  const handleUseTemplate = React.useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      await accountsService.createDefaultAccounts();
      await loadAccounts();
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to create default accounts';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [accountsService, loadAccounts]);

  // F-027: Edit account handler
  const handleEdit = React.useCallback((account: Account) => {
    setEditingAccount(account);
    setEditName(account.name);
    setEditType(account.type);
    clearEditErrors();
  }, [clearEditErrors]);

  // F-027: Helper to get edit form values
  const getEditFormValues = React.useCallback(() => ({
    name: editName.trim(),
    type: editType,
    initialBalance: editingAccount?.initialBalance ?? 0,
    currency: editingAccount?.currency ?? DEFAULT_CURRENCY,
  }), [editName, editType, editingAccount]);

  // F-027: Cancel edit
  const handleCancelEdit = React.useCallback(() => {
    setEditingAccount(null);
    setEditName('');
    setEditType('cash');
    clearEditErrors();
  }, [clearEditErrors]);

  // F-027: Save edited account
  const handleSaveEdit = React.useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();

      if (!editingAccount) return;

      const formValues = getEditFormValues();

      if (!validateEditAll(formValues)) {
        return;
      }

      setIsEditSubmitting(true);
      setError(null);

      try {
        await accountsService.updateAccount(editingAccount.id, {
          name: formValues.name,
          type: formValues.type,
        });
        handleCancelEdit();
        await loadAccounts();
      } catch (err) {
        const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to update account';
        setError(errorMessage);
      } finally {
        setIsEditSubmitting(false);
      }
    },
    [editingAccount, getEditFormValues, validateEditAll, accountsService, handleCancelEdit, loadAccounts],
  );

  // F-027: Delete account handler
  const handleDelete = React.useCallback(
    async (account: Account) => {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${account.name}"? This action cannot be undone.`
      );

      if (!confirmed) return;

      setError(null);

      try {
        await accountsService.deleteAccount(account.id);
        await loadAccounts();
      } catch (err) {
        const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to delete account';
        setError(errorMessage);
      }
    },
    [accountsService, loadAccounts],
  );

  const hasAccounts = accounts.length > 0;

  return (
    <div
      className="page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.lg,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: theme.spacing.md }}>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: theme.typography.h1.fontSize,
              fontWeight: theme.typography.h1.fontWeight,
            }}
          >
            Accounts
          </h2>
          <p style={{ marginTop: theme.spacing.xs, color: theme.colors.textSecondary }}>
            Group cash, cards, and investments into a single calm list.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={() => setShowAddModal(true)}>
          Add account
        </Button>
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

      <Card title="Account overview" subtitle="Organise institutions and balances" tone="default">
        {isLoading ? (
          <p style={{ margin: 0, color: theme.colors.textSecondary }}>Loading accounts...</p>
        ) : hasAccounts ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {accounts.map((account, index) => (
              <ListItem
                key={account.id}
                title={account.name}
                subtitle={`${account.type.charAt(0).toUpperCase()}${account.type.slice(1)} • ${account.currency}`}
                value={formatCurrency(account.balance, account.currency)}
                badgeLabel={account.type === 'cash' ? 'Daily' : account.type === 'bank' ? 'Recurring' : 'Credit'}
                badgeTone={account.type === 'credit' ? 'danger' : 'accent'}
                showDivider={index !== accounts.length - 1}
                onPress={() => navigate(`/transactions?accountId=${account.id}`)}
                actions={
                  <div style={{ display: 'flex', gap: theme.spacing.xs }}>
                    <Button type="button" variant="ghost" onClick={() => handleEdit(account)}>
                      Edit
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => handleDelete(account)}>
                      Delete
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No accounts connected"
            description="Accounts help you track balances, categorise inflows, and surface insights. Add one to begin, or use the template to get started quickly."
            action={
              <Button type="button" variant="primary" onClick={() => setShowAddModal(true)}>
                Connect an account
              </Button>
            }
            secondaryAction={<Button type="button" variant="ghost" onClick={handleUseTemplate}>Use template</Button>}
          />
        )}
      </Card>

      {/* Add Account Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 500,
              width: '100%',
              margin: theme.spacing.lg,
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <Card title="Add account" subtitle="Capture balances locally, never online" tone="default">
              <form
                onSubmit={handleSubmit}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing.md,
                }}
              >
                <Input
                  label="Account name"
                  placeholder="e.g. Household checking"
                  value={name}
                  onChange={(value) => {
                    setName(value);
                    if (errors.name) {
                      validateField('name', {
                        ...getFormValues(),
                        name: value.trim(),
                      });
                    }
                  }}
                  onBlur={() => validateField('name', getFormValues())}
                  error={errors.name}
                  required
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                  <label
                    style={{
                      fontFamily: theme.fontFamily,
                      fontSize: theme.typography.caption.fontSize,
                      color: theme.colors.textSecondary,
                      fontWeight: 500,
                    }}
                  >
                    Account type
                  </label>
                  <select
                    value={accountType}
                    onChange={(event) => setAccountType(event.target.value as AccountType)}
                    style={{
                      height: theme.components.inputHeight,
                      borderRadius: theme.components.interactiveRadius,
                      border: `1px solid ${theme.colors.border}`,
                      fontFamily: theme.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      padding: `0 ${theme.spacing.sm}px`,
                      background: theme.colors.surface,
                      color: theme.colors.textPrimary,
                    }}
                  >
                    {ACCOUNT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                  <label
                    style={{
                      fontFamily: theme.fontFamily,
                      fontSize: theme.typography.caption.fontSize,
                      color: theme.colors.textSecondary,
                      fontWeight: 500,
                    }}
                  >
                    Currency
                  </label>
                  <select
                    value={selectedCurrency}
                    onChange={(event) => setSelectedCurrency(event.target.value)}
                    style={{
                      height: theme.components.inputHeight,
                      borderRadius: theme.components.interactiveRadius,
                      border: `1px solid ${theme.colors.border}`,
                      fontFamily: theme.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      padding: `0 ${theme.spacing.sm}px`,
                      background: theme.colors.surface,
                      color: theme.colors.textPrimary,
                    }}
                  >
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.name} ({currency.symbol}){currency.isPrimary ? ' - Primary' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Initial balance"
                  type="number"
                  placeholder="0.00"
                  value={initialBalance}
                  onChange={(value) => {
                    setInitialBalance(value);
                    if (errors.initialBalance) {
                      const parsed = value.trim() ? Number(value) : 0;
                      validateField('initialBalance', {
                        ...getFormValues(),
                        initialBalance: Number.isFinite(parsed) ? parsed : 0,
                      });
                    }
                  }}
                  onBlur={() => validateField('initialBalance', getFormValues())}
                  error={errors.initialBalance}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowAddModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !isValid}>
                    {isSubmitting ? 'Saving...' : 'Save account'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* F-027: Edit Account Modal */}
      {editingAccount && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleCancelEdit}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 500,
              width: '100%',
              margin: theme.spacing.lg,
            }}
          >
            <Card title="Edit Account" subtitle="Update account details" tone="default">
              <form
                onSubmit={handleSaveEdit}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing.md,
                }}
              >
                <Input
                  label="Account name"
                  placeholder="e.g. Household checking"
                  value={editName}
                  onChange={(value) => {
                    setEditName(value);
                    if (editErrors.name) {
                      validateEditField('name', {
                        ...getEditFormValues(),
                        name: value.trim(),
                      });
                    }
                  }}
                  onBlur={() => validateEditField('name', getEditFormValues())}
                  error={editErrors.name}
                  required
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                  <label
                    style={{
                      fontFamily: theme.fontFamily,
                      fontSize: theme.typography.caption.fontSize,
                      color: theme.colors.textSecondary,
                      fontWeight: 500,
                    }}
                  >
                    Account type
                  </label>
                  <select
                    value={editType}
                    onChange={(event) => setEditType(event.target.value as AccountType)}
                    style={{
                      height: theme.components.inputHeight,
                      borderRadius: theme.components.interactiveRadius,
                      border: `1px solid ${theme.colors.border}`,
                      fontFamily: theme.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      padding: `0 ${theme.spacing.sm}px`,
                      background: theme.colors.surface,
                      color: theme.colors.textPrimary,
                    }}
                  >
                    {ACCOUNT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  style={{
                    padding: theme.spacing.sm,
                    background: theme.colors.surfaceMuted,
                    borderRadius: theme.components.interactiveRadius,
                    fontSize: theme.typography.caption.fontSize,
                    color: theme.colors.textSecondary,
                  }}
                >
                  Note: Initial balance cannot be edited. Current balance: {formatCurrency(editingAccount.balance, editingAccount.currency)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
                  <Button type="button" variant="ghost" onClick={handleCancelEdit} disabled={isEditSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isEditSubmitting || !isEditValid}>
                    {isEditSubmitting ? 'Saving...' : 'Save changes'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
