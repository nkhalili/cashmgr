import React from 'react';
import { useTheme } from './theme';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({ label, tone = 'neutral', icon, style }) => {
  const theme = useTheme();

  const toneStyles: Record<BadgeTone, { background: string; color: string }> = {
    neutral: { background: theme.colors.surfaceMuted, color: theme.colors.textSecondary },
    success: { background: `${theme.colors.success}1a`, color: theme.colors.success },
    warning: { background: `${theme.colors.warning}1a`, color: theme.colors.warning },
    danger: { background: `${theme.colors.danger}1a`, color: theme.colors.danger },
    accent: { background: theme.colors.primarySoft, color: theme.colors.primary },
  };

  const palette = toneStyles[tone];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: theme.spacing.xs,
        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
        borderRadius: theme.radii.pill,
        fontFamily: theme.fontFamily,
        fontSize: theme.typography.caption.fontSize,
        fontWeight: 600,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        background: palette.background,
        color: palette.color,
        ...style,
      }}
    >
      {icon}
      {label}
    </span>
  );
};
