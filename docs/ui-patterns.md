# UI Patterns

This document captures reusable UI patterns and styling guidelines for consistency across the application.

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

### Key Design Tokens

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

### Usage Examples

- **Transactions page**: Month navigation (`January 2026`)
- **Dashboard**: Year navigation (`2026`)

### Accessibility

- Buttons should have `type="button"` on web
- Use `TouchableOpacity` on mobile for proper touch feedback
- Icons should be semantic (chevron-back/chevron-forward)
