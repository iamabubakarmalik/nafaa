import { apiClient } from '@core/api/client';
import type { LinkInput } from './online-orders.api';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export type PriceRuleMode = 'NONE' | 'PERCENT' | 'FIXED';
export type PriceRounding = 'NONE' | 'NEAREST_10' | 'END_9';
export interface PriceRule { mode: PriceRuleMode; value: number; rounding: PriceRounding }

export type ChannelType = 'WOOCOMMERCE' | 'SHOPIFY' | 'DARAZ' | 'CUSTOM_WEBSITE';
/** How the channel works with products; Indolj and developer-built sites are both CUSTOM_WEBSITE. */
export type ChannelMode = 'woocommerce' | 'shopify' | 'daraz' | 'indolj' | 'website';

export interface OnlineChannel {
  id: string;
  type: ChannelType;
  name: string;
  siteUrl: string | null;
  platform: string | null;
  mode: ChannelMode;
  /** Nafaa sends stock and prices (Woo, Shopify, Daraz). */
  canPush: boolean;
  /** Nafaa can read the channel's product list (not a developer-built site). */
  canFetch: boolean;
  /** The channel keeps stock (Indolj does not). */
  tracksStock: boolean;
  live: boolean;
  paused: boolean;
  shopId: string | null;
  shopName: string | null;
  pushPrice: boolean;
  priceRule: PriceRule;
  stockBuffer: number;
  /** Nafaa sends stock to this channel (off = nothing goes out). */
  pushStock: boolean;
  /** Exact SKU/barcode matches are linked by themselves. */
  autoLink: boolean;
  priceSource: 'WEBSITE' | 'NAFAA';
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  linked?: number;
  failed?: number;
}

export interface LinkedCell {
  linked: true;
  mappingId: string;
  externalTitle: string | null;
  externalSku: string | null;
  /** Price Nafaa sets on the channel (link price, else the rule). */
  price: number;
  override: number | null;
  /** Last price seen on the channel. */
  channelPrice: number | null;
  priceDiffers: boolean;
  /** Stock sent to the channel (after the buffer); null when the channel has no branch. */
  stock: number | null;
  nafaaStock: number;
  /** null where nothing is pushed (custom website, Indolj). */
  status: 'PENDING' | 'SYNCING' | 'SUCCESS' | 'FAILED' | 'SKIPPED' | null;
  error: string | null;
  lastSyncedAt: string | null;
}
export interface OpenCell { linked: false; price: number; stock: number | null; nafaaStock: number }
export type GridCell = LinkedCell | OpenCell;

export interface GridRow { variantId: string | null; label: string | null; sku: string | null; price: number; cells: Record<string, GridCell> }
export interface GridItem {
  productId: string; name: string; sku: string | null; image: string | null; hasVariants: boolean; price: number;
  rows: GridRow[];
  /** channelId → link made without a size (to fix) */
  sizeLess: Record<string, string>;
}

export type GridFilter = 'all' | 'linked' | 'unlinked' | 'errors' | 'price' | 'out';
export interface GridQuery { page: number; limit?: number; search?: string; filter?: GridFilter; channelId?: string }
export interface GridPage { channels: OnlineChannel[]; items: GridItem[]; total: number; page: number; pages: number; limit: number }
export type GridSummary = Record<GridFilter, number>;

export interface RemoteView {
  externalProductId: string; externalVariantId: string | null; title: string; variantTitle: string | null; hasVariants: boolean;
  sku: string | null; price: number; stock: number | null; image: string | null;
}
export interface SuggestionRow extends RemoteView {
  match: { productId: string; variantId: string | null; kind: 'sku' | 'name' | 'fuzzy'; score: number; name: string; variantName: string | null; sku: string | null; price: number };
}
export interface UnmatchedGroup {
  externalProductId: string; title: string; image: string | null; hasVariants: boolean; anyLinked: boolean; canImport: boolean; variants: RemoteView[];
}
export interface Suggestions {
  canFetch: boolean;
  remoteError: string | null;
  fetchedAt: string | null;
  stats: { products: number; variants: number; linked: number; sure: number; maybe: number; unmatched: number };
  sure: SuggestionRow[];
  maybe: SuggestionRow[];
  unmatched: UnmatchedGroup[];
}

/** One line of the Masle panel, with the fix it offers. */
export interface Issue {
  id: string;
  channelId: string;
  tone: 'danger' | 'warning' | 'info';
  kind: 'reconnect' | 'fix-size-less' | 'errors' | 'link-sure' | 'link';
  text: string;
  detail?: string | null;
  count?: number;
}

export const ONLINE_PRODUCTS_KEY = 'online-products';

export const onlineProductsApi = {
  channels: () => apiClient.get('/online-products/channels').then((r) => unwrap<{ channels: OnlineChannel[]; sellable: number }>(r)),
  grid: (q: GridQuery) => apiClient.get('/online-products/grid', { params: q }).then((r) => unwrap<GridPage>(r)),
  summary: (channelId?: string) => apiClient.get('/online-products/summary', { params: channelId ? { channelId } : {} }).then((r) => unwrap<GridSummary>(r)),
  suggestions: (channelId: string, refresh = false) =>
    apiClient.get(`/online-products/channels/${channelId}/suggestions`, { params: refresh ? { refresh: 1 } : {}, timeout: 180_000 }).then((r) => unwrap<Suggestions>(r)),
  link: (channelId: string, links: LinkInput[]) =>
    apiClient.post(`/online-products/channels/${channelId}/links`, { links }).then((r) => unwrap<{ saved: number; errors: string[] }>(r)),
  importItems: (channelId: string, externalProductIds: string[]) =>
    apiClient.post(`/online-products/channels/${channelId}/import`, { externalProductIds }, { timeout: 180_000 })
      .then((r) => unwrap<{ created: number; linkedExisting: number; failed: number; errors: string[] }>(r)),
  settings: (channelId: string, body: { priceRule?: PriceRule; pushPrice?: boolean; stockBuffer?: number; pushStock?: boolean; autoLink?: boolean }) =>
    apiClient.put(`/online-products/channels/${channelId}/settings`, body).then((r) => unwrap<OnlineChannel>(r)),
  syncChannel: (channelId: string) =>
    apiClient.post(`/online-products/channels/${channelId}/sync`, {}, { timeout: 180_000 }).then((r) => unwrap<{ prices: number; error: string | null }>(r)),
  syncProduct: (productId: string) =>
    apiClient.post(`/online-products/items/${productId}/sync`, {}, { timeout: 120_000 })
      .then((r) => unwrap<{ results: Array<{ channelId: string; name: string; ok: boolean; error: string | null }> }>(r)),
  setPrice: (mappingId: string, priceOverride: number | null) =>
    apiClient.put(`/online-products/links/${mappingId}/price`, { priceOverride }).then((r) => unwrap<{ success: boolean }>(r)),
  issues: () => apiClient.get('/online-products/issues').then((r) => unwrap<{ issues: Issue[] }>(r)),
  linkSure: (channelId: string) =>
    apiClient.post(`/online-products/channels/${channelId}/link-sure`, {}, { timeout: 180_000 }).then((r) => unwrap<{ saved: number; errors: string[] }>(r)),
  fixSizeLess: (channelId: string) =>
    apiClient.post(`/online-products/channels/${channelId}/fix-size-less`, {}).then((r) => unwrap<{ removed: number }>(r)),
  unlink: (mappingId: string) => apiClient.delete(`/online-products/links/${mappingId}`).then((r) => unwrap<{ success: boolean }>(r)),
};

/** Same math as the API (channel-price.ts), for the live example in the price dialog. */
export function applyRule(base: number, rule: PriceRule): number {
  if (!(base > 0)) return 0;
  let p = base;
  if (rule.mode === 'PERCENT') p = base * (1 + rule.value / 100);
  else if (rule.mode === 'FIXED') p = base + rule.value;
  if (p <= 0) return 0;
  if (rule.rounding === 'NEAREST_10') return Math.max(10, Math.round(p / 10) * 10);
  if (rule.rounding === 'END_9') { const r = Math.round(p / 10) * 10 - 1; return r > 0 ? r : Math.round(p); }
  return Math.round(p * 100) / 100;
}
