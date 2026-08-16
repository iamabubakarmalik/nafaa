import { ipcMain } from 'electron';
import log from 'electron-log';

/* ═══════════════════════════════════════════════════════════
   CASH DRAWER — auto-open on cash sale
   ─────────────────────────────────────────────────────────
   Most thermal printers have RJ11/RJ12 port that fires
   a solenoid pulse to open the connected cash drawer.
   ESC/POS command: 0x1B 0x70 0x00 0x19 0xFA
   ═══════════════════════════════════════════════════════════ */

let ThermalPrinter: any = null;
let PrinterTypes: any = null;

function loadModule(): boolean {
  if (ThermalPrinter) return true;
  try {
    const mod = require('node-thermal-printer');
    ThermalPrinter = mod.printer;
    PrinterTypes = mod.types;
    return true;
  } catch (e) {
    log.error('Failed to load thermal printer module for cash drawer:', e);
    return false;
  }
}

export interface CashDrawerConfig {
  connectionType: 'network' | 'usb';
  ipAddress?: string;
  port?: number;
  type?: 'EPSON' | 'STAR';
  pin?: 2 | 5; // RJ11 pin (default 2)
}

/**
 * Open cash drawer via thermal printer
 */
async function openCashDrawer(config: CashDrawerConfig): Promise<{ success: boolean; message?: string }> {
  if (!loadModule()) {
    return { success: false, message: 'Thermal printer module load nahi hua' };
  }

  try {
    const type = config.type === 'STAR' ? PrinterTypes.STAR : PrinterTypes.EPSON;
    let interfaceConfig = '';

    if (config.connectionType === 'network') {
      if (!config.ipAddress) return { success: false, message: 'IP address required' };
      interfaceConfig = `tcp://${config.ipAddress}:${config.port || 9100}`;
    } else if (config.connectionType === 'usb') {
      interfaceConfig = 'printer:auto';
    }

    const printer = new ThermalPrinter({
      type,
      interface: interfaceConfig,
      options: { timeout: 3000 },
    });

    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      return { success: false, message: 'Printer connect nahi ho raha' };
    }

    // ESC/POS command: open cash drawer
    // 0x1B 0x70 <pin> <on_time> <off_time>
    printer.openCashDrawer();
    await printer.execute();

    log.info('Cash drawer opened');
    return { success: true };
  } catch (e: any) {
    log.error('Cash drawer open failed:', e);
    return { success: false, message: e.message };
  }
}

export function setupCashDrawerHandlers() {
  ipcMain.handle('cashDrawer:open', async (_event, config: CashDrawerConfig) => {
    return openCashDrawer(config);
  });

  log.info('Cash drawer handlers registered');
}
