/**
 * A price typed below the shop's own prices is a discount by another name.
 * This works out how much of a bill comes from such cuts, so the counter
 * rules (discount limit and PIN) apply to it as well.
 *
 * Prices the owner set are never counted as a cut: the product or variant
 * price, the wholesale price, any pack (unit) price and wholesale pack price
 * per base unit, a bulk tier that fits the quantity, a quotation line the
 * shop issued, and a combo the shop defined.
 */
import { Prisma } from '@prisma/client';

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
}

const COMBO_NOTE = 'Combo: ';
const QUOTATION_NOTE = /^Quotation (\S+)/;
const EPS = 0.005;

/** Total rupees taken off the shop's own prices across the given lines. */
export async function priceCutTotal(db: Db, tenantId: string, lines: PriceCutLine[]): Promise<number> {
  // Only lines priced below the plain catalog price need a closer look.
  const below = lines.filter((l) => l.price + EPS < (l.variantPrice ?? l.productPrice));
  if (!below.length) return 0;

  const productIds = [...new Set(below.map((l) => l.productId))];
  const comboNames = [...new Set(below.filter((l) => (l.note ?? '').startsWith(COMBO_NOTE)).map((l) => l.note!.slice(COMBO_NOTE.length).trim()))];
  const quoteNumbers = [...new Set(below.map((l) => QUOTATION_NOTE.exec(l.note ?? '')?.[1]).filter(Boolean) as string[])];

  const [units, tiers, combos, quotes] = await Promise.all([
    db.productUnit.findMany({
      where: { tenantId, productId: { in: productIds }, isActive: true },
      select: { productId: true, variantId: true, conversionRate: true, price: true, wholesalePrice: true },
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

    const prices: number[] = [l.variantPrice ?? l.productPrice];
    for (const w of [l.variantWholesale, l.productWholesale]) if (w && w > 0) prices.push(w);
    for (const u of units) {
      if (u.productId !== l.productId || (u.variantId && u.variantId !== l.variantId)) continue;
      const rate = Number(u.conversionRate) || 1;
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
