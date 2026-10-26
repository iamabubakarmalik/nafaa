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
 */
import { Prisma } from '@prisma/client';
import type { PriceTier } from '../../../common/helpers/price-tier.helper';

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
const QUOTATION_NOTE = /^Quotation (\S+)/;
const EPS = 0.005;

/** Total rupees taken off the shop's own prices across the given lines. */
export async function priceCutTotal(db: Db, tenantId: string, lines: PriceCutLine[]): Promise<number> {
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

  let cut = 0;
  for (const l of below) {
    const note = l.note ?? '';
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

    const floor = Math.min(...prices);
    if (l.price + EPS < floor) cut += (floor - l.price) * l.quantity;
  }
  return Math.round(cut * 100) / 100;
}
