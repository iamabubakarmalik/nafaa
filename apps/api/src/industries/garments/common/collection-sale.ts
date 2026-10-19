/**
 * Collection sales: a percent taken off the price of every product of a
 * collection and of each of its sizes/colours. The price before the sale
 * is kept on the garment profile (`regularPrice`), so ending the sale puts
 * it back exactly and a new percent is always worked out from it, never
 * from an already lowered price. A price changed by hand while the sale
 * runs is left as the user typed it.
 */

import { Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;

/** Sale price in whole rupees. */
const salePrice = (regular: number, percent: number) => Math.max(Math.round((regular * (100 - percent)) / 100), 0);

const same = (a: number, b: number) => Math.abs(a - b) < 0.005;

interface PriceChange {
  productId: string;
  variantId: string | null;
  name: string;
  from: number;
  to: number;
}

export interface SaleResult {
  changes: PriceChange[];
  /** Prices changed by hand during the sale; left as they are. */
  keptByHand: number;
}

async function rows(db: Db, tenantId: string, productIds: string[]) {
  if (!productIds.length) return [];
  const [products, profiles, variantProfiles] = await Promise.all([
    db.product.findMany({
      where: { tenantId, id: { in: productIds } },
      select: { id: true, name: true, price: true, variants: { select: { id: true, name: true, price: true } } },
    }),
    db.garmentProductProfile.findMany({ where: { tenantId, productId: { in: productIds } }, select: { productId: true, regularPrice: true } }),
    db.garmentVariantProfile.findMany({ where: { tenantId, productId: { in: productIds } }, select: { variantId: true, regularPrice: true } }),
  ]);
  const regularOf = new Map(profiles.map((p) => [p.productId, p.regularPrice]));
  const variantRegularOf = new Map(variantProfiles.map((p) => [p.variantId, p.regularPrice]));
  return products.map((p) => ({
    ...p,
    regularPrice: regularOf.get(p.id) ?? null,
    variants: p.variants.map((v) => ({ ...v, regularPrice: variantRegularOf.get(v.id) ?? null })),
  }));
}

/**
 * Puts `percent` off on these products. `previous` is the percent that was
 * running before (null when none): items already on sale are worked out
 * again from their regular price, unless their price was changed by hand.
 */
export async function applySale(db: Db, tenantId: string, productIds: string[], percent: number, previous: number | null): Promise<SaleResult> {
  const changes: PriceChange[] = [];
  let keptByHand = 0;
  /** New price and regular price of one row, or null to leave it. */
  const plan = (current: number, regular: number | null) => {
    if (regular == null) return { price: salePrice(current, percent), regular: current };
    if (previous != null && !same(current, salePrice(regular, previous))) { keptByHand++; return null; }
    return { price: salePrice(regular, percent), regular };
  };

  for (const p of await rows(db, tenantId, productIds)) {
    const next = plan(Number(p.price), p.regularPrice);
    if (next) {
      if (!same(next.price, p.price)) {
        await db.product.update({ where: { id: p.id }, data: { price: next.price } });
        changes.push({ productId: p.id, variantId: null, name: p.name, from: Number(p.price), to: next.price });
      }
    }
    await db.garmentProductProfile.upsert({
      where: { productId: p.id },
      update: { isOnSale: true, ...(next && { regularPrice: next.regular }) },
      create: { tenantId, productId: p.id, isOnSale: true, regularPrice: next?.regular ?? null },
    });
    for (const v of p.variants) {
      const nv = plan(Number(v.price), v.regularPrice);
      if (!nv) continue;
      if (!same(nv.price, v.price)) {
        await db.productVariant.update({ where: { id: v.id }, data: { price: nv.price } });
        changes.push({ productId: p.id, variantId: v.id, name: `${p.name} (${v.name})`, from: Number(v.price), to: nv.price });
      }
      await db.garmentVariantProfile.upsert({
        where: { variantId: v.id },
        update: { regularPrice: nv.regular },
        create: { tenantId, productId: p.id, variantId: v.id, regularPrice: nv.regular },
      });
    }
  }
  return { changes, keptByHand };
}

/**
 * Ends the sale on these products: each price goes back to its regular
 * price, except one changed by hand during the sale (`percent` is the sale
 * that was running; null puts every price back).
 */
export async function endSale(db: Db, tenantId: string, productIds: string[], percent: number | null): Promise<SaleResult> {
  const changes: PriceChange[] = [];
  let keptByHand = 0;
  const back = (current: number, regular: number | null) => {
    if (regular == null) return null;
    if (percent != null && !same(current, salePrice(regular, percent))) { keptByHand++; return null; }
    return regular;
  };

  for (const p of await rows(db, tenantId, productIds)) {
    const price = back(Number(p.price), p.regularPrice);
    if (price != null && !same(price, p.price)) {
      await db.product.update({ where: { id: p.id }, data: { price } });
      changes.push({ productId: p.id, variantId: null, name: p.name, from: Number(p.price), to: price });
    }
    for (const v of p.variants) {
      const vp = back(Number(v.price), v.regularPrice);
      if (vp != null && !same(vp, v.price)) {
        await db.productVariant.update({ where: { id: v.id }, data: { price: vp } });
        changes.push({ productId: p.id, variantId: v.id, name: `${p.name} (${v.name})`, from: Number(v.price), to: vp });
      }
    }
  }
  await db.garmentProductProfile.updateMany({ where: { tenantId, productId: { in: productIds } }, data: { isOnSale: false, regularPrice: null } });
  await db.garmentVariantProfile.updateMany({ where: { tenantId, productId: { in: productIds } }, data: { regularPrice: null } });
  return { changes, keptByHand };
}

/**
 * Products moving into `toCollectionId` (or out of every collection when
 * null): the sale of the collection they leave ends for them, and the sale
 * of the one they join starts. Call before the move is saved.
 */
export async function moveSale(db: Db, tenantId: string, productIds: string[], toCollectionId: string | null): Promise<SaleResult> {
  const out: SaleResult = { changes: [], keptByHand: 0 };
  if (!productIds.length) return out;
  const add = (r: SaleResult) => { out.changes.push(...r.changes); out.keptByHand += r.keptByHand; };
  const profiles = await db.garmentProductProfile.findMany({
    where: { tenantId, productId: { in: productIds } },
    select: { productId: true, collectionId: true },
  });
  const fromOf = new Map(profiles.map((p) => [p.productId, p.collectionId]));
  const moving = productIds.filter((id) => (fromOf.get(id) ?? null) !== toCollectionId);
  if (!moving.length) return out;

  const ids = [...new Set([toCollectionId, ...moving.map((id) => fromOf.get(id) ?? null)].filter((x): x is string => !!x))];
  const collections = await db.garmentCollection.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, salePercent: true } });
  const percentOf = new Map(collections.map((c) => [c.id, c.salePercent]));

  const byFrom = new Map<string, string[]>();
  for (const id of moving) {
    const from = fromOf.get(id);
    if (from && percentOf.get(from) != null) byFrom.set(from, [...(byFrom.get(from) ?? []), id]);
  }
  for (const [from, list] of byFrom) add(await endSale(db, tenantId, list, percentOf.get(from) ?? null));

  const target = toCollectionId ? percentOf.get(toCollectionId) ?? null : null;
  if (target != null) add(await applySale(db, tenantId, moving, target, null));
  return out;
}
