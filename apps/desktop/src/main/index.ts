import { app, BrowserWindow, ipcMain, shell, Menu, nativeImage } from 'electron';
import path from 'node:path';
import log from 'electron-log';
import Store from 'electron-store';
import { setupAutoUpdater, checkForUpdates, cleanupAutoUpdater } from './updater';
import { createTray, destroyTray } from './tray';
import { showNotification } from './notifications';
import { setupPrinterHandlers } from './printer';
import { setupScanner, cleanupScanner } from './scanner';

// ─── Configure logging ─────────────────────────────────────────
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('App starting...');

// ─── Persistent store ──────────────────────────────────────────
interface StoreSchema {
  windowBounds: { width: number; height: number; x?: number; y?: number };
  apiUrl: string;
  language: 'en' | 'ur' | 'roman_ur';
  theme: 'light' | 'dark' | 'auto';
  minimizeToTray: boolean;
  startMinimized: boolean;
}

const store = new Store<StoreSchema>({
  defaults: {
    windowBounds: { width: 1400, height: 900 },
    apiUrl: process.env.NAFAA_API_URL || 'https://api.nafaa.pk',
    language: 'roman_ur',
    theme: 'light',
    minimizeToTray: true,
    startMinimized: false,
  },
});

// ─── Refs ──────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

const isDev = process.env.NODE_ENV === 'development';
const isMac = process.platform === 'darwin';

// ─── Create main window ────────────────────────────────────────
function createMainWindow() {
  const bounds = store.get('windowBounds');

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 1024,
    minHeight: 600,
    show: !store.get('startMinimized'),
    backgroundColor: '#f8fafc',
    title: 'Nafaa — Pakistan-first Retail OS',
    icon: getIconPath(),
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  // Load app
  if (isDev) {
    const devUrl = process.env.VITE_DEV_URL || 'http://localhost:5173';
    log.info(`Loading dev URL: ${devUrl}`);
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const webPath = path.join(process.resourcesPath, 'web', 'index.html');
    log.info(`Loading bundled web: ${webPath}`);
    mainWindow.loadFile(webPath);
  }

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    if (!store.get('startMinimized')) {
      mainWindow?.show();
    }
    log.info('Main window ready');
  });

  // Save window bounds
  mainWindow.on('close', (event) => {
    if (!isQuitting && store.get('minimizeToTray') && !isMac) {
      event.preventDefault();
      mainWindow?.hide();
      return;
    }
    if (mainWindow) {
      store.set('windowBounds', mainWindow.getBounds());
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // External links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow?.webContents.getURL() || '';
    try {
      const currentOrigin = new URL(currentUrl).origin;
      const targetOrigin = new URL(url).origin;
      if (targetOrigin !== currentOrigin && !url.startsWith('file://')) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {}
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    log.error(`Failed to load: ${errorCode} — ${errorDescription}`);
  });

  return mainWindow;
}

// ─── Icon path ─────────────────────────────────────────────────
function getIconPath(): string {
  if (isMac) return path.join(__dirname, '../../build/icon.icns');
  if (process.platform === 'win32') return path.join(__dirname, '../../build/icon.ico');
  return path.join(__dirname, '../../build/icon.png');
}

// ─── Menu ──────────────────────────────────────────────────────
function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              {
                label: 'Check for Updates...',
                click: () => checkForUpdates(),
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ] as Electron.MenuItemConstructorOptions[])
      : []),
    {
      label: 'File',
      submenu: [
        ...(!isMac
          ? ([
              {
                label: 'Check for Updates...',
                click: () => checkForUpdates(),
              },
              { type: 'separator' },
            ] as Electron.MenuItemConstructorOptions[])
          : []),
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Visit Nafaa.pk',
          click: () => shell.openExternal('https://nafaa.pk'),
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://nafaa.pk/support'),
        },
        { type: 'separator' },
        {
          label: 'View Logs',
          click: () => {
            const logsPath = log.transports.file.getFile().path;
            shell.showItemInFolder(logsPath);
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── IPC handlers ──────────────────────────────────────────────
function setupIpcHandlers() {
  // App info
  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('app:getPlatform', () => process.platform);

  // Settings
  ipcMain.handle('app:getApiUrl', () => store.get('apiUrl'));
  ipcMain.handle('app:setApiUrl', (_event, url: string) => {
    store.set('apiUrl', url);
    return true;
  });
  ipcMain.handle('app:getLocale', () => store.get('language'));
  ipcMain.handle('app:setLocale', (_event, lang: StoreSchema['language']) => {
    store.set('language', lang);
    return true;
  });
  ipcMain.handle('app:getMinimizeToTray', () => store.get('minimizeToTray'));
  ipcMain.handle('app:setMinimizeToTray', (_event, value: boolean) => {
    store.set('minimizeToTray', value);
    return true;
  });

  // Actions
  ipcMain.handle('app:openExternal', (_event, url: string) => {
    shell.openExternal(url);
  });
  ipcMain.handle('app:relaunch', () => {
    app.relaunch();
    app.exit(0);
  });
  ipcMain.handle('app:checkForUpdates', () => {
    checkForUpdates();
  });

  // Notifications
  ipcMain.handle('notification:show', (_event, options) => {
    showNotification(options, mainWindow || undefined);
  });

  // Window controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.handle('window:close', () => mainWindow?.close());
}

// ─── App lifecycle ─────────────────────────────────────────────
app.whenReady().then(() => {
  log.info(`App ready. Version: ${app.getVersion()}, Platform: ${process.platform}`);
  setupIpcHandlers();
  buildMenu();
  const window = createMainWindow();
  createTray(window);
  setupAutoUpdater(window);
  setupPrinterHandlers();
  setupScanner(window);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  cleanupAutoUpdater();
  cleanupScanner();
  destroyTray();
});

app.on('window-all-closed', () => {
  if (!isMac && !store.get('minimizeToTray')) {
    app.quit();
  }
});

// Security
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
});

// Single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
});
