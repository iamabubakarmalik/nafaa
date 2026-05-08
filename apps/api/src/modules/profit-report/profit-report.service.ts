import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class ProfitReportService {
  constructor(private readonly prisma: PrismaService) {}

  async byProduct(user: AuthenticatedUser) {
    const items = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId: user.tenantId,
          status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
        },
      },
      include: {
        product: {
          include: { category: true },
        },
      },
    });

    const buckets: Record<string, {
      productId: string;
      name: string;
      sku: string | null;
      categoryName: string | null;
      categoryColor: string | null;
      unit: string;
      quantitySold: number;
      revenue: number;
      cost: number;
      profit: number;
      margin: number;
    }> = {};

    for (const item of items) {
      const id = item.productId;
      if (!buckets[id]) {
        buckets[id] = {
          productId: id,
          name: item.product.name,
          sku: item.product.sku,
          categoryName: item.product.category?.name || null,
          categoryColor: item.product.category?.color || null,
          unit: item.product.unit,
          quantitySold: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          margin: 0,
        };
      }

      const netQty = item.quantity - item.returnedQty;
      const lineRevenue = item.price * netQty;
      const lineCost = item.costPrice * netQty;

      buckets[id].quantitySold += netQty;
      buckets[id].revenue += lineRevenue;
      buckets[id].cost += lineCost;
      buckets[id].profit += lineRevenue - lineCost;
    }

    const result = Object.values(buckets)
      .map((b) => ({
        ...b,
        margin: b.revenue > 0 ? (b.profit / b.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit);

    return result;
  }

  async summary(user: AuthenticatedUser) {
    const products = await this.byProduct(user);

    const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
    const totalCost = products.reduce((s, p) => s + p.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      overallMargin,
      productsCount: products.length,
      topProfitable: products.slice(0, 5),
      leastProfitable: products.filter((p) => p.profit > 0).slice(-5).reverse(),
    };
  }
}
