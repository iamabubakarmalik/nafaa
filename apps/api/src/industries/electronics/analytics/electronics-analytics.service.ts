import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  KEPT_QTY, LINE_COST, LINE_COST_JOINS, LINE_REVENUE, billMathCte, liveSaleSql, saleFigures,
} from '../../../common/helpers/business-math.helper';
import { dateKeyTz, endOfDayTz, startOfDayTz, subDaysTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

/**
 * ElectronicsAnalyticsService — electronics shop ka asli hisab kitab.
 *
 * Mobile shop ki kamai 4 raston se aati hai; electronics shop ki kamai
 * CATEGORY se aati hai (headphone, charger, screen, SSD…) aur CONDITION
 * se (brand new vs refurbished vs used ka margin bilkul alag hota hai).
 *
 * Sath me do cheezein jo sirf electronics me matter karti hain:
 *   • serial-tracked units ki apni ginti (product stock se alag)
 *   • warranty jo khatam hone wali hai
 */
@Injectable()
export class ElectronicsAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private dateRange(from?: string, to?: string) {
    // Business days in Pakistan time; the server clock runs in UTC.
    const dateOnly = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
    const gte = from ? (dateOnly(from) ? startOfDayTz(new Date(from)) : new Date(from)) : subDaysTz(startOfDayTz(new Date()), 30);
    const lte = to ? (dateOnly(to) ? endOfDayTz(new Date(to)) : new Date(to)) : new Date();
    return { gte, lte };
  }

  // ══════════════════════════════════════════════════════════
  // PROFIT — category aur condition ke hisab se
  // ══════════════════════════════════════════════════════════
  async profitBreakdown(
    user: AuthenticatedUser,
    params: { from?: string; to?: string; shopId?: string } = {},
  ) {
    const { gte, lte } = this.dateRange(params.from, params.to);
    const tenantId = user.tenantId;

    // Lines by the shared rules (discount share, returns, kept quantity), so
    // the totals match the day book and profit report.
    const scope = { tenantId, shopId: params.shopId || null };
    const range = { gte, lt: new Date(lte.getTime() + 1) };
    const where = liveSaleSql(scope, range);

    const [lines, figures, profiles] = await Promise.all([
      this.prisma.$queryRaw<Array<{
        saleId: string; soldAt: Date; productId: string | null; name: string | null;
        brandId: string | null; brandName: string | null; isSerial: boolean;
        kept: number; revenue: number; cost: number;
      }>>`
        WITH ${billMathCte(where)}
        SELECT s.id AS "saleId", s."soldAt" AS "soldAt", si."productId" AS "productId", bm_p.name AS name,
          br.id AS "brandId", br.name AS "brandName",
          EXISTS (SELECT 1 FROM "ElectronicsSerialTracking" est WHERE est."saleItemId" = si.id) AS "isSerial",
          ${KEPT_QTY}::float8 AS kept, ${LINE_REVENUE}::float8 AS revenue, ${LINE_COST}::float8 AS cost
        FROM "Sale" s
        JOIN bm ON bm.id = s.id
        JOIN "SaleItem" si ON si."saleId" = s.id
        ${LINE_COST_JOINS}
        LEFT JOIN "Brand" br ON br.id = bm_p."brandId"
        WHERE ${where}`,
      saleFigures(this.prisma, scope, range),
      // The profile has no Prisma relation to Product; joined here in JS.
      this.prisma.electronicsProductProfile.findMany({
        where: { tenantId },
        select: { productId: true, categoryType: true, conditionType: true, requiresSerial: true },
      }),
    ]);

    const profileByProduct = new Map(profiles.map((p) => [p.productId, p]));

    type Bucket = { revenue: number; cost: number; profit: number; units: number };
    const blank = (): Bucket => ({ revenue: 0, cost: 0, profit: 0, units: 0 });

    const byCategory = new Map<string, Bucket>();
    const byCondition = new Map<string, Bucket>();
    const byBrand = new Map<string, Bucket & { id: string; name: string }>();
    const byProduct = new Map<string, Bucket & { id: string; name: string; category: string | null }>();
    const daily = new Map<string, { date: string; revenue: number; profit: number }>();

    const goods = blank();
    let serialUnits = 0;
    let serialRevenue = 0;

    for (const line of lines) {
      const revenue = Number(line.revenue) || 0;
      const cost = Number(line.cost) || 0;
      const profit = revenue - cost;
      const units = Number(line.kept) || 0;
      const add = (b: Bucket) => { b.revenue += revenue; b.cost += cost; b.profit += profit; b.units += units; };
      add(goods);

      const prof = line.productId ? profileByProduct.get(line.productId) : undefined;
      const cat = prof?.categoryType ?? 'OTHER';
      const cond = prof?.conditionType ?? 'BRAND_NEW';
      const c = byCategory.get(cat) ?? blank(); add(c); byCategory.set(cat, c);
      const cd = byCondition.get(cond) ?? blank(); add(cd); byCondition.set(cond, cd);

      if (line.brandId) {
        const b = byBrand.get(line.brandId) ?? { ...blank(), id: line.brandId, name: line.brandName ?? 'Brand' };
        add(b); byBrand.set(line.brandId, b);
      }
      if (line.productId) {
        const p = byProduct.get(line.productId)
          ?? { ...blank(), id: line.productId, name: line.name ?? 'Product', category: prof?.categoryType ?? null };
        add(p); byProduct.set(line.productId, p);
      }
      // Serial-tracked units: the costly pieces, counted on their own.
      if (line.isSerial) {
        serialUnits += units;
        serialRevenue += revenue;
      }

      const dayKey = dateKeyTz(new Date(line.soldAt));
      const day = daily.get(dayKey) ?? { date: dayKey, revenue: 0, profit: 0 };
      day.revenue += revenue;
      day.profit += profit;
      daily.set(dayKey, day);
    }

    // Bill-level charges (delivery, installation): what the bills hold beyond their lines.
    const serviceIncome = Math.max(figures.net - goods.revenue, 0);
    const serviceCost = Math.max(figures.cost - goods.cost, 0);

    const withMargin = <T extends Bucket>(b: T) => ({
      ...b,
      margin: b.revenue > 0 ? (b.profit / b.revenue) * 100 : 0,
    });

    return {
      range: { from: gte.toISOString(), to: lte.toISOString() },
      totals: {
        ...withMargin({ revenue: figures.net, cost: figures.cost, profit: figures.grossProfit, units: goods.units }),
        salesCount: figures.bills,
      },
      /** Delivery waghera se alag kamai — product ke munafe se mila kar na parhein */
      services: {
        income: serviceIncome,
        cost: serviceCost,
        profit: serviceIncome - serviceCost,
      },
      byCategory: [...byCategory.entries()]
        .map(([categoryType, b]) => ({ categoryType, ...withMargin(b) }))
        .sort((a, b) => b.profit - a.profit),
      byCondition: [...byCondition.entries()]
        .map(([conditionType, b]) => ({ conditionType, ...withMargin(b) }))
        .sort((a, b) => b.profit - a.profit),
      topBrands: [...byBrand.values()].map(withMargin).sort((a, b) => b.profit - a.profit).slice(0, 10),
      topProducts: [...byProduct.values()].map(withMargin).sort((a, b) => b.profit - a.profit).slice(0, 25),
      serialTracked: { units: serialUnits, revenue: serialRevenue },
      daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  // ══════════════════════════════════════════════════════════
  // LOW STOCK — serial wale models + normal products
  // ══════════════════════════════════════════════════════════
  async lowStock(user: AuthenticatedUser, shopId?: string) {
    const tenantId = user.tenantId;

    const [products, profiles, serialCounts] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true, name: true, sku: true, unit: true, price: true, costPrice: true,
          stock: true, lowStockAlert: true,
          brand: { select: { name: true } },
          category: { select: { name: true } },
          ...(shopId && {
            shopStocks: { where: { shopId, variantId: null }, select: { stock: true, lowStockAlert: true }, take: 1 },
          }),
        },
      }),
      this.prisma.electronicsProductProfile.findMany({
        where: { tenantId },
        select: { productId: true, categoryType: true, conditionType: true, requiresSerial: true, warrantyMonths: true },
      }),
      this.prisma.electronicsSerialTracking.groupBy({
        by: ['productId'],
        where: {
          tenantId,
          status: 'IN_STOCK',
          ...(shopId && { OR: [{ shopId }, { shopId: null }] }),
        },
        _count: { _all: true },
      }),
    ]);

    const profileByProduct = new Map(profiles.map((p) => [p.productId, p]));
    const serialByProduct = new Map(serialCounts.map((s) => [s.productId, s._count._all]));

    const rows = products.map((p: any) => {
      const prof = profileByProduct.get(p.id);
      const shopStock = shopId ? p.shopStocks?.[0] : undefined;
      const plainStock = shopId ? Number(shopStock?.stock ?? 0) : Number(p.stock) || 0;
      const serialStock = serialByProduct.get(p.id) ?? 0;

      // Serial wale product ki asli ginti serials se aati hai
      const stock = prof?.requiresSerial ? serialStock : plainStock;
      const alert = Number(shopStock?.lowStockAlert ?? p.lowStockAlert) || 0;

      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        brand: p.brand?.name ?? null,
        category: p.category?.name ?? null,
        categoryType: prof?.categoryType ?? null,
        conditionType: prof?.conditionType ?? null,
        requiresSerial: prof?.requiresSerial ?? false,
        warrantyMonths: prof?.warrantyMonths ?? 0,
        stock,
        lowStockAlert: alert,
        price: Number(p.price) || 0,
        costPrice: Number(p.costPrice) || 0,
        stockValue: stock * (Number(p.costPrice) || 0),
        isOut: stock <= 0,
        notInShop: Boolean(shopId) && !shopStock && !prof?.requiresSerial,
      };
    });

    const low = rows.filter((r) => r.stock <= r.lowStockAlert).sort((a, b) => a.stock - b.stock);

    return {
      items: low,
      summary: {
        totalLow: low.length,
        totalOut: low.filter((r) => r.isOut).length,
        serialTrackedLow: low.filter((r) => r.requiresSerial).length,
        valueAtRisk: low.reduce((s, r) => s + r.stockValue, 0),
      },
    };
  }

  // ══════════════════════════════════════════════════════════
  // STOCK — value, umar, aur warranty jo khatam hone wali hai
  // ══════════════════════════════════════════════════════════
  async stockReport(user: AuthenticatedUser, shopId?: string) {
    const tenantId = user.tenantId;
    const now = Date.now();
    const DAY = 86_400_000;

    const [products, profiles, serials] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true, name: true, sku: true, unit: true, price: true, costPrice: true,
          stock: true, lowStockAlert: true, updatedAt: true,
          brand: { select: { name: true } },
          ...(shopId && {
            shopStocks: { where: { shopId, variantId: null }, select: { stock: true }, take: 1 },
          }),
        },
      }),
      this.prisma.electronicsProductProfile.findMany({
        where: { tenantId },
        select: { productId: true, categoryType: true, conditionType: true, requiresSerial: true },
      }),
      this.prisma.electronicsSerialTracking.findMany({
        where: {
          tenantId,
          status: 'IN_STOCK',
          ...(shopId && { OR: [{ shopId }, { shopId: null }] }),
        },
        select: {
          id: true, productId: true, serialNumber: true, imei: true,
          purchasePrice: true, purchaseDate: true, createdAt: true,
          warrantyEndDate: true, warrantyStatus: true, physicalCondition: true,
        },
      }),
    ]);

    const profileByProduct = new Map(profiles.map((p) => [p.productId, p]));
    const productById = new Map(products.map((p) => [p.id, p]));

    const BUCKETS = [
      { key: '0-30', label: '0–30 din', min: 0, max: 30 },
      { key: '31-60', label: '31–60 din', min: 31, max: 60 },
      { key: '61-90', label: '61–90 din', min: 61, max: 90 },
      { key: '90+', label: '90+ din', min: 91, max: Infinity },
    ];
    const buckets = BUCKETS.map((b) => ({ ...b, units: 0, value: 0 }));
    const bucketFor = (days: number) =>
      buckets.find((b) => days >= b.min && days <= b.max) ?? buckets[buckets.length - 1];

    const serialRows = serials.map((sr) => {
      const days = Math.floor((now - new Date(sr.purchaseDate ?? sr.createdAt).getTime()) / DAY);
      const cost = Number(sr.purchasePrice) || 0;
      const b = bucketFor(days);
      b.units += 1;
      b.value += cost;

      const product = productById.get(sr.productId);
      const prof = profileByProduct.get(sr.productId);
      const warrantyDaysLeft = sr.warrantyEndDate
        ? Math.floor((new Date(sr.warrantyEndDate).getTime() - now) / DAY)
        : null;

      return {
        id: sr.id,
        productId: sr.productId,
        name: product?.name ?? 'Product',
        brand: product?.brand?.name ?? null,
        categoryType: prof?.categoryType ?? null,
        conditionType: prof?.conditionType ?? null,
        serialNumber: sr.serialNumber,
        imei: sr.imei,
        cost,
        price: Number(product?.price) || 0,
        ageDays: days,
        bucket: b.key,
        warrantyEndDate: sr.warrantyEndDate,
        warrantyStatus: sr.warrantyStatus,
        warrantyDaysLeft,
        physicalCondition: sr.physicalCondition,
      };
    });

    // Normal (non-serial) products ka stock
    const plainRows = products
      .map((p: any) => {
        const prof = profileByProduct.get(p.id);
        if (prof?.requiresSerial) return null;
        const shopStock = shopId ? p.shopStocks?.[0] : undefined;
        const stock = shopId ? Number(shopStock?.stock ?? 0) : Number(p.stock) || 0;
        if (stock <= 0) return null;
        const unitCost = Number(p.costPrice) || 0;
        return {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          unit: p.unit,
          brand: p.brand?.name ?? null,
          categoryType: prof?.categoryType ?? null,
          conditionType: prof?.conditionType ?? null,
          stock,
          unitCost,
          price: Number(p.price) || 0,
          value: stock * unitCost,
          retailValue: stock * (Number(p.price) || 0),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.value - a.value);

    const serialValue = serialRows.reduce((s, r) => s + r.cost, 0);
    const serialRetail = serialRows.reduce((s, r) => s + r.price, 0);
    const plainValue = plainRows.reduce((s, r) => s + r.value, 0);
    const plainRetail = plainRows.reduce((s, r) => s + r.retailValue, 0);

    const deadStock = serialRows.filter((r) => r.ageDays > 60);

    // Warranty jo 30 din me khatam ho rahi hai — customer ko batana zaroori
    const expiringWarranty = serialRows
      .filter((r) => r.warrantyDaysLeft !== null && r.warrantyDaysLeft >= 0 && r.warrantyDaysLeft <= 30)
      .sort((a, b) => (a.warrantyDaysLeft ?? 0) - (b.warrantyDaysLeft ?? 0));

    return {
      buckets,
      serials: serialRows.sort((a, b) => b.ageDays - a.ageDays),
      products: plainRows,
      deadStock: { count: deadStock.length, value: deadStock.reduce((s, r) => s + r.cost, 0), items: deadStock.slice(0, 50) },
      expiringWarranty: { count: expiringWarranty.length, items: expiringWarranty.slice(0, 50) },
      totals: {
        serialUnits: serialRows.length,
        serialValue,
        productLines: plainRows.length,
        productUnits: plainRows.reduce((s, r) => s + r.stock, 0),
        productValue: plainValue,
        totalValue: serialValue + plainValue,
        totalRetailValue: serialRetail + plainRetail,
        potentialProfit: (serialRetail + plainRetail) - (serialValue + plainValue),
      },
    };
  }
}
