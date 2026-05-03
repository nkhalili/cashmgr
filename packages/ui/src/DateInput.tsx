import React from 'react';
import { useTheme } from './theme';
import { validateAndCorrectDate } from '@cashmgr/core';

export interface DateInputProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  helperText?: string;
  style?: React.CSSProperties;
  required?: boolean;
  onBlur?: () => void;
  min?: string; // YYYY-MM-DD format
  max?: string; // YYYY-MM-DD format
}

/**
 * DateInput component for web/desktop
 * Provides both calendar picker and text input with validation
 */
export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  disabled = false,
  label,
  error,
  helperText,
  style,
  required = false,
  onBlur,
  min,
  max,
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = React.useState(false);
  const [textValue, setTextValue] = React.useState(value);
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  // Sync textValue with value prop
  React.useEffect(() => {
    setTextValue(value);
  }, [value]);

  const borderColor = error
    ? theme.colors.danger
    : isFocused
      ? theme.colors.primary
      : theme.colors.border;

  const inputId = React.useId();
  const errorId = `${inputId}-error`;

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setTextValue(newValue);
    // Only update parent if it looks like a complete date
    if (newValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const corrected = validateAndCorrectDate(newValue);
      if (corrected && corrected !== newValue) {
        setTextValue(corrected);
      }
      onChange(corrected || newValue);
    }
  };

  const handleTextBlur = () => {
    setIsFocused(false);
    // Validate and correct on blur
    const corrected = validateAndCorrectDate(textValue);
    if (corrected && corrected !== textValue) {
      setTextValue(corrected);
      onChange(corrected);
    } else if (textValue && !corrected) {
      // Invalid date, keep the text but notify parent
      onChange(textValue);
    }
    onBlur?.();
  };

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setTextValue(newValue);
    onChange(newValue);
  };

  const openDatePicker = () => {
    dateInputRef.current?.showPicker();
  };

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
          paddingLeft: theme.spacing.sm,
          paddingRight: theme.spacing.xs,
          boxShadow: isFocused ? `${theme.shadows.soft}, 0 0 0 3px ${theme.colors.primarySoft}` : 'none',
          transition: `border-color ${theme.motion.quick}, box-shadow ${theme.motion.quick}`,
        }}
      >
        <input
          id={inputId}
          type="text"
          value={textValue}
          onChange={handleTextChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onFocus={() => setIsFocused(true)}
          onBlur={handleTextBlur}
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
        {/* Hidden date input for calendar picker */}
        <input
          ref={dateInputRef}
          type="date"
          value={value}
          onChange={handleDatePickerChange}
          disabled={disabled}
          min={min}
          max={max}
          style={{
            position: 'absolute',
            opacity: 0,
            width: 0,
            height: 0,
            pointerEvents: 'none',
          }}
          tabIndex={-1}
        />
        {/* Calendar button */}
        <button
          type="button"
          onClick={openDatePicker}
          disabled={disabled}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: theme.spacing.xs,
            borderRadius: theme.radii.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.textSecondary,
            transition: `background-color ${theme.motion.quick}`,
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = theme.colors.surfaceMuted;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label="Open calendar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
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
