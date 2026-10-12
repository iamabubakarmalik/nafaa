/**
 * Report centre API: one call per section for a business-day period
 * (`from = 'all'` for all time). Cost and profit fields are missing from the
 * response for users without cost access, so they are optional here.
 */

import { apiClient } from '@core/api/client';

export interface Period { from: string; to: string }
interface Meta { from: string; to: string; grouping: 'day' | 'month' }
interface Group { bills: number; net: number; profit?: number; cashIn: number }

export interface SalesReport extends Meta {
  totals: {
    bills: number; gross: number; refunds: number; net: number; cost?: number; profit?: number; margin?: number;
    cashIn: number; credit: number; discount: number; service: number; average: number; qty: number; lines: number;
    customers: number; walkInBills: number; voidedBills: number; voidedValue: number;
  };
  previous: { bills: number; net: number; profit?: number; cashIn: number; credit: number; average: number } | null;
  trend: Array<{ key: string; net: number; profit?: number; bills: number }>;
  hours: Array<{ hour: number; net: number; bills: number }>;
  weekdays: Array<{ day: number; net: number; bills: number }>;
  heatmap: number[][];
  payments: Array<Group & { method: string }>;
  staff: Array<Group & { id: string | null; name: string }>;
  channels: Array<Group & { source: string }>;
  shops: Array<Group & { id: string | null; name: string }>;
}

export interface ItemRow {
  id: string; name: string; unit: string; sku: string | null; category: string | null; brand: string | null;
  qty: number; revenue: number; cost?: number; profit?: number; margin?: number; bills: number;
}
export interface GroupRow { id: string | null; name: string; color: string | null; revenue: number; cost?: number; profit?: number; qty: number; products: number }
export interface ItemsReport extends Meta {
  totals: { products: number; revenue: number; cost?: number; profit?: number; qty: number; noCostLines: number; slowCount: number; stockValue?: number };
  topRevenue: ItemRow[]; topProfit: ItemRow[]; topQty: ItemRow[]; lowest: ItemRow[];
  slow: Array<{ id: string; name: string; unit: string; stock: number; stockValue?: number; lastSold: string | null }>;
  categories: GroupRow[]; brands: GroupRow[];
}

export interface CustomersReport extends Meta {
  totals: {
    customers: number; newCount: number; newValue: number; returning: number; returningValue: number; repeat: number;
    namedValue: number; walkInValue: number; walkInBills: number; signups: number;
    creditGiven: number; recovered: number; payments: number; outstanding: number; debtors: number;
  };
  previous: { creditGiven: number; bills: number } | null;
  top: Array<{ id: string; name: string; phone: string | null; bills: number; net: number; last: string; balance: number }>;
  debtors: Array<{ id: string; name: string; phone: string | null; balance: number; lastPayment: string | null; days: number | null }>;
  aging: Array<{ key: string; label: string; count: number; amount: number }>;
}

export interface PurchasesReport extends Meta {
  totals: { bills: number; value: number; paid: number; credit: number; tax: number; returned: number; returns: number; dueTotal: number; dueSuppliers: number; average: number };
  previous: { bills: number; value: number; paid: number } | null;
  trend: Array<{ key: string; value: number; paid: number; bills: number }>;
  suppliers: Array<{ id: string; name: string; bills: number; value: number; paid: number; share: number }>;
  items: Array<{ name: string; qty: number; value: number; bills: number }>;
  dues: Array<{ id: string; name: string; phone: string | null; due: number }>;
}

export interface ExpensesReport extends Meta {
  totals: { count: number; amount: number; pending: number; perDay: number; ofSales: number };
  previous: { count: number; amount: number } | null;
  trend: Array<{ key: string; amount: number; count: number }>;
  categories: Array<{ id: string | null; name: string; color: string | null; amount: number; count: number; share: number }>;
  methods: Array<{ method: string; amount: number; count: number }>;
  biggest: Array<{ id: string; title: string; amount: number; date: string; status: string; category: string | null }>;
}

export interface ProfitSummary {
  sales: number; gross: number; refunds: number; discount: number; cost?: number; grossProfit?: number; margin?: number;
  expenses: number; damage: number; netProfit?: number; netMargin: number;
}
export interface ProfitReport extends Meta {
  totals: ProfitSummary & { damageCount: number };
  previous: ProfitSummary | null;
  rows: Array<{ key: string; sales: number; cost?: number; grossProfit?: number; expenses: number; netProfit?: number }>;
}

export interface TaxReport extends Meta {
  migrationPending: boolean;
  totals: {
    sales: number; taxedValue: number; tax: number; bills: number; failed: number; pending: number; coverage: number;
    discount: number; codeDiscount: number; loyaltyDiscount: number; service: number;
  };
  authorities: Array<{ authority: string; bills: number; returns: number; value: number; tax: number; failed: number; pending: number }>;
  rates: Array<{ rate: number; bills: number; value: number; tax: number }>;
}

export interface ReturnsReport extends Meta {
  totals: { count: number; amount: number; cost?: number; rate: number; voidedBills: number; voidedValue: number };
  previous: { count: number; amount: number } | null;
  trend: Array<{ key: string; amount: number; count: number }>;
  methods: Array<{ method: string; amount: number; count: number }>;
  reasons: Array<{ reason: string | null; count: number; amount: number }>;
  products: Array<{ id: string; name: string; unit: string; qty: number; amount: number; times: number }>;
  staff: Array<{ id: string | null; name: string; amount: number; count: number }>;
  voided: Array<{ id: string; saleNumber: string; total: number; soldAt: string; customer: string | null; staff: string | null }>;
}

export type Fmt = 'money' | 'cost' | 'count' | 'qty' | 'pct' | 'text' | 'date' | 'kg' | 'grams' | 'sqft' | 'min' | 'litre';
export interface IndustryReport {
  kind: string; from: string | null; to: string;
  kpis: Array<{ label: string; value: number; fmt: Fmt; hint?: string }>;
  charts: Array<{ title: string; kind: 'bar' | 'pie'; fmt: Fmt; data: Array<{ name: string; value: number }> }>;
  tables: Array<{ title: string; hint?: string; columns: Array<{ label: string; fmt: Fmt }>; rows: Array<Array<string | number | null>> }>;
  notes: string[];
}

export interface SectionData {
  sales: SalesReport; items: ItemsReport; customers: CustomersReport; purchases: PurchasesReport;
  expenses: ExpensesReport; profit: ProfitReport; tax: TaxReport; returns: ReturnsReport; industry: IndustryReport;
}
export type SectionId = keyof SectionData;

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export function fetchSection<K extends SectionId>(id: K, period: Period, industry?: string): Promise<SectionData[K]> {
  const url = id === 'industry' ? `/reports/center/industry/${industry}` : `/reports/center/${id}`;
  return apiClient.get<{ data: SectionData[K] }>(url, { params: period }).then(unwrap);
}

/** Query key root for every report centre section. */
export const REPORTS_KEY = 'reports-center';
