import { apiClient } from '@core/api/client';
import type { PtaStatus } from './imei.api';
import type { UsedPhoneCondition } from './used-phones.api';
import type { RepairStatus } from './repairs.api';
import type { EmiPlanStatus } from './emi.api';

export interface MobileDashboard {
  newPhonesInStock: number;
  newPhonesStockValue: number;
  ptaTaxLocked: number;
  usedPhonesInStock: number;
  usedPhonesStockValue: number;
  usedPhonesPotentialRevenue: number;
  openRepairTickets: number;
  activeEmiPlans: number;
  emiOutstanding: number;
  monthRevenue: number;
  monthCogs: number;
  monthProfit: number;
  monthSalesCount: number;
}

export interface PtaBreakdownRow {
  ptaStatus: PtaStatus;
  count: number;
  taxPaid: number;
  stockValue: number;
}

export interface TopBrand {
  brandId: string;
  brandName: string;
  unitsSold: number;
  revenue: number;
  profit: number;
  margin: number;
}

export interface RepairAnalytics {
  byStatus: { status: RepairStatus; count: number }[];
  delivered: number;
  totalRevenue: number;
  partsCost: number;
  laborRevenue: number;
  collected: number;
  grossProfit: number;
  topBrands: { brand: string; count: number }[];
}

export interface EmiAnalytics {
  byStatus: { status: EmiPlanStatus; count: number; financed: number; remaining: number }[];
  activeFinanced: number;
  activePaid: number;
  activeRemaining: number;
  overdueCount: number;
  overdueAmount: number;
  collectedThisMonth: number;
  collectedCountThisMonth: number;
}

export interface UsedPhoneAnalytics {
  byCondition: { condition: UsedPhoneCondition; count: number; totalCost: number; resalePrice: number }[];
  soldCount: number;
  soldRevenue: number;
  soldCogs: number;
  soldProfit: number;
  inStockCount: number;
  inStockCost: number;
  inStockResale: number;
  inStockPotentialProfit: number;
}


/* ── Profit by source ─────────────────────────────────────── */

export type ProfitSourceKey = 'NEW_PHONE' | 'USED_PHONE' | 'ACCESSORY' | 'REPAIR';

export interface ProfitSourceRow {
  key: ProfitSourceKey;
  label: string;
  revenue: number;
  cost: number;
  profit: number;
  units: number;
  sales: number;
  margin: number;
}

export interface ProfitByProductRow {
  productId: string;
  name: string;
  brand: string | null;
  revenue: number;
  cost: number;
  profit: number;
  units: number;
  margin: number;
}

export interface ProfitBySource {
  range: { from: string; to: string };
  sources: ProfitSourceRow[];
  totals: { revenue: number; cost: number; profit: number; units: number; margin: number; salesCount: number };
  topProducts: ProfitByProductRow[];
  daily: { date: string; revenue: number; profit: number }[];
}

/* ── Low stock ────────────────────────────────────────────── */

export interface LowStockPhoneRow {
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  color: string | null;
  brand: string | null;
  sku: string | null;
  inStock: number;
  lowStockAlert: number;
  price: number;
  stockValue: number;
  isOut: boolean;
}

export interface LowStockAccessoryRow {
  productId: string;
  name: string;
  sku: string | null;
  unit: string;
  brand: string | null;
  stock: number;
  lowStockAlert: number;
  price: number;
  isOut: boolean;
  notInShop: boolean;
}

export interface MobileLowStock {
  phones: LowStockPhoneRow[];
  accessories: LowStockAccessoryRow[];
  summary: {
    phoneModelsLow: number;
    phoneModelsOut: number;
    accessoriesLow: number;
    accessoriesOut: number;
  };
}

/* ── Stock aging ──────────────────────────────────────────── */

export interface AgingBucket {
  key: string;
  label: string;
  min: number;
  max: number;
  phones: number;
  phoneValue: number;
  usedPhones: number;
  usedValue: number;
}

export interface AgingItem {
  kind: 'NEW' | 'USED';
  id: string;
  ref: string;
  name: string;
  variantName: string | null;
  brand: string | null;
  color: string | null;
  ptaStatus: PtaStatus | null;
  condition?: string;
  cost: number;
  price: number;
  ageDays: number;
  bucket: string;
}

export interface StockAccessoryRow {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  brand: string | null;
  category: string | null;
  stock: number;
  unitCost: number;
  price: number;
  /** stock × khareed qeemat */
  value: number;
  /** stock × bechne ki qeemat */
  retailValue: number;
  lowStockAlert: number;
  isLow: boolean;
  isOut: boolean;
}

export interface MobileStockAging {
  buckets: AgingBucket[];
  items: AgingItem[];
  accessories: StockAccessoryRow[];
  deadStock: { count: number; value: number; items: AgingItem[] };
  totals: {
    phones: number;
    phoneValue: number;
    usedPhones: number;
    usedValue: number;
    accessories: number;
    accessoryUnits: number;
    accessoryValue: number;
    totalValue: number;
    totalRetailValue: number;
    potentialProfit: number;
  };
}

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const mobileReportsApi = {
  dashboard: () =>
    apiClient.get('/mobile-reports/dashboard').then(unwrap) as Promise<MobileDashboard>,
  ptaBreakdown: () =>
    apiClient.get('/mobile-reports/pta-breakdown').then(unwrap) as Promise<PtaBreakdownRow[]>,
  topBrands: (days = 30) =>
    apiClient.get('/mobile-reports/top-brands', { params: { days } }).then(unwrap) as Promise<TopBrand[]>,
  repairAnalytics: (days = 30) =>
    apiClient.get('/mobile-reports/repair-analytics', { params: { days } }).then(unwrap) as Promise<RepairAnalytics>,
  emiAnalytics: () =>
    apiClient.get('/mobile-reports/emi-analytics').then(unwrap) as Promise<EmiAnalytics>,
  usedPhoneAnalytics: (days = 30) =>
    apiClient.get('/mobile-reports/used-phone-analytics', { params: { days } }).then(unwrap) as Promise<UsedPhoneAnalytics>,

  /** Kamai kahan se aa rahi hai — naya phone / used / accessory / repair. */
  profitBySource: (params: { from?: string; to?: string; shopId?: string } = {}) =>
    apiClient.get('/mobile-reports/profit-by-source', { params }).then(unwrap) as Promise<ProfitBySource>,

  lowStock: (shopId?: string) =>
    apiClient.get('/mobile-reports/low-stock', { params: { shopId } }).then(unwrap) as Promise<MobileLowStock>,

  stockAging: (shopId?: string) =>
    apiClient.get('/mobile-reports/stock-aging', { params: { shopId } }).then(unwrap) as Promise<MobileStockAging>,
};
