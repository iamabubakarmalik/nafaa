import { apiClient } from '@core/api/client';
import type { ProductImei } from './imei.api';
import type { UsedPhone } from './used-phones.api';

/**
 * Mobile POS catalog — ek hi call me POS ki teeno tabs ka data.
 * Backend: apps/api/src/industries/mobile/pos/mobile-pos.service.ts
 */

/** IN_STOCK naya phone, resolved sale price ke saath. */
export interface PosPhone extends Omit<ProductImei, 'product' | 'variant'> {
  /** variant.price ?? product.price — wohi jo checkout par lagta hai */
  salePrice: number;
  resolvedCostPrice: number;
  productName: string;
  brandName: string | null;
  imageUrl: string | null;
  product?: {
    id: string;
    name: string;
    sku?: string | null;
    unit?: string | null;
    price: number;
    costPrice: number;
    images?: { url: string }[];
  } | null;
  variant?: {
    id: string;
    name: string;
    color?: string | null;
    colorHex?: string | null;
    price: number;
    costPrice: number;
  } | null;
}

/** Non-IMEI product (charger, cover, handsfree...) — stock current shop ka. */
export interface PosAccessory {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  price: number;
  costPrice: number;
  stock: number;
  lowStockAlert: number;
  hasVariants: boolean;
  imageUrl: string | null;
  /** true = is shop ke liye stock row hi nahi bani (checkout fail hoga) */
  notInShop: boolean;
}

export interface MobilePosCatalog {
  phones: PosPhone[];
  usedPhones: UsedPhone[];
  accessories: PosAccessory[];
  /** Trade-in ho chuke lekin inspection me atke phones — ye POS me nahi bikte */
  usedPhonesPendingInspection: number;
  counts: { phones: number; usedPhones: number; accessories: number };
}

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const mobilePosApi = {
  catalog: (params: { shopId?: string; search?: string }) =>
    apiClient
      .get('/industries/mobile/pos/catalog', { params })
      .then(unwrap) as Promise<MobilePosCatalog>,
};
