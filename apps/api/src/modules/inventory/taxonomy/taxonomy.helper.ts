/**
 * Shared by categories, brands and tags: how each one is doing (products,
 * stock on hand and its cost, low and finished stock, sales and profit in a
 * period), how many products have none, name checks, and merging one into
 * another.
 */

import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { safeDayStart, zonedToUtc } from '../../../common/helpers/business-time.helper';

export type TaxonomyKind = 'category' | 'brand' | 'tag';

export interface TaxonomyStats {
  products: number;
  activeProducts: number;
  stockUnits: number;
  stockValue: number;
  lowStock: number;
  outOfStock: number;
  revenue: number;
  quantity: number;
  profit: number;
}

const KEY = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;
const LIVE = ['COMPLETED', 'PARTIALLY_RETURNED'] as const;
const empty = (): TaxonomyStats => ({ products: 0, activeProducts: 0, stockUnits: 0, stockValue: 0, lowStock: 0, outOfStock: 0, revenue: 0, quantity: 0, profit: 0 });

/** Business days "YYYY-MM-DD" → [start, end); the last 30 days when not given. */
export async function periodRange(tz: TenantTimezoneService, tenantId: string, from?: string, to?: string) {
  const { tz: zone, dayStartHour } = await tz.clock(tenantId);
  const start = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return zonedToUtc(y, m, d, safeDayStart(dayStartHour), 0, 0, zone);
  };
  if (from && to && KEY.test(from) && KEY.test(to)) return { gte: start(from), lt: new Date(start(to).getTime() + DAY) };
  const lt = new Date();
  return { gte: new Date(lt.getTime() - 30 * DAY), lt };
}

/** Case and space blind, so "Bakery" and " bakery " count as one name. */
export const sameName = (name: string) => ({ equals: name.trim().replace(/\s+/g, ' '), mode: 'insensitive' as const });
export const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ');

export function nameTaken(what: string): never {
  throw new ConflictException(`Is naam ka ${what} pehle se maujood hai`);
}

/** Per-item figures for every category, brand or tag, plus products with none. */
export async function taxonomyInsights(prisma: PrismaService, tenantId: string, kind: TaxonomyKind, range: { gte: Date; lt: Date }) {
  const [products, sold] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId },
      select: {
        id: true, isActive: true, stock: true, costPrice: true, lowStockAlert: true, categoryId: true, brandId: true,
        ...(kind === 'tag' && { tags: { select: { tagId: true } } }),
      },
    }),
    prisma.saleItem.groupBy({
      by: ['productId'],
      where: { productId: { not: null }, sale: { tenantId, status: { in: [...LIVE] }, soldAt: range } },
      _sum: { total: true, quantity: true },
    }),
  ]);

  // Cost of what was sold, from each line's own cost.
  const costRows = sold.length
    ? await prisma.saleItem.findMany({
        where: { productId: { in: sold.map((s) => s.productId!) }, sale: { tenantId, status: { in: [...LIVE] }, soldAt: range } },
        select: { productId: true, quantity: true, costPrice: true },
      })
    : [];
  const cost = new Map<string, number>();
  for (const r of costRows) cost.set(r.productId!, (cost.get(r.productId!) ?? 0) + Number(r.quantity) * Number(r.costPrice));
  const sales = new Map(sold.map((s) => [s.productId!, { revenue: Number(s._sum.total ?? 0), quantity: Number(s._sum.quantity ?? 0) }]));

  const stats = new Map<string, TaxonomyStats>();
  let unlinked = 0;
  for (const p of products) {
    const ids = kind === 'category' ? (p.categoryId ? [p.categoryId] : [])
      : kind === 'brand' ? (p.brandId ? [p.brandId] : [])
        : ((p as { tags?: Array<{ tagId: string }> }).tags ?? []).map((t) => t.tagId);
    if (!ids.length) { unlinked++; continue; }
    const stock = Number(p.stock) || 0;
    const s = sales.get(p.id);
    for (const id of ids) {
      const row = stats.get(id) ?? empty();
      row.products++;
      if (p.isActive) row.activeProducts++;
      row.stockUnits += Math.max(stock, 0);
      row.stockValue += Math.max(stock, 0) * (Number(p.costPrice) || 0);
      if (stock <= 0) row.outOfStock++;
      else if (stock <= Number(p.lowStockAlert)) row.lowStock++;
      if (s) {
        row.revenue += s.revenue;
        row.quantity += s.quantity;
        row.profit += s.revenue - (cost.get(p.id) ?? 0);
      }
      stats.set(id, row);
    }
  }
  return { stats, unlinked, totalProducts: products.length };
}

/** Moves every product (and combo, for categories) from one item to another. */
export async function mergeInto(prisma: PrismaService, kind: TaxonomyKind, fromId: string, intoId: string) {
  return prisma.$transaction(async (tx) => {
    if (kind === 'category') {
      const moved = await tx.product.updateMany({ where: { categoryId: fromId }, data: { categoryId: intoId } });
      await tx.productCombo.updateMany({ where: { categoryId: fromId }, data: { categoryId: intoId } });
      await tx.category.delete({ where: { id: fromId } });
      return moved.count;
    }
    if (kind === 'brand') {
      const moved = await tx.product.updateMany({ where: { brandId: fromId }, data: { brandId: intoId } });
      await tx.brand.delete({ where: { id: fromId } });
      return moved.count;
    }
    const links = await tx.productTag.findMany({ where: { tagId: fromId }, select: { productId: true } });
    if (links.length) {
      await tx.productTag.createMany({ data: links.map((l) => ({ productId: l.productId, tagId: intoId })), skipDuplicates: true });
    }
    await tx.tag.delete({ where: { id: fromId } });
    return links.length;
  });
}
