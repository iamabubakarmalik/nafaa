import { BrowserWindow, screen, ipcMain, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import log from 'electron-log';

/* ═══════════════════════════════════════════════════════════
   CUSTOMER DISPLAY — 2nd monitor jahan customer amount dekhta
   ─────────────────────────────────────────────────────────
   Detects 2nd screen, opens fullscreen display window,
   syncs POS cart + total in real-time.
   Falls back to windowed mode if only 1 screen.
   ═══════════════════════════════════════════════════════════ */

let displayWindow: BrowserWindow | null = null;

function getDisplayHTML(iconDataUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Nafaa Customer Display</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; user-select: none; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    height: 100vh;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #059669 100%);
    color: white;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .header {
    padding: 24px 40px;
    display: flex;
    align-items: center;
    gap: 20px;
    background: rgba(255,255,255,0.05);
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  .logo { width: 64px; height: 64px; border-radius: 16px; background: white; padding: 10px; }
  .logo img { width: 100%; height: 100%; object-fit: contain; }
  .brand { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; }
  .tagline { font-size: 12px; color: rgba(255,255,255,0.6); font-weight: 600; letter-spacing: 2px; text-transform: uppercase; }
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 40px;
    overflow: hidden;
  }
  .items {
    flex: 1;
    overflow-y: auto;
    padding: 20px 0;
  }
  .item {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 24px;
    padding: 16px 20px;
    margin-bottom: 8px;
    background: rgba(255,255,255,0.08);
    border-radius: 16px;
    backdrop-filter: blur(10px);
    animation: slideIn 0.3s ease-out;
  }
  @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .item-name { font-size: 22px; font-weight: 700; }
  .item-qty { font-size: 20px; color: rgba(255,255,255,0.6); font-weight: 600; min-width: 80px; text-align: right; }
  .item-total { font-size: 24px; font-weight: 800; color: #a7f3d0; min-width: 140px; text-align: right; }
  .empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.4);
  }
  .empty-icon { font-size: 120px; margin-bottom: 20px; opacity: 0.5; }
  .empty-text { font-size: 28px; font-weight: 700; }
  .empty-sub { font-size: 16px; margin-top: 8px; color: rgba(255,255,255,0.3); }
  .totals {
    padding: 30px 40px;
    background: rgba(0,0,0,0.3);
    border-top: 2px solid rgba(255,255,255,0.1);
    backdrop-filter: blur(20px);
  }
  .subtotal-row {
    display: flex;
    justify-content: space-between;
    font-size: 20px;
    color: rgba(255,255,255,0.7);
    margin-bottom: 8px;
    font-weight: 600;
  }
  .discount-row {
    display: flex;
    justify-content: space-between;
    font-size: 18px;
    color: #fbbf24;
    margin-bottom: 8px;
    font-weight: 600;
  }
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-top: 16px;
    border-top: 2px dashed rgba(255,255,255,0.2);
    margin-top: 12px;
  }
  .total-label { font-size: 24px; font-weight: 700; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 2px; }
  .total-amount {
    font-size: 72px;
    font-weight: 900;
    background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -2px;
  }
  .change-row {
    display: flex;
    justify-content: space-between;
    font-size: 22px;
    color: #a7f3d0;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.1);
    font-weight: 700;
  }
  .thank-you {
    text-align: center;
    padding: 40px;
    animation: fadeIn 0.5s ease-out;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .thank-icon { font-size: 100px; margin-bottom: 20px; }
  .thank-title {
    font-size: 48px;
    font-weight: 900;
    background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 12px;
  }
  .thank-sub { font-size: 24px; color: rgba(255,255,255,0.8); font-weight: 600; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">${iconDataUrl ? `<img src="${iconDataUrl}" alt="">` : '<div style="font-size:40px;font-weight:900;color:#059669;text-align:center;line-height:44px">N</div>'}</div>
    <div>
      <div class="brand" id="shop-name">Nafaa</div>
      <div class="tagline">Aap ki khareedari</div>
    </div>
  </div>

  <div id="app-content" class="content">
    <div class="empty">
      <div class="empty-icon">🛒</div>
      <div class="empty-text">Assalam-o-Alaikum!</div>
      <div class="empty-sub">Aap ki khareedari ka intezaar hai</div>
    </div>
  </div>

  <script>
    const content = document.getElementById('app-content');
    const shopName = document.getElementById('shop-name');

    function formatPKR(n) {
      return 'Rs ' + (Number(n) || 0).toLocaleString('en-PK');
    }

    function render(data) {
      if (data.shopName) shopName.textContent = data.shopName;

      // Thank you screen
      if (data.mode === 'thank-you') {
        content.innerHTML = \`
          <div class="thank-you">
            <div class="thank-icon">🎉</div>
            <div class="thank-title">Shukriya!</div>
            <div class="thank-sub">Rs \${(data.total || 0).toLocaleString('en-PK')} paid via \${data.paymentMethod || 'cash'}</div>
            \${data.change ? \`<div class="thank-sub" style="margin-top:16px;color:#a7f3d0">Change: Rs \${data.change.toLocaleString('en-PK')}</div>\` : ''}
            <div class="thank-sub" style="margin-top:24px;font-size:18px">Phir tashreef laaiye ❤️</div>
          </div>
        \`;
        return;
      }

      // Empty cart
      if (!data.items || data.items.length === 0) {
        content.innerHTML = \`
          <div class="empty">
            <div class="empty-icon">🛒</div>
            <div class="empty-text">Assalam-o-Alaikum!</div>
            <div class="empty-sub">Aap ki khareedari ka intezaar hai</div>
          </div>
        \`;
        return;
      }

      // Cart with items
      const itemsHTML = data.items.map(it => \`
        <div class="item">
          <div class="item-name">\${it.name || 'Item'}</div>
          <div class="item-qty">\${it.quantity || 1} × \${formatPKR(it.price)}</div>
          <div class="item-total">\${formatPKR(it.total)}</div>
        </div>
      \`).join('');

      content.innerHTML = \`
        <div class="items">\${itemsHTML}</div>
        <div class="totals">
          <div class="subtotal-row">
            <span>Subtotal</span>
            <span>\${formatPKR(data.subtotal)}</span>
          </div>
          \${data.discount > 0 ? \`
            <div class="discount-row">
              <span>Discount</span>
              <span>- \${formatPKR(data.discount)}</span>
            </div>
          \` : ''}
          <div class="total-row">
            <span class="total-label">Total</span>
            <span class="total-amount">\${formatPKR(data.total)}</span>
          </div>
          \${data.change > 0 ? \`
            <div class="change-row">
              <span>Change</span>
              <span>\${formatPKR(data.change)}</span>
            </div>
          \` : ''}
        </div>
      \`;
    }

    if (window.electron?.onCustomerDisplayUpdate) {
      window.electron.onCustomerDisplayUpdate(render);
    }
  </script>
</body>
</html>`;
}

function getIconDataURL(): string {
  try {
    const buildDir = app.isPackaged
      ? path.join(process.resourcesPath, '..', 'build')
      : path.join(__dirname, '../../build');

    const p = path.join(buildDir, 'logo-256.png');
    if (fs.existsSync(p)) {
      return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
    }
  } catch {}
  return '';
}

/**
 * Open customer display on 2nd screen (fullscreen)
 * If only 1 screen, opens as windowed on same screen
 */
function openCustomerDisplay(): { success: boolean; message?: string } {
  try {
    if (displayWindow && !displayWindow.isDestroyed()) {
      displayWindow.show();
      displayWindow.focus();
      return { success: true };
    }

    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    const secondary = displays.find((d) => d.id !== primary.id);

    const target = secondary || primary;
    const isSecondary = !!secondary;

    displayWindow = new BrowserWindow({
      x: target.bounds.x,
      y: target.bounds.y,
      width: isSecondary ? target.bounds.width : 800,
      height: isSecondary ? target.bounds.height : 600,
      fullscreen: isSecondary,
      frame: !isSecondary,
      alwaysOnTop: isSecondary,
      autoHideMenuBar: true,
      title: 'Customer Display',
      backgroundColor: '#0f172a',
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    const html = getDisplayHTML(getIconDataURL());
    displayWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    displayWindow.on('closed', () => {
      displayWindow = null;
    });

    log.info(`Customer display opened on ${isSecondary ? 'secondary' : 'primary'} screen`);
    return { success: true, message: isSecondary ? 'Opened on 2nd monitor' : 'Only 1 screen — opened as window' };
  } catch (e: any) {
    log.error('Customer display open failed:', e);
    return { success: false, message: e.message };
  }
}

function closeCustomerDisplay() {
  if (displayWindow && !displayWindow.isDestroyed()) {
    displayWindow.close();
    displayWindow = null;
  }
}

function updateCustomerDisplay(data: any) {
  if (displayWindow && !displayWindow.isDestroyed()) {
    displayWindow.webContents.send('customer-display:update', data);
  }
}

export function setupCustomerDisplayHandlers() {
  ipcMain.handle('customerDisplay:open', () => openCustomerDisplay());
  ipcMain.handle('customerDisplay:close', () => {
    closeCustomerDisplay();
    return { success: true };
  });
  ipcMain.handle('customerDisplay:update', (_e, data) => {
    updateCustomerDisplay(data);
    return { success: true };
  });
  ipcMain.handle('customerDisplay:isOpen', () => {
    return !!(displayWindow && !displayWindow.isDestroyed());
  });
  ipcMain.handle('customerDisplay:getScreens', () => {
    return screen.getAllDisplays().map((d) => ({
      id: d.id,
      label: d.label || `Display ${d.id}`,
      bounds: d.bounds,
      isPrimary: d.id === screen.getPrimaryDisplay().id,
      scaleFactor: d.scaleFactor,
    }));
  });

  log.info('Customer display handlers registered');
}

export function closeCustomerDisplayOnQuit() {
  closeCustomerDisplay();
}
