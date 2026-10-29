/**
 * A price typed below the shop's own prices is a discount by another name.
 * This works out how much of a bill comes from such cuts, so the counter
 * rules (discount limit and PIN) apply to it as well.
 *
 * Prices the owner set are never counted as a cut: the product or variant
 * price, the wholesale price, any pack (unit) price and wholesale pack price
 * per base unit, a bulk tier that fits the quantity, a quotation line the
 * shop issued, and a combo the shop defined.
 *
 * A line sold at the wholesale or credit tier is measured against that
 * tier's prices instead (the tier price, or retail where the tier has none;
 * pack prices of the same tier; bulk, quotation and combo prices as above).
 * The tier price itself is never a cut, and a price typed below it is.
 *
 * With distribution on, the customer's price list and the running trade
 * schemes are owner-set prices too: a list price (any pack, per base unit),
 * that price after a scheme's rupees off, and free goods the bill's paid lines
 * have earned (a price-0 line noted "Scheme: …", up to the free quantity
 * earned) are not cuts. With distribution off nothing changes.
 */
import { Prisma } from '@prisma/client';
import type { PriceTier } from '../../../common/helpers/price-tier.helper';
import { ownerSetPrices, type GuardLine } from '../../distribution/helpers/pricing-loader';

type Db = Prisma.TransactionClient;

export interface PriceCutLine {
  productId: string;
  variantId?: string | null;
  quantity: number;
  /** Price sent by the counter, per base unit. */
  price: number;
  note?: string | null;
  /** Product and variant prices already loaded by the sale. */
  productPrice: number;
  productWholesale?: number | null;
  variantPrice?: number | null;
  variantWholesale?: number | null;
  productCredit?: number | null;
  variantCredit?: number | null;
  /**
   * Tier the line was sold at, when the counter may use it. Retail or absent
   * keeps the long-standing rule (any owner-set price is the floor).
   */
  tier?: PriceTier | null;
}

const isTierLine = (l: PriceCutLine) => l.tier === 'WHOLESALE' || l.tier === 'CREDIT';

/** The line's own tier price: variant, then product, then the plain price (same order the sale uses). */
function tierBase(l: PriceCutLine): number {
  const plain = l.variantPrice ?? l.productPrice;
  const pick = l.tier === 'WHOLESALE' ? [l.variantWholesale, l.productWholesale] : l.tier === 'CREDIT' ? [l.variantCredit, l.productCredit] : [];
  for (const v of pick) if (v != null && v > 0) return v;
  return plain;
}

const COMBO_NOTE = 'Combo: ';
/** Note on a free line given under a trade scheme. */
export const SCHEME_NOTE = 'Scheme: ';
const QUOTATION_NOTE = /^Quotation (\S+)/;
const EPS = 0.005;

/** Bill context for distribution prices; without it only the shop's own prices count. */
export interface PriceCutContext {
  customerId?: string | null;
  /** Every product line of the bill (base units, price per base unit), for schemes and free goods. */
  billLines?: GuardLine[];
  at?: Date;
}

/** Total rupees taken off the shop's own prices across the given lines. */
export async function priceCutTotal(db: Db, tenantId: string, lines: PriceCutLine[], ctx?: PriceCutContext): Promise<number> {
  // Only lines priced below the plain catalog price need a closer look.
  const below = lines.filter((l) => l.price + EPS < (isTierLine(l) ? tierBase(l) : (l.variantPrice ?? l.productPrice)));
  if (!below.length) return 0;

  const productIds = [...new Set(below.map((l) => l.productId))];
  const comboNames = [...new Set(below.filter((l) => (l.note ?? '').startsWith(COMBO_NOTE)).map((l) => l.note!.slice(COMBO_NOTE.length).trim()))];
  const quoteNumbers = [...new Set(below.map((l) => QUOTATION_NOTE.exec(l.note ?? '')?.[1]).filter(Boolean) as string[])];

  const [units, tiers, combos, quotes] = await Promise.all([
    db.productUnit.findMany({
      where: { tenantId, productId: { in: productIds }, isActive: true },
      select: { productId: true, variantId: true, conversionRate: true, price: true, wholesalePrice: true, creditPrice: true },
    }),
    db.hardwareBulkPricing.findMany({
      where: { tenantId, productId: { in: productIds }, isActive: true },
      select: { productId: true, minQuantity: true, maxQuantity: true, price: true },
    }),
    comboNames.length
      ? db.productCombo.findMany({
          where: { tenantId, name: { in: comboNames } },
          select: { name: true, items: { select: { productId: true } } },
        })
      : Promise.resolve([]),
    quoteNumbers.length
      ? db.hardwareQuotation.findMany({
          where: { tenantId, quotationNumber: { in: quoteNumbers } },
          select: { quotationNumber: true, items: { select: { productId: true, quantity: true, total: true, unitPrice: true } } },
        })
      : Promise.resolve([]),
  ]);

  const dist = ctx
    ? await ownerSetPrices(db, tenantId, {
        customerId: ctx.customerId, at: ctx.at, billLines: ctx.billLines,
        lines: below.map((l) => ({ productId: l.productId, variantId: l.variantId ?? null, quantity: l.quantity, price: l.price })),
      })
    : null;
  const freeLeft = new Map(dist?.freeAllowance ?? []);

  let cut = 0;
  for (const l of below) {
    const note = l.note ?? '';
    // A free line under a scheme, within what the bill's paid lines earned.
    if (dist && l.price < EPS && note.startsWith(SCHEME_NOTE)) {
      const left = freeLeft.get(l.productId) ?? 0;
      if (left + EPS >= l.quantity) { freeLeft.set(l.productId, left - l.quantity); continue; }
    }
    if (note.startsWith(COMBO_NOTE)) {
      const name = note.slice(COMBO_NOTE.length).trim();
      const combo = combos.find((c) => c.name === name);
      if (combo?.items.some((i) => i.productId === l.productId)) continue;
    }

    const tiered = isTierLine(l);
    const prices: number[] = [tiered ? tierBase(l) : (l.variantPrice ?? l.productPrice)];
    if (!tiered) for (const w of [l.variantWholesale, l.productWholesale]) if (w && w > 0) prices.push(w);
    for (const u of units) {
      if (u.productId !== l.productId || (u.variantId && u.variantId !== l.variantId)) continue;
      const rate = Number(u.conversionRate) || 1;
      if (tiered) {
        const own = l.tier === 'WHOLESALE' ? u.wholesalePrice : u.creditPrice;
        const pack = own && own > 0 ? own : u.price;
        if (pack > 0) prices.push(pack / rate);
        continue;
      }
      if (u.price > 0) prices.push(u.price / rate);
      if (u.wholesalePrice && u.wholesalePrice > 0) prices.push(u.wholesalePrice / rate);
    }
    for (const t of tiers) {
      if (t.productId !== l.productId) continue;
      if (l.quantity + EPS >= t.minQuantity && (!t.maxQuantity || l.quantity <= t.maxQuantity + EPS) && t.price > 0) prices.push(t.price);
    }
    const qn = QUOTATION_NOTE.exec(note)?.[1];
    if (qn) {
      for (const q of quotes.filter((x) => x.quotationNumber === qn)) {
        for (const i of q.items) {
          if (i.productId !== l.productId) continue;
          const each = i.quantity > 0 ? i.total / i.quantity : i.unitPrice;
          if (each > 0) prices.push(each);
        }
      }
    }

    if (dist) prices.push(...dist.listFloors({ productId: l.productId, variantId: l.variantId ?? null, quantity: l.quantity, price: l.price }));

    let floor = Math.min(...prices);
    if (dist) floor = dist.schemeFloor({ productId: l.productId, variantId: l.variantId ?? null, quantity: l.quantity, price: l.price }, floor);
    if (l.price + EPS < floor) cut += (floor - l.price) * l.quantity;
  }
  return Math.round(cut * 100) / 100;
}
