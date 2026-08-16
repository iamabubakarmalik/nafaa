import { contextBridge, ipcRenderer } from 'electron';

/* ═══════════════════════════════════════════════════════════
   NAFAA PRELOAD — expanded API bridge
   Exposes safe native features to renderer via window.electron
   ═══════════════════════════════════════════════════════════ */

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
  items: Array<{ name: string; quantity: number; unit?: string; price: number; total: number }>;
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

export interface NotificationOptions {
  title: string;
  body: string;
  silent?: boolean;
  urgency?: 'normal' | 'critical' | 'low';
}

export interface UpdaterEvent {
  version?: string;
  releaseDate?: string;
  percent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  message?: string;
}

function makeListener<T>(channel: string) {
  return (callback: (data: T) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: T) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  };
}

const electronAPI = {
  isElectron: true as const,

  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<string>,
  getPlatform: () => ipcRenderer.invoke('app:getPlatform') as Promise<NodeJS.Platform>,
  getArch: () => ipcRenderer.invoke('app:getArch') as Promise<string>,
  isPackaged: () => ipcRenderer.invoke('app:isPackaged') as Promise<boolean>,

  // Settings
  getApiUrl: () => ipcRenderer.invoke('app:getApiUrl') as Promise<string>,
  setApiUrl: (url: string) => ipcRenderer.invoke('app:setApiUrl', url) as Promise<boolean>,
  getLocale: () => ipcRenderer.invoke('app:getLocale') as Promise<'en' | 'ur' | 'roman_ur'>,
  setLocale: (lang: 'en' | 'ur' | 'roman_ur') => ipcRenderer.invoke('app:setLocale', lang) as Promise<boolean>,
  getMinimizeToTray: () => ipcRenderer.invoke('app:getMinimizeToTray') as Promise<boolean>,
  setMinimizeToTray: (v: boolean) => ipcRenderer.invoke('app:setMinimizeToTray', v) as Promise<boolean>,
  getStartOnBoot: () => ipcRenderer.invoke('app:getStartOnBoot') as Promise<boolean>,
  setStartOnBoot: (v: boolean) => ipcRenderer.invoke('app:setStartOnBoot', v) as Promise<boolean>,
  getTheme: () => ipcRenderer.invoke('app:getTheme') as Promise<'system' | 'light' | 'dark'>,
  setTheme: (theme: 'system' | 'light' | 'dark') => ipcRenderer.invoke('app:setTheme', theme) as Promise<boolean>,
  isDarkMode: () => ipcRenderer.invoke('app:isDarkMode') as Promise<boolean>,

  // Actions
  openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url) as Promise<void>,
  showItemInFolder: (path: string) => ipcRenderer.invoke('app:showItemInFolder', path) as Promise<void>,
  relaunch: () => ipcRenderer.invoke('app:relaunch') as Promise<void>,
  quit: () => ipcRenderer.invoke('app:quit') as Promise<void>,
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates') as Promise<void>,

  // Reload (the missing feature!)
  reload: () => ipcRenderer.invoke('app:reload') as Promise<void>,
  forceReload: () => ipcRenderer.invoke('app:forceReload') as Promise<void>,
  clearCache: () => ipcRenderer.invoke('app:clearCache') as Promise<boolean>,

  // Notifications
  showNotification: (options: NotificationOptions) =>
    ipcRenderer.invoke('notification:show', options) as Promise<void>,

  // Window
  windowMinimize: () => ipcRenderer.invoke('window:minimize') as Promise<void>,
  windowMaximize: () => ipcRenderer.invoke('window:maximize') as Promise<void>,
  windowIsMaximized: () => ipcRenderer.invoke('window:isMaximized') as Promise<boolean>,
  windowClose: () => ipcRenderer.invoke('window:close') as Promise<void>,
  windowHide: () => ipcRenderer.invoke('window:hide') as Promise<void>,
  windowShow: () => ipcRenderer.invoke('window:show') as Promise<void>,
  toggleDevTools: () => ipcRenderer.invoke('window:toggleDevTools') as Promise<void>,

  // Printer
  printerTest: (config: PrinterConfig) => ipcRenderer.invoke('printer:test', config) as Promise<PrintResult>,
  printerReceipt: (config: PrinterConfig, data: ReceiptData) =>
    ipcRenderer.invoke('printer:receipt', config, data) as Promise<PrintResult>,
  printerKitchen: (config: PrinterConfig, data: KitchenData) =>
    ipcRenderer.invoke('printer:kitchen', config, data) as Promise<PrintResult>,

  // Scanner
  scannerTest: () => ipcRenderer.invoke('scanner:test') as Promise<{ supported: boolean; method: string; note: string }>,
  scannerEnableGlobal: () => ipcRenderer.invoke('scanner:enable-global') as Promise<{ enabled: boolean }>,
  scannerDisableGlobal: () => ipcRenderer.invoke('scanner:disable-global') as Promise<{ enabled: boolean }>,

  // Local backup (auto-save to ~/Documents/Nafaa Backups/)
  backupSave: (jsonData: string, name?: string) =>
    ipcRenderer.invoke('backup:save', jsonData, name) as Promise<{ success: boolean; path?: string; message?: string }>,
  backupList: () => ipcRenderer.invoke('backup:list') as Promise<Array<{ name: string; path: string; size: number; time: number }>>,
  backupRead: (filePath: string) => ipcRenderer.invoke('backup:read', filePath) as Promise<string>,
  backupPick: () => ipcRenderer.invoke('backup:pick') as Promise<string | null>,
  backupOpenFolder: () => ipcRenderer.invoke('backup:openFolder') as Promise<boolean>,
  backupGetPath: () => ipcRenderer.invoke('backup:getPath') as Promise<string>,

  // Performance monitor
  getPerformanceStats: () => ipcRenderer.invoke('app:getPerformanceStats') as Promise<{
    memory: { rss: number; heapUsed: number; heapTotal: number; external: number };
    uptime: number;
    cpuUsage: NodeJS.CpuUsage;
    versions: { electron: string; chrome: string; node: string };
  }>,
  onMemoryCritical: (callback: (data: { rss: number; heap: number }) => void) => {
    const handler = (_e: any, data: any) => callback(data);
    ipcRenderer.on('performance:memory-critical', handler);
    return () => ipcRenderer.removeListener('performance:memory-critical', handler);
  },

  // Power events
  onPowerChanged: (callback: (data: { source: 'ac' | 'battery' }) => void) => {
    const handler = (_e: any, data: any) => callback(data);
    ipcRenderer.on('power:changed', handler);
    return () => ipcRenderer.removeListener('power:changed', handler);
  },
  onPowerSuspend: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('power:suspend', handler);
    return () => ipcRenderer.removeListener('power:suspend', handler);
  },
  onPowerResume: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('power:resume', handler);
    return () => ipcRenderer.removeListener('power:resume', handler);
  },

  // Cash drawer (opens on cash sale via thermal printer)
  cashDrawerOpen: (config: {
    connectionType: 'network' | 'usb';
    ipAddress?: string;
    port?: number;
    type?: 'EPSON' | 'STAR';
    pin?: 2 | 5;
  }) => ipcRenderer.invoke('cashDrawer:open', config) as Promise<{ success: boolean; message?: string }>,

  // Print queue (serialize + retry)
  printQueueAdd: (type: 'receipt' | 'kitchen' | 'system-html', config: any, data: any) =>
    ipcRenderer.invoke('printQueue:add', type, config, data) as Promise<{ id: string }>,
  printQueueStatus: () => ipcRenderer.invoke('printQueue:status') as Promise<{
    items: Array<{ id: string; type: string; status: string; attempts: number; error?: string; createdAt: number }>;
    pending: number;
    printing: number;
    failed: number;
  }>,
  printQueueRetry: (id: string) => ipcRenderer.invoke('printQueue:retry', id) as Promise<{ success: boolean; message?: string }>,
  printQueueClear: () => ipcRenderer.invoke('printQueue:clear') as Promise<{ success: boolean }>,
  onPrintQueueUpdated: (callback: (data: { total: number; pending: number; printing: number; failed: number }) => void) => {
    const handler = (_e: any, data: any) => callback(data);
    ipcRenderer.on('printQueue:updated', handler);
    return () => ipcRenderer.removeListener('printQueue:updated', handler);
  },

  // Deep-link navigation (nafaa:// URLs)
  onDeepLinkNavigate: (callback: (path: string) => void) => {
    const handler = (_e: any, path: string) => callback(path);
    ipcRenderer.on('deeplink:navigate', handler);
    return () => ipcRenderer.removeListener('deeplink:navigate', handler);
  },

  // Customer display (2nd monitor)
  customerDisplayOpen: () => ipcRenderer.invoke('customerDisplay:open') as Promise<{ success: boolean; message?: string }>,
  customerDisplayClose: () => ipcRenderer.invoke('customerDisplay:close') as Promise<{ success: boolean }>,
  customerDisplayUpdate: (data: {
    mode?: 'cart' | 'thank-you';
    shopName?: string;
    items?: Array<{ name: string; quantity: number; price: number; total: number }>;
    subtotal?: number;
    discount?: number;
    total?: number;
    change?: number;
    paymentMethod?: string;
  }) => ipcRenderer.invoke('customerDisplay:update', data) as Promise<{ success: boolean }>,
  customerDisplayIsOpen: () => ipcRenderer.invoke('customerDisplay:isOpen') as Promise<boolean>,
  customerDisplayGetScreens: () => ipcRenderer.invoke('customerDisplay:getScreens') as Promise<Array<{
    id: number;
    label: string;
    bounds: { x: number; y: number; width: number; height: number };
    isPrimary: boolean;
    scaleFactor: number;
  }>>,
  onCustomerDisplayUpdate: (callback: (data: any) => void) => {
    const handler = (_e: any, data: any) => callback(data);
    ipcRenderer.on('customer-display:update', handler);
    return () => ipcRenderer.removeListener('customer-display:update', handler);
  },

  // Label printer (barcode stickers)
  labelPrint: (data: {
    productName: string;
    price: number;
    barcode: string;
    sku?: string;
    copies?: number;
    labelSize?: 'small' | 'medium' | 'large';
    showPrice?: boolean;
    showName?: boolean;
  }, printerName?: string) => ipcRenderer.invoke('label:print', data, printerName) as Promise<{ success: boolean; message?: string }>,

  // Session recovery (auto-save cart on crash)
  sessionSave: (data: any) => ipcRenderer.invoke('session:save', data) as Promise<{ success: boolean }>,
  sessionLoad: () => ipcRenderer.invoke('session:load') as Promise<{ savedAt: number; version: string; data: any } | null>,
  sessionClear: () => ipcRenderer.invoke('session:clear') as Promise<{ success: boolean }>,

  // Logging (renderer → main log file)
  logInfo: (msg: string) => ipcRenderer.invoke('log:info', msg) as Promise<void>,
  logError: (msg: string) => ipcRenderer.invoke('log:error', msg) as Promise<void>,
  openLogsFolder: () => ipcRenderer.invoke('log:openFolder') as Promise<void>,

  // Event listeners
  onUpdateAvailable: makeListener<UpdaterEvent>('updater:available'),
  onUpdateNotAvailable: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('updater:not-available', handler);
    return () => ipcRenderer.removeListener('updater:not-available', handler);
  },
  onUpdateProgress: makeListener<UpdaterEvent>('updater:progress'),
  onUpdateDownloaded: makeListener<UpdaterEvent>('updater:downloaded'),
  onUpdateError: makeListener<UpdaterEvent>('updater:error'),
  onTrayNavigate: makeListener<string>('tray:navigate'),
  onMenuNavigate: makeListener<string>('menu:navigate'),
  onMenuPrint: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('menu:print', handler);
    return () => ipcRenderer.removeListener('menu:print', handler);
  },
  onThemeChanged: makeListener<'light' | 'dark'>('theme:changed'),
  onScannerFocusInput: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('scanner:focus-input', handler);
    return () => ipcRenderer.removeListener('scanner:focus-input', handler);
  },
  onSplashStatus: (callback: (msg: string) => void) => {
    const handler = (_e: any, msg: string) => callback(msg);
    ipcRenderer.on('splash:status', handler);
    return () => ipcRenderer.removeListener('splash:status', handler);
  },
};

contextBridge.exposeInMainWorld('electron', electronAPI);

export type ElectronAPI = typeof electronAPI;

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}
