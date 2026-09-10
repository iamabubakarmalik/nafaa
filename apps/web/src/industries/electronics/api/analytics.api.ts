import { apiClient } from '@core/api/client';
import type { CategoryType, ConditionType } from '../constants';

/**
 * Electronics analytics — profit (category/condition/brand),
 * low stock, aur stock report (umar + warranty).
 * Backend: apps/api/src/industries/electronics/analytics/
 */

export interface ProfitBucket {
  revenue: number;
  cost: number;
  profit: number;
  units: number;
  margin: number;
}

export interface ElectronicsProfit {
  range: { from: string; to: string };
  totals: ProfitBucket & { salesCount: number };
  byCategory: (ProfitBucket & { categoryType: CategoryType })[];
  byCondition: (ProfitBucket & { conditionType: ConditionType })[];
  topBrands: (ProfitBucket & { id: string; name: string })[];
  topProducts: (ProfitBucket & { id: string; name: string; category: CategoryType | null })[];
  /** Serial-tracked (mehngi) cheezon ka alag hisab */
  serialTracked: { units: number; revenue: number };
  daily: { date: string; revenue: number; profit: number }[];
}

export interface LowStockRow {
  productId: string;
  name: string;
  sku: string | null;
  unit: string;
  brand: string | null;
  category: string | null;
  categoryType: CategoryType | null;
  conditionType: ConditionType | null;
  requiresSerial: boolean;
  warrantyMonths: number;
  stock: number;
  lowStockAlert: number;
  price: number;
  costPrice: number;
  stockValue: number;
  isOut: boolean;
  notInShop: boolean;
}

export interface ElectronicsLowStock {
  items: LowStockRow[];
  summary: {
    totalLow: number;
    totalOut: number;
    serialTrackedLow: number;
    valueAtRisk: number;
  };
}

export interface StockSerialRow {
  id: string;
  productId: string;
  name: string;
  brand: string | null;
  categoryType: CategoryType | null;
  conditionType: ConditionType | null;
  serialNumber: string;
  imei?: string | null;
  cost: number;
  price: number;
  ageDays: number;
  bucket: string;
  warrantyEndDate?: string | null;
  warrantyStatus?: string | null;
  /** Kitne din baad warranty khatam (minus = khatam ho chuki) */
  warrantyDaysLeft: number | null;
  physicalCondition?: string | null;
}

export interface StockProductRow {
  productId: string;
  name: string;
  sku: string | null;
  unit: string;
  brand: string | null;
  categoryType: CategoryType | null;
  conditionType: ConditionType | null;
  stock: number;
  unitCost: number;
  price: number;
  value: number;
  retailValue: number;
}

export interface ElectronicsStockReport {
  buckets: { key: string; label: string; min: number; max: number; units: number; value: number }[];
  serials: StockSerialRow[];
  products: StockProductRow[];
  deadStock: { count: number; value: number; items: StockSerialRow[] };
  expiringWarranty: { count: number; items: StockSerialRow[] };
  totals: {
    serialUnits: number;
    serialValue: number;
    productLines: number;
    productUnits: number;
    productValue: number;
    totalValue: number;
    totalRetailValue: number;
    potentialProfit: number;
  };
}

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const electronicsAnalyticsApi = {
  profit: (params: { from?: string; to?: string; shopId?: string } = {}) =>
    apiClient.get('/electronics/analytics/profit', { params }).then(unwrap) as Promise<ElectronicsProfit>,

  lowStock: (shopId?: string) =>
    apiClient.get('/electronics/analytics/low-stock', { params: { shopId } }).then(unwrap) as Promise<ElectronicsLowStock>,

  stock: (shopId?: string) =>
    apiClient.get('/electronics/analytics/stock', { params: { shopId } }).then(unwrap) as Promise<ElectronicsStockReport>,
};
