import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextStyle,
} from 'react-native';
import { Theme, useTheme } from '@cashmgr/ui';
import { validateAndCorrectDate } from '@cashmgr/core';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DateInputProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

/**
 * Get days in month
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the day of week for the first day of month (0 = Sunday)
 */
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/**
 * DateInput component for mobile
 * Provides text input with calendar modal picker
 */
export function DateInput({
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  label,
  error,
  disabled = false,
}: DateInputProps) {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [modalVisible, setModalVisible] = React.useState(false);
  const [textValue, setTextValue] = React.useState(value);

  // Calendar state
  const today = new Date();
  const [viewYear, setViewYear] = React.useState(() => {
    if (value) {
      const parsed = value.split('-');
      if (parsed.length === 3) return parseInt(parsed[0], 10);
    }
    return today.getFullYear();
  });
  const [viewMonth, setViewMonth] = React.useState(() => {
    if (value) {
      const parsed = value.split('-');
      if (parsed.length === 3) return parseInt(parsed[1], 10) - 1;
    }
    return today.getMonth();
  });

  // Sync textValue with value prop
  React.useEffect(() => {
    setTextValue(value);
  }, [value]);

  // Update calendar view when value changes
  React.useEffect(() => {
    if (value) {
      const parsed = value.split('-');
      if (parsed.length === 3) {
        setViewYear(parseInt(parsed[0], 10));
        setViewMonth(parseInt(parsed[1], 10) - 1);
      }
    }
  }, [value]);

  const handleTextChange = (text: string) => {
    setTextValue(text);
    // Only update parent if it looks like a complete date
    if (text.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const corrected = validateAndCorrectDate(text);
      if (corrected && corrected !== text) {
        setTextValue(corrected);
      }
      onChange(corrected || text);
    }
  };

  const handleTextBlur = () => {
    const corrected = validateAndCorrectDate(textValue);
    if (corrected && corrected !== textValue) {
      setTextValue(corrected);
      onChange(corrected);
    } else if (textValue && !corrected) {
      onChange(textValue);
    }
  };

  const handleDayPress = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setTextValue(dateStr);
    onChange(dateStr);
    setModalVisible(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear(viewYear - 1);
      } else {
        setViewMonth(viewMonth - 1);
      }
    } else {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear(viewYear + 1);
      } else {
        setViewMonth(viewMonth + 1);
      }
    }
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    setViewYear(viewYear + (direction === 'prev' ? -1 : 1));
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfMonth(viewYear, viewMonth);
  const calendarDays: (number | null)[] = [];

  // Add empty cells for days before the first day of month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Parse selected date for highlighting
  const selectedYear = value ? parseInt(value.split('-')[0], 10) : null;
  const selectedMonth = value ? parseInt(value.split('-')[1], 10) - 1 : null;
  const selectedDay = value ? parseInt(value.split('-')[2], 10) : null;

  const isToday = (day: number) =>
    viewYear === today.getFullYear() &&
    viewMonth === today.getMonth() &&
    day === today.getDate();

  const isSelected = (day: number) =>
    viewYear === selectedYear &&
    viewMonth === selectedMonth &&
    day === selectedDay;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        <TextInput
          style={styles.input}
          value={textValue}
          onChangeText={handleTextChange}
          onBlur={handleTextBlur}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
        />
        <TouchableOpacity
          style={styles.calendarButton}
          onPress={() => setModalVisible(true)}
          disabled={disabled}
        >
          <Text style={styles.calendarIcon}>📅</Text>
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Calendar Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              {/* Year Navigation */}
              <View style={styles.yearNavRow}>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => navigateYear('prev')}
                >
                  <Text style={styles.navButtonText}>{'«'}</Text>
                </TouchableOpacity>
                <Text style={styles.yearText}>{viewYear}</Text>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => navigateYear('next')}
                >
                  <Text style={styles.navButtonText}>{'»'}</Text>
                </TouchableOpacity>
              </View>

              {/* Month Navigation */}
              <View style={styles.monthNavRow}>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => navigateMonth('prev')}
                >
                  <Text style={styles.navButtonText}>{'‹'}</Text>
                </TouchableOpacity>
                <Text style={styles.monthText}>{MONTHS[viewMonth]}</Text>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => navigateMonth('next')}
                >
                  <Text style={styles.navButtonText}>{'›'}</Text>
                </TouchableOpacity>
              </View>

              {/* Day Headers */}
              <View style={styles.dayHeaderRow}>
                {DAYS.map((day) => (
                  <Text key={day} style={styles.dayHeader}>
                    {day}
                  </Text>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {calendarDays.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCell,
                      day && isToday(day) ? styles.todayCell : undefined,
                      day && isSelected(day) ? styles.selectedCell : undefined,
                    ]}
                    onPress={() => day && handleDayPress(day)}
                    disabled={!day}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        day && isToday(day) ? styles.todayText : undefined,
                        day && isSelected(day) ? styles.selectedText : undefined,
                      ]}
                    >
                      {day || ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Today Button */}
              <TouchableOpacity
                style={styles.todayButton}
                onPress={() => {
                  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  setTextValue(todayStr);
                  onChange(todayStr);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>

              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const fontWeight = (weight: number): TextStyle['fontWeight'] =>
  `${weight}` as TextStyle['fontWeight'];

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.xs,
    },
    label: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
      fontWeight: fontWeight(500),
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
    },
    inputError: {
      borderColor: theme.colors.danger,
    },
    input: {
      flex: 1,
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textPrimary,
      paddingVertical: theme.spacing.sm,
    },
    calendarButton: {
      padding: theme.spacing.xs,
    },
    calendarIcon: {
      fontSize: 20,
    },
    errorText: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.danger,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
      width: 320,
      maxWidth: '90%',
    },
    yearNavRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    yearText: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textPrimary,
    },
    monthNavRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    monthText: {
      fontSize: theme.typography.h4.fontSize,
      fontWeight: fontWeight(500),
      color: theme.colors.textPrimary,
    },
    navButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
    navButtonText: {
      fontSize: 16,
      fontWeight: fontWeight(600),
      color: theme.colors.primary,
    },
    dayHeaderRow: {
      flexDirection: 'row',
      marginBottom: theme.spacing.xs,
    },
    dayHeader: {
      flex: 1,
      textAlign: 'center',
      fontSize: theme.typography.caption.fontSize,
      fontWeight: fontWeight(600),
      color: theme.colors.textSecondary,
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '14.28%',
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: theme.radii.md,
    },
    todayCell: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    selectedCell: {
      backgroundColor: theme.colors.primary,
    },
    dayText: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textPrimary,
    },
    todayText: {
      color: theme.colors.primary,
      fontWeight: fontWeight(600),
    },
    selectedText: {
      color: '#fff',
      fontWeight: fontWeight(600),
    },
    todayButton: {
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radii.md,
    },
    todayButtonText: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: fontWeight(500),
      color: theme.colors.primary,
    },
    closeButton: {
      marginTop: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
    },
    closeButtonText: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textSecondary,
    },
  });
