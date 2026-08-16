import { Link } from 'react-router-dom';
import { useTheme } from '@cashmgr/ui';

const REPO_URL = 'https://github.com/nkhalili/cashmgr';
const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/nkhalili';
const BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/nkhalili';

export function SettingsAbout() {
  const theme = useTheme();

  return (
    <div
      className="page"
      style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
        <Link
          to="/settings"
          className="settings-breadcrumb-link"
          style={{
            color: theme.colors.primary,
            fontSize: theme.typography.h1.fontSize,
            fontWeight: theme.typography.h1.fontWeight,
          }}
        >
          Settings
        </Link>
        <span style={{ color: theme.colors.textSecondary, fontSize: theme.typography.h1.fontSize }}>
          ›
        </span>
        <h2
          style={{
            margin: 0,
            fontSize: theme.typography.h1.fontSize,
            fontWeight: theme.typography.h1.fontWeight,
          }}
        >
          About
        </h2>
      </div>

      {/* App identity */}
      <div
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.lg,
          border: `1px solid ${theme.colors.border}`,
          padding: theme.spacing.xl,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: theme.spacing.sm,
          textAlign: 'center',
        }}
      >
        <img
          src="/favicon.png"
          alt="Cash Mgr."
          style={{
            width: 72,
            height: 72,
            borderRadius: theme.radii.lg,
            boxShadow: theme.shadows.medium,
          }}
        />
        <h1
          style={{
            margin: 0,
            fontSize: theme.typography.h1.fontSize,
            fontWeight: theme.typography.h1.fontWeight,
            color: theme.colors.textPrimary,
          }}
        >
          Cash Mgr.
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: theme.typography.body.fontSize,
            color: theme.colors.textSecondary,
          }}
        >
          A free, open source, offline-first personal finance manager.
        </p>
        <span
          style={{
            marginTop: theme.spacing.xs,
            display: 'inline-block',
            padding: `2px ${theme.spacing.sm}px`,
            borderRadius: theme.radii.pill,
            backgroundColor: theme.colors.primarySoft,
            color: theme.colors.primary,
            fontSize: theme.typography.caption.fontSize,
            fontWeight: 600,
          }}
        >
          v{__APP_VERSION__}
        </span>
      </div>

      {/* Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
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
          Links
        </p>
        <div
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.lg,
            border: `1px solid ${theme.colors.border}`,
            overflow: 'hidden',
          }}
        >
          {[
            { label: 'Source Code', subtitle: 'View on GitHub', href: REPO_URL, icon: '🐙' },
            { label: 'Report an Issue', subtitle: 'GitHub Issues', href: `${REPO_URL}/issues`, icon: '🐛' },
            {
              label: 'Sponsor on GitHub',
              subtitle: 'Support via GitHub Sponsors',
              href: GITHUB_SPONSORS_URL,
              icon: '💖',
            },
            {
              label: 'Buy Me a Coffee',
              subtitle: 'One-time donation',
              href: BUY_ME_A_COFFEE_URL,
              icon: '☕',
            },
          ].map((item, index, arr) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${theme.spacing.md}px ${theme.spacing.lg}px`,
                textDecoration: 'none',
                color: 'inherit',
                borderBottom: index < arr.length - 1 ? `1px solid ${theme.colors.border}` : 'none',
                transition: `background-color ${theme.motion.quick}`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                  theme.colors.surfaceMuted;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
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
                  {item.icon}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span
                    style={{
                      fontSize: theme.typography.body.fontSize,
                      fontWeight: 500,
                      color: theme.colors.textPrimary,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontSize: theme.typography.caption.fontSize,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    {item.subtitle}
                  </span>
                </div>
              </div>
              <span style={{ color: theme.colors.textSecondary, fontSize: 18 }}>↗</span>
            </a>
          ))}
        </div>
      </div>

      {/* License */}
      <p
        style={{
          margin: 0,
          textAlign: 'center',
          fontSize: theme.typography.caption.fontSize,
          color: theme.colors.textSecondary,
        }}
      >
        Licensed under{' '}
        <a
          href={`${REPO_URL}/blob/main/LICENSE`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: theme.colors.primary }}
        >
          AGPL-3.0
        </a>
      </p>
    </div>
  );
}
