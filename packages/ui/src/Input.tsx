import React from 'react';
import { useTheme } from './theme';

export interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'email' | 'password';
  disabled?: boolean;
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  required?: boolean; // F-026: Show asterisk and mark as required
  onBlur?: () => void; // F-026: Validation trigger
}

export const Input: React.FC<InputProps> = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  label,
  error,
  helperText,
  icon,
  style,
  required = false,
  onBlur,
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = React.useState(false);

  const borderColor = error
    ? theme.colors.danger
    : isFocused
    ? theme.colors.primary
    : theme.colors.border;

  // F-026: Generate unique ID for ARIA attributes
  const inputId = React.useId();
  const errorId = `${inputId}-error`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs, ...style }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontFamily: theme.fontFamily,
            fontSize: theme.typography.caption.fontSize,
            color: error ? theme.colors.danger : theme.colors.textSecondary,
            fontWeight: 500,
          }}
        >
          {label}
          {required && <span style={{ color: theme.colors.danger, marginLeft: 4 }}>*</span>}
        </label>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderRadius: theme.components.interactiveRadius,
          border: `1px solid ${borderColor}`,
          background: disabled ? theme.colors.surfaceMuted : theme.colors.surface,
          paddingLeft: icon ? theme.spacing.md : theme.spacing.sm,
          paddingRight: theme.spacing.sm,
          boxShadow: isFocused ? `${theme.shadows.soft}, 0 0 0 3px ${theme.colors.primarySoft}` : 'none',
          transition: `border-color ${theme.motion.quick}, box-shadow ${theme.motion.quick}`,
        }}
      >
        {icon && (
          <span style={{ marginRight: theme.spacing.sm, color: theme.colors.textSecondary }}>{icon}</span>
        )}
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: theme.fontFamily,
            fontSize: theme.typography.body.fontSize,
            height: theme.components.inputHeight,
            color: theme.colors.textPrimary,
          }}
        />
      </div>
      {(helperText || error) && (
        <span
          id={error ? errorId : undefined}
          role={error ? 'alert' : undefined}
          style={{
            fontSize: theme.typography.caption.fontSize,
            color: error ? theme.colors.danger : theme.colors.textSecondary,
          }}
        >
          {error ?? helperText}
        </span>
      )}
    </div>
  );
};
