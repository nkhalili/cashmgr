import React from 'react';
import { useTheme } from './theme';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  width?: number | string;
  closeLabel?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  subtitle,
  children,
  onClose,
  footer,
  width = 520,
  closeLabel = 'Close',
}) => {
  const theme = useTheme();

  React.useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: theme.colors.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.lg,
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        role="dialog"
        aria-modal
        onClick={(event) => event.stopPropagation()}
        style={{
          width: width,
          maxWidth: '90vw',
          borderRadius: theme.radii.lg,
          background: theme.colors.surface,
          padding: theme.spacing.lg,
          boxShadow: theme.shadows.medium,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.md,
          color: theme.colors.textPrimary,
        }}
      >
        {(title || subtitle) && (
          <div>
            {title && (
              <h3
                style={{
                  margin: 0,
                  fontFamily: theme.fontFamily,
                  fontSize: theme.typography.h3.fontSize,
                  fontWeight: theme.typography.h3.fontWeight,
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                style={{
                  marginTop: theme.spacing.xs,
                  marginBottom: 0,
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fontFamily,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div>{children}</div>

        <div
          style={{
            display: 'flex',
            gap: theme.spacing.sm,
            justifyContent: footer ? 'space-between' : 'flex-end',
          }}
        >
          {footer}
          <Button variant="ghost" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
