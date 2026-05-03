import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextStyle,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File as FSFile, Paths } from 'expo-file-system';
import { Theme, useTheme, AccentColor } from '@cashmgr/ui';
import { Currency, AppError, ErrorHandler, exportData, previewImport, importData, previewCsv, importCsv } from '@cashmgr/core';
import type { ImportPreview, ImportMode, CsvPreviewResult, CsvColumnMapping } from '@cashmgr/core';
import { useCurrenciesService, useAccountsService, useDatabaseAdapter } from '../../src/contexts/services-context';
import { useThemePreference, ThemePreference } from '../../src/contexts/theme-context';
import { seedMobileDatabase, clearMobileSeedData, hasMobileData } from '../../src/database/mobile-seed';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const ACCENT_OPTIONS: { value: AccentColor; label: string; color: string }[] = [
  { value: 'teal', label: 'Teal', color: '#2f7d68' },
  { value: 'indigo', label: 'Indigo', color: '#4f46e5' },
  { value: 'slate', label: 'Slate', color: '#475569' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const currenciesService = useCurrenciesService();
  const adapter = useDatabaseAdapter();
  const accountsService = useAccountsService();
  const { preference, setPreference, accent, setAccent } = useThemePreference();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [currencies, setCurrencies] = React.useState<Currency[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isSeeding, setIsSeeding] = React.useState(false);
  const [hasData, setHasData] = React.useState(false);

  // Accounts for CSV import
  const [accounts, setAccounts] = React.useState<{ id: string; name: string; currency: string }[]>([]);
  React.useEffect(() => {
    accountsService.listAccounts().then(setAccounts).catch(() => {});
  }, [accountsService]);

  // F-062: Export/Import state
  const [isExporting, setIsExporting] = React.useState(false);
  const [importPreview, setImportPreview] = React.useState<ImportPreview | null>(null);
  const [pendingImportContent, setPendingImportContent] = React.useState<string | null>(null);
  const [importMode, setImportMode] = React.useState<ImportMode>('replace');
  const [isImporting, setIsImporting] = React.useState(false);

  // F-062: CSV import state
  const [csvStep, setCsvStep] = React.useState<0 | 1 | 2 | 3>(0);
  const [csvContent, setCsvContent] = React.useState<string | null>(null);
  const [csvPreview, setCsvPreview] = React.useState<CsvPreviewResult | null>(null);
  const [csvAmountMode, setCsvAmountMode] = React.useState<'single' | 'debit_credit'>('single');
  const [csvMapping, setCsvMapping] = React.useState<CsvColumnMapping>({ date: '' });
  const [csvAccountId, setCsvAccountId] = React.useState('');
  const [csvDefaultCurrency, setCsvDefaultCurrency] = React.useState('');
  const [isImportingCsv, setIsImportingCsv] = React.useState(false);

  const loadCurrencies = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await currenciesService.listCurrencies(true); // activeOnly
      setCurrencies(data);
    } catch (err) {
      const errorMessage =
        err instanceof AppError ? err.getUserMessage() : 'Failed to load currencies';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currenciesService]);

  React.useEffect(() => {
    void loadCurrencies();
  }, [loadCurrencies]);

  const checkHasData = React.useCallback(async () => {
    try {
      const result = await hasMobileData();
      setHasData(result);
    } catch (err) {
      ErrorHandler.handle(err, 'Settings.checkHasData');
    }
  }, []);

  React.useEffect(() => {
    void checkHasData();
  }, [checkHasData]);

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      void loadCurrencies();
    }, [loadCurrencies])
  );

  const handleDelete = React.useCallback(
    async (currency: Currency) => {
      Alert.alert(
        'Delete Currency',
        `Are you sure you want to delete "${currency.name}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await currenciesService.deleteCurrency(currency.id);
                await loadCurrencies();
              } catch (err) {
                const errorMessage =
                  err instanceof AppError ? err.getUserMessage() : 'Failed to delete currency';
                Alert.alert('Error', errorMessage);
              }
            },
          },
        ]
      );
    },
    [currenciesService, loadCurrencies]
  );

  const handleSetPrimary = React.useCallback(
    async (currency: Currency) => {
      Alert.alert(
        'Set Primary Currency',
        `Set "${currency.name}" as your primary currency? All exchange rates will be recalculated.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Set Primary',
            onPress: async () => {
              try {
                await currenciesService.setPrimaryCurrency(currency.id);
                await loadCurrencies();
              } catch (err) {
                const errorMessage =
                  err instanceof AppError ? err.getUserMessage() : 'Failed to set primary currency';
                Alert.alert('Error', errorMessage);
              }
            },
          },
        ]
      );
    },
    [currenciesService, loadCurrencies]
  );

  const handleLongPress = React.useCallback(
    (currency: Currency) => {
      const options: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }> = [
        {
          text: 'Edit',
          onPress: () => router.push(`/edit-currency?id=${currency.id}`),
        },
      ];

      if (!currency.isPrimary) {
        options.push({
          text: 'Set as Primary',
          onPress: () => handleSetPrimary(currency),
        });
        options.push({
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(currency),
        });
      }

      options.push({ text: 'Cancel', style: 'cancel' });

      Alert.alert('Currency Actions', `What would you like to do with "${currency.name}"?`, options);
    },
    [router, handleSetPrimary, handleDelete]
  );

  const handleLoadSampleData = React.useCallback(async () => {
    Alert.alert(
      'Load Sample Data',
      'This will add 4 accounts, 15 categories, and ~93 transactions to your database. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load Data',
          onPress: async () => {
            setIsSeeding(true);
            setError(null);
            try {
              await seedMobileDatabase();
              await checkHasData();
              await loadCurrencies();
              Alert.alert('Success', 'Sample data loaded successfully!');
            } catch (err) {
              const errorMessage =
                err instanceof AppError ? err.getUserMessage() : 'Failed to load sample data';
              setError(errorMessage);
              Alert.alert('Error', errorMessage);
            } finally {
              setIsSeeding(false);
            }
          },
        },
      ]
    );
  }, [checkHasData, loadCurrencies]);

  const handleClearSampleData = React.useCallback(async () => {
    Alert.alert(
      'Clear Sample Data',
      'This will delete ALL accounts, categories, and transactions from your database. This action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            setIsSeeding(true);
            setError(null);
            try {
              await clearMobileSeedData();
              await checkHasData();
              await loadCurrencies();
              Alert.alert('Success', 'All data cleared successfully!');
            } catch (err) {
              const errorMessage =
                err instanceof AppError ? err.getUserMessage() : 'Failed to clear data';
              setError(errorMessage);
              Alert.alert('Error', errorMessage);
            } finally {
              setIsSeeding(false);
            }
          },
        },
      ]
    );
  }, [checkHasData, loadCurrencies]);

  // F-062: Export handlers
  const handleExport = React.useCallback(async () => {
    setIsExporting(true);
    try {
      const result = await exportData(adapter, { format: 'json', platform: 'ios' });
      const file = new FSFile(Paths.cache, result.filename);
      file.write(result.content);
      await Sharing.shareAsync(file.uri, { mimeType: result.mimeType, dialogTitle: 'Save backup' });
    } catch (err) {
      const msg = err instanceof AppError ? err.getUserMessage() : 'Export failed';
      Alert.alert('Export failed', msg);
    } finally {
      setIsExporting(false);
    }
  }, [adapter]);

  const handleExportCsv = React.useCallback(async () => {
    setIsExporting(true);
    try {
      const result = await exportData(adapter, { format: 'csv', platform: 'ios' });
      const file = new FSFile(Paths.cache, result.filename);
      file.write(result.content);
      await Sharing.shareAsync(file.uri, { mimeType: result.mimeType, dialogTitle: 'Save CSV' });
    } catch (err) {
      const msg = err instanceof AppError ? err.getUserMessage() : 'Export failed';
      Alert.alert('Export failed', msg);
    } finally {
      setIsExporting(false);
    }
  }, [adapter]);

  const handleImportPick = React.useCallback(async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets?.[0]) return;
      const content = await new FSFile(picked.assets[0].uri).text();
      const preview = previewImport(content);
      setPendingImportContent(content);
      setImportPreview(preview);
      setImportMode('replace');
    } catch {
      Alert.alert('Error', 'Failed to read file');
    }
  }, []);

  const handleConfirmImport = React.useCallback(async () => {
    if (!pendingImportContent) return;
    setIsImporting(true);
    try {
      const result = await importData(adapter, pendingImportContent, importMode);
      setImportPreview(null);
      setPendingImportContent(null);
      if (result.success) {
        await loadCurrencies();
        await checkHasData();
        Alert.alert('Import complete', `Imported: ${result.imported.accounts} accounts, ${result.imported.transactions} transactions, ${result.imported.categories} categories.`);
      } else {
        Alert.alert('Import failed', result.errors.join('\n'));
      }
    } catch (err) {
      const msg = err instanceof AppError ? err.getUserMessage() : 'Import failed';
      Alert.alert('Import failed', msg);
    } finally {
      setIsImporting(false);
    }
  }, [adapter, pendingImportContent, importMode, loadCurrencies, checkHasData]);

  const handleCancelImport = React.useCallback(() => {
    setImportPreview(null);
    setPendingImportContent(null);
  }, []);

  // F-062: CSV import handlers
  const handleCsvImportPick = React.useCallback(async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets?.[0]) return;
      const content = await new FSFile(picked.assets[0].uri).text();
      const preview = previewCsv(content);
      if (!preview.isValid) {
        Alert.alert('Invalid file', preview.errors.join('\n'));
        return;
      }
      const accts = await accountsService.listAccounts();
      setAccounts(accts);
      setCsvContent(content);
      setCsvPreview(preview);
      setCsvMapping({ date: preview.headers[0] ?? '' });
      setCsvAmountMode('single');
      setCsvAccountId(accts[0]?.id ?? '');
      setCsvDefaultCurrency(currencies.find((c) => c.isPrimary)?.id ?? 'USD');
      setCsvStep(1);
    } catch {
      Alert.alert('Error', 'Failed to read CSV file');
    }
  }, [accountsService, currencies]);

  const handleCsvCancel = React.useCallback(() => {
    setCsvStep(0);
    setCsvContent(null);
    setCsvPreview(null);
    setCsvMapping({ date: '' });
  }, []);

  const handleCsvConfirmImport = React.useCallback(async () => {
    if (!csvContent) return;
    setIsImportingCsv(true);
    try {
      const result = await importCsv(adapter, csvContent, {
        mapping: csvMapping,
        accountId: csvAccountId,
        defaultCurrency: csvDefaultCurrency,
      });
      handleCsvCancel();
      await checkHasData();
      const msg = `Imported ${result.imported} transaction${result.imported !== 1 ? 's' : ''}, skipped ${result.skipped} duplicate${result.skipped !== 1 ? 's' : ''}.`;
      Alert.alert('Import complete', result.errors.length > 0 ? `${msg}\n\nWarnings:\n${result.errors.slice(0, 3).join('\n')}` : msg);
    } catch (err) {
      const msg = err instanceof AppError ? err.getUserMessage() : 'CSV import failed';
      Alert.alert('Import failed', msg);
    } finally {
      setIsImportingCsv(false);
    }
  }, [adapter, csvContent, csvMapping, csvAccountId, csvDefaultCurrency, handleCsvCancel, checkHasData]);

  const primaryCurrency = currencies.find((c) => c.isPrimary);
  const subCurrencies = currencies.filter((c) => !c.isPrimary);

  // Check if we're in development mode
  // Use __DEV__ (React Native built-in) or EXPO_PUBLIC_ENV environment variable
  const isDevelopment = __DEV__ || process.env.EXPO_PUBLIC_ENV === 'development';

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/add-currency')}
      >
        <Text style={styles.addButtonText}>Add Currency</Text>
      </TouchableOpacity>

      {/* CSV Import Modal */}
      <Modal
        visible={csvStep > 0 && csvPreview !== null}
        animationType="slide"
        transparent
        onRequestClose={handleCsvCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>
              {csvStep === 1 ? 'Map Columns' : csvStep === 2 ? 'Select Account' : 'Confirm Import'}
            </Text>
            {csvPreview && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Step 1: Column mapping */}
                {csvStep === 1 && (
                  <View style={{ gap: theme.spacing.md }}>
                    <Text style={styles.text}>{csvPreview.totalRows} rows detected</Text>

                    <Text style={styles.sectionTitle}>Date column *</Text>
                    {csvPreview.headers.map((h) => (
                      <TouchableOpacity key={h} style={[styles.modeOption, csvMapping.date === h && styles.modeOptionActive]} onPress={() => setCsvMapping((m) => ({ ...m, date: h }))}>
                        <Text style={[styles.themeOptionText, csvMapping.date === h && styles.themeOptionTextActive]}>{h}</Text>
                      </TouchableOpacity>
                    ))}

                    <Text style={styles.sectionTitle}>Amount format *</Text>
                    {(['single', 'debit_credit'] as const).map((mode) => (
                      <TouchableOpacity key={mode} style={[styles.modeOption, csvAmountMode === mode && styles.modeOptionActive]} onPress={() => { setCsvAmountMode(mode); setCsvMapping((m) => ({ ...m, amount: undefined, debit: undefined, credit: undefined })); }}>
                        <Text style={[styles.themeOptionText, csvAmountMode === mode && styles.themeOptionTextActive]}>
                          {mode === 'single' ? 'Single signed amount (−=expense)' : 'Separate Debit / Credit columns'}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {csvAmountMode === 'single' ? (
                      <>
                        <Text style={styles.sectionTitle}>Amount column *</Text>
                        {csvPreview.headers.map((h) => (
                          <TouchableOpacity key={h} style={[styles.modeOption, csvMapping.amount === h && styles.modeOptionActive]} onPress={() => setCsvMapping((m) => ({ ...m, amount: h }))}>
                            <Text style={[styles.themeOptionText, csvMapping.amount === h && styles.themeOptionTextActive]}>{h}</Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    ) : (
                      <>
                        <Text style={styles.sectionTitle}>Debit column (expense)</Text>
                        {csvPreview.headers.map((h) => (
                          <TouchableOpacity key={h} style={[styles.modeOption, csvMapping.debit === h && styles.modeOptionActive]} onPress={() => setCsvMapping((m) => ({ ...m, debit: h }))}>
                            <Text style={[styles.themeOptionText, csvMapping.debit === h && styles.themeOptionTextActive]}>{h}</Text>
                          </TouchableOpacity>
                        ))}
                        <Text style={styles.sectionTitle}>Credit column (income)</Text>
                        {csvPreview.headers.map((h) => (
                          <TouchableOpacity key={h} style={[styles.modeOption, csvMapping.credit === h && styles.modeOptionActive]} onPress={() => setCsvMapping((m) => ({ ...m, credit: h }))}>
                            <Text style={[styles.themeOptionText, csvMapping.credit === h && styles.themeOptionTextActive]}>{h}</Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}

                    <Text style={styles.sectionTitle}>Notes column (optional)</Text>
                    <TouchableOpacity style={[styles.modeOption, !csvMapping.notes && styles.modeOptionActive]} onPress={() => setCsvMapping((m) => ({ ...m, notes: undefined }))}>
                      <Text style={[styles.themeOptionText, !csvMapping.notes && styles.themeOptionTextActive]}>— none —</Text>
                    </TouchableOpacity>
                    {csvPreview.headers.map((h) => (
                      <TouchableOpacity key={h} style={[styles.modeOption, csvMapping.notes === h && styles.modeOptionActive]} onPress={() => setCsvMapping((m) => ({ ...m, notes: h }))}>
                        <Text style={[styles.themeOptionText, csvMapping.notes === h && styles.themeOptionTextActive]}>{h}</Text>
                      </TouchableOpacity>
                    ))}

                    <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
                      <TouchableOpacity style={[styles.clearButton, { flex: 1 }]} onPress={handleCsvCancel}>
                        <Text style={styles.clearButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.seedButton, { flex: 1 }, (!csvMapping.date || (csvAmountMode === 'single' ? !csvMapping.amount : !csvMapping.debit && !csvMapping.credit)) && styles.seedButtonDisabled]}
                        onPress={() => setCsvStep(2)}
                        disabled={!csvMapping.date || (csvAmountMode === 'single' ? !csvMapping.amount : !csvMapping.debit && !csvMapping.credit)}
                      >
                        <Text style={styles.seedButtonText}>Next →</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Step 2: Account + currency */}
                {csvStep === 2 && (
                  <View style={{ gap: theme.spacing.md }}>
                    <Text style={styles.sectionTitle}>Account *</Text>
                    {accounts.map((a) => (
                      <TouchableOpacity key={a.id} style={[styles.modeOption, csvAccountId === a.id && styles.modeOptionActive]} onPress={() => setCsvAccountId(a.id)}>
                        <Text style={[styles.themeOptionText, csvAccountId === a.id && styles.themeOptionTextActive]}>{a.name}</Text>
                      </TouchableOpacity>
                    ))}

                    {!csvMapping.currency && (
                      <>
                        <Text style={styles.sectionTitle}>Default currency</Text>
                        {currencies.map((c) => (
                          <TouchableOpacity key={c.id} style={[styles.modeOption, csvDefaultCurrency === c.id && styles.modeOptionActive]} onPress={() => setCsvDefaultCurrency(c.id)}>
                            <Text style={[styles.themeOptionText, csvDefaultCurrency === c.id && styles.themeOptionTextActive]}>{c.id} — {c.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}

                    <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
                      <TouchableOpacity style={[styles.clearButton, { flex: 1 }]} onPress={() => setCsvStep(1)}>
                        <Text style={styles.clearButtonText}>← Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.seedButton, { flex: 1 }, !csvAccountId && styles.seedButtonDisabled]}
                        onPress={() => setCsvStep(3)}
                        disabled={!csvAccountId}
                      >
                        <Text style={styles.seedButtonText}>Next →</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Step 3: Confirm */}
                {csvStep === 3 && (
                  <View style={{ gap: theme.spacing.md }}>
                    {[
                      { label: 'Rows to process', value: String(csvPreview.totalRows) },
                      { label: 'Account', value: accounts.find((a) => a.id === csvAccountId)?.name ?? csvAccountId },
                      { label: 'Currency', value: csvMapping.currency ? 'from CSV' : csvDefaultCurrency },
                    ].map(({ label, value }) => (
                      <View key={label} style={{ padding: theme.spacing.md, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md }}>
                        <Text style={[styles.text, { fontSize: 11 }]}>{label}</Text>
                        <Text style={[styles.currencyName]}>{value}</Text>
                      </View>
                    ))}
                    <Text style={styles.text}>
                      Rows matching an existing transaction (same date, amount, and account) will be skipped automatically.
                    </Text>
                    <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
                      <TouchableOpacity style={[styles.clearButton, { flex: 1 }]} onPress={() => setCsvStep(2)}>
                        <Text style={styles.clearButtonText}>← Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.seedButton, { flex: 1 }, isImportingCsv && styles.seedButtonDisabled]}
                        onPress={handleCsvConfirmImport}
                        disabled={isImportingCsv}
                      >
                        <Text style={styles.seedButtonText}>{isImportingCsv ? 'Importing…' : 'Confirm'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Import Preview Modal */}
      <Modal
        visible={importPreview !== null}
        animationType="slide"
        transparent
        onRequestClose={handleCancelImport}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Import Preview</Text>
            {importPreview && (
              <>
                {!importPreview.isValid ? (
                  <>
                    <Text style={[styles.text, { color: '#c00' }]}>Invalid file:</Text>
                    {importPreview.errors.map((e: string, i: number) => (
                      <Text key={i} style={[styles.text, { color: '#c00' }]}>{e}</Text>
                    ))}
                  </>
                ) : (
                  <>
                    <Text style={styles.text}>
                      {importPreview.counts.accounts} accounts · {importPreview.counts.transactions} transactions · {importPreview.counts.categories} categories · {importPreview.counts.currencies} currencies
                    </Text>
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Import mode</Text>
                      {(['replace', 'merge'] as const).map((mode) => (
                        <TouchableOpacity
                          key={mode}
                          style={[styles.modeOption, importMode === mode && styles.modeOptionActive]}
                          onPress={() => setImportMode(mode)}
                        >
                          <Text style={[styles.themeOptionText, importMode === mode && styles.themeOptionTextActive]}>
                            {mode === 'replace' ? 'Replace (overwrite all)' : 'Merge (keep existing)'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
                <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
                  <TouchableOpacity style={[styles.clearButton, { flex: 1 }]} onPress={handleCancelImport}>
                    <Text style={styles.clearButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  {importPreview.isValid && (
                    <TouchableOpacity
                      style={[styles.seedButton, { flex: 1 }, isImporting && styles.seedButtonDisabled]}
                      onPress={handleConfirmImport}
                      disabled={isImporting}
                    >
                      <Text style={styles.seedButtonText}>{isImporting ? 'Importing...' : 'Confirm'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Currencies Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Currencies</Text>
          <Text style={styles.cardSubtitle}>Manage primary currency and exchange rates</Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading currencies...</Text>
            </View>
          ) : (
            <>
              {/* Primary Currency */}
              {primaryCurrency && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Primary Currency</Text>
                  <View style={styles.currencyItem}>
                    <View style={styles.currencyInfo}>
                      <Text style={styles.currencyName}>
                        {primaryCurrency.name} ({primaryCurrency.id})
                      </Text>
                      <Text style={styles.currencySubtitle}>Base currency for all conversions</Text>
                    </View>
                    <View style={styles.currencyRight}>
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>Primary</Text>
                      </View>
                      <Text style={styles.currencySymbol}>{primaryCurrency.symbol}</Text>
                      <TouchableOpacity
                        style={styles.moreButton}
                        onPress={() => handleLongPress(primaryCurrency)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={styles.moreButtonText}>⋯</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* Sub Currencies */}
              {subCurrencies.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Sub Currencies</Text>
                  {subCurrencies.map((currency) => (
                    <View key={currency.id} style={styles.currencyItem}>
                      <View style={styles.currencyInfo}>
                        <Text style={styles.currencyName}>
                          {currency.name} ({currency.id})
                        </Text>
                        <Text style={styles.currencySubtitle}>
                          1 {primaryCurrency?.id} = {currency.exchangeRate} {currency.id}
                        </Text>
                      </View>
                      <View style={styles.currencyRight}>
                        <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                        <TouchableOpacity
                          style={styles.moreButton}
                          onPress={() => handleLongPress(currency)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Text style={styles.moreButtonText}>⋯</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {!primaryCurrency && subCurrencies.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No currencies configured</Text>
                  <Text style={styles.emptyText}>
                    Add a primary currency to get started with multi-currency support.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => router.push('/add-currency')}
                  >
                    <Text style={styles.emptyButtonText}>Add currency</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

        {/* Appearance Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appearance</Text>
          <Text style={styles.cardSubtitle}>Theme & display preferences</Text>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Theme</Text>
            <View style={styles.themeToggleContainer}>
              {THEME_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.themeOption,
                    preference === option.value && styles.themeOptionActive,
                  ]}
                  onPress={() => setPreference(option.value)}
                >
                  <Text
                    style={[
                      styles.themeOptionText,
                      preference === option.value && styles.themeOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accent color</Text>
            <View style={styles.themeToggleContainer}>
              {ACCENT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.accentOption,
                    accent === option.value && {
                      borderColor: option.color,
                      backgroundColor: theme.colors.primarySoft,
                    },
                  ]}
                  onPress={() => setAccent(option.value)}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      backgroundColor: option.color,
                    }}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      accent === option.value && { color: theme.colors.textPrimary },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Data & Notifications Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data & notifications</Text>
          <Text style={styles.cardSubtitle}>Keep your information safe and timely</Text>
          <Text style={styles.text}>
            Decide how often Cash Mgr. nudges you with updates. Desktop, web, and mobile stay in
            lockstep once syncing is enabled.
          </Text>
        </View>

        {/* Backup Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Backup</Text>
          <Text style={styles.cardSubtitle}>Full backup of all accounts, categories, currencies, and transactions</Text>
          <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            <TouchableOpacity
              style={[styles.seedButton, isExporting && styles.seedButtonDisabled]}
              onPress={handleExport}
              disabled={isExporting}
            >
              <Text style={styles.seedButtonText}>
                {isExporting ? 'Exporting...' : 'Export Backup (JSON)'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.importButton}
              onPress={handleImportPick}
            >
              <Text style={styles.importButtonText}>Import Backup</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transactions CSV Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Transactions (CSV)</Text>
          <Text style={styles.cardSubtitle}>Import transactions from a bank export or spreadsheet</Text>
          <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            <TouchableOpacity
              style={[styles.seedButton, isExporting && styles.seedButtonDisabled]}
              onPress={handleExportCsv}
              disabled={isExporting}
            >
              <Text style={styles.seedButtonText}>
                {isExporting ? 'Exporting...' : 'Export Transactions (CSV)'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.importButton}
              onPress={handleCsvImportPick}
            >
              <Text style={styles.importButtonText}>Import CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Development Card - Only show in development mode */}
        {isDevelopment && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Development</Text>
            <Text style={styles.cardSubtitle}>Sample data for testing and development</Text>
            <View style={styles.section}>
              <Text style={styles.text}>
                {hasData
                  ? 'Load sample data to test features with realistic accounts, categories, and transactions.'
                  : 'Your database is empty. Load sample data to get started quickly.'}
              </Text>
              <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                <TouchableOpacity
                  style={[styles.seedButton, isSeeding && styles.seedButtonDisabled]}
                  onPress={handleLoadSampleData}
                  disabled={isSeeding}
                >
                  <Text style={styles.seedButtonText}>
                    {isSeeding ? 'Loading...' : 'Load Sample Data'}
                  </Text>
                </TouchableOpacity>
                {hasData && (
                  <TouchableOpacity
                    style={[styles.clearButton, isSeeding && styles.seedButtonDisabled]}
                    onPress={handleClearSampleData}
                    disabled={isSeeding}
                  >
                    <Text style={styles.clearButtonText}>
                      {isSeeding ? 'Clearing...' : 'Clear All Data'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            Tip: Tap the "⋯" button on any currency to edit, delete, or set as primary.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const fontWeight = (weight: number): TextStyle['fontWeight'] =>
  `${weight}` as TextStyle['fontWeight'];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      paddingTop: 0,
    },
    addButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      margin: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    addButtonText: {
      color: '#ffffff',
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
    },
    errorBanner: {
      backgroundColor: '#fee',
      padding: theme.spacing.md,
      margin: theme.spacing.lg,
      marginBottom: 0,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: '#fcc',
    },
    errorText: {
      color: '#c00',
      fontWeight: fontWeight(500),
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.md,
    },
    cardTitle: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: fontWeight(theme.typography.h3.fontWeight),
      color: theme.colors.textPrimary,
    },
    cardSubtitle: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
      marginTop: -theme.spacing.xs,
    },
    text: {
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
    },
    loadingText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.body.fontSize,
    },
    section: {
      gap: theme.spacing.xs,
    },
    sectionTitle: {
      fontSize: theme.typography.caption.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    currencyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    currencyInfo: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    currencyName: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
    },
    currencySubtitle: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
    },
    currencyRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    currencySymbol: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
    },
    primaryBadge: {
      backgroundColor: theme.colors.primarySoft,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.radii.sm,
    },
    primaryBadgeText: {
      color: theme.colors.primary,
      fontSize: theme.typography.caption.fontSize,
      fontWeight: fontWeight(600),
    },
    moreButton: {
      padding: theme.spacing.xs,
      marginLeft: theme.spacing.xs,
    },
    moreButtonText: {
      fontSize: 24,
      color: theme.colors.textSecondary,
      fontWeight: fontWeight(700),
      lineHeight: 24,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    emptyTitle: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: fontWeight(theme.typography.h3.fontWeight),
      color: theme.colors.textPrimary,
    },
    emptyText: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    emptyButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radii.md,
      marginTop: theme.spacing.sm,
    },
    emptyButtonText: {
      color: '#ffffff',
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    settingLabel: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(500),
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    settingValue: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
    },
    liveBadge: {
      backgroundColor: '#d4edda',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.radii.sm,
    },
    liveBadgeText: {
      color: '#155724',
      fontSize: theme.typography.caption.fontSize,
      fontWeight: fontWeight(600),
    },
    noteCard: {
      backgroundColor: theme.colors.surfaceMuted || theme.colors.surface,
      borderRadius: theme.radii.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    noteText: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
      lineHeight: 18,
      textAlign: 'center',
    },
    themeToggleContainer: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    themeOption: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    accentOption: {
      flex: 1,
      flexDirection: 'row',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    themeOptionActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    themeOptionText: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(500),
      color: theme.colors.textSecondary,
    },
    themeOptionTextActive: {
      color: '#ffffff',
    },
    seedButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.md,
      alignItems: 'center',
    },
    seedButtonDisabled: {
      opacity: 0.5,
    },
    seedButtonText: {
      color: '#ffffff',
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
    },
    clearButton: {
      backgroundColor: '#fee',
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#fcc',
    },
    clearButtonText: {
      color: '#c00',
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
    },
    importButton: {
      backgroundColor: theme.colors.surfaceMuted,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.md,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    importButtonText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end' as const,
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.radii.lg,
      borderTopRightRadius: theme.radii.lg,
      padding: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    modalTitle: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: fontWeight(theme.typography.h3.fontWeight),
      color: theme.colors.textPrimary,
    },
    modeOption: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modeOptionActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
  });
