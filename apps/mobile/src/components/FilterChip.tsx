/**
 * FilterChip Component
 *
 * Displays a filter chip with label and optional clear button.
 * Used for showing active filters in a compact, dismissible format.
 *
 * Features:
 * - Active/inactive states with different styling
 * - Optional clear button (× icon)
 * - Customizable max width with ellipsis
 * - Theme-aware colors
 * - Press handler for opening filter modal
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme, useTheme } from '@cashmgr/ui';

export interface FilterChipProps {
  /**
   * Display label for the filter
   */
  label: string;

  /**
   * Whether this filter is currently active (has a value)
   */
  isActive: boolean;

  /**
   * Callback when chip is pressed (opens filter modal)
   */
  onPress: () => void;

  /**
   * Optional callback when clear button is pressed
   * If provided, shows a clear (×) button
   */
  onClear?: () => void;

  /**
   * Optional maximum width for the chip
   * Text will be truncated with ellipsis if it exceeds this width
   */
  maxWidth?: number;
}

/**
 * FilterChip - Filter display chip component
 *
 * @example
 * ```tsx
 * <FilterChip
 *   label="Type: Expense"
 *   isActive={true}
 *   onPress={() => setShowTypeModal(true)}
 *   onClear={() => dispatch({ type: 'SET_TYPE', payload: '' })}
 * />
 * ```
 */
export function FilterChip({
  label,
  isActive,
  onPress,
  onClear,
  maxWidth = 200,
}: FilterChipProps) {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, { maxWidth }]}>
      <TouchableOpacity
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.label, isActive && styles.labelActive]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {label}
        </Text>

        {isActive && onClear && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={(e) => {
              e.stopPropagation();
              onClear();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flexShrink: 1,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 6,
    },
    chipActive: {
      backgroundColor: `${theme.colors.primary}15`,
      borderColor: theme.colors.primary,
    },
    label: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      flexShrink: 1,
    } as TextStyle,
    labelActive: {
      color: theme.colors.primary,
      fontWeight: '500',
    } as TextStyle,
    clearButton: {
      marginLeft: 4,
      flexShrink: 0,
    },
  });
}
