import { useState, useEffect } from 'react';
import { useTheme } from '@cashmgr/ui';

interface UpdateInfo {
  version: string;
  releaseNotes?: string | null;
}

interface UpdaterAPI {
  onUpdateDownloaded: (cb: (info: UpdateInfo) => void) => void;
  installUpdate: () => Promise<void>;
  simulateUpdate?: () => Promise<void>;
}

declare global {
  interface Window {
    updater?: UpdaterAPI;
  }
}

export function UpdateBanner() {
  const theme = useTheme();
  const [info, setInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    window.updater?.onUpdateDownloaded(setInfo);
  }, []);

  if (!info) return null;

  const isDark = theme.mode === 'dark';
  const bg = isDark ? '#2a2200' : '#fefce8';
  const border = isDark ? '#a16207' : '#fde68a';
  const titleColor = isDark ? '#fde68a' : '#92400e';
  const bodyColor = isDark ? '#ca8a04' : '#b45309';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: theme.spacing.lg,
        right: theme.spacing.lg,
        zIndex: 9999,
        width: 300,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: theme.radii.lg,
        boxShadow: theme.shadows.medium,
        padding: theme.spacing.md,
        fontFamily: theme.fontFamily,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.sm,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: theme.typography.body.fontSize, color: titleColor }}>
          Update Available
        </span>
        <button
          onClick={() => setInfo(null)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: bodyColor,
            fontSize: 16,
            lineHeight: 1,
            padding: 0,
          }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      <p style={{ margin: 0, fontSize: theme.typography.caption.fontSize, color: bodyColor }}>
        Version {info.version} is ready to install. Restart to apply the update.
      </p>
      <button
        onClick={() => window.updater?.installUpdate()}
        style={{
          alignSelf: 'flex-start',
          background: '#1a53ce',
          color: '#ffffff',
          border: 'none',
          borderRadius: theme.components.interactiveRadius,
          padding: `6px ${theme.spacing.md}px`,
          fontSize: theme.typography.caption.fontSize,
          fontWeight: 600,
          fontFamily: theme.fontFamily,
          cursor: 'pointer',
        }}
      >
        Restart &amp; Update
      </button>
    </div>
  );
}
