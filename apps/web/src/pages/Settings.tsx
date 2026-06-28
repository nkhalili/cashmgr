import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@cashmgr/ui';
import { useCurrenciesService } from '../services/services-context';
import { useThemePreference } from '../contexts/theme-context';

const THEME_LABELS: Record<string, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Black',
};

interface SettingsRow {
  label: string;
  subtitle?: string;
  route: string;
  icon: string;
}

interface SettingsGroup {
  header: string;
  rows: SettingsRow[];
}

export function Settings() {
  const theme = useTheme();
  const navigate = useNavigate();
  const currenciesService = useCurrenciesService();
  const { preference } = useThemePreference();

  const [primaryCurrencyId, setPrimaryCurrencyId] = React.useState<string | null>(null);
  const [hoveredRoute, setHoveredRoute] = React.useState<string | null>(null);

  React.useEffect(() => {
    currenciesService
      .listCurrencies(true)
      .then((list) => {
        const primary = list.find((c) => c.isPrimary);
        setPrimaryCurrencyId(primary?.id ?? null);``
      })
      .catch(() => {});
  }, [currenciesService]);

  const isDevelopment = import.meta.env.VITE_ENV === 'development' || import.meta.env.DEV;

  const groups: SettingsGroup[] = [
    {
      header: 'Preferences',
      rows: [
        { label: 'Currencies', subtitle: primaryCurrencyId ?? undefined, route: '/settings/currencies', icon: '💱' },
        { label: 'Budgets', subtitle: 'Monthly category budgets', route: '/settings/budgets', icon: '📊' },
        { label: 'Recurring Transactions', subtitle: 'Scheduled repeating transactions', route: '/settings/recurring', icon: '🔁' },
        { label: 'Appearance', subtitle: THEME_LABELS[preference] ?? 'System', route: '/settings/appearance', icon: '🎨' },
      ],
    },
    {
      header: 'Data',
      rows: [
        { label: 'Backup', subtitle: 'Export & import JSON', route: '/settings/backup', icon: '☁️' },
        { label: 'Transactions (CSV)', subtitle: 'Export & import CSV', route: '/settings/csv', icon: '📄' },
      ],
    },
    {
      header: 'App',
      rows: [
        { label: 'About', subtitle: `v${__APP_VERSION__}`, route: '/settings/about', icon: 'ℹ️' },
      ],
    },
    ...(isDevelopment
      ? [
          {
            header: 'Development',
            rows: [
              { label: 'Development Tools', subtitle: 'Sample data & dev tools', route: '/settings/development', icon: '🔧' },
            ],
          },
        ]
      : []),
  ];

  return (
    <div
      className="page"
      style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}
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
          Finely tune currencies, themes, and preferences.
        </p>
      </div>

      {groups.map((group) => (
        <div key={group.header} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
          <p
            style={{
              margin: 0,
              fontSize: theme.typography.caption.fontSize,
              fontWeight: 600,
              color: theme.colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              paddingLeft: theme.spacing.xs,
            }}
          >
            {group.header}
          </p>

          <div
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.lg,
              border: `1px solid ${theme.colors.border}`,
              overflow: 'hidden',
            }}
          >
            {group.rows.map((row, index) => (
              <div
                key={row.route}
                role="button"
                tabIndex={0}
                onClick={() => navigate(row.route)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(row.route); }}
                onMouseEnter={() => setHoveredRoute(row.route)}
                onMouseLeave={() => setHoveredRoute(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: `${theme.spacing.md}px ${theme.spacing.lg}px`,
                  cursor: 'pointer',
                  borderBottom: index < group.rows.length - 1 ? `1px solid ${theme.colors.border}` : 'none',
                  backgroundColor: hoveredRoute === row.route ? theme.colors.surfaceMuted : 'transparent',
                  transition: `background-color ${theme.motion.quick}`,
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: theme.radii.md,
                      backgroundColor: theme.colors.primarySoft,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {row.icon}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span
                      style={{
                        fontSize: theme.typography.body.fontSize,
                        fontWeight: 500,
                        color: theme.colors.textPrimary,
                      }}
                    >
                      {row.label}
                    </span>
                    {row.subtitle && (
                      <span
                        style={{
                          fontSize: theme.typography.caption.fontSize,
                          color: theme.colors.textSecondary,
                        }}
                      >
                        {row.subtitle}
                      </span>
                    )}
                  </div>
                </div>

                <span style={{ color: theme.colors.textSecondary, fontSize: 18, lineHeight: 1 }}>›</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
