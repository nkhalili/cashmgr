import React from 'react';
import { AccentColor, ThemeMode, ThemeProvider as UIThemeProvider } from '@cashmgr/ui';

const THEME_STORAGE_KEY = 'cashmgr-theme-preference';
const ACCENT_STORAGE_KEY = 'cashmgr-accent-color';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  isDark: boolean;
  resolvedMode: ThemeMode;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getSystemScheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function loadPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return 'system';
}

function loadAccent(): AccentColor {
  try {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (stored === 'teal' || stored === 'indigo' || stored === 'slate') {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return 'teal';
}

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = React.useState<ThemePreference>(loadPreference);
  const [accent, setAccentState] = React.useState<AccentColor>(loadAccent);
  const [systemScheme, setSystemScheme] = React.useState<'light' | 'dark'>(getSystemScheme);

  // Listen for system appearance changes
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemScheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setPreference = React.useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const setAccent = React.useCallback((a: AccentColor) => {
    setAccentState(a);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, a);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const isDark = preference === 'system' ? systemScheme === 'dark' : preference === 'dark';
  const resolvedMode: ThemeMode = isDark ? 'dark' : 'light';

  const value = React.useMemo(
    () => ({ preference, setPreference, accent, setAccent, isDark, resolvedMode }),
    [preference, setPreference, accent, setAccent, isDark, resolvedMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      <UIThemeProvider mode={resolvedMode} accent={accent}>
        {children}
      </UIThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useThemePreference(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error('ThemePreferenceProvider is missing from component tree.');
  }
  return ctx;
}
