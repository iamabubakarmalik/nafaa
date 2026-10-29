/**
 * Shopify store address, same rules as the API (shopify-shop.ts): any pasted
 * form becomes `<handle>.myshopify.com`. A custom domain is looked up on the
 * server, because only the storefront knows its myshopify address.
 */
import { useEffect, useState } from 'react';
import { onlineOrdersApi } from '../api/online-orders.api';

export type ShopAddress =
  | { ok: true; shop: string }
  | { ok: false; reason: 'empty' | 'invalid' | 'custom-domain'; domain?: string };

const HANDLE = /^[a-z0-9][a-z0-9-]{0,62}$/;

export function parseShopAddress(raw: string): ShopAddress {
  let s = String(raw ?? '').trim().toLowerCase().replace(/^["'<\s]+|["'>\s]+$/g, '');
  if (!s) return { ok: false, reason: 'empty' };
  const admin = s.match(/admin\.shopify\.com\/store\/([a-z0-9-]+)/);
  if (admin) return HANDLE.test(admin[1]) ? { ok: true, shop: `${admin[1]}.myshopify.com` } : { ok: false, reason: 'invalid' };
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/^[^/@]*@/, '');
  s = s.split(/[/?#]/)[0].replace(/:\d+$/, '').replace(/\.+$/, '');
  if (!s) return { ok: false, reason: 'empty' };
  const my = s.match(/^(?:www\.)?([a-z0-9-]+)\.myshopify\.com$/);
  if (my) return HANDLE.test(my[1]) ? { ok: true, shop: `${my[1]}.myshopify.com` } : { ok: false, reason: 'invalid' };
  if (s.endsWith('.myshopify.com')) return { ok: false, reason: 'invalid' };
  if (!s.includes('.')) return HANDLE.test(s) ? { ok: true, shop: `${s}.myshopify.com` } : { ok: false, reason: 'invalid' };
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(s) && !/^\d+(\.\d+){3}$/.test(s)) return { ok: false, reason: 'custom-domain', domain: s.replace(/^www\./, '') };
  return { ok: false, reason: 'invalid' };
}

export interface ResolvedAddress {
  state: 'empty' | 'ok' | 'looking' | 'error';
  shop: string | null;
  /** Found through the custom domain. */
  fromDomain?: string;
  message?: string;
}

/** Live address check for the input: instant for myshopify forms, server lookup for custom domains. */
export function useShopifyAddress(raw: string): ResolvedAddress {
  const parsed = parseShopAddress(raw);
  const domain = !parsed.ok && parsed.reason === 'custom-domain' ? parsed.domain! : null;
  const [lookup, setLookup] = useState<{ domain: string; shop: string | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!domain || lookup?.domain === domain) return;
    let live = true;
    const t = setTimeout(() => {
      onlineOrdersApi.shopifyResolve(domain)
        .then((r) => { if (live) setLookup({ domain, shop: r.shop, error: r.ok ? null : r.error }); })
        .catch(() => { if (live) setLookup({ domain, shop: null, error: null }); });
    }, 600);
    return () => { live = false; clearTimeout(t); };
  }, [domain]); // eslint-disable-line react-hooks/exhaustive-deps

  if (parsed.ok) return { state: 'ok', shop: parsed.shop };
  if (parsed.reason === 'empty') return { state: 'empty', shop: null };
  if (domain) {
    if (lookup?.domain !== domain) return { state: 'looking', shop: null, message: `${domain} aap ka apna domain hai — is ka Shopify address dhoond rahe hain…` };
    if (lookup.shop) return { state: 'ok', shop: lookup.shop, fromDomain: domain };
    return {
      state: 'error', shop: null,
      message: `${domain} se Shopify address nahi mila. Shopify admin → Settings → Domains me jo address ".myshopify.com" par khatam hota hai, wo daalein.`,
    };
  }
  return { state: 'error', shop: null, message: 'Ye Shopify ka address nahi lagta. Shopify admin → Settings → Domains me ".myshopify.com" wala address copy karein.' };
}

/** Scopes Nafaa needs from a merchant's own app (same list as the Nafaa app). */
export const SHOPIFY_SCOPES = [
  'read_products', 'write_products',
  'read_inventory', 'write_inventory',
  'read_locations',
  'read_orders', 'write_orders',
  'read_merchant_managed_fulfillment_orders', 'write_merchant_managed_fulfillment_orders',
];

/** Webhooks to add by hand (Settings → Notifications → Webhooks). */
export const SHOPIFY_WEBHOOK_EVENTS = [
  { event: 'Order creation', topic: 'orders/create', why: 'naya order' },
  { event: 'Order update', topic: 'orders/updated', why: 'badla hua order' },
  { event: 'Order cancellation', topic: 'orders/cancelled', why: 'cancel' },
  { event: 'Order payment', topic: 'orders/paid', why: 'paisa aa gaya' },
];
