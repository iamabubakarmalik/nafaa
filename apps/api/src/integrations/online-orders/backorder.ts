/**
 * Sell when out of stock (backorder).
 *
 * The owner marks a product (or one size, or one channel link) to keep taking
 * orders at zero stock. Nafaa's stock stays true: an accepted order may take
 * the branch below zero, and the units below zero are owed to customers.
 *
 * The setting is three-way at every level: null = not set (follow the level
 * above; at the product, leave the channel's own setting alone), true = on,
 * false = off. A channel link wins over the size, the size over the product.
 */

export type Availability = 'in_stock' | 'out_of_stock' | 'backorder';

export interface BackorderSource {
  backorder?: boolean | null;
  backorderMax?: number | null;
  backorderLeadDays?: number | null;
  backorderNote?: string | null;
}

export interface BackorderRule {
  /** null = never set anywhere: Nafaa does not manage the channel's setting. */
  enabled: boolean | null;
  /** Most units that may be owed at once; null = no limit. */
  max: number | null;
  leadDays: number | null;
  note: string | null;
}

/** Channel types that cannot sell at zero stock; they always get the true stock. */
export const NO_BACKORDER_CHANNELS = ['DARAZ'] as const;

export const supportsBackorder = (channelType: string) => !(NO_BACKORDER_CHANNELS as readonly string[]).includes(channelType);

const intOrNull = (v: unknown, min: number, max: number): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};

/** Cleans posted settings into column values (undefined = leave unchanged). */
export function cleanBackorderInput(b: { backorder?: unknown; max?: unknown; leadDays?: unknown; note?: unknown }) {
  const out: { backorder?: boolean | null; backorderMax?: number | null; backorderLeadDays?: number | null; backorderNote?: string | null } = {};
  if (b.backorder !== undefined) out.backorder = b.backorder === null ? null : b.backorder === true;
  if (b.max !== undefined) out.backorderMax = intOrNull(b.max, 1, 100_000);
  if (b.leadDays !== undefined) out.backorderLeadDays = intOrNull(b.leadDays, 1, 365);
  if (b.note !== undefined) out.backorderNote = typeof b.note === 'string' && b.note.trim() ? b.note.trim().slice(0, 120) : null;
  return out;
}

/** The rule in force for one product/size on one channel. */
export function backorderRule(product: BackorderSource, variant?: { backorder?: boolean | null } | null, link?: { backorder?: boolean | null } | null, channelType?: string): BackorderRule {
  const base = {
    max: product.backorderMax ?? null,
    leadDays: product.backorderLeadDays ?? null,
    note: product.backorderNote?.trim() || null,
  };
  if (channelType && !supportsBackorder(channelType)) return { enabled: false, ...base };
  const pick = (v: boolean | null | undefined) => (v === true || v === false ? v : undefined);
  const enabled = pick(link?.backorder) ?? pick(variant?.backorder) ?? pick(product.backorder) ?? null;
  return { enabled, ...base };
}

/** Units owed to customers: stock below zero. */
export function owedUnits(stock: number): number {
  const s = Number(stock) || 0;
  return s < 0 ? Math.round(-s * 10_000) / 10_000 : 0;
}

/** More units that may still be sold beyond the stock on hand. */
export function backorderRoom(stock: number, rule: Pick<BackorderRule, 'enabled' | 'max'>): number {
  if (rule.enabled !== true) return 0;
  if (rule.max === null) return Infinity;
  return Math.max(0, rule.max - owedUnits(stock));
}

/**
 * Lowest the branch stock may reach when an online order is accepted.
 * null = the normal rule (no going below zero unless the shop allows it).
 */
export function stockFloor(rule: Pick<BackorderRule, 'enabled' | 'max'>): number | null {
  if (rule.enabled !== true) return null;
  return rule.max === null ? -Infinity : -rule.max;
}

/** What a customer should see for a quantity on offer. */
export function availability(qty: number, rule: Pick<BackorderRule, 'enabled' | 'max'>, stock: number = qty): Availability {
  if (Number(qty) > 0) return 'in_stock';
  return backorderRoom(stock, rule) > 0 ? 'backorder' : 'out_of_stock';
}

/** Expected date for a backorder (YYYY-MM-DD), from the lead days. */
export function availabilityDate(leadDays: number | null, now: Date = new Date()): string | null {
  if (!leadDays || leadDays < 1) return null;
  const d = new Date(now.getTime() + leadDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Lead-time text for a customer: the owner's note, else "N din me" from the lead days. */
export function leadTimeText(rule: Pick<BackorderRule, 'leadDays' | 'note'>): string | null {
  if (rule.note) return rule.note;
  return rule.leadDays ? `${rule.leadDays} din me bhejenge` : null;
}

// ─── Channel settings ──────────────────────────────────────────

export type ShopifyPolicy = 'CONTINUE' | 'DENY';

/**
 * Shopify inventoryPolicy for a rule and stock. Undefined = not managed by
 * Nafaa (never set), so the store's own setting stays. When the most-owed
 * limit is reached the channel stops selling (DENY) until stock comes back.
 */
export function shopifyPolicy(rule: Pick<BackorderRule, 'enabled' | 'max'>, stock: number): ShopifyPolicy | undefined {
  if (rule.enabled === null) return undefined;
  return rule.enabled && (rule.max === null || backorderRoom(stock, rule) > 0) ? 'CONTINUE' : 'DENY';
}

/** WooCommerce `backorders` value for the same decision. */
export function wooBackorders(rule: Pick<BackorderRule, 'enabled' | 'max'>, stock: number): 'notify' | 'no' | undefined {
  const p = shopifyPolicy(rule, stock);
  return p === undefined ? undefined : p === 'CONTINUE' ? 'notify' : 'no';
}

/**
 * Shopify variant updates for the policy: only variants whose policy differs,
 * grouped by product (productVariantsBulkUpdate takes one product at a time).
 */
export function shopifyPolicyUpdates(
  variants: Array<{ id: string; productId: string | null; inventoryPolicy?: string | null }>,
  want: (variantGid: string) => ShopifyPolicy | undefined,
): Map<string, Array<{ id: string; inventoryPolicy: ShopifyPolicy }>> {
  const out = new Map<string, Array<{ id: string; inventoryPolicy: ShopifyPolicy }>>();
  for (const v of variants) {
    const w = want(v.id);
    if (!w || !v.productId || v.inventoryPolicy === w) continue;
    out.set(v.productId, [...(out.get(v.productId) ?? []), { id: v.id, inventoryPolicy: w }]);
  }
  return out;
}

/**
 * WooCommerce stock patch for one product or variation: the quantity (never
 * below zero), plus `backorders` when Nafaa manages it and it differs.
 * null = nothing to send.
 */
export function wooStockPatch(
  row: { id: number; stock: number | null; manage: boolean; backorders?: string | null },
  qty: number,
  backorders: 'notify' | 'no' | undefined,
): { id: number; manage_stock: true; stock_quantity: number; backorders?: 'notify' | 'no' } | null {
  const q = Math.max(0, Math.floor(Number(qty) || 0));
  // Woo's 'yes' (allow without a note) already sells at zero, so it counts as on.
  const current = row.backorders === 'yes' ? 'notify' : row.backorders;
  const policyChange = backorders !== undefined && current !== backorders;
  if (row.manage && row.stock === q && !policyChange) return null;
  return { id: row.id, manage_stock: true, stock_quantity: q, ...(policyChange ? { backorders } : {}) };
}
