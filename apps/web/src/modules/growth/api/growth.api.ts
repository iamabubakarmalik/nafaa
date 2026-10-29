/**
 * Growth tools API: the price calculator (context, quote, bulk preview, shop
 * defaults) and the ads spend log with its ROAS report. Prices are applied
 * through the product and online-product endpoints, not here.
 */

import { apiClient } from '@core/api/client';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

/* ───────────────────────── price calculator ───────────────────────── */

export type ChannelKind = 'DARAZ' | 'SHOPIFY' | 'WOOCOMMERCE' | 'WEBSITE';
export const CHANNEL_KINDS: ChannelKind[] = ['DARAZ', 'SHOPIFY', 'WOOCOMMERCE', 'WEBSITE'];
export type TargetMode = 'MARGIN' | 'RUPEES';

export interface FeeCategory { key: string; label: string; pct: number }
export interface ChannelFees {
  commissionPct: number;
  paymentFeePct: number;
  fixedFee: number;
  ownCourier: boolean;
  shippingFee: number;
  codShare: number;
  categories: FeeCategory[];
  category: string | null;
}

export interface PriceDefaults {
  channels: Record<ChannelKind, ChannelFees>;
  packaging: number | null;
  courier: { code: string | null; city: string; weightKg: number; charge: number; codPct: number; codFixed: number; returnPct: number };
  adsPerOrder: number | null;
  rtoPct: number | null;
  deliveryCharge: number;
  taxPct: number | null;
  target: { mode: TargetMode; value: number };
  endWith9: boolean;
}

export interface GrowthSettings { price: PriceDefaults; ads: { postExpenses: boolean } }

export interface ProductLink {
  mappingId: string; integrationId: string; kind: ChannelKind; variantId: string | null; override: number | null; canSetPrice: boolean; price: number;
}
export interface CalcProduct {
  id: string; name: string; sku: string | null; price: number; cost: number; weightKg: number | null; hasVariants: boolean; category: string | null;
  links: ProductLink[];
}

export interface CalcContext {
  settings: GrowthSettings;
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
  packaging?: number | null;
  adsPerOrder?: number | null;
  deliveryCharge?: number | null;
  taxPct?: number | null;
  target?: { mode: TargetMode; value: number };
  endWith9?: boolean;
  channels?: Array<{ kind: ChannelKind; fees?: Partial<ChannelFees>; rtoPct?: number | null }>;
  checkPrice?: number | null;
}

export type BreakdownKey = 'tax' | 'cost' | 'packaging' | 'shipping' | 'codFee' | 'commission' | 'paymentFee' | 'fixedFee' | 'ads' | 'rto' | 'profit';
export interface ChannelResult {
  kind: ChannelKind;
  rtoPct: number;
  price: number | null;
  breakEven: number | null;
  profit: number | null;
  margin: number | null;
  breakdown: Array<{ key: BreakdownKey; value: number }>;
  problem: 'FEES_TOO_HIGH' | 'MARGIN_TOO_HIGH' | null;
  check: { price: number; profit: number; margin: number | null; breakdown: Array<{ key: BreakdownKey; value: number }> } | null;
}
export interface CourierQuote { code: string | null; charge: number; codPct: number; codFixed: number; returnPct: number; source: 'RATE_CARD' | 'DEFAULT' }
export interface QuoteResult { courier: CourierQuote; results: ChannelResult[] }
export interface BulkResult {
  total: number; shown: number; courier: CourierQuote;
  items: Array<CalcProduct & { results: ChannelResult[] }>;
}

export const PRICE_CALC_KEY = 'price-calculator';

export const priceCalcApi = {
  context: (productId?: string) => apiClient.get('/price-calculator/context', { params: productId ? { productId } : {} }).then((r) => unwrap<CalcContext>(r)),
  quote: (body: QuoteBody) => apiClient.post('/price-calculator/quote', body).then((r) => unwrap<QuoteResult>(r)),
  bulk: (body: QuoteBody & { search?: string; categoryId?: string; integrationId?: string; limit?: number }) =>
    apiClient.post('/price-calculator/bulk-preview', body).then((r) => unwrap<BulkResult>(r)),
  saveDefaults: (price: Partial<PriceDefaults>) => apiClient.put('/price-calculator/defaults', { price }).then((r) => unwrap<GrowthSettings>(r)),
};

/* ───────────────────────── ads ───────────────────────── */

export type AdPlatform = 'META' | 'TIKTOK' | 'GOOGLE' | 'OTHER';
export const AD_PLATFORMS: AdPlatform[] = ['META', 'TIKTOK', 'GOOGLE', 'OTHER'];

export interface AdEntry {
  id: string;
  day: string;
  platform: AdPlatform;
  amount: number;
  campaign: string | null;
  integrationId: string | null;
  productIds: string[];
  orders: number | null;
  source: 'MANUAL' | 'CSV';
  postExpense: boolean;
  expenseId: string | null;
  expenseNumber?: string | null;
  note: string | null;
  shopId: string | null;
  products?: Array<{ id: string; name: string }>;
  channel?: { id: string; name: string; type: string; platform: string | null } | null;
}
export interface AdEntryPayload {
  day: string; platform: AdPlatform; amount: number; campaign?: string | null; integrationId?: string | null;
  productIds?: string[]; orders?: number | null; note?: string | null; shopId?: string;
}
export interface AdsPage {
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

export type AdField = 'date' | 'spend' | 'campaign' | 'orders';
export type AdColumnMap = Partial<Record<AdField, number>>;
export interface AdImportRow { day: string; campaign: string | null; amount: number; orders: number | null; importKey: string; status?: 'new' | 'same' | 'changed' | 'future' | 'manual' }
export interface AdImportPreview {
  platform: AdPlatform; headers: string[]; map: AdColumnMap; needs: AdField[]; skipped: number; rows: AdImportRow[]; total: number;
}

export interface AdsSetup { postExpenses: boolean; channels: Array<{ id: string; name: string; type: string; platform: string | null }> }

export const ADS_KEY = 'ads';
/** Keys an ads change refreshes: this page and every profit view (the spend is an expense). */
export const ADS_AFFECTED_KEYS = [ADS_KEY, 'expenses', 'dashboard-overview', 'pnl', 'reports-center', 'day-report', 'ai', PRICE_CALC_KEY];

export const adsApi = {
  settings: () => apiClient.get('/ads/settings').then((r) => unwrap<AdsSetup>(r)),
  saveSettings: (postExpenses: boolean) => apiClient.put('/ads/settings', { postExpenses }).then((r) => unwrap<{ postExpenses: boolean }>(r)),
  list: (q: { from?: string; to?: string; platform?: string; page?: number; limit?: number }) => apiClient.get('/ads/entries', { params: q }).then((r) => unwrap<AdsPage>(r)),
  create: (body: AdEntryPayload) => apiClient.post('/ads/entries', body).then((r) => unwrap<AdEntry>(r)),
  update: (id: string, body: Partial<AdEntryPayload>) => apiClient.patch(`/ads/entries/${id}`, body).then((r) => unwrap<AdEntry>(r)),
  remove: (id: string) => apiClient.delete(`/ads/entries/${id}`).then((r) => unwrap<{ deleted: boolean }>(r)),
  /** Without a platform the API guesses it from the headers. */
  importPreview: (body: { headers: string[]; rows: string[][]; platform?: AdPlatform; mapping?: AdColumnMap }) =>
    apiClient.post('/ads/import/preview', body, { timeout: 120_000 }).then((r) => unwrap<AdImportPreview>(r)),
  importApply: (body: { platform: AdPlatform; rows: AdImportRow[]; integrationId?: string | null; shopId?: string }) =>
    apiClient.post('/ads/import', body, { timeout: 180_000 }).then((r) => unwrap<{ added: number; changed: number; same: number; expenses: number }>(r)),
  report: (from: string, to: string) => apiClient.get('/ads/report', { params: { from, to } }).then((r) => unwrap<AdsReport>(r)),
};

export function apiError(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}
