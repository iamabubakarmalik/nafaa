/**
 * Loads what pricing needs from the database: the catalog rows of the items
 * on an order, the customer's price list and the running trade schemes.
 *
 * Also gives the discount guard (sales/price-cut.helper) the prices the
 * owner set through distribution, so a counter bill at a customer's list
 * price or a scheme price is not counted as a discount. With distribution
 * switched off nothing is loaded and the guard behaves exactly as before.
 */

import { Prisma } from '@prisma/client';
import { isPriceTier } from '../../../common/helpers/price-tier.helper';
import {
  listPrice, type PricingCatalog, type PricingList, type PricingProduct, type PricingUnit, type PricingVariant, type Tier,
} from './pricing';
import { applySchemes, earnedFreeByProduct, type SchemeLine, type SchemeRule, type SchemeSlab } from './scheme-resolver';

type Db = Prisma.TransactionClient;

const r4 = (v: number) => Math.round((Number(v) || 0) * 10_000) / 10_000;

/** The settings row, or null when distribution was never set up. */
export function readSettings(db: Db, tenantId: string) {
  return db.distributionSettings.findUnique({ where: { tenantId } });
}

/** Active products, variants and packs for the given product ids. */
export async function loadCatalog(db: Db, tenantId: string, productIds: string[]): Promise<PricingCatalog> {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (!ids.length) return { products: new Map(), variants: new Map(), units: new Map(), unitsByProduct: new Map() };
  const [products, variants, units] = await Promise.all([
    db.product.findMany({
      where: { tenantId, id: { in: ids }, isActive: true },
      select: { id: true, name: true, price: true, wholesalePrice: true, creditPrice: true, costPrice: true, brandId: true, categoryId: true, unit: true, taxRate: true },
    }),
    db.productVariant.findMany({
      where: { productId: { in: ids }, isActive: true, product: { tenantId } },
      select: { id: true, productId: true, name: true, price: true, wholesalePrice: true, creditPrice: true, costPrice: true },
    }),
    db.productUnit.findMany({
      where: { tenantId, productId: { in: ids }, isActive: true },
      select: { id: true, productId: true, variantId: true, unitName: true, conversionRate: true, price: true, wholesalePrice: true, creditPrice: true, costPrice: true },
      orderBy: [{ sortOrder: 'asc' }, { conversionRate: 'asc' }],
    }),
  ]);
  const unitsByProduct = new Map<string, PricingUnit[]>();
  for (const u of units) {
    const list = unitsByProduct.get(u.productId) ?? [];
    list.push(u);
    unitsByProduct.set(u.productId, list);
  }
  return {
    products: new Map(products.map((p) => [p.id, p as PricingProduct])),
    variants: new Map(variants.map((v) => [v.id, v as PricingVariant])),
    units: new Map(units.map((u) => [u.id, u as PricingUnit])),
    unitsByProduct,
  };
}

/** A price list with its rows (only for the given products when ids are passed). */
export async function loadList(db: Db, tenantId: string, listId: string | null | undefined, productIds?: string[]): Promise<PricingList | null> {
  if (!listId) return null;
  const list = await db.priceList.findFirst({
    where: { id: listId, tenantId, isActive: true },
    select: { id: true, name: true, basedOn: true, adjustPct: true },
  });
  if (!list) return null;
  const items = await db.priceListItem.findMany({
    where: { priceListId: list.id, ...(productIds && { productId: { in: [...new Set(productIds)] } }) },
    select: { productId: true, variantId: true, unitId: true, price: true, minQty: true },
  });
  return { ...list, items };
}

/** Which list prices a customer: their own, the settings default, then the list marked default. */
export async function customerListId(
  db: Db, tenantId: string,
  customer: { priceListId?: string | null } | null,
  settings: { defaultPriceListId?: string | null } | null,
): Promise<string | null> {
  for (const id of [customer?.priceListId, settings?.defaultPriceListId]) {
    if (!id) continue;
    const ok = await db.priceList.findFirst({ where: { id, tenantId, isActive: true }, select: { id: true } });
    if (ok) return ok.id;
  }
  const marked = await db.priceList.findFirst({ where: { tenantId, isActive: true, isDefault: true }, select: { id: true } });
  return marked?.id ?? null;
}

/** Active schemes of the business, shaped for the resolver. */
export async function loadSchemes(db: Db, tenantId: string): Promise<SchemeRule[]> {
  const rows = await db.tradeScheme.findMany({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'asc' } });
  return rows.map((s) => ({ ...s, slabs: (Array.isArray(s.slabs) ? s.slabs : null) as SchemeSlab[] | null }));
}

export interface CustomerPricing {
  list: PricingList | null;
  tier: Tier;
  schemes: SchemeRule[];
  catalog: PricingCatalog;
}

/** Everything needed to price items for one customer. */
export async function pricingFor(
  db: Db, tenantId: string,
  input: { customerId?: string | null; priceListId?: string | null; productIds: string[] },
): Promise<CustomerPricing> {
  const [settings, customer] = await Promise.all([
    readSettings(db, tenantId),
    input.customerId
      ? db.customer.findFirst({ where: { id: input.customerId, tenantId }, select: { priceListId: true, priceTier: true } })
      : Promise.resolve(null),
  ]);
  const listId = input.priceListId ?? (await customerListId(db, tenantId, customer, settings));
  const [list, schemes, catalog] = await Promise.all([
    loadList(db, tenantId, listId, input.productIds),
    loadSchemes(db, tenantId),
    loadCatalog(db, tenantId, input.productIds),
  ]);
  const tier: Tier = isPriceTier(customer?.priceTier) ? (customer!.priceTier as Tier) : 'WHOLESALE';
  return { list, tier, schemes, catalog };
}

/* ───────────────────────── discount guard support ───────────────────────── */

export interface GuardLine {
  productId: string;
  variantId?: string | null;
  /** Base units. */
  quantity: number;
  /** Price per base unit. */
  price: number;
}

export interface OwnerPrices {
  /** Prices per base unit from the customer's list (each pack, divided by its size). */
  listFloors(line: GuardLine): number[];
  /** The lowest price a running scheme allows when the line starts from `floor`. */
  schemeFloor(line: GuardLine, floor: number): number;
  /** Free goods the bill's paid lines have earned, per product, in base units. */
  freeAllowance: Map<string, number>;
}

/**
 * Owner-set distribution prices for a counter bill, or null when the business
 * has distribution off (then the guard keeps its long-standing rules).
 */
export async function ownerSetPrices(
  db: Db, tenantId: string,
  input: { customerId?: string | null; lines: GuardLine[]; billLines?: GuardLine[]; at?: Date },
): Promise<OwnerPrices | null> {
  const settings = await readSettings(db, tenantId);
  if (!settings?.enabled) return null;
  const bill = input.billLines?.length ? input.billLines : input.lines;
  const pricing = await pricingFor(db, tenantId, { customerId: input.customerId, productIds: [...bill, ...input.lines].map((l) => l.productId) });
  const { catalog, list, tier, schemes } = pricing;
  const at = input.at ?? new Date();
  const orderGross = bill.reduce((s, l) => s + Math.max(0, l.quantity) * Math.max(0, l.price), 0);

  const schemeLine = (l: GuardLine, unitPrice: number): SchemeLine | null => {
    const p = catalog.products.get(l.productId);
    if (!p) return null;
    const packs: Record<string, number> = { [p.unit || 'pcs']: 1 };
    for (const u of catalog.unitsByProduct.get(l.productId) ?? []) {
      if (!u.variantId || u.variantId === (l.variantId ?? null)) packs[u.unitName] = Number(u.conversionRate) || 1;
    }
    return { productId: l.productId, brandId: p.brandId ?? null, categoryId: p.categoryId ?? null, baseQty: l.quantity, unitPrice, packs };
  };

  const paid = bill.filter((l) => l.price > 0).map((l) => schemeLine(l, l.price)).filter((x): x is SchemeLine => !!x);
  const freeAllowance = schemes.length
    ? earnedFreeByProduct(paid, schemes, { priceListId: list?.id ?? null, at, orderGross })
    : new Map<string, number>();

  return {
    listFloors(l) {
      if (!list) return [];
      const product = catalog.products.get(l.productId);
      if (!product) return [];
      const variant = l.variantId ? catalog.variants.get(l.variantId) ?? null : null;
      const out = [listPrice({ product, variant, unit: null, list, tier, qty: l.quantity }).price];
      for (const u of catalog.unitsByProduct.get(l.productId) ?? []) {
        if (u.variantId && u.variantId !== (l.variantId ?? null)) continue;
        const rate = Number(u.conversionRate) || 1;
        out.push(r4(listPrice({ product, variant, unit: u, list, tier, qty: l.quantity / rate }).price / rate));
      }
      return out.filter((x) => x > 0);
    },
    schemeFloor(l, floor) {
      if (!schemes.length || !(l.quantity > 0)) return floor;
      const line = schemeLine(l, floor);
      if (!line) return floor;
      const [res] = applySchemes([line], schemes, { priceListId: list?.id ?? null, at, orderGross });
      return res?.discount > 0 ? Math.max(0, floor - res.discount / l.quantity) : floor;
    },
    freeAllowance,
  };
}
