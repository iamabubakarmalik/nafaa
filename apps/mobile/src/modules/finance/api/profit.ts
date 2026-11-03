/** Profit report API: overview, products with variants (paged), and profit per IMEI / serial unit. Cost fields are missing without cost access. */

import type { ProfitSplit } from '@nafaa/core/finance';
import { apiClient } from '@/core/api/client';

export type ProfitSort = 'profit' | 'margin' | 'revenue' | 'qty' | 'discount' | 'returns' | 'loss' | 'name';
export type ProfitView = 'all' | 'loss' | 'fallback' | 'nocost' | 'discount' | 'returns';

export interface ProfitFilters { from: string; to: string; categoryId?: string; brandId?: string; staffId?: string }

export interface Figures {
  qty: number; returnedQty: number; gross: number; discount: number; refund: number; revenue: number;
  cost?: number; profit?: number; margin?: number; bills: number; lines: number; returnProfit?: number;
}
export interface ProfitVariant extends Figures { variantId: string | null; name: string }
export interface ProfitItem extends Figures {
  key: string; productId: string | null; name: string; sku: string | null; unit: string; image: string | null;
  category: { id: string; name: string; color: string | null } | null; brand: { id: string; name: string } | null; supplier: { id: string; name: string } | null;
  avgPrice: number; avgCost?: number; fallbackLines: number; noCostLines?: number; prevRevenue: number; prevProfit?: number; revenueRank: number; profitRank?: number;
  variants: ProfitVariant[];
}
export interface ProfitDim extends Figures { id: string; name: string; color: string | null; products: number; share: number; prevRevenue: number; prevProfit?: number }
export interface ProfitBrief {
  key: string; productId: string | null; name: string; unit: string; image: string | null; category: string | null; qty: number; revenue: number;
  profit?: number; margin?: number; discount: number; refund: number; returnedQty: number; returnProfit?: number; revenueRank: number; profitRank?: number;
}
export interface NetFigures {
  grossProfit?: number; billProfit?: number; split?: ProfitSplit | null; otherIncome?: number; stockLoss?: number; stockGain?: number;
  expenses: number; expenseCategories: Array<{ id: string; name: string; color: string | null; amount: number }>;
  damageCost?: number; damageCount: number; lossCost?: number; lossCount: number; adjustOutCost?: number; adjustInCost?: number; writeOffCost?: number;
  topWriteOffs: Array<{ productId: string; name: string; unit: string; qty: number; writeOffCost?: number }>;
  netProfit?: number;
}
export interface BillCharges { revenue: number; cost?: number; profit?: number; billed: number; bills: number }
export interface ProfitOverview {
  range: { from: string; to: string; days: number; prevFrom: string; prevTo: string; byMonth: boolean };
  filtered: boolean;
  totals: Figures & { products: number; lineRevenue: number; lineProfit?: number; charges: BillCharges };
  prev: Figures & { products: number; charges: BillCharges };
  costBasis?: { lines: number; savedLines: number; fallbackLines: number; fallbackRevenue: number; noCostLines: number; noCostProducts: number };
  net: NetFigures; prevNet: NetFigures;
  trend: Array<{ key: string; revenue: number; profit?: number; cost?: number; discount: number; refund: number; bills: number; margin?: number }>;
  weekday: Array<{ day: number; revenue: number; profit?: number; bills: number }>;
  byCategory: ProfitDim[]; byBrand: ProfitDim[]; bySupplier: ProfitDim[]; byStaff: ProfitDim[];
  topEarners: ProfitBrief[]; topSellers: ProfitBrief[];
  losses: { count: number; amount: number; items: ProfitBrief[] };
  discountTop: ProfitBrief[]; returnTop: ProfitBrief[];
}
export interface ProfitItemsQuery extends ProfitFilters { search?: string; sort?: ProfitSort; view?: ProfitView; page?: number; limit?: number }
export interface ProfitItems { items: ProfitItem[]; total: number; page: number; pages: number }

const d = <T,>(r: { data: T }) => r.data;
export const profitApi = {
  overview: (f: ProfitFilters) => apiClient.get<ProfitOverview>('/profit-report/overview', { params: f }).then(d),
  items: (q: ProfitItemsQuery) => apiClient.get<ProfitItems>('/profit-report/items', { params: q }).then(d),
};
