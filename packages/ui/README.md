# @cashmgr/ui – Harmony Design System

Unified visual language for the Cash Mgr. experience (web, desktop, mobile).

## Design Philosophy

- Calm finance-first palette inspired by sea glass, slate, and warm neutrals.
- Friendly rounded geometry (12px core radius) and soft layered shadows.
- Typography prioritises clarity and trust with numeric-friendly OpenType settings.
- Consistent spacing rhythm (4/8/16/24/32) ensures comfortable breathing room.
- Motion stays subtle: quick hover (120ms) for feedback, standard transitions (200ms) for layout/overlay changes.

## Theme Tokens

### Colors

| Token | Light | Dark |
| --- | --- | --- |
| `primary` | `#2f7d68` | `#67c2a8` |
| `secondary` | `#4b5d7a` | `#8ea3c4` |
| `background` | `#f4f7f6` | `#101417` |
| `surface` | `#ffffff` | `#1a2125` |
| `surfaceMuted` | `#f1f3f2` | `#222a2f` |
| `textPrimary` | `#1f2a2e` | `#f2f5f4` |
| `textSecondary` | `#51606a` | `#b4c0c6` |
| `success` | `#2e9d83` | `#4fd6b5` |
| `warning` | `#c78b46` | `#e1b05f` |
| `danger` | `#c96868` | `#f28585` |

Additional semantic tokens include `primarySoft`, `secondarySoft`, `border`, and `overlay` for cards/overlays. Subtle gradients (`theme.gradients.surface` & `theme.gradients.header`) add premium depth without becoming flashy.

### Typography

Single sans-serif stack: `Inter, SF Pro Display, Segoe UI, Roboto, sans-serif`.

| Style | Size / Weight | Notes |
| --- | --- | --- |
| `h1` | 32 / 600 | Primary hero |
| `h2` | 28 / 600 | Section headers |
| `h3` | 22 / 600 | Card titles |
| `h4` | 18 / 600 | Inline headings |
| `body` | 16 / 400 | Text + form fields |
| `caption` | 13 / 400 | Metadata, helper text |
| `numeric` | 18 / 600 | Tabular figures (`font-feature-settings: "tnum","lnum"`) |

### Spacing, Radii, Shadows, Motion

- Spacing scale: `xs=4`, `sm=8`, `md=16`, `lg=24`, `xl=32`.
- Radii: `xs=4`, `sm=8`, `md=12`, `lg=16`, `pill=999`.
- Shadows: `soft (0 12px 24px rgba(23,50,45,0.08))`, `medium (0 18px 32px rgba(12,23,28,0.16))`.
- Motion: `quick=120ms ease`, `standard=200ms ease`.

## Theme API

```ts
import { ThemeProvider, lightTheme, darkTheme, useTheme } from '@cashmgr/ui';

// Provider (web + Electron)
const App = () => (
  <ThemeProvider mode="light">
    <Dashboard />
  </ThemeProvider>
);

// React Native example
import { ThemeProvider, darkTheme } from '@cashmgr/ui';
import { View, Text } from 'react-native';

const MobileScreen = () => (
  <ThemeProvider value={darkTheme}>
    <View style={{ backgroundColor: darkTheme.colors.background }}>
      <Text style={{ color: darkTheme.colors.textPrimary }}>Balance</Text>
    </View>
  </ThemeProvider>
);
```

`ThemeProvider` exposes identical tokens across platforms, so React Native screens and the React web UI can share spacing, typography, and color references.

## Components

- **Button** – primary, secondary, ghost, and danger states with icon slots and soft hover lift.
- **Input** – labeled fields with helper/error text, numeric-friendly typography, and calm focus ring.
- **Card** – gradient option, tone accent, smart hover elevation.
- **ListItem** – grouped content rows with tokens for icons, badges, and currency values.
- **Tabs** – pill or underline navigation with optional badges.
- **Modal / Bottom Sheet** – overlay with translucent backdrop, mild blur, and accessible close controls.
- **Badge** – semantic pills for status and filters.
- **EmptyState** – friendly placeholder surface for zero-data experiences.

Each component consumes the theme tokens internally so apps stay visually consistent without duplicating styles.

## Animations & Accessibility

- Hover/press states respect `theme.motion.quick`.
- Cards/buttons lift by 1–2px max to keep interactions calm.
- Focus outlines use color-safe rings for light & dark backgrounds.
- Components rely on numeric font features for balance figures to avoid jitter.
- Minimum interactive target is 44px on every control (`theme.components.buttonHeight`).

## Building

```bash
pnpm build
```

Outputs compiled artifacts to `packages/ui/dist`.
