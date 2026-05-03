import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

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

  // In development, load from Vite dev server
  // In production, load from built web app
  if (process.env.NODE_ENV === 'development') {
    const devPort = process.env.VITE_PORT || '3000';
    const devUrl = `http://localhost:${devPort}`;
    console.log(`Loading from dev server: ${devUrl}`);
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../web/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for database operations
ipcMain.handle('db:query', async (_event, sql: string, params: unknown[]) => {
  // Placeholder for database operations using better-sqlite3
  // Will be implemented when business logic is added
  console.log('Database query:', sql, params);
  return null;
});

ipcMain.handle('db:execute', async (_event, sql: string, params: unknown[]) => {
  // Placeholder for database operations using better-sqlite3
  // Will be implemented when business logic is added
  console.log('Database execute:', sql, params);
  return null;
});
