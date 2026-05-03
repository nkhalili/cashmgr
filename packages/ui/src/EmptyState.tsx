import React from 'react';
import { useTheme } from './theme';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  style,
}) => {
  const theme = useTheme();

  return (
    <div
      style={{
        borderRadius: theme.radii.lg,
        padding: theme.spacing.xl,
        background: theme.gradients.surface,
        border: `1px dashed ${theme.colors.border}`,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: theme.spacing.md,
        color: theme.colors.textSecondary,
        fontFamily: theme.fontFamily,
        ...style,
      }}
    >
      {icon && (
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: theme.radii.lg,
            background: theme.colors.surface,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: theme.shadows.soft,
            color: theme.colors.primary,
          }}
        >
          {icon}
        </div>
      )}
      <div
        style={{
          fontSize: theme.typography.h4.fontSize,
          fontWeight: theme.typography.h4.fontWeight,
          color: theme.colors.textPrimary,
        }}
      >
        {title}
      </div>
      {description && (
        <p
          style={{
            margin: 0,
            maxWidth: 420,
            color: theme.colors.textSecondary,
            fontSize: theme.typography.body.fontSize,
          }}
        >
          {description}
        </p>
      )}
      <div
        style={{
          display: 'flex',
          gap: theme.spacing.sm,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {action}
        {secondaryAction}
      </div>
    </div>
  );
};
