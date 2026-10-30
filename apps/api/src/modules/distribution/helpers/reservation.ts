/**
 * Godown stock held for approved orders that are not invoiced yet (a PIN is
 * still needed, stock was short, the godown was missing). The hold sits in
 * ShopStock.reserved, which the counter and every invoice already treat as
 * not free to sell, so the desk and the POS cannot sell the same goods twice.
 *
 * What an order holds is written on the order (SalesOrder.reservation), so
 * releasing gives back exactly that, never more. Only stock that is free at
 * the time is held: an order never pushes another order's hold out.
 */

import { Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;

export interface Hold {
  shopId: string;
  productId: string;
  variantId: string | null;
  qty: number;
}

const r4 = (v: number) => Math.round((Number(v) || 0) * 10_000) / 10_000;

interface ReservableOrder {
  id: string;
  shopId: string | null;
  reservation?: Prisma.JsonValue | null;
  items: Array<{ productId: string; variantId: string | null; baseQty: number; freeBaseQty: number; freeProductId: string | null }>;
}

/** Base units an order takes out of stock, per product and variant (paid and free goods). */
export function orderNeeds(items: ReservableOrder['items']): Map<string, { productId: string; variantId: string | null; qty: number }> {
  const out = new Map<string, { productId: string; variantId: string | null; qty: number }>();
  const add = (productId: string, variantId: string | null, qty: number) => {
    if (!(qty > 0)) return;
    const k = `${productId}:${variantId ?? ''}`;
    const e = out.get(k) ?? { productId, variantId, qty: 0 };
    e.qty = r4(e.qty + qty);
    out.set(k, e);
  };
  for (const it of items) {
    add(it.productId, it.variantId, it.baseQty);
    const own = !it.freeProductId || it.freeProductId === it.productId;
    add(it.freeProductId ?? it.productId, own ? it.variantId : null, it.freeBaseQty);
  }
  return out;
}

export function holdsOf(order: { reservation?: Prisma.JsonValue | null }): Hold[] {
  return Array.isArray(order.reservation) ? (order.reservation as unknown as Hold[]).filter((h) => h && h.qty > 0) : [];
}

/** Holds what is free of the order's goods in its godown. Does nothing when it already holds stock. */
export async function reserveOrder(tx: Db, tenantId: string, order: ReservableOrder): Promise<Hold[]> {
  if (!order.shopId || holdsOf(order).length) return holdsOf(order);
  const holds: Hold[] = [];
  for (const need of orderNeeds(order.items).values()) {
    const row = await tx.shopStock.findFirst({
      where: { tenantId, shopId: order.shopId, productId: need.productId, variantId: need.variantId },
      select: { id: true, stock: true, reserved: true },
    });
    if (!row) continue;
    const free = Number(row.stock) - Math.max(Number(row.reserved) || 0, 0);
    const take = r4(Math.min(need.qty, Math.max(0, free)));
    if (!(take > 0)) continue;
    // Only while that much is still free (another hold may have landed meanwhile).
    const done = await tx.shopStock.updateMany({
      where: { id: row.id, reserved: { lte: Number(row.stock) - take + 0.0001 } },
      data: { reserved: { increment: take } },
    });
    if (done.count) holds.push({ shopId: order.shopId, productId: need.productId, variantId: need.variantId, qty: take });
  }
  await tx.salesOrder.update({
    where: { id: order.id },
    data: { reservation: holds.length ? (holds as unknown as Prisma.InputJsonValue) : Prisma.DbNull, reservedAt: holds.length ? new Date() : null },
  });
  return holds;
}

/** Gives back what the order holds. Safe to call on an order that holds nothing. */
export async function releaseOrder(tx: Db, tenantId: string, order: { id: string; reservation?: Prisma.JsonValue | null }): Promise<void> {
  const holds = holdsOf(order);
  if (!holds.length) return;
  // Clear the order first, so two releases racing give the stock back once.
  const claimed = await tx.salesOrder.updateMany({
    where: { id: order.id, reservedAt: { not: null } },
    data: { reservation: Prisma.DbNull, reservedAt: null },
  });
  if (!claimed.count) return;
  for (const h of holds) {
    const row = await tx.shopStock.findFirst({ where: { tenantId, shopId: h.shopId, productId: h.productId, variantId: h.variantId }, select: { id: true } });
    if (!row) continue;
    const back = await tx.shopStock.updateMany({ where: { id: row.id, reserved: { gte: h.qty - 0.0001 } }, data: { reserved: { decrement: h.qty } } });
    if (!back.count) await tx.shopStock.update({ where: { id: row.id }, data: { reserved: 0 } });
  }
}
