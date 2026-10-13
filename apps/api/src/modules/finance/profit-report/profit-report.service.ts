import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { startOfBusinessDayTz } from '../../../common/helpers/business-time.helper';
import {
  KEPT_QTY, LINE_COST, LINE_COST_JOINS, LINE_REFUND, LINE_REVENUE, billMathCte, liveSaleSql,
} from '../../../common/helpers/business-math.helper';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';

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

/** Product and variant sums from the sale lines. */
interface LineSums {
  pid: string; vid: string | null; qty: number; rqty: number; revenue: number; cost: number; refund: number; bills: number;
}

/**
 * Older per-product profit endpoints (mobile app). Revenue, cost and returns
 * follow business-math.helper, the same rules as the Profit report page.
 */
@Injectable()
export class ProfitReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /** Window from the filters; "today" is the shop's business day. */
  private async getDateRange(tenantId: string, filters?: ProfitFilters): Promise<{ gte?: Date; lte?: Date }> {
    if (filters?.startDate || filters?.endDate) {
      return {
        gte: filters.startDate ? new Date(filters.startDate) : undefined,
        lte: filters.endDate ? new Date(filters.endDate) : undefined,
      };
    }
    const now = new Date();
    const back = (days: number) => new Date(now.getTime() - days * 86_400_000);
    switch (filters?.period || 'all') {
      case 'today': {
        const { tz, dayStartHour } = await this.tz.clock(tenantId);
        return { gte: startOfBusinessDayTz(now, tz, dayStartHour) };
      }
      case 'week': return { gte: back(7) };
      case 'month': return { gte: back(30) };
      case 'quarter': return { gte: back(91) };
      case 'year': return { gte: back(365) };
      default: return {};
    }
  }

  async byProduct(
    user: AuthenticatedUser,
    scope: ShopScope,
    filters?: ProfitFilters,
  ): Promise<ProductProfitRow[]> {
    const range = await this.getDateRange(user.tenantId, filters);
    const where = Prisma.sql`${liveSaleSql({ tenantId: user.tenantId, shopId: scope.shopId }, { gte: range.gte })}
      ${range.lte ? Prisma.sql`AND s."soldAt" <= ${range.lte}` : Prisma.empty}`;
    const productSql = Prisma.sql`si."productId" IS NOT NULL
      ${filters?.categoryId ? Prisma.sql`AND bm_p."categoryId" = ${filters.categoryId}` : Prisma.empty}
      ${filters?.brandId ? Prisma.sql`AND bm_p."brandId" = ${filters.brandId}` : Prisma.empty}`;

    const rows = await this.prisma.$queryRaw<Array<LineSums & { g: number }>>`
      WITH ${billMathCte(where)}
      SELECT GROUPING(bm_sv."variantId")::int AS g, si."productId" AS pid, bm_sv."variantId" AS vid,
        COALESCE(SUM(${KEPT_QTY}), 0)::float8 AS qty,
        COALESCE(SUM(LEAST(si."returnedQty", si.quantity)), 0)::float8 AS rqty,
        COALESCE(SUM(${LINE_REVENUE}), 0)::float8 AS revenue,
        COALESCE(SUM(${LINE_COST}), 0)::float8 AS cost,
        COALESCE(SUM(${LINE_REFUND}), 0)::float8 AS refund,
        COUNT(DISTINCT si."saleId")::int AS bills
      FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" JOIN bm ON bm.id = s.id
      ${LINE_COST_JOINS}
      WHERE ${where} AND ${productSql}
      GROUP BY GROUPING SETS ((si."productId"), (si."productId", bm_sv."variantId"))`;

    const productRows = rows.filter((r) => r.g === 1);
    const variantRows = rows.filter((r) => r.g === 0 && r.vid);
    const ids = productRows.map((r) => r.pid);
    const variantIds = variantRows.map((r) => r.vid!);
    const [products, variants] = await Promise.all([
      ids.length ? this.prisma.product.findMany({
        where: { tenantId: user.tenantId, id: { in: ids } },
        select: {
          id: true, name: true, sku: true, barcode: true, unit: true,
          category: { select: { name: true, color: true } },
          brand: { select: { name: true } },
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } },
          _count: { select: { variants: true } },
        },
      }) : [],
      variantIds.length ? this.prisma.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, name: true } }) : [],
    ]);
    const productBy = new Map(products.map((p) => [p.id, p]));
    const variantName = new Map(variants.map((v) => [v.id, v.name]));
    const r2 = (v: number) => Number(v.toFixed(2));

    const result: ProductProfitRow[] = productRows.flatMap((r) => {
      const p = productBy.get(r.pid);
      if (!p) return [];
      const unit = (p.unit || 'pcs').toLowerCase();
      let industryType: ProductProfitRow['industryType'] = 'STANDARD';
      if (['sqft', 'sqm', 'sqyd'].includes(unit)) industryType = 'CARPET';
      else if (['kg', 'gram', 'liter', 'ml'].includes(unit)) industryType = 'WEIGHT_BASED';
      const profit = r.revenue - r.cost;
      const topVariants = variantRows
        .filter((v) => v.pid === r.pid)
        .map((v) => ({ name: variantName.get(v.vid!) ?? 'Variant', quantity: v.qty, profit: v.revenue - v.cost }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 3);
      return [{
        productId: r.pid,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        primaryImage: p.images[0]?.url || null,
        categoryName: p.category?.name || null,
        categoryColor: p.category?.color || null,
        brandName: p.brand?.name || null,
        unit: p.unit,
        industryType,
        quantitySold: r2(r.qty),
        ordersCount: r.bills,
        revenue: r2(r.revenue),
        cost: r2(r.cost),
        profit: r2(profit),
        margin: r.revenue > 0 ? r2((profit / r.revenue) * 100) : 0,
        avgSellPrice: r.qty > 0 ? r2(r.revenue / r.qty) : 0,
        avgCostPrice: r.qty > 0 ? r2(r.cost / r.qty) : 0,
        returnedQty: r2(r.rqty),
        returnedAmount: r2(r.refund),
        variantCount: p._count.variants,
        topVariants: topVariants.length > 0 ? topVariants : undefined,
      }];
    });

    const sortBy = filters?.sortBy || 'profit';
    result.sort((a, b) => {
      if (sortBy === 'margin') return b.margin - a.margin;
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      if (sortBy === 'quantity') return b.quantitySold - a.quantitySold;
      return b.profit - a.profit;
    });
    return result;
  }

  async summary(
    user: AuthenticatedUser,
    scope: ShopScope,
    filters?: ProfitFilters,
  ) {
    const products = await this.byProduct(user, scope, filters);

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
