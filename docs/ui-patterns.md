# UI Patterns

This document captures reusable UI patterns and styling guidelines for consistency across the application.

## Page Breadcrumb (Web / Desktop)

Used at the top of sub-pages to show context and provide one-click navigation back to the parent page. Applied to all Settings sub-pages; follow this pattern for any future sub-pages on web/desktop.

### Breadcrumb Visual Design

```text
Settings  ›  Currencies
```

- "Settings" renders as a dimmed, primary-coloured link at h1 weight and size
- On hover: opacity snaps to full and a 2 px underline slides in left-to-right
- `›` separator is `textSecondary` colour, same font size
- Page title (`h2`) follows at the same size and weight, full opacity

### Breadcrumb Key Design Tokens

| Element | Property | Value |
| --- | --- | --- |
| Link colour | `color` | `theme.colors.primary` |
| Link / separator / title font size | `fontSize` | `theme.typography.h1.fontSize` |
| Link / title font weight | `fontWeight` | `theme.typography.h1.fontWeight` |
| Link resting opacity | `opacity` | `0.55` |
| Separator colour | `color` | `theme.colors.textSecondary` |
| Underline height | `height` | `2px` |
| Underline animation | `transition` | `width 0.2s ease` |
| Opacity animation | `transition` | `opacity 0.15s ease` |

### CSS Class (App.css)

```css
.settings-breadcrumb-link {
  position: relative;
  text-decoration: none;
  opacity: 0.55;
  transition: opacity 0.15s ease;
}

.settings-breadcrumb-link::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 0;
  height: 2px;
  background: currentColor;
  border-radius: 1px;
  transition: width 0.2s ease;
}

.settings-breadcrumb-link:hover {
  opacity: 1;
}

.settings-breadcrumb-link:hover::after {
  width: 100%;
}
```

### Web Usage

```tsx
import { Link } from 'react-router-dom';

<div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
  <Link
    to="/parent-route"
    className="settings-breadcrumb-link"
    style={{
      color: theme.colors.primary,
      fontSize: theme.typography.h1.fontSize,
      fontWeight: theme.typography.h1.fontWeight,
    }}
  >
    Parent Page
  </Link>
  <span style={{ color: theme.colors.textSecondary, fontSize: theme.typography.h1.fontSize }}>›</span>
  <h2 style={{ margin: 0, fontSize: theme.typography.h1.fontSize, fontWeight: theme.typography.h1.fontWeight }}>
    Current Page
  </h2>
</div>
```

### Breadcrumb Usage Examples

- **Settings › Currencies**
- **Settings › Appearance**
- **Settings › Backup**

---

## Period Navigator (Month/Year Navigation)

A card-header style navigation component for navigating between time periods (months, years).

### Visual Design

```text
┌─────────────────────────────────────────┐
│  (◁)     January 2026     (▷)          │
└─────────────────────────────────────────┘
```

- Full-width card with surface background
- Circular navigation buttons on left and right
- Centered period label
- Subtle border

### Mobile (React Native)

```typescript
// Styles
const styles = StyleSheet.create({
  periodNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  periodNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodNavLabel: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: fontWeight(600),
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
});

// Usage with Ionicons
import { Ionicons } from '@expo/vector-icons';

<View style={styles.periodNavContainer}>
  <TouchableOpacity style={styles.periodNavButton} onPress={() => navigate('prev')}>
    <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
  </TouchableOpacity>
  <Text style={styles.periodNavLabel}>
    {periodLabel}
  </Text>
  <TouchableOpacity style={styles.periodNavButton} onPress={() => navigate('next')}>
    <Ionicons name="chevron-forward" size={20} color={theme.colors.textPrimary} />
  </TouchableOpacity>
</View>
```

### Web (React)

```tsx
// Inline styles
<div
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.components.interactiveRadius,
    padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
  }}
>
  <button
    type="button"
    onClick={() => navigate('prev')}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 36,
      height: 36,
      borderRadius: '50%',
      border: 'none',
      background: theme.colors.background,
      cursor: 'pointer',
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: 600,
    }}
  >
    ‹
  </button>
  <span
    style={{
      fontWeight: 600,
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textPrimary,
    }}
  >
    {periodLabel}
  </span>
  <button
    type="button"
    onClick={() => navigate('next')}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 36,
      height: 36,
      borderRadius: '50%',
      border: 'none',
      background: theme.colors.background,
      cursor: 'pointer',
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: 600,
    }}
  >
    ›
  </button>
</div>
```

### Period Navigator Key Design Tokens

| Property | Value |
| --- | --- |
| Container background | `theme.colors.surface` |
| Container border | `1px solid theme.colors.border` |
| Container border radius | `theme.radii.md` / `theme.components.interactiveRadius` |
| Container padding | `theme.spacing.sm` vertical, `theme.spacing.md` horizontal |
| Button size | 36x36px |
| Button border radius | 18px (circular) |
| Button background | `theme.colors.background` |
| Icon/text color | `theme.colors.textPrimary` |
| Icon size (mobile) | 20px |
| Icon font size (web) | 14px |
| Label font size | `theme.typography.body.fontSize` |
| Label font weight | 600 |

### Navigation Logic

```typescript
// Month navigation with year boundary handling
const navigateMonth = (direction: 'prev' | 'next') => {
  if (direction === 'prev') {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  } else {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  }
};

// Year navigation
const navigateYear = (direction: 'prev' | 'next') => {
  setYear(y => direction === 'prev' ? y - 1 : y + 1);
};
```

### Period Navigator Usage Examples

- **Transactions page**: Month navigation (`January 2026`)
- **Dashboard**: Year navigation (`2026`)

### Accessibility

- Buttons should have `type="button"` on web
- Use `TouchableOpacity` on mobile for proper touch feedback
- Icons should be semantic (chevron-back/chevron-forward)
