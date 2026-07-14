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

---

## Grouped List with Section Totals

Used on the Accounts page to split a flat list into labelled sections, each showing an aggregate total. Apply this pattern whenever a list of items naturally belongs to a small number of mutually exclusive categories and a per-category aggregate is meaningful.

### Layout

```text
┌─────────────────────────────────────────┐
│  Bank Accounts              $4,200.00   │  ← section header (label + total)
│  ─────────────────────────────────────  │
│  Chequing                     $3,200.00 │
│  Savings                      $1,000.00 │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Credit Cards               -$350.00   │  ← total red when negative
│  ─────────────────────────────────────  │
│  Visa                         -$350.00  │
└─────────────────────────────────────────┘
```

- Section header: group label left-aligned, aggregate total right-aligned
- Header separated from items by a 1px border
- Total colour: `theme.colors.danger` when the aggregate is negative, `theme.colors.textPrimary` otherwise
- Empty sections are hidden — do not render a header with no items

### Total Calculation

Totals are converted to the primary currency using stored exchange rates. If no primary currency is set (currencies not yet loaded), totals fall back to per-currency strings joined with ` + `.

```typescript
function getGroupTotal(accounts: Account[], currencies: Currency[]): { formatted: string; isNegative: boolean } {
  const primary = currencies.find((c) => c.isPrimary);
  if (!primary) {
    const totals: Record<string, number> = {};
    for (const account of accounts) {
      totals[account.currency] = (totals[account.currency] ?? 0) + account.balance;
    }
    return {
      formatted: Object.entries(totals)
        .map(([currency, total]) => formatCurrency(total, currency))
        .join(' + '),
      isNegative: Object.values(totals).every((v) => v < 0),
    };
  }
  const rateMap = new Map(currencies.map((c) => [c.id, c.exchangeRate]));
  let total = 0;
  for (const account of accounts) {
    total += account.balance * (rateMap.get(account.currency) ?? 1);
  }
  return { formatted: formatCurrency(total, primary.id), isNegative: total < 0 };
}
```

### Web Section Header

```tsx
<div
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottom: `1px solid ${theme.colors.border}`,
  }}
>
  <span style={{ fontSize: theme.typography.h3.fontSize, fontWeight: theme.typography.h3.fontWeight, color: theme.colors.textPrimary }}>
    {group.label}
  </span>
  <span style={{ fontSize: theme.typography.body.fontSize, fontWeight: 600, color: groupTotal.isNegative ? theme.colors.danger : theme.colors.textPrimary }}>
    {groupTotal.formatted}
  </span>
</div>
```

### Mobile Section Header (SectionList)

```tsx
const renderSectionHeader = ({ section }: { section: { label: string; total: string; isNegative: boolean } }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionHeaderLabel}>{section.label}</Text>
    <Text style={[styles.sectionHeaderTotal, section.isNegative && styles.sectionHeaderTotalNegative]}>
      {section.total}
    </Text>
  </View>
);
```

Use `SectionList` with `stickySectionHeadersEnabled={false}` so headers scroll with the content.

### Design Tokens

| Element | Property | Value |
| --- | --- | --- |
| Header border | `borderBottom` | `1px solid theme.colors.border` |
| Label font size | `fontSize` | `theme.typography.h3.fontSize` |
| Label font weight | `fontWeight` | `theme.typography.h3.fontWeight` |
| Total font size | `fontSize` | `theme.typography.body.fontSize` |
| Total font weight | `fontWeight` | `600` |
| Total colour (positive) | `color` | `theme.colors.textPrimary` |
| Total colour (negative) | `color` | `theme.colors.danger` |

### Usage Examples

- **Accounts page**: Cash / Bank Accounts / Credit Cards

### Credit Account Sub-lines

When the "show balance payable / outstanding balance" setting is on, credit-type rows show two extra lines below the currency (in the `subtitle` slot on web, as extra `Text` lines under the account name on mobile) whenever `statementDay` is configured for that account:

```text
Visa
USD
Outstanding: $850.25
Payable by 2026-02-05: $600.00
```

Sourced from `calculateCreditAccountSummary` (`@cashmgr/core`) via each app's `getCreditAccountSummaries` helper (`apps/{web,mobile}/src/services/credit-account-summary.ts`). Omit the sub-lines entirely for accounts without `statementDay` set — no forced setup nagging.

---

## Switch (iOS-style on/off toggle)

A pill-shaped on/off toggle, used for boolean settings (e.g. "Make recurring", credit account auto-payment, the "show balance payable" setting).

### Switch Visual Design

```text
Label                    ( ⚪────)   off: track = theme.colors.border
Helper text               (────⚪ )   on:  track = theme.colors.primary
```

- Track: 44×26px, fully rounded (`borderRadius: 13`)
- Thumb: 20×20px circle, white, 3px inset from the track edge, slides to the far side based on state
- Label + helper text (optional) sit to the left, track to the right, row spread with `justify-content: space-between`

### Switch Design Tokens

| Element | Property | Value |
| --- | --- | --- |
| Track width / height | — | 44px / 26px |
| Track border radius | `borderRadius` | 13px (half of height) |
| Track color (on) | `backgroundColor` | `theme.colors.primary` |
| Track color (off) | `backgroundColor` | `theme.colors.border` |
| Thumb size | — | 20×20px |
| Thumb color | `backgroundColor` | `#fff` |
| Label font size | `fontSize` | `theme.typography.body.fontSize` |
| Helper text font size | `fontSize` | `theme.typography.caption.fontSize` |

### Switch Usage

```tsx
// Web — from @cashmgr/ui
import { Switch } from '@cashmgr/ui';

<Switch
  value={autoPaymentEnabled}
  onChange={setAutoPaymentEnabled}
  label="Auto payment"
  helperText="Automatically pay from the payment account on the due date"
/>
```

```tsx
// Mobile — apps/mobile/src/components/Switch.tsx
import { Switch } from '../src/components/Switch';

<Switch
  value={autoPaymentEnabled}
  onChange={setAutoPaymentEnabled}
  label="Auto payment"
  helperText="Automatically pay from the payment account on the due date"
/>
```

Omit `label`/`helperText` to render just the bare track (e.g. inline in a row you've already labelled yourself).

### Switch Usage Examples

- **Add/Edit Transaction**: "Make recurring"
- **Add/Edit Account**: "Auto payment" (credit accounts)
- **Settings › Appearance**: "Show balance payable / outstanding balance"
