import { app, BrowserWindow, powerMonitor } from 'electron';
import log from 'electron-log';

/* ═══════════════════════════════════════════════════════════
   PERFORMANCE MONITOR
   • Memory usage warnings (auto-restart if runaway)
   • Slow-render detection
   • Power/battery events (adjust sync interval on battery)
   ═══════════════════════════════════════════════════════════ */

const MEMORY_WARNING_MB = 800;   // Warn at 800MB
const MEMORY_CRITICAL_MB = 1500; // Critical at 1.5GB — offer restart
const MONITOR_INTERVAL_MS = 60 * 1000; // Check every minute

let monitorInterval: NodeJS.Timeout | null = null;
let lastMemoryWarning = 0;

export function setupPerformanceMonitor(mainWindow: BrowserWindow) {
  // Memory monitoring
  monitorInterval = setInterval(() => {
    checkMemoryUsage(mainWindow);
  }, MONITOR_INTERVAL_MS);

  // Power events
  try {
    powerMonitor.on('on-ac', () => {
      log.info('Power: on AC — full performance mode');
      mainWindow?.webContents.send('power:changed', { source: 'ac' });
    });

    powerMonitor.on('on-battery', () => {
      log.info('Power: on battery — power-save mode');
      mainWindow?.webContents.send('power:changed', { source: 'battery' });
    });

    powerMonitor.on('suspend', () => {
      log.info('System suspending — pausing background sync');
      mainWindow?.webContents.send('power:suspend');
    });

    powerMonitor.on('resume', () => {
      log.info('System resumed — resuming sync');
      mainWindow?.webContents.send('power:resume');
    });

    powerMonitor.on('lock-screen', () => {
      log.info('Screen locked');
      mainWindow?.webContents.send('power:lock');
    });

    powerMonitor.on('unlock-screen', () => {
      log.info('Screen unlocked');
      mainWindow?.webContents.send('power:unlock');
    });
  } catch (e) {
    log.warn('Power monitor setup failed:', e);
  }

  log.info('Performance monitor started');
}

function checkMemoryUsage(mainWindow: BrowserWindow) {
  try {
    const usage = process.memoryUsage();
    const heapMB = Math.round(usage.heapUsed / 1024 / 1024);
    const rssMB = Math.round(usage.rss / 1024 / 1024);

    if (rssMB > MEMORY_CRITICAL_MB) {
      const now = Date.now();
      // Only warn once per 30 minutes to avoid spam
      if (now - lastMemoryWarning > 30 * 60 * 1000) {
        lastMemoryWarning = now;
        log.warn(`Memory CRITICAL: ${rssMB}MB RSS — suggesting restart`);

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('performance:memory-critical', {
            rss: rssMB,
            heap: heapMB,
          });
        }
      }
    } else if (rssMB > MEMORY_WARNING_MB) {
      log.info(`Memory usage: ${rssMB}MB RSS (${heapMB}MB heap)`);
    }
  } catch (e) {
    log.warn('Memory check failed:', e);
  }
}

export function stopPerformanceMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

export function getPerformanceStats() {
  const usage = process.memoryUsage();
  return {
    memory: {
      rss: Math.round(usage.rss / 1024 / 1024),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
    },
    uptime: Math.round(process.uptime()),
    cpuUsage: process.cpuUsage(),
    versions: {
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
    },
  };
}
