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
import { AppError, exportData, previewImport, importData } from '@cashmgr/core';
import type { ImportPreview, ImportMode } from '@cashmgr/core';
import { useDatabaseAdapter } from '../src/contexts/services-context';

export default function SettingsBackupScreen() {
  const theme = useTheme();
  const adapter = useDatabaseAdapter();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [isExporting, setIsExporting] = React.useState(false);
  const [importPreview, setImportPreview] = React.useState<ImportPreview | null>(null);
  const [pendingImportContent, setPendingImportContent] = React.useState<string | null>(null);
  const [importMode, setImportMode] = React.useState<ImportMode>('replace');
  const [isImporting, setIsImporting] = React.useState(false);

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
        Alert.alert(
          'Import complete',
          `Imported: ${result.imported.accounts} accounts, ${result.imported.transactions} transactions, ${result.imported.categories} categories.`
        );
      } else {
        Alert.alert('Import failed', result.errors.join('\n'));
      }
    } catch (err) {
      const msg = err instanceof AppError ? err.getUserMessage() : 'Import failed';
      Alert.alert('Import failed', msg);
    } finally {
      setIsImporting(false);
    }
  }, [adapter, pendingImportContent, importMode]);

  const handleCancelImport = React.useCallback(() => {
    setImportPreview(null);
    setPendingImportContent(null);
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Backup', headerBackTitle: 'Settings' }} />

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
                    <Text style={[styles.bodyText, { color: '#c00' }]}>Invalid file:</Text>
                    {importPreview.errors.map((e: string, i: number) => (
                      <Text key={i} style={[styles.bodyText, { color: '#c00' }]}>{e}</Text>
                    ))}
                  </>
                ) : (
                  <>
                    <Text style={styles.bodyText}>
                      {importPreview.counts.accounts} accounts · {importPreview.counts.transactions} transactions · {importPreview.counts.categories} categories · {importPreview.counts.currencies} currencies
                    </Text>
                    <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
                      <Text style={styles.sectionLabel}>Import mode</Text>
                      {(['replace', 'merge'] as const).map((mode) => (
                        <TouchableOpacity
                          key={mode}
                          style={[styles.modeOption, importMode === mode && styles.modeOptionActive]}
                          onPress={() => setImportMode(mode)}
                        >
                          <Text style={[styles.modeText, importMode === mode && styles.modeTextActive]}>
                            {mode === 'replace' ? 'Replace (overwrite all)' : 'Merge (keep existing)'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
                <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
                  <TouchableOpacity style={[styles.cancelButton, { flex: 1 }]} onPress={handleCancelImport}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  {importPreview.isValid && (
                    <TouchableOpacity
                      style={[styles.confirmButton, { flex: 1 }, isImporting && styles.buttonDisabled]}
                      onPress={handleConfirmImport}
                      disabled={isImporting}
                    >
                      <Text style={styles.confirmButtonText}>{isImporting ? 'Importing...' : 'Confirm'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Export everything to a JSON file for safekeeping or to migrate to another device.
          Importing lets you choose between replacing all data or merging with existing records.
        </Text>
        <View style={{ gap: theme.spacing.sm }}>
          <TouchableOpacity
            style={[styles.primaryButton, isExporting && styles.buttonDisabled]}
            onPress={handleExport}
            disabled={isExporting}
          >
            <Text style={styles.primaryButtonText}>
              {isExporting ? 'Exporting...' : 'Export Backup (JSON)'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleImportPick}>
            <Text style={styles.secondaryButtonText}>Import Backup</Text>
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
