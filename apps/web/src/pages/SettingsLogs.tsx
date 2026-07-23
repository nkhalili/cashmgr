import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, useTheme } from '@cashmgr/ui';
import { readWebLogFile } from '../logging/web-file-logger';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function SettingsLogs() {
  const theme = useTheme();
  const [logInfo, setLogInfo] = React.useState<{ size: number } | 'empty' | 'loading'>('loading');
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refreshLogInfo = React.useCallback(async () => {
    const log = await readWebLogFile();
    setLogInfo(log ? { size: log.size } : 'empty');
  }, []);

  React.useEffect(() => {
    void refreshLogInfo();
  }, [refreshLogInfo]);

  const handleDownload = React.useCallback(async () => {
    setIsDownloading(true);
    setError(null);
    try {
      const log = await readWebLogFile();
      if (!log) {
        setError('No errors have been logged yet.');
        return;
      }
      const blob = new Blob([log.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cashmgr-app.log';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to read the log file.');
    } finally {
      setIsDownloading(false);
    }
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
          Logs
        </h2>
      </div>

      {error && (
        <div style={{ padding: theme.spacing.md, backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: theme.components.interactiveRadius, color: '#c00' }}>
          <p style={{ margin: 0, fontWeight: 500 }}>{error}</p>
        </div>
      )}

      <Card
        title="Error log"
        subtitle={
          logInfo === 'loading'
            ? 'Checking…'
            : logInfo === 'empty'
              ? 'No errors logged yet'
              : `${formatBytes(logInfo.size)} on this device`
        }
        tone="default"
        footer={
          <Button type="button" variant="primary" onClick={handleDownload} disabled={isDownloading || logInfo === 'empty' || logInfo === 'loading'}>
            {isDownloading ? 'Preparing…' : 'Download log file'}
          </Button>
        }
      >
        <p style={{ margin: 0, color: theme.colors.textSecondary }}>
          Cash Mgr. keeps a local log of application errors on this device — it never leaves
          your device automatically. Download it here if you're reporting a bug.
        </p>
      </Card>
    </div>
  );
}
