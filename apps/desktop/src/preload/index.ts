import { contextBridge, ipcRenderer } from 'electron';

/**
 * Exposed API to renderer (web app) via window.electron
 */

export interface UpdaterEvent {
  version?: string;
  releaseDate?: string;
  percent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  message?: string;
}

export interface NotificationOptions {
  title: string;
  body: string;
  silent?: boolean;
  urgency?: 'normal' | 'critical' | 'low';
}

// ─── Printer types ──────────────────────────────────────────────
export interface PrinterConfig {
  connectionType: 'network' | 'usb' | 'system';
  ipAddress?: string;
  port?: number;
  vendorId?: number;
  productId?: number;
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
  logoUrl?: string;
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

// ─── Main API ───────────────────────────────────────────────────
export interface ElectronAPI {
  isElectron: true;

  // App info
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<NodeJS.Platform>;

  // Settings
  getApiUrl: () => Promise<string>;
  setApiUrl: (url: string) => Promise<boolean>;
  getLocale: () => Promise<'en' | 'ur' | 'roman_ur'>;
  setLocale: (lang: 'en' | 'ur' | 'roman_ur') => Promise<boolean>;
  getMinimizeToTray: () => Promise<boolean>;
  setMinimizeToTray: (value: boolean) => Promise<boolean>;

  // Actions
  openExternal: (url: string) => Promise<void>;
  relaunch: () => Promise<void>;
  checkForUpdates: () => Promise<void>;

  // Notifications
  showNotification: (options: NotificationOptions) => Promise<void>;

  // Window controls
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;

  // Printer
  printerTest: (config: PrinterConfig) => Promise<PrintResult>;
  printerReceipt: (config: PrinterConfig, data: ReceiptData) => Promise<PrintResult>;
  printerKitchen: (config: PrinterConfig, data: KitchenData) => Promise<PrintResult>;

  // Scanner
  scannerTest: () => Promise<{ supported: boolean; method: string; note: string }>;
  scannerEnableGlobal: () => Promise<{ enabled: boolean }>;
  scannerDisableGlobal: () => Promise<{ enabled: boolean }>;

  // Event listeners (return cleanup function)
  onUpdateAvailable: (callback: (event: UpdaterEvent) => void) => () => void;
  onUpdateNotAvailable: (callback: () => void) => () => void;
  onUpdateProgress: (callback: (event: UpdaterEvent) => void) => () => void;
  onUpdateDownloaded: (callback: (event: UpdaterEvent) => void) => () => void;
  onUpdateError: (callback: (event: UpdaterEvent) => void) => () => void;
  onTrayNavigate: (callback: (path: string) => void) => () => void;
}

function makeListener<T>(channel: string) {
  return (callback: (data: T) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: T) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  };
}

const electronAPI: ElectronAPI = {
  isElectron: true,

  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),

  // Settings
  getApiUrl: () => ipcRenderer.invoke('app:getApiUrl'),
  setApiUrl: (url) => ipcRenderer.invoke('app:setApiUrl', url),
  getLocale: () => ipcRenderer.invoke('app:getLocale'),
  setLocale: (lang) => ipcRenderer.invoke('app:setLocale', lang),
  getMinimizeToTray: () => ipcRenderer.invoke('app:getMinimizeToTray'),
  setMinimizeToTray: (value) => ipcRenderer.invoke('app:setMinimizeToTray', value),

  // Actions
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  relaunch: () => ipcRenderer.invoke('app:relaunch'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),

  // Notifications
  showNotification: (options) => ipcRenderer.invoke('notification:show', options),

  // Window
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowMaximize: () => ipcRenderer.invoke('window:maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),

  // Printer
  printerTest: (config) => ipcRenderer.invoke('printer:test', config),
  printerReceipt: (config, data) => ipcRenderer.invoke('printer:receipt', config, data),
  printerKitchen: (config, data) => ipcRenderer.invoke('printer:kitchen', config, data),

  // Scanner
  scannerTest: () => ipcRenderer.invoke('scanner:test'),
  scannerEnableGlobal: () => ipcRenderer.invoke('scanner:enable-global'),
  scannerDisableGlobal: () => ipcRenderer.invoke('scanner:disable-global'),

  // Events
  onUpdateAvailable: makeListener<UpdaterEvent>('updater:available'),
  onUpdateNotAvailable: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('updater:not-available', handler);
    return () => ipcRenderer.removeListener('updater:not-available', handler);
  },
  onUpdateProgress: makeListener<UpdaterEvent>('updater:progress'),
  onUpdateDownloaded: makeListener<UpdaterEvent>('updater:downloaded'),
  onUpdateError: makeListener<UpdaterEvent>('updater:error'),
  onTrayNavigate: makeListener<string>('tray:navigate'),
};

contextBridge.exposeInMainWorld('electron', electronAPI);

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}
