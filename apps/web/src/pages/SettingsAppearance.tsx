import { Link } from 'react-router-dom';
import { Badge, ListItem, useTheme } from '@cashmgr/ui';
import type { AccentColor } from '@cashmgr/ui';
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

export function SettingsAppearance() {
  const theme = useTheme();
  const { preference, setPreference, accent, setAccent } = useThemePreference();

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
          Appearance
        </h2>
      </div>

      {/* Theme mode */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
        <p style={{ margin: 0, fontSize: theme.typography.caption.fontSize, fontWeight: 600, color: theme.colors.textSecondary }}>
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
                <span style={{ fontSize: theme.typography.caption.fontSize, fontWeight: 400, color: isActive ? theme.colors.primary : theme.colors.textMuted }}>
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent color */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
        <p style={{ margin: 0, fontSize: theme.typography.caption.fontSize, fontWeight: 600, color: theme.colors.textSecondary }}>
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
                <span style={{ width: 20, height: 20, borderRadius: theme.radii.pill, background: opt.colorLight, flexShrink: 0 }} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact mode placeholder */}
      <ListItem
        title="Compact mode"
        subtitle="Condense cards and tables"
        value={<Badge label="Coming soon" tone="neutral" />}
        showDivider={false}
      />
    </div>
  );
}
