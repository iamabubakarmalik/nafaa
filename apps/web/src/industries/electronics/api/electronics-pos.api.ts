import { apiClient } from '@core/api/client';

/**
 * Electronics POS catalog — ek hi call me poora counter data.
 * Backend: apps/api/src/industries/electronics/pos/electronics-pos.service.ts
 */

export type ElectronicsCategoryType =
  | 'CABLE' | 'CHARGER' | 'POWER_BANK' | 'HEADPHONE' | 'EARBUD' | 'SPEAKER'
  | 'BLUETOOTH_SPEAKER' | 'SMARTWATCH' | 'FITNESS_BAND' | 'DRONE' | 'CAMERA'
  | 'DSLR' | 'ACTION_CAMERA' | 'WEBCAM' | 'KEYBOARD' | 'MOUSE' | 'MONITOR'
  | 'LAPTOP_ACCESSORY' | 'PHONE_ACCESSORY' | 'CAR_ACCESSORY' | 'SMART_HOME'
  | 'LED_LIGHT' | 'ROUTER' | 'MEMORY_CARD' | 'USB_DRIVE' | 'HARD_DRIVE'
  | 'SSD' | 'ADAPTER' | 'CONVERTER' | 'SCREEN_PROTECTOR' | (string & {});

export type ElectronicsConditionType =
  | 'BRAND_NEW' | 'OPEN_BOX' | 'REFURBISHED' | 'USED' | 'DAMAGED' | 'FOR_PARTS';

/** POS par dikhne wala ek serial/IMEI-tracked unit */
export interface PosSerial {
  id: string;
  productId: string;
  serialNumber: string;
  imei?: string | null;
  macAddress?: string | null;
  status: string;
  purchasePrice?: number | null;
  warrantyEndDate?: string | null;
  warrantyStatus?: string | null;
  batteryHealthPct?: number | null;
  physicalCondition?: string | null;
}

export interface PosElectronicsProduct {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  /** Shop ka apna rate ho to wohi, warna product ka */
  price: number;
  costPrice: number;
  wholesalePrice?: number | null;
  mrp?: number | null;
  /** Is shop ka stock (global nahi) */
  stock: number;
  lowStockAlert: number;
  hasVariants: boolean;
  /** true = is shop ke liye stock row hi nahi bani — checkout fail hoga */
  notInShop: boolean;
  imageUrl: string | null;
  brandId: string | null;
  brandName: string | null;
  categoryId: string | null;
  categoryName: string | null;

  // Electronics ki apni cheezein
  categoryType: ElectronicsCategoryType | null;
  conditionType: ElectronicsConditionType | null;
  modelNumber: string | null;
  colorName: string | null;
  colorHex: string | null;
  warrantyMonths: number;
  warrantyType: string | null;
  requiresSerial: boolean;
  hasImei: boolean;
  screenSize: string | null;
  connectivity: string[];
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;

  // Catalog service se judi hui cheezein
  serials: PosSerial[];
  serialCount: number;
  /** Serial wale product ki asli ginti serials se aati hai */
  availableStock: number;
}

export interface PosBundleItem {
  productId: string;
  name?: string;
  quantity: number;
  unitPrice?: number;
  [k: string]: any;
}

export interface PosBundle {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  items: PosBundleItem[];
  originalPrice: number;
  bundlePrice: number;
  savings: number;
  savingsPct: number;
  isFeatured: boolean;
  totalSold: number;
  validUntil?: string | null;
}

export interface ElectronicsPosCatalog {
  items: PosElectronicsProduct[];
  bundles: PosBundle[];
  counts: { products: number; serialTracked: number; bundles: number };
}

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const electronicsPosApi = {
  catalog: (params: { shopId?: string; search?: string; categoryType?: string }) =>
    apiClient
      .get('/electronics/pos/catalog', { params })
      .then(unwrap) as Promise<ElectronicsPosCatalog>,
};

/* ── Category labels — POS filters aur reports dono me ── */
export const CATEGORY_TYPE_LABELS: Record<string, string> = {
  CABLE: 'Cable',
  CHARGER: 'Charger',
  POWER_BANK: 'Power Bank',
  HEADPHONE: 'Headphones',
  EARBUD: 'Earbuds',
  SPEAKER: 'Speaker',
  BLUETOOTH_SPEAKER: 'Bluetooth Speaker',
  SMARTWATCH: 'Smart Watch',
  FITNESS_BAND: 'Fitness Band',
  DRONE: 'Drone',
  CAMERA: 'Camera',
  DSLR: 'DSLR',
  ACTION_CAMERA: 'Action Camera',
  WEBCAM: 'Webcam',
  KEYBOARD: 'Keyboard',
  MOUSE: 'Mouse',
  MONITOR: 'Monitor / Screen',
  LAPTOP_ACCESSORY: 'Laptop Accessory',
  PHONE_ACCESSORY: 'Phone Accessory',
  CAR_ACCESSORY: 'Car Accessory',
  SMART_HOME: 'Smart Home',
  LED_LIGHT: 'LED Light',
  ROUTER: 'Router',
  MEMORY_CARD: 'Memory Card',
  USB_DRIVE: 'USB Drive',
  HARD_DRIVE: 'Hard Drive',
  SSD: 'SSD',
  ADAPTER: 'Adapter',
  CONVERTER: 'Converter',
  SCREEN_PROTECTOR: 'Screen Protector',
};

export const CONDITION_LABELS: Record<ElectronicsConditionType, string> = {
  BRAND_NEW: 'Brand New',
  OPEN_BOX: 'Open Box',
  REFURBISHED: 'Refurbished',
  USED: 'Used',
  DAMAGED: 'Damaged',
  FOR_PARTS: 'For Parts',
};

export const CONDITION_COLORS: Record<ElectronicsConditionType, string> = {
  BRAND_NEW: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  OPEN_BOX: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  REFURBISHED: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  USED: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  DAMAGED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  FOR_PARTS: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};
