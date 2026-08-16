import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextStyle,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File as FSFile, Paths } from 'expo-file-system';
import { Theme, useTheme } from '@cashmgr/ui';
import { AppError, exportData, previewCsv, importCsv, Currency } from '@cashmgr/core';
import type { CsvPreviewResult, CsvColumnMapping } from '@cashmgr/core';
import { useCurrenciesService, useAccountsService, useDatabaseAdapter } from '../src/contexts/services-context';

export default function SettingsCsvScreen() {
  const theme = useTheme();
  const adapter = useDatabaseAdapter();
  const accountsService = useAccountsService();
  const currenciesService = useCurrenciesService();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [isExporting, setIsExporting] = React.useState(false);
  const [accounts, setAccounts] = React.useState<{ id: string; name: string; currency: string }[]>([]);
  const [primaryCurrencyId, setPrimaryCurrencyId] = React.useState('USD');

  const [csvStep, setCsvStep] = React.useState<0 | 1 | 2 | 3>(0);
  const [csvContent, setCsvContent] = React.useState<string | null>(null);
  const [csvPreview, setCsvPreview] = React.useState<CsvPreviewResult | null>(null);
  const [csvAmountMode, setCsvAmountMode] = React.useState<'single' | 'debit_credit'>('single');
  const [csvMapping, setCsvMapping] = React.useState<CsvColumnMapping>({ date: '' });
  const [csvAccountId, setCsvAccountId] = React.useState('');
  const [csvDefaultCurrency, setCsvDefaultCurrency] = React.useState('');
  const [isImportingCsv, setIsImportingCsv] = React.useState(false);

  React.useEffect(() => {
    accountsService.listAccounts().then(setAccounts).catch(() => {});
    currenciesService.listCurrencies(true)
      .then((list: Currency[]) => {
        const primary = list.find((c: Currency) => c.isPrimary);
        if (primary) setPrimaryCurrencyId(primary.id);
      })
      .catch(() => {});
  }, [accountsService, currenciesService]);

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
      setCsvDefaultCurrency(primaryCurrencyId);
      setCsvStep(1);
    } catch {
      Alert.alert('Error', 'Failed to read CSV file');
    }
  }, [accountsService, primaryCurrencyId]);

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
      const msg = `Imported ${result.imported} transaction${result.imported !== 1 ? 's' : ''}, skipped ${result.skipped} duplicate${result.skipped !== 1 ? 's' : ''}.`;
      Alert.alert(
        'Import complete',
        result.errors.length > 0 ? `${msg}\n\nWarnings:\n${result.errors.slice(0, 3).join('\n')}` : msg
      );
    } catch (err) {
      const msg = err instanceof AppError ? err.getUserMessage() : 'CSV import failed';
      Alert.alert('Import failed', msg);
    } finally {
      setIsImportingCsv(false);
    }
  }, [adapter, csvContent, csvMapping, csvAccountId, csvDefaultCurrency, handleCsvCancel]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Transactions (CSV)', headerBackTitle: 'Settings' }} />

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
                    <Text style={styles.bodyText}>{csvPreview.totalRows} rows detected</Text>

                    <Text style={styles.sectionLabel}>Date column *</Text>
                    {csvPreview.headers.map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={[styles.modeOption, csvMapping.date === h && styles.modeOptionActive]}
                        onPress={() => setCsvMapping((m) => ({ ...m, date: h }))}
                      >
                        <Text style={[styles.modeText, csvMapping.date === h && styles.modeTextActive]}>{h}</Text>
                      </TouchableOpacity>
                    ))}

                    <Text style={styles.sectionLabel}>Amount format *</Text>
                    {(['single', 'debit_credit'] as const).map((mode) => (
                      <TouchableOpacity
                        key={mode}
                        style={[styles.modeOption, csvAmountMode === mode && styles.modeOptionActive]}
                        onPress={() => {
                          setCsvAmountMode(mode);
                          setCsvMapping((m) => ({ ...m, amount: undefined, debit: undefined, credit: undefined }));
                        }}
                      >
                        <Text style={[styles.modeText, csvAmountMode === mode && styles.modeTextActive]}>
                          {mode === 'single' ? 'Single signed amount (−=expense)' : 'Separate Debit / Credit columns'}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {csvAmountMode === 'single' ? (
                      <>
                        <Text style={styles.sectionLabel}>Amount column *</Text>
                        {csvPreview.headers.map((h) => (
                          <TouchableOpacity
                            key={h}
                            style={[styles.modeOption, csvMapping.amount === h && styles.modeOptionActive]}
                            onPress={() => setCsvMapping((m) => ({ ...m, amount: h }))}
                          >
                            <Text style={[styles.modeText, csvMapping.amount === h && styles.modeTextActive]}>{h}</Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    ) : (
                      <>
                        <Text style={styles.sectionLabel}>Debit column (expense)</Text>
                        {csvPreview.headers.map((h) => (
                          <TouchableOpacity
                            key={h}
                            style={[styles.modeOption, csvMapping.debit === h && styles.modeOptionActive]}
                            onPress={() => setCsvMapping((m) => ({ ...m, debit: h }))}
                          >
                            <Text style={[styles.modeText, csvMapping.debit === h && styles.modeTextActive]}>{h}</Text>
                          </TouchableOpacity>
                        ))}
                        <Text style={styles.sectionLabel}>Credit column (income)</Text>
                        {csvPreview.headers.map((h) => (
                          <TouchableOpacity
                            key={h}
                            style={[styles.modeOption, csvMapping.credit === h && styles.modeOptionActive]}
                            onPress={() => setCsvMapping((m) => ({ ...m, credit: h }))}
                          >
                            <Text style={[styles.modeText, csvMapping.credit === h && styles.modeTextActive]}>{h}</Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}

                    <Text style={styles.sectionLabel}>Notes column (optional)</Text>
                    <TouchableOpacity
                      style={[styles.modeOption, !csvMapping.notes && styles.modeOptionActive]}
                      onPress={() => setCsvMapping((m) => ({ ...m, notes: undefined }))}
                    >
                      <Text style={[styles.modeText, !csvMapping.notes && styles.modeTextActive]}>— none —</Text>
                    </TouchableOpacity>
                    {csvPreview.headers.map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={[styles.modeOption, csvMapping.notes === h && styles.modeOptionActive]}
                        onPress={() => setCsvMapping((m) => ({ ...m, notes: h }))}
                      >
                        <Text style={[styles.modeText, csvMapping.notes === h && styles.modeTextActive]}>{h}</Text>
                      </TouchableOpacity>
                    ))}

                    <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
                      <TouchableOpacity style={[styles.cancelButton, { flex: 1 }]} onPress={handleCsvCancel}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.confirmButton,
                          { flex: 1 },
                          (!csvMapping.date || (csvAmountMode === 'single' ? !csvMapping.amount : !csvMapping.debit && !csvMapping.credit)) && styles.buttonDisabled,
                        ]}
                        onPress={() => setCsvStep(2)}
                        disabled={!csvMapping.date || (csvAmountMode === 'single' ? !csvMapping.amount : !csvMapping.debit && !csvMapping.credit)}
                      >
                        <Text style={styles.confirmButtonText}>Next →</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Step 2: Account + currency */}
                {csvStep === 2 && (
                  <View style={{ gap: theme.spacing.md }}>
                    <Text style={styles.sectionLabel}>Account *</Text>
                    {accounts.map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        style={[styles.modeOption, csvAccountId === a.id && styles.modeOptionActive]}
                        onPress={() => setCsvAccountId(a.id)}
                      >
                        <Text style={[styles.modeText, csvAccountId === a.id && styles.modeTextActive]}>{a.name}</Text>
                      </TouchableOpacity>
                    ))}

                    {!csvMapping.currency && (
                      <>
                        <Text style={styles.sectionLabel}>Default currency</Text>
                        {[primaryCurrencyId].map((id) => (
                          <TouchableOpacity
                            key={id}
                            style={[styles.modeOption, csvDefaultCurrency === id && styles.modeOptionActive]}
                            onPress={() => setCsvDefaultCurrency(id)}
                          >
                            <Text style={[styles.modeText, csvDefaultCurrency === id && styles.modeTextActive]}>{id}</Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}

                    <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
                      <TouchableOpacity style={[styles.cancelButton, { flex: 1 }]} onPress={() => setCsvStep(1)}>
                        <Text style={styles.cancelButtonText}>← Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.confirmButton, { flex: 1 }, !csvAccountId && styles.buttonDisabled]}
                        onPress={() => setCsvStep(3)}
                        disabled={!csvAccountId}
                      >
                        <Text style={styles.confirmButtonText}>Next →</Text>
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
                      <View
                        key={label}
                        style={{ padding: theme.spacing.md, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md }}
                      >
                        <Text style={[styles.bodyText, { fontSize: 11 }]}>{label}</Text>
                        <Text style={styles.confirmValue}>{value}</Text>
                      </View>
                    ))}
                    <Text style={styles.bodyText}>
                      Rows matching an existing transaction (same date, amount, and account) will be skipped automatically.
                    </Text>
                    <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
                      <TouchableOpacity style={[styles.cancelButton, { flex: 1 }]} onPress={() => setCsvStep(2)}>
                        <Text style={styles.cancelButtonText}>← Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.confirmButton, { flex: 1 }, isImportingCsv && styles.buttonDisabled]}
                        onPress={handleCsvConfirmImport}
                        disabled={isImportingCsv}
                      >
                        <Text style={styles.confirmButtonText}>{isImportingCsv ? 'Importing…' : 'Confirm'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Import transactions from a bank export or spreadsheet. Map CSV columns to transaction fields
          and choose which account they belong to. Duplicates are skipped automatically.
        </Text>
        <View style={{ gap: theme.spacing.sm }}>
          <TouchableOpacity
            style={[styles.primaryButton, isExporting && styles.buttonDisabled]}
            onPress={handleExportCsv}
            disabled={isExporting}
          >
            <Text style={styles.primaryButtonText}>
              {isExporting ? 'Exporting...' : 'Export Transactions (CSV)'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleCsvImportPick}>
            <Text style={styles.secondaryButtonText}>Import CSV</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const fontWeight = (weight: number): TextStyle['fontWeight'] => `${weight}` as TextStyle['fontWeight'];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg, gap: theme.spacing.lg },
    description: { color: theme.colors.textSecondary, lineHeight: 20 },
    sectionLabel: {
      fontSize: theme.typography.caption.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.md,
      alignItems: 'center',
    },
    primaryButtonText: { color: '#ffffff', fontSize: theme.typography.body.fontSize, fontWeight: fontWeight(600) },
    secondaryButton: {
      backgroundColor: theme.colors.surfaceMuted,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
    },
    buttonDisabled: { opacity: 0.5 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
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
    bodyText: { color: theme.colors.textSecondary, lineHeight: 20 },
    confirmValue: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(600),
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
    modeText: { fontSize: theme.typography.body.fontSize, fontWeight: fontWeight(500), color: theme.colors.textSecondary },
    modeTextActive: { color: '#ffffff' },
    cancelButton: {
      backgroundColor: '#fee',
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#fcc',
    },
    cancelButtonText: { color: '#c00', fontSize: theme.typography.body.fontSize, fontWeight: fontWeight(600) },
    confirmButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.md,
      alignItems: 'center',
    },
    confirmButtonText: { color: '#ffffff', fontSize: theme.typography.body.fontSize, fontWeight: fontWeight(600) },
  });
