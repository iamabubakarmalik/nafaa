import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  KEPT_QTY, LINE_COST, LINE_COST_JOINS, LINE_REVENUE, billMathCte, liveSaleSql, saleFigures,
} from '../../../common/helpers/business-math.helper';
import { dateKeyTz, endOfDayTz, startOfDayTz, startOfMonthTz, subDaysTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class MobileReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ════════════════════════════════════════════════════════
  // MASTER DASHBOARD
  // ════════════════════════════════════════════════════════

  async dashboard(user: AuthenticatedUser, shopId?: string) {
    // Business month in Pakistan time; the server clock runs in UTC.
    const monthStart = startOfMonthTz(new Date());

    const [
      newImeis,
      usedPhones,
      repairs,
      emiPlans,
      saleStats,
    ] = await Promise.all([
      this.prisma.productImei.aggregate({
        where: { tenantId: user.tenantId, ...(shopId && { shopId }), status: 'IN_STOCK' },
        _count: { _all: true },
        _sum: { costPrice: true, ptaTaxPaid: true },
      }),
      this.prisma.usedPhone.aggregate({
        where: { tenantId: user.tenantId, ...(shopId && { shopId }), status: 'IN_STOCK' },
        _count: { _all: true },
        _sum: { totalCost: true, resalePrice: true },
      }),
      this.prisma.repairTicket.aggregate({
        where: {
          tenantId: user.tenantId,
          ...(shopId && { shopId }),
          status: { notIn: ['DELIVERED', 'CANCELLED'] },
        },
        _count: { _all: true },
      }),
      this.prisma.emiPlan.aggregate({
        where: { tenantId: user.tenantId, status: 'ACTIVE' },
        _count: { _all: true },
        _sum: { remainingAmount: true },
      }),
      // Same rules as the day book and reports: live bills, minus returns.
      saleFigures(this.prisma, { tenantId: user.tenantId, shopId }, { gte: monthStart }),
    ]);

    return {
      newPhonesInStock: newImeis._count._all,
      newPhonesStockValue: newImeis._sum.costPrice ?? 0,
      ptaTaxLocked: newImeis._sum.ptaTaxPaid ?? 0,
      usedPhonesInStock: usedPhones._count._all,
      usedPhonesStockValue: usedPhones._sum.totalCost ?? 0,
      usedPhonesPotentialRevenue: usedPhones._sum.resalePrice ?? 0,
      openRepairTickets: repairs._count._all,
      activeEmiPlans: emiPlans._count._all,
      emiOutstanding: emiPlans._sum.remainingAmount ?? 0,
      monthRevenue: saleStats.net,
      monthCogs: saleStats.cost,
      monthProfit: saleStats.grossProfit,
      monthSalesCount: saleStats.bills,
    };
  }


  // ════════════════════════════════════════════════════════
  // PROFIT BY SOURCE
  // Mobile shop ki kamai 4 raston se aati hai — naya phone,
  // used phone, accessory aur repair. Ye unhe alag alag torta hai
  // taake pata chale asli paisa kahan se ban raha hai.
  // ════════════════════════════════════════════════════════

  private dateRange(from?: string, to?: string) {
    const dateOnly = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
    const gte = from ? (dateOnly(from) ? startOfDayTz(new Date(from)) : new Date(from)) : subDaysTz(startOfDayTz(new Date()), 30);
    const lte = to ? (dateOnly(to) ? endOfDayTz(new Date(to)) : new Date(to)) : new Date();
    return { gte, lte };
  }

  async profitBySource(
    user: AuthenticatedUser,
    params: { from?: string; to?: string; shopId?: string } = {},
  ) {
    const { gte, lte } = this.dateRange(params.from, params.to);
    const tenantId = user.tenantId;
    const scope = { tenantId, shopId: params.shopId || null };
    const range = { gte, lt: new Date(lte.getTime() + 1) };
    const where = liveSaleSql(scope, range);

    // Line revenue and cost by the shared rules (bill discount share, returns, kept quantity).
    const [lines, figures] = await Promise.all([
      this.prisma.$queryRaw<Array<{
        saleId: string; soldAt: Date; productId: string | null; name: string | null; brand: string | null;
        isRepair: boolean; isUsed: boolean; isImei: boolean; kept: number; revenue: number; cost: number;
      }>>`
        WITH ${billMathCte(where)}
        SELECT s.id AS "saleId", s."soldAt" AS "soldAt", si."productId" AS "productId",
          bm_p.name AS name, br.name AS brand,
          EXISTS (SELECT 1 FROM "RepairTicket" rt WHERE rt."saleId" = s.id) AS "isRepair",
          (si."usedPhoneId" IS NOT NULL) AS "isUsed",
          EXISTS (SELECT 1 FROM "ProductImei" pi WHERE pi."saleItemId" = si.id) AS "isImei",
          ${KEPT_QTY}::float8 AS kept,
          ${LINE_REVENUE}::float8 AS revenue,
          ${LINE_COST}::float8 AS cost
        FROM "Sale" s
        JOIN bm ON bm.id = s.id
        JOIN "SaleItem" si ON si."saleId" = s.id
        ${LINE_COST_JOINS}
        LEFT JOIN "Brand" br ON br.id = bm_p."brandId"
        WHERE ${where}`,
      saleFigures(this.prisma, scope, range),
    ]);

    type Bucket = { revenue: number; cost: number; profit: number; units: number; sales: number };
    const blank = (): Bucket => ({ revenue: 0, cost: 0, profit: 0, units: 0, sales: 0 });

    const sources = {
      NEW_PHONE: blank(),
      USED_PHONE: blank(),
      ACCESSORY: blank(),
      REPAIR: blank(),
    };
    const seenSalePerSource: Record<string, Set<string>> = {
      NEW_PHONE: new Set(), USED_PHONE: new Set(), ACCESSORY: new Set(), REPAIR: new Set(),
    };

    // Model-level profit (phones and accessories have a product)
    const byProduct = new Map<string, {
      productId: string; name: string; brand: string | null;
      revenue: number; cost: number; profit: number; units: number;
    }>();

    const daily = new Map<string, { date: string; revenue: number; profit: number }>();

    for (const line of lines) {
      const revenue = Number(line.revenue) || 0;
      const cost = Number(line.cost) || 0;
      const profit = revenue - cost;
      const units = Number(line.kept) || 0;

      const key: keyof typeof sources = line.isRepair
        ? 'REPAIR'
        : line.isUsed
          ? 'USED_PHONE'
          : line.isImei
            ? 'NEW_PHONE'
            : 'ACCESSORY';

      sources[key].revenue += revenue;
      sources[key].cost += cost;
      sources[key].profit += profit;
      sources[key].units += units;
      seenSalePerSource[key].add(line.saleId);

      if (line.productId && !line.isRepair) {
        const row = byProduct.get(line.productId) ?? {
          productId: line.productId,
          name: line.name ?? 'Product',
          brand: line.brand ?? null,
          revenue: 0, cost: 0, profit: 0, units: 0,
        };
        row.revenue += revenue;
        row.cost += cost;
        row.profit += profit;
        row.units += units;
        byProduct.set(line.productId, row);
      }

      const dayKey = dateKeyTz(new Date(line.soldAt));
      const day = daily.get(dayKey) ?? { date: dayKey, revenue: 0, profit: 0 };
      day.revenue += revenue;
      day.profit += profit;
      daily.set(dayKey, day);
    }

    const withMargin = (b: Bucket, key: string) => ({
      ...b,
      sales: seenSalePerSource[key].size,
      margin: b.revenue > 0 ? (b.profit / b.revenue) * 100 : 0,
    });

    // Totals come from the shared figures, so they match the day book and
    // profit report (bill charges and bill-level cost included).
    const units = Object.values(sources).reduce((a, b) => a + b.units, 0);
    const totals = { revenue: figures.net, cost: figures.cost, profit: figures.grossProfit, units };

    return {
      range: { from: gte.toISOString(), to: lte.toISOString() },
      sources: [
        { key: 'NEW_PHONE', label: 'Naye Phone', ...withMargin(sources.NEW_PHONE, 'NEW_PHONE') },
        { key: 'USED_PHONE', label: 'Used Phone', ...withMargin(sources.USED_PHONE, 'USED_PHONE') },
        { key: 'ACCESSORY', label: 'Accessories', ...withMargin(sources.ACCESSORY, 'ACCESSORY') },
        { key: 'REPAIR', label: 'Repair', ...withMargin(sources.REPAIR, 'REPAIR') },
      ],
      totals: {
        ...totals,
        margin: totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0,
        salesCount: figures.bills,
      },
      topProducts: [...byProduct.values()]
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 25)
        .map((p) => ({ ...p, margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0 })),
      daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  // ════════════════════════════════════════════════════════
  // LOW STOCK — phone models aur accessories jo khatam ho rahe hain
  // ════════════════════════════════════════════════════════

  async lowStock(user: AuthenticatedUser, shopId?: string) {
    const tenantId = user.tenantId;

    const [imeiGroups, products, accessories] = await Promise.all([
      this.prisma.productImei.groupBy({
        by: ['productId', 'variantId'],
        where: {
          tenantId,
          status: 'IN_STOCK',
          ...(shopId && { OR: [{ shopId }, { shopId: null }] }),
        },
        _count: { _all: true },
        _sum: { costPrice: true },
      }),
      this.prisma.product.findMany({
        where: { tenantId, isActive: true, productImeis: { some: {} } },
        select: {
          id: true, name: true, sku: true, price: true, lowStockAlert: true,
          brand: { select: { name: true } },
          variants: { select: { id: true, name: true, color: true, price: true } },
        },
      }),
      this.prisma.product.findMany({
        where: {
          tenantId,
          isActive: true,
          productImeis: { none: {} },
        },
        select: {
          id: true, name: true, sku: true, unit: true, price: true,
          stock: true, lowStockAlert: true,
          brand: { select: { name: true } },
          ...(shopId && {
            shopStocks: { where: { shopId, variantId: null }, select: { stock: true, lowStockAlert: true }, take: 1 },
          }),
        },
      }),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Phone models: har variant ka apna IMEI count
    const phoneRows = imeiGroups
      .map((g) => {
        const product = productMap.get(g.productId);
        if (!product) return null;
        const variant = g.variantId
          ? product.variants.find((v) => v.id === g.variantId)
          : undefined;
        const inStock = g._count._all;
        const alert = Number(product.lowStockAlert) || 0;
        return {
          productId: product.id,
          variantId: g.variantId,
          name: product.name,
          variantName: variant?.name ?? null,
          color: variant?.color ?? null,
          brand: product.brand?.name ?? null,
          sku: product.sku,
          inStock,
          lowStockAlert: alert,
          price: Number(variant?.price ?? product.price) || 0,
          stockValue: Number(g._sum.costPrice) || 0,
          isOut: inStock === 0,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && r.inStock <= r.lowStockAlert)
      .sort((a, b) => a.inStock - b.inStock);

    const accessoryRows = accessories
      .map((p: any) => {
        const shopStock = shopId ? p.shopStocks?.[0] : undefined;
        const stock = shopId ? Number(shopStock?.stock ?? 0) : Number(p.stock) || 0;
        const alert = Number(shopStock?.lowStockAlert ?? p.lowStockAlert) || 0;
        return {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          unit: p.unit,
          brand: p.brand?.name ?? null,
          stock,
          lowStockAlert: alert,
          price: Number(p.price) || 0,
          isOut: stock <= 0,
          notInShop: Boolean(shopId) && !shopStock,
        };
      })
      .filter((r) => r.stock <= r.lowStockAlert)
      .sort((a, b) => a.stock - b.stock);

    return {
      phones: phoneRows,
      accessories: accessoryRows,
      summary: {
        phoneModelsLow: phoneRows.length,
        phoneModelsOut: phoneRows.filter((r) => r.isOut).length,
        accessoriesLow: accessoryRows.length,
        accessoriesOut: accessoryRows.filter((r) => r.isOut).length,
      },
    };
  }

  // ════════════════════════════════════════════════════════
  // STOCK AGING — kaunsa maal kitna purana pada hai
  // Mobile me ye sab se zaroori report hai: phone jitna purana
  // hoga, uski qeemat utni giregi.
  // ════════════════════════════════════════════════════════

  async stockAging(user: AuthenticatedUser, shopId?: string) {
    const tenantId = user.tenantId;
    const now = Date.now();
    const DAY = 86_400_000;

    const [imeis, usedPhones, accessoryRows] = await Promise.all([
      this.prisma.productImei.findMany({
        where: {
          tenantId,
          status: 'IN_STOCK',
          ...(shopId && { OR: [{ shopId }, { shopId: null }] }),
        },
        select: {
          id: true, imei1: true, costPrice: true, ptaStatus: true, color: true,
          purchasedAt: true, createdAt: true,
          product: { select: { id: true, name: true, price: true, brand: { select: { name: true } } } },
          variant: { select: { id: true, name: true, price: true } },
        },
      }),
      this.prisma.usedPhone.findMany({
        where: { tenantId, status: 'IN_STOCK', ...(shopId && { OR: [{ shopId }, { shopId: null }] }) },
        select: {
          id: true, usedPhoneCode: true, brand: true, model: true, storage: true,
          totalCost: true, resalePrice: true, receivedAt: true, condition: true,
        },
      }),
      // Accessories — inka IMEI nahi hota, is liye ginti se stock chalta hai
      this.prisma.product.findMany({
        where: { tenantId, isActive: true, productImeis: { none: {} } },
        select: {
          id: true, name: true, sku: true, unit: true,
          price: true, costPrice: true, stock: true, lowStockAlert: true,
          updatedAt: true,
          brand: { select: { name: true } },
          category: { select: { name: true } },
          ...(shopId && {
            shopStocks: { where: { shopId, variantId: null }, select: { stock: true }, take: 1 },
          }),
        },
      }),
    ]);

    const BUCKETS = [
      { key: '0-30', label: '0–30 din', min: 0, max: 30 },
      { key: '31-60', label: '31–60 din', min: 31, max: 60 },
      { key: '61-90', label: '61–90 din', min: 61, max: 90 },
      { key: '90+', label: '90+ din', min: 91, max: Infinity },
    ];

    const buckets = BUCKETS.map((b) => ({
      ...b, phones: 0, phoneValue: 0, usedPhones: 0, usedValue: 0,
    }));

    const bucketFor = (days: number) => buckets.find((b) => days >= b.min && days <= b.max) ?? buckets[buckets.length - 1];

    const ageOf = (d: Date | null) => Math.floor((now - new Date(d ?? now).getTime()) / DAY);

    const phoneRows = imeis.map((i) => {
      const days = ageOf(i.purchasedAt ?? i.createdAt);
      const b = bucketFor(days);
      const cost = Number(i.costPrice) || 0;
      b.phones += 1;
      b.phoneValue += cost;
      return {
        kind: 'NEW' as const,
        id: i.id,
        ref: i.imei1,
        name: i.product?.name ?? 'Mobile',
        variantName: i.variant?.name ?? null,
        brand: i.product?.brand?.name ?? null,
        color: i.color,
        ptaStatus: i.ptaStatus,
        cost,
        price: Number(i.variant?.price ?? i.product?.price) || 0,
        ageDays: days,
        bucket: b.key,
      };
    });

    const usedRows = usedPhones.map((p) => {
      const days = ageOf(p.receivedAt);
      const b = bucketFor(days);
      const cost = Number(p.totalCost) || 0;
      b.usedPhones += 1;
      b.usedValue += cost;
      return {
        kind: 'USED' as const,
        id: p.id,
        ref: p.usedPhoneCode,
        name: [p.brand, p.model, p.storage].filter(Boolean).join(' '),
        variantName: null,
        brand: p.brand,
        color: null,
        ptaStatus: null,
        condition: p.condition,
        cost,
        price: Number(p.resalePrice) || 0,
        ageDays: days,
        bucket: b.key,
      };
    });

    const accessories = accessoryRows
      .map((p: any) => {
        const shopStock = shopId ? p.shopStocks?.[0] : undefined;
        const stock = shopId ? Number(shopStock?.stock ?? 0) : Number(p.stock) || 0;
        const unitCost = Number(p.costPrice) || 0;
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          unit: p.unit,
          brand: p.brand?.name ?? null,
          category: p.category?.name ?? null,
          stock,
          unitCost,
          price: Number(p.price) || 0,
          value: stock * unitCost,
          retailValue: stock * (Number(p.price) || 0),
          lowStockAlert: Number(p.lowStockAlert) || 0,
          isLow: stock <= (Number(p.lowStockAlert) || 0),
          isOut: stock <= 0,
        };
      })
      .filter((a) => a.stock > 0 || a.isLow)
      .sort((a, b) => b.value - a.value);

    const inStockAccessories = accessories.filter((a) => a.stock > 0);
    const accessoryUnits = inStockAccessories.reduce((s, a) => s + a.stock, 0);
    const accessoryValue = inStockAccessories.reduce((s, a) => s + a.value, 0);
    const accessoryRetail = inStockAccessories.reduce((s, a) => s + a.retailValue, 0);

    const all = [...phoneRows, ...usedRows].sort((a, b) => b.ageDays - a.ageDays);
    const deadStock = all.filter((r) => r.ageDays > 60);

    const phoneValue = phoneRows.reduce((s, r) => s + r.cost, 0);
    const usedValue = usedRows.reduce((s, r) => s + r.cost, 0);
    const phoneRetail = phoneRows.reduce((s, r) => s + r.price, 0);
    const usedRetail = usedRows.reduce((s, r) => s + r.price, 0);

    return {
      buckets,
      items: all,
      accessories,
      deadStock: {
        count: deadStock.length,
        value: deadStock.reduce((s, r) => s + r.cost, 0),
        items: deadStock.slice(0, 50),
      },
      totals: {
        phones: phoneRows.length,
        phoneValue,
        usedPhones: usedRows.length,
        usedValue,
        accessories: inStockAccessories.length,
        accessoryUnits,
        accessoryValue,
        // Poori dukan ka maal — phone + used + accessories
        totalValue: phoneValue + usedValue + accessoryValue,
        totalRetailValue: phoneRetail + usedRetail + accessoryRetail,
        potentialProfit: (phoneRetail + usedRetail + accessoryRetail) - (phoneValue + usedValue + accessoryValue),
      },
    };
  }

  // ════════════════════════════════════════════════════════
  // PTA STATUS BREAKDOWN
  // ════════════════════════════════════════════════════════

  async ptaBreakdown(user: AuthenticatedUser) {
    const result = await this.prisma.productImei.groupBy({
      by: ['ptaStatus'],
      where: { tenantId: user.tenantId, status: 'IN_STOCK' },
      _count: { _all: true },
      _sum: { ptaTaxPaid: true, costPrice: true },
    });

    return result.map((r) => ({
      ptaStatus: r.ptaStatus,
      count: r._count._all,
      taxPaid: r._sum.ptaTaxPaid ?? 0,
      stockValue: r._sum.costPrice ?? 0,
    }));
  }

  // ════════════════════════════════════════════════════════
  // TOP SELLING BRANDS (from sales)
  // ════════════════════════════════════════════════════════

  async topBrands(user: AuthenticatedUser, days = 30) {
    const cutoff = subDaysTz(startOfDayTz(new Date()), Math.max(1, Math.min(days || 30, 366)) - 1);

    const sales = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId: user.tenantId,
          status: 'COMPLETED',
          soldAt: { gte: cutoff },
        },
        product: {
          brand: { isNot: null },
        },
      },
      include: {
        product: { include: { brand: true } },
      },
    });

    const grouped: Record<string, {
      brandId: string;
      brandName: string;
      unitsSold: number;
      revenue: number;
      profit: number;
    }> = {};

    sales.forEach((item) => {
      if (!item.product) return;
      const brand = item.product.brand;
      if (!brand) return;
      if (!grouped[brand.id]) {
        grouped[brand.id] = {
          brandId: brand.id,
          brandName: brand.name,
          unitsSold: 0,
          revenue: 0,
          profit: 0,
        };
      }
      grouped[brand.id].unitsSold += Number(item.quantity);
      grouped[brand.id].revenue += Number(item.total);
      grouped[brand.id].profit += Number(item.total) - (Number(item.costPrice) * Number(item.quantity));
    });

    return Object.values(grouped)
      .map((g) => ({
        ...g,
        unitsSold: Number(g.unitsSold.toFixed(0)),
        revenue: Number(g.revenue.toFixed(2)),
        profit: Number(g.profit.toFixed(2)),
        margin: g.revenue > 0 ? Number(((g.profit / g.revenue) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  // ════════════════════════════════════════════════════════
  // REPAIR ANALYTICS
  // ════════════════════════════════════════════════════════

  async repairAnalytics(user: AuthenticatedUser, days = 30) {
    const cutoff = subDaysTz(startOfDayTz(new Date()), Math.max(1, Math.min(days || 30, 366)) - 1);

    const [byStatus, deliveredAgg, topIssues, usedParts] = await Promise.all([
      this.prisma.repairTicket.groupBy({
        by: ['status'],
        where: { tenantId: user.tenantId, receivedAt: { gte: cutoff } },
        _count: { _all: true },
      }),
      this.prisma.repairTicket.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'DELIVERED',
          deliveredAt: { gte: cutoff },
        },
        _sum: { totalCost: true, partsCost: true, laborCost: true, paidAmount: true },
        _count: { _all: true },
      }),
      this.prisma.repairTicket.groupBy({
        by: ['deviceBrand'],
        where: { tenantId: user.tenantId, receivedAt: { gte: cutoff } },
        _count: { _all: true },
        orderBy: { _count: { deviceBrand: 'desc' } },
        take: 10,
      }),
      // What the parts cost the shop (partsCost on the ticket is the price charged).
      this.prisma.repairPart.findMany({
        where: { ticket: { tenantId: user.tenantId, status: 'DELIVERED', deliveredAt: { gte: cutoff } } },
        select: { quantity: true, unitCost: true },
      }),
    ]);
    const partsOwnCost = usedParts.reduce((sum, p) => sum + Number(p.quantity) * Number(p.unitCost || 0), 0);

    return {
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      delivered: deliveredAgg._count._all,
      totalRevenue: deliveredAgg._sum.totalCost ?? 0,
      partsCost: deliveredAgg._sum.partsCost ?? 0,
      laborRevenue: deliveredAgg._sum.laborCost ?? 0,
      collected: deliveredAgg._sum.paidAmount ?? 0,
      partsOwnCost,
      grossProfit: (deliveredAgg._sum.totalCost ?? 0) - partsOwnCost,
      topBrands: topIssues.map((b) => ({ brand: b.deviceBrand, count: b._count._all })),
    };
  }

  // ════════════════════════════════════════════════════════
  // EMI ANALYTICS
  // ════════════════════════════════════════════════════════

  async emiAnalytics(user: AuthenticatedUser) {
    const today = startOfDayTz(new Date());
    const monthStart = startOfMonthTz(new Date());

    const [byStatus, financingTotals, overdueAgg, collectedAgg] = await Promise.all([
      this.prisma.emiPlan.groupBy({
        by: ['status'],
        where: { tenantId: user.tenantId },
        _count: { _all: true },
        _sum: { financedAmount: true, remainingAmount: true },
      }),
      this.prisma.emiPlan.aggregate({
        where: { tenantId: user.tenantId, status: 'ACTIVE' },
        _sum: { financedAmount: true, paidAmount: true, remainingAmount: true },
      }),
      this.prisma.emiInstallment.aggregate({
        where: {
          plan: { tenantId: user.tenantId, status: 'ACTIVE' },
          status: { in: ['PENDING', 'OVERDUE'] },
          dueDate: { lt: today },
        },
        _sum: { amount: true, paidAmount: true },
        _count: { _all: true },
      }),
      // Installment money as it reached the khata (part payments included).
      this.prisma.customerLedger.aggregate({
        where: { tenantId: user.tenantId, type: 'PAYMENT_RECEIVED', reference: { startsWith: 'EMI-' }, createdAt: { gte: monthStart } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    return {
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count._all,
        financed: s._sum.financedAmount ?? 0,
        remaining: s._sum.remainingAmount ?? 0,
      })),
      activeFinanced: financingTotals._sum.financedAmount ?? 0,
      activePaid: financingTotals._sum.paidAmount ?? 0,
      activeRemaining: financingTotals._sum.remainingAmount ?? 0,
      overdueCount: overdueAgg._count._all,
      overdueAmount: (overdueAgg._sum.amount ?? 0) - (overdueAgg._sum.paidAmount ?? 0),
      collectedThisMonth: -(collectedAgg._sum.amount ?? 0),
      collectedCountThisMonth: collectedAgg._count._all,
    };
  }

  // ════════════════════════════════════════════════════════
  // USED PHONE ANALYTICS
  // ════════════════════════════════════════════════════════

  async usedPhoneAnalytics(user: AuthenticatedUser, days = 30) {
    const cutoff = subDaysTz(startOfDayTz(new Date()), Math.max(1, Math.min(days || 30, 366)) - 1);

    const [byCondition, soldAgg, inStockAgg] = await Promise.all([
      this.prisma.usedPhone.groupBy({
        by: ['condition'],
        where: { tenantId: user.tenantId, status: 'IN_STOCK' },
        _count: { _all: true },
        _sum: { totalCost: true, resalePrice: true },
      }),
      this.prisma.usedPhone.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'SOLD',
          soldAt: { gte: cutoff },
        },
        _sum: { totalCost: true, finalSoldPrice: true },
        _count: { _all: true },
      }),
      this.prisma.usedPhone.aggregate({
        where: { tenantId: user.tenantId, status: 'IN_STOCK' },
        _sum: { totalCost: true, resalePrice: true },
        _count: { _all: true },
      }),
    ]);

    return {
      byCondition: byCondition.map((c) => ({
        condition: c.condition,
        count: c._count._all,
        totalCost: c._sum.totalCost ?? 0,
        resalePrice: c._sum.resalePrice ?? 0,
      })),
      soldCount: soldAgg._count._all,
      soldRevenue: soldAgg._sum.finalSoldPrice ?? 0,
      soldCogs: soldAgg._sum.totalCost ?? 0,
      soldProfit: (soldAgg._sum.finalSoldPrice ?? 0) - (soldAgg._sum.totalCost ?? 0),
      inStockCount: inStockAgg._count._all,
      inStockCost: inStockAgg._sum.totalCost ?? 0,
      inStockResale: inStockAgg._sum.resalePrice ?? 0,
      inStockPotentialProfit: (inStockAgg._sum.resalePrice ?? 0) - (inStockAgg._sum.totalCost ?? 0),
    };
  }
}
