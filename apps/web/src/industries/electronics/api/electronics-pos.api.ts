import { apiClient } from '@core/api/client';
import type { CategoryType, ConditionType } from '../constants';

/**
 * Electronics POS catalog — ek hi call me poora counter data.
 * Backend: apps/api/src/industries/electronics/pos/electronics-pos.service.ts
 */

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
  categoryType: CategoryType | null;
  conditionType: ConditionType | null;
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
