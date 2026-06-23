import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import log from 'electron-log';
import Store from 'electron-store';

// ─── Configure logging ─────────────────────────────────────────
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('App starting...');

// ─── Persistent store for user preferences ─────────────────────
interface StoreSchema {
  windowBounds: { width: number; height: number; x?: number; y?: number };
  apiUrl: string;
  language: 'en' | 'ur' | 'roman_ur';
  theme: 'light' | 'dark' | 'auto';
}

const store = new Store<StoreSchema>({
  defaults: {
    windowBounds: { width: 1400, height: 900 },
    apiUrl: process.env.NAFAA_API_URL || 'https://api.nafaa.pk',
    language: 'roman_ur',
    theme: 'light',
  },
});

// ─── Window references ─────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;

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
    show: false,
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

  // ─── Load app ───
  if (isDev) {
    // Dev: load Vite dev server
    const devUrl = process.env.VITE_DEV_URL || 'http://localhost:5173';
    log.info(`Loading dev URL: ${devUrl}`);
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Prod: load bundled web files (offline-first)
    const webPath = path.join(process.resourcesPath, 'web', 'index.html');
    log.info(`Loading bundled web: ${webPath}`);
    mainWindow.loadFile(webPath);
  }

  // ─── Show window when ready (no white flash) ───
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    log.info('Main window shown');
  });

  // ─── Save window bounds on close ───
  mainWindow.on('close', () => {
    if (mainWindow) {
      const newBounds = mainWindow.getBounds();
      store.set('windowBounds', newBounds);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // ─── External links open in browser, not new window ───
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // ─── Handle navigation to external URLs ───
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow?.webContents.getURL() || '';
    const currentOrigin = new URL(currentUrl).origin;
    try {
      const targetOrigin = new URL(url).origin;
      if (targetOrigin !== currentOrigin && !url.startsWith('file://')) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {}
  });

  // ─── Catch load failures ───
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    log.error(`Failed to load: ${errorCode} — ${errorDescription}`);
  });
}

// ─── Icon path helper ──────────────────────────────────────────
function getIconPath(): string {
  if (isMac) return path.join(__dirname, '../../build/icon.icns');
  if (process.platform === 'win32') return path.join(__dirname, '../../build/icon.ico');
  return path.join(__dirname, '../../build/icon.png');
}

// ─── App menu (basic, will polish in DT-2) ─────────────────────
function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: app.name,
            submenu: [
              { role: 'about' },
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
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
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
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ─── IPC handlers (renderer → main communication) ─────────────
function setupIpcHandlers() {
  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('app:getPlatform', () => process.platform);
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
  ipcMain.handle('app:openExternal', (_event, url: string) => {
    shell.openExternal(url);
  });
  ipcMain.handle('app:relaunch', () => {
    app.relaunch();
    app.exit(0);
  });
}

// ─── App lifecycle ─────────────────────────────────────────────
app.whenReady().then(() => {
  log.info(`App ready. Version: ${app.getVersion()}, Platform: ${process.platform}`);
  setupIpcHandlers();
  buildMenu();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

// ─── Security: prevent navigation to non-allowed origins ───────
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
});

// ─── Single instance lock ──────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ─── Error handling ────────────────────────────────────────────
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
});
