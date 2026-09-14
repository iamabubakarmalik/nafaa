import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

/**
 * AppliancesAnalyticsService — home appliances wale ka asli hisab kitab.
 *
 * Electronics ya retail shop ki kamai sirf maal bechne se aati hai.
 * Home appliances wale ki kamai PAANCH raston se aati hai:
 *
 *   1. Maal ki bikri        — fridge, AC, washing machine…
 *   2. Installation         — AC lagana, geyser fit karna (labor + material)
 *   3. Repair / Service     — gas refill, motor change, deep cleaning
 *   4. AMC contracts        — saal bhar ka maintenance package
 *   5. Delivery             — bhari saman ka kiraya, loading/unloading, floor charge
 *
 * Agar sirf product ka munafa dekho to aadha karobaar nazar hi nahi aata.
 * Is liye yahan paanchon alag alag bhi milte hain aur mila kar bhi.
 *
 * NOTE: ApplianceProductProfile ka Product se Prisma relation nahi hai
 * (sirf productId hai), is liye join JS me hota hai — bilkul waise hi
 * jaise ElectronicsProductProfile me.
 */
@Injectable()
export class AppliancesAnalyticsService {
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
  // PROFIT — maal + installation + repair + AMC + delivery
  // ══════════════════════════════════════════════════════════
  async profitBreakdown(
    user: AuthenticatedUser,
    params: { from?: string; to?: string; shopId?: string } = {},
  ) {
    const { gte, lte } = this.dateRange(params.from, params.to);
    const tenantId = user.tenantId;

    const [sales, profiles, brands, installations, services, amcs, deliveries] = await Promise.all([
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
              product: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.applianceProductProfile.findMany({
        where: { tenantId },
        select: {
          productId: true, categoryType: true, brandId: true,
          energyRating: true, isInverter: true, requiresSerial: true,
        },
      }),
      // Brand ab global table se aata hai — ApplianceBrand ko 2026-09-14
      // ko Brand me mila diya gaya tha (do alag "Haier" ban jati thin).
      this.prisma.brand.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      }),
      // Installation — labor + material, jo customer ne diya
      this.prisma.applianceInstallation.findMany({
        where: { tenantId, status: 'COMPLETED', completedAt: { gte, lte } },
        select: {
          id: true, serviceType: true, completedAt: true, technicianId: true, technicianName: true,
          laborCharge: true, materialsCharge: true, visitCharge: true,
          totalCharge: true, paidByCustomer: true, covered_underWarranty: true,
          customerRating: true,
        },
      }),
      // Repair / service — parts ka kharcha cost hai, baqi kamai
      this.prisma.applianceServiceRequest.findMany({
        where: { tenantId, status: 'COMPLETED', completedAt: { gte, lte } },
        select: {
          id: true, serviceType: true, completedAt: true, requestedAt: true,
          technicianId: true, technicianName: true, issueCategory: true,
          visitCharge: true, laborCharge: true, partsCharge: true,
          totalCharge: true, paidAmount: true,
          coveredUnderWarranty: true, coveredUnderAmc: true,
          customerRating: true, productName: true,
        },
      }),
      // AMC — is arse me jo paisa aaya
      this.prisma.applianceAmcContract.findMany({
        where: { tenantId, createdAt: { gte, lte } },
        select: { id: true, amcType: true, contractValue: true, paidAmount: true, createdAt: true },
      }),
      // Delivery — bhari saman ka kiraya
      this.prisma.applianceDelivery.findMany({
        where: { tenantId, status: 'DELIVERED', deliveredAt: { gte, lte } },
        select: {
          id: true, deliveredAt: true, deliveryCharge: true,
          loadingCharge: true, unloadingCharge: true, floorCharge: true, totalCharge: true,
        },
      }),
    ]);

    const profileByProduct = new Map(profiles.map((p) => [p.productId, p]));
    const brandName = new Map(brands.map((b) => [b.id, b.name]));

    type Bucket = { revenue: number; cost: number; profit: number; units: number };
    const blank = (): Bucket => ({ revenue: 0, cost: 0, profit: 0, units: 0 });

    const byCategory = new Map<string, Bucket>();
    const byBrand = new Map<string, Bucket & { id: string; name: string }>();
    const byEnergy = new Map<string, Bucket>();
    const byProduct = new Map<string, Bucket & { id: string; name: string; category: string | null }>();
    const daily = new Map<string, { date: string; revenue: number; profit: number; services: number }>();

    const goods = blank();
    let posServiceIncome = 0;
    let posServiceCost = 0;

    const touchDay = (d: Date) => {
      const key = d.toISOString().slice(0, 10);
      const day = daily.get(key) ?? { date: key, revenue: 0, profit: 0, services: 0 };
      daily.set(key, day);
      return day;
    };

    for (const sale of sales) {
      // POS par lagaye gaye delivery/installation charges — ye item par nahi
      // poori sale par lagte hain, is liye alag ginti.
      posServiceIncome += Number(sale.serviceCharges) || 0;
      for (const sc of (Array.isArray(sale.serviceChargesBreakdown)
        ? (sale.serviceChargesBreakdown as any[])
        : [])) {
        posServiceCost += Number(sc?.cost) || 0;
      }

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
        add(goods);

        const prof = item.productId ? profileByProduct.get(item.productId) : undefined;

        const cat = prof?.categoryType ?? 'OTHER';
        const c = byCategory.get(cat) ?? blank(); add(c); byCategory.set(cat, c);

        const energy = prof?.isInverter ? 'INVERTER' : (prof?.energyRating ?? 'NOT_RATED');
        const en = byEnergy.get(energy) ?? blank(); add(en); byEnergy.set(energy, en);

        if (prof?.brandId) {
          const b = byBrand.get(prof.brandId)
            ?? { ...blank(), id: prof.brandId, name: brandName.get(prof.brandId) ?? 'Brand' };
          add(b); byBrand.set(prof.brandId, b);
        }

        if (item.productId && item.product) {
          const p = byProduct.get(item.productId)
            ?? { ...blank(), id: item.productId, name: item.product.name, category: prof?.categoryType ?? null };
          add(p); byProduct.set(item.productId, p);
        }

        const day = touchDay(sale.soldAt);
        day.revenue += revenue;
        day.profit += profit;
      }
    }

    // ── Installation ──────────────────────────────────────────
    // Material ki lagat cost hai, labor + visit khaalis kamai.
    // Warranty me covered installation ki kamai 0 hoti hai lekin
    // material ka kharcha phir bhi dukaan ke sar par aata hai.
    let instRevenue = 0, instCost = 0, instJobs = 0, instFree = 0;
    const byServiceType = new Map<string, { type: string; jobs: number; revenue: number; cost: number; profit: number }>();
    const addServiceType = (type: string, revenue: number, cost: number) => {
      const s = byServiceType.get(type) ?? { type, jobs: 0, revenue: 0, cost: 0, profit: 0 };
      s.jobs += 1; s.revenue += revenue; s.cost += cost; s.profit += revenue - cost;
      byServiceType.set(type, s);
    };

    for (const i of installations) {
      const revenue = Number(i.totalCharge) || 0;
      const cost = Number(i.materialsCharge) || 0;
      instRevenue += revenue;
      instCost += cost;
      instJobs += 1;
      if (i.covered_underWarranty || revenue === 0) instFree += 1;
      addServiceType(i.serviceType ?? 'INSTALLATION', revenue, cost);
      if (i.completedAt) {
        const day = touchDay(i.completedAt);
        day.revenue += revenue;
        day.profit += revenue - cost;
        day.services += revenue;
      }
    }

    // ── Repair / Service ──────────────────────────────────────
    let svcRevenue = 0, svcCost = 0, svcJobs = 0, svcWarranty = 0, svcAmc = 0, svcUnpaid = 0;
    const byIssue = new Map<string, { issue: string; jobs: number; revenue: number }>();

    for (const s of services) {
      const revenue = Number(s.totalCharge) || 0;
      const cost = Number(s.partsCharge) || 0;
      svcRevenue += revenue;
      svcCost += cost;
      svcJobs += 1;
      if (s.coveredUnderWarranty) svcWarranty += 1;
      if (s.coveredUnderAmc) svcAmc += 1;
      svcUnpaid += Math.max(revenue - (Number(s.paidAmount) || 0), 0);
      addServiceType(s.serviceType ?? 'REPAIR', revenue, cost);

      const issue = (s.issueCategory ?? 'Aam kharabi').trim() || 'Aam kharabi';
      const iss = byIssue.get(issue) ?? { issue, jobs: 0, revenue: 0 };
      iss.jobs += 1; iss.revenue += revenue; byIssue.set(issue, iss);

      if (s.completedAt) {
        const day = touchDay(s.completedAt);
        day.revenue += revenue;
        day.profit += revenue - cost;
        day.services += revenue;
      }
    }

    // ── AMC ───────────────────────────────────────────────────
    let amcRevenue = 0, amcBilled = 0;
    const byAmcType = new Map<string, { type: string; count: number; value: number; paid: number }>();
    for (const a of amcs) {
      const paid = Number(a.paidAmount) || 0;
      amcRevenue += paid;
      amcBilled += Number(a.contractValue) || 0;
      const t = byAmcType.get(a.amcType) ?? { type: a.amcType, count: 0, value: 0, paid: 0 };
      t.count += 1; t.value += Number(a.contractValue) || 0; t.paid += paid;
      byAmcType.set(a.amcType, t);
      const day = touchDay(a.createdAt);
      day.revenue += paid;
      day.profit += paid;
      day.services += paid;
    }

    // ── Delivery ──────────────────────────────────────────────
    let delRevenue = 0, delTrips = 0;
    for (const d of deliveries) {
      const revenue = Number(d.totalCharge)
        || (Number(d.deliveryCharge) || 0) + (Number(d.loadingCharge) || 0)
         + (Number(d.unloadingCharge) || 0) + (Number(d.floorCharge) || 0);
      delRevenue += revenue;
      delTrips += 1;
      if (d.deliveredAt) {
        const day = touchDay(d.deliveredAt);
        day.revenue += revenue;
        day.profit += revenue;
        day.services += revenue;
      }
    }

    const withMargin = <T extends Bucket>(b: T) => ({
      ...b,
      margin: b.revenue > 0 ? (b.profit / b.revenue) * 100 : 0,
    });

    const serviceIncome = instRevenue + svcRevenue + amcRevenue + delRevenue + posServiceIncome;
    const serviceCost = instCost + svcCost + posServiceCost;

    const grandRevenue = goods.revenue + serviceIncome;
    const grandCost = goods.cost + serviceCost;

    return {
      range: { from: gte.toISOString(), to: lte.toISOString() },

      /** Sab kuch mila kar — maal + saari services */
      totals: {
        revenue: grandRevenue,
        cost: grandCost,
        profit: grandRevenue - grandCost,
        margin: grandRevenue > 0 ? ((grandRevenue - grandCost) / grandRevenue) * 100 : 0,
        units: goods.units,
        salesCount: sales.length,
      },

      /** Sirf maal bechne ka munafa — services isme shamil nahi */
      goods: withMargin(goods),

      /** Paanch kamai ke raste alag alag — kaunsa raasta kitna de raha hai */
      streams: [
        { key: 'GOODS', label: 'Maal ki bikri', revenue: goods.revenue, cost: goods.cost, profit: goods.profit, count: sales.length },
        { key: 'INSTALLATION', label: 'Installation', revenue: instRevenue, cost: instCost, profit: instRevenue - instCost, count: instJobs },
        { key: 'SERVICE', label: 'Repair / Service', revenue: svcRevenue, cost: svcCost, profit: svcRevenue - svcCost, count: svcJobs },
        { key: 'AMC', label: 'AMC contracts', revenue: amcRevenue, cost: 0, profit: amcRevenue, count: amcs.length },
        { key: 'DELIVERY', label: 'Delivery', revenue: delRevenue, cost: 0, profit: delRevenue, count: delTrips },
        { key: 'POS_SERVICES', label: 'POS par lagaye charges', revenue: posServiceIncome, cost: posServiceCost, profit: posServiceIncome - posServiceCost, count: 0 },
      ].filter((s) => s.revenue !== 0 || s.count > 0),

      installations: {
        jobs: instJobs,
        revenue: instRevenue,
        materialCost: instCost,
        profit: instRevenue - instCost,
        freeJobs: instFree,
        avgTicket: instJobs ? instRevenue / instJobs : 0,
      },

      services: {
        jobs: svcJobs,
        revenue: svcRevenue,
        partsCost: svcCost,
        profit: svcRevenue - svcCost,
        warrantyJobs: svcWarranty,
        amcJobs: svcAmc,
        /** Jo kaam ho gaya lekin paisa abhi baqi hai */
        unpaid: svcUnpaid,
        avgTicket: svcJobs ? svcRevenue / svcJobs : 0,
      },

      amc: { contracts: amcs.length, billed: amcBilled, collected: amcRevenue, pending: amcBilled - amcRevenue, byType: [...byAmcType.values()] },

      delivery: { trips: delTrips, revenue: delRevenue, avgTrip: delTrips ? delRevenue / delTrips : 0 },

      byCategory: [...byCategory.entries()]
        .map(([categoryType, b]) => ({ categoryType, ...withMargin(b) }))
        .sort((a, b) => b.profit - a.profit),
      byEnergyRating: [...byEnergy.entries()]
        .map(([energyRating, b]) => ({ energyRating, ...withMargin(b) }))
        .sort((a, b) => b.profit - a.profit),
      topBrands: [...byBrand.values()].map(withMargin).sort((a, b) => b.profit - a.profit).slice(0, 10),
      topProducts: [...byProduct.values()].map(withMargin).sort((a, b) => b.profit - a.profit).slice(0, 25),
      byServiceType: [...byServiceType.values()].sort((a, b) => b.revenue - a.revenue),
      topIssues: [...byIssue.values()].sort((a, b) => b.jobs - a.jobs).slice(0, 12),

      daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  // ══════════════════════════════════════════════════════════
  // LOW STOCK — serial wale models bhi shamil
  // ══════════════════════════════════════════════════════════
  async lowStock(user: AuthenticatedUser, shopId?: string) {
    const tenantId = user.tenantId;

    const [products, profiles, brands, serialCounts] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true, name: true, sku: true, unit: true, price: true, costPrice: true,
          stock: true, lowStockAlert: true,
          category: { select: { name: true } },
          ...(shopId && {
            shopStocks: { where: { shopId, variantId: null }, select: { stock: true, lowStockAlert: true }, take: 1 },
          }),
        },
      }),
      this.prisma.applianceProductProfile.findMany({
        where: { tenantId },
        select: {
          productId: true, categoryType: true, brandId: true, requiresSerial: true,
          warrantyMonths: true, requiresInstallation: true, installationCharge: true,
          modelNumber: true, capacity: true, energyRating: true, isInverter: true,
        },
      }),
      this.prisma.brand.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      this.prisma.applianceSerialTracking.groupBy({
        by: ['productId'],
        where: { tenantId, status: 'IN_STOCK' },
        _count: { _all: true },
      }),
    ]);

    const profileByProduct = new Map(profiles.map((p) => [p.productId, p]));
    const brandName = new Map(brands.map((b) => [b.id, b.name]));
    const serialByProduct = new Map(serialCounts.map((s) => [s.productId, s._count._all]));

    const rows = products.map((p: any) => {
      const prof = profileByProduct.get(p.id);
      const shopStock = shopId ? p.shopStocks?.[0] : undefined;
      const plainStock = shopId ? Number(shopStock?.stock ?? 0) : Number(p.stock) || 0;
      const serialStock = serialByProduct.get(p.id) ?? 0;

      // Serial wale appliance ki asli ginti serial register se aati hai —
      // Product.stock aur serial dono alag alag chalte hain.
      const stock = prof?.requiresSerial ? serialStock : plainStock;
      const alert = Number(shopStock?.lowStockAlert ?? p.lowStockAlert) || 0;
      const costPrice = Number(p.costPrice) || 0;

      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        brand: prof?.brandId ? brandName.get(prof.brandId) ?? null : null,
        category: p.category?.name ?? null,
        categoryType: prof?.categoryType ?? null,
        modelNumber: prof?.modelNumber ?? null,
        capacity: prof?.capacity ?? null,
        energyRating: prof?.isInverter ? 'INVERTER' : (prof?.energyRating ?? null),
        requiresSerial: prof?.requiresSerial ?? false,
        requiresInstallation: prof?.requiresInstallation ?? false,
        installationCharge: Number(prof?.installationCharge) || 0,
        warrantyMonths: prof?.warrantyMonths ?? 0,
        stock,
        lowStockAlert: alert,
        price: Number(p.price) || 0,
        costPrice,
        stockValue: stock * costPrice,
        /** Dobara mangwane par kitna paisa lagega */
        reorderCost: Math.max(alert - stock, 1) * costPrice,
        isOut: stock <= 0,
        notInShop: Boolean(shopId) && !shopStock && !prof?.requiresSerial,
      };
    });

    const low = rows.filter((r) => r.stock <= r.lowStockAlert).sort((a, b) => a.stock - b.stock);

    const byCategory = new Map<string, { categoryType: string; count: number; value: number }>();
    for (const r of low) {
      const key = r.categoryType ?? 'OTHER';
      const c = byCategory.get(key) ?? { categoryType: key, count: 0, value: 0 };
      c.count += 1; c.value += r.reorderCost; byCategory.set(key, c);
    }

    return {
      items: low,
      byCategory: [...byCategory.values()].sort((a, b) => b.count - a.count),
      summary: {
        totalLow: low.length,
        totalOut: low.filter((r) => r.isOut).length,
        serialTrackedLow: low.filter((r) => r.requiresSerial).length,
        valueAtRisk: low.reduce((s, r) => s + r.stockValue, 0),
        reorderCost: low.reduce((s, r) => s + r.reorderCost, 0),
      },
    };
  }

  // ══════════════════════════════════════════════════════════
  // STOCK — value, umar, aur khatam hoti warranty
  // (appliances me compressor/motor ki warranty alag hoti hai)
  // ══════════════════════════════════════════════════════════
  async stockReport(user: AuthenticatedUser, shopId?: string) {
    const tenantId = user.tenantId;
    const now = Date.now();
    const DAY = 86_400_000;

    const [products, profiles, brands, serials] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true, name: true, sku: true, unit: true, price: true, costPrice: true,
          stock: true, lowStockAlert: true, updatedAt: true,
          ...(shopId && {
            shopStocks: { where: { shopId, variantId: null }, select: { stock: true }, take: 1 },
          }),
        },
      }),
      this.prisma.applianceProductProfile.findMany({
        where: { tenantId },
        select: {
          productId: true, categoryType: true, brandId: true, requiresSerial: true,
          modelNumber: true, capacity: true, energyRating: true, isInverter: true,
        },
      }),
      this.prisma.brand.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      this.prisma.applianceSerialTracking.findMany({
        where: { tenantId, status: 'IN_STOCK' },
        select: {
          id: true, productId: true, serialNumber: true, modelNumber: true, batchNumber: true,
          purchasePrice: true, purchaseDate: true, createdAt: true, manufactureDate: true,
          warrantyEndDate: true, compressorWarrantyEndDate: true, motorWarrantyEndDate: true,
          installationStatus: true,
        },
      }),
    ]);

    const profileByProduct = new Map(profiles.map((p) => [p.productId, p]));
    const productById = new Map(products.map((p) => [p.id, p]));
    const brandName = new Map(brands.map((b) => [b.id, b.name]));

    const BUCKETS = [
      { key: '0-30', label: '0–30 din', min: 0, max: 30 },
      { key: '31-60', label: '31–60 din', min: 31, max: 60 },
      { key: '61-90', label: '61–90 din', min: 61, max: 90 },
      { key: '90+', label: '90+ din', min: 91, max: Infinity },
    ];
    const buckets = BUCKETS.map((b) => ({ ...b, units: 0, value: 0 }));
    const bucketFor = (days: number) =>
      buckets.find((b) => days >= b.min && days <= b.max) ?? buckets[buckets.length - 1];

    const daysLeft = (d: Date | null) =>
      d ? Math.floor((new Date(d).getTime() - now) / DAY) : null;

    const serialRows = serials.map((sr) => {
      const days = Math.floor((now - new Date(sr.purchaseDate ?? sr.createdAt).getTime()) / DAY);
      const cost = Number(sr.purchasePrice) || 0;
      const b = bucketFor(days);
      b.units += 1;
      b.value += cost;

      const product = productById.get(sr.productId);
      const prof = profileByProduct.get(sr.productId);

      return {
        id: sr.id,
        productId: sr.productId,
        name: product?.name ?? 'Product',
        brand: prof?.brandId ? brandName.get(prof.brandId) ?? null : null,
        categoryType: prof?.categoryType ?? null,
        capacity: prof?.capacity ?? null,
        energyRating: prof?.isInverter ? 'INVERTER' : (prof?.energyRating ?? null),
        serialNumber: sr.serialNumber,
        modelNumber: sr.modelNumber ?? prof?.modelNumber ?? null,
        batchNumber: sr.batchNumber,
        manufactureDate: sr.manufactureDate,
        cost,
        price: Number(product?.price) || 0,
        ageDays: days,
        bucket: b.key,
        installationStatus: sr.installationStatus,
        warrantyEndDate: sr.warrantyEndDate,
        warrantyDaysLeft: daysLeft(sr.warrantyEndDate),
        compressorWarrantyEndDate: sr.compressorWarrantyEndDate,
        compressorDaysLeft: daysLeft(sr.compressorWarrantyEndDate),
        motorWarrantyEndDate: sr.motorWarrantyEndDate,
        motorDaysLeft: daysLeft(sr.motorWarrantyEndDate),
      };
    });

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
          brand: prof?.brandId ? brandName.get(prof.brandId) ?? null : null,
          categoryType: prof?.categoryType ?? null,
          stock,
          unitCost,
          price: Number(p.price) || 0,
          value: stock * unitCost,
          retailValue: stock * (Number(p.price) || 0),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.value - a.value);

    // Category ke hisab se stock — fridge me kitna paisa phansa hai, AC me kitna
    const byCategory = new Map<string, { categoryType: string; units: number; value: number }>();
    for (const r of serialRows) {
      const key = r.categoryType ?? 'OTHER';
      const c = byCategory.get(key) ?? { categoryType: key, units: 0, value: 0 };
      c.units += 1; c.value += r.cost; byCategory.set(key, c);
    }
    for (const r of plainRows) {
      const key = r.categoryType ?? 'OTHER';
      const c = byCategory.get(key) ?? { categoryType: key, units: 0, value: 0 };
      c.units += r.stock; c.value += r.value; byCategory.set(key, c);
    }

    const serialValue = serialRows.reduce((s, r) => s + r.cost, 0);
    const serialRetail = serialRows.reduce((s, r) => s + r.price, 0);
    const plainValue = plainRows.reduce((s, r) => s + r.value, 0);
    const plainRetail = plainRows.reduce((s, r) => s + r.retailValue, 0);

    const deadStock = serialRows.filter((r) => r.ageDays > 60);

    // Appliance ki warranty teen alag hoti hai — main, compressor, motor.
    // Jo pehle khatam ho rahi ho wohi customer ko batani hai.
    const expiringWarranty = serialRows
      .map((r) => {
        const all = [
          r.warrantyDaysLeft !== null ? { kind: 'MAIN', days: r.warrantyDaysLeft } : null,
          r.compressorDaysLeft !== null ? { kind: 'COMPRESSOR', days: r.compressorDaysLeft } : null,
          r.motorDaysLeft !== null ? { kind: 'MOTOR', days: r.motorDaysLeft } : null,
        ].filter((x): x is { kind: string; days: number } => x !== null && x.days >= 0);
        if (!all.length) return null;
        const soonest = all.sort((a, b) => a.days - b.days)[0];
        return soonest.days <= 30 ? { ...r, expiringKind: soonest.kind, expiringDays: soonest.days } : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => a.expiringDays - b.expiringDays);

    // Jo bik gaya lekin abhi tak lag nahi — ye dukaan ka adhoora kaam hai
    const pendingInstall = serialRows.filter(
      (r) => r.installationStatus === 'PENDING' || r.installationStatus === 'SCHEDULED',
    );

    return {
      buckets,
      byCategory: [...byCategory.values()].sort((a, b) => b.value - a.value),
      serials: serialRows.sort((a, b) => b.ageDays - a.ageDays),
      products: plainRows,
      deadStock: {
        count: deadStock.length,
        value: deadStock.reduce((s, r) => s + r.cost, 0),
        items: deadStock.slice(0, 50),
      },
      expiringWarranty: { count: expiringWarranty.length, items: expiringWarranty.slice(0, 50) },
      pendingInstall: { count: pendingInstall.length, items: pendingInstall.slice(0, 50) },
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

  // ══════════════════════════════════════════════════════════
  // SERVICE DESK — repair + installation ka poora record
  // Dukaan-daar ka asal sawal: kaam time par ho raha hai ya nahi,
  // kaun sa technician chal raha hai, aur paisa kahan atka hua hai.
  // ══════════════════════════════════════════════════════════
  async serviceAnalytics(
    user: AuthenticatedUser,
    params: { from?: string; to?: string } = {},
  ) {
    const { gte, lte } = this.dateRange(params.from, params.to);
    const tenantId = user.tenantId;
    const HOUR = 3_600_000;
    const now = new Date();

    const [services, installations, technicians, amcs] = await Promise.all([
      this.prisma.applianceServiceRequest.findMany({
        where: { tenantId, requestedAt: { gte, lte } },
        select: {
          id: true, requestNumber: true, serviceType: true, status: true, priority: true,
          productName: true, issueCategory: true, reportedIssue: true,
          customerId: true, customerName: true, customerPhone: true, city: true, area: true,
          requestedAt: true, scheduledDate: true, arrivedAt: true, workStartedAt: true, completedAt: true,
          technicianId: true, technicianName: true,
          visitCharge: true, laborCharge: true, partsCharge: true, totalCharge: true, paidAmount: true,
          coveredUnderWarranty: true, coveredUnderAmc: true,
          requiresFollowUp: true, followUpDate: true, followUpReason: true,
          customerRating: true,
        },
      }),
      this.prisma.applianceInstallation.findMany({
        where: { tenantId, createdAt: { gte, lte } },
        select: {
          id: true, installationNumber: true, serviceType: true, status: true,
          productName: true, customerName: true, customerPhone: true, city: true,
          createdAt: true, scheduledDate: true, arrivedAt: true, startedAt: true, completedAt: true,
          technicianId: true, technicianName: true,
          laborCharge: true, materialsCharge: true, visitCharge: true,
          totalCharge: true, paidByCustomer: true, covered_underWarranty: true,
          customerRating: true, demoGiven: true,
        },
      }),
      this.prisma.applianceTechnician.findMany({
        where: { tenantId },
        select: {
          id: true, name: true, phone: true, employeeCode: true, isActive: true,
          commissionPct: true, visitChargeRate: true, hourlyRate: true,
          avgRating: true, currentZone: true, specializations: true,
        },
      }),
      this.prisma.applianceAmcContract.findMany({
        where: { tenantId, status: 'ACTIVE' },
        select: {
          id: true, contractNumber: true, customerName: true, customerPhone: true,
          expiryDate: true, freeVisitsAllowed: true, freeVisitsUsed: true, contractValue: true, paidAmount: true,
        },
      }),
    ]);

    /* ── Status funnel ─────────────────────────────────────── */
    const statusCount = new Map<string, number>();
    for (const s of services) statusCount.set(s.status, (statusCount.get(s.status) ?? 0) + 1);

    const OPEN_STATES = ['REQUESTED', 'SCHEDULED', 'TECHNICIAN_ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'PENDING_PARTS'];
    const open = services.filter((s) => OPEN_STATES.includes(s.status));
    const completed = services.filter((s) => s.status === 'COMPLETED');
    const unresolved = services.filter((s) => s.status === 'UNRESOLVED');

    /* Jo schedule ho chuka tha lekin din guzar gaya aur kaam nahi hua */
    const overdue = open.filter((s) => s.scheduledDate && new Date(s.scheduledDate) < now);

    /* ── Kitni der me kaam hua ─────────────────────────────── */
    const resolutionHours = completed
      .filter((s) => s.completedAt)
      .map((s) => (new Date(s.completedAt!).getTime() - new Date(s.requestedAt).getTime()) / HOUR);
    const avgResolutionHours = resolutionHours.length
      ? resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length
      : 0;
    const sameDayFixes = completed.filter(
      (s) => s.completedAt &&
        new Date(s.completedAt).toDateString() === new Date(s.requestedAt).toDateString(),
    ).length;

    /* Pehli hi visit me theek ho gaya? (parts ka intezar nahi karna para) */
    const firstVisitFix = completed.filter((s) => !s.requiresFollowUp).length;

    /* ── Technician performance ────────────────────────────── */
    type Tech = {
      id: string; name: string; phone: string; employeeCode: string;
      isActive: boolean; zone: string | null; specializations: string[];
      serviceJobs: number; installJobs: number; completed: number; open: number;
      revenue: number; partsCost: number; profit: number; commission: number;
      ratings: number[]; avgRating: number | null;
      hours: number[]; avgHours: number;
      unpaid: number;
    };
    const techMap = new Map<string, Tech>();
    const blankTech = (t: (typeof technicians)[number]): Tech => ({
      id: t.id, name: t.name, phone: t.phone, employeeCode: t.employeeCode,
      isActive: t.isActive, zone: t.currentZone, specializations: t.specializations ?? [],
      serviceJobs: 0, installJobs: 0, completed: 0, open: 0,
      revenue: 0, partsCost: 0, profit: 0, commission: 0,
      ratings: [], avgRating: null, hours: [], avgHours: 0, unpaid: 0,
    });
    for (const t of technicians) techMap.set(t.id, blankTech(t));
    const commissionPct = new Map(technicians.map((t) => [t.id, Number(t.commissionPct) || 0]));

    /** Jo technician record se hat chuka ho uska kaam bhi ginna zaroori hai */
    const ensureTech = (id: string | null, name: string | null): Tech | null => {
      if (!id) return null;
      let t = techMap.get(id);
      if (!t) {
        t = {
          ...blankTech({
            id, name: name ?? 'Purana technician', phone: '', employeeCode: '—',
            isActive: false, commissionPct: 0, visitChargeRate: 0, hourlyRate: 0,
            avgRating: null, currentZone: null, specializations: [],
          } as any),
        };
        techMap.set(id, t);
      }
      return t;
    };

    for (const s of services) {
      const t = ensureTech(s.technicianId, s.technicianName);
      if (!t) continue;
      t.serviceJobs += 1;
      if (s.status === 'COMPLETED') {
        t.completed += 1;
        const rev = Number(s.totalCharge) || 0;
        const parts = Number(s.partsCharge) || 0;
        t.revenue += rev;
        t.partsCost += parts;
        t.profit += rev - parts;
        t.commission += rev * ((commissionPct.get(t.id) ?? 0) / 100);
        t.unpaid += Math.max(rev - (Number(s.paidAmount) || 0), 0);
        if (s.customerRating) t.ratings.push(s.customerRating);
        if (s.completedAt) {
          t.hours.push((new Date(s.completedAt).getTime() - new Date(s.requestedAt).getTime()) / HOUR);
        }
      } else if (OPEN_STATES.includes(s.status)) {
        t.open += 1;
      }
    }

    for (const i of installations) {
      const t = ensureTech(i.technicianId, i.technicianName);
      if (!t) continue;
      t.installJobs += 1;
      if (i.status === 'COMPLETED') {
        t.completed += 1;
        const rev = Number(i.totalCharge) || 0;
        const mat = Number(i.materialsCharge) || 0;
        t.revenue += rev;
        t.partsCost += mat;
        t.profit += rev - mat;
        t.commission += rev * ((commissionPct.get(t.id) ?? 0) / 100);
        t.unpaid += Math.max(rev - (Number(i.paidByCustomer) || 0), 0);
        if (i.customerRating) t.ratings.push(i.customerRating);
      } else if (i.status !== 'CANCELLED' && i.status !== 'FAILED') {
        t.open += 1;
      }
    }

    const techRows = [...techMap.values()].map((t) => ({
      ...t,
      avgRating: t.ratings.length ? t.ratings.reduce((a, b) => a + b, 0) / t.ratings.length : null,
      avgHours: t.hours.length ? t.hours.reduce((a, b) => a + b, 0) / t.hours.length : 0,
      totalJobs: t.serviceJobs + t.installJobs,
      completionRate: (t.serviceJobs + t.installJobs) > 0
        ? (t.completed / (t.serviceJobs + t.installJobs)) * 100
        : 0,
      ratings: undefined,
      hours: undefined,
    }));

    /* ── Kaun si kharabi sab se ziyada aati hai ────────────── */
    const issueMap = new Map<string, { issue: string; jobs: number; revenue: number; avgHours: number; _h: number[] }>();
    for (const s of services) {
      const key = (s.issueCategory ?? '').trim() || 'Bataya nahi gaya';
      const row = issueMap.get(key) ?? { issue: key, jobs: 0, revenue: 0, avgHours: 0, _h: [] };
      row.jobs += 1;
      row.revenue += Number(s.totalCharge) || 0;
      if (s.completedAt) row._h.push((new Date(s.completedAt).getTime() - new Date(s.requestedAt).getTime()) / HOUR);
      issueMap.set(key, row);
    }
    const topIssues = [...issueMap.values()]
      .map((r) => ({ issue: r.issue, jobs: r.jobs, revenue: r.revenue, avgHours: r._h.length ? r._h.reduce((a, b) => a + b, 0) / r._h.length : 0 }))
      .sort((a, b) => b.jobs - a.jobs)
      .slice(0, 15);

    /* ── Kaun sa product baar baar kharab hota hai ─────────── */
    const productMap = new Map<string, { productName: string; jobs: number; revenue: number; warrantyJobs: number }>();
    for (const s of services) {
      const key = s.productName || 'Na-maloom';
      const row = productMap.get(key) ?? { productName: key, jobs: 0, revenue: 0, warrantyJobs: 0 };
      row.jobs += 1;
      row.revenue += Number(s.totalCharge) || 0;
      if (s.coveredUnderWarranty) row.warrantyJobs += 1;
      productMap.set(key, row);
    }
    const problemProducts = [...productMap.values()].sort((a, b) => b.jobs - a.jobs).slice(0, 15);

    /* ── Jo customer baar baar bula raha hai ───────────────── */
    const custMap = new Map<string, { phone: string; name: string; jobs: number; revenue: number; lastAt: Date }>();
    for (const s of services) {
      const key = (s.customerPhone || '').trim();
      if (!key) continue;
      const row = custMap.get(key) ?? { phone: key, name: s.customerName, jobs: 0, revenue: 0, lastAt: s.requestedAt };
      row.jobs += 1;
      row.revenue += Number(s.totalCharge) || 0;
      if (s.requestedAt > row.lastAt) row.lastAt = s.requestedAt;
      custMap.set(key, row);
    }
    const repeatCustomers = [...custMap.values()].filter((c) => c.jobs > 1).sort((a, b) => b.jobs - a.jobs).slice(0, 15);

    /* ── Ilaqe ke hisab se kaam ────────────────────────────── */
    const zoneMap = new Map<string, { zone: string; jobs: number; revenue: number }>();
    for (const s of services) {
      const key = [s.city, s.area].filter(Boolean).join(' — ') || 'Na-maloom';
      const row = zoneMap.get(key) ?? { zone: key, jobs: 0, revenue: 0 };
      row.jobs += 1; row.revenue += Number(s.totalCharge) || 0;
      zoneMap.set(key, row);
    }

    /* ── Rozana trend ──────────────────────────────────────── */
    const daily = new Map<string, { date: string; requested: number; completed: number; revenue: number }>();
    const touch = (d: Date) => {
      const key = new Date(d).toISOString().slice(0, 10);
      const row = daily.get(key) ?? { date: key, requested: 0, completed: 0, revenue: 0 };
      daily.set(key, row);
      return row;
    };
    for (const s of services) {
      touch(s.requestedAt).requested += 1;
      if (s.status === 'COMPLETED' && s.completedAt) {
        const d = touch(s.completedAt);
        d.completed += 1;
        d.revenue += Number(s.totalCharge) || 0;
      }
    }

    /* ── Paisa ────────────────────────────────────────────── */
    const svcRevenue = completed.reduce((a, s) => a + (Number(s.totalCharge) || 0), 0);
    const svcCollected = completed.reduce((a, s) => a + (Number(s.paidAmount) || 0), 0);
    const svcParts = completed.reduce((a, s) => a + (Number(s.partsCharge) || 0), 0);

    const doneInstalls = installations.filter((i) => i.status === 'COMPLETED');
    const instRevenue = doneInstalls.reduce((a, i) => a + (Number(i.totalCharge) || 0), 0);
    const instCollected = doneInstalls.reduce((a, i) => a + (Number(i.paidByCustomer) || 0), 0);
    const instMaterials = doneInstalls.reduce((a, i) => a + (Number(i.materialsCharge) || 0), 0);

    /* ── Follow-up aur AMC ke tanbeeh ──────────────────────── */
    const pendingFollowUps = services
      .filter((s) => s.requiresFollowUp && s.followUpDate)
      .map((s) => ({
        id: s.id, requestNumber: s.requestNumber, customerName: s.customerName,
        customerPhone: s.customerPhone, productName: s.productName,
        followUpDate: s.followUpDate, followUpReason: s.followUpReason,
        isDue: new Date(s.followUpDate!) <= now,
      }))
      .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime());

    const DAY = 86_400_000;
    const amcExpiring = amcs
      .map((a) => ({
        ...a,
        daysLeft: Math.floor((new Date(a.expiryDate).getTime() - now.getTime()) / DAY),
        visitsLeft: Math.max((a.freeVisitsAllowed ?? 0) - (a.freeVisitsUsed ?? 0), 0),
        pending: (Number(a.contractValue) || 0) - (Number(a.paidAmount) || 0),
      }))
      .filter((a) => a.daysLeft <= 45)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const ratings = [...completed.map((s) => s.customerRating), ...doneInstalls.map((i) => i.customerRating)]
      .filter((r): r is number => typeof r === 'number' && r > 0);

    return {
      range: { from: gte.toISOString(), to: lte.toISOString() },

      totals: {
        serviceJobs: services.length,
        installJobs: installations.length,
        completed: completed.length + doneInstalls.length,
        open: open.length,
        overdue: overdue.length,
        unresolved: unresolved.length,
        revenue: svcRevenue + instRevenue,
        collected: svcCollected + instCollected,
        /** Kaam ho gaya lekin paisa abhi baqi hai */
        outstanding: (svcRevenue - svcCollected) + (instRevenue - instCollected),
        cost: svcParts + instMaterials,
        profit: (svcRevenue + instRevenue) - (svcParts + instMaterials),
      },

      quality: {
        avgResolutionHours,
        sameDayFixes,
        sameDayRate: completed.length ? (sameDayFixes / completed.length) * 100 : 0,
        firstVisitFix,
        firstVisitFixRate: completed.length ? (firstVisitFix / completed.length) * 100 : 0,
        avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
        ratingCount: ratings.length,
        warrantyJobs: completed.filter((s) => s.coveredUnderWarranty).length,
        amcJobs: completed.filter((s) => s.coveredUnderAmc).length,
        paidJobs: completed.filter((s) => !s.coveredUnderWarranty && !s.coveredUnderAmc).length,
      },

      statusFunnel: [...statusCount.entries()]
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),

      technicians: techRows.sort((a, b) => b.revenue - a.revenue),
      topIssues,
      problemProducts,
      repeatCustomers,
      zones: [...zoneMap.values()].sort((a, b) => b.jobs - a.jobs).slice(0, 12),
      daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),

      pendingFollowUps: pendingFollowUps.slice(0, 30),
      overdueJobs: overdue
        .map((s) => ({
          id: s.id, requestNumber: s.requestNumber, customerName: s.customerName,
          customerPhone: s.customerPhone, productName: s.productName, status: s.status,
          scheduledDate: s.scheduledDate, technicianName: s.technicianName,
          daysLate: Math.floor((now.getTime() - new Date(s.scheduledDate!).getTime()) / DAY),
        }))
        .sort((a, b) => b.daysLate - a.daysLate)
        .slice(0, 30),
      amcExpiring: amcExpiring.slice(0, 30),
    };
  }

}
