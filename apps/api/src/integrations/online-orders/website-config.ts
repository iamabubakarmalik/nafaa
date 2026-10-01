import { isIP } from 'net';
import * as crypto from 'crypto';

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
  /** Nafaa me qeemat badle to website (Woo/Shopify) par bhi — jore hue products */
  pushPrice: boolean;
  /** Status badalne par Nafaa is URL par batata hai (plugin khud set karta hai) */
  statusWebhookUrl: string | null;
  /** Sirf signature wale orders qabool hon */
  requireSignature: boolean;
  /** Shopify webhook ka signing key (Shopify admin me milta hai) */
  shopifySecret: string | null;
  platform: 'custom' | 'woocommerce' | 'shopify' | 'wordpress' | 'daraz' | 'foodpanda' | null;
  siteUrl: string | null;
}

export const DEFAULT_WEBSITE_CONFIG: WebsiteConfig = {
  autoAccept: false,
  autoPrint: true,
  shopId: null,
  priceSource: 'WEBSITE',
  pushPrice: false,
  statusWebhookUrl: null,
  requireSignature: false,
  shopifySecret: null,
  platform: null,
  siteUrl: null,
};

export function readWebsiteConfig(raw: unknown): WebsiteConfig {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Partial<WebsiteConfig>;
  return {
    ...DEFAULT_WEBSITE_CONFIG,
    ...c,
    priceSource: c.priceSource === 'NAFAA' ? 'NAFAA' : 'WEBSITE',
    pushPrice: c.pushPrice === true,
  };
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
  shopifySecret?: string | null;
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
    if (!shopifySecret) return 'missing';
    return safeEqual(shopify, hmac(shopifySecret, 'base64')) ? 'valid' : 'invalid';
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
