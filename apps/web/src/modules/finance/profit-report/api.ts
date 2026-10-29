/**
 * Profit report API: overview (totals against the previous period, net
 * profit, breakdowns and top lists), products with variants (paged), and
 * profit per IMEI or serial unit. Cost and profit fields are left out of
 * the response for users without cost access.
 */

import { apiClient } from '@core/api/client';
import type { ProfitSplit } from '@modules/reports/ProfitSplit';

export type ProfitSort = 'profit' | 'margin' | 'revenue' | 'qty' | 'discount' | 'returns' | 'loss' | 'name';
export type ProfitView = 'all' | 'loss' | 'fallback' | 'nocost' | 'discount' | 'returns';
export type UnitKind = 'IMEI' | 'USED' | 'SERIAL';

export interface ProfitFilters {
  from: string;
  to: string;
  categoryId?: string;
  brandId?: string;
  staffId?: string;
}

export interface Figures {
  qty: number;
  returnedQty: number;
  gross: number;
  discount: number;
  refund: number;
  revenue: number;
  cost?: number;
  profit?: number;
  margin?: number;
  bills: number;
  lines: number;
  returnProfit?: number;
}

export interface ProfitVariant extends Figures { variantId: string | null; name: string }

export interface ProfitItem extends Figures {
  key: string;
  productId: string | null;
  name: string;
  sku: string | null;
  unit: string;
  image: string | null;
  category: { id: string; name: string; color: string | null } | null;
  brand: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
  avgPrice: number;
  avgCost?: number;
  fallbackLines: number;
  noCostLines?: number;
  prevRevenue: number;
  prevProfit?: number;
  revenueRank: number;
  profitRank?: number;
  variants: ProfitVariant[];
}

export interface ProfitDim extends Figures {
  id: string;
  name: string;
  color: string | null;
  products: number;
  share: number;
  prevRevenue: number;
  prevProfit?: number;
}

export interface ProfitBrief {
  key: string;
  productId: string | null;
  name: string;
  unit: string;
  image: string | null;
  category: string | null;
  qty: number;
  revenue: number;
  profit?: number;
  margin?: number;
  discount: number;
  refund: number;
  returnedQty: number;
  returnProfit?: number;
  revenueRank: number;
  profitRank?: number;
}

export interface NetFigures {
  /** Headline gross profit on the shop's khata basis (bill profit under a filter). */
  grossProfit?: number;
  billProfit?: number;
  /** Khata split; null under a category or brand filter, missing when cost is hidden. */
  split?: ProfitSplit | null;
  otherIncome?: number;
  /** Stock nuksan and Stock faida; writeOffCost = stockLoss − stockGain. */
  stockLoss?: number;
  stockGain?: number;
  expenses: number;
  expenseCategories: Array<{ id: string; name: string; color: string | null; amount: number }>;
  damageCost?: number;
  damageCount: number;
  lossCost?: number;
  lossCount: number;
  adjustOutCost?: number;
  adjustInCost?: number;
  writeOffCost?: number;
  topWriteOffs: Array<{ productId: string; name: string; unit: string; qty: number; writeOffCost?: number }>;
  netProfit?: number;
}

/**
 * Bill money outside the sale lines: service charges (delivery, fitting)
 * and bill-level cost such as a rider's fare. Zero under a category, brand
 * or staff filter.
 */
export interface BillCharges {
  revenue: number;
  cost?: number;
  profit?: number;
  /** Service charges as written on the bills. */
  billed: number;
  /** Bills that carry service charges. */
  bills: number;
}

export interface ProfitOverview {
  range: { from: string; to: string; days: number; prevFrom: string; prevTo: string; byMonth: boolean };
  /** Category, brand or staff filter is on; expenses still cover the whole shop. */
  filtered: boolean;
  /** Bill totals: line figures plus `charges`. */
  totals: Figures & { products: number; lineRevenue: number; lineProfit?: number; charges: BillCharges };
  prev: Figures & { products: number; charges: BillCharges };
  costBasis?: { lines: number; savedLines: number; fallbackLines: number; fallbackRevenue: number; noCostLines: number; noCostProducts: number };
  net: NetFigures;
  prevNet: NetFigures;
  trend: Array<{ key: string; revenue: number; profit?: number; cost?: number; discount: number; refund: number; bills: number; margin?: number }>;
  weekday: Array<{ day: number; revenue: number; profit?: number; bills: number }>;
  byCategory: ProfitDim[];
  byBrand: ProfitDim[];
  bySupplier: ProfitDim[];
  byStaff: ProfitDim[];
  topEarners: ProfitBrief[];
  topSellers: ProfitBrief[];
  losses: { count: number; amount: number; items: ProfitBrief[] };
  discountTop: ProfitBrief[];
  returnTop: ProfitBrief[];
}

export interface ProfitItemsQuery extends ProfitFilters {
  search?: string;
  sort?: ProfitSort;
  view?: ProfitView;
  page?: number;
  limit?: number;
}

export interface ProfitItems { items: ProfitItem[]; total: number; page: number; pages: number }

export interface ProfitUnit {
  id: string;
  saleNumber: string;
  soldAt: string;
  productId: string | null;
  name: string;
  variant: string | null;
  kind: UnitKind;
  imei: string | null;
  serial: string | null;
  returned: boolean;
  revenue: number;
  cost?: number;
  profit?: number;
  margin?: number;
  costFallback?: boolean;
}

export interface ProfitUnits {
  range: { from: string; to: string };
  split: Array<Figures & { kind: UnitKind | 'REPAIR' | 'OTHER' }>;
  items: ProfitUnit[];
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const profitApi = {
  overview: (f: ProfitFilters) =>
    apiClient.get<{ data: ProfitOverview }>('/profit-report/overview', { params: f }).then(unwrap),
  items: (q: ProfitItemsQuery) =>
    apiClient.get<{ data: ProfitItems }>('/profit-report/items', { params: q }).then(unwrap),
  units: (f: ProfitFilters & { kind?: UnitKind | 'all'; search?: string }) =>
    apiClient.get<{ data: ProfitUnits }>('/profit-report/units', { params: f }).then(unwrap),
};

/** Query key root for every profit query. */
export const PROFIT_KEY = 'profit-report';
