/**
 * Electron Desktop Integration
 * Detects if running in Electron and provides typed access to native features.
 */

export interface PrinterConfig {
  connectionType: 'network' | 'usb' | 'system';
  ipAddress?: string;
  port?: number;
  type?: 'EPSON' | 'STAR' | 'TANCA' | 'DARUMA' | 'CUSTOM';
  characterSet?: string;
  width?: 48 | 32;
}

export interface ReceiptData {
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  shopTaxNumber?: string;
  invoiceNumber: string;
  date: string;
  cashier?: string;
  customer?: { name?: string; phone?: string };
  items: Array<{
    name: string;
    quantity: number;
    unit?: string;
    price: number;
    total: number;
  }>;
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  paid: number;
  change?: number;
  paymentMethod?: string;
  footerText?: string;
  qrCode?: string;
}

export interface KitchenData {
  orderNumber: string;
  tableNumber?: string;
  items: Array<{ name: string; quantity: number; notes?: string }>;
  timestamp: string;
}

export interface PrintResult {
  success: boolean;
  message?: string;
}

export interface ElectronAPI {
  isElectron: true;
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  getApiUrl: () => Promise<string>;
  setApiUrl: (url: string) => Promise<boolean>;
  getLocale: () => Promise<'en' | 'ur' | 'roman_ur'>;
  setLocale: (lang: 'en' | 'ur' | 'roman_ur') => Promise<boolean>;
  getMinimizeToTray: () => Promise<boolean>;
  setMinimizeToTray: (value: boolean) => Promise<boolean>;
  openExternal: (url: string) => Promise<void>;
  relaunch: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  showNotification: (options: {
    title: string;
    body: string;
    silent?: boolean;
    urgency?: 'normal' | 'critical' | 'low';
  }) => Promise<void>;
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  printerTest: (config: PrinterConfig) => Promise<PrintResult>;
  printerReceipt: (config: PrinterConfig, data: ReceiptData) => Promise<PrintResult>;
  printerKitchen: (config: PrinterConfig, data: KitchenData) => Promise<PrintResult>;
  scannerTest: () => Promise<{ supported: boolean; method: string; note: string }>;
  scannerEnableGlobal: () => Promise<{ enabled: boolean }>;
  scannerDisableGlobal: () => Promise<{ enabled: boolean }>;
  onUpdateAvailable: (cb: (e: any) => void) => () => void;
  onUpdateNotAvailable: (cb: () => void) => () => void;
  onUpdateProgress: (cb: (e: any) => void) => () => void;
  onUpdateDownloaded: (cb: (e: any) => void) => () => void;
  onUpdateError: (cb: (e: any) => void) => () => void;
  onTrayNavigate: (cb: (path: string) => void) => () => void;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electron?.isElectron;
}

export function getElectron(): ElectronAPI | null {
  if (typeof window === 'undefined') return null;
  return window.electron || null;
}
