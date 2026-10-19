/**
 * Shared pieces of the mobile shop module: branch stock kept equal to the
 * phones on the shelf, warranty dates, and document numbers.
 */

import { BadRequestException } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { applyStockDelta, readShopStock } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

type Db = Prisma.TransactionClient;

/** A phone counts as stock only while it is IN_STOCK in a branch. */
export interface ImeiStockSync {
  productId: string;
  variantId?: string | null;
  /** Branches whose count may have changed. */
  shopIds: Array<string | null | undefined>;
  reference?: string | null;
  note: string;
  /** Movement type for stock leaving the shelf; ADJUSTMENT_OUT when left out. */
  outType?: StockMovementType;
  /** Movement type for stock arriving; ADJUSTMENT_IN when left out. */
  inType?: StockMovementType;
  /** Cost of one unit on the movement (the phone's own cost). */
  unitCost?: number | null;
}

/**
 * Moves each branch's stock to the number of IN_STOCK phones there, through
 * applyStockDelta so every change leaves a stock movement and the product and
 * variant totals stay derived from the branch rows.
 */
export async function syncImeiStock(tx: Db, user: AuthenticatedUser, input: ImeiStockSync) {
  const variantId = input.variantId ?? null;
  const shops = [...new Set(input.shopIds.filter((s): s is string => !!s))];
  for (const shopId of shops) {
    const onShelf = await tx.productImei.count({
      where: { tenantId: user.tenantId, productId: input.productId, shopId, status: 'IN_STOCK', variantId },
    });
    const current = await readShopStock(tx, shopId, input.productId, variantId);
    const delta = onShelf - current;
    if (Math.abs(delta) < 0.0001) continue;
    await applyStockDelta({
      tx,
      tenantId: user.tenantId,
      shopId,
      productId: input.productId,
      variantId,
      delta,
      movementType: delta > 0 ? (input.inType ?? 'ADJUSTMENT_IN') : (input.outType ?? 'ADJUSTMENT_OUT'),
      reference: input.reference ?? null,
      note: input.note,
      userId: user.id,
      unitCost: input.unitCost ?? null,
      batchMode: 'none',
    });
  }
}

/** Adds calendar months; the 31st becomes the last day of a shorter month. */
export function addMonthsClamped(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

/** Whole days from now until `end` (negative once it has passed). */
export function daysUntil(end: Date, now = new Date()): number {
  return Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
}

/** IMEIs are 15 digits; the last one is a Luhn check digit. */
export function isLuhnValid(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let n = Number(imei[14 - i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}

/** Pakistani CNIC: 13 digits, dashes allowed (35202-1234567-1). Returns the digits. */
export function normaliseCnic(value?: string | null): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  const digits = raw.replace(/-/g, '');
  if (!/^\d{13}$/.test(digits)) throw new BadRequestException('CNIC me 13 number hote hain (35202-1234567-1)');
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

/** The branch must belong to this business. */
export async function assertOwnShop(db: Db | Prisma.TransactionClient, user: AuthenticatedUser, shopId?: string | null) {
  if (!shopId) return;
  const shop = await db.shop.findFirst({ where: { id: shopId, tenantId: user.tenantId }, select: { id: true } });
  if (!shop) throw new BadRequestException('Shop nahi mili');
}

/** The customer must belong to this business. */
export async function assertOwnCustomer(db: Db | Prisma.TransactionClient, user: AuthenticatedUser, customerId?: string | null) {
  if (!customerId) return;
  const c = await db.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true } });
  if (!c) throw new BadRequestException('Customer nahi mila');
}
