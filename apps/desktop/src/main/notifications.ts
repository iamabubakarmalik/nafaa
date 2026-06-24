import { Notification, BrowserWindow } from 'electron';
import log from 'electron-log';

/**
 * Native notification helper.
 * Triggered from renderer via IPC.
 */

export interface NotificationOptions {
  title: string;
  body: string;
  silent?: boolean;
  urgency?: 'normal' | 'critical' | 'low';
  actions?: Array<{ type: 'button'; text: string }>;
}

export function showNotification(options: NotificationOptions, mainWindow?: BrowserWindow) {
  if (!Notification.isSupported()) {
    log.warn('Notifications not supported on this system');
    return;
  }

  const notification = new Notification({
    title: options.title,
    body: options.body,
    silent: options.silent ?? false,
    urgency: options.urgency ?? 'normal',
    actions: options.actions,
  });

  // Click on notification → focus main window
  notification.on('click', () => {
    log.info(`Notification clicked: ${options.title}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  notification.show();
}
