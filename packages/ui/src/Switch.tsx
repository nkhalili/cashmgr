import React from 'react';
import { useTheme } from './theme';

export interface SwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 26;
const THUMB_SIZE = 20;

/**
 * iOS-style on/off switch for web.
 * Mirrors the mobile Switch component (apps/mobile/src/components/Switch.tsx)
 * in dimensions and behavior. See docs/ui-patterns.md for the pattern.
 */
export const Switch: React.FC<SwitchProps> = ({
  value,
  onChange,
  label,
  helperText,
  disabled = false,
  style,
}) => {
  const theme = useTheme();
  const switchId = React.useId();

  const track = (
    <button
      type="button"
      role="switch"
      id={switchId}
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      style={{
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
        borderRadius: TRACK_HEIGHT / 2,
        border: 'none',
        padding: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: value ? 'flex-end' : 'flex-start',
        backgroundColor: value ? theme.colors.primary : theme.colors.border,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: `background-color ${theme.motion.quick}`,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: THUMB_SIZE / 2,
          backgroundColor: '#fff',
          display: 'block',
        }}
      />
    </button>
  );

  if (!label && !helperText) {
    return track;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
        ...style,
      }}
    >
      <label
        htmlFor={switchId}
        style={{ flex: 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        {label && (
          <div style={{ fontSize: theme.typography.body.fontSize, color: theme.colors.textPrimary }}>
            {label}
          </div>
        )}
        {helperText && (
          <div style={{ fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary, marginTop: 2 }}>
            {helperText}
          </div>
        )}
      </label>
      {track}
    </div>
  );
};
