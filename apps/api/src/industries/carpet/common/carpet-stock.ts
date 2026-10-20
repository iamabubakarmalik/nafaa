/**
 * Carpet stock rules shared by rolls, cut pieces and bill settlement.
 *
 * Carpet stock lives in rolls (length left on a fixed width) and cut pieces
 * (remnants, returns). The product's shelf stock is only a mirror: active
 * rolls plus available pieces in that branch, in the product's unit (area or
 * running length), rewritten after every change so the products page, POS
 * and stock reports agree.
 */

import { Prisma } from '@prisma/client';
import { DEFAULT_TZ, tzParts } from '../../../common/helpers/business-time.helper';

type Db = Prisma.TransactionClient;

export const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Feet plus inches as decimal feet. */
export const realFt = (ft: number, inch = 0) => Number(ft || 0) + Number(inch || 0) / 12;

/** Decimal feet split back into whole feet and inches (2 decimals). */
export function splitFt(real: number): { ft: number; inch: number } {
  const safe = Math.max(real, 0);
  let ft = Math.floor(safe + 1e-9);
  let inch = Math.round((safe - ft) * 12 * 100) / 100;
  if (inch >= 12) { ft += 1; inch = 0; }
  return { ft, inch };
}

/** Units a product can be cut from rolls in: area, or running length. */
export const ROLL_UNITS = ['sqft', 'sqm', 'sqyd', 'ft', 'm'];

/** Roll stock (sqft, and running feet) expressed in the product's selling unit. */
export function inProductUnit(unit: string | null | undefined, sqft: number, runningFt: number): number {
  switch ((unit ?? '').toLowerCase()) {
    case 'sqm': return sqft * 0.092903;
    case 'sqyd': return sqft / 9;
    case 'ft': return runningFt;
    case 'm': return runningFt * 0.3048;
    default: return sqft;
  }
}

export function calcSqft(widthFt: number, widthInch: number, lengthFt: number, lengthInch = 0): number {
  return r2(realFt(widthFt, widthInch) * realFt(lengthFt, lengthInch));
}

/** Year in the shop's time zone, for roll and piece codes (CR-2026-0007). */
export const codeYear = () => tzParts(new Date(), DEFAULT_TZ).year;

/**
 * Rewrites shelf stock for one product (and variant) in one branch from its
 * active rolls and available pieces, then the product and variant totals
 * across branches.
 */
export async function syncCarpetStock(
  tx: Db,
  tenantId: string,
  shopId: string | null,
  productId: string,
  variantId: string | null,
): Promise<void> {
  if (!shopId) return;
  const [product, rolls, pieces] = await Promise.all([
    tx.product.findUnique({ where: { id: productId }, select: { unit: true } }),
    tx.carpetRoll.aggregate({
      where: { tenantId, shopId, productId, variantId, status: 'ACTIVE', remainingSqft: { gt: 0 } },
      _sum: { remainingSqft: true, remainingLengthFt: true, remainingLengthInch: true },
    }),
    tx.carpetCutPiece.aggregate({
      where: { tenantId, shopId, productId, variantId, status: 'AVAILABLE' },
      _sum: { totalSqft: true, lengthFt: true, lengthInch: true },
    }),
  ]);
  const sqft = Number(rolls._sum.remainingSqft ?? 0) + Number(pieces._sum.totalSqft ?? 0);
  const runningFt = realFt(Number(rolls._sum.remainingLengthFt ?? 0), Number(rolls._sum.remainingLengthInch ?? 0))
    + realFt(Number(pieces._sum.lengthFt ?? 0), Number(pieces._sum.lengthInch ?? 0));
  const total = r2(inProductUnit(product?.unit, sqft, runningFt));

  const existing = await tx.shopStock.findFirst({ where: { shopId, productId, variantId: variantId ?? null } });
  if (existing) await tx.shopStock.update({ where: { id: existing.id }, data: { stock: total } });
  else if (total > 0) await tx.shopStock.create({ data: { tenantId, shopId, productId, variantId, stock: total, isActive: true } });

  if (variantId) {
    const v = await tx.shopStock.aggregate({ where: { tenantId, productId, variantId }, _sum: { stock: true } });
    await tx.productVariant.update({ where: { id: variantId }, data: { stock: r2(Number(v._sum.stock ?? 0)) } });
  }
  // The product total covers every variant in every branch.
  const sum = await tx.shopStock.aggregate({ where: { tenantId, productId }, _sum: { stock: true } });
  await tx.product.update({ where: { id: productId }, data: { stock: r2(Number(sum._sum.stock ?? 0)) } });
}

/** A roll cut or a piece sale, read back from the bill line note the POS writes. */
export type CarpetLine =
  | { kind: 'roll'; rollNumber: string; widthReal: number; lengthFt: number; lengthInch: number; keepLeftover: boolean }
  | { kind: 'piece'; pieceCode: string };

/** Marker in the note when the strip left beside the cut is waste. */
export const NO_LEFTOVER = 'bacha tukra waste';

const DIM = String.raw`(\d+(?:\.\d+)?)\s*ft(?:\s+(\d+(?:\.\d+)?)\s*in)?`;
const ROLL_NOTE = new RegExp(String.raw`^Cut from (.+?):\s*${DIM}\s*[xX×]\s*${DIM}`);
const PIECE_NOTE = /^Cut piece (\S+)/;

export function parseCarpetNote(note?: string | null): CarpetLine | null {
  const n = (note ?? '').trim();
  const roll = ROLL_NOTE.exec(n);
  if (roll) {
    return {
      kind: 'roll',
      rollNumber: roll[1].trim(),
      widthReal: realFt(Number(roll[2]), Number(roll[3] ?? 0)),
      lengthFt: Number(roll[4]),
      lengthInch: Number(roll[5] ?? 0),
      keepLeftover: !n.includes(NO_LEFTOVER),
    };
  }
  const piece = PIECE_NOTE.exec(n);
  return piece ? { kind: 'piece', pieceCode: piece[1] } : null;
}
