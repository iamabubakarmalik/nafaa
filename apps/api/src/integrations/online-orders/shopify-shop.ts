/**
 * Shopify store address handling.
 *
 * Merchants paste whatever their browser shows: the bare handle, the
 * myshopify domain, an admin.shopify.com URL, a storefront URL, or their
 * custom domain. Nafaa always stores `https://<handle>.myshopify.com`.
 */
import { promises as dns } from 'dns';
import { isIP } from 'net';
import { isPrivateIp } from './website-config';

export type ShopAddress =
  | { ok: true; shop: string }
  | { ok: false; reason: 'empty' | 'invalid' | 'custom-domain'; domain?: string };

const HANDLE = /^[a-z0-9][a-z0-9-]{0,62}$/;

/** Turns any pasted Shopify address into `<handle>.myshopify.com` when possible. */
export function parseShopAddress(raw: unknown): ShopAddress {
  let s = String(raw ?? '').trim().toLowerCase();
  s = s.replace(/^["'<\s]+|["'>\s]+$/g, '');
  if (!s) return { ok: false, reason: 'empty' };

  // admin.shopify.com/store/<handle>[.myshopify.com][/...]
  const admin = s.match(/admin\.shopify\.com\/store\/([a-z0-9-]+)/);
  if (admin) return HANDLE.test(admin[1]) ? { ok: true, shop: `${admin[1]}.myshopify.com` } : { ok: false, reason: 'invalid' };

  // Drop scheme, credentials, path, query and port.
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/^[^/@]*@/, '');
  s = s.split(/[/?#]/)[0].replace(/:\d+$/, '').replace(/\.+$/, '');
  if (!s) return { ok: false, reason: 'empty' };

  const my = s.match(/^(?:www\.)?([a-z0-9-]+)\.myshopify\.com$/);
  if (my) return HANDLE.test(my[1]) ? { ok: true, shop: `${my[1]}.myshopify.com` } : { ok: false, reason: 'invalid' };
  if (s.endsWith('.myshopify.com')) return { ok: false, reason: 'invalid' };

  if (!s.includes('.')) return HANDLE.test(s) ? { ok: true, shop: `${s}.myshopify.com` } : { ok: false, reason: 'invalid' };

  // A real domain (kissanmall.pk) — only the store itself can tell us its handle.
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(s) && !isIP(s)) return { ok: false, reason: 'custom-domain', domain: s.replace(/^www\./, '') };
  return { ok: false, reason: 'invalid' };
}

/** Store address for saved channels: myshopify form when it can be derived, else unchanged. */
export function normalizeShopifySiteUrl(siteUrl: string | null | undefined): string | null {
  if (!siteUrl) return siteUrl ?? null;
  const p = parseShopAddress(siteUrl);
  return p.ok ? `https://${p.shop}` : siteUrl;
}

/** Message for an address that cannot be used as is. */
export function shopAddressError(p: Exclude<ShopAddress, { ok: true }>): string {
  if (p.reason === 'empty') return 'Shopify store ka address daalein — jaise kissanmall-pk.myshopify.com';
  if (p.reason === 'custom-domain') {
    return `${p.domain} aap ka apna domain hai. Shopify admin → Settings → Domains me jo address ".myshopify.com" par khatam hota hai, wo daalein.`;
  }
  return 'Ye Shopify ka address nahi lagta. Shopify admin → Settings → Domains me ".myshopify.com" wala address copy karein.';
}

/** Reads `Shopify.shop = "<handle>.myshopify.com"` (or similar) from a storefront page. */
export function myshopifyFromHtml(html: string): string | null {
  const patterns = [
    /Shopify\.shop\s*=\s*["']([a-z0-9-]+\.myshopify\.com)["']/i,
    /["']myshopifyDomain["']\s*:\s*["']([a-z0-9-]+\.myshopify\.com)["']/i,
    /["']shop["']\s*:\s*["']([a-z0-9-]+\.myshopify\.com)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1].toLowerCase();
  }
  return null;
}

/**
 * Finds the myshopify address behind a custom domain by reading the store's
 * home page. Public hosts only, 6 second limit, first 600 KB only.
 */
export async function lookupShopFromDomain(domain: string): Promise<string | null> {
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return null;
  const hosts = [domain];
  if (!domain.startsWith('www.')) hosts.push(`www.${domain}`);
  for (let i = 0; i < hosts.length; i++) {
    const host = hosts[i];
    const addrs = await dns.lookup(host, { all: true }).catch(() => []);
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) continue;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch(`https://${host}/`, {
        headers: { 'User-Agent': 'Nafaa-POS/1.0', Accept: 'text/html' },
        redirect: 'manual',
        signal: ctrl.signal,
      });
      if (res.status >= 300 && res.status < 400) {
        const to = res.headers.get('location') ?? '';
        const parsed = parseShopAddress(to);
        if (parsed.ok) return parsed.shop;
        // One more hop to another public host (kissanmall.pk -> www.kissanmall.pk).
        if (parsed.reason === 'custom-domain' && parsed.domain && hosts.length < 3) {
          const next = new URL(to, `https://${host}/`).hostname.toLowerCase();
          if (!hosts.includes(next)) hosts.push(next);
        }
        continue;
      }
      if (!res.ok || !res.body) continue;
      const reader = res.body.getReader();
      let html = '';
      const decoder = new TextDecoder();
      while (html.length < 600_000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        const found = myshopifyFromHtml(html);
        if (found) { reader.cancel().catch(() => null); return found; }
      }
      reader.cancel().catch(() => null);
    } catch {
      /* unreachable or timed out */
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
