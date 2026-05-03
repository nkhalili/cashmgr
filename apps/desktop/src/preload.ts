import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script - exposes safe IPC methods to the renderer process
 */

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
  }
}
