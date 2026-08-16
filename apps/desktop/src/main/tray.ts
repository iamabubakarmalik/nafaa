import { Tray, Menu, BrowserWindow, nativeImage, app, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import log from 'electron-log';

let tray: Tray | null = null;

export function createTray(mainWindow: BrowserWindow): Tray | null {
  const iconPath = getTrayIconPath();

  if (!iconPath || !fs.existsSync(iconPath)) {
    log.warn(`Tray icon not found: ${iconPath} — tray disabled`);
    return null;
  }

  try {
    let trayIcon = nativeImage.createFromPath(iconPath);

    if (trayIcon.isEmpty()) {
      log.warn('Tray icon empty — using fallback');
      trayIcon = nativeImage.createEmpty();
    }

    if (process.platform === 'darwin') {
      trayIcon = trayIcon.resize({ width: 18, height: 18 });
      trayIcon.setTemplateImage(true);
    } else {
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
    }

    tray = new Tray(trayIcon);
    tray.setToolTip(`Nafaa v${app.getVersion()}`);

    updateTrayMenu(mainWindow);

    tray.on('click', () => {
      if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
        if (process.platform === 'win32') {
          mainWindow.focus();
        } else {
          mainWindow.hide();
        }
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    tray.on('double-click', () => {
      mainWindow.show();
      mainWindow.focus();
    });

    log.info('Tray created successfully');
    return tray;
  } catch (e) {
    log.error('Failed to create tray:', e);
    return null;
  }
}

export function updateTrayMenu(mainWindow: BrowserWindow) {
  if (!tray) return;

  try {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Nafaa v${app.getVersion()}`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Open Nafaa',
        click: () => { mainWindow.show(); mainWindow.focus(); },
      },
      { type: 'separator' },
      {
        label: 'Dashboard',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('tray:navigate', '/dashboard');
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
      {
        label: 'Customers',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('tray:navigate', '/customers');
        },
      },
      {
        label: 'Sync Center',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('tray:navigate', '/sync');
        },
      },
      { type: 'separator' },
      {
        label: 'Reload',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.reload();
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
        click: () => app.quit(),
      },
    ]);

    tray.setContextMenu(contextMenu);
  } catch (e) {
    log.error('Failed to update tray menu:', e);
  }
}

export function destroyTray() {
  if (tray) {
    try {
      tray.destroy();
    } catch (e) {
      log.error('Failed to destroy tray:', e);
    }
    tray = null;
  }
}

function getTrayIconPath(): string {
  const isDev = process.env.NODE_ENV === 'development';
  const buildDir = app.isPackaged
    ? path.join(process.resourcesPath, '..', 'build')
    : path.join(__dirname, '../../build');

  const candidates = isDev
    ? [
        path.join(buildDir, 'tray-icon.png'),
        path.join(buildDir, 'icon-192.png'),
        path.join(buildDir, 'icon.png'),
      ]
    : [
        path.join(process.resourcesPath, 'tray-icon.png'),
        path.join(buildDir, 'tray-icon.png'),
        path.join(buildDir, 'icon.png'),
      ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}
