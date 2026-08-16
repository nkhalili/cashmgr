import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, Input, ListItem, useTheme } from '@cashmgr/ui';
import { Currency, AppError, ExchangeRateFetchError } from '@cashmgr/core';
import { CreateCurrencyInputSchema } from '@cashmgr/core';
import { useCurrenciesService } from '../services/services-context';
import { useFormValidation } from '../hooks/useFormValidation';

const COMMON_CURRENCIES = [
  { id: 'USD', name: 'US Dollar', symbol: '$' },
  { id: 'EUR', name: 'Euro', symbol: '€' },
  { id: 'GBP', name: 'British Pound', symbol: '£' },
  { id: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { id: 'CAD', name: 'Canadian Dollar', symbol: '$' },
  { id: 'AUD', name: 'Australian Dollar', symbol: '$' },
  { id: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { id: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { id: 'INR', name: 'Indian Rupee', symbol: '₹' },
];

export function SettingsCurrencies() {
  const theme = useTheme();
  const currenciesService = useCurrenciesService();

  const [currencies, setCurrencies] = React.useState<Currency[]>([]);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [showAddModal, setShowAddModal] = React.useState(false);
  const [addModalError, setAddModalError] = React.useState<string | null>(null);
  const [currencyId, setCurrencyId] = React.useState('');
  const [currencyName, setCurrencyName] = React.useState('');
  const [currencySymbol, setCurrencySymbol] = React.useState('');
  const [exchangeRate, setExchangeRate] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isFetchingRate, setIsFetchingRate] = React.useState(false);
  const [rateSource, setRateSource] = React.useState<'manual' | 'fetched'>('manual');

  const [editingCurrency, setEditingCurrency] = React.useState<Currency | null>(null);
  const [editModalError, setEditModalError] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editSymbol, setEditSymbol] = React.useState('');
  const [editRate, setEditRate] = React.useState('');
  const [isEditSubmitting, setIsEditSubmitting] = React.useState(false);
  const [isEditFetchingRate, setIsEditFetchingRate] = React.useState(false);
  const [editRateSource, setEditRateSource] = React.useState<'manual' | 'fetched'>('manual');

  const getAddFormValues = React.useCallback(() => ({
    id: currencyId.trim(),
    name: currencyName.trim(),
    symbol: currencySymbol.trim(),
    exchangeRate: exchangeRate.trim() ? Number(exchangeRate) : 1.0,
    isPrimary: false,
  }), [currencyId, currencyName, currencySymbol, exchangeRate]);

  const { errors, validateField, validateAll, clearErrors, isValid } = useFormValidation(CreateCurrencyInputSchema);

  const getEditFormValues = React.useCallback(() => ({
    id: editingCurrency?.id || '',
    name: editName.trim(),
    symbol: editSymbol.trim(),
    exchangeRate: editRate.trim() ? Number(editRate) : editingCurrency?.exchangeRate || 1.0,
    isPrimary: editingCurrency?.isPrimary || false,
  }), [editingCurrency, editName, editSymbol, editRate]);

  const {
    errors: editErrors,
    validateField: validateEditField,
    validateAll: validateEditAll,
    clearErrors: clearEditErrors,
    isValid: isEditValid,
  } = useFormValidation(CreateCurrencyInputSchema);

  const loadCurrencies = React.useCallback(async () => {
    setIsLoadingCurrencies(true);
    setError(null);
    try {
      const data = await currenciesService.listCurrencies(true);
      setCurrencies(data);
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to load currencies';
      setError(errorMessage);
    } finally {
      setIsLoadingCurrencies(false);
    }
  }, [currenciesService]);

  React.useEffect(() => {
    void loadCurrencies();
  }, [loadCurrencies]);

  const handleSelectCurrency = React.useCallback((curr: typeof COMMON_CURRENCIES[0]) => {
    setCurrencyId(curr.id);
    setCurrencyName(curr.name);
    setCurrencySymbol(curr.symbol);
    clearErrors();
  }, [clearErrors]);

  const handleFetchRate = React.useCallback(async () => {
    if (!currencyId.trim()) {
      setAddModalError('Please select a currency first');
      return;
    }
    setIsFetchingRate(true);
    setAddModalError(null);
    try {
      const rate = await currenciesService.fetchCurrentRate(currencyId);
      setExchangeRate(rate.toString());
      setRateSource('fetched');
    } catch (err) {
      if (err instanceof ExchangeRateFetchError) {
        setAddModalError(err.message);
      } else {
        setAddModalError('Failed to fetch exchange rate. Please enter manually.');
      }
    } finally {
      setIsFetchingRate(false);
    }
  }, [currencyId, currenciesService]);

  const handleAddCurrency = React.useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const formValues = getAddFormValues();
    if (!validateAll(formValues)) return;
    setIsSubmitting(true);
    setAddModalError(null);
    try {
      await currenciesService.createCurrency(formValues);
      setShowAddModal(false);
      setAddModalError(null);
      setCurrencyId('');
      setCurrencyName('');
      setCurrencySymbol('');
      setExchangeRate('');
      setRateSource('manual');
      clearErrors();
      await loadCurrencies();
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to add currency';
      setAddModalError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [getAddFormValues, validateAll, currenciesService, clearErrors, loadCurrencies]);

  const handleEdit = React.useCallback((currency: Currency) => {
    setEditingCurrency(currency);
    setEditName(currency.name);
    setEditSymbol(currency.symbol);
    setEditRate(currency.exchangeRate.toString());
    setEditRateSource('manual');
    setEditModalError(null);
    clearEditErrors();
  }, [clearEditErrors]);

  const handleEditFetchRate = React.useCallback(async () => {
    if (!editingCurrency) return;
    setIsEditFetchingRate(true);
    setEditModalError(null);
    try {
      const rate = await currenciesService.fetchCurrentRate(editingCurrency.id);
      setEditRate(rate.toString());
      setEditRateSource('fetched');
    } catch (err) {
      if (err instanceof ExchangeRateFetchError) {
        setEditModalError(err.message);
      } else {
        setEditModalError('Failed to fetch exchange rate. Please enter manually.');
      }
    } finally {
      setIsEditFetchingRate(false);
    }
  }, [editingCurrency, currenciesService]);

  const handleSaveEdit = React.useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!editingCurrency) return;
    const formValues = getEditFormValues();
    if (!validateEditAll(formValues)) return;
    setIsEditSubmitting(true);
    setEditModalError(null);
    try {
      await currenciesService.updateCurrency(editingCurrency.id, {
        name: formValues.name,
        symbol: formValues.symbol,
        exchangeRate: formValues.exchangeRate,
      });
      setEditingCurrency(null);
      setEditModalError(null);
      clearEditErrors();
      await loadCurrencies();
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to update currency';
      setEditModalError(errorMessage);
    } finally {
      setIsEditSubmitting(false);
    }
  }, [editingCurrency, getEditFormValues, validateEditAll, currenciesService, clearEditErrors, loadCurrencies]);

  const handleCancelEdit = React.useCallback(() => {
    setEditingCurrency(null);
    setEditName('');
    setEditSymbol('');
    setEditRate('');
    setEditRateSource('manual');
    setEditModalError(null);
    clearEditErrors();
  }, [clearEditErrors]);

  const handleDelete = React.useCallback(async (currency: Currency) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${currency.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    setError(null);
    try {
      await currenciesService.deleteCurrency(currency.id);
      await loadCurrencies();
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to delete currency';
      setError(errorMessage);
    }
  }, [currenciesService, loadCurrencies]);

  const handleSetPrimary = React.useCallback(async (currency: Currency) => {
    const confirmed = window.confirm(
      `Set "${currency.name}" as your primary currency? All exchange rates will be recalculated.`
    );
    if (!confirmed) return;
    setError(null);
    try {
      await currenciesService.setPrimaryCurrency(currency.id);
      await loadCurrencies();
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to set primary currency';
      setError(errorMessage);
    }
  }, [currenciesService, loadCurrencies]);

  const primaryCurrency = currencies.find((c) => c.isPrimary);
  const subCurrencies = currencies.filter((c) => !c.isPrimary);

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
        <Link
          to="/settings"
          className="settings-breadcrumb-link"
          style={{ color: theme.colors.primary, fontSize: theme.typography.h1.fontSize, fontWeight: theme.typography.h1.fontWeight }}
        >
          Settings
        </Link>
        <span style={{ color: theme.colors.textSecondary, fontSize: theme.typography.h1.fontSize }}>›</span>
        <h2 style={{ margin: 0, fontSize: theme.typography.h1.fontSize, fontWeight: theme.typography.h1.fontWeight }}>
          Currencies
        </h2>
      </div>

      {error && (
        <div style={{ padding: theme.spacing.md, backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: theme.components.interactiveRadius, color: '#c00' }}>
          <p style={{ margin: 0, fontWeight: 500 }}>{error}</p>
        </div>
      )}

      <Card
        title="Currencies"
        subtitle="Manage primary currency and exchange rates"
        tone="default"
        footer={
          <div style={{ display: 'flex', gap: theme.spacing.sm }}>
            <Button type="button" variant="primary" onClick={() => { setShowAddModal(true); setAddModalError(null); }}>
              Add currency
            </Button>
          </div>
        }
      >
        {isLoadingCurrencies ? (
          <p style={{ margin: 0, color: theme.colors.textSecondary }}>Loading currencies...</p>
        ) : (
          <>
            {primaryCurrency && (
              <div style={{ marginBottom: theme.spacing.md }}>
                <p style={{ margin: `0 0 ${theme.spacing.xs}px 0`, fontSize: theme.typography.caption.fontSize, fontWeight: 600, color: theme.colors.textSecondary }}>
                  Primary Currency
                </p>
                <ListItem
                  title={`${primaryCurrency.name} (${primaryCurrency.id})`}
                  subtitle="Base currency for all conversions"
                  value={primaryCurrency.symbol}
                  badgeLabel="Primary"
                  badgeTone="accent"
                  showDivider={false}
                />
              </div>
            )}

            {subCurrencies.length > 0 && (
              <div>
                <p style={{ margin: `${theme.spacing.md}px 0 ${theme.spacing.xs}px 0`, fontSize: theme.typography.caption.fontSize, fontWeight: 600, color: theme.colors.textSecondary }}>
                  Sub Currencies
                </p>
                {subCurrencies.map((currency, index) => (
                  <ListItem
                    key={currency.id}
                    title={`${currency.name} (${currency.id})`}
                    subtitle={`1 ${primaryCurrency?.id} = ${currency.exchangeRate} ${currency.id}`}
                    value={currency.symbol}
                    showDivider={index !== subCurrencies.length - 1}
                    actions={
                      <div style={{ display: 'flex', gap: theme.spacing.xs }}>
                        <Button type="button" variant="ghost" onClick={() => handleEdit(currency)}>Edit</Button>
                        <Button type="button" variant="ghost" onClick={() => handleSetPrimary(currency)}>Set Primary</Button>
                        <Button type="button" variant="ghost" onClick={() => handleDelete(currency)}>Delete</Button>
                      </div>
                    }
                  />
                ))}
              </div>
            )}

            {!primaryCurrency && subCurrencies.length === 0 && (
              <EmptyState
                title="No currencies configured"
                description="Add a primary currency to get started with multi-currency support."
                action={
                  <Button type="button" variant="primary" onClick={() => { setShowAddModal(true); setAddModalError(null); }}>
                    Add currency
                  </Button>
                }
              />
            )}
          </>
        )}
      </Card>

      {/* Add Currency Modal */}
      {showAddModal && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowAddModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, width: '100%', margin: theme.spacing.lg, maxHeight: '90vh', overflow: 'auto' }}>
            <Card title="Add Currency" subtitle="Add a new currency with exchange rate" tone="default">
              <form onSubmit={handleAddCurrency} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                <div>
                  <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontFamily: theme.fontFamily, fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary, fontWeight: 500 }}>
                    Quick Select
                  </label>
                  <div style={{ display: 'flex', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
                    {COMMON_CURRENCIES.map((curr) => (
                      <Button key={curr.id} type="button" variant="ghost" onClick={() => handleSelectCurrency(curr)}>{curr.id}</Button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Currency Code (ISO 4217)"
                  placeholder="e.g., EUR, GBP, JPY"
                  value={currencyId}
                  onChange={(value) => {
                    setCurrencyId(value.toUpperCase());
                    if (errors.id) validateField('id', { ...getAddFormValues(), id: value.trim().toUpperCase() });
                  }}
                  onBlur={() => validateField('id', getAddFormValues())}
                  error={errors.id}
                  required
                />
                <Input
                  label="Currency Name"
                  placeholder="e.g., Euro, British Pound"
                  value={currencyName}
                  onChange={(value) => {
                    setCurrencyName(value);
                    if (errors.name) validateField('name', { ...getAddFormValues(), name: value.trim() });
                  }}
                  onBlur={() => validateField('name', getAddFormValues())}
                  error={errors.name}
                  required
                />
                <Input
                  label="Currency Symbol"
                  placeholder="e.g., €, £, ¥"
                  value={currencySymbol}
                  onChange={(value) => {
                    setCurrencySymbol(value);
                    if (errors.symbol) validateField('symbol', { ...getAddFormValues(), symbol: value.trim() });
                  }}
                  onBlur={() => validateField('symbol', getAddFormValues())}
                  error={errors.symbol}
                  required
                />

                <div>
                  <Input
                    label={`Exchange Rate (1 ${primaryCurrency?.id || 'Primary'} =)`}
                    type="number"
                    placeholder="0.00"
                    value={exchangeRate}
                    onChange={(value) => {
                      setExchangeRate(value);
                      if (errors.exchangeRate) validateField('exchangeRate', { ...getAddFormValues(), exchangeRate: value.trim() ? Number(value) : 1.0 });
                    }}
                    onBlur={() => validateField('exchangeRate', getAddFormValues())}
                    error={errors.exchangeRate}
                  />
                  <div style={{ marginTop: theme.spacing.xs, display: 'flex', gap: theme.spacing.sm }}>
                    <Button type="button" variant="ghost" onClick={handleFetchRate} disabled={isFetchingRate || !currencyId.trim()}>
                      {isFetchingRate ? 'Fetching...' : 'Fetch current rate'}
                    </Button>
                    {rateSource === 'fetched' && (
                      <span style={{ fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary, alignSelf: 'center' }}>
                        ✓ Rate fetched from API
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ padding: theme.spacing.sm, background: theme.colors.surfaceMuted, borderRadius: theme.components.interactiveRadius, fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary }}>
                  Note: You can fetch the latest exchange rate from the internet or enter it manually.
                </div>

                {addModalError && (
                  <div style={{ padding: theme.spacing.sm, backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: theme.components.interactiveRadius, color: '#c00', fontSize: theme.typography.caption.fontSize }}>
                    {addModalError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
                  <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting || !isValid}>{isSubmitting ? 'Adding...' : 'Add currency'}</Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* Edit Currency Modal */}
      {editingCurrency && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={handleCancelEdit}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, width: '100%', margin: theme.spacing.lg }}>
            <Card title="Edit Currency" subtitle={`Update ${editingCurrency.id} details`} tone="default">
              <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                <Input
                  label="Currency Name"
                  placeholder="e.g., Euro, British Pound"
                  value={editName}
                  onChange={(value) => {
                    setEditName(value);
                    if (editErrors.name) validateEditField('name', { ...getEditFormValues(), name: value.trim() });
                  }}
                  onBlur={() => validateEditField('name', getEditFormValues())}
                  error={editErrors.name}
                  required
                />
                <Input
                  label="Currency Symbol"
                  placeholder="e.g., €, £, ¥"
                  value={editSymbol}
                  onChange={(value) => {
                    setEditSymbol(value);
                    if (editErrors.symbol) validateEditField('symbol', { ...getEditFormValues(), symbol: value.trim() });
                  }}
                  onBlur={() => validateEditField('symbol', getEditFormValues())}
                  error={editErrors.symbol}
                  required
                />

                {!editingCurrency.isPrimary && (
                  <div>
                    <Input
                      label={`Exchange Rate (1 ${primaryCurrency?.id || 'Primary'} =)`}
                      type="number"
                      placeholder="0.00"
                      value={editRate}
                      onChange={(value) => {
                        setEditRate(value);
                        if (editErrors.exchangeRate) validateEditField('exchangeRate', { ...getEditFormValues(), exchangeRate: value.trim() ? Number(value) : 1.0 });
                      }}
                      onBlur={() => validateEditField('exchangeRate', getEditFormValues())}
                      error={editErrors.exchangeRate}
                    />
                    <div style={{ marginTop: theme.spacing.xs, display: 'flex', gap: theme.spacing.sm }}>
                      <Button type="button" variant="ghost" onClick={handleEditFetchRate} disabled={isEditFetchingRate}>
                        {isEditFetchingRate ? 'Fetching...' : 'Fetch latest rate'}
                      </Button>
                      {editRateSource === 'fetched' && (
                        <span style={{ fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary, alignSelf: 'center' }}>
                          ✓ Rate fetched from API
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {editingCurrency.isPrimary && (
                  <div style={{ padding: theme.spacing.sm, background: theme.colors.surfaceMuted, borderRadius: theme.components.interactiveRadius, fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary }}>
                    Note: Primary currency exchange rate is always 1.0 and cannot be edited.
                  </div>
                )}

                {editModalError && (
                  <div style={{ padding: theme.spacing.sm, backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: theme.components.interactiveRadius, color: '#c00', fontSize: theme.typography.caption.fontSize }}>
                    {editModalError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
                  <Button type="button" variant="ghost" onClick={handleCancelEdit} disabled={isEditSubmitting}>Cancel</Button>
                  <Button type="submit" disabled={isEditSubmitting || !isEditValid}>{isEditSubmitting ? 'Saving...' : 'Save changes'}</Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

