import React from 'react';
import { useTheme } from './theme';
import { Badge, BadgeTone } from './Badge';

export interface ListItemProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  icon?: React.ReactNode;
  badgeLabel?: string;
  badgeTone?: BadgeTone;
  onPress?: () => void;
  style?: React.CSSProperties;
  showDivider?: boolean;
  actions?: React.ReactNode; // F-027: Action buttons (Edit/Delete)
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  value,
  icon,
  badgeLabel,
  badgeTone = 'neutral',
  onPress,
  style,
  showDivider = true,
  actions,
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = React.useState(false);

  const interactive = Boolean(onPress);

  return (
    <div
      onClick={onPress}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: `${theme.spacing.md}px ${theme.spacing.sm}px`,
        gap: theme.spacing.md,
        borderBottom: showDivider ? `1px solid ${theme.colors.border}` : 'none',
        cursor: interactive ? 'pointer' : 'default',
        borderRadius: interactive ? theme.radii.md : undefined,
        background: isHovered && interactive ? theme.colors.surfaceMuted : 'transparent',
        transition: `background ${theme.motion.quick}`,
        ...style,
      }}
    >
      {icon && (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radii.md,
            background: theme.colors.surfaceMuted,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.primary,
          }}
        >
          {icon}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
        <div
          style={{
            fontFamily: theme.fontFamily,
            fontSize: theme.typography.body.fontSize,
            fontWeight: 600,
            color: theme.colors.textPrimary,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontFamily: theme.fontFamily,
              fontSize: theme.typography.caption.fontSize,
              color: theme.colors.textSecondary,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm,
          color: theme.colors.textPrimary,
          fontFamily: theme.fontFamily,
          fontFeatureSettings: '"tnum" 1, "lnum" 1',
        }}
      >
        {badgeLabel && <Badge label={badgeLabel} tone={badgeTone} />}
        {value && <span>{value}</span>}
      </div>

      {/* F-027: Action buttons */}
      {actions && (
        <div
          onClick={(e) => e.stopPropagation()} // Prevent triggering onPress when clicking actions
          style={{
            display: 'flex',
            gap: theme.spacing.xs,
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
};
