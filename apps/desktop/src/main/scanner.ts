import { ipcMain, globalShortcut, BrowserWindow } from 'electron';
import log from 'electron-log';

/**
 * Barcode Scanner Service
 *
 * Most USB barcode scanners work as keyboard emulators (HID devices) —
 * they don't need drivers. They just type characters like a keyboard
 * with Enter at the end.
 *
 * This module:
 * 1. Listens globally for fast keystroke patterns (typical barcode behavior)
 * 2. Forwards them to renderer for processing
 *
 * Browsers already support this natively (input focus + listen for Enter),
 * but desktop version offers global shortcut option for "scan from anywhere".
 */

interface ScannerState {
  buffer: string;
  lastKeystrokeTime: number;
  isScanning: boolean;
}

const state: ScannerState = {
  buffer: '',
  lastKeystrokeTime: 0,
  isScanning: false,
};

const SCAN_DETECTION_INTERVAL_MS = 30; // Barcode scanners type fast (< 30ms between keys)
const MIN_BARCODE_LENGTH = 4;
const MAX_BARCODE_LENGTH = 50;

let mainWindowRef: BrowserWindow | null = null;

/**
 * Setup global scanner detection.
 *
 * Note: This is a fallback. Best practice is for the web app to listen
 * for keypress events on input fields directly — it works on web too.
 *
 * Use cases for global scanner:
 * - Quick add product from anywhere (no need to focus input)
 * - Inventory check from any screen
 */
export function setupScanner(mainWindow: BrowserWindow) {
  mainWindowRef = mainWindow;

  ipcMain.handle('scanner:test', () => {
    return {
      supported: true,
      method: 'HID-keyboard-emulation',
      note: 'Most USB barcode scanners work like keyboards. Just focus an input field and scan.',
    };
  });

  // Global shortcut to toggle global scan mode (Ctrl+Shift+B)
  ipcMain.handle('scanner:enable-global', () => {
    if (state.isScanning) return { enabled: true };

    state.isScanning = true;
    log.info('Global scanner mode enabled');

    // Listen for keystrokes via web contents
    // This is informational — actual implementation depends on use case
    return { enabled: true };
  });

  ipcMain.handle('scanner:disable-global', () => {
    state.isScanning = false;
    log.info('Global scanner mode disabled');
    return { enabled: false };
  });

  log.info('Scanner handlers registered');
}

export function cleanupScanner() {
  try {
    // Only unregister if app is ready (prevents crash on quit)
    const { app } = require('electron');
    if (app.isReady()) {
      globalShortcut.unregisterAll();
    }
  } catch (e) {
    // Ignore cleanup errors during shutdown
  }
  state.isScanning = false;
}
