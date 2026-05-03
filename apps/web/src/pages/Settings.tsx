import React from 'react';
import { Badge, Button, Card, EmptyState, Input, ListItem, useTheme } from '@cashmgr/ui';
import type { AccentColor } from '@cashmgr/ui';
import { Currency, AppError, ErrorHandler, ExchangeRateFetchError, exportData, previewImport, importData, previewCsv, importCsv } from '@cashmgr/core';
import type { ImportPreview, ImportMode, CsvPreviewResult, CsvColumnMapping } from '@cashmgr/core';
import { useCurrenciesService, useAccountsService, useDatabase, useDatabaseAdapter } from '../services/services-context';
import { useFormValidation } from '../hooks/useFormValidation';
import { CreateCurrencyInputSchema } from '@cashmgr/core';
import { seedWebDatabase, clearWebSeedData, hasWebData } from '../database/web-seed';
import { useThemePreference, ThemePreference } from '../contexts/theme-context';

const THEME_OPTIONS: { value: ThemePreference; label: string; description: string }[] = [
  { value: 'system', label: 'System', description: 'Follow OS setting' },
  { value: 'light', label: 'Light', description: 'Bright interface' },
  { value: 'dark', label: 'Black', description: 'Dark interface' },
];

const ACCENT_OPTIONS: { value: AccentColor; label: string; colorLight: string }[] = [
  { value: 'teal', label: 'Teal', colorLight: '#2f7d68' },
  { value: 'indigo', label: 'Indigo', colorLight: '#4f46e5' },
  { value: 'slate', label: 'Slate', colorLight: '#475569' },
];

// Common currency options for quick selection
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

function AppearanceCard() {
  const theme = useTheme();
  const { preference, setPreference, accent, setAccent } = useThemePreference();

  return (
    <Card title="Appearance" subtitle="Theme & layout options" tone="default">
      {/* Theme mode selector */}
      <div style={{ marginBottom: theme.spacing.lg }}>
        <p
          style={{
            margin: `0 0 ${theme.spacing.sm}px 0`,
            fontSize: theme.typography.caption.fontSize,
            fontWeight: 600,
            color: theme.colors.textSecondary,
          }}
        >
          Theme
        </p>
        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
          {THEME_OPTIONS.map((opt) => {
            const isActive = preference === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPreference(opt.value)}
                style={{
                  flex: 1,
                  padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                  borderRadius: theme.radii.md,
                  border: `2px solid ${isActive ? theme.colors.primary : theme.colors.border}`,
                  background: isActive ? theme.colors.primarySoft : theme.colors.surface,
                  color: isActive ? theme.colors.primary : theme.colors.textPrimary,
                  cursor: 'pointer',
                  fontFamily: theme.fontFamily,
                  fontWeight: 600,
                  fontSize: theme.typography.body.fontSize,
                  transition: `all ${theme.motion.quick}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                }}
              >
                <span>{opt.label}</span>
                <span
                  style={{
                    fontSize: theme.typography.caption.fontSize,
                    fontWeight: 400,
                    color: isActive ? theme.colors.primary : theme.colors.textMuted,
                  }}
                >
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent color selector */}
      <div style={{ marginBottom: theme.spacing.md }}>
        <p
          style={{
            margin: `0 0 ${theme.spacing.sm}px 0`,
            fontSize: theme.typography.caption.fontSize,
            fontWeight: 600,
            color: theme.colors.textSecondary,
          }}
        >
          Accent color
        </p>
        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
          {ACCENT_OPTIONS.map((opt) => {
            const isActive = accent === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAccent(opt.value)}
                style={{
                  flex: 1,
                  padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                  borderRadius: theme.radii.md,
                  border: `2px solid ${isActive ? opt.colorLight : theme.colors.border}`,
                  background: isActive ? theme.colors.primarySoft : theme.colors.surface,
                  color: theme.colors.textPrimary,
                  cursor: 'pointer',
                  fontFamily: theme.fontFamily,
                  fontWeight: 600,
                  fontSize: theme.typography.body.fontSize,
                  transition: `all ${theme.motion.quick}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: theme.radii.pill,
                    background: opt.colorLight,
                    flexShrink: 0,
                  }}
                />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact mode */}
      <ListItem
        title="Compact mode"
        subtitle="Condense cards and tables"
        value={<Badge label="Coming soon" tone="neutral" />}
        showDivider={false}
      />
    </Card>
  );
}

export function Settings() {
  const theme = useTheme();
  const currenciesService = useCurrenciesService();
  const accountsService = useAccountsService();
  const db = useDatabase();
  const adapter = useDatabaseAdapter();

  // Accounts (for CSV import account selector)
  const [accounts, setAccounts] = React.useState<{ id: string; name: string; currency: string }[]>([]);
  React.useEffect(() => {
    accountsService.listAccounts().then((list) => setAccounts(list)).catch(() => {});
  }, [accountsService]);

  // F-030: Currency state
  const [currencies, setCurrencies] = React.useState<Currency[]>([]);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // F-030: Add currency modal state
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [currencyId, setCurrencyId] = React.useState('');
  const [currencyName, setCurrencyName] = React.useState('');
  const [currencySymbol, setCurrencySymbol] = React.useState('');
  const [exchangeRate, setExchangeRate] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isFetchingRate, setIsFetchingRate] = React.useState(false);
  const [rateSource, setRateSource] = React.useState<'manual' | 'fetched'>('manual');

  // F-030: Edit currency modal state
  const [editingCurrency, setEditingCurrency] = React.useState<Currency | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editSymbol, setEditSymbol] = React.useState('');
  const [editRate, setEditRate] = React.useState('');
  const [isEditSubmitting, setIsEditSubmitting] = React.useState(false);
  const [isEditFetchingRate, setIsEditFetchingRate] = React.useState(false);
  const [editRateSource, setEditRateSource] = React.useState<'manual' | 'fetched'>('manual');

  // Seeding state
  const [isSeeding, setIsSeeding] = React.useState(false);
  const [hasData, setHasData] = React.useState(false);

  // F-062: Export/Import state
  const [isExporting, setIsExporting] = React.useState(false);
  const [importPreview, setImportPreview] = React.useState<ImportPreview | null>(null);
  const [pendingImportContent, setPendingImportContent] = React.useState<string | null>(null);
  const [importMode, setImportMode] = React.useState<ImportMode>('replace');
  const [isImporting, setIsImporting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // F-062: CSV import state
  const [csvStep, setCsvStep] = React.useState<0 | 1 | 2 | 3>(0);
  const [csvContent, setCsvContent] = React.useState<string | null>(null);
  const [csvPreview, setCsvPreview] = React.useState<CsvPreviewResult | null>(null);
  const [csvAmountMode, setCsvAmountMode] = React.useState<'single' | 'debit_credit'>('single');
  const [csvMapping, setCsvMapping] = React.useState<CsvColumnMapping>({ date: '' });
  const [csvAccountId, setCsvAccountId] = React.useState('');
  const [csvDefaultCurrency, setCsvDefaultCurrency] = React.useState('');
  const [isImportingCsv, setIsImportingCsv] = React.useState(false);
  const csvFileInputRef = React.useRef<HTMLInputElement>(null);

  // F-026: Form validation for add currency
  const getAddFormValues = React.useCallback(() => ({
    id: currencyId.trim(),
    name: currencyName.trim(),
    symbol: currencySymbol.trim(),
    exchangeRate: exchangeRate.trim() ? Number(exchangeRate) : 1.0,
    isPrimary: false,
  }), [currencyId, currencyName, currencySymbol, exchangeRate]);

  const { errors, validateField, validateAll, clearErrors, isValid } = useFormValidation(
    CreateCurrencyInputSchema
  );

  // F-026: Form validation for edit currency
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

  // F-030: Load currencies
  const loadCurrencies = React.useCallback(async () => {
    setIsLoadingCurrencies(true);
    setError(null);
    try {
      const data = await currenciesService.listCurrencies(true); // activeOnly
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

  const checkHasData = React.useCallback(async () => {
    try {
      const result = await hasWebData(db);
      setHasData(result);
    } catch (err) {
      ErrorHandler.handle(err, 'Settings.checkHasData');
    }
  }, []);

  React.useEffect(() => {
    void checkHasData();
  }, [checkHasData]);

  // F-030: Handle currency selection from common list
  const handleSelectCurrency = React.useCallback((curr: typeof COMMON_CURRENCIES[0]) => {
    setCurrencyId(curr.id);
    setCurrencyName(curr.name);
    setCurrencySymbol(curr.symbol);
    clearErrors();
  }, [clearErrors]);

  // F-030: Fetch current exchange rate
  const handleFetchRate = React.useCallback(async () => {
    if (!currencyId.trim()) {
      setError('Please select a currency first');
      return;
    }

    setIsFetchingRate(true);
    setError(null);

    try {
      const rate = await currenciesService.fetchCurrentRate(currencyId);
      setExchangeRate(rate.toString());
      setRateSource('fetched');
    } catch (err) {
      if (err instanceof ExchangeRateFetchError) {
        setError(err.message);
      } else {
        setError('Failed to fetch exchange rate. Please enter manually.');
      }
    } finally {
      setIsFetchingRate(false);
    }
  }, [currencyId, currenciesService]);

  // F-030: Add new currency
  const handleAddCurrency = React.useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const formValues = getAddFormValues();

    if (!validateAll(formValues)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await currenciesService.createCurrency(formValues);
      setShowAddModal(false);
      setCurrencyId('');
      setCurrencyName('');
      setCurrencySymbol('');
      setExchangeRate('');
      setRateSource('manual');
      clearErrors();
      await loadCurrencies();
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to add currency';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [getAddFormValues, validateAll, currenciesService, clearErrors, loadCurrencies]);

  // F-030: Open edit modal
  const handleEdit = React.useCallback((currency: Currency) => {
    setEditingCurrency(currency);
    setEditName(currency.name);
    setEditSymbol(currency.symbol);
    setEditRate(currency.exchangeRate.toString());
    setEditRateSource('manual');
    clearEditErrors();
  }, [clearEditErrors]);

  // F-030: Fetch rate for edit
  const handleEditFetchRate = React.useCallback(async () => {
    if (!editingCurrency) return;

    setIsEditFetchingRate(true);
    setError(null);

    try {
      const rate = await currenciesService.fetchCurrentRate(editingCurrency.id);
      setEditRate(rate.toString());
      setEditRateSource('fetched');
    } catch (err) {
      if (err instanceof ExchangeRateFetchError) {
        setError(err.message);
      } else {
        setError('Failed to fetch exchange rate. Please enter manually.');
      }
    } finally {
      setIsEditFetchingRate(false);
    }
  }, [editingCurrency, currenciesService]);

  // F-030: Save edited currency
  const handleSaveEdit = React.useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!editingCurrency) return;

    const formValues = getEditFormValues();

    if (!validateEditAll(formValues)) {
      return;
    }

    setIsEditSubmitting(true);
    setError(null);

    try {
      await currenciesService.updateCurrency(editingCurrency.id, {
        name: formValues.name,
        symbol: formValues.symbol,
        exchangeRate: formValues.exchangeRate,
      });
      setEditingCurrency(null);
      clearEditErrors();
      await loadCurrencies();
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.getUserMessage() : 'Failed to update currency';
      setError(errorMessage);
    } finally {
      setIsEditSubmitting(false);
    }
  }, [editingCurrency, getEditFormValues, validateEditAll, currenciesService, clearEditErrors, loadCurrencies]);

  // F-030: Cancel edit
  const handleCancelEdit = React.useCallback(() => {
    setEditingCurrency(null);
    setEditName('');
    setEditSymbol('');
    setEditRate('');
    setEditRateSource('manual');
    clearEditErrors();
  }, [clearEditErrors]);

  // F-030: Delete currency
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

  // F-030: Set as primary currency
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

  const handleLoadSampleData = React.useCallback(async () => {
    const confirmed = window.confirm(
      'This will add 4 accounts, 15 categories, and ~93 transactions to your database. Continue?'
    );

    if (!confirmed) return;

    setIsSeeding(true);
    setError(null);

    try {
      await seedWebDatabase(db);
      await checkHasData();
      await loadCurrencies();
      window.alert('Sample data loaded successfully!');
    } catch (err) {
      const errorMessage =
        err instanceof AppError ? err.getUserMessage() : 'Failed to load sample data';
      setError(errorMessage);
      window.alert(`Error: ${errorMessage}`);
    } finally {
      setIsSeeding(false);
    }
  }, [checkHasData, loadCurrencies]);

  const handleClearSampleData = React.useCallback(async () => {
    const confirmed = window.confirm(
      'This will delete ALL accounts, categories, and transactions from your database. This action cannot be undone!'
    );

    if (!confirmed) return;

    setIsSeeding(true);
    setError(null);

    try {
      await clearWebSeedData(db);
      await checkHasData();
      await loadCurrencies();
      window.alert('All data cleared successfully!');
    } catch (err) {
      const errorMessage =
        err instanceof AppError ? err.getUserMessage() : 'Failed to clear data';
      setError(errorMessage);
      window.alert(`Error: ${errorMessage}`);
    } finally {
      setIsSeeding(false);
    }
  }, [checkHasData, loadCurrencies]);

  // F-062: Export handlers
  const handleExportJSON = React.useCallback(async () => {
    setIsExporting(true);
    setError(null);
    try {
      const result = await exportData(adapter, { format: 'json', platform: 'web' });
      const blob = new Blob([result.content], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof AppError ? err.getUserMessage() : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [adapter]);

  const handleExportCSV = React.useCallback(async () => {
    setIsExporting(true);
    setError(null);
    try {
      const result = await exportData(adapter, { format: 'csv', platform: 'web' });
      const blob = new Blob([result.content], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof AppError ? err.getUserMessage() : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [adapter]);

  const handleImportFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const content = await file.text();
        const preview = previewImport(content);
        setPendingImportContent(content);
        setImportPreview(preview);
        setImportMode('replace');
      } catch {
        setError('Failed to read file');
      }

      // Reset so same file can be re-selected
      event.target.value = '';
    },
    [],
  );

  const handleConfirmImport = React.useCallback(async () => {
    if (!pendingImportContent) return;
    setIsImporting(true);
    setError(null);
    try {
      const result = await importData(adapter, pendingImportContent, importMode);
      if (result.success) {
        setImportPreview(null);
        setPendingImportContent(null);
        await loadCurrencies();
        await checkHasData();
        window.alert(
          `Import complete: ${result.imported.accounts} accounts, ${result.imported.transactions} transactions, ${result.imported.categories} categories.`,
        );
      } else {
        setError(result.errors.join('\n'));
        setImportPreview(null);
        setPendingImportContent(null);
      }
    } catch (err) {
      setError(err instanceof AppError ? err.getUserMessage() : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  }, [adapter, pendingImportContent, importMode, loadCurrencies, checkHasData]);

  const handleCancelImport = React.useCallback(() => {
    setImportPreview(null);
    setPendingImportContent(null);
  }, []);

  // F-062: CSV import handlers
  const handleCsvFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      event.target.value = '';
      try {
        const content = await file.text();
        const preview = previewCsv(content);
        if (!preview.isValid) {
          setError(preview.errors.join('\n'));
          return;
        }
        setCsvContent(content);
        setCsvPreview(preview);
        setCsvMapping({ date: preview.headers[0] ?? '' });
        setCsvAmountMode('single');
        // Default account to first available
        const accts = await accountsService.listAccounts();
        setAccounts(accts);
        setCsvAccountId(accts[0]?.id ?? '');
        setCsvDefaultCurrency(currencies.find((c) => c.isPrimary)?.id ?? 'USD');
        setCsvStep(1);
      } catch {
        setError('Failed to read CSV file');
      }
    },
    [accountsService, currencies],
  );

  const handleCsvCancel = React.useCallback(() => {
    setCsvStep(0);
    setCsvContent(null);
    setCsvPreview(null);
    setCsvMapping({ date: '' });
  }, []);

  const handleCsvConfirmImport = React.useCallback(async () => {
    if (!csvContent) return;
    setIsImportingCsv(true);
    setError(null);
    try {
      const result = await importCsv(adapter, csvContent, {
        mapping: csvMapping,
        accountId: csvAccountId,
        defaultCurrency: csvDefaultCurrency,
      });
      handleCsvCancel();
      await checkHasData();
      const msg = `Imported ${result.imported} transaction${result.imported !== 1 ? 's' : ''}, skipped ${result.skipped} duplicate${result.skipped !== 1 ? 's' : ''}.`;
      window.alert(result.errors.length > 0 ? `${msg}\n\nWarnings:\n${result.errors.slice(0, 5).join('\n')}` : msg);
    } catch (err) {
      setError(err instanceof AppError ? err.getUserMessage() : 'CSV import failed');
    } finally {
      setIsImportingCsv(false);
    }
  }, [adapter, csvContent, csvMapping, csvAccountId, csvDefaultCurrency, handleCsvCancel, checkHasData]);

  const primaryCurrency = currencies.find((c) => c.isPrimary);
  const subCurrencies = currencies.filter((c) => !c.isPrimary);

  // Check if we're in development mode
  const isDevelopment = import.meta.env.VITE_ENV === 'development' || import.meta.env.DEV;

  return (
    <div
      className="page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.lg,
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
          Settings
        </h2>
        <p style={{ marginTop: theme.spacing.xs, color: theme.colors.textSecondary }}>
          Finely tune alerts, themes, and syncing preferences.
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

      {/* F-030: Currency Management */}
      <Card
        title="Currencies"
        subtitle="Manage primary currency and exchange rates"
        tone="default"
        footer={
          <div style={{ display: 'flex', gap: theme.spacing.sm }}>
            <Button type="button" variant="primary" onClick={() => setShowAddModal(true)}>
              Add currency
            </Button>
          </div>
        }
      >
        {isLoadingCurrencies ? (
          <p style={{ margin: 0, color: theme.colors.textSecondary }}>Loading currencies...</p>
        ) : (
          <>
            {/* Primary Currency */}
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

            {/* Sub Currencies */}
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
                        <Button type="button" variant="ghost" onClick={() => handleEdit(currency)}>
                          Edit
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => handleSetPrimary(currency)}>
                          Set Primary
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => handleDelete(currency)}>
                          Delete
                        </Button>
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
                  <Button type="button" variant="primary" onClick={() => setShowAddModal(true)}>
                    Add currency
                  </Button>
                }
              />
            )}
          </>
        )}
      </Card>

      <AppearanceCard />

      {/* F-062: JSON Backup */}
      <Card
        title="Backup"
        subtitle="Full backup of all accounts, categories, currencies, and transactions"
        tone="default"
        footer={
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Button
              type="button"
              variant="primary"
              onClick={handleExportJSON}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting…' : 'Export backup (JSON)'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
            >
              Import backup…
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportFileChange}
            />
          </div>
        }
      >
        <p style={{ margin: 0, color: theme.colors.textSecondary }}>
          Export everything to a JSON file for safekeeping or to migrate to another device.
          Importing a backup will let you choose between replacing all data or merging.
        </p>
      </Card>

      {/* F-062: CSV Transactions */}
      <Card
        title="Transactions (CSV)"
        subtitle="Import or export transactions for a single account"
        tone="default"
        footer={
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Button
              type="button"
              variant="primary"
              onClick={handleExportCSV}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting…' : 'Export transactions (CSV)'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => csvFileInputRef.current?.click()}
            >
              Import CSV…
            </Button>
            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleCsvFileChange}
            />
          </div>
        }
      >
        <p style={{ margin: 0, color: theme.colors.textSecondary }}>
          Import transactions from a bank export or spreadsheet. Map CSV columns to transaction
          fields and choose which account they belong to. Duplicates are skipped automatically.
        </p>
      </Card>

      <Card
        title="Data & notifications"
        subtitle="Keep your information safe and timely"
        tone="default"
        footer={
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Button variant="ghost">Manage notifications</Button>
            <Button variant="primary">Sync devices</Button>
          </div>
        }
      >
        <p style={{ margin: 0, color: theme.colors.textSecondary }}>
          Decide how often Cash Mgr. nudges you with updates. Desktop, web, and mobile stay in
          lockstep once syncing is enabled.
        </p>
      </Card>

      {/* Development - Only show in development mode */}
      {isDevelopment && (
        <Card
          title="Development"
          subtitle="Sample data for testing and development"
          tone="default"
          footer={
            <div style={{ display: 'flex', gap: theme.spacing.sm }}>
              <Button
                type="button"
                variant="primary"
                onClick={handleLoadSampleData}
                disabled={isSeeding}
              >
                {isSeeding ? 'Loading...' : 'Load Sample Data'}
              </Button>
              {hasData && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClearSampleData}
                  disabled={isSeeding}
                  style={{
                    backgroundColor: '#fee',
                    borderColor: '#fcc',
                    color: '#c00',
                  }}
                >
                  {isSeeding ? 'Clearing...' : 'Clear All Data'}
                </Button>
              )}
            </div>
          }
        >
          <p style={{ margin: 0, color: theme.colors.textSecondary }}>
            {hasData
              ? 'Load sample data to test features with realistic accounts, categories, and transactions. Sample data includes 4 accounts, 15 categories, and ~93 transactions over 90 days.'
              : 'Your database is empty. Load sample data to get started quickly with 4 accounts, 15 categories, and ~93 transactions.'}
          </p>
        </Card>
      )}

      {/* F-030: Add Currency Modal */}
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
              maxWidth: 600,
              width: '100%',
              margin: theme.spacing.lg,
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <Card title="Add Currency" subtitle="Add a new currency with exchange rate" tone="default">
              <form
                onSubmit={handleAddCurrency}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing.md,
                }}
              >
                {/* Quick Select */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: theme.spacing.xs,
                      fontFamily: theme.fontFamily,
                      fontSize: theme.typography.caption.fontSize,
                      color: theme.colors.textSecondary,
                      fontWeight: 500,
                    }}
                  >
                    Quick Select
                  </label>
                  <div style={{ display: 'flex', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
                    {COMMON_CURRENCIES.map((curr) => (
                      <Button
                        key={curr.id}
                        type="button"
                        variant="ghost"
                        onClick={() => handleSelectCurrency(curr)}
                      >
                        {curr.id}
                      </Button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Currency Code (ISO 4217)"
                  placeholder="e.g., EUR, GBP, JPY"
                  value={currencyId}
                  onChange={(value) => {
                    setCurrencyId(value.toUpperCase());
                    if (errors.id) {
                      validateField('id', { ...getAddFormValues(), id: value.trim().toUpperCase() });
                    }
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
                    if (errors.name) {
                      validateField('name', { ...getAddFormValues(), name: value.trim() });
                    }
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
                    if (errors.symbol) {
                      validateField('symbol', { ...getAddFormValues(), symbol: value.trim() });
                    }
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
                      if (errors.exchangeRate) {
                        validateField('exchangeRate', {
                          ...getAddFormValues(),
                          exchangeRate: value.trim() ? Number(value) : 1.0,
                        });
                      }
                    }}
                    onBlur={() => validateField('exchangeRate', getAddFormValues())}
                    error={errors.exchangeRate}
                  />
                  <div style={{ marginTop: theme.spacing.xs, display: 'flex', gap: theme.spacing.sm }}>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleFetchRate}
                      disabled={isFetchingRate || !currencyId.trim()}
                    >
                      {isFetchingRate ? 'Fetching...' : 'Fetch current rate'}
                    </Button>
                    {rateSource === 'fetched' && (
                      <span style={{ fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary, alignSelf: 'center' }}>
                        ✓ Rate fetched from API
                      </span>
                    )}
                  </div>
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
                  Note: You can fetch the latest exchange rate from the internet or enter it manually.
                </div>

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
                    {isSubmitting ? 'Adding...' : 'Add currency'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* F-030: Edit Currency Modal */}
      {editingCurrency && (
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
              maxWidth: 600,
              width: '100%',
              margin: theme.spacing.lg,
            }}
          >
            <Card title="Edit Currency" subtitle={`Update ${editingCurrency.id} details`} tone="default">
              <form
                onSubmit={handleSaveEdit}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing.md,
                }}
              >
                <Input
                  label="Currency Name"
                  placeholder="e.g., Euro, British Pound"
                  value={editName}
                  onChange={(value) => {
                    setEditName(value);
                    if (editErrors.name) {
                      validateEditField('name', { ...getEditFormValues(), name: value.trim() });
                    }
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
                    if (editErrors.symbol) {
                      validateEditField('symbol', { ...getEditFormValues(), symbol: value.trim() });
                    }
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
                        if (editErrors.exchangeRate) {
                          validateEditField('exchangeRate', {
                            ...getEditFormValues(),
                            exchangeRate: value.trim() ? Number(value) : 1.0,
                          });
                        }
                      }}
                      onBlur={() => validateEditField('exchangeRate', getEditFormValues())}
                      error={editErrors.exchangeRate}
                    />
                    <div style={{ marginTop: theme.spacing.xs, display: 'flex', gap: theme.spacing.sm }}>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleEditFetchRate}
                        disabled={isEditFetchingRate}
                      >
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
                  <div
                    style={{
                      padding: theme.spacing.sm,
                      background: theme.colors.surfaceMuted,
                      borderRadius: theme.components.interactiveRadius,
                      fontSize: theme.typography.caption.fontSize,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    Note: Primary currency exchange rate is always 1.0 and cannot be edited.
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    disabled={isEditSubmitting}
                  >
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

      {/* F-062: CSV import modal */}
      {csvStep > 0 && csvPreview && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={handleCsvCancel}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, width: '100%', margin: theme.spacing.lg, maxHeight: '90vh', overflow: 'auto' }}>
            <Card
              title={csvStep === 1 ? 'Map columns' : csvStep === 2 ? 'Select account' : 'Confirm import'}
              subtitle={csvStep === 1 ? `${csvPreview.totalRows} rows detected` : csvStep === 2 ? 'Choose where transactions go' : 'Review and confirm'}
              tone="default"
            >
              {/* Step 1: Column mapping */}
              {csvStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                  {/* Sample rows preview */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: theme.typography.caption.fontSize }}>
                      <thead>
                        <tr>
                          {csvPreview.headers.map((h) => (
                            <th key={h} style={{ padding: '4px 8px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: theme.colors.textSecondary }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.sampleRows.map((row, i) => (
                          <tr key={i}>
                            {csvPreview.headers.map((h) => (
                              <td key={h} style={{ padding: '4px 8px', borderBottom: `1px solid ${theme.colors.border}` }}>{row[h]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Date column */}
                  <label style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                    <span style={{ fontSize: theme.typography.caption.fontSize, fontWeight: 600, color: theme.colors.textSecondary }}>Date column *</span>
                    <select value={csvMapping.date} onChange={(e) => setCsvMapping((m) => ({ ...m, date: e.target.value }))} style={{ padding: `${theme.spacing.sm}px ${theme.spacing.md}px`, borderRadius: theme.radii.md, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface, color: theme.colors.textPrimary, fontFamily: theme.fontFamily, fontSize: theme.typography.body.fontSize }}>
                      <option value="">— select —</option>
                      {csvPreview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>

                  {/* Amount mode */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                    <span style={{ fontSize: theme.typography.caption.fontSize, fontWeight: 600, color: theme.colors.textSecondary }}>Amount format *</span>
                    <div style={{ display: 'flex', gap: theme.spacing.md }}>
                      {(['single', 'debit_credit'] as const).map((mode) => (
                        <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, cursor: 'pointer' }}>
                          <input type="radio" name="csvAmountMode" value={mode} checked={csvAmountMode === mode} onChange={() => { setCsvAmountMode(mode); setCsvMapping((m) => ({ ...m, amount: undefined, debit: undefined, credit: undefined })); }} />
                          <span>{mode === 'single' ? 'Single signed amount (negative = expense)' : 'Separate debit / credit columns'}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {csvAmountMode === 'single' ? (
                    <label style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                      <span style={{ fontSize: theme.typography.caption.fontSize, fontWeight: 600, color: theme.colors.textSecondary }}>Amount column *</span>
                      <select value={csvMapping.amount ?? ''} onChange={(e) => setCsvMapping((m) => ({ ...m, amount: e.target.value || undefined }))} style={{ padding: `${theme.spacing.sm}px ${theme.spacing.md}px`, borderRadius: theme.radii.md, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface, color: theme.colors.textPrimary, fontFamily: theme.fontFamily, fontSize: theme.typography.body.fontSize }}>
                        <option value="">— select —</option>
                        {csvPreview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </label>
                  ) : (
                    <div style={{ display: 'flex', gap: theme.spacing.md }}>
                      {(['debit', 'credit'] as const).map((col) => (
                        <label key={col} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                          <span style={{ fontSize: theme.typography.caption.fontSize, fontWeight: 600, color: theme.colors.textSecondary }}>{col === 'debit' ? 'Debit column (expense)' : 'Credit column (income)'}</span>
                          <select value={csvMapping[col] ?? ''} onChange={(e) => setCsvMapping((m) => ({ ...m, [col]: e.target.value || undefined }))} style={{ padding: `${theme.spacing.sm}px ${theme.spacing.md}px`, borderRadius: theme.radii.md, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface, color: theme.colors.textPrimary, fontFamily: theme.fontFamily, fontSize: theme.typography.body.fontSize }}>
                            <option value="">— select —</option>
                            {csvPreview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Optional columns */}
                  <div style={{ display: 'flex', gap: theme.spacing.md }}>
                    {(['notes', 'type', 'currency'] as const).map((field) => (
                      <label key={field} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                        <span style={{ fontSize: theme.typography.caption.fontSize, fontWeight: 600, color: theme.colors.textSecondary }}>{field.charAt(0).toUpperCase() + field.slice(1)} (optional)</span>
                        <select value={csvMapping[field] ?? ''} onChange={(e) => setCsvMapping((m) => ({ ...m, [field]: e.target.value || undefined }))} style={{ padding: `${theme.spacing.sm}px ${theme.spacing.md}px`, borderRadius: theme.radii.md, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface, color: theme.colors.textPrimary, fontFamily: theme.fontFamily, fontSize: theme.typography.body.fontSize }}>
                          <option value="">— none —</option>
                          {csvPreview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                    <Button type="button" variant="ghost" onClick={handleCsvCancel}>Cancel</Button>
                    <Button type="button" onClick={() => setCsvStep(2)} disabled={!csvMapping.date || (csvAmountMode === 'single' ? !csvMapping.amount : !csvMapping.debit && !csvMapping.credit)}>Next →</Button>
                  </div>
                </div>
              )}

              {/* Step 2: Account + currency */}
              {csvStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                    <span style={{ fontSize: theme.typography.caption.fontSize, fontWeight: 600, color: theme.colors.textSecondary }}>Account *</span>
                    <select value={csvAccountId} onChange={(e) => setCsvAccountId(e.target.value)} style={{ padding: `${theme.spacing.sm}px ${theme.spacing.md}px`, borderRadius: theme.radii.md, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface, color: theme.colors.textPrimary, fontFamily: theme.fontFamily, fontSize: theme.typography.body.fontSize }}>
                      <option value="">— select account —</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </label>

                  {!csvMapping.currency && (
                    <label style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                      <span style={{ fontSize: theme.typography.caption.fontSize, fontWeight: 600, color: theme.colors.textSecondary }}>Default currency</span>
                      <select value={csvDefaultCurrency} onChange={(e) => setCsvDefaultCurrency(e.target.value)} style={{ padding: `${theme.spacing.sm}px ${theme.spacing.md}px`, borderRadius: theme.radii.md, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface, color: theme.colors.textPrimary, fontFamily: theme.fontFamily, fontSize: theme.typography.body.fontSize }}>
                        {currencies.map((c) => <option key={c.id} value={c.id}>{c.id} — {c.name}</option>)}
                      </select>
                    </label>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                    <Button type="button" variant="ghost" onClick={() => setCsvStep(1)}>← Back</Button>
                    <Button type="button" variant="ghost" onClick={handleCsvCancel}>Cancel</Button>
                    <Button type="button" onClick={() => setCsvStep(3)} disabled={!csvAccountId}>Next →</Button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {csvStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.sm }}>
                    {[
                      { label: 'Rows to process', value: csvPreview.totalRows },
                      { label: 'Account', value: accounts.find((a) => a.id === csvAccountId)?.name ?? csvAccountId },
                      { label: 'Currency', value: csvMapping.currency ? `from CSV` : csvDefaultCurrency },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ padding: theme.spacing.md, background: theme.colors.surfaceMuted, borderRadius: theme.components.interactiveRadius }}>
                        <p style={{ margin: 0, fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary }}>{label}</p>
                        <p style={{ margin: 0, fontWeight: 600 }}>{value}</p>
                      </div>
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary }}>
                    Rows with the same date, amount, and account already in your database will be skipped automatically.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                    <Button type="button" variant="ghost" onClick={() => setCsvStep(2)}>← Back</Button>
                    <Button type="button" variant="ghost" onClick={handleCsvCancel}>Cancel</Button>
                    <Button type="button" onClick={handleCsvConfirmImport} disabled={isImportingCsv}>
                      {isImportingCsv ? 'Importing…' : 'Confirm import'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* F-062: Import preview modal */}
      {importPreview && (
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
          onClick={handleCancelImport}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520, width: '100%', margin: theme.spacing.lg }}
          >
            <Card
              title="Import backup"
              subtitle={
                importPreview.isValid
                  ? 'Review the data below before importing'
                  : 'The backup file has errors'
              }
              tone="default"
            >
              {importPreview.errors.length > 0 && (
                <div
                  style={{
                    padding: theme.spacing.md,
                    backgroundColor: '#fee',
                    border: '1px solid #fcc',
                    borderRadius: theme.components.interactiveRadius,
                    marginBottom: theme.spacing.md,
                  }}
                >
                  {importPreview.errors.map((e, i) => (
                    <p key={i} style={{ margin: 0, fontSize: theme.typography.caption.fontSize, color: '#c00' }}>
                      {e}
                    </p>
                  ))}
                </div>
              )}

              {importPreview.isValid && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
                    {[
                      { label: 'Accounts', count: importPreview.counts.accounts },
                      { label: 'Transactions', count: importPreview.counts.transactions },
                      { label: 'Categories', count: importPreview.counts.categories },
                      { label: 'Currencies', count: importPreview.counts.currencies },
                    ].map(({ label, count }) => (
                      <div
                        key={label}
                        style={{
                          padding: theme.spacing.md,
                          background: theme.colors.surfaceMuted,
                          borderRadius: theme.components.interactiveRadius,
                          textAlign: 'center',
                        }}
                      >
                        <p style={{ margin: 0, fontSize: theme.typography.h3.fontSize, fontWeight: 700 }}>{count}</p>
                        <p style={{ margin: 0, fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary }}>{label}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom: theme.spacing.lg }}>
                    <p style={{ margin: `0 0 ${theme.spacing.sm}px 0`, fontSize: theme.typography.caption.fontSize, fontWeight: 600, color: theme.colors.textSecondary }}>
                      Import mode
                    </p>
                    {(['replace', 'merge'] as ImportMode[]).map((mode) => (
                      <label
                        key={mode}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: theme.spacing.sm,
                          marginBottom: theme.spacing.sm,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value={mode}
                          checked={importMode === mode}
                          onChange={() => setImportMode(mode)}
                          style={{ marginTop: 2 }}
                        />
                        <span>
                          <strong>{mode === 'replace' ? 'Replace all' : 'Merge'}</strong>
                          <span style={{ display: 'block', fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary }}>
                            {mode === 'replace'
                              ? 'Delete all existing data and replace with this backup'
                              : 'Add missing entities; update existing ones only if backup is newer'}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
                <Button type="button" variant="ghost" onClick={handleCancelImport} disabled={isImporting}>
                  Cancel
                </Button>
                {importPreview.isValid && (
                  <Button type="button" onClick={handleConfirmImport} disabled={isImporting}>
                    {isImporting ? 'Importing…' : 'Confirm import'}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
