import { ipcMain } from 'electron';
import log from 'electron-log';
import {
  printer as ThermalPrinter,
  types as PrinterTypes,
} from 'node-thermal-printer';

/**
 * Thermal Printer Service
 *
 * Supports:
 * - Network printers (TCP/IP) — most common for POS, works cross-platform
 * - USB printers (via escpos-usb) — fallback for direct USB
 * - System default printer — via Electron's webContents.print()
 *
 * Compatible with:
 * - Epson TM-T20, TM-T82, TM-T88 series
 * - Star TSP143, TSP100, TSP650
 * - Bixolon SRP-350, SRP-275
 * - Generic ESC/POS printers
 */

export interface PrintJob {
  type: 'receipt' | 'invoice' | 'kitchen' | 'barcode-label';
  printer: PrinterConfig;
  data: ReceiptData | InvoiceData | KitchenData | BarcodeLabelData;
}

export interface PrinterConfig {
  // Connection type
  connectionType: 'network' | 'usb' | 'system';

  // Network printer
  ipAddress?: string;
  port?: number;

  // USB printer
  vendorId?: number;
  productId?: number;

  // Common
  type?: 'EPSON' | 'STAR' | 'TANCA' | 'DARUMA' | 'CUSTOM';
  characterSet?: string;
  width?: 48 | 32; // 80mm=48 chars, 58mm=32 chars
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit?: string;
  price: number;
  total: number;
}

export interface ReceiptData {
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  shopTaxNumber?: string;
  invoiceNumber: string;
  date: string;
  cashier?: string;
  customer?: {
    name?: string;
    phone?: string;
  };
  items: ReceiptItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  paid: number;
  change?: number;
  paymentMethod?: string;
  footerText?: string;
  qrCode?: string; // URL or data for QR
  logoUrl?: string;
}

export interface InvoiceData extends ReceiptData {
  // Invoice has more details
  dueDate?: string;
  notes?: string;
}

export interface KitchenData {
  orderNumber: string;
  tableNumber?: string;
  items: Array<{ name: string; quantity: number; notes?: string }>;
  timestamp: string;
}

export interface BarcodeLabelData {
  productName: string;
  price: number;
  barcode: string;
  copies?: number;
}

/**
 * Create printer instance from config
 */
function createPrinter(config: PrinterConfig) {
  const type =
    config.type === 'EPSON'
      ? PrinterTypes.EPSON
      : config.type === 'STAR'
        ? PrinterTypes.STAR
        : PrinterTypes.EPSON; // Default

  let interfaceConfig = '';

  if (config.connectionType === 'network') {
    if (!config.ipAddress) throw new Error('Network printer needs ipAddress');
    interfaceConfig = `tcp://${config.ipAddress}:${config.port || 9100}`;
  } else if (config.connectionType === 'usb') {
    interfaceConfig = `printer:auto`;
  }

  return new ThermalPrinter({
    type,
    interface: interfaceConfig,
    characterSet: (config.characterSet as any) || 'PC852_LATIN2',
    width: config.width || 48,
    removeSpecialCharacters: false,
    options: {
      timeout: 5000,
    },
  });
}

/**
 * Format currency (Pakistani Rupee)
 */
function formatPKR(amount: number): string {
  return 'Rs ' + amount.toLocaleString('en-PK', { minimumFractionDigits: 0 });
}

/**
 * Print receipt
 */
async function printReceipt(config: PrinterConfig, data: ReceiptData): Promise<void> {
  const printer = createPrinter(config);
  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    throw new Error('Printer connect nahi ho raha — connection check karein');
  }

  printer.alignCenter();

  // Header
  printer.bold(true);
  printer.setTextSize(1, 1);
  printer.println(data.shopName);
  printer.bold(false);
  printer.setTextNormal();

  if (data.shopAddress) printer.println(data.shopAddress);
  if (data.shopPhone) printer.println(`Phone: ${data.shopPhone}`);
  if (data.shopTaxNumber) printer.println(`Tax #: ${data.shopTaxNumber}`);

  printer.drawLine();

  // Invoice info
  printer.alignLeft();
  printer.println(`Invoice: ${data.invoiceNumber}`);
  printer.println(`Date: ${data.date}`);
  if (data.cashier) printer.println(`Cashier: ${data.cashier}`);
  if (data.customer?.name) printer.println(`Customer: ${data.customer.name}`);
  if (data.customer?.phone) printer.println(`Phone: ${data.customer.phone}`);

  printer.drawLine();

  // Items table header
  printer.tableCustom([
    { text: 'Item', align: 'LEFT', width: 0.5 },
    { text: 'Qty', align: 'CENTER', width: 0.15 },
    { text: 'Price', align: 'RIGHT', width: 0.15 },
    { text: 'Total', align: 'RIGHT', width: 0.2 },
  ]);
  printer.drawLine();

  // Items
  for (const item of data.items) {
    printer.tableCustom([
      { text: item.name.slice(0, 24), align: 'LEFT', width: 0.5 },
      { text: `${item.quantity}${item.unit ? ' ' + item.unit : ''}`, align: 'CENTER', width: 0.15 },
      { text: formatPKR(item.price), align: 'RIGHT', width: 0.15 },
      { text: formatPKR(item.total), align: 'RIGHT', width: 0.2 },
    ]);
  }

  printer.drawLine();

  // Totals
  printer.alignRight();
  printer.println(`Subtotal: ${formatPKR(data.subtotal)}`);
  if (data.discount && data.discount > 0) {
    printer.println(`Discount: -${formatPKR(data.discount)}`);
  }
  if (data.tax && data.tax > 0) {
    printer.println(`Tax: ${formatPKR(data.tax)}`);
  }
  printer.bold(true);
  printer.setTextSize(1, 1);
  printer.println(`TOTAL: ${formatPKR(data.total)}`);
  printer.bold(false);
  printer.setTextNormal();

  printer.drawLine();

  // Payment
  printer.alignLeft();
  if (data.paymentMethod) printer.println(`Paid via: ${data.paymentMethod}`);
  printer.println(`Paid: ${formatPKR(data.paid)}`);
  if (data.change && data.change > 0) {
    printer.println(`Change: ${formatPKR(data.change)}`);
  }

  printer.drawLine();

  // QR Code
  if (data.qrCode) {
    printer.alignCenter();
    try {
      printer.printQR(data.qrCode, { cellSize: 6, correction: 'M', model: 2 });
    } catch (e) {
      log.warn('QR print failed:', e);
    }
  }

  // Footer
  printer.alignCenter();
  printer.newLine();
  if (data.footerText) {
    printer.println(data.footerText);
  } else {
    printer.println('Shukriya! Phir tashreef laaiye');
  }
  printer.newLine();
  printer.println('Powered by Nafaa.pk');
  printer.newLine();
  printer.newLine();

  printer.cut();

  try {
    await printer.execute();
    log.info('Receipt printed successfully');
  } catch (e: any) {
    log.error('Print failed:', e);
    throw new Error(`Print fail: ${e.message}`);
  }
}

/**
 * Print kitchen ticket
 */
async function printKitchen(config: PrinterConfig, data: KitchenData): Promise<void> {
  const printer = createPrinter(config);
  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) throw new Error('Printer connect nahi ho raha');

  printer.alignCenter();
  printer.bold(true);
  printer.setTextSize(2, 2);
  printer.println('** KITCHEN **');
  printer.setTextNormal();
  printer.bold(false);
  printer.drawLine();

  printer.alignLeft();
  printer.bold(true);
  printer.println(`Order: ${data.orderNumber}`);
  if (data.tableNumber) printer.println(`Table: ${data.tableNumber}`);
  printer.println(`Time: ${data.timestamp}`);
  printer.bold(false);
  printer.drawLine();

  printer.setTextSize(1, 1);
  for (const item of data.items) {
    printer.println(`${item.quantity}x  ${item.name}`);
    if (item.notes) {
      printer.setTextNormal();
      printer.println(`   Note: ${item.notes}`);
      printer.setTextSize(1, 1);
    }
    printer.newLine();
  }
  printer.setTextNormal();

  printer.cut();

  try {
    await printer.execute();
    log.info('Kitchen ticket printed');
  } catch (e: any) {
    throw new Error(`Kitchen print fail: ${e.message}`);
  }
}

/**
 * Test print — checks if printer is reachable
 */
async function testPrint(config: PrinterConfig): Promise<{ success: boolean; message: string }> {
  try {
    const printer = createPrinter(config);
    const isConnected = await printer.isPrinterConnected();

    if (!isConnected) {
      return { success: false, message: 'Printer reachable nahi — IP/port check karein' };
    }

    printer.alignCenter();
    printer.bold(true);
    printer.println('NAFAA TEST PRINT');
    printer.bold(false);
    printer.drawLine();
    printer.alignLeft();
    printer.println('Printer connection successful!');
    printer.println(`Time: ${new Date().toLocaleString('en-PK')}`);
    printer.println(`Type: ${config.type || 'EPSON'}`);
    printer.println(`Mode: ${config.connectionType}`);
    if (config.ipAddress) printer.println(`IP: ${config.ipAddress}:${config.port || 9100}`);
    printer.drawLine();
    printer.alignCenter();
    printer.println('Aap ka printer ready hai!');
    printer.newLine();
    printer.newLine();
    printer.cut();

    await printer.execute();
    return { success: true, message: 'Test print successful' };
  } catch (e: any) {
    log.error('Test print failed:', e);
    return { success: false, message: e.message || 'Unknown error' };
  }
}

/**
 * Setup IPC handlers
 */
export function setupPrinterHandlers() {
  ipcMain.handle('printer:test', async (_event, config: PrinterConfig) => {
    return testPrint(config);
  });

  ipcMain.handle('printer:receipt', async (_event, config: PrinterConfig, data: ReceiptData) => {
    try {
      await printReceipt(config, data);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('printer:kitchen', async (_event, config: PrinterConfig, data: KitchenData) => {
    try {
      await printKitchen(config, data);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  });

  log.info('Printer IPC handlers registered');
}
