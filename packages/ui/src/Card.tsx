import React from 'react';
import { useTheme } from './theme';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  style?: React.CSSProperties;
  footer?: React.ReactNode;
  onClick?: () => void;
  withSurfaceGradient?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  tone = 'default',
  style,
  footer,
  onClick,
  withSurfaceGradient = false,
}) => {
  const theme = useTheme();

  const toneAccent =
    tone === 'default'
      ? theme.colors.primarySoft
      : {
          success: theme.colors.success,
          warning: theme.colors.warning,
          danger: theme.colors.danger,
        }[tone];

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: theme.radii.lg,
        padding: theme.spacing.lg,
        background: withSurfaceGradient ? theme.gradients.surface : theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadows.soft,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.md,
        cursor: onClick ? 'pointer' : 'default',
        transition: `transform ${theme.motion.standard}, box-shadow ${theme.motion.standard}`,
        color: theme.colors.textPrimary,
        ...style,
      }}
      onMouseEnter={(event) => {
        if (!onClick) return;
        event.currentTarget.style.transform = 'translateY(-2px)';
        event.currentTarget.style.boxShadow = theme.shadows.medium;
      }}
      onMouseLeave={(event) => {
        if (!onClick) return;
        event.currentTarget.style.transform = 'translateY(0)';
        event.currentTarget.style.boxShadow = theme.shadows.soft;
      }}
    >
      {(title || subtitle) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
          {title && (
            <div
              style={{
                ...theme.typography.h3,
                fontFamily: theme.fontFamily,
                color: theme.colors.textPrimary,
                margin: 0,
              }}
            >
              {title}
            </div>
          )}
          {subtitle && (
            <div
              style={{
                ...theme.typography.caption,
                fontFamily: theme.fontFamily,
                color: theme.colors.textSecondary,
              }}
            >
              {subtitle}
            </div>
          )}
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: theme.radii.xs,
              background: toneAccent,
            }}
          />
        </div>
      )}
      <div style={{ flex: 1 }}>{children}</div>
      {footer && (
        <div
          style={{
            borderTop: `1px solid ${theme.colors.border}`,
            paddingTop: theme.spacing.md,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
};
