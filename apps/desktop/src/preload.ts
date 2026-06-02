import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('updater', {
  onUpdateDownloaded: (cb: (info: UpdateInfo) => void) =>
    ipcRenderer.on('update-downloaded', (_e, info) => cb(info)),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  ...(process.env.NODE_ENV === 'development'
    ? { simulateUpdate: () => ipcRenderer.invoke('dev:simulate-update') }
    : {}),
});

contextBridge.exposeInMainWorld('electron', {
  // Database operations
  db: {
    query: (sql: string, params: unknown[]) => ipcRenderer.invoke('db:query', sql, params),
    execute: (sql: string, params: unknown[]) => ipcRenderer.invoke('db:execute', sql, params),
  },

  // App information
  app: {
    platform: process.platform,
    version: process.env.npm_package_version,
  },
});

export interface UpdateInfo {
  version: string;
  releaseNotes?: string | null;
}

export interface UpdaterAPI {
  onUpdateDownloaded: (cb: (info: UpdateInfo) => void) => void;
  installUpdate: () => Promise<void>;
  simulateUpdate?: () => Promise<void>;
}

// Type definitions for window.electron
export interface ElectronAPI {
  db: {
    query: (sql: string, params: unknown[]) => Promise<unknown>;
    execute: (sql: string, params: unknown[]) => Promise<unknown>;
  };
  app: {
    platform: string;
    version: string | undefined;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
    updater: UpdaterAPI;
  }
}
