/**
 * MonthNavigator Component
 *
 * Month navigation control with prev/next buttons and month/year display.
 * Uses filter-utils for consistent month handling (1-12 indexing).
 *
 * Features:
 * - Previous/Next month navigation buttons
 * - Month label display using filter-utils.getMonthLabel()
 * - Optional visibility control (hide when custom date filter active)
 * - Card-style design matching existing patterns
 * - Theme-aware styling
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme, useTheme } from '@cashmgr/ui';
import { getMonthLabel } from '@cashmgr/core';

export interface MonthNavigatorProps {
  /**
   * Current month (1-12 indexing)
   */
  month: number;

  /**
   * Current year
   */
  year: number;

  /**
   * Callback when prev/next button is pressed
   */
  onNavigate: (direction: 'prev' | 'next') => void;

  /**
   * Optional visibility control
   * Set to false to hide when custom date filter is active
   */
  visible?: boolean;

  /**
   * Optional custom style
   */
  style?: ViewStyle;
}

/**
 * MonthNavigator - Month navigation component
 *
 * @example
 * ```tsx
 * <MonthNavigator
 *   month={state.currentMonth}
 *   year={state.currentYear}
 *   onNavigate={(direction) => dispatch({ type: 'NAVIGATE_MONTH', payload: direction })}
 *   visible={!state.startDate && !state.endDate}
 * />
 * ```
 */
export function MonthNavigator({
  month,
  year,
  onNavigate,
  visible = true,
  style,
}: MonthNavigatorProps) {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Get month label using filter-utils (consistent with 1-12 indexing)
  const monthLabel = React.useMemo(() => {
    return getMonthLabel(month, year, 'long');
  }, [month, year]);

  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => onNavigate('prev')}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.labelContainer}>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
      </View>

      <TouchableOpacity
        style={styles.navButton}
        onPress={() => onNavigate('next')}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    navButton: {
      padding: 4,
      borderRadius: 4,
    },
    labelContainer: {
      flex: 1,
      alignItems: 'center',
    },
    monthLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    } as TextStyle,
  });
}
