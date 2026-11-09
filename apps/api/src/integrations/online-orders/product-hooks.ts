/**
 * Product webhook bodies (Shopify products/create|update, WooCommerce
 * product.created|updated) reduced to what the price source and auto import
 * need. Pure functions; the service does the reads and writes.
 */

export interface ProductHookEvent {
  externalProductId: string;
  /** The channel reported a new product (create topic). */
  created: boolean;
  /** The channel's own update time (Shopify updated_at, Woo date_modified_gmt), else when Nafaa received it (ISO). */
  at: string;
  /** Prices in the body, per channel variant (null = the product itself). Empty when the body has none. */
  prices: Array<{ externalVariantId: string | null; price: number }>;
  /** Name, description (HTML) and pictures, when the body has them (a Woo variation body has none). */
  content: { title: string; description: string; images: string[] } | null;
  /** Counted stock per channel variant (WooCommerce only; Shopify stock comes from inventory level webhooks). */
  stocks: Array<{ externalVariantId: string | null; qty: number }>;
}

/** Shopify inventory_levels/update reduced to item, location, quantity and time. */
export interface InventoryHookEvent { inventoryItemId: string; locationId: string | null; available: number; at: string }

export function parseInventoryHook(body: unknown, now: number): InventoryHookEvent | null {
  const b = (body && typeof body === 'object' ? body : null) as Record<string, any> | null;
  const item = id(b?.inventory_item_id);
  const qty = Number(b?.available);
  if (!item || b?.available === null || b?.available === undefined || !Number.isFinite(qty)) return null;
  return { inventoryItemId: item, locationId: id(b?.location_id), available: qty, at: channelTime(b?.updated_at, now) };
}

/** The channel's own update time when it is a valid date, else `now`. */
function channelTime(v: unknown, now: number, utc = false): string {
  const raw = v === null || v === undefined ? '' : String(v);
  const t = Date.parse(utc && raw && !/[zZ]|[+-]\d\d:?\d\d$/.test(raw) ? `${raw}Z` : raw);
  return new Date(Number.isFinite(t) ? t : now).toISOString();
}

const id = (v: unknown) => (v === null || v === undefined || v === '' ? null : /^\d+$/.test(String(v)) ? String(v) : null);
const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

export function parseProductHook(type: string, topic: string, body: unknown, now: number): ProductHookEvent | null {
  const b = (body && typeof body === 'object' ? body : null) as Record<string, any> | null;
  if (!b) return null;
  const created = /create/i.test(topic);
  if (type === 'SHOPIFY') {
    const at = channelTime(b.updated_at, now);
    const pid = id(b.id);
    if (!pid) return null;
    const variants: any[] = Array.isArray(b.variants) ? b.variants : [];
    const prices = variants
      .map((v) => ({ externalVariantId: id(v?.id), price: money(v?.price) }))
      .filter((x): x is { externalVariantId: string; price: number } => !!x.externalVariantId && x.price !== null);
    const images = (Array.isArray(b.images) ? b.images : []).map((x: any) => String(x?.src ?? '')).filter(Boolean);
    const content = typeof b.title === 'string' ? { title: b.title, description: String(b.body_html ?? ''), images } : null;
    return { externalProductId: pid, created, at, prices, content, stocks: [] };
  }
  if (type === 'WOOCOMMERCE') {
    // A variation arrives as its own body with the parent product id.
    const at = channelTime(b.date_modified_gmt, now, true);
    const parent = id(b.parent_id);
    const own = id(b.id);
    if (!own) return null;
    const price = money(b.regular_price) ?? money(b.price);
    const counted = b.manage_stock === true && b.stock_quantity !== null && b.stock_quantity !== undefined && Number.isFinite(Number(b.stock_quantity));
    if (parent && parent !== '0') {
      return {
        externalProductId: parent, created: false, at, prices: price !== null ? [{ externalVariantId: own, price }] : [], content: null,
        stocks: counted ? [{ externalVariantId: own, qty: Number(b.stock_quantity) }] : [],
      };
    }
    // A variable product's body has no variation prices or stock; the variations send their own.
    const simple = String(b.type ?? 'simple') !== 'variable';
    const images = (Array.isArray(b.images) ? b.images : []).map((x: any) => String(x?.src ?? '')).filter(Boolean);
    return {
      externalProductId: own, created, at, prices: simple && price !== null ? [{ externalVariantId: null, price }] : [],
      content: typeof b.name === 'string' ? { title: b.name, description: String(b.description ?? ''), images } : null,
      stocks: simple && counted ? [{ externalVariantId: null, qty: Number(b.stock_quantity) }] : [],
    };
  }
  return null;
}

/**
 * New `externalData` for links whose channel price the events changed. The
 * last event per item wins; a link without a variant takes the product's only
 * (or first) price. Items with no price in the body are left alone.
 */
export function channelPriceUpdates(
  maps: Array<{ id: string; externalProductId: string | null; externalVariantId: string | null; externalData: unknown }>,
  events: ProductHookEvent[],
): Array<{ id: string; data: Record<string, unknown> }> {
  const latest = new Map<string, { price: number; at: string }>();
  const firstOf = new Map<string, { price: number; at: string }>();
  for (const e of events) {
    for (const p of e.prices) {
      latest.set(`${e.externalProductId}:${p.externalVariantId ?? '-'}`, { price: p.price, at: e.at });
    }
    if (e.prices.length) firstOf.set(e.externalProductId, { price: e.prices[0].price, at: e.at });
  }
  const out: Array<{ id: string; data: Record<string, unknown> }> = [];
  for (const m of maps) {
    const pid = String(m.externalProductId ?? '');
    const hit = m.externalVariantId ? latest.get(`${pid}:${m.externalVariantId}`) : latest.get(`${pid}:-`) ?? firstOf.get(pid);
    if (!hit) continue;
    const d = ((m.externalData as Record<string, unknown>) ?? {}) as Record<string, unknown>;
    if (Number(d.channelPrice) === hit.price) continue;
    // The channel's state from before what the link already knows (Nafaa's own push, a newer read) is not applied:
    // a price Nafaa sent never comes back as a channel change.
    const knownAt = Date.parse(String(d.channelPriceAt ?? ''));
    if (Number.isFinite(knownAt) && knownAt >= Date.parse(hit.at)) continue;
    out.push({ id: m.id, data: { ...d, channelPrice: hit.price, channelPriceAt: hit.at } });
  }
  return out;
}
