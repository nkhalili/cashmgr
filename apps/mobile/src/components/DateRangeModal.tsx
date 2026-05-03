/**
 * DateRangeModal Component
 *
 * Modal for selecting a custom date range.
 * Uses the existing DateInput component for each date field.
 *
 * Features:
 * - Start and end date inputs with calendar pickers
 * - Apply/Cancel actions
 * - Manages temporary state internally before applying
 * - Theme-aware styling
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  TextStyle,
} from 'react-native';
import { Theme, useTheme } from '@cashmgr/ui';
import { DateInput } from './DateInput';

export interface DateRangeModalProps {
  /**
   * Controls modal visibility
   */
  visible: boolean;

  /**
   * Start date value (YYYY-MM-DD)
   */
  startDate: string;

  /**
   * End date value (YYYY-MM-DD)
   */
  endDate: string;

  /**
   * Callback when start date changes
   */
  onStartDateChange: (date: string) => void;

  /**
   * Callback when end date changes
   */
  onEndDateChange: (date: string) => void;

  /**
   * Callback when Apply is pressed
   */
  onApply: () => void;

  /**
   * Callback when Cancel is pressed or backdrop dismissed
   */
  onClose: () => void;
}

/**
 * DateRangeModal - Date range selection modal
 *
 * @example
 * ```tsx
 * const [tempStart, setTempStart] = useState('');
 * const [tempEnd, setTempEnd] = useState('');
 *
 * <DateRangeModal
 *   visible={showDateModal}
 *   startDate={tempStart}
 *   endDate={tempEnd}
 *   onStartDateChange={setTempStart}
 *   onEndDateChange={setTempEnd}
 *   onApply={() => {
 *     dispatch({ type: 'SET_DATE_RANGE', payload: { startDate: tempStart, endDate: tempEnd } });
 *     setShowDateModal(false);
 *   }}
 *   onClose={() => setShowDateModal(false)}
 * />
 * ```
 */
export function DateRangeModal({
  visible,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
  onClose,
}: DateRangeModalProps) {
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
            <Text style={styles.title}>Select Date Range</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.dateInputContainer}>
              <Text style={styles.label}>Start Date</Text>
              <DateInput
                value={startDate}
                onChange={onStartDateChange}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.dateInputContainer}>
              <Text style={styles.label}>End Date</Text>
              <DateInput
                value={endDate}
                onChange={onEndDateChange}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.applyButton]}
              onPress={onApply}
            >
              <Text style={[styles.buttonText, styles.applyButtonText]}>Apply</Text>
            </TouchableOpacity>
          </View>
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
    content: {
      padding: 20,
    },
    dateInputContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.textSecondary,
      marginBottom: 8,
    } as TextStyle,
    actions: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    button: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    applyButton: {
      backgroundColor: theme.colors.primary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '500',
    } as TextStyle,
    cancelButtonText: {
      color: theme.colors.textSecondary,
    } as TextStyle,
    applyButtonText: {
      color: '#fff',
    } as TextStyle,
  });
}
