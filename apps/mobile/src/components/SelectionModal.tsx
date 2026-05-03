/**
 * SelectionModal Component
 *
 * Generic modal for selecting items from a list.
 * Replaces duplicated modal implementations for type/account/category selection.
 *
 * Features:
 * - Generic type parameter for flexibility
 * - Scrollable option list
 * - Selected item highlighting with checkmark
 * - Theme-aware styling
 * - Backdrop dismissal
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme, useTheme } from '@cashmgr/ui';

export interface SelectionModalProps<T = string> {
  /**
   * Controls modal visibility
   */
  visible: boolean;

  /**
   * Modal title displayed at the top
   */
  title: string;

  /**
   * List of options to display
   */
  options: Array<{ label: string; value: T }>;

  /**
   * Currently selected value
   */
  selectedValue: T;

  /**
   * Callback when an option is selected
   */
  onSelect: (value: T) => void;

  /**
   * Callback when modal is closed (backdrop press or selection)
   */
  onClose: () => void;
}

/**
 * SelectionModal - Generic selection modal component
 *
 * @example
 * ```tsx
 * <SelectionModal
 *   visible={showTypeModal}
 *   title="Select Type"
 *   options={[
 *     { label: 'All Types', value: '' },
 *     { label: 'Income', value: 'income' },
 *     { label: 'Expense', value: 'expense' },
 *   ]}
 *   selectedValue={filterType}
 *   onSelect={(value) => {
 *     setFilterType(value);
 *     setShowTypeModal(false);
 *   }}
 *   onClose={() => setShowTypeModal(false)}
 * />
 * ```
 */
export function SelectionModal<T = string>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: SelectionModalProps<T>) {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
          </View>

          <ScrollView style={styles.optionsList}>
            {options.map((option, index) => {
              const isSelected = option.value === selectedValue;

              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={theme.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      maxHeight: '70%',
      width: '100%',
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    header: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      textAlign: 'center',
    } as TextStyle,
    optionsList: {
      maxHeight: 400,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    optionSelected: {
      backgroundColor: `${theme.colors.primary}15`,
    },
    optionText: {
      fontSize: 16,
      color: theme.colors.textPrimary,
      flex: 1,
    } as TextStyle,
    optionTextSelected: {
      color: theme.colors.primary,
      fontWeight: '500',
    } as TextStyle,
  });
}
