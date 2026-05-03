import React from 'react';
import { useTheme } from './theme';
import { Badge } from './Badge';

export interface TabItem {
  key: string;
  label: string;
  badgeLabel?: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  variant?: 'pill' | 'underline';
  style?: React.CSSProperties;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeKey,
  onChange,
  variant = 'pill',
  style,
}) => {
  const theme = useTheme();

  const isPill = variant === 'pill';

  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.sm,
        padding: isPill ? theme.spacing.xs : 0,
        background: isPill ? theme.colors.surfaceMuted : 'transparent',
        borderRadius: isPill ? theme.radii.pill : 0,
        border: isPill ? `1px solid ${theme.colors.border}` : undefined,
        ...style,
      }}
    >
      {items.map((item) => {
        const isActive = item.key === activeKey;

        return (
          <button
            key={item.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
              borderRadius: isPill ? theme.radii.pill : 0,
              border: 'none',
              background: isActive
                ? isPill
                  ? theme.colors.surface
                  : 'transparent'
                : 'transparent',
              color: isActive ? theme.colors.textPrimary : theme.colors.textSecondary,
              fontFamily: theme.fontFamily,
              fontWeight: 600,
              fontSize: theme.typography.body.fontSize,
              cursor: 'pointer',
              borderBottom:
                !isPill && isActive ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
              transition: `background ${theme.motion.quick}, color ${theme.motion.quick}`,
            }}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badgeLabel && (
              <Badge label={item.badgeLabel} tone={isActive ? 'accent' : 'neutral'} />
            )}
          </button>
        );
      })}
    </div>
  );
};
