import { Injectable } from '@nestjs/common';
import { startOfDay, subDays, format } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async salesTrend(user: AuthenticatedUser, days = 14) {
    const start = startOfDay(subDays(new Date(), days - 1));

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'COMPLETED',
        soldAt: { gte: start },
      },
      select: {
        soldAt: true,
        total: true,
        costOfGoods: true,
      },
    });

    const buckets: Record<string, { date: string; sales: number; profit: number; orders: number }> = {};

    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
      buckets[d] = { date: d, sales: 0, profit: 0, orders: 0 };
    }

    for (const s of sales) {
      const key = format(s.soldAt, 'yyyy-MM-dd');
      if (!buckets[key]) continue;
      buckets[key].sales += s.total;
      buckets[key].profit += s.total - s.costOfGoods;
      buckets[key].orders += 1;
    }

    return Object.values(buckets);
  }

  async topProducts(user: AuthenticatedUser, limit = 10) {
    const items = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          tenantId: user.tenantId,
          status: 'COMPLETED',
        },
      },
      _sum: {
        quantity: true,
        total: true,
      },
      _count: { _all: true },
      orderBy: {
        _sum: { total: 'desc' },
      },
      take: limit,
    });

    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true, unit: true, price: true },
    });

    const map = new Map(products.map((p) => [p.id, p]));

    return items.map((i) => ({
      productId: i.productId,
      product: map.get(i.productId),
      quantitySold: i._sum.quantity ?? 0,
      revenue: i._sum.total ?? 0,
      orderCount: i._count._all,
    }));
  }

  async categoryBreakdown(user: AuthenticatedUser) {
    const items = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId: user.tenantId,
          status: 'COMPLETED',
        },
      },
      include: {
        product: {
          include: { category: true },
        },
      },
    });

    const buckets: Record<string, { name: string; color: string; revenue: number; quantity: number }> = {};

    for (const item of items) {
      const cat = item.product.category;
      const key = cat?.id || 'uncategorized';
      const name = cat?.name || 'Uncategorized';
      const color = cat?.color || '#94a3b8';

      if (!buckets[key]) {
        buckets[key] = { name, color, revenue: 0, quantity: 0 };
      }
      buckets[key].revenue += item.total;
      buckets[key].quantity += item.quantity;
    }

    return Object.values(buckets).sort((a, b) => b.revenue - a.revenue);
  }

  async paymentMethods(user: AuthenticatedUser) {
    const result = await this.prisma.sale.groupBy({
      by: ['paymentMethod'],
      where: {
        tenantId: user.tenantId,
        status: 'COMPLETED',
      },
      _sum: { total: true },
      _count: { _all: true },
    });

    return result.map((r) => ({
      paymentMethod: r.paymentMethod,
      total: r._sum.total ?? 0,
      count: r._count._all,
    }));
  }
}
