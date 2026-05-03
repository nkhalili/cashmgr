/**
 * SummaryCard Component
 *
 * Displays financial summary metrics (income, expense, net) in a card layout.
 * Extracted from Dashboard and Transactions screens for reuse across the app.
 *
 * Features:
 * - Flexible layout (horizontal or vertical)
 * - Color-coded values (green for income, red for expense, primary for net)
 * - Formatted currency display
 * - Theme-aware styling
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@cashmgr/ui';
import { formatCurrency } from '@cashmgr/core';

export interface SummaryItem {
  label: string;
  value: number;
  type?: 'income' | 'expense' | 'net' | 'default';
}

export interface SummaryCardProps {
  items: SummaryItem[];
  currency?: string;
  layout?: 'horizontal' | 'vertical';
  style?: ViewStyle;
}

/**
 * SummaryCard - Display financial summary metrics
 *
 * @example
 * ```tsx
 * <SummaryCard
 *   items={[
 *     { label: 'Income', value: 5000, type: 'income' },
 *     { label: 'Expense', value: 3000, type: 'expense' },
 *     { label: 'Net', value: 2000, type: 'net' },
 *   ]}
 *   currency="USD"
 *   layout="horizontal"
 * />
 * ```
 */
export function SummaryCard({
  items,
  currency = 'USD',
  layout = 'horizontal',
  style,
}: SummaryCardProps) {
  const theme = useTheme();

  /**
   * Get color for value based on type
   */
  const getValueColor = (type: SummaryItem['type']) => {
    switch (type) {
      case 'income':
        return theme.colors.success;
      case 'expense':
        return theme.colors.danger;
      case 'net':
        return theme.colors.primary;
      default:
        return theme.colors.textPrimary;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
        layout === 'horizontal' ? styles.horizontalLayout : styles.verticalLayout,
        style,
      ]}
    >
      {items.map((item, index) => (
        <View
          key={item.label}
          style={[
            styles.item,
            layout === 'horizontal' && index < items.length - 1 && styles.horizontalDivider,
            layout === 'horizontal' && {
              borderRightColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            {item.label}
          </Text>
          <Text
            style={[
              styles.value,
              { color: getValueColor(item.type) },
            ]}
          >
            {formatCurrency(item.value, currency)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  horizontalLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  verticalLayout: {
    flexDirection: 'column',
    gap: 16,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  horizontalDivider: {
    borderRightWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
  },
});
