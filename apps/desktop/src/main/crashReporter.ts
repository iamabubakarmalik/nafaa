import { app, crashReporter, dialog, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import log from 'electron-log';

/* ═══════════════════════════════════════════════════════════
   CRASH REPORTER — logs crashes to file, shows recovery dialog
   Data privacy: NO auto-upload — user chooses to share logs
   ═══════════════════════════════════════════════════════════ */

const CRASH_LOG_DIR = path.join(app.getPath('userData'), 'crash-logs');
const MAX_CRASH_LOGS = 20;

export function setupCrashReporter() {
  try {
    // Ensure crash log directory exists
    if (!fs.existsSync(CRASH_LOG_DIR)) {
      fs.mkdirSync(CRASH_LOG_DIR, { recursive: true });
    }

    // Native crash reporter (C++ crashes)
    crashReporter.start({
      productName: 'Nafaa',
      companyName: 'Nafaa',
      submitURL: '', // NO auto-upload — privacy first
      uploadToServer: false,
      ignoreSystemCrashHandler: false,
    });

    log.info('Crash reporter initialized');
    log.info(`Crash logs directory: ${CRASH_LOG_DIR}`);

    // Cleanup old crash logs (keep last 20)
    cleanupOldCrashLogs();
  } catch (e) {
    log.error('Crash reporter setup failed:', e);
  }
}

function cleanupOldCrashLogs() {
  try {
    if (!fs.existsSync(CRASH_LOG_DIR)) return;
    const files = fs.readdirSync(CRASH_LOG_DIR)
      .map((name) => ({
        name,
        path: path.join(CRASH_LOG_DIR, name),
        time: fs.statSync(path.join(CRASH_LOG_DIR, name)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > MAX_CRASH_LOGS) {
      files.slice(MAX_CRASH_LOGS).forEach((f) => {
        try { fs.unlinkSync(f.path); } catch {}
      });
    }
  } catch (e) {
    log.warn('Cleanup old crash logs failed:', e);
  }
}

/**
 * Log renderer crash and show recovery dialog
 */
export function handleRendererCrash(
  window: BrowserWindow,
  details: Electron.RenderProcessGoneDetails,
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(CRASH_LOG_DIR, `crash-${timestamp}.log`);

  const logContent = `Nafaa Renderer Crash Report
════════════════════════════════════════
Time: ${new Date().toLocaleString()}
Version: ${app.getVersion()}
Platform: ${process.platform} ${process.arch}
Electron: ${process.versions.electron}
Chrome: ${process.versions.chrome}
Node: ${process.versions.node}

Crash Reason: ${details.reason}
Exit Code: ${details.exitCode}

System Memory:
${JSON.stringify(process.memoryUsage(), null, 2)}
`;

  try {
    fs.writeFileSync(logFile, logContent);
    log.error(`Crash logged to: ${logFile}`);
  } catch (e) {
    log.error('Failed to write crash log:', e);
  }

  if (!window || window.isDestroyed()) return;

  dialog.showMessageBox(window, {
    type: 'error',
    title: 'Nafaa crash ho gaya',
    message: 'App unexpected reason se band ho gaya',
    detail: `Reason: ${details.reason}\nExit code: ${details.exitCode}\n\nAap ka data safe hai — sirf UI restart karni hogi.`,
    buttons: ['Reload App', 'View Crash Log', 'Quit'],
    defaultId: 0,
    cancelId: 2,
  }).then((result) => {
    if (result.response === 0) {
      window.reload();
    } else if (result.response === 1) {
      shell.showItemInFolder(logFile);
    } else {
      app.quit();
    }
  });
}

/**
 * Get all crash logs (for viewing in app)
 */
export function getCrashLogs(): Array<{ name: string; path: string; time: number; size: number }> {
  try {
    if (!fs.existsSync(CRASH_LOG_DIR)) return [];
    return fs.readdirSync(CRASH_LOG_DIR)
      .filter((name) => name.startsWith('crash-'))
      .map((name) => {
        const p = path.join(CRASH_LOG_DIR, name);
        const stat = fs.statSync(p);
        return { name, path: p, time: stat.mtime.getTime(), size: stat.size };
      })
      .sort((a, b) => b.time - a.time);
  } catch {
    return [];
  }
}

export function openCrashLogsFolder() {
  if (fs.existsSync(CRASH_LOG_DIR)) {
    shell.openPath(CRASH_LOG_DIR);
  }
}
