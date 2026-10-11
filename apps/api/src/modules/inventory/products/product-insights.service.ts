/**
 * Everything the product detail page shows about how one product moves:
 * daily sales by business day, totals for the window and all time, recent
 * bills, this product's own stock log, stock per branch, selling rate and
 * days of stock left, and its best customers. All filtered on the server so
 * the page never downloads other products' sales or movements.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey, dateKeyTz, safeDayStart, zonedToUtc } from '../../../common/helpers/business-time.helper';

const LIVE = ['COMPLETED', 'PARTIALLY_RETURNED', 'FULLY_RETURNED'] as const;
const DAY = 86_400_000;
const WINDOWS = [7, 30, 90, 365];
const n = (v: unknown) => Number(v ?? 0);

@Injectable()
export class ProductInsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  async get(user: AuthenticatedUser, productId: string, days?: string | number, shopId?: string) {
    const tenantId = user.tenantId;
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId }, select: { id: true, stock: true, costPrice: true } });
    if (!product) throw new NotFoundException('Product nahi mila');

    const window = WINDOWS.includes(Number(days)) ? Number(days) : 30;
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const start = safeDayStart(dayStartHour);
    const todayKey = businessDayKey(new Date(), tz, start);
    const [y, m, d] = todayKey.split('-').map(Number);
    const todayStart = zonedToUtc(y, m, d, start, 0, 0, tz);
    const from = new Date(todayStart.getTime() - (window - 1) * DAY);
    const sale = { tenantId, status: { in: [...LIVE] }, ...(shopId && { shopId }) };

    const [lines, allTime, recent, movements, shops, customers] = await Promise.all([
      this.prisma.saleItem.findMany({
        where: { productId, sale: { ...sale, soldAt: { gte: from } } },
        select: { quantity: true, returnedQty: true, total: true, costPrice: true, saleId: true, sale: { select: { soldAt: true } } },
      }),
      this.prisma.saleItem.aggregate({
        where: { productId, sale },
        _sum: { quantity: true, returnedQty: true, total: true },
        _count: { _all: true },
        _min: { createdAt: true },
        _max: { createdAt: true },
      }),
      this.prisma.saleItem.findMany({
        where: { productId, sale: { tenantId, ...(shopId && { shopId }) } },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true, quantity: true, returnedQty: true, price: true, total: true,
          sale: { select: { id: true, saleNumber: true, soldAt: true, status: true, customer: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.stockMovement.findMany({
        where: { tenantId, productId, ...(shopId && { shopId }) },
        orderBy: { createdAt: 'desc' },
        take: 60,
        select: { id: true, type: true, quantity: true, balanceAfter: true, reference: true, note: true, createdAt: true, shop: { select: { name: true } } },
      }),
      this.prisma.shopStock.findMany({
        where: { tenantId, productId },
        select: { stock: true, lowStockAlert: true, variantId: true, shop: { select: { id: true, name: true } } },
      }),
      this.prisma.sale.groupBy({
        by: ['customerId'],
        where: { ...sale, customerId: { not: null }, items: { some: { productId } } },
        _count: { _all: true },
        _max: { soldAt: true },
        orderBy: { _count: { customerId: 'desc' } },
        take: 5,
      }),
    ]);

    // Daily buckets keyed by business day, oldest first, with empty days kept.
    const shift = start * 3600_000;
    const buckets = new Map<string, { key: string; qty: number; revenue: number; profit: number; bills: number }>();
    for (let i = window - 1; i >= 0; i--) {
      const key = dateKeyTz(new Date(todayStart.getTime() - i * DAY + 12 * 3600_000 - shift), tz);
      buckets.set(key, { key, qty: 0, revenue: 0, profit: 0, bills: 0 });
    }
    const billsSeen = new Set<string>();
    let qty = 0; let revenue = 0; let cost = 0;
    for (const l of lines) {
      const key = dateKeyTz(new Date(l.sale.soldAt.getTime() - shift), tz);
      const q = n(l.quantity) - n(l.returnedQty);
      const lineCost = q * n(l.costPrice);
      qty += q; revenue += n(l.total); cost += lineCost;
      const b = buckets.get(key);
      if (b) { b.qty += q; b.revenue += n(l.total); b.profit += n(l.total) - lineCost; if (!billsSeen.has(l.saleId)) b.bills += 1; }
      billsSeen.add(l.saleId);
    }

    const customerRows = customers.length
      ? await this.prisma.customer.findMany({ where: { id: { in: customers.map((c) => c.customerId!) } }, select: { id: true, name: true, phone: true } })
      : [];
    const customerName = new Map(customerRows.map((c) => [c.id, c]));
    const stockNow = shopId ? shops.filter((s) => s.shop.id === shopId).reduce((s, r) => s + n(r.stock), 0) : n(product.stock);
    const perDay = qty / window;

    return {
      window,
      series: [...buckets.values()],
      totals: { qty, revenue, profit: revenue - cost, bills: billsSeen.size, perDay, daysLeft: perDay > 0 && stockNow > 0 ? Math.round(stockNow / perDay) : null },
      allTime: {
        qty: n(allTime._sum.quantity) - n(allTime._sum.returnedQty),
        revenue: n(allTime._sum.total),
        lines: allTime._count._all,
        firstSoldAt: allTime._min.createdAt,
        lastSoldAt: allTime._max.createdAt,
      },
      recent: recent.map((r) => ({
        id: r.id, saleId: r.sale.id, saleNumber: r.sale.saleNumber, soldAt: r.sale.soldAt, status: r.sale.status,
        customer: r.sale.customer, qty: n(r.quantity), returnedQty: n(r.returnedQty), price: n(r.price), total: n(r.total),
      })),
      movements,
      shops: shops.filter((s) => !s.variantId).map((s) => ({ shopId: s.shop.id, name: s.shop.name, stock: n(s.stock), lowStockAlert: n(s.lowStockAlert) })),
      customers: customers.map((c) => ({ ...customerName.get(c.customerId!), bills: c._count._all, lastAt: c._max.soldAt })),
    };
  }
}
