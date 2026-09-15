import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { startOfDay, startOfMonth, subDays, subMonths, format } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  create(user: AuthenticatedUser, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
      },
    });
  }

  async findAll(user: AuthenticatedUser, query: QuerySuppliersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {
      tenantId: user.tenantId,
      ...(query.dues === 'due' ? { outstandingDue: { gt: 0 } } : {}),
      ...(query.dues === 'clear' ? { outstandingDue: { lte: 0 } } : {}),
      ...(query.status === 'active' ? { isActive: true } : {}),
      ...(query.status === 'inactive' ? { isActive: false } : {}),
      ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { contactPerson: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
              { altPhone: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { ntn: { contains: query.search, mode: 'insensitive' } },
              { cnic: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
              { area: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.SupplierOrderByWithRelationInput =
      query.sort === 'name'
        ? { name: 'asc' }
        : query.sort === 'purchased'
          ? { totalPurchased: 'desc' }
          : query.sort === 'due'
            ? { outstandingDue: 'desc' }
            : query.sort === 'orders'
              ? { purchases: { _count: 'desc' } }
              : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { _count: { select: { purchases: true } } },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    // List par "kitne din se maal nahi aaya" dikhana hai. Har supplier
    // ke liye alag query (N+1) nahi — ek hi groupBy se sab ka aakhri
    // bill le liya.
    const ids = items.map((s) => s.id);
    const [lastPurchases, lastPayments] = await Promise.all([
      ids.length
        ? this.prisma.purchase.groupBy({
            by: ['supplierId'],
            where: { tenantId: user.tenantId, supplierId: { in: ids } },
            _max: { purchasedAt: true },
          })
        : Promise.resolve([] as Array<{ supplierId: string; _max: { purchasedAt: Date | null } }>),
      ids.length
        ? this.prisma.supplierLedger.groupBy({
            by: ['supplierId'],
            where: {
              tenantId: user.tenantId,
              supplierId: { in: ids },
              type: 'PAYMENT_MADE',
            },
            _max: { entryDate: true },
          })
        : Promise.resolve([] as Array<{ supplierId: string; _max: { entryDate: Date | null } }>),
    ]);

    const lastBuy = new Map(lastPurchases.map((p) => [p.supplierId, p._max?.purchasedAt ?? null]));
    const lastPay = new Map(lastPayments.map((p) => [p.supplierId, p._max?.entryDate ?? null]));

    return {
      items: items.map((s) => ({
        ...s,
        lastPurchaseAt: lastBuy.get(s.id) ?? null,
        lastPaymentAt: lastPay.get(s.id) ?? null,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        purchases: {
          orderBy: { purchasedAt: 'desc' },
          take: 20,
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    unit: true,
                    sku: true,
                  },
                },
              },
            },
          },
        },
        _count: { select: { purchases: true } },
      },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    // Get aggregate stats
    const agg = await this.prisma.purchase.aggregate({
      where: { supplierId: id, tenantId: user.tenantId, status: 'RECEIVED' },
      _sum: { total: true, paidAmount: true },
      _count: { _all: true },
      _avg: { total: true },
    });

    const outstanding = (agg._sum.total ?? 0) - (agg._sum.paidAmount ?? 0);

    // Last 30 days trend
    const last30Days = subDays(new Date(), 29);
    const recentPurchases = await this.prisma.purchase.findMany({
      where: {
        supplierId: id,
        tenantId: user.tenantId,
        status: 'RECEIVED',
        purchasedAt: { gte: last30Days },
      },
      select: { purchasedAt: true, total: true },
    });

    const trendBuckets: Record<string, { date: string; total: number; count: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      trendBuckets[d] = { date: d, total: 0, count: 0 };
    }
    for (const p of recentPurchases) {
      const key = format(p.purchasedAt, 'yyyy-MM-dd');
      if (trendBuckets[key]) {
        trendBuckets[key].total += p.total;
        trendBuckets[key].count += 1;
      }
    }

    // Payment method breakdown
    const paymentBreakdown = await this.prisma.purchase.groupBy({
      by: ['paymentMethod'],
      where: { supplierId: id, tenantId: user.tenantId, status: 'RECEIVED' },
      _sum: { total: true },
      _count: { _all: true },
    });

    // Top products purchased from this supplier
    const topProductsRaw = await this.prisma.purchaseItem.groupBy({
      by: ['productId'],
      where: {
        purchase: {
          supplierId: id,
          tenantId: user.tenantId,
          status: 'RECEIVED',
        },
      },
      _sum: { quantity: true, total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    });

    const productIds = topProductsRaw.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        images: { take: 1, select: { url: true } },
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const topProducts = topProductsRaw.map((p) => ({
      productId: p.productId,
      product: productMap.get(p.productId),
      quantity: p._sum.quantity ?? 0,
      total: p._sum.total ?? 0,
      orderCount: p._count._all,
    }));

    /* ─── 12 mahine ka rujhan — is supplier se kis mausam me maal aata hai ─── */
    const twelveMonthsAgo = startOfMonth(subMonths(new Date(), 11));
    const yearPurchases = await this.prisma.purchase.findMany({
      where: {
        supplierId: id,
        tenantId: user.tenantId,
        status: 'RECEIVED',
        purchasedAt: { gte: twelveMonthsAgo },
      },
      select: { purchasedAt: true, total: true, paidAmount: true },
    });
    const monthBuckets: Record<string, { month: string; label: string; total: number; paid: number; count: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, 'yyyy-MM');
      monthBuckets[key] = { month: key, label: format(d, 'MMM yy'), total: 0, paid: 0, count: 0 };
    }
    for (const p of yearPurchases) {
      const key = format(p.purchasedAt, 'yyyy-MM');
      if (monthBuckets[key]) {
        monthBuckets[key].total += p.total;
        monthBuckets[key].paid += p.paidAmount;
        monthBuckets[key].count += 1;
      }
    }

    /* ─── Khata — `outstandingDue` ka number bana kaise, ye yahan se ─── */
    const [ledgerByType, lastPaymentEntry, ledgerCount] = await Promise.all([
      this.prisma.supplierLedger.groupBy({
        by: ['type'],
        where: { supplierId: id, tenantId: user.tenantId },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.supplierLedger.findFirst({
        where: { supplierId: id, tenantId: user.tenantId, type: 'PAYMENT_MADE' },
        orderBy: { entryDate: 'desc' },
        select: { amount: true, entryDate: true, reference: true },
      }),
      this.prisma.supplierLedger.count({ where: { supplierId: id, tenantId: user.tenantId } }),
    ]);
    const byType = new Map(ledgerByType.map((l) => [l.type, l._sum.amount ?? 0]));
    const lastPaymentDays = lastPaymentEntry
      ? Math.floor((Date.now() - new Date(lastPaymentEntry.entryDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    /* ─── Rate ka safar — ek hi cheez har baar mehngi ho rahi hai? ─── */
    const priceHistoryRaw = topProductsRaw.length
      ? await this.prisma.purchaseItem.findMany({
          where: {
            productId: { in: productIds },
            purchase: { supplierId: id, tenantId: user.tenantId, status: 'RECEIVED' },
          },
          select: {
            productId: true,
            costPrice: true,
            quantity: true,
            purchase: { select: { purchasedAt: true, purchaseNumber: true } },
          },
          orderBy: { purchase: { purchasedAt: 'asc' } },
        })
      : [];

    const priceHistory = productIds.map((pid) => {
      const rows = priceHistoryRaw
        .filter((r) => r.productId === pid)
        .map((r) => ({
          date: format(r.purchase.purchasedAt, 'yyyy-MM-dd'),
          purchaseNumber: r.purchase.purchaseNumber,
          costPrice: r.costPrice,
          quantity: r.quantity,
        }));
      const first = rows[0]?.costPrice ?? 0;
      const last = rows[rows.length - 1]?.costPrice ?? 0;
      return {
        productId: pid,
        productName: productMap.get(pid)?.name ?? '—',
        unit: productMap.get(pid)?.unit ?? '',
        points: rows,
        firstCost: first,
        lastCost: last,
        changePct: first > 0 ? ((last - first) / first) * 100 : 0,
      };
    }).filter((p) => p.points.length > 0);

    // Last purchase date
    const lastPurchase = supplier.purchases[0];
    const daysSinceLastPurchase = lastPurchase
      ? Math.floor((Date.now() - new Date(lastPurchase.purchasedAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      ...supplier,
      stats: {
        totalPurchases: agg._count._all ?? 0,
        totalAmount: agg._sum.total ?? 0,
        totalPaid: agg._sum.paidAmount ?? 0,
        outstanding,
        averagePurchase: agg._avg.total ?? 0,
        daysSinceLastPurchase,
        lastPurchaseDate: lastPurchase?.purchasedAt ?? null,
      },
      trend30Days: Object.values(trendBuckets),
      months12: Object.values(monthBuckets),
      ledger: {
        entryCount: ledgerCount,
        openingBalance: byType.get('OPENING_BALANCE') ?? 0,
        purchaseCredit: byType.get('PURCHASE_CREDIT') ?? 0,
        paymentsMade: byType.get('PAYMENT_MADE') ?? 0,
        returns: byType.get('PURCHASE_RETURN') ?? 0,
        adjustments: byType.get('ADJUSTMENT') ?? 0,
        lastPaymentAmount: lastPaymentEntry?.amount ?? null,
        lastPaymentAt: lastPaymentEntry?.entryDate ?? null,
        lastPaymentRef: lastPaymentEntry?.reference ?? null,
        daysSincePayment: lastPaymentDays,
      },
      priceHistory,
      paymentBreakdown: paymentBreakdown.map((p) => ({
        paymentMethod: p.paymentMethod,
        total: p._sum.total ?? 0,
        count: p._count._all,
      })),
      topProducts,
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateSupplierDto) {
    await this.findOne(user, id);
    return this.prisma.supplier.update({
      where: { id },
      data: dto,
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { _count: { select: { purchases: true } } },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    // Purchase ka rishta Restrict par hai — mitane ki koshish database
    // se P2003 le aati thi aur user ko 500 dikhta tha. Ab saaf baat:
    // jis se maal aa chuka hai wo record kharidari ki tareekh hai.
    if (supplier._count.purchases > 0) {
      throw new BadRequestException(
        `"${supplier.name}" ki ${supplier._count.purchases} kharidari record me hain — ` +
        'mitaya nahi ja sakta. Iske bajaye ise "band" kar dein: ' +
        'record mehfooz rahega aur naye bill me nazar nahi aayega.',
      );
    }

    if (Number(supplier.outstandingDue ?? 0) > 0) {
      throw new BadRequestException(
        `"${supplier.name}" ka ${Math.round(Number(supplier.outstandingDue))} baqi hai — ` +
        'pehle khata saaf karein ya "band" kar dein.',
      );
    }

    await this.prisma.supplier.delete({ where: { id } });
    return { message: 'Supplier delete ho gaya' };
  }

  // ═══════════════════════════════════════════════════════════
  // SUMMARY — kharidari ki poori tasveer
  // ───────────────────────────────────────────────────────────
  // Sirf "kitna kharch hua" kaafi nahi. Dukaan-daar ko ye bhi
  // dekhna hota hai ke kis ka baqi kitna purana hai, kaun sa
  // supplier mahinon se ghaib hai, aur paisa kis sheher ja raha
  // hai. Ye sab yahan se aata hai.
  // ═══════════════════════════════════════════════════════════
  async summary(user: AuthenticatedUser) {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const sevenDaysAgo = subDays(startOfDay(now), 6);
    const twelveMonthsAgo = startOfMonth(subMonths(now, 11));

    const [
      totalCount,
      activeCount,
      withDebtCount,
      totalsAgg,
      monthAgg,
      lastMonthAgg,
      last7DaysPurchases,
      topSuppliersRaw,
      recentPurchases,
      paymentBreakdown,
      months12Raw,
      cityRaw,
      allSuppliers,
      lastBuyRaw,
      lastPayRaw,
      monthPaidAgg,
      openingAgg,
      topProductsRaw,
    ] = await Promise.all([
      this.prisma.supplier.count({ where: { tenantId: user.tenantId } }),
      this.prisma.supplier.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.supplier.count({ where: { tenantId: user.tenantId, outstandingDue: { gt: 0 } } }),
      this.prisma.supplier.aggregate({
        where: { tenantId: user.tenantId },
        _sum: { totalPurchased: true, outstandingDue: true },
      }),
      this.prisma.purchase.aggregate({
        where: { tenantId: user.tenantId, status: 'RECEIVED', purchasedAt: { gte: monthStart } },
        _sum: { total: true, paidAmount: true },
        _count: { _all: true },
      }),
      this.prisma.purchase.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'RECEIVED',
          purchasedAt: { gte: lastMonthStart, lt: monthStart },
        },
        _sum: { total: true },
      }),
      this.prisma.purchase.findMany({
        where: { tenantId: user.tenantId, status: 'RECEIVED', purchasedAt: { gte: sevenDaysAgo } },
        select: { purchasedAt: true, total: true },
      }),
      this.prisma.purchase.groupBy({
        by: ['supplierId'],
        where: { tenantId: user.tenantId, status: 'RECEIVED' },
        _sum: { total: true, paidAmount: true },
        _count: { _all: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 8,
      }),
      this.prisma.purchase.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { purchasedAt: 'desc' },
        take: 8,
        include: { supplier: { select: { id: true, name: true, logoUrl: true } } },
      }),
      this.prisma.purchase.groupBy({
        by: ['paymentMethod'],
        where: { tenantId: user.tenantId, status: 'RECEIVED' },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.purchase.findMany({
        where: { tenantId: user.tenantId, status: 'RECEIVED', purchasedAt: { gte: twelveMonthsAgo } },
        select: { purchasedAt: true, total: true, paidAmount: true },
      }),
      this.prisma.supplier.groupBy({
        by: ['city'],
        where: { tenantId: user.tenantId },
        _sum: { totalPurchased: true, outstandingDue: true },
        _count: { _all: true },
      }),
      this.prisma.supplier.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, name: true, phone: true, city: true, logoUrl: true, outstandingDue: true, totalPurchased: true, isActive: true, createdAt: true },
      }),
      this.prisma.purchase.groupBy({
        by: ['supplierId'],
        where: { tenantId: user.tenantId },
        _max: { purchasedAt: true },
        _count: { _all: true },
      }),
      this.prisma.supplierLedger.groupBy({
        by: ['supplierId'],
        where: { tenantId: user.tenantId, type: 'PAYMENT_MADE' },
        _max: { entryDate: true },
      }),
      this.prisma.supplierLedger.aggregate({
        where: { tenantId: user.tenantId, type: 'PAYMENT_MADE', entryDate: { gte: monthStart } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.supplierLedger.aggregate({
        where: { tenantId: user.tenantId, type: 'OPENING_BALANCE' },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.purchaseItem.groupBy({
        by: ['productId'],
        where: { purchase: { tenantId: user.tenantId, status: 'RECEIVED' } },
        _sum: { quantity: true, total: true },
        _count: { _all: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 8,
      }),
    ]);

    /* ─── 7-din ka rujhan ─── */
    const trendBuckets: Record<string, { date: string; total: number; count: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(now, i), 'yyyy-MM-dd');
      trendBuckets[d] = { date: d, total: 0, count: 0 };
    }
    for (const p of last7DaysPurchases) {
      const key = format(p.purchasedAt, 'yyyy-MM-dd');
      if (trendBuckets[key]) {
        trendBuckets[key].total += p.total;
        trendBuckets[key].count += 1;
      }
    }

    /* ─── 12 mahine ka rujhan — mausam ka asar yahin dikhta hai ─── */
    const monthBuckets: Record<string, { month: string; label: string; total: number; paid: number; count: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      const key = format(d, 'yyyy-MM');
      monthBuckets[key] = { month: key, label: format(d, 'MMM yy'), total: 0, paid: 0, count: 0 };
    }
    for (const p of months12Raw) {
      const key = format(p.purchasedAt, 'yyyy-MM');
      if (monthBuckets[key]) {
        monthBuckets[key].total += p.total;
        monthBuckets[key].paid += p.paidAmount;
        monthBuckets[key].count += 1;
      }
    }

    /* ─── Supplier ki sehat: kaun ghaib hai, kis ka baqi purana ─── */
    const lastBuy = new Map(lastBuyRaw.map((p) => [p.supplierId, p._max?.purchasedAt ?? null]));
    const orderCounts = new Map(lastBuyRaw.map((p) => [p.supplierId, p._count._all]));
    const lastPay = new Map(lastPayRaw.map((p) => [p.supplierId, p._max?.entryDate ?? null]));
    const DAY = 1000 * 60 * 60 * 24;
    const daysAgo = (d: Date | null | undefined) =>
      d ? Math.floor((now.getTime() - new Date(d).getTime()) / DAY) : null;

    let neverPurchased = 0;
    let staleCount = 0;       // 90 din se koi maal nahi aaya
    let neverPaidDebt = 0;    // baqi hai magar ek bhi adaigi nahi

    /** Baqi ka buraapa — jitna purana, utna sharmindagi ka bais */
    const aging = [
      { bucket: '0-30 din', min: 0, max: 30, amount: 0, count: 0 },
      { bucket: '31-60 din', min: 31, max: 60, amount: 0, count: 0 },
      { bucket: '61-90 din', min: 61, max: 90, amount: 0, count: 0 },
      { bucket: '90+ din', min: 91, max: Infinity, amount: 0, count: 0 },
    ];

    const debtors: Array<{
      id: string; name: string; phone: string | null; city: string | null;
      logoUrl: string | null; outstandingDue: number; totalPurchased: number;
      daysSincePayment: number | null; daysSincePurchase: number | null; orderCount: number;
    }> = [];

    const dormant: Array<{
      id: string; name: string; phone: string | null; city: string | null;
      totalPurchased: number; outstandingDue: number; daysSincePurchase: number | null;
    }> = [];

    for (const s of allSuppliers) {
      const buy = lastBuy.get(s.id) ?? null;
      const pay = lastPay.get(s.id) ?? null;
      const dBuy = daysAgo(buy);
      const dPay = daysAgo(pay);
      const due = Number(s.outstandingDue ?? 0);

      if (dBuy === null) neverPurchased += 1;
      else if (dBuy > 90) staleCount += 1;

      if (due > 0) {
        if (pay === null) neverPaidDebt += 1;
        // Kitne din se is supplier ko paisa nahi diya — agar kabhi
        // diya hi nahi to aakhri bill se ginti karte hain.
        const age = dPay ?? dBuy ?? 0;
        const b = aging.find((x) => age >= x.min && age <= x.max);
        if (b) { b.amount += due; b.count += 1; }

        debtors.push({
          id: s.id, name: s.name, phone: s.phone, city: s.city, logoUrl: s.logoUrl,
          outstandingDue: due, totalPurchased: Number(s.totalPurchased ?? 0),
          daysSincePayment: dPay, daysSincePurchase: dBuy,
          orderCount: orderCounts.get(s.id) ?? 0,
        });
      }

      if (dBuy !== null && dBuy > 90) {
        dormant.push({
          id: s.id, name: s.name, phone: s.phone, city: s.city,
          totalPurchased: Number(s.totalPurchased ?? 0),
          outstandingDue: due, daysSincePurchase: dBuy,
        });
      }
    }

    debtors.sort((a, b) => b.outstandingDue - a.outstandingDue);
    dormant.sort((a, b) => (b.totalPurchased ?? 0) - (a.totalPurchased ?? 0));

    /* ─── Top suppliers ─── */
    const supplierIds = topSuppliersRaw.map((s) => s.supplierId);
    const suppliersInfo = await this.prisma.supplier.findMany({
      where: { id: { in: supplierIds }, tenantId: user.tenantId },
      select: {
        id: true, name: true, phone: true, logoUrl: true, city: true,
        totalPurchased: true, outstandingDue: true, paymentTerms: true,
      },
    });
    const supplierMap = new Map(suppliersInfo.map((s) => [s.id, s]));
    const topSuppliers = topSuppliersRaw.map((s) => ({
      supplierId: s.supplierId,
      supplier: supplierMap.get(s.supplierId),
      totalSpent: s._sum.total ?? 0,
      totalPaid: s._sum.paidAmount ?? 0,
      outstanding: (s._sum.total ?? 0) - (s._sum.paidAmount ?? 0),
      orderCount: s._count._all,
      lastPurchaseAt: lastBuy.get(s.supplierId) ?? null,
    }));

    /* ─── Sab se zyada kharide gaye maal ─── */
    const prodIds = topProductsRaw.map((p) => p.productId);
    const prods = await this.prisma.product.findMany({
      where: { id: { in: prodIds }, tenantId: user.tenantId },
      select: { id: true, name: true, sku: true, unit: true, stock: true, costPrice: true, images: { take: 1, select: { url: true } } },
    });
    const prodMap = new Map(prods.map((p) => [p.id, p]));
    const topProducts = topProductsRaw
      .filter((p) => prodMap.has(p.productId))
      .map((p) => ({
        productId: p.productId,
        product: prodMap.get(p.productId),
        quantity: p._sum.quantity ?? 0,
        total: p._sum.total ?? 0,
        orderCount: p._count._all,
      }));

    const monthTotal = monthAgg._sum.total ?? 0;
    const lastMonthTotal = lastMonthAgg._sum.total ?? 0;
    const growthVsLastMonth = lastMonthTotal > 0
      ? ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : monthTotal > 0 ? 100 : 0;

    const monthCount = monthAgg._count._all ?? 0;

    return {
      totalSuppliers: totalCount,
      activeSuppliers: activeCount,
      suppliersWithDebt: withDebtCount,
      totalPurchased: totalsAgg._sum.totalPurchased ?? 0,
      totalOutstanding: totalsAgg._sum.outstandingDue ?? 0,
      monthPurchases: monthTotal,
      monthCount,
      monthPaid: monthAgg._sum.paidAmount ?? 0,
      lastMonthPurchases: lastMonthTotal,
      growthVsLastMonth,
      avgOrderValue: monthCount > 0 ? monthTotal / monthCount : 0,

      // Khata (udhaar) ka hissa
      monthLedgerPaid: monthPaidAgg._sum.amount ?? 0,
      monthLedgerPaymentCount: monthPaidAgg._count._all ?? 0,
      openingBalanceTotal: openingAgg._sum.amount ?? 0,
      openingBalanceCount: openingAgg._count._all ?? 0,

      // Sehat ke ishare
      neverPurchased,
      staleCount,
      neverPaidDebt,

      trend7Days: Object.values(trendBuckets),
      months12: Object.values(monthBuckets),
      dueAging: aging.map(({ bucket, amount, count }) => ({ bucket, amount, count })),
      topDebtors: debtors.slice(0, 10),
      dormantSuppliers: dormant.slice(0, 10),
      cityBreakdown: cityRaw
        .map((c) => ({
          city: c.city ?? 'Bataya nahi',
          count: c._count._all,
          totalPurchased: c._sum.totalPurchased ?? 0,
          outstanding: c._sum.outstandingDue ?? 0,
        }))
        .sort((a, b) => b.totalPurchased - a.totalPurchased),
      topSuppliers,
      topProducts,
      recentPurchases: recentPurchases.map((p) => ({
        id: p.id,
        purchaseNumber: p.purchaseNumber,
        total: p.total,
        paidAmount: p.paidAmount,
        paymentMethod: p.paymentMethod,
        purchasedAt: p.purchasedAt,
        supplier: p.supplier,
      })),
      paymentBreakdown: paymentBreakdown.map((p) => ({
        paymentMethod: p.paymentMethod,
        total: p._sum.total ?? 0,
        count: p._count._all,
      })),
    };
  }
}
