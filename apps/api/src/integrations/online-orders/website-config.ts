import { isIP } from 'net';
import * as crypto from 'crypto';
import { NO_PRICE_RULE, PriceRule, readPriceRule } from './channel-price';
import { readStockRule, StockMode, StockRule } from './stock-allocation';

/** What a content push sends to the channel (title, description, images, sale price, SKU, weight). */
export interface PushContent {
  title: boolean;
  description: boolean;
  images: boolean;
  compareAt: boolean;
  sku: boolean;
  weight: boolean;
}

export const DEFAULT_PUSH_CONTENT: PushContent = { title: true, description: true, images: false, compareAt: true, sku: false, weight: true };

export function readPushContent(raw: unknown): PushContent {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof PushContent, unknown>>;
  const out = { ...DEFAULT_PUSH_CONTENT };
  for (const k of Object.keys(out) as (keyof PushContent)[]) if (typeof r[k] === 'boolean') out[k] = r[k] as boolean;
  return out;
}

/**
 * Website connection ki settings — `Integration.config` JSON me rehti hain.
 * Har field optional hai: purani integrations jin me config khali hai,
 * unhein bhi yahi defaults milte hain.
 */
export interface WebsiteConfig {
  /** Order aate hi khud bill ban jaye (stock bhi kam ho jaye) */
  autoAccept: boolean;
  /** Bill bante hi receipt print ho */
  autoPrint: boolean;
  /** Online orders kis branch ke stock se jayenge */
  shopId: string | null;
  /** Bill me qeemat: website wali (jo customer ne di) ya Nafaa wali */
  priceSource: 'WEBSITE' | 'NAFAA';
  /** Delivery charge kis ke paas: SHOP = dukaan ki kamai (bill me), RIDER = bahar ka rider khud leta hai (sirf likha) */
  deliveryFeeMode: 'SHOP' | 'RIDER';
  /**
   * Nafaa sends prices to the channel. Derived from `priceFrom`: on for NAFAA
   * and LATEST, off for WEBSITE and NONE. Kept for every reader that checks it.
   */
  pushPrice: boolean;
  /**
   * Which side owns the price of linked items ("Qeemat kahan se badlegi?"):
   *  - NAFAA: Nafaa sends its price; a price changed on the channel after the last push waits for the merchant.
   *  - WEBSITE: a price changed on the channel is taken into Nafaa; Nafaa never sends prices.
   *  - LATEST: whichever side changed last wins.
   *  - NONE: prices are not synced either way.
   * Channels saved before this setting existed read NAFAA when pushPrice was on, else NONE.
   */
  priceFrom: PriceFrom;
  /** New channel: the price source question is still open (asked on the channel screen). */
  priceFromAsk: boolean;
  /**
   * Where a channel price lands in Nafaa (WEBSITE and LATEST) when the channel has no price rule:
   * PRODUCT = the Nafaa product price (branch price where set), CHANNEL = this channel's own link price.
   * With a price rule the link price is always used.
   */
  websitePriceTo: 'PRODUCT' | 'CHANNEL';
  /** New products on the channel are brought into Nafaa by themselves (with the stock handover rules). */
  autoImport: boolean;
  /** Name, description and pictures: which side owns them (same choices as the price; NONE = not synced automatically). */
  contentFrom: PriceFrom;
  /**
   * New Nafaa products made on the channel by themselves: OFF; MARKED = only
   * products the merchant marked for this channel; ALL = every new Nafaa product.
   */
  autoPublish: 'OFF' | 'MARKED' | 'ALL';
  /** When autoPublish became ALL: only products made after it are published. */
  autoPublishSince: string | null;
  /**
   * Stock changed by hand on the channel (not by Nafaa's push, not by an order)
   * is taken into Nafaa as an adjustment ("Website par badla"). Nafaa stays the counter.
   */
  stockFromChannel: boolean;
  /** The merchant has picked the sync settings (older channels show "Sync settings chunein" until then). */
  syncChosen: boolean;
  /** Channel price = Nafaa retail price with this rule (a link's own price wins). */
  priceRule: PriceRule;
  /** Units kept back: the channel is told stock minus this. */
  stockBuffer: number;
  /** How much of Nafaa stock the channel gets: all, a percent, or a fixed number per product */
  stockMode: StockMode;
  stockPercent: number;
  stockFixed: number;
  /** Fields a content push sends */
  pushContent: PushContent;
  /** Send Nafaa stock to the channel (Woo/Shopify/Daraz). Off = no stock push of any kind. */
  pushStock: boolean;
  /** Link exact SKU/barcode matches by itself. On for channels made after it existed; off for older ones. */
  autoLink: boolean;
  /** Status badalne par Nafaa is URL par batata hai (plugin khud set karta hai) */
  statusWebhookUrl: string | null;
  /** Sirf signature wale orders qabool hon */
  requireSignature: boolean;
  /** Shopify webhook ka signing key (Shopify admin me milta hai) */
  shopifySecret: string | null;
  platform: 'custom' | 'woocommerce' | 'shopify' | 'wordpress' | 'daraz' | 'foodpanda' | null;
  siteUrl: string | null;
  /**
   * Who bills the Shopify connection. 'shopify' = the store installed Nafaa
   * from the App Store listing, so the connection is paid through Shopify App
   * Pricing (App Store rule 1.2.1). 'direct' = onboarded by Nafaa, billed in PKR.
   */
  shopifyBilling: 'direct' | 'shopify';
  /** Last read of the store's Shopify App Pricing subscription (App Store installs only) */
  shopifyPlan: ShopifyPlanState | null;
  /** Order status mapping choices (channel-status-map.ts); null = the defaults. */
  statusMap: { inbound?: Record<string, string>; outbound?: Record<string, string> } | null;
}

export interface ShopifyPlanState {
  active: boolean;
  name: string | null;
  status: string | null;
  test: boolean;
  checkedAt: string;
}

export const DEFAULT_WEBSITE_CONFIG: WebsiteConfig = {
  autoAccept: false,
  autoPrint: true,
  shopId: null,
  priceSource: 'WEBSITE',
  deliveryFeeMode: 'SHOP',
  pushPrice: false,
  priceFrom: 'NONE',
  priceFromAsk: false,
  websitePriceTo: 'PRODUCT',
  autoImport: false,
  contentFrom: 'NONE',
  autoPublish: 'OFF',
  autoPublishSince: null,
  stockFromChannel: false,
  syncChosen: false,
  priceRule: NO_PRICE_RULE,
  stockBuffer: 0,
  stockMode: 'ALL',
  stockPercent: 100,
  stockFixed: 0,
  pushContent: DEFAULT_PUSH_CONTENT,
  pushStock: true,
  autoLink: false,
  statusWebhookUrl: null,
  requireSignature: false,
  shopifySecret: null,
  platform: null,
  siteUrl: null,
  shopifyBilling: 'direct',
  shopifyPlan: null,
  statusMap: null,
};

export function readWebsiteConfig(raw: unknown): WebsiteConfig {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Partial<WebsiteConfig>;
  return {
    ...DEFAULT_WEBSITE_CONFIG,
    ...c,
    priceSource: c.priceSource === 'NAFAA' ? 'NAFAA' : 'WEBSITE',
    deliveryFeeMode: c.deliveryFeeMode === 'RIDER' ? 'RIDER' : 'SHOP',
    pushPrice: pushesPrice(readPriceFrom(c)),
    priceFrom: readPriceFrom(c),
    priceFromAsk: c.priceFromAsk === true,
    websitePriceTo: c.websitePriceTo === 'CHANNEL' ? 'CHANNEL' : 'PRODUCT',
    autoImport: c.autoImport === true,
    contentFrom: readFrom(c.contentFrom, 'NONE'),
    autoPublish: c.autoPublish === 'MARKED' || c.autoPublish === 'ALL' ? c.autoPublish : 'OFF',
    autoPublishSince: typeof c.autoPublishSince === 'string' ? c.autoPublishSince : null,
    stockFromChannel: c.stockFromChannel === true,
    syncChosen: c.syncChosen === true,
    priceRule: readPriceRule(c.priceRule),
    stockBuffer: Math.min(10_000, Math.max(0, Math.floor(Number(c.stockBuffer) || 0))),
    stockMode: readStockRule(c).mode,
    stockPercent: readStockRule(c).percent,
    stockFixed: readStockRule(c).fixed,
    pushContent: readPushContent(c.pushContent),
    pushStock: c.pushStock !== false,
    autoLink: c.autoLink === true,
    shopifyBilling: c.shopifyBilling === 'shopify' ? 'shopify' : 'direct',
    shopifyPlan: c.shopifyPlan && typeof c.shopifyPlan === 'object' ? c.shopifyPlan : null,
    statusMap: c.statusMap && typeof c.statusMap === 'object' ? c.statusMap : null,
  };
}

export type PriceFrom = 'NAFAA' | 'WEBSITE' | 'LATEST' | 'NONE';
const PRICE_FROM: readonly PriceFrom[] = ['NAFAA', 'WEBSITE', 'LATEST', 'NONE'];

/** The stored price source, or the one older channels had: NAFAA with price push on, else NONE. */
export function readPriceFrom(raw: { priceFrom?: unknown; pushPrice?: unknown } | null | undefined): PriceFrom {
  const v = raw?.priceFrom;
  if (typeof v === 'string' && (PRICE_FROM as readonly string[]).includes(v)) return v as PriceFrom;
  return raw?.pushPrice === true ? 'NAFAA' : 'NONE';
}

const readFrom = (v: unknown, fallback: PriceFrom): PriceFrom =>
  typeof v === 'string' && (PRICE_FROM as readonly string[]).includes(v) ? (v as PriceFrom) : fallback;

/**
 * "Sab kuch khud sync (recommended)": prices and content follow whichever side
 * changed last, new products come in from the channel, products the merchant
 * marks go out, and stock edited by hand on the channel is taken in.
 */
export const AUTO_SYNC_PRESET = {
  priceFrom: 'LATEST' as PriceFrom,
  pushPrice: true,
  contentFrom: 'LATEST' as PriceFrom,
  autoImport: true,
  autoLink: true,
  autoPublish: 'MARKED' as const,
  stockFromChannel: true,
  pushStock: true,
  syncChosen: true,
  priceFromAsk: false,
};

/** Does this config match the preset (for the "recommended" badge)? */
export function isAutoSync(cfg: WebsiteConfig) {
  return cfg.priceFrom === 'LATEST' && cfg.contentFrom === 'LATEST' && cfg.autoImport && cfg.autoPublish !== 'OFF' && cfg.stockFromChannel && cfg.pushStock;
}

export const pushesPrice = (from: PriceFrom) => from === 'NAFAA' || from === 'LATEST';
export const pullsPrice = (from: PriceFrom) => from === 'WEBSITE' || from === 'LATEST';

/** The channel's stock share rule (mode, percent, fixed, buffer). */
export function stockRule(cfg: Pick<WebsiteConfig, 'stockMode' | 'stockPercent' | 'stockFixed' | 'stockBuffer'>): StockRule {
  return { mode: cfg.stockMode, percent: cfg.stockPercent, fixed: cfg.stockFixed, buffer: cfg.stockBuffer };
}

const safeEqual = (a: string, b: string): boolean => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

export type SignatureResult = 'valid' | 'invalid' | 'missing';

/**
 * Teeno platforms apne apne header me HMAC-SHA256 bhejte hain:
 *  - Nafaa plugin / custom code: `X-Nafaa-Signature: sha256=<hex>` (webhookSecret se)
 *  - WooCommerce: `X-WC-Webhook-Signature: <base64>` (webhook form ka "Secret" = webhookSecret)
 *  - Shopify: `X-Shopify-Hmac-Sha256: <base64>` (Shopify ka apna key)
 */
export function verifySignature(opts: {
  rawBody?: Buffer;
  headers: Record<string, any>;
  webhookSecret?: string | null;
  /** One key, or every key that may sign this channel's Shopify webhooks. */
  shopifySecret?: string | string[] | null;
}): SignatureResult {
  const { rawBody, headers, webhookSecret, shopifySecret } = opts;
  const nafaa = headers['x-nafaa-signature'] as string | undefined;
  const woo = headers['x-wc-webhook-signature'] as string | undefined;
  const shopify = headers['x-shopify-hmac-sha256'] as string | undefined;

  if (!nafaa && !woo && !shopify) return 'missing';
  if (!rawBody) return 'invalid';

  const hmac = (secret: string, enc: 'hex' | 'base64') =>
    crypto.createHmac('sha256', secret).update(rawBody).digest(enc);

  if (nafaa && webhookSecret) {
    return safeEqual(nafaa.replace(/^sha256=/, ''), hmac(webhookSecret, 'hex')) ? 'valid' : 'invalid';
  }
  if (woo && webhookSecret) {
    return safeEqual(woo, hmac(webhookSecret, 'base64')) ? 'valid' : 'invalid';
  }
  if (shopify) {
    // Shopify ka key set nahi to verify nahi kar sakte — "missing" jaisa samjho
    const keys = (Array.isArray(shopifySecret) ? shopifySecret : [shopifySecret]).filter((k): k is string => !!k);
    if (!keys.length) return 'missing';
    return keys.some((k) => safeEqual(shopify, hmac(k, 'base64'))) ? 'valid' : 'invalid';
  }
  return 'invalid';
}

export function signPayload(secret: string, body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

/**
 * Status webhook ka URL sirf bahar ki public website ho sakta hai —
 * warna koi key wala server ke andar ke pate (169.254…, localhost) par
 * request bhijwa sakta hai.
 */
export function assertSafeWebhookUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new Error('URL sahi nahi hai');
  }
  const isDev = process.env.NODE_ENV !== 'production';
  if (u.protocol !== 'https:' && !(isDev && u.protocol === 'http:')) {
    throw new Error('URL https:// se shuru hona chahiye');
  }
  const host = u.hostname.toLowerCase();
  const privateHost =
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^0\./.test(host) ||
    host === '::1' ||
    host.startsWith('[');
  if (privateHost && !isDev) throw new Error('Andar ka (private) address allowed nahi');
  return u.toString();
}

/** DNS ke baad ka IP andar (private / loopback / link-local) ka to nahi */
export function isPrivateIp(ip: string): boolean {
  const v = ip.replace(/^::ffff:/, '');
  if (isIP(v) === 4) {
    const [a, b] = v.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const l = v.toLowerCase();
  return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80');
}
