/**
 * Pieces held for customers (holds and instalment plans) are counted in
 * `ShopStock.reserved` per branch, product and size/colour. The stock
 * itself does not move until the bill is made; available to sell is
 * stock − reserved.
 *
 * `reserved` is always worked out again from the open records (an active
 * hold not yet past its date, an active plan with a product, one piece
 * each), never added to or taken from. Records saved before this column
 * existed are therefore counted the first time their item is touched, and
 * the sweep puts every item right within minutes. Records without a branch
 * count in the shop's main branch.
 */

import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type Db = Prisma.TransactionClient;

export interface HoldKey {
  tenantId: string;
  shopId: string;
  productId: string;
  variantId: string | null;
}

/** Records to leave out of the count (one about to be billed). */
interface HoldExcept {
  reservationId?: string;
  planId?: string;
}

/** The branch where records saved without one are held. */
async function holdShopId(db: Db, tenantId: string, shopId?: string | null): Promise<string | null> {
  if (shopId) return shopId;
  const main = await db.shop.findFirst({
    where: { tenantId, isActive: true },
    orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
    select: { id: true },
  });
  return main?.id ?? null;
}

/**
 * Recounts the pieces held for one item in one branch and saves the
 * number. Run inside the transaction that changes a hold or plan: the
 * branch row is locked first, so two counters saving at once both count.
 */
export async function syncReserved(db: Db, key: HoldKey, except: HoldExcept = {}): Promise<{ stock: number; reserved: number }> {
  const { tenantId, shopId, productId, variantId } = key;
  const row = await db.shopStock.findFirst({ where: { shopId, productId, variantId }, select: { id: true } });
  if (row) await db.$queryRaw`SELECT id FROM "ShopStock" WHERE id = ${row.id} FOR UPDATE`;

  const main = await holdShopId(db, tenantId, null);
  const inShop = main === shopId ? { OR: [{ shopId }, { shopId: null }] } : { shopId };
  const [holds, plans] = await Promise.all([
    db.garmentReservation.aggregate({
      where: {
        tenantId, productId, variantId, status: 'ACTIVE', expiresAt: { gt: new Date() }, ...inShop,
        ...(except.reservationId && { id: { not: except.reservationId } }),
      },
      _sum: { quantity: true },
    }),
    db.garmentLayawayPlan.count({
      where: { tenantId, productId, variantId, status: 'ACTIVE', ...inShop, ...(except.planId && { id: { not: except.planId } }) },
    }),
  ]);
  const reserved = Number(holds._sum.quantity ?? 0) + plans;

  if (row) {
    const now = await db.shopStock.update({ where: { id: row.id }, data: { reserved }, select: { stock: true } });
    return { stock: Number(now.stock), reserved };
  }
  if (reserved > 0) {
    // Held before any stock reached this branch: the row starts at zero stock.
    const src = variantId
      ? await db.productVariant.findUnique({ where: { id: variantId }, select: { lowStockAlert: true } })
      : await db.product.findUnique({ where: { id: productId }, select: { lowStockAlert: true } });
    await db.shopStock.create({
      data: {
        tenantId, shopId, productId, variantId, stock: 0, reserved, isActive: true,
        ...(src?.lowStockAlert != null && { lowStockAlert: Number(src.lowStockAlert) }),
      },
    });
  }
  return { stock: 0, reserved };
}

/** Refuses when the branch has fewer free pieces (stock − held) than wanted. */
export async function requireFree(db: Db, key: HoldKey, quantity: number, except: HoldExcept = {}) {
  const { stock, reserved } = await syncReserved(db, key, except);
  const free = stock - reserved;
  if (free < quantity) {
    throw new BadRequestException(`Is branch me ${Math.max(free, 0)} hi khaali hain${reserved ? ` (${reserved} pehle se hold ya qist par)` : ''}`);
  }
}

/** The hold key of a record, or null when it holds no product or the shop has no branch. */
export async function keyOf(
  db: Db,
  r: { tenantId: string; shopId: string | null; productId: string | null; variantId: string | null },
): Promise<HoldKey | null> {
  if (!r.productId) return null;
  const shopId = await holdShopId(db, r.tenantId, r.shopId);
  return shopId ? { tenantId: r.tenantId, shopId, productId: r.productId, variantId: r.variantId ?? null } : null;
}

/** Recounts one record's item in its own transaction (after a status change saved elsewhere). */
export async function resyncRecord(
  prisma: PrismaService,
  r: { tenantId: string; shopId: string | null; productId: string | null; variantId: string | null },
  except: HoldExcept = {},
) {
  const key = await keyOf(prisma as unknown as Db, r);
  if (key) await prisma.$transaction((tx) => syncReserved(tx, key, except));
}

/**
 * Marks holds past their date as expired and puts `reserved` right for
 * every item of the shops that use holds or plans (all of them, or one
 * tenant). Returns how many items were corrected.
 */
export async function sweepHeld(
  prisma: PrismaService,
  tenantId?: string,
): Promise<{ expired: number; fixed: number }> {
  const now = new Date();
  const scope = tenantId ? { tenantId } : {};
  const expired = await prisma.garmentReservation.updateMany({ where: { ...scope, status: 'ACTIVE', expiresAt: { lte: now } }, data: { status: 'EXPIRED' } });

  const [holds, plans, holdTenants, planTenants] = await Promise.all([
    prisma.garmentReservation.groupBy({
      by: ['tenantId', 'shopId', 'productId', 'variantId'],
      where: { ...scope, status: 'ACTIVE', expiresAt: { gt: now } },
      _sum: { quantity: true },
    }),
    prisma.garmentLayawayPlan.groupBy({
      by: ['tenantId', 'shopId', 'productId', 'variantId'],
      where: { ...scope, status: 'ACTIVE', productId: { not: null } },
      _count: { _all: true },
    }),
    prisma.garmentReservation.findMany({ where: scope, distinct: ['tenantId'], select: { tenantId: true } }),
    prisma.garmentLayawayPlan.findMany({ where: { ...scope, productId: { not: null } }, distinct: ['tenantId'], select: { tenantId: true } }),
  ]);
  const tenants = [...new Set([...holdTenants, ...planTenants].map((t) => t.tenantId))];
  if (!tenants.length) return { expired: expired.count, fixed: 0 };

  const mainOf = new Map<string, string | null>();
  for (const t of tenants) mainOf.set(t, await holdShopId(prisma as unknown as Db, t, null));
  const id = (k: HoldKey) => `${k.tenantId}|${k.shopId}|${k.productId}|${k.variantId ?? ''}`;
  const want = new Map<string, { key: HoldKey; qty: number }>();
  const add = (r: { tenantId: string; shopId: string | null; productId: string | null; variantId: string | null }, qty: number) => {
    const shopId = r.shopId ?? mainOf.get(r.tenantId);
    if (!shopId || !r.productId) return;
    const key = { tenantId: r.tenantId, shopId, productId: r.productId, variantId: r.variantId ?? null };
    const cur = want.get(id(key));
    want.set(id(key), { key, qty: (cur?.qty ?? 0) + qty });
  };
  for (const h of holds) add(h, Number(h._sum.quantity ?? 0));
  for (const p of plans) add(p, p._count._all);

  const rows = await prisma.shopStock.findMany({
    where: { tenantId: { in: tenants }, OR: [{ reserved: { not: 0 } }, ...[...want.values()].map((w) => ({ shopId: w.key.shopId, productId: w.key.productId, variantId: w.key.variantId }))] },
    select: { tenantId: true, shopId: true, productId: true, variantId: true, reserved: true },
  });
  const have = new Map(rows.map((r) => [id({ ...r, variantId: r.variantId ?? null }), Number(r.reserved)]));

  const wrong = new Map<string, HoldKey>();
  for (const [k, w] of want) if (Math.abs((have.get(k) ?? 0) - w.qty) > 1e-6) wrong.set(k, w.key);
  for (const r of rows) {
    const k = id({ ...r, variantId: r.variantId ?? null });
    if (!want.has(k) && Number(r.reserved) !== 0) wrong.set(k, { tenantId: r.tenantId, shopId: r.shopId, productId: r.productId, variantId: r.variantId ?? null });
  }
  for (const key of wrong.values()) await prisma.$transaction((tx) => syncReserved(tx, key));
  return { expired: expired.count, fixed: wrong.size };
}
