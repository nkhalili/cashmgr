import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, net, protocol, shell } from 'electron';
import { autoUpdater, UpdateDownloadedEvent } from 'electron-updater';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { ErrorHandler, setLogger } from '@cashmgr/core';
import { DesktopFileLogger } from './logger';

setLogger(new DesktopFileLogger());

process.on('uncaughtException', (error) => {
  ErrorHandler.handle(error, 'main:uncaughtException');
  dialog.showMessageBoxSync({
    type: 'error',
    title: 'Unexpected Error',
    message: 'Cash Mgr. encountered an unexpected error and needs to close.',
    detail: error.message,
    buttons: ['OK'],
  });
  app.exit(1);
});

process.on('unhandledRejection', (reason) => {
  ErrorHandler.handle(reason, 'main:unhandledRejection');
});

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;

autoUpdater.on('update-downloaded', (info: UpdateDownloadedEvent) => {
  mainWindow?.webContents.send('update-downloaded', {
    version: info.version,
    releaseNotes: info.releaseNotes,
  });
});

let isCheckingForUpdates = false;

function checkForUpdatesManually() {
  if (!app.isPackaged) {
    dialog.showMessageBox({ type: 'info', message: 'Update checks are only available in production builds.', buttons: ['OK'] });
    return;
  }
  if (isCheckingForUpdates) return;
  isCheckingForUpdates = true;

  const onAvailable = () => {
    cleanup();
    dialog.showMessageBox({ type: 'info', title: 'Update Available', message: 'A new update is downloading in the background.\nYou will be notified when it is ready to install.', buttons: ['OK'] });
  };
  const onNotAvailable = () => {
    cleanup();
    dialog.showMessageBox({ type: 'info', title: 'No Updates Available', message: `Cash Mgr. ${app.getVersion()} is the latest version.`, buttons: ['OK'] });
  };
  const cleanup = () => {
    isCheckingForUpdates = false;
    autoUpdater.off('update-available', onAvailable);
    autoUpdater.off('update-not-available', onNotAvailable);
  };

  autoUpdater.once('update-available', onAvailable);
  autoUpdater.once('update-not-available', onNotAvailable);
  autoUpdater.checkForUpdates().catch((err: Error) => {
    cleanup();
    dialog.showMessageBox({ type: 'error', title: 'Update Check Failed', message: err.message, buttons: ['OK'] });
  });
}

function scheduleUpdateCheck() {
  if (!app.isPackaged) return;
  setTimeout(() => autoUpdater.checkForUpdates(), 10_000);
  setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000);
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS requires the first menu item to be the app name menu
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
        ...(process.env.NODE_ENV === 'development'
          ? [{ role: 'toggleDevTools' as const }]
          : []),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Cash Mgr.',
          click: () => {
            const iconPath = path.join(__dirname, '../build/icons/256x256.png');
            const icon = nativeImage.createFromPath(iconPath);
            dialog.showMessageBox({
              type: 'none',
              icon,
              title: 'Cash Mgr.',
              message: 'Cash Mgr.',
              detail: [
                'A free, open source, offline-first personal finance manager.',
                'Manage your money. Own your data.',
                '',
                `Version ${app.getVersion()}`,
              ].join('\n'),
              buttons: ['OK'],
            });
          },
        },
        {
          label: 'Check for Updates…',
          click: () => checkForUpdatesManually(),
        },
        { type: 'separator' as const },
        {
          label: 'Source Code',
          click: () => shell.openExternal('https://github.com/nkhalili/cashmgr'),
        },
        {
          label: 'Report an Issue',
          click: () => shell.openExternal('https://github.com/nkhalili/cashmgr/issues'),
        },
        { type: 'separator' as const },
        {
          label: 'Sponsor on GitHub',
          click: () => shell.openExternal('https://github.com/sponsors/nkhalili'),
        },
        {
          label: 'Buy Me a Coffee',
          click: () => shell.openExternal('https://buymeacoffee.com/nkhalili'),
        },
      ],
    },
  ];
  return Menu.buildFromTemplate(template);
}

// Must be called before app is ready
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    allowServiceWorkers: true,
    corsEnabled: false,
  },
}]);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    const devPort = process.env.VITE_PORT || '3000';
    mainWindow.loadURL(`http://localhost:${devPort}`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL('app://localhost/');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const webDistPath = path.join(__dirname, '../web/dist');

  // Serve web files via app:// so we can inject COOP/COEP headers.
  // file:// protocol has no HTTP headers, so SharedArrayBuffer (required by
  // @sqlite.org/sqlite-wasm) would be unavailable without this.
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);
    if (!path.extname(pathname)) pathname = '/index.html';
    const filePath = path.join(webDistPath, pathname);
    const response = await net.fetch(pathToFileURL(filePath).toString());
    return new Response(response.body, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers),
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    });
  });

  Menu.setApplicationMenu(buildMenu());
  createWindow();
  scheduleUpdateCheck();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('install-update', () => {
  if (!app.isPackaged) return;
  autoUpdater.quitAndInstall();
});

if (!app.isPackaged) {
  ipcMain.handle('dev:simulate-update', () => {
    mainWindow?.webContents.send('update-downloaded', { version: '99.0.0', releaseNotes: null });
  });
}

ipcMain.handle('db:query', async (_event, sql: string, params: unknown[]) => {
  console.log('Database query:', sql, params);
  return null;
});

ipcMain.handle('db:execute', async (_event, sql: string, params: unknown[]) => {
  console.log('Database execute:', sql, params);
  return null;
});
