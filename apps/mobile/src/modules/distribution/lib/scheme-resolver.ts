/*
 * Copy of apps/api/src/modules/distribution/helpers/scheme-resolver.ts so the booker app
 * prices and warns offline exactly like the server. Keep the logic identical:
 * change the server file first, then copy it here.
 */

/**
 * Trade scheme resolver: works out which scheme applies to each order line
 * and what it gives (rupees off, free goods).
 *
 * One pure function serves every caller (office order desk, booker app,
 * POS price check and the discount guard in price-cut.helper), so a line is
 * priced the same everywhere. It has no Nest or Prisma imports on purpose:
 * the Expo booker app runs a copy of this file offline.
 *
 * Rules:
 * - A scheme applies when it is active, today is within its dates, the line's
 *   product matches (product, brand or category lists, any-of; all empty
 *   means every product), the customer's price list is listed (empty means
 *   every list) and the order reaches minOrderValue (order gross before
 *   schemes).
 * - Quantities are measured in the scheme's buy pack (`buyUnitName`, matched
 *   by name against the product's packs; base units when empty). A product
 *   without that pack does not qualify.
 * - FREE_QTY: every `buyQty` packs earn `freeQty` packs of the same product
 *   free, or `freeQty` base units of `freeProductId` when that is set.
 * - PERCENT_OFF: `value` percent off the line, from `buyQty` packs upward.
 * - AMOUNT_PER_UNIT: `value` rupees off per buy pack, from `buyQty` packs upward.
 * - SLAB: the highest slab reached (minQty in buy packs) gives a percent,
 *   rupees per buy pack, or a flat `freeQty` packs free.
 * - Mix schemes (`isMix`): the buy packs of every covered line on the order
 *   count together toward buyQty and the slabs ("any 10 cartons of the juice
 *   range"). Percent and rupees off apply to each covered line; free goods
 *   earned by the group go on the covered line with the most packs.
 * - One scheme per line: the one worth most (rupees off plus free goods at
 *   the line's price). Ties keep the earlier scheme in the list.
 * - Rupees off never exceed the line's gross.
 */

export type SchemeType = 'FREE_QTY' | 'PERCENT_OFF' | 'AMOUNT_PER_UNIT' | 'SLAB';
export const SCHEME_TYPES: SchemeType[] = ['FREE_QTY', 'PERCENT_OFF', 'AMOUNT_PER_UNIT', 'SLAB'];

export interface SchemeSlab {
  /** Buy packs needed for this slab. */
  minQty: number;
  percent?: number | null;
  amountPerUnit?: number | null;
  /** Flat packs free on reaching the slab. */
  freeQty?: number | null;
}

export interface SchemeRule {
  id: string;
  name: string;
  type: SchemeType | string;
  productIds?: string[] | null;
  brandIds?: string[] | null;
  categoryIds?: string[] | null;
  priceListIds?: string[] | null;
  buyQty?: number | null;
  buyUnitName?: string | null;
  freeQty?: number | null;
  freeProductId?: string | null;
  value?: number | null;
  slabs?: SchemeSlab[] | unknown | null;
  minOrderValue?: number | null;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  isActive?: boolean | null;
  /** Covered lines count together (see the rules above). */
  isMix?: boolean | null;
}

/** A mix scheme's group on one order: buy packs of all covered lines, and whether this line takes the free goods. */
export interface MixGroup {
  packs: number;
  anchor: boolean;
}

export interface SchemeLine {
  productId: string;
  brandId?: string | null;
  categoryId?: string | null;
  /** Quantity in base units. */
  baseQty: number;
  /** Price per base unit before any scheme. */
  unitPrice: number;
  /** Pack sizes of this product (base units per pack), keyed by unit name in any case. */
  packs?: Record<string, number> | null;
}

export interface SchemeContext {
  priceListId?: string | null;
  at?: Date;
  /** Price per base unit of other products given free, used only to pick the best scheme. */
  freePrices?: Record<string, number>;
  /** Order gross for minOrderValue, when only some of the order's lines are passed. */
  orderGross?: number;
}

export interface SchemeResult {
  schemeId: string | null;
  schemeName: string | null;
  /** Short text for the bill, e.g. "Pepsi 10+1: 2 Carton free". */
  note: string | null;
  /** Rupees off the line. */
  discount: number;
  /** Free goods in base units of `freeProductId` (this line's product when null). */
  freeBaseQty: number;
  freeProductId: string | null;
}

const EPS = 1e-9;
const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const r4 = (v: number) => Math.round((Number(v) || 0) * 10_000) / 10_000;
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export const NO_SCHEME: SchemeResult = { schemeId: null, schemeName: null, note: null, discount: 0, freeBaseQty: 0, freeProductId: null };

const toTime = (d: Date | string | null | undefined) => (d == null || d === '' ? null : new Date(d).getTime());

/** Whether the scheme runs at `at` (active flag and dates, both inclusive). */
export function schemeIsLive(s: SchemeRule, at: Date = new Date()): boolean {
  if (s.isActive === false) return false;
  const t = at.getTime();
  const from = toTime(s.startsAt);
  const to = toTime(s.endsAt);
  if (from != null && t < from) return false;
  if (to != null && t > to) return false;
  return true;
}

/** Whether the scheme covers this product and price list (dates and order value aside). */
export function schemeCovers(s: SchemeRule, line: Pick<SchemeLine, 'productId' | 'brandId' | 'categoryId'>, priceListId?: string | null): boolean {
  const lists = s.priceListIds ?? [];
  if (lists.length && (!priceListId || !lists.includes(priceListId))) return false;
  const p = s.productIds ?? [];
  const b = s.brandIds ?? [];
  const c = s.categoryIds ?? [];
  if (!p.length && !b.length && !c.length) return true;
  return p.includes(line.productId) || (!!line.brandId && b.includes(line.brandId)) || (!!line.categoryId && c.includes(line.categoryId));
}

/** Base units in the scheme's buy pack for this line; null when the product has no such pack. */
export function buyPackSize(s: SchemeRule, line: SchemeLine): number | null {
  const name = s.buyUnitName?.trim().toLowerCase();
  if (!name) return 1;
  for (const [k, v] of Object.entries(line.packs ?? {})) {
    if (k.trim().toLowerCase() === name && num(v) > 0) return num(v);
  }
  return null;
}

function slabsOf(s: SchemeRule): SchemeSlab[] {
  if (!Array.isArray(s.slabs)) return [];
  return (s.slabs as SchemeSlab[])
    .filter((x) => x && num(x.minQty) > 0)
    .sort((a, b) => num(b.minQty) - num(a.minQty));
}

const packLabel = (s: SchemeRule) => s.buyUnitName?.trim() || 'pcs';
const qtyText = (v: number) => String(r4(v));

/**
 * What one scheme gives one line, or null when it does not qualify. A mix
 * scheme passes its `group`: the group's packs decide the threshold and the
 * slab; the line's own packs size the rupees off.
 */
export function evaluateScheme(s: SchemeRule, line: SchemeLine, group?: MixGroup | null): SchemeResult | null {
  const rate = buyPackSize(s, line);
  if (rate == null || !(line.baseQty > 0)) return null;
  const own = line.baseQty / rate;
  const mix = !!s.isMix && !!group;
  const packs = mix ? group!.packs : own;
  const takesFree = !mix || group!.anchor;
  const gross = r2(line.baseQty * line.unitPrice);
  const buy = Math.max(0, num(s.buyQty));
  const base = { schemeId: s.id, schemeName: s.name, freeProductId: null as string | null };
  const otherFree = s.freeProductId && s.freeProductId !== line.productId ? s.freeProductId : null;

  switch (s.type) {
    case 'FREE_QTY': {
      const free = num(s.freeQty);
      if (!(buy > 0) || !(free > 0)) return null;
      const times = Math.floor(packs / buy + EPS);
      if (times < 1 || !takesFree) return null;
      const freeBase = otherFree ? r4(times * free) : r4(times * free * rate);
      const note = `${s.name}: ${qtyText(times * free)}${otherFree ? '' : ` ${packLabel(s)}`} free`;
      return { ...base, note, discount: 0, freeBaseQty: freeBase, freeProductId: otherFree };
    }
    case 'PERCENT_OFF': {
      const pct = Math.min(100, Math.max(0, num(s.value)));
      if (!(pct > 0) || packs + EPS < buy) return null;
      return { ...base, note: `${s.name}: ${qtyText(pct)}% off`, discount: Math.min(gross, r2((gross * pct) / 100)), freeBaseQty: 0 };
    }
    case 'AMOUNT_PER_UNIT': {
      const each = Math.max(0, num(s.value));
      if (!(each > 0) || packs + EPS < buy) return null;
      return { ...base, note: `${s.name}: Rs ${qtyText(each)}/${packLabel(s)} off`, discount: Math.min(gross, r2(each * own)), freeBaseQty: 0 };
    }
    case 'SLAB': {
      const slab = slabsOf(s).find((x) => packs + EPS >= num(x.minQty));
      if (!slab) return null;
      if (num(slab.percent) > 0) {
        const pct = Math.min(100, num(slab.percent));
        return { ...base, note: `${s.name}: ${qtyText(pct)}% off`, discount: Math.min(gross, r2((gross * pct) / 100)), freeBaseQty: 0 };
      }
      if (num(slab.amountPerUnit) > 0) {
        const each = num(slab.amountPerUnit);
        return { ...base, note: `${s.name}: Rs ${qtyText(each)}/${packLabel(s)} off`, discount: Math.min(gross, r2(each * own)), freeBaseQty: 0 };
      }
      if (num(slab.freeQty) > 0 && takesFree) {
        const free = num(slab.freeQty);
        const freeBase = otherFree ? r4(free) : r4(free * rate);
        return { ...base, note: `${s.name}: ${qtyText(free)}${otherFree ? '' : ` ${packLabel(s)}`} free`, discount: 0, freeBaseQty: freeBase, freeProductId: otherFree };
      }
      return null;
    }
    default:
      return null;
  }
}

/** Rupee worth of a result, to compare schemes. */
function worth(res: SchemeResult, line: SchemeLine, ctx: SchemeContext): number {
  const freePrice = res.freeProductId ? num(ctx.freePrices?.[res.freeProductId]) : line.unitPrice;
  return res.discount + res.freeBaseQty * freePrice;
}

/**
 * For each mix scheme: buy packs of all lines it covers, and the line (index)
 * with the most packs, which takes the group's free goods. Ties keep the
 * earlier line.
 */
export function mixGroups(lines: SchemeLine[], schemes: SchemeRule[], priceListId?: string | null): Map<string, { packs: number; anchor: number }> {
  const out = new Map<string, { packs: number; anchor: number }>();
  for (const s of schemes) {
    if (!s.isMix) continue;
    let packs = 0;
    let anchor = -1;
    let most = 0;
    lines.forEach((line, i) => {
      if (!(line.baseQty > 0) || !schemeCovers(s, line, priceListId)) return;
      const rate = buyPackSize(s, line);
      if (rate == null) return;
      const p = line.baseQty / rate;
      packs += p;
      if (p > most + EPS) { most = p; anchor = i; }
    });
    if (anchor >= 0) out.set(s.id, { packs: r4(packs), anchor });
  }
  return out;
}

/**
 * Best scheme for each line, in the order given. Lines no scheme covers get
 * NO_SCHEME. `schemes` may hold every scheme of the business; this filters them.
 */
export function applySchemes(lines: SchemeLine[], schemes: SchemeRule[], ctx: SchemeContext = {}): SchemeResult[] {
  const at = ctx.at ?? new Date();
  const orderGross = ctx.orderGross ?? lines.reduce((s, l) => s + Math.max(0, l.baseQty) * Math.max(0, l.unitPrice), 0);
  const live = schemes.filter((s) => schemeIsLive(s, at) && !(num(s.minOrderValue) > 0 && orderGross + 0.005 < num(s.minOrderValue)));
  const groups = mixGroups(lines, live, ctx.priceListId);
  return lines.map((line, i) => {
    let best: SchemeResult | null = null;
    let bestWorth = 0;
    for (const s of live) {
      if (!schemeCovers(s, line, ctx.priceListId)) continue;
      const g = s.isMix ? groups.get(s.id) : null;
      const res = evaluateScheme(s, line, g ? { packs: g.packs, anchor: g.anchor === i } : null);
      if (!res) continue;
      const w = worth(res, line, ctx);
      if (!best || w > bestWorth + 0.0001) { best = res; bestWorth = w; }
    }
    return best ?? { ...NO_SCHEME };
  });
}

/**
 * Free goods a bill has earned per product (base units), from its paid lines.
 * Used to check free lines typed at the counter.
 */
export function earnedFreeByProduct(lines: SchemeLine[], schemes: SchemeRule[], ctx: SchemeContext = {}): Map<string, number> {
  const out = new Map<string, number>();
  applySchemes(lines, schemes, ctx).forEach((res, i) => {
    if (!(res.freeBaseQty > 0)) return;
    const pid = res.freeProductId ?? lines[i].productId;
    out.set(pid, r4((out.get(pid) ?? 0) + res.freeBaseQty));
  });
  return out;
}
