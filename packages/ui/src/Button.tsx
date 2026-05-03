import React from 'react';
import { useTheme } from './theme';
import type { Theme } from './theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: React.CSSProperties;
}

const VARIANT_TOKENS: Record<
  ButtonVariant,
  (theme: Theme) => {
    background: string;
    color: string;
    border: string;
    hoverBackground: string;
    hoverColor?: string;
    focusRing: string;
  }
> = {
  primary: (theme) => ({
    background: theme.colors.primary,
    color: '#ffffff',
    border: 'transparent',
    hoverBackground: theme.colors.secondary,
    focusRing: `0 0 0 3px ${theme.colors.primarySoft}`,
  }),
  secondary: (theme) => ({
    background: theme.colors.secondarySoft,
    color: theme.colors.secondary,
    border: 'transparent',
    hoverBackground:
      theme.mode === 'light' ? theme.colors.surfaceMuted : theme.colors.secondarySoft,
    hoverColor: theme.colors.textPrimary,
    focusRing: `0 0 0 3px ${theme.colors.secondarySoft}`,
  }),
  ghost: (theme) => ({
    background: 'transparent',
    color: theme.colors.textPrimary,
    border: theme.colors.border,
    hoverBackground:
      theme.mode === 'light' ? 'rgba(47,125,104,0.08)' : 'rgba(103,194,168,0.08)',
    focusRing: `0 0 0 3px ${theme.colors.primarySoft}`,
  }),
  danger: (theme) => ({
    background: theme.colors.danger,
    color: '#ffffff',
    border: 'transparent',
    hoverBackground: theme.mode === 'light' ? '#b85454' : '#ff7d7d',
    focusRing: `0 0 0 3px rgba(201, 104, 104, 0.35)`,
  }),
};

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  style,
}) => {
  const theme = useTheme();
  const tokens = VARIANT_TOKENS[variant](theme);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const iconSpacing = theme.spacing.xs;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: icon ? iconSpacing : 0,
        minHeight: theme.components.buttonHeight,
        padding: `${theme.spacing.xs}px ${theme.spacing.lg}px`,
        width: fullWidth ? '100%' : undefined,
        borderRadius: theme.components.interactiveRadius,
        fontFamily: theme.fontFamily,
        fontSize: theme.typography.body.fontSize,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: tokens.border === 'transparent' ? 'none' : `1px solid ${tokens.border}`,
        background: isHovered ? tokens.hoverBackground : tokens.background,
        color: isHovered && tokens.hoverColor ? tokens.hoverColor : tokens.color,
        boxShadow: disabled
          ? 'none'
          : isFocused
          ? `${theme.shadows.soft}, ${tokens.focusRing}`
          : theme.shadows.soft,
        opacity: disabled ? 0.65 : 1,
        transition: `background-color ${theme.motion.standard}, transform ${theme.motion.quick}, box-shadow ${theme.motion.quick}`,
        transform: disabled ? 'none' : isHovered ? 'translateY(-1px)' : 'translateY(0)',
        ...style,
      }}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      {icon && iconPosition === 'left' && <span>{icon}</span>}
      <span style={{ fontFeatureSettings: '"tnum" 1, "lnum" 1' }}>{children}</span>
      {icon && iconPosition === 'right' && <span>{icon}</span>}
    </button>
  );
};
