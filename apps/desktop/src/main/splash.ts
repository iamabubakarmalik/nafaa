import { BrowserWindow, screen, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import log from 'electron-log';

let splashWindow: BrowserWindow | null = null;

/**
 * Create splash screen — shown while main app loads
 * Auto-closes after main window is ready
 */
export function createSplash(): BrowserWindow | null {
  try {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    splashWindow = new BrowserWindow({
      width: 480,
      height: 320,
      x: Math.round((screenWidth - 480) / 2),
      y: Math.round((screenHeight - 320) / 2),
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      show: false,
      backgroundColor: '#00000000',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    const iconPath = getIconDataURL();
    const version = app.getVersion();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Nafaa</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; user-select: none; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    -webkit-app-region: drag;
  }
  .card {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #059669 100%);
    border-radius: 24px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);
    padding: 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    position: relative;
    overflow: hidden;
  }
  .card::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 40%);
    animation: pulse 3s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.6; }
    50% { transform: scale(1.1) rotate(15deg); opacity: 1; }
  }
  .logo {
    width: 88px;
    height: 88px;
    border-radius: 22px;
    background: white;
    padding: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .logo img { width: 100%; height: 100%; object-fit: contain; }
  .brand {
    margin-top: 20px;
    font-size: 32px;
    font-weight: 900;
    letter-spacing: -0.5px;
    position: relative;
    z-index: 1;
    background: linear-gradient(135deg, #fff 0%, #a7f3d0 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .tagline {
    margin-top: 4px;
    font-size: 12px;
    font-weight: 600;
    color: rgba(255,255,255,0.7);
    letter-spacing: 1px;
    text-transform: uppercase;
    position: relative;
    z-index: 1;
  }
  .status {
    margin-top: 32px;
    font-size: 12px;
    color: rgba(255,255,255,0.6);
    font-weight: 600;
    position: relative;
    z-index: 1;
    min-height: 18px;
  }
  .progress-track {
    margin-top: 12px;
    width: 240px;
    height: 4px;
    background: rgba(255,255,255,0.15);
    border-radius: 999px;
    overflow: hidden;
    position: relative;
    z-index: 1;
  }
  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #10b981 0%, #06b6d4 100%);
    border-radius: 999px;
    animation: indeterminate 1.5s ease-in-out infinite;
  }
  @keyframes indeterminate {
    0% { transform: translateX(-100%); width: 30%; }
    50% { width: 60%; }
    100% { transform: translateX(340%); width: 30%; }
  }
  .version {
    position: absolute;
    bottom: 16px;
    right: 20px;
    font-size: 10px;
    color: rgba(255,255,255,0.4);
    font-family: 'Menlo', 'Consolas', monospace;
    font-weight: 600;
    z-index: 1;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">
      ${iconPath ? `<img src="${iconPath}" alt="Nafaa">` : '<div style="font-size:48px;font-weight:900;color:#059669">N</div>'}
    </div>
    <div class="brand">Nafaa</div>
    <div class="tagline">Pakistan's Retail OS</div>
    <div class="status" id="status">Starting…</div>
    <div class="progress-track"><div class="progress-bar"></div></div>
    <div class="version">v${version}</div>
  </div>
  <script>
    if (window.electron?.onSplashStatus) {
      window.electron.onSplashStatus((msg) => {
        const el = document.getElementById('status');
        if (el) el.textContent = msg;
      });
    }
  </script>
</body>
</html>`;

    splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    splashWindow.once('ready-to-show', () => {
      splashWindow?.show();
    });

    splashWindow.on('closed', () => {
      splashWindow = null;
    });

    log.info('Splash window created');
    return splashWindow;
  } catch (e) {
    log.error('Splash failed:', e);
    return null;
  }
}

export function updateSplashStatus(message: string) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.executeJavaScript(`
      const el = document.getElementById('status');
      if (el) el.textContent = ${JSON.stringify(message)};
    `).catch(() => {});
  }
}

export function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    setTimeout(() => {
      splashWindow?.close();
      splashWindow = null;
      log.info('Splash closed');
    }, 500);
  }
}

function getIconDataURL(): string {
  try {
    const buildDir = app.isPackaged
      ? path.join(process.resourcesPath, '..', 'build')
      : path.join(__dirname, '../../build');

    const candidates = [
      path.join(buildDir, 'logo-256.png'),
      path.join(buildDir, 'icon-256.png'),
      path.join(buildDir, 'icon-192.png'),
      path.join(buildDir, 'icon.png'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const data = fs.readFileSync(p);
        return `data:image/png;base64,${data.toString('base64')}`;
      }
    }
  } catch {}
  return '';
}
