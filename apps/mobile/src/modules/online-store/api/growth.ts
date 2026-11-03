/**
 * Growth tools for online sellers: ads spend with ROAS, the price
 * calculator, and the e-commerce part of the morning summary. Same
 * endpoints as the web (modules/growth/api/growth.api.ts, /ai/morning-summary).
 */

import { apiClient } from '@/core/api/client';

const unwrap = <T,>(r: { data: unknown }): T => {
  const d = r.data as { data?: unknown } | null;
  return (d && typeof d === 'object' && 'data' in d && d.data !== undefined && !Array.isArray(d) ? d.data : d) as T;
};

/* ───────────── price calculator ───────────── */

export type ChannelKind = 'DARAZ' | 'SHOPIFY' | 'WOOCOMMERCE' | 'WEBSITE';
export const CHANNEL_KINDS: ChannelKind[] = ['DARAZ', 'SHOPIFY', 'WOOCOMMERCE', 'WEBSITE'];
export type TargetMode = 'MARGIN' | 'RUPEES';

export interface ChannelFees {
  commissionPct: number; paymentFeePct: number; fixedFee: number; ownCourier: boolean; shippingFee: number; codShare: number;
  categories: Array<{ key: string; label: string; pct: number }>; category: string | null;
}
export interface PriceDefaults {
  channels: Record<ChannelKind, ChannelFees>;
  packaging: number | null;
  courier: { code: string | null; city: string; weightKg: number; charge: number; codPct: number; codFixed: number; returnPct: number };
  adsPerOrder: number | null; rtoPct: number | null; deliveryCharge: number; taxPct: number | null;
  target: { mode: TargetMode; value: number }; endWith9: boolean;
}
export interface CalcProduct {
  id: string; name: string; sku: string | null; price: number; cost: number; weightKg: number | null; hasVariants: boolean; category: string | null;
}
export interface CalcContext {
  settings: { price: PriceDefaults; ads: { postExpenses: boolean } };
  channels: Array<{ id: string; type: string; name: string; kind: ChannelKind; canSetPrice: boolean }>;
  kinds: ChannelKind[];
  rto: Record<'ALL' | ChannelKind, { pct: number | null; parcels: number }>;
  ads: { value: number | null; spend: number; orders: number };
  tax: { enabled: boolean; rate: number; inclusive: boolean; label: string; pricePct: number };
  packaging: number | null;
  couriers: Array<{ code: string; name: string; rateCard: boolean }>;
  courierCode: string | null;
  presets: Record<ChannelKind, ChannelFees>;
  product: CalcProduct | null;
}
export interface QuoteBody {
  cost?: number;
  courier?: { code?: string | null; city?: string | null; weightKg?: number | null; charge?: number | null; codPct?: number | null; codFixed?: number | null; returnPct?: number | null };
  packaging?: number | null; adsPerOrder?: number | null; deliveryCharge?: number | null; taxPct?: number | null;
  target?: { mode: TargetMode; value: number }; endWith9?: boolean;
  channels?: Array<{ kind: ChannelKind; fees?: Partial<ChannelFees>; rtoPct?: number | null }>;
  checkPrice?: number | null;
}
export type BreakdownKey = 'tax' | 'cost' | 'packaging' | 'shipping' | 'codFee' | 'commission' | 'paymentFee' | 'fixedFee' | 'ads' | 'rto' | 'profit';
export interface ChannelResult {
  kind: ChannelKind; rtoPct: number; price: number | null; breakEven: number | null; profit: number | null; margin: number | null;
  breakdown: Array<{ key: BreakdownKey; value: number }>;
  problem: 'FEES_TOO_HIGH' | 'MARGIN_TOO_HIGH' | null;
  check: { price: number; profit: number; margin: number | null; breakdown: Array<{ key: BreakdownKey; value: number }> } | null;
}
export interface QuoteResult {
  courier: { code: string | null; charge: number; codPct: number; codFixed: number; returnPct: number; source: 'RATE_CARD' | 'DEFAULT' };
  results: ChannelResult[];
}

export const priceCalcApi = {
  context: (productId?: string) => apiClient.get('/price-calculator/context', { params: productId ? { productId } : {} }).then((r) => unwrap<CalcContext>(r)),
  quote: (body: QuoteBody) => apiClient.post('/price-calculator/quote', body).then((r) => unwrap<QuoteResult>(r)),
  saveDefaults: (price: Partial<PriceDefaults>) => apiClient.put('/price-calculator/defaults', { price }).then((r) => unwrap<unknown>(r)),
};

/* ───────────── ads ───────────── */

export type AdPlatform = 'META' | 'TIKTOK' | 'GOOGLE' | 'OTHER';
export const AD_PLATFORMS: AdPlatform[] = ['META', 'TIKTOK', 'GOOGLE', 'OTHER'];

export interface AdEntry {
  id: string; day: string; platform: AdPlatform; amount: number; campaign: string | null; integrationId: string | null; productIds: string[];
  orders: number | null; source: 'MANUAL' | 'CSV'; postExpense: boolean; expenseId: string | null; expenseNumber?: string | null; note: string | null;
  shopId: string | null; products?: Array<{ id: string; name: string }>; channel?: { id: string; name: string; type: string; platform: string | null } | null;
}
export interface AdEntryPayload {
  day: string; platform: AdPlatform; amount: number; campaign?: string | null; integrationId?: string | null;
  productIds?: string[]; orders?: number | null; note?: string | null; shopId?: string;
}
export interface AdsList {
  items: AdEntry[]; total: number; page: number; pages: number;
  totals: { amount: number; count: number; byPlatform: Array<{ platform: AdPlatform; amount: number; count: number }> };
}
export interface RoasRow {
  spend: number; sales: number; orders: number; returned: number; roas: number | null; costPerOrder: number | null;
  adOrders: number | null; profitBeforeAds: number | null; profitAfterAds: number | null;
}
export interface AdsReport {
  range: { from: string; to: string };
  seesProfit: boolean;
  totals: RoasRow;
  byDay: Array<RoasRow & { day: string }>;
  byWeek: Array<RoasRow & { week: string }>;
  byPlatform: Array<{ platform: AdPlatform; spend: number; share: number; adOrders: number | null }>;
  byChannel: Array<RoasRow & { id: string; name: string; type: string | null }>;
  byProduct: Array<RoasRow & { id: string; name: string; qty: number }>;
}
export interface AdsSetup { postExpenses: boolean; channels: Array<{ id: string; name: string; type: string; platform: string | null }> }

export const ADS_KEY = 'ads';
/** Keys an ads change refreshes: the ads screens and every profit view (the spend is an expense). */
export const ADS_AFFECTED_KEYS = [ADS_KEY, 'expenses', 'dashboard-overview', 'pnl', 'reports-center', 'day-report', 'price-calculator'];

export const adsApi = {
  settings: () => apiClient.get('/ads/settings').then((r) => unwrap<AdsSetup>(r)),
  saveSettings: (postExpenses: boolean) => apiClient.put('/ads/settings', { postExpenses }).then((r) => unwrap<{ postExpenses: boolean }>(r)),
  list: (q: { from?: string; to?: string; platform?: string; page?: number; limit?: number }) => apiClient.get('/ads/entries', { params: q }).then((r) => unwrap<AdsList>(r)),
  create: (body: AdEntryPayload) => apiClient.post('/ads/entries', body).then((r) => unwrap<AdEntry>(r)),
  update: (id: string, body: Partial<AdEntryPayload>) => apiClient.patch(`/ads/entries/${id}`, body).then((r) => unwrap<AdEntry>(r)),
  remove: (id: string) => apiClient.delete(`/ads/entries/${id}`).then((r) => unwrap<{ deleted: boolean }>(r)),
  report: (from: string, to: string) => apiClient.get('/ads/report', { params: { from, to } }).then((r) => unwrap<AdsReport>(r)),
};

/* ───────────── morning summary (e-commerce block) ───────────── */

export interface EcommerceBlock {
  orders: number; sales: number; rto: number; codWithCouriers: number | null; codOrders: number | null;
  adsSpend: number | null; roas: number | null; profitAfterAds: number | null; text: string;
}
export interface MorningSummary { day?: string; dayText?: string; ecommerce?: EcommerceBlock | null; [k: string]: unknown }

export const morningApi = {
  get: () => apiClient.get('/ai/morning-summary').then((r) => unwrap<MorningSummary>(r)),
};
