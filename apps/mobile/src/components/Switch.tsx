import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Theme, useTheme } from '@cashmgr/ui';

interface SwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

/**
 * iOS-style on/off switch for mobile.
 * Mirrors the web Switch component (packages/ui/src/Switch.tsx) in
 * dimensions and behavior. See docs/ui-patterns.md for the pattern.
 */
export function Switch({ value, onChange, label, helperText, disabled = false }: SwitchProps) {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const track = (
    <View
      style={[
        styles.track,
        { backgroundColor: value ? theme.colors.primary : theme.colors.border },
        disabled && styles.disabled,
      ]}
    >
      <View style={[styles.thumb, { alignSelf: value ? 'flex-end' : 'flex-start' }]} />
    </View>
  );

  if (!label && !helperText) {
    return (
      <TouchableOpacity onPress={() => onChange(!value)} activeOpacity={0.7} disabled={disabled}>
        {track}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onChange(!value)}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <View style={{ flex: 1 }}>
        {label && <Text style={[styles.label, { marginBottom: helperText ? 2 : 0 }]}>{label}</Text>}
        {helperText && <Text style={styles.helperText}>{helperText}</Text>}
      </View>
      {track}
    </TouchableOpacity>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    label: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.textPrimary,
    },
    helperText: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.textSecondary,
    },
    track: {
      width: 44,
      height: 26,
      borderRadius: 13,
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    thumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#fff',
    },
    disabled: {
      opacity: 0.5,
    },
  });
}
