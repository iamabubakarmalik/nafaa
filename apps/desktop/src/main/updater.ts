import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog, Notification } from 'electron';
import log from 'electron-log';

/**
 * Auto-updater wrapper.
 *
 * Behavior:
 * - Checks for updates on app startup (after 10s delay)
 * - Re-checks every 4 hours
 * - Downloads in background
 * - Shows native dialog when update ready
 * - User can install now or later (next launch)
 */

let mainWindowRef: BrowserWindow | null = null;
let updateCheckInterval: NodeJS.Timeout | null = null;

export function setupAutoUpdater(mainWindow: BrowserWindow) {
  mainWindowRef = mainWindow;

  // Configure logging
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // ─── Update available ───
  autoUpdater.on('update-available', (info) => {
    log.info(`Update available: ${info.version}`);
    sendToRenderer('updater:available', {
      version: info.version,
      releaseDate: info.releaseDate,
    });

    new Notification({
      title: 'Nafaa Update Available',
      body: `Version ${info.version} download ho raha hai...`,
      silent: false,
    }).show();
  });

  // ─── Update not available ───
  autoUpdater.on('update-not-available', () => {
    log.info('No updates available');
    sendToRenderer('updater:not-available', null);
  });

  // ─── Download progress ───
  autoUpdater.on('download-progress', (progress) => {
    log.info(`Download progress: ${Math.round(progress.percent)}%`);
    sendToRenderer('updater:progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  // ─── Update downloaded ───
  autoUpdater.on('update-downloaded', async (info) => {
    log.info(`Update downloaded: ${info.version}`);
    sendToRenderer('updater:downloaded', {
      version: info.version,
    });

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Nafaa ${info.version} download ho gaya hai`,
      detail: 'Install karne ke liye app restart hogi. Abhi install karein ya next launch pe?',
      buttons: ['Install & Restart', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      log.info('User chose to install now');
      autoUpdater.quitAndInstall(false, true);
    }
  });

  // ─── Error ───
  autoUpdater.on('error', (error) => {
    log.error('Update error:', error);
    sendToRenderer('updater:error', { message: error.message });
  });

  // ─── Start check ───
  // Wait 10s after startup, then check
  setTimeout(() => {
    checkForUpdates();
  }, 10_000);

  // Re-check every 4 hours
  updateCheckInterval = setInterval(() => {
    checkForUpdates();
  }, 4 * 60 * 60 * 1000);
}

export function checkForUpdates() {
  // Don't check in dev mode
  if (process.env.NODE_ENV === 'development') {
    log.info('Skipping update check in dev mode');
    return;
  }

  log.info('Checking for updates...');
  autoUpdater.checkForUpdates().catch((err) => {
    log.error('Update check failed:', err);
  });
}

export function cleanupAutoUpdater() {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
}

function sendToRenderer(channel: string, data: any) {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send(channel, data);
  }
}
