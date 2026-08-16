import { ipcMain, globalShortcut, BrowserWindow, app } from 'electron';
import log from 'electron-log';

/* ═══════════════════════════════════════════════════════════
   BARCODE SCANNER
   ─────────────────────────────────────────────────────────
   USB scanners emulate keyboard — mostly renderer-side.
   Global shortcuts for "scan from anywhere in app":
   • Ctrl/Cmd+Shift+B → focus barcode input (broadcast)
   • Ctrl/Cmd+Shift+S → open POS (quick scan)
   ═══════════════════════════════════════════════════════════ */

interface ScannerState {
  isScanning: boolean;
}

const state: ScannerState = { isScanning: false };
let mainWindowRef: BrowserWindow | null = null;

export function setupScanner(mainWindow: BrowserWindow) {
  mainWindowRef = mainWindow;

  ipcMain.handle('scanner:test', () => {
    return {
      supported: true,
      method: 'HID-keyboard-emulation',
      note: 'USB barcode scanners work like keyboards. Focus input & scan. Use Ctrl+Shift+B to focus barcode input from anywhere.',
    };
  });

  ipcMain.handle('scanner:enable-global', () => {
    state.isScanning = true;
    registerGlobalShortcuts();
    return { enabled: true };
  });

  ipcMain.handle('scanner:disable-global', () => {
    state.isScanning = false;
    unregisterGlobalShortcuts();
    return { enabled: false };
  });

  // Auto-register on startup
  try {
    registerGlobalShortcuts();
  } catch (e) {
    log.warn('Global shortcuts registration failed:', e);
  }

  log.info('Scanner handlers registered');
}

function registerGlobalShortcuts() {
  try {
    // Ctrl/Cmd+Shift+B → broadcast "focus barcode input"
    globalShortcut.register('CommandOrControl+Shift+B', () => {
      log.info('Global scan shortcut triggered');
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.show();
        mainWindowRef.focus();
        mainWindowRef.webContents.send('scanner:focus-input');
      }
    });

    // Ctrl/Cmd+Shift+S → open POS quickly
    globalShortcut.register('CommandOrControl+Shift+S', () => {
      log.info('Global POS shortcut triggered');
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.show();
        mainWindowRef.focus();
        mainWindowRef.webContents.send('menu:navigate', '/pos');
      }
    });
  } catch (e) {
    log.warn('Failed to register global shortcuts:', e);
  }
}

function unregisterGlobalShortcuts() {
  try {
    globalShortcut.unregister('CommandOrControl+Shift+B');
    globalShortcut.unregister('CommandOrControl+Shift+S');
  } catch {}
}

export function cleanupScanner() {
  try {
    if (app.isReady()) {
      globalShortcut.unregisterAll();
    }
  } catch {}
  state.isScanning = false;
}
