/**
 * Which sale lines are carpet lines. Carpet stock lives in rolls and cut
 * pieces, so these lines only leave an audit row on the bill; the roll cut or
 * the piece sale moves the stock.
 *
 * Square-foot units alone do not make a carpet line: tiles, glass, marble and
 * panels are sold in sqft and must use normal shelf stock.
 */
import { Prisma } from '@prisma/client';

const AREA_UNITS = new Set(['sqft', 'sqm', 'sqyd']);

/** Note written by the carpet POS for a roll cut or a cut-piece sale. */
export function hasCarpetNote(note?: string | null): boolean {
  const n = note ?? '';
  return n.startsWith('Cut from ') || n.startsWith('Cut piece ');
}

/** Carpet and flooring shops, by the tenant's business type. */
export function isCarpetBusiness(businessType?: string | null): boolean {
  const bt = (businessType ?? '').toUpperCase();
  return bt.includes('CARPET') || bt.includes('FLOORING');
}

/** A line is a carpet line when it carries a carpet note, or an area unit in a carpet shop. */
export function isCarpetLine(note: string | null | undefined, unit: string | null | undefined, carpetShop: boolean): boolean {
  return hasCarpetNote(note) || (carpetShop && AREA_UNITS.has((unit ?? '').toLowerCase()));
}

/** Start of the audit-only SALE_OUT note written for carpet lines. */
export const CARPET_SALE_NOTE = 'Carpet sale at ';

/**
 * Products on this bill whose sale took no shelf stock (the audit-only
 * carpet row). Older bills treated every sqft product this way, so a return
 * or void of such a line must not add stock back.
 */
export async function productsSoldWithoutStock(
  db: Prisma.TransactionClient,
  tenantId: string,
  saleNumber: string,
): Promise<Set<string>> {
  const rows = await db.stockMovement.findMany({
    where: { tenantId, reference: saleNumber, type: 'SALE_OUT' },
    select: { productId: true, note: true },
  });
  const auditOnly = new Set<string>();
  const tookStock = new Set<string>();
  for (const r of rows) {
    if ((r.note ?? '').startsWith(CARPET_SALE_NOTE)) auditOnly.add(r.productId);
    else tookStock.add(r.productId);
  }
  // A product that also has a real stock row on the bill is left to the normal path.
  for (const id of tookStock) auditOnly.delete(id);
  return auditOnly;
}

/** Products that took shelf stock on this bill (a real SALE_OUT row, not a carpet audit row). */
export async function productsThatTookStock(
  db: Prisma.TransactionClient,
  tenantId: string,
  saleNumber: string,
): Promise<Set<string>> {
  const rows = await db.stockMovement.findMany({
    where: { tenantId, reference: saleNumber, type: 'SALE_OUT' },
    select: { productId: true, note: true },
  });
  return new Set(rows.filter((r) => !(r.note ?? '').startsWith(CARPET_SALE_NOTE)).map((r) => r.productId));
}
