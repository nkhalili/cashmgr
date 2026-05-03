/**
 * MonthNavigator Component
 *
 * Displays current month/year with prev/next navigation buttons.
 * Extracted from Dashboard and Transactions screens for reuse.
 */

import React from 'react';
import { useTheme } from '@cashmgr/ui';

export interface MonthNavigatorProps {
  /** Current month label (e.g., "January 2024") */
  monthLabel: string;
  /** Handler for previous month */
  onPrevMonth: () => void;
  /** Handler for next month */
  onNextMonth: () => void;
  /** Additional styles */
  style?: React.CSSProperties;
}

/**
 * MonthNavigator - Month navigation with prev/next buttons
 *
 * @example
 * ```tsx
 * <MonthNavigator
 *   monthLabel="January 2024"
 *   onPrevMonth={() => dispatch({ type: 'NAVIGATE_MONTH', payload: 'prev' })}
 *   onNextMonth={() => dispatch({ type: 'NAVIGATE_MONTH', payload: 'next' })}
 * />
 * ```
 */
export function MonthNavigator({
  monthLabel,
  onPrevMonth,
  onNextMonth,
  style,
}: MonthNavigatorProps) {
  const theme = useTheme();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.components.interactiveRadius,
        padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
        ...style,
      }}
    >
      <button
        type="button"
        onClick={onPrevMonth}
        aria-label="Previous month"
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
        {monthLabel}
      </span>
      <button
        type="button"
        onClick={onNextMonth}
        aria-label="Next month"
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
  );
}
