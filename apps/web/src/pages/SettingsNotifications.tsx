import { Link } from 'react-router-dom';
import { Button, Card, useTheme } from '@cashmgr/ui';

export function SettingsNotifications() {
  const theme = useTheme();

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
          Data & Notifications
        </h2>
      </div>

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
    </div>
  );
}
