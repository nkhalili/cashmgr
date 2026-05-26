import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Button, useTheme } from '@cashmgr/ui';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { AddTransaction } from './pages/AddTransaction';
import { Categories } from './pages/Categories';
import { Accounts } from './pages/Accounts';
import { Settings } from './pages/Settings';
import { useThemePreference, ThemePreference } from './contexts/theme-context';
import './App.css';

const NAV_LINKS = [
  { label: 'Dashboard', to: '/' },
  { label: 'Transactions', to: '/transactions' },
  { label: 'Accounts', to: '/accounts' },
  { label: 'Categories', to: '/categories' },
  { label: 'Settings', to: '/settings' },
];

const PREFERENCE_CYCLE: ThemePreference[] = ['system', 'light', 'dark'];
const PREFERENCE_LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Black',
};

export const App: React.FC = () => {
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();

  const handleCycleTheme = React.useCallback(() => {
    const currentIndex = PREFERENCE_CYCLE.indexOf(preference);
    const nextIndex = (currentIndex + 1) % PREFERENCE_CYCLE.length;
    setPreference(PREFERENCE_CYCLE[nextIndex]);
  }, [preference, setPreference]);

  return (
    <BrowserRouter>
      <div
        className="app"
        style={{
          background: theme.colors.background,
          color: theme.colors.textPrimary,
          fontFamily: theme.fontFamily,
        }}
      >
        <aside
          className="nav"
          style={{
            background: theme.gradients.header,
            color: '#f6fffb',
            boxShadow: theme.shadows.medium,
          }}
        >
          <div
            style={{
              marginBottom: theme.spacing.lg,
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.xs,
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: theme.typography.h3.fontSize,
                fontWeight: theme.typography.h3.fontWeight,
                textTransform: 'uppercase',
              }}
            >
              Cash mgr.
            </h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)' }}>
              Calm oversight for your accounts.
            </p>
          </div>
          <nav style={{ flex: 1 }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    style={({ isActive }) => ({
                      display: 'block',
                      padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                      borderRadius: theme.radii.md,
                      textDecoration: 'none',
                      color: '#f6fffb',
                      fontWeight: 600,
                      background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                      transition: `background ${theme.motion.quick}, transform ${theme.motion.quick}`,
                    })}
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="theme-btn-float" style={{ marginTop: theme.spacing.lg }}>
            <Button
              variant="ghost"
              onClick={handleCycleTheme}
              style={{
                width: '100%',
                color: '#f6fffb',
                border: '1px solid rgba(255,255,255,0.35)',
              }}
            >
              Theme: {PREFERENCE_LABELS[preference]}
            </Button>
            <p style={{ margin: `${theme.spacing.xs}px 0 0`, fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
              v{__APP_VERSION__}
            </p>
          </div>
        </aside>
        <main
          className="main"
          style={{
            background: `radial-gradient(circle at top, rgba(111, 164, 150, 0.12), transparent 55%), ${theme.colors.background}`,
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/add" element={<AddTransaction />} />
            <Route path="/transactions/:id/edit" element={<AddTransaction />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};
