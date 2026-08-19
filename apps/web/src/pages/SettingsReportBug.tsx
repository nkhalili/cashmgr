import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, useTheme } from '@cashmgr/ui';

const BUG_REPORT_EMAIL = 'cashmgr.support@gmail.com';

function buildMailtoUrl(): string {
  const platform = navigator.userAgent.includes('Electron') ? 'Desktop' : 'Web';
  const subject = `Cash Mgr. Bug Report (v${__APP_VERSION__}, ${platform})`;
  const body = `Describe the bug:\n\n\nSteps to reproduce:\n\n\n---\nApp version: ${__APP_VERSION__}\nPlatform: ${platform}`;
  return `mailto:${BUG_REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function SettingsReportBug() {
  const theme = useTheme();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(BUG_REPORT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — the address is still visible to copy manually
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
          Report a Bug
        </h2>
      </div>

      <Card
        title="Found something broken?"
        tone="default"
        footer={
          <Button type="button" variant="primary" onClick={() => { window.location.href = buildMailtoUrl(); }}>
            Email Us
          </Button>
        }
      >
        <p style={{ margin: 0, color: theme.colors.textSecondary }}>
          Send us a description of the bug and the steps to reproduce it. This opens your email
          app with a message pre-addressed to us — nothing is sent automatically.
        </p>
      </Card>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.md,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.lg,
          border: `1px solid ${theme.colors.border}`,
          padding: `${theme.spacing.md}px ${theme.spacing.lg}px`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary }}>
            Prefer to send it yourself?
          </span>
          <span style={{ fontSize: theme.typography.body.fontSize, fontWeight: 500, color: theme.colors.textPrimary }}>
            {BUG_REPORT_EMAIL}
          </span>
        </div>
        <Button type="button" variant="secondary" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}
