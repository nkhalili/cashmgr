import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, useTheme } from '@cashmgr/ui';
import { AppError, exportData, previewCsv, importCsv } from '@cashmgr/core';
import type { CsvPreviewResult, CsvColumnMapping } from '@cashmgr/core';
import { useCurrenciesService, useAccountsService, useDatabaseAdapter } from '../services/services-context';

export function SettingsCsv() {
  const theme = useTheme();
  const adapter = useDatabaseAdapter();
  const accountsService = useAccountsService();
  const currenciesService = useCurrenciesService();

  const [isExporting, setIsExporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
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
  const csvFileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    accountsService.listAccounts().then(setAccounts).catch(() => {});
    currenciesService.listCurrencies(true)
      .then((list) => {
        const primary = list.find((c) => c.isPrimary);
        if (primary) setPrimaryCurrencyId(primary.id);
      })
      .catch(() => {});
  }, [accountsService, currenciesService]);

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
        const accts = await accountsService.listAccounts();
        setAccounts(accts);
        setCsvAccountId(accts[0]?.id ?? '');
        setCsvDefaultCurrency(primaryCurrencyId);
        setCsvStep(1);
      } catch {
        setError('Failed to read CSV file');
      }
    },
    [accountsService, primaryCurrencyId]
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
      const msg = `Imported ${result.imported} transaction${result.imported !== 1 ? 's' : ''}, skipped ${result.skipped} duplicate${result.skipped !== 1 ? 's' : ''}.`;
      window.alert(result.errors.length > 0 ? `${msg}\n\nWarnings:\n${result.errors.slice(0, 5).join('\n')}` : msg);
    } catch (err) {
      setError(err instanceof AppError ? err.getUserMessage() : 'CSV import failed');
    } finally {
      setIsImportingCsv(false);
    }
  }, [adapter, csvContent, csvMapping, csvAccountId, csvDefaultCurrency, handleCsvCancel]);

  const selectStyle: React.CSSProperties = {
    padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
    borderRadius: theme.radii.md,
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.surface,
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
    fontSize: theme.typography.body.fontSize,
  };

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
          Transactions (CSV)
        </h2>
      </div>

      {error && (
        <div style={{ padding: theme.spacing.md, backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: theme.components.interactiveRadius, color: '#c00' }}>
          <p style={{ margin: 0, fontWeight: 500 }}>{error}</p>
        </div>
      )}

      <Card
        title="Transactions (CSV)"
        subtitle="Import or export transactions for a single account"
        tone="default"
        footer={
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Button type="button" variant="primary" onClick={handleExportCSV} disabled={isExporting}>
              {isExporting ? 'Exporting…' : 'Export transactions (CSV)'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => csvFileInputRef.current?.click()}>
              Import CSV…
            </Button>
            <input ref={csvFileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvFileChange} />
          </div>
        }
      >
        <p style={{ margin: 0, color: theme.colors.textSecondary }}>
          Import transactions from a bank export or spreadsheet. Map CSV columns to transaction
          fields and choose which account they belong to. Duplicates are skipped automatically.
        </p>
      </Card>

      {/* CSV import modal */}
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

                  <label style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                    <span style={{ fontSize: theme.typography.caption.fontSize, fontWeight: 600, color: theme.colors.textSecondary }}>Date column *</span>
                    <select value={csvMapping.date} onChange={(e) => setCsvMapping((m) => ({ ...m, date: e.target.value }))} style={selectStyle}>
                      <option value="">— select —</option>
                      {csvPreview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>

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
                      <select value={csvMapping.amount ?? ''} onChange={(e) => setCsvMapping((m) => ({ ...m, amount: e.target.value || undefined }))} style={selectStyle}>
                        <option value="">— select —</option>
                        {csvPreview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </label>
                  ) : (
                    <div style={{ display: 'flex', gap: theme.spacing.md }}>
                      {(['debit', 'credit'] as const).map((col) => (
                        <label key={col} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                          <span style={{ fontSize: theme.typography.caption.fontSize, fontWeight: 600, color: theme.colors.textSecondary }}>{col === 'debit' ? 'Debit column (expense)' : 'Credit column (income)'}</span>
                          <select value={csvMapping[col] ?? ''} onChange={(e) => setCsvMapping((m) => ({ ...m, [col]: e.target.value || undefined }))} style={selectStyle}>
                            <option value="">— select —</option>
                            {csvPreview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: theme.spacing.md }}>
                    {(['notes', 'type', 'currency'] as const).map((field) => (
                      <label key={field} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                        <span style={{ fontSize: theme.typography.caption.fontSize, fontWeight: 600, color: theme.colors.textSecondary }}>{field.charAt(0).toUpperCase() + field.slice(1)} (optional)</span>
                        <select value={csvMapping[field] ?? ''} onChange={(e) => setCsvMapping((m) => ({ ...m, [field]: e.target.value || undefined }))} style={selectStyle}>
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
                    <select value={csvAccountId} onChange={(e) => setCsvAccountId(e.target.value)} style={selectStyle}>
                      <option value="">— select account —</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </label>

                  {!csvMapping.currency && (
                    <label style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
                      <span style={{ fontSize: theme.typography.caption.fontSize, fontWeight: 600, color: theme.colors.textSecondary }}>Default currency</span>
                      <select value={csvDefaultCurrency} onChange={(e) => setCsvDefaultCurrency(e.target.value)} style={selectStyle}>
                        <option value={primaryCurrencyId}>{primaryCurrencyId}</option>
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
                      { label: 'Currency', value: csvMapping.currency ? 'from CSV' : csvDefaultCurrency },
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
    </div>
  );
}
