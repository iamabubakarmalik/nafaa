import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog, Notification, app } from 'electron';
import log from 'electron-log';

let mainWindowRef: BrowserWindow | null = null;
let updateCheckInterval: NodeJS.Timeout | null = null;
let isCheckingManually = false;

export function setupAutoUpdater(mainWindow: BrowserWindow) {
  mainWindowRef = mainWindow;

  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates…');
    sendToRenderer('updater:checking', null);
  });

  autoUpdater.on('update-available', (info) => {
    log.info(`Update available: v${info.version}`);
    sendToRenderer('updater:available', {
      version: info.version,
      releaseDate: info.releaseDate,
    });

    try {
      new Notification({
        title: 'Nafaa Update Available',
        body: `Version ${info.version} download ho raha hai…`,
        silent: false,
      }).show();
    } catch {}
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info(`No updates. Current: v${app.getVersion()}, Latest: v${info?.version || '?'}`);
    sendToRenderer('updater:not-available', null);

    if (isCheckingManually) {
      isCheckingManually = false;
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        dialog.showMessageBox(mainWindowRef, {
          type: 'info',
          title: 'No Updates',
          message: `Aap ka Nafaa (v${app.getVersion()}) latest version hai`,
          buttons: ['OK'],
        });
      }
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    log.info(`Download: ${percent}% (${Math.round(progress.bytesPerSecond / 1024)} KB/s)`);
    sendToRenderer('updater:progress', {
      percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', async (info) => {
    log.info(`Update downloaded: v${info.version}`);
    sendToRenderer('updater:downloaded', { version: info.version });

    if (!mainWindowRef || mainWindowRef.isDestroyed()) return;

    const result = await dialog.showMessageBox(mainWindowRef, {
      type: 'info',
      title: 'Update Ready',
      message: `Nafaa ${info.version} install ke liye ready hai`,
      detail: 'Install karne ke liye app restart hogi. Aap ka data safe rahega.\n\nAbhi install karein ya next launch pe?',
      buttons: ['Install & Restart', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      log.info('User chose to install now');
      setImmediate(() => autoUpdater.quitAndInstall(false, true));
    }
  });

  autoUpdater.on('error', (error) => {
    log.error('Update error:', error);
    sendToRenderer('updater:error', { message: error.message });

    if (isCheckingManually) {
      isCheckingManually = false;
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        dialog.showMessageBox(mainWindowRef, {
          type: 'error',
          title: 'Update Check Failed',
          message: 'Update check nahi ho saka',
          detail: error.message,
          buttons: ['OK'],
        });
      }
    }
  });

  // First check after 15s
  setTimeout(() => checkForUpdates(false), 15_000);

  // Re-check every 4 hours
  updateCheckInterval = setInterval(() => {
    checkForUpdates(false);
  }, 4 * 60 * 60 * 1000);
}

export function checkForUpdates(manual = false) {
  if (process.env.NODE_ENV === 'development') {
    log.info('Skipping update check in dev mode');
    if (manual && mainWindowRef) {
      dialog.showMessageBox(mainWindowRef, {
        type: 'info',
        title: 'Dev Mode',
        message: 'Updates dev mode me disabled hain',
        buttons: ['OK'],
      });
    }
    return;
  }

  isCheckingManually = manual;
  log.info(`Checking for updates (manual: ${manual})…`);

  autoUpdater.checkForUpdates().catch((err) => {
    log.error('Update check failed:', err);
    isCheckingManually = false;
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
