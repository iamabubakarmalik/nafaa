import { Notification, BrowserWindow, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import log from 'electron-log';

export interface NotificationOptions {
  title: string;
  body: string;
  silent?: boolean;
  urgency?: 'normal' | 'critical' | 'low';
  actions?: Array<{ type: 'button'; text: string }>;
}

function getNotificationIcon(): string | undefined {
  const buildDir = app.isPackaged
    ? path.join(process.resourcesPath, '..', 'build')
    : path.join(__dirname, '../../build');

  const candidates = [
    path.join(buildDir, 'notification-icon-96.png'),
    path.join(buildDir, 'icon-192.png'),
    path.join(buildDir, 'icon.png'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

export function showNotification(options: NotificationOptions, mainWindow?: BrowserWindow) {
  if (!Notification.isSupported()) {
    log.warn('Notifications not supported');
    return;
  }

  try {
    const notification = new Notification({
      title: options.title,
      body: options.body,
      silent: options.silent ?? false,
      urgency: options.urgency ?? 'normal',
      actions: options.actions,
      icon: getNotificationIcon(),
    });

    notification.on('click', () => {
      log.info(`Notification clicked: ${options.title}`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    notification.show();
  } catch (e) {
    log.error('Notification failed:', e);
  }
}
