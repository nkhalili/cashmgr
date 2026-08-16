import React from 'react';

export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'teal' | 'indigo' | 'slate';

interface AccentPalette {
  primary: string;
  primarySoft: string;
}

const accentPalettes: Record<AccentColor, { light: AccentPalette; dark: AccentPalette }> = {
  teal: {
    light: { primary: '#2f7d68', primarySoft: '#cfe8df' },
    dark: { primary: '#67c2a8', primarySoft: '#244c40' },
  },
  indigo: {
    light: { primary: '#4f46e5', primarySoft: '#e0e7ff' },
    dark: { primary: '#818cf8', primarySoft: '#312e81' },
  },
  slate: {
    light: { primary: '#475569', primarySoft: '#e2e8f0' },
    dark: { primary: '#94a3b8', primarySoft: '#1e293b' },
  },
};

// Derive header gradients from accent primary color
function accentHeaderGradient(accent: AccentColor, mode: ThemeMode): string {
  const gradients: Record<AccentColor, { light: string; dark: string }> = {
    teal: {
      light: 'linear-gradient(135deg, #2f7d68, #325e77)',
      dark: 'linear-gradient(135deg, #1e4f43, #173247)',
    },
    indigo: {
      light: 'linear-gradient(135deg, #4f46e5, #6d28d9)',
      dark: 'linear-gradient(135deg, #312e81, #4c1d95)',
    },
    slate: {
      light: 'linear-gradient(135deg, #475569, #334155)',
      dark: 'linear-gradient(135deg, #1e293b, #0f172a)',
    },
  };
  return gradients[accent][mode];
}

export interface ThemeColorSet {
  primary: string;
  primarySoft: string;
  secondary: string;
  secondarySoft: string;
  background: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  successSoft: string;
  warning: string;
  danger: string;
  border: string;
  overlay: string;
}

export interface TypographyScale {
  h1: TextStyleToken;
  h2: TextStyleToken;
  h3: TextStyleToken;
  h4: TextStyleToken;
  body: TextStyleToken;
  caption: TextStyleToken;
  numeric: TextStyleToken;
}

export interface TextStyleToken {
  fontSize: number;
  fontWeight: number;
  letterSpacing?: number;
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColorSet;
  spacing: Record<'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl', number>;
  radii: Record<'xs' | 'sm' | 'md' | 'lg' | 'pill', number>;
  shadows: {
    soft: string;
    medium: string;
  };
  typography: TypographyScale;
  fontFamily: string;
  gradients: {
    surface: string;
    header: string;
  };
  motion: {
    quick: string;
    standard: string;
  };
  components: {
    buttonHeight: number;
    inputHeight: number;
    interactiveRadius: number;
  };
}

const fontFamily =
  "'Inter', 'SF Pro Display', 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif";

const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

const typography: TypographyScale = {
  h1: { fontSize: 32, fontWeight: 600 },
  h2: { fontSize: 28, fontWeight: 600 },
  h3: { fontSize: 22, fontWeight: 600 },
  h4: { fontSize: 18, fontWeight: 600 },
  body: { fontSize: 16, fontWeight: 400 },
  caption: { fontSize: 13, fontWeight: 400 },
  numeric: {
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: 0.5,
  },
};

const motion = {
  quick: '120ms ease',
  standard: '200ms ease',
} as const;

const baseTheme = {
  spacing,
  radii,
  typography,
  fontFamily,
  motion,
  shadows: {
    soft: '0 12px 24px rgba(23, 50, 45, 0.08)',
    medium: '0 18px 32px rgba(12, 23, 28, 0.16)',
  },
  gradients: {
    surface: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(244,248,247,0.9))',
    header: 'linear-gradient(135deg, #4c8d70, #2d5f72)',
  },
  components: {
    buttonHeight: 44,
    inputHeight: 48,
    interactiveRadius: 12,
  },
};

const lightColors: ThemeColorSet = {
  primary: '#2f7d68',
  primarySoft: '#cfe8df',
  secondary: '#4b5d7a',
  secondarySoft: '#d6dde8',
  background: '#f4f7f6',
  surface: '#ffffff',
  surfaceMuted: '#f1f3f2',
  textPrimary: '#1f2a2e',
  textSecondary: '#51606a',
  textMuted: '#89959c',
  success: '#2e9d83',
  successSoft: '#d1fae5',
  warning: '#c78b46',
  danger: '#c96868',
  border: '#d6e1de',
  overlay: 'rgba(17, 23, 24, 0.45)',
};

const darkColors: ThemeColorSet = {
  primary: '#67c2a8',
  primarySoft: '#244c40',
  secondary: '#8ea3c4',
  secondarySoft: '#1f2937',
  background: '#101417',
  surface: '#1a2125',
  surfaceMuted: '#222a2f',
  textPrimary: '#f2f5f4',
  textSecondary: '#b4c0c6',
  textMuted: '#7f8b92',
  success: '#4fd6b5',
  successSoft: '#1a3d2e',
  warning: '#e1b05f',
  danger: '#f28585',
  border: '#2f3a3f',
  overlay: 'rgba(3, 8, 10, 0.6)',
};

export const createTheme = (mode: ThemeMode, accent: AccentColor = 'teal'): Theme => {
  const baseColors = mode === 'light' ? lightColors : darkColors;
  const accentColors = accentPalettes[accent][mode];
  return {
    mode,
    ...baseTheme,
    colors: {
      ...baseColors,
      primary: accentColors.primary,
      primarySoft: accentColors.primarySoft,
    },
    gradients: {
      surface:
        mode === 'light'
          ? 'linear-gradient(140deg, rgba(255,255,255,0.95), rgba(238,244,242,0.9))'
          : 'linear-gradient(140deg, rgba(28,36,40,1), rgba(16,24,27,1))',
      header: accentHeaderGradient(accent, mode),
    },
  };
};

export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');

export const ThemeContext = React.createContext<Theme>(lightTheme);

export interface ThemeProviderProps {
  mode?: ThemeMode;
  accent?: AccentColor;
  value?: Theme;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  mode = 'light',
  accent = 'teal',
  value,
}) => {
  const resolvedValue = React.useMemo(
    () => value ?? createTheme(mode, accent),
    [mode, accent, value],
  );

  return (
    <ThemeContext.Provider value={resolvedValue}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): Theme => React.useContext(ThemeContext);

// F-004: Chart color palette for pie charts and other visualizations
// Expense colors: Red → Orange → Dark Yellow → Light Yellow → others
export const expenseChartColors = [
  '#EF4444', // Red (largest)
  '#F97316', // Orange
  '#D97706', // Dark Yellow / Amber
  '#FACC15', // Light Yellow
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#A855F7', // Purple
  '#F43F5E', // Rose
] as const;

// Income colors: Green → Teal → Cyan → Blue → others
export const incomeChartColors = [
  '#22C55E', // Green (largest)
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky Blue
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#F472B6', // Pink Light
] as const;

// Default export for backward compatibility
export const chartColors = expenseChartColors;

export const getCategoryColor = (index: number, type?: 'income' | 'expense'): string => {
  const colors = type === 'income' ? incomeChartColors : expenseChartColors;
  return colors[index % colors.length];
};
