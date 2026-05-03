/**
 * SummaryCard Component
 *
 * Displays financial summary metrics (income, expense, net, balance).
 * Extracted from Transactions screen for reuse.
 */

import React from 'react';
import { useTheme } from '@cashmgr/ui';
import { formatCurrency } from '@cashmgr/core';

export interface SummaryItem {
  label: string;
  value: number;
  type?: 'income' | 'expense' | 'net' | 'balance' | 'default';
}

// Export type for external use
export type SummaryItemType = SummaryItem['type'];

export interface SummaryCardProps {
  /** Array of summary items to display */
  items: SummaryItem[];
  /** Additional styles */
  style?: React.CSSProperties;
}

/**
 * SummaryCard - Display financial summary metrics
 *
 * @example
 * ```tsx
 * <SummaryCard
 *   items={[
 *     { label: 'Income', value: 5000, type: 'income' },
 *     { label: 'Expenses', value: 3000, type: 'expense' },
 *     { label: 'Net', value: 2000, type: 'net' },
 *   ]}
 * />
 * ```
 */
export function SummaryCard({ items, style }: SummaryCardProps) {
  const theme = useTheme();

  /**
   * Get color for value based on type
   */
  const getValueColor = (type: SummaryItem['type'], value: number) => {
    switch (type) {
      case 'income':
        return theme.colors.success;
      case 'expense':
        return theme.colors.danger;
      case 'net':
        return value > 0
          ? theme.colors.success
          : value < 0
          ? theme.colors.danger
          : theme.colors.textPrimary;
      case 'balance':
      case 'default':
      default:
        return theme.colors.textPrimary;
    }
  };

  /**
   * Format value with appropriate sign
   */
  const formatValue = (type: SummaryItem['type'], value: number) => {
    const formatted = formatCurrency(value);
    if (type === 'income') {
      return `+${formatted}`;
    }
    if (type === 'expense') {
      return `-${formatted}`;
    }
    if (type === 'net' && value >= 0) {
      return `+${formatted}`;
    }
    return formatted;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.components.interactiveRadius,
        padding: `${theme.spacing.md}px ${theme.spacing.lg}px`,
        ...style,
      }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}
        >
          <span
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.body.fontSize,
            }}
          >
            {item.label}:
          </span>
          <span
            style={{
              color: getValueColor(item.type, item.value),
              fontWeight: 600,
              fontSize: theme.typography.body.fontSize,
            }}
          >
            {formatValue(item.type, item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
