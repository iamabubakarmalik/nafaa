import { app, BrowserWindow, ipcMain, shell, Menu, nativeTheme, protocol, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import log from 'electron-log';
import Store from 'electron-store';
import { setupAutoUpdater, checkForUpdates, cleanupAutoUpdater } from './updater';
import { createTray, destroyTray } from './tray';
import { showNotification } from './notifications';
import { setupPrinterHandlers } from './printer';
import { setupScanner, cleanupScanner } from './scanner';
import { createSplash, updateSplashStatus, closeSplash } from './splash';
import { setupCrashReporter, handleRendererCrash } from './crashReporter';
import { setupPerformanceMonitor, stopPerformanceMonitor, getPerformanceStats } from './performance';
import { setupLocalBackup } from './localBackup';
import { setupCashDrawerHandlers } from './cashDrawer';
import { setupPrintQueue } from './printQueue';
import { setupDeepLinking } from './deepLink';
import { setupCustomerDisplayHandlers, closeCustomerDisplayOnQuit } from './customerDisplay';
import { setupLabelPrinterHandlers } from './labelPrinter';
import { setupSessionRecovery } from './sessionRecovery';

/* ═══════════════════════════════════════════════════════════
   NAFAA DESKTOP — MAIN PROCESS (ULTIMATE)
   ─────────────────────────────────────────────────────────
   ✅ Cross-platform (Windows + Mac + Linux)
   ✅ Offline-first (service worker friendly)
   ✅ Custom titlebar with reload/refresh
   ✅ Full keyboard shortcuts
   ✅ Native theme sync
   ✅ Safe crash handling
   ═══════════════════════════════════════════════════════════ */

log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info(`════════════════════════════════════════════`);
log.info(`Nafaa Desktop starting — v${app.getVersion()}`);
log.info(`Platform: ${process.platform} (${process.arch})`);
log.info(`Electron: ${process.versions.electron}`);
log.info(`Node: ${process.versions.node}`);
log.info(`════════════════════════════════════════════`);

// Windows: Set App User Model ID (needed for notifications, taskbar)
if (process.platform === 'win32') {
  app.setAppUserModelId('pk.nafaa.desktop');
}

// Disable hardware acceleration on Windows if issues (uncomment if crashes)
// if (process.platform === 'win32') app.disableHardwareAcceleration();

interface StoreSchema {
  windowBounds: { width: number; height: number; x?: number; y?: number };
  windowMaximized: boolean;
  apiUrl: string;
  language: 'en' | 'ur' | 'roman_ur';
  theme: 'light' | 'dark' | 'auto';
  minimizeToTray: boolean;
  startMinimized: boolean;
  startOnBoot: boolean;
  lastVersion: string;
}

const store = new Store<StoreSchema>({
  defaults: {
    windowBounds: { width: 1400, height: 900 },
    windowMaximized: false,
    apiUrl: process.env.NAFAA_API_URL || 'https://api.nafaa.pk',
    language: 'roman_ur',
    theme: 'auto',
    minimizeToTray: true,
    startMinimized: false,
    startOnBoot: false,
    lastVersion: app.getVersion(),
  },
});

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

const isDev = process.env.NODE_ENV === 'development';
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

// ═══════════════════════════════════════════════
// Register custom protocol for offline SPA routing
// ═══════════════════════════════════════════════
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'nafaa',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function registerNafaaProtocol() {
  protocol.handle('nafaa', async (request) => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith('/')) pathname = pathname.slice(1);

    const webRoot = path.join(process.resourcesPath, 'web');
    let filePath = path.join(webRoot, pathname);

    // SPA fallback — if file doesn't exist and no extension, serve index.html
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      const ext = path.extname(pathname);
      if (!ext) {
        filePath = path.join(webRoot, 'index.html');
      }
    }

    try {
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.webmanifest': 'application/manifest+json',
        '.map': 'application/json',
      };
      const mime = mimeMap[ext] || 'application/octet-stream';
      return new Response(data, {
        headers: {
          'Content-Type': mime,
          'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
        },
      });
    } catch (err: any) {
      log.error(`Protocol handler error for ${filePath}:`, err.message);
      return new Response('Not Found', { status: 404 });
    }
  });
  log.info('Custom nafaa:// protocol registered');
}

// ═══════════════════════════════════════════════
// Create main window
// ═══════════════════════════════════════════════
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
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f172a' : '#f8fafc',
    title: 'Nafaa — Pakistan\'s Retail OS',
    icon: getIconPath(),
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    autoHideMenuBar: isWin, // Windows: hide menu bar by default (F10 shows it)
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Needed for preload with native modules
      webSecurity: true,
      spellcheck: false,
      backgroundThrottling: false, // Keep app responsive when backgrounded
      devTools: true, // Always allow (F12) — even in production
    },
  });

  if (store.get('windowMaximized')) {
    mainWindow.maximize();
  }

  // ═══ Load app ═══
  if (isDev) {
    const devUrl = process.env.VITE_DEV_URL || 'http://localhost:5173';
    log.info(`Loading dev URL: ${devUrl}`);
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Use custom protocol for proper SPA routing + SW support
    const startUrl = 'nafaa://app/index.html';
    log.info(`Loading production URL: ${startUrl}`);
    mainWindow.loadURL(startUrl).catch((err) => {
      log.error('Failed to load app via protocol, trying file fallback:', err);
      const webPath = path.join(process.resourcesPath, 'web', 'index.html');
      mainWindow?.loadFile(webPath);
    });
  }

  // ═══ Show when ready ═══
  mainWindow.once('ready-to-show', () => {
    if (!store.get('startMinimized')) {
      mainWindow?.show();
      if (isDev) mainWindow?.focus();
    }
    log.info('Main window ready');
  });

  // ═══ Save window bounds ═══
  const saveBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (!mainWindow.isMaximized() && !mainWindow.isMinimized()) {
      store.set('windowBounds', mainWindow.getBounds());
    }
    store.set('windowMaximized', mainWindow.isMaximized());
  };

  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);
  mainWindow.on('maximize', () => store.set('windowMaximized', true));
  mainWindow.on('unmaximize', () => store.set('windowMaximized', false));

  // ═══ Close handler — minimize to tray ═══
  mainWindow.on('close', (event) => {
    if (!isQuitting && store.get('minimizeToTray') && !isMac) {
      event.preventDefault();
      mainWindow?.hide();
      if (!store.get('startMinimized')) {
        showNotification({
          title: 'Nafaa is running in background',
          body: 'System tray se access karein',
          silent: true,
        }, mainWindow || undefined);
      }
      return;
    }
    saveBounds();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // ═══ External links → open in system browser ═══
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
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

      // Allow navigation within same origin (SPA routing)
      if (targetOrigin === currentOrigin) return;

      // External URLs → open in browser
      if (url.startsWith('http://') || url.startsWith('https://')) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {}
  });

  // ═══ Error handling ═══
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    // Ignore ERR_ABORTED (-3) which happens on normal navigation
    if (errorCode === -3) return;
    log.error(`Load failed [${errorCode}] ${errorDescription} — ${validatedURL}`);

    // If loading main URL fails, retry after delay
    if (validatedURL?.includes('index.html') || validatedURL?.includes('localhost')) {
      setTimeout(() => {
        log.info('Retrying load...');
        if (isDev) {
          mainWindow?.reload();
        } else {
          mainWindow?.loadURL('nafaa://app/index.html');
        }
      }, 2000);
    }
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    log.error('Renderer process gone:', details);
    if (mainWindow && !mainWindow.isDestroyed()) {
      handleRendererCrash(mainWindow, details);
    }
  });

  // ═══ Theme sync ═══
  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
    }
  });

  return mainWindow;
}

// ═══════════════════════════════════════════════
// Icon path
// ═══════════════════════════════════════════════
function getIconPath(): string {
  const buildDir = app.isPackaged
    ? path.join(process.resourcesPath, '..', 'build')
    : path.join(__dirname, '../../build');

  if (isMac) {
    const icns = path.join(buildDir, 'icon.icns');
    if (fs.existsSync(icns)) return icns;
  }
  if (isWin) {
    const ico = path.join(buildDir, 'icon.ico');
    if (fs.existsSync(ico)) return ico;
  }
  const png = path.join(buildDir, 'icon.png');
  if (fs.existsSync(png)) return png;
  return path.join(buildDir, 'icon-512.png');
}

// ═══════════════════════════════════════════════
// Menu with full shortcuts
// ═══════════════════════════════════════════════
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
                label: 'Check for Updates…',
                click: () => checkForUpdates(true),
              },
              { type: 'separator' },
              {
                label: 'Preferences…',
                accelerator: 'Cmd+,',
                click: () => mainWindow?.webContents.send('menu:navigate', '/settings'),
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
        {
          label: 'New Sale (POS)',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:navigate', '/pos'),
        },
        {
          label: 'New Product',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => mainWindow?.webContents.send('menu:navigate', '/products/new'),
        },
        {
          label: 'New Customer',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => mainWindow?.webContents.send('menu:navigate', '/customers/new'),
        },
        { type: 'separator' },
        {
          label: 'Print',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow?.webContents.send('menu:print'),
        },
        { type: 'separator' },
        ...(!isMac
          ? ([
              {
                label: 'Settings…',
                accelerator: 'CmdOrCtrl+,',
                click: () => mainWindow?.webContents.send('menu:navigate', '/settings'),
              },
              {
                label: 'Check for Updates…',
                click: () => checkForUpdates(true),
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
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.webContents.reload(),
        },
        {
          label: 'Force Reload (Clear Cache)',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow?.webContents.session.clearCache().then(() => {
              mainWindow?.webContents.reloadIgnoringCache();
            });
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: isMac ? 'Alt+Cmd+I' : 'F12',
          click: () => mainWindow?.webContents.toggleDevTools(),
        },
        { type: 'separator' },
        { role: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
        { role: 'zoomIn', accelerator: 'CmdOrCtrl+Plus' },
        { role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
        { type: 'separator' },
        { role: 'togglefullscreen', accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11' },
      ],
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+1',
          click: () => mainWindow?.webContents.send('menu:navigate', '/dashboard'),
        },
        {
          label: 'POS',
          accelerator: 'CmdOrCtrl+2',
          click: () => mainWindow?.webContents.send('menu:navigate', '/pos'),
        },
        {
          label: 'Sales',
          accelerator: 'CmdOrCtrl+3',
          click: () => mainWindow?.webContents.send('menu:navigate', '/sales'),
        },
        {
          label: 'Products',
          accelerator: 'CmdOrCtrl+4',
          click: () => mainWindow?.webContents.send('menu:navigate', '/products'),
        },
        {
          label: 'Customers',
          accelerator: 'CmdOrCtrl+5',
          click: () => mainWindow?.webContents.send('menu:navigate', '/customers'),
        },
        {
          label: 'Sync Center',
          accelerator: 'CmdOrCtrl+6',
          click: () => mainWindow?.webContents.send('menu:navigate', '/sync'),
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        ...(isMac ? [{ role: 'zoom' } as Electron.MenuItemConstructorOptions] : []),
        { role: 'close' },
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
          label: 'Support',
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
        {
          label: 'About',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'About Nafaa',
              message: 'Nafaa Desktop',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}\nPlatform: ${process.platform} (${process.arch})\n\nPakistan's Retail OS\n© 2026 Nafaa`,
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ═══════════════════════════════════════════════
// IPC handlers
// ═══════════════════════════════════════════════
function setupIpcHandlers() {
  // App info
  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('app:getPlatform', () => process.platform);
  ipcMain.handle('app:getArch', () => process.arch);
  ipcMain.handle('app:isPackaged', () => app.isPackaged);

  // Settings
  ipcMain.handle('app:getApiUrl', () => store.get('apiUrl'));
  ipcMain.handle('app:setApiUrl', (_e, url: string) => { store.set('apiUrl', url); return true; });
  ipcMain.handle('app:getLocale', () => store.get('language'));
  ipcMain.handle('app:setLocale', (_e, lang: StoreSchema['language']) => { store.set('language', lang); return true; });
  ipcMain.handle('app:getMinimizeToTray', () => store.get('minimizeToTray'));
  ipcMain.handle('app:setMinimizeToTray', (_e, v: boolean) => { store.set('minimizeToTray', v); return true; });
  ipcMain.handle('app:getStartOnBoot', () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });
  ipcMain.handle('app:setStartOnBoot', (_e, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: store.get('startMinimized'),
    });
    store.set('startOnBoot', enabled);
    return true;
  });
  ipcMain.handle('app:getTheme', () => nativeTheme.themeSource);
  ipcMain.handle('app:setTheme', (_e, theme: 'system' | 'light' | 'dark') => {
    nativeTheme.themeSource = theme;
    return true;
  });
  ipcMain.handle('app:isDarkMode', () => nativeTheme.shouldUseDarkColors);

  // Actions
  ipcMain.handle('app:openExternal', (_e, url: string) => shell.openExternal(url));
  ipcMain.handle('app:showItemInFolder', (_e, path: string) => shell.showItemInFolder(path));
  ipcMain.handle('app:relaunch', () => { app.relaunch(); app.exit(0); });
  ipcMain.handle('app:quit', () => { isQuitting = true; app.quit(); });
  ipcMain.handle('app:checkForUpdates', () => checkForUpdates(true));

  // Reload (critical — the missing feature!)
  ipcMain.handle('app:reload', () => mainWindow?.webContents.reload());
  ipcMain.handle('app:forceReload', async () => {
    await mainWindow?.webContents.session.clearCache();
    mainWindow?.webContents.reloadIgnoringCache();
  });
  ipcMain.handle('app:clearCache', async () => {
    await mainWindow?.webContents.session.clearCache();
    await mainWindow?.webContents.session.clearStorageData({
      storages: ['cachestorage', 'shadercache'],
    });
    return true;
  });

  // Notifications
  ipcMain.handle('notification:show', (_e, options) => {
    showNotification(options, mainWindow || undefined);
  });

  // Window controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('window:hide', () => mainWindow?.hide());
  ipcMain.handle('window:show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
  ipcMain.handle('window:toggleDevTools', () => mainWindow?.webContents.toggleDevTools());

  // Log
  ipcMain.handle('log:info', (_e, msg: string) => log.info('[renderer]', msg));
  ipcMain.handle('log:error', (_e, msg: string) => log.error('[renderer]', msg));
  ipcMain.handle('app:getPerformanceStats', () => getPerformanceStats());

  ipcMain.handle('log:openFolder', () => {
    shell.showItemInFolder(log.transports.file.getFile().path);
  });
}

// ═══════════════════════════════════════════════
// Session security + CSP
// ═══════════════════════════════════════════════
function configureSession() {
  const ses = session.defaultSession;

  // Allow USB device permissions (for barcode scanners)
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    const allowed = ['media', 'notifications', 'clipboard-read', 'clipboard-sanitized-write'];
    callback(allowed.includes(permission));
  });

  // Allow all USB devices (for scanners/printers)
  ses.setDevicePermissionHandler(() => true);

  // Better CSP for offline mode
  if (!isDev) {
    ses.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          // Allow inline scripts (for PWA / injected code)
          // Allow connect to api.nafaa.pk + localhost for dev
          'Content-Security-Policy': [
            "default-src 'self' nafaa: data: blob:; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' nafaa:; " +
            "style-src 'self' 'unsafe-inline' nafaa: https://fonts.googleapis.com; " +
            "font-src 'self' nafaa: data: https://fonts.gstatic.com; " +
            "img-src 'self' nafaa: data: blob: https:; " +
            "connect-src 'self' nafaa: https: wss: ws:; " +
            "worker-src 'self' nafaa: blob:; " +
            "child-src 'self' nafaa: blob:;",
          ],
        },
      });
    });
  }
}

// ═══════════════════════════════════════════════
// App lifecycle
// ═══════════════════════════════════════════════
app.whenReady().then(() => {
  log.info(`App ready. Version: ${app.getVersion()}`);

  // Show splash immediately for fast perceived startup
  createSplash();
  updateSplashStatus('Loading configuration…');

  // Track version changes for update notification
  const lastVersion = store.get('lastVersion');
  if (lastVersion !== app.getVersion()) {
    log.info(`Updated from v${lastVersion} to v${app.getVersion()}`);
    store.set('lastVersion', app.getVersion());
  }

  setupCrashReporter();
  configureSession();
  registerNafaaProtocol();
  setupIpcHandlers();
  buildMenu();

  updateSplashStatus('Opening main window…');
  const window = createMainWindow();

  // Close splash when main window is ready
  window.once('ready-to-show', () => {
    updateSplashStatus('Almost ready…');
    closeSplash();
  });

  updateSplashStatus('Setting up services…');
  try { createTray(window); } catch (e) { log.error('Tray failed:', e); }
  try { setupAutoUpdater(window); } catch (e) { log.error('Auto-updater failed:', e); }
  try { setupPrinterHandlers(); } catch (e) { log.error('Printer failed:', e); }
  try { setupScanner(window); } catch (e) { log.error('Scanner failed:', e); }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('before-quit', () => {
  log.info('App quitting...');
  isQuitting = true;
  try { stopPerformanceMonitor(); } catch {}
  try { cleanupAutoUpdater(); } catch {}
  try { cleanupScanner(); } catch {}
  try { closeCustomerDisplayOnQuit(); } catch {}
  try { destroyTray(); } catch {}
});

app.on('window-all-closed', () => {
  if (!isMac && !store.get('minimizeToTray')) {
    app.quit();
  }
});

// Security: prevent webview attachment
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event) => event.preventDefault());
});

// Single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  log.info('Another instance running, quitting...');
  app.quit();
} else {
  app.on('second-instance', () => {
    log.info('Second instance detected, focusing main window');
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

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled Rejection:', reason);
});
