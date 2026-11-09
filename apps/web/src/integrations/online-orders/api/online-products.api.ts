import { apiClient } from '@core/api/client';
import type { LinkInput } from './online-orders.api';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export type PriceRuleMode = 'NONE' | 'PERCENT' | 'FIXED';
export type PriceRounding = 'NONE' | 'NEAREST_10' | 'END_9';
export interface PriceRule { mode: PriceRuleMode; value: number; rounding: PriceRounding }

export type ChannelType = 'WOOCOMMERCE' | 'SHOPIFY' | 'DARAZ' | 'CUSTOM_WEBSITE';
/** How the channel works with products; Indolj and developer-built sites are both CUSTOM_WEBSITE. */
export type ChannelMode = 'woocommerce' | 'shopify' | 'daraz' | 'indolj' | 'website';

export type StockMode = 'ALL' | 'PERCENT' | 'FIXED';
export interface PushContent { title: boolean; description: boolean; images: boolean; compareAt: boolean; sku: boolean; weight: boolean }

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
  /** How much of Nafaa stock the channel gets */
  stockMode: StockMode;
  stockPercent: number;
  stockFixed: number;
  pushContent: PushContent;
  /** Nafaa can make new products there (Shopify, WooCommerce). */
  canPublish: boolean;
  canContent: boolean;
  contentNote: string | null;
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
  /** Older API builds leave these out. */
  externalProductId?: string | null;
  externalVariantId?: string | null;
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
  /** Shown and sold there; false = draft/hidden */
  listed: boolean;
  /** Own units for this channel; null = the channel's stock mode */
  allocQty: number | null;
  compareAtPrice: number | null;
  lastPush: LastPush | null;
  /** Sell when out of stock on this channel: own setting (null = the product's). Older API builds leave these out. */
  backorder?: boolean | null;
  /** On in force here (link, else size, else product; always off on Daraz). */
  backorderOn?: boolean;
  /** Nafaa and channel stock differ: nothing is pushed until the user picks a side. Older API builds leave it out. */
  hold?: StockHoldInfo | null;
  /** The channel counts stock for this item; false = it does not (Shopify "Track quantity" off), null = unknown. */
  tracksStock?: boolean | null;
  /** The user asked Nafaa to turn counting on for this item. */
  countOptIn?: boolean;
}
export type HoldReason = 'link' | 'import' | 'guard';
export interface StockHoldInfo { since: string; channelStock: number | null; nafaaStock: number; reason: HoldReason }
export interface LastPush { at: string; what: Array<'stock' | 'price' | 'content' | 'status' | 'publish'>; ok: boolean; error: string | null }
export interface OpenCell { linked: false; price: number; stock: number | null; nafaaStock: number }
export type GridCell = LinkedCell | OpenCell;

export interface GridRow {
  variantId: string | null; label: string | null; sku: string | null; price: number; cells: Record<string, GridCell>;
  /** Nafaa stock at the main branch */
  nafaaStock: number | null;
  /** Fixed shares were more than the stock and were cut down */
  scaled: boolean;
  /** Sell when out of stock is on for this product/size */
  backorder?: boolean;
  /** Units owed to customers (stock below zero) */
  owed?: number;
}
export interface GridItem {
  productId: string; name: string; sku: string | null; image: string | null; hasVariants: boolean; price: number;
  rows: GridRow[];
  /** channelId → link made without a size (to fix) */
  sizeLess: Record<string, string>;
  /** Product setting: null = never set (channels keep their own) */
  backorder?: boolean | null;
  backorderMax?: number | null;
}

export type GridFilter = 'all' | 'linked' | 'unlinked' | 'errors' | 'hold' | 'untracked' | 'price' | 'out' | 'unlisted' | 'backorder';
export interface GridScope { categoryId?: string; brandId?: string }
export interface GridQuery extends GridScope { page: number; limit?: number; search?: string; filter?: GridFilter; channelId?: string; productId?: string }
export interface GridPage { channels: OnlineChannel[]; items: GridItem[]; total: number; page: number; pages: number; limit: number }
export type GridSummary = Record<GridFilter, number>;

export interface RemoteView {
  externalProductId: string; externalVariantId: string | null; title: string; variantTitle: string | null; hasVariants: boolean;
  sku: string | null; price: number; stock: number | null; image: string | null;
  /** The channel counts stock for this item; false = it does not. Older API builds leave it out. */
  tracked?: boolean | null;
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
  kind: 'reconnect' | 'fix-size-less' | 'errors' | 'stock-hold' | 'link-sure' | 'link';
  text: string;
  detail?: string | null;
  count?: number;
  /** Failed links per stored error text (kind "errors"). */
  reasons?: Array<{ error: string | null; count: number }>;
}

export type JobKind = 'IMPORT_ALL' | 'LINK_ALL' | 'PUSH' | 'PUBLISH';
export interface CatalogJob {
  id: string; kind: JobKind; status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED' | 'CANCELLED'; integrationId: string | null;
  total: number; done: number; failed: number; percent: number; errors: string[];
  params: Record<string, unknown> | null; createdAt: string; startedAt: string | null; finishedAt: string | null;
}
export interface JobStart { job: CatalogJob; existing: boolean }

export interface Selection { productIds?: string[]; all?: boolean; search?: string; filter?: GridFilter; channelId?: string; categoryId?: string; brandId?: string }
export type BulkAction = 'listed' | 'alloc' | 'price' | 'pricePercent' | 'compareAt' | 'push' | 'publish' | 'backorder';

export type Availability = 'in_stock' | 'out_of_stock' | 'backorder';

/** Sell when out of stock: one product's settings, owed units and the orders waiting for stock. */
export interface BackorderInfo {
  productId: string;
  name: string;
  /** null = never set: every channel keeps its own setting */
  backorder: boolean | null;
  max: number | null;
  leadDays: number | null;
  note: string | null;
  leadText: string | null;
  variants: Array<{ id: string | null; name: string | null; backorder: boolean | null; stock: number; owed: number; availability: Availability }>;
  links: Array<{ mappingId: string; variantId: string | null; channelId: string; channel: string; type: string; backorder: boolean | null; supported: boolean }>;
  owed: Array<{ shopId: string; shop: string; owed: number }>;
  waiting: BackorderOrder[];
}
export interface BackorderOrder {
  id: string; number: string; customer: string | null; status: string; acceptedAt: string; channel: string; shopId: string | null;
  lines: Array<{ productId: string; variantId: string | null; name: string; qty: number; ready: boolean }>;
}
export interface BackorderSave {
  backorder?: boolean | null; max?: number | null; leadDays?: number | null; note?: string | null;
  variants?: Array<{ id: string; backorder: boolean | null }>;
  links?: Array<{ mappingId: string; backorder: boolean | null }>;
}

/* ─── Stock holds: links waiting for the user to pick Nafaa or channel stock ─── */

export type HoldAction = 'take-channel' | 'send-nafaa';
export interface StockHoldRow {
  mappingId: string; productId: string; variantId: string | null; name: string; variantName: string | null;
  externalTitle: string | null; externalSku: string | null; nafaaStock: number; channelStock: number | null; since: string; reason: HoldReason;
}
export interface StockHoldPage { items: StockHoldRow[]; total: number; page: number; pages: number }
export interface HoldResolveResult { resolved: number; adjusted: number; skipped: number; errors: string[] }

/* ─── Link a multi-SKU channel product into one Nafaa product, per SKU ─── */

export interface LinkPlanRow {
  externalVariantId: string | null; title: string; sku: string | null; price: number; stock: number | null;
  /** The channel counts stock for this SKU; false = it does not. */
  tracked?: boolean | null;
  options: Array<{ name: string; value: string }>;
  linked: { mappingId: string; productId: string; variantId: string | null } | null;
  match: { variantId: string; by: 'sku' | 'options' | 'name' } | null;
}
export interface LinkPlan {
  product: { id: string; name: string; hasVariants: boolean };
  remote: { externalProductId: string; title: string; hasVariants: boolean; optionNames: string[] };
  rows: LinkPlanRow[];
  variants: Array<{ id: string; name: string; sku: string | null; size: string | null; color: string | null; stock: number }>;
  canConvert: boolean;
  convertBlock: string | null;
}
export interface LinkIntoBody { externalProductId: string; productId: string; variants?: Array<{ externalVariantId: string | null; variantId: string | null }> }
export interface LinkIntoResult { ok: boolean; product: string; variantsCreated: number; linked: number; held: number }

/* ─── Import fix: undo what an import and Nafaa's first push did to channel stock ─── */

/** untrack = turn the channel's "Track quantity" off again (Nafaa stock untouched); restore = set Nafaa stock to the old channel number. */
export type RecoveryAction = 'untrack' | 'restore';
export type RecoverySource = 'import-zero' | 'untracked-link' | 'first-push';
export interface RecoveryRow {
  mappingId: string; productId: string; variantId: string | null; name: string; variantName: string | null;
  externalTitle: string | null; externalSku: string | null;
  action: RecoveryAction;
  nafaaStock: number;
  channelTracked: boolean | null;
  channelAvailable: number | null;
  importQty: number | null;
  importedAt: string | null;
  found: number | null;
  source: RecoverySource;
  confidence: 'high' | 'low' | null;
  channelChangedAt: string | null;
  at: string | null;
  lastPushAt: string | null;
}
export interface RecoveryPreview {
  channel: { id: string; name: string; type: string; shopId: string | null; shopName: string | null };
  rows: RecoveryRow[];
  checked: number;
  missing: number;
  note: string | null;
  readError: string | null;
}
export interface RecoveryApplyResult { untracked: number; adjusted: number; skipped: number; errors: string[]; pushed: boolean }

export interface LinkPatch { listed?: boolean; allocQty?: number | null; priceOverride?: number | null; compareAtPrice?: number | null }

export const ONLINE_PRODUCTS_KEY = 'online-products';

export const onlineProductsApi = {
  channels: () => apiClient.get('/online-products/channels').then((r) => unwrap<{ channels: OnlineChannel[]; sellable: number }>(r)),
  grid: (q: GridQuery) => apiClient.get('/online-products/grid', { params: q }).then((r) => unwrap<GridPage>(r)),
  summary: (channelId?: string, scope: GridScope = {}) =>
    apiClient.get('/online-products/summary', { params: { ...(channelId ? { channelId } : {}), ...scope } }).then((r) => unwrap<GridSummary>(r)),
  /** One product across every channel (the product panel). */
  item: (productId: string) =>
    apiClient.get('/online-products/grid', { params: { page: 1, limit: 5, productId } }).then((r) => unwrap<GridPage>(r))
      .then((g) => ({ channels: g.channels, item: g.items.find((i) => i.productId === productId) ?? null })),
  suggestions: (channelId: string, refresh = false) =>
    apiClient.get(`/online-products/channels/${channelId}/suggestions`, { params: refresh ? { refresh: 1 } : {}, timeout: 180_000 }).then((r) => unwrap<Suggestions>(r)),
  link: (channelId: string, links: LinkInput[]) =>
    apiClient.post(`/online-products/channels/${channelId}/links`, { links }).then((r) => unwrap<{ saved: number; held?: number; errors: string[] }>(r)),
  importItems: (channelId: string, externalProductIds: string[]) =>
    apiClient.post(`/online-products/channels/${channelId}/import`, { externalProductIds }, { timeout: 180_000 })
      .then((r) => unwrap<{ created: number; linkedExisting: number; held?: number; untracked?: number; failed: number; errors: string[] } | JobStart>(r)),
  settings: (channelId: string, body: {
    priceRule?: PriceRule; pushPrice?: boolean; stockBuffer?: number; pushStock?: boolean; autoLink?: boolean;
    stockMode?: StockMode; stockPercent?: number; stockFixed?: number; pushContent?: Partial<PushContent>;
  }) =>
    apiClient.put(`/online-products/channels/${channelId}/settings`, body).then((r) => unwrap<OnlineChannel>(r)),
  syncChannel: (channelId: string) =>
    apiClient.post(`/online-products/channels/${channelId}/sync`, {}, { timeout: 180_000 }).then((r) => unwrap<{ prices: number; error: string | null }>(r)),
  syncProduct: (productId: string, content = false) =>
    apiClient.post(`/online-products/items/${productId}/sync`, {}, { timeout: 120_000, params: content ? { content: 1 } : {} })
      .then((r) => unwrap<{ results: Array<{ channelId: string; name: string; ok: boolean; error: string | null }> }>(r)),
  setPrice: (mappingId: string, priceOverride: number | null) =>
    apiClient.put(`/online-products/links/${mappingId}/price`, { priceOverride }).then((r) => unwrap<{ success: boolean }>(r)),
  issues: () => apiClient.get('/online-products/issues').then((r) => unwrap<{ issues: Issue[] }>(r)),
  linkSure: (channelId: string) =>
    apiClient.post(`/online-products/channels/${channelId}/link-sure`, {}, { timeout: 180_000 }).then((r) => unwrap<{ saved: number; errors: string[] }>(r)),
  fixSizeLess: (channelId: string) =>
    apiClient.post(`/online-products/channels/${channelId}/fix-size-less`, {}).then((r) => unwrap<{ removed: number }>(r)),
  updateLink: (mappingId: string, patch: LinkPatch) =>
    apiClient.put(`/online-products/links/${mappingId}`, patch).then((r) => unwrap<{ success: boolean; link: LinkPatch }>(r)),
  bulk: (body: { selection: Selection; action: BulkAction; channelId?: string | null; value?: unknown }) =>
    apiClient.post('/online-products/bulk', body, { timeout: 120_000 }).then((r) => unwrap<JobStart & { updated: number; skipped?: number }>(r)),
  importAll: (channelId: string) =>
    apiClient.post(`/online-products/channels/${channelId}/import-all`, {}, { timeout: 300_000 }).then((r) => unwrap<JobStart & { sure: number; maybe: number }>(r)),
  linkAll: (channelId: string) =>
    apiClient.post(`/online-products/channels/${channelId}/link-all`, {}, { timeout: 300_000 }).then((r) => unwrap<JobStart>(r)),
  jobs: () => apiClient.get('/online-products/jobs').then((r) => unwrap<{ jobs: CatalogJob[] }>(r)),
  cancelJob: (id: string) => apiClient.post(`/online-products/jobs/${id}/cancel`, {}).then((r) => unwrap<CatalogJob>(r)),
  unlink: (mappingId: string) => apiClient.delete(`/online-products/links/${mappingId}`).then((r) => unwrap<{ success: boolean }>(r)),
  backorder: (productId: string) => apiClient.get(`/online-products/items/${productId}/backorder`).then((r) => unwrap<BackorderInfo>(r)),
  saveBackorder: (productId: string, body: BackorderSave) =>
    apiClient.put(`/online-products/items/${productId}/backorder`, body).then((r) => unwrap<BackorderInfo>(r)),
  /** Turn channel stock counting on (Nafaa's stock goes out) or off again for these links. */
  setCounting: (mappingIds: string[], on: boolean) =>
    apiClient.post('/online-products/links/counting', { mappingIds, on }).then((r) => unwrap<{ updated: number }>(r)),
  stockHolds: (channelId: string, page = 1, limit = 50) =>
    apiClient.get(`/online-products/channels/${channelId}/stock-holds`, { params: { page, limit } }).then((r) => unwrap<StockHoldPage>(r)),
  resolveHolds: (channelId: string, body: { action: HoldAction; all: true } | { action: HoldAction; mappingIds: string[] }) =>
    apiClient.post(`/online-products/channels/${channelId}/stock-holds/resolve`, body, { timeout: 180_000 }).then((r) => unwrap<HoldResolveResult>(r)),
  linkPlan: (channelId: string, externalProductId: string, productId: string) =>
    apiClient.get(`/online-products/channels/${channelId}/link-plan`, { params: { externalProductId, productId }, timeout: 120_000 }).then((r) => unwrap<LinkPlan>(r)),
  linkInto: (channelId: string, body: LinkIntoBody) =>
    apiClient.post(`/online-products/channels/${channelId}/link-into`, body, { timeout: 120_000 }).then((r) => unwrap<LinkIntoResult>(r)),
  stockRecovery: (channelId: string) =>
    apiClient.get(`/online-products/channels/${channelId}/stock-recovery`, { timeout: 120_000 }).then((r) => unwrap<RecoveryPreview>(r)),
  applyRecovery: (channelId: string, mappingIds: string[]) =>
    apiClient.post(`/online-products/channels/${channelId}/stock-recovery/apply`, { mappingIds }, { timeout: 180_000 }).then((r) => unwrap<RecoveryApplyResult>(r)),
  waitingBackorders: (productIds?: string[]) =>
    apiClient.get('/online-products/backorders', { params: productIds?.length ? { productId: productIds.join(',') } : {} }).then((r) => unwrap<BackorderOrder[]>(r)),
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
