import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import log from 'electron-log';

/* ═══════════════════════════════════════════════════════════
   DEEP LINKING — nafaa://sales/123 se app open
   Use cases:
   • Email links: click → open receipt in app
   • WhatsApp shared receipt link → open in app
   • FBR portal callback URLs
   ═══════════════════════════════════════════════════════════ */

const PROTOCOL = 'nafaa';

export function setupDeepLinking(getWindow: () => BrowserWindow | null) {
  // Register protocol handler
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
        path.resolve(process.argv[1]),
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }

  // Handle open URL (macOS)
  app.on('open-url', (event, url) => {
    event.preventDefault();
    log.info(`Deep link (macOS): ${url}`);
    handleDeepLink(url, getWindow());
  });

  // Handle command line URL (Windows/Linux)
  const gotLock = app.requestSingleInstanceLock();
  if (gotLock) {
    app.on('second-instance', (_event, commandLine) => {
      // Find URL in command line args
      const url = commandLine.find((arg) => arg.startsWith(`${PROTOCOL}://`));
      if (url) {
        log.info(`Deep link (2nd instance): ${url}`);
        handleDeepLink(url, getWindow());
      }
    });

    // Check if app was launched with deep link
    const initialUrl = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (initialUrl) {
      // Delay to ensure window is ready
      setTimeout(() => handleDeepLink(initialUrl, getWindow()), 2000);
    }
  }

  log.info(`Deep link protocol registered: ${PROTOCOL}://`);
}

function handleDeepLink(url: string, window: BrowserWindow | null) {
  if (!window || window.isDestroyed()) return;

  try {
    const parsed = new URL(url);
    // nafaa://sales/123 → /sales/123
    // nafaa://pos → /pos
    let path = parsed.pathname || '';
    if (parsed.hostname) {
      path = `/${parsed.hostname}${path}`;
    }
    if (!path.startsWith('/')) path = '/' + path;

    log.info(`Navigating to: ${path}`);
    window.show();
    window.focus();
    window.webContents.send('deeplink:navigate', path);
  } catch (e) {
    log.error('Deep link parse failed:', e);
  }
}
