import { Tray, Menu, BrowserWindow, nativeImage, app, shell } from 'electron';
import path from 'node:path';
import log from 'electron-log';

let tray: Tray | null = null;

/**
 * System tray (status bar on macOS, system tray on Windows/Linux)
 *
 * Features:
 * - Click → show/hide main window
 * - Right-click → context menu with quick actions
 * - Tooltip with current status
 */
export function createTray(mainWindow: BrowserWindow): Tray {
  const iconPath = getTrayIconPath();
  log.info(`Loading tray icon: ${iconPath}`);

  // macOS prefers smaller monochrome icons
  let trayIcon = nativeImage.createFromPath(iconPath);

  if (process.platform === 'darwin') {
    trayIcon = trayIcon.resize({ width: 18, height: 18 });
    trayIcon.setTemplateImage(true); // makes it adapt to light/dark mode on Mac
  } else {
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Nafaa — Click to open');

  updateTrayMenu(mainWindow);

  // Click to toggle window
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Double-click (Windows convention)
  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  return tray;
}

export function updateTrayMenu(mainWindow: BrowserWindow) {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Nafaa',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Dashboard',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('tray:navigate', '/');
      },
    },
    {
      label: 'New Sale (POS)',
      accelerator: 'CmdOrCtrl+N',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('tray:navigate', '/pos');
      },
    },
    {
      label: 'Products',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('tray:navigate', '/products');
      },
    },
    { type: 'separator' },
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
      label: 'Quit Nafaa',
      accelerator: 'CmdOrCtrl+Q',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

export function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

function getTrayIconPath(): string {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    return path.join(__dirname, '../../build/tray-icon.png');
  }
  return path.join(process.resourcesPath, 'tray-icon.png');
}
