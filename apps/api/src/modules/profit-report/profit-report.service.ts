import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

export type ProfitPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';
export type ProfitSortBy = 'profit' | 'margin' | 'revenue' | 'quantity';

export interface ProfitFilters {
  period?: ProfitPeriod;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  brandId?: string;
  sortBy?: ProfitSortBy;
}

export interface ProductProfitRow {
  productId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  primaryImage: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  brandName: string | null;
  unit: string;

  // Industry detection
  industryType: 'STANDARD' | 'CARPET' | 'MOBILE' | 'WEIGHT_BASED';

  // Sales metrics
  quantitySold: number;
  ordersCount: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  avgSellPrice: number;
  avgCostPrice: number;

  // Returns
  returnedQty: number;
  returnedAmount: number;

  // Variants
  variantCount: number;
  topVariants?: Array<{
    name: string;
    quantity: number;
    profit: number;
  }>;
}

@Injectable()
export class ProfitReportService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helper: Date range from period ───────────────────────
  private getDateRange(filters?: ProfitFilters): { gte?: Date; lte?: Date } {
    if (filters?.startDate || filters?.endDate) {
      return {
        gte: filters.startDate ? new Date(filters.startDate) : undefined,
        lte: filters.endDate ? new Date(filters.endDate) : undefined,
      };
    }

    const now = new Date();
    const period = filters?.period || 'all';

    switch (period) {
      case 'today': {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return { gte: start };
      }
      case 'week': {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        return { gte: start };
      }
      case 'month': {
        const start = new Date(now);
        start.setDate(now.getDate() - 30);
        return { gte: start };
      }
      case 'quarter': {
        const start = new Date(now);
        start.setMonth(now.getMonth() - 3);
        return { gte: start };
      }
      case 'year': {
        const start = new Date(now);
        start.setFullYear(now.getFullYear() - 1);
        return { gte: start };
      }
      default:
        return {};
    }
  }

  async byProduct(user: AuthenticatedUser, filters?: ProfitFilters): Promise<ProductProfitRow[]> {
    const dateRange = this.getDateRange(filters);

    const items = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId: user.tenantId,
          status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
          ...(dateRange.gte || dateRange.lte
            ? {
                soldAt: {
                  ...(dateRange.gte && { gte: dateRange.gte }),
                  ...(dateRange.lte && { lte: dateRange.lte }),
                },
              }
            : {}),
        },
        product: {
          ...(filters?.categoryId && { categoryId: filters.categoryId }),
          ...(filters?.brandId && { brandId: filters.brandId }),
        },
      },
      include: {
        sale: { select: { id: true } },
        product: {
          include: {
            category: { select: { name: true, color: true } },
            brand: { select: { name: true } },
            images: {
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
              take: 1,
            },
            _count: { select: { variants: true } },
          },
        },
        variantLink: {
          include: { variant: { select: { id: true, name: true } } },
        },
      },
    });

    interface Bucket {
      productId: string;
      name: string;
      sku: string | null;
      barcode: string | null;
      primaryImage: string | null;
      categoryName: string | null;
      categoryColor: string | null;
      brandName: string | null;
      unit: string;
      industryType: ProductProfitRow['industryType'];
      quantitySold: number;
      revenue: number;
      cost: number;
      returnedQty: number;
      returnedAmount: number;
      saleIds: Set<string>;
      variantCount: number;
      variantStats: Map<string, { name: string; qty: number; profit: number }>;
    }

    const buckets = new Map<string, Bucket>();

    for (const item of items) {
      const id = item.productId;
      const unit = (item.product.unit || 'pcs').toLowerCase();

      let industryType: ProductProfitRow['industryType'] = 'STANDARD';
      if (['sqft', 'sqm', 'sqyd'].includes(unit)) industryType = 'CARPET';
      else if (['kg', 'gram', 'liter', 'ml'].includes(unit)) industryType = 'WEIGHT_BASED';

      if (!buckets.has(id)) {
        buckets.set(id, {
          productId: id,
          name: item.product.name,
          sku: item.product.sku,
          barcode: item.product.barcode,
          primaryImage: item.product.images[0]?.url || null,
          categoryName: item.product.category?.name || null,
          categoryColor: item.product.category?.color || null,
          brandName: item.product.brand?.name || null,
          unit: item.product.unit,
          industryType,
          quantitySold: 0,
          revenue: 0,
          cost: 0,
          returnedQty: 0,
          returnedAmount: 0,
          saleIds: new Set(),
          variantCount: item.product._count.variants,
          variantStats: new Map(),
        });
      }

      const bucket = buckets.get(id)!;
      const netQty = Number(item.quantity) - Number(item.returnedQty);
      const lineRevenue = Number(item.price) * netQty;
      const lineCost = Number(item.costPrice) * netQty;

      bucket.quantitySold += netQty;
      bucket.revenue += lineRevenue;
      bucket.cost += lineCost;
      bucket.returnedQty += Number(item.returnedQty);
      bucket.returnedAmount += Number(item.price) * Number(item.returnedQty);
      bucket.saleIds.add(item.sale.id);

      // Track variant stats
      if (item.variantLink?.variant) {
        const v = item.variantLink.variant;
        const existing = bucket.variantStats.get(v.id) || { name: v.name, qty: 0, profit: 0 };
        existing.qty += netQty;
        existing.profit += lineRevenue - lineCost;
        bucket.variantStats.set(v.id, existing);
      }
    }

    const result: ProductProfitRow[] = Array.from(buckets.values()).map((b) => {
      const profit = b.revenue - b.cost;
      const margin = b.revenue > 0 ? (profit / b.revenue) * 100 : 0;
      const avgSellPrice = b.quantitySold > 0 ? b.revenue / b.quantitySold : 0;
      const avgCostPrice = b.quantitySold > 0 ? b.cost / b.quantitySold : 0;

      const topVariants = Array.from(b.variantStats.values())
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 3)
        .map((v) => ({ name: v.name, quantity: v.qty, profit: v.profit }));

      return {
        productId: b.productId,
        name: b.name,
        sku: b.sku,
        barcode: b.barcode,
        primaryImage: b.primaryImage,
        categoryName: b.categoryName,
        categoryColor: b.categoryColor,
        brandName: b.brandName,
        unit: b.unit,
        industryType: b.industryType,
        quantitySold: Number(b.quantitySold.toFixed(2)),
        ordersCount: b.saleIds.size,
        revenue: Number(b.revenue.toFixed(2)),
        cost: Number(b.cost.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        margin: Number(margin.toFixed(2)),
        avgSellPrice: Number(avgSellPrice.toFixed(2)),
        avgCostPrice: Number(avgCostPrice.toFixed(2)),
        returnedQty: Number(b.returnedQty.toFixed(2)),
        returnedAmount: Number(b.returnedAmount.toFixed(2)),
        variantCount: b.variantCount,
        topVariants: topVariants.length > 0 ? topVariants : undefined,
      };
    });

    // Sorting
    const sortBy = filters?.sortBy || 'profit';
    result.sort((a, b) => {
      if (sortBy === 'margin') return b.margin - a.margin;
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      if (sortBy === 'quantity') return b.quantitySold - a.quantitySold;
      return b.profit - a.profit;
    });

    return result;
  }

  async summary(user: AuthenticatedUser, filters?: ProfitFilters) {
    const products = await this.byProduct(user, filters);

    const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
    const totalCost = products.reduce((s, p) => s + p.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const totalQtySold = products.reduce((s, p) => s + p.quantitySold, 0);
    const totalOrders = products.reduce((s, p) => s + p.ordersCount, 0);
    const totalReturns = products.reduce((s, p) => s + p.returnedAmount, 0);

    // Industry breakdown
    const carpetProducts = products.filter((p) => p.industryType === 'CARPET');
    const mobileProducts = products.filter((p) => p.industryType === 'MOBILE');
    const standardProducts = products.filter((p) => p.industryType === 'STANDARD');

    // Category breakdown
    const categoryMap = new Map<string, { name: string; color: string | null; profit: number; revenue: number; count: number }>();
    for (const p of products) {
      const key = p.categoryName || 'Uncategorized';
      const existing = categoryMap.get(key) || {
        name: key,
        color: p.categoryColor,
        profit: 0,
        revenue: 0,
        count: 0,
      };
      existing.profit += p.profit;
      existing.revenue += p.revenue;
      existing.count += 1;
      categoryMap.set(key, existing);
    }

    const categoryBreakdown = Array.from(categoryMap.values())
      .sort((a, b) => b.profit - a.profit)
      .map((c) => ({
        ...c,
        profit: Number(c.profit.toFixed(2)),
        revenue: Number(c.revenue.toFixed(2)),
        margin: c.revenue > 0 ? Number(((c.profit / c.revenue) * 100).toFixed(2)) : 0,
      }));

    // Brand breakdown (top 10)
    const brandMap = new Map<string, { name: string; profit: number; revenue: number; count: number }>();
    for (const p of products) {
      if (!p.brandName) continue;
      const existing = brandMap.get(p.brandName) || { name: p.brandName, profit: 0, revenue: 0, count: 0 };
      existing.profit += p.profit;
      existing.revenue += p.revenue;
      existing.count += 1;
      brandMap.set(p.brandName, existing);
    }
    const brandBreakdown = Array.from(brandMap.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10)
      .map((b) => ({
        ...b,
        profit: Number(b.profit.toFixed(2)),
        revenue: Number(b.revenue.toFixed(2)),
      }));

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      overallMargin: Number(overallMargin.toFixed(2)),
      productsCount: products.length,
      totalQtySold: Number(totalQtySold.toFixed(2)),
      totalOrders,
      totalReturns: Number(totalReturns.toFixed(2)),

      // Industry counts
      carpetCount: carpetProducts.length,
      mobileCount: mobileProducts.length,
      standardCount: standardProducts.length,

      // Top/bottom
      topProfitable: products.slice(0, 10),
      leastProfitable: products
        .filter((p) => p.profit > 0)
        .slice(-5)
        .reverse(),
      losses: products.filter((p) => p.profit < 0).slice(0, 10),

      // Breakdowns
      categoryBreakdown,
      brandBreakdown,

      // Best margin items
      highestMargin: [...products]
        .filter((p) => p.revenue > 0)
        .sort((a, b) => b.margin - a.margin)
        .slice(0, 5),
    };
  }
}
