import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, useTheme } from '@cashmgr/ui';
import { AppError, exportData, previewImport, importData } from '@cashmgr/core';
import type { ImportPreview, ImportMode } from '@cashmgr/core';
import { useDatabaseAdapter } from '../services/services-context';

export function SettingsBackup() {
  const theme = useTheme();
  const adapter = useDatabaseAdapter();

  const [isExporting, setIsExporting] = React.useState(false);
  const [importPreview, setImportPreview] = React.useState<ImportPreview | null>(null);
  const [pendingImportContent, setPendingImportContent] = React.useState<string | null>(null);
  const [importMode, setImportMode] = React.useState<ImportMode>('replace');
  const [isImporting, setIsImporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      event.target.value = '';
    },
    []
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
        window.alert(
          `Import complete: ${result.imported.accounts} accounts, ${result.imported.transactions} transactions, ${result.imported.categories} categories.`
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
  }, [adapter, pendingImportContent, importMode]);

  const handleCancelImport = React.useCallback(() => {
    setImportPreview(null);
    setPendingImportContent(null);
  }, []);

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
          Backup
        </h2>
      </div>

      {error && (
        <div style={{ padding: theme.spacing.md, backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: theme.components.interactiveRadius, color: '#c00' }}>
          <p style={{ margin: 0, fontWeight: 500 }}>{error}</p>
        </div>
      )}

      <Card
        title="Backup"
        subtitle="Full backup of all accounts, categories, currencies, and transactions"
        tone="default"
        footer={
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Button type="button" variant="primary" onClick={handleExportJSON} disabled={isExporting}>
              {isExporting ? 'Exporting…' : 'Export backup (JSON)'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()}>
              Import backup…
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFileChange} />
          </div>
        }
      >
        <p style={{ margin: 0, color: theme.colors.textSecondary }}>
          Export everything to a JSON file for safekeeping or to migrate to another device.
          Importing a backup will let you choose between replacing all data or merging.
        </p>
      </Card>

      {/* Import preview modal */}
      {importPreview && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={handleCancelImport}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, width: '100%', margin: theme.spacing.lg }}>
            <Card
              title="Import backup"
              subtitle={importPreview.isValid ? 'Review the data below before importing' : 'The backup file has errors'}
              tone="default"
            >
              {importPreview.errors.length > 0 && (
                <div style={{ padding: theme.spacing.md, backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: theme.components.interactiveRadius, marginBottom: theme.spacing.md }}>
                  {importPreview.errors.map((e, i) => (
                    <p key={i} style={{ margin: 0, fontSize: theme.typography.caption.fontSize, color: '#c00' }}>{e}</p>
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
                      <div key={label} style={{ padding: theme.spacing.md, background: theme.colors.surfaceMuted, borderRadius: theme.components.interactiveRadius, textAlign: 'center' }}>
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
                      <label key={mode} style={{ display: 'flex', alignItems: 'flex-start', gap: theme.spacing.sm, marginBottom: theme.spacing.sm, cursor: 'pointer' }}>
                        <input type="radio" name="importMode" value={mode} checked={importMode === mode} onChange={() => setImportMode(mode)} style={{ marginTop: 2 }} />
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
                <Button type="button" variant="ghost" onClick={handleCancelImport} disabled={isImporting}>Cancel</Button>
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
