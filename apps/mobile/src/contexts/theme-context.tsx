import React from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider as UIThemeProvider, ThemeMode, AccentColor } from '@cashmgr/ui';

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

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = React.useState<ThemePreference>('system');
  const [accent, setAccentState] = React.useState<AccentColor>('teal');
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [systemScheme, setSystemScheme] = React.useState<'light' | 'dark'>('light');

  // Initialize system scheme and listen for changes
  React.useEffect(() => {
    // Get the current system color scheme
    const currentScheme = Appearance.getColorScheme();
    if (currentScheme) {
      setSystemScheme(currentScheme);
    }

    // Listen for system appearance changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme ?? 'light');
    });

    return () => subscription.remove();
  }, []);

  // Load saved preferences on mount
  React.useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY),
      AsyncStorage.getItem(ACCENT_STORAGE_KEY),
    ])
      .then(([storedTheme, storedAccent]) => {
        if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
          setPreferenceState(storedTheme);
        }
        if (storedAccent === 'teal' || storedAccent === 'indigo' || storedAccent === 'slate') {
          setAccentState(storedAccent);
        }
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  const setPreference = React.useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(THEME_STORAGE_KEY, pref).catch((err) => {
      console.warn('Failed to save theme preference:', err);
    });
  }, []);

  const setAccent = React.useCallback((a: AccentColor) => {
    setAccentState(a);
    AsyncStorage.setItem(ACCENT_STORAGE_KEY, a).catch((err) => {
      console.warn('Failed to save accent color:', err);
    });
  }, []);

  const isDark =
    preference === 'system' ? systemScheme === 'dark' : preference === 'dark';

  const resolvedMode: ThemeMode = isDark ? 'dark' : 'light';

  const value = React.useMemo(
    () => ({ preference, setPreference, accent, setAccent, isDark, resolvedMode }),
    [preference, setPreference, accent, setAccent, isDark, resolvedMode]
  );

  // Don't render until we've loaded the preference to avoid flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      <UIThemeProvider mode={resolvedMode} accent={accent}>{children}</UIThemeProvider>
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
