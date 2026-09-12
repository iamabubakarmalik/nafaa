import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
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
    const gte = from
      ? new Date(from)
      : (() => { const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0, 0, 0, 0); return d; })();
    const lte = to ? new Date(to) : new Date();
    if (to) lte.setHours(23, 59, 59, 999);
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

    const [sales, profiles, soldSerials] = await Promise.all([
      this.prisma.sale.findMany({
        where: {
          tenantId,
          status: 'COMPLETED',
          soldAt: { gte, lte },
          ...(params.shopId && { shopId: params.shopId }),
        },
        select: {
          id: true, discount: true, soldAt: true,
          serviceCharges: true, serviceChargesBreakdown: true,
          items: {
            select: {
              id: true, quantity: true, costPrice: true, total: true, productId: true,
              product: { select: { id: true, name: true, brand: { select: { id: true, name: true } } } },
            },
          },
        },
      }),
      // Profile ka Product se relation nahi — alag laa kar JS me jorte hain
      this.prisma.electronicsProductProfile.findMany({
        where: { tenantId },
        select: { productId: true, categoryType: true, conditionType: true, requiresSerial: true },
      }),
      this.prisma.electronicsSerialTracking.findMany({
        where: { tenantId, status: 'SOLD', soldAt: { gte, lte } },
        select: { saleItemId: true },
      }),
    ]);

    const profileByProduct = new Map(profiles.map((p) => [p.productId, p]));
    const serialItemIds = new Set(soldSerials.map((s) => s.saleItemId).filter(Boolean) as string[]);

    type Bucket = { revenue: number; cost: number; profit: number; units: number };
    const blank = (): Bucket => ({ revenue: 0, cost: 0, profit: 0, units: 0 });

    const byCategory = new Map<string, Bucket>();
    const byCondition = new Map<string, Bucket>();
    const byBrand = new Map<string, Bucket & { id: string; name: string }>();
    const byProduct = new Map<string, Bucket & { id: string; name: string; category: string | null }>();
    const daily = new Map<string, { date: string; revenue: number; profit: number }>();

    const totals = blank();
    let serialUnits = 0;
    let serialRevenue = 0;
    // Delivery/installation jaisi services — ye item par nahi, poori sale
    // par lagti hain. Inhe alag gina jata hai warna profit report aur
    // dashboard do alag numbers dikhate hain.
    let serviceIncome = 0;
    let serviceCost = 0;

    for (const sale of sales) {
      serviceIncome += Number(sale.serviceCharges) || 0;
      for (const sc of (Array.isArray(sale.serviceChargesBreakdown)
        ? (sale.serviceChargesBreakdown as any[])
        : [])) {
        serviceCost += Number(sc?.cost) || 0;
      }

      // Sale-level discount har line par uske hisse ke mutabiq
      const lineSum = sale.items.reduce((s, i) => s + Number(i.total), 0);
      const discount = Number(sale.discount) || 0;

      for (const item of sale.items) {
        const gross = Number(item.total) || 0;
        const share = lineSum > 0 ? gross / lineSum : 0;
        const revenue = Math.max(gross - discount * share, 0);
        const cost = Number(item.costPrice) * Number(item.quantity);
        const profit = revenue - cost;
        const units = Number(item.quantity) || 0;

        const add = (b: Bucket) => { b.revenue += revenue; b.cost += cost; b.profit += profit; b.units += units; };

        add(totals);

        const prof = item.productId ? profileByProduct.get(item.productId) : undefined;
        const cat = prof?.categoryType ?? 'OTHER';
        const cond = prof?.conditionType ?? 'BRAND_NEW';

        const c = byCategory.get(cat) ?? blank(); add(c); byCategory.set(cat, c);
        const cd = byCondition.get(cond) ?? blank(); add(cd); byCondition.set(cond, cd);

        if (item.product?.brand) {
          const b = byBrand.get(item.product.brand.id)
            ?? { ...blank(), id: item.product.brand.id, name: item.product.brand.name };
          add(b); byBrand.set(item.product.brand.id, b);
        }

        if (item.productId && item.product) {
          const p = byProduct.get(item.productId)
            ?? { ...blank(), id: item.productId, name: item.product.name, category: prof?.categoryType ?? null };
          add(p); byProduct.set(item.productId, p);
        }

        // Serial-tracked units ka apna hisab — ye mehngi cheezein hoti hain
        if (serialItemIds.has(item.id)) {
          serialUnits += units;
          serialRevenue += revenue;
        }

        const dayKey = sale.soldAt.toISOString().slice(0, 10);
        const day = daily.get(dayKey) ?? { date: dayKey, revenue: 0, profit: 0 };
        day.revenue += revenue;
        day.profit += profit;
        daily.set(dayKey, day);
      }
    }

    const withMargin = <T extends Bucket>(b: T) => ({
      ...b,
      margin: b.revenue > 0 ? (b.profit / b.revenue) * 100 : 0,
    });

    return {
      range: { from: gte.toISOString(), to: lte.toISOString() },
      totals: {
        ...withMargin({
          ...totals,
          // Service income bhi bikri aur munafe ka hissa hai
          revenue: totals.revenue + serviceIncome,
          cost: totals.cost + serviceCost,
          profit: totals.profit + serviceIncome - serviceCost,
        }),
        salesCount: sales.length,
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
