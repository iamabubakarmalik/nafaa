import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { startOfDay, startOfMonth, subDays, subMonths, format } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
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
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { contactPerson: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { ntn: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      items,
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
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    await this.prisma.supplier.delete({ where: { id } });
    return { message: 'Supplier deleted successfully' };
  }

  // ═══════════════════════════════════════════════════════════
  // SUMMARY — Suppliers overview analytics
  // ═══════════════════════════════════════════════════════════
  async summary(user: AuthenticatedUser) {
    const monthStart = startOfMonth(new Date());
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
    const sevenDaysAgo = subDays(startOfDay(new Date()), 6);

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
    ] = await Promise.all([
      this.prisma.supplier.count({ where: { tenantId: user.tenantId } }),
      this.prisma.supplier.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.supplier.count({ where: { tenantId: user.tenantId, outstandingDue: { gt: 0 } } }),
      this.prisma.supplier.aggregate({
        where: { tenantId: user.tenantId },
        _sum: { totalPurchased: true, outstandingDue: true },
      }),
      this.prisma.purchase.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'RECEIVED',
          purchasedAt: { gte: monthStart },
        },
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
        where: {
          tenantId: user.tenantId,
          status: 'RECEIVED',
          purchasedAt: { gte: sevenDaysAgo },
        },
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
        include: {
          supplier: { select: { id: true, name: true, logoUrl: true } },
        },
      }),
      this.prisma.purchase.groupBy({
        by: ['paymentMethod'],
        where: { tenantId: user.tenantId, status: 'RECEIVED' },
        _sum: { total: true },
        _count: { _all: true },
      }),
    ]);

    // 7-day trend
    const trendBuckets: Record<string, { date: string; total: number; count: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      trendBuckets[d] = { date: d, total: 0, count: 0 };
    }
    for (const p of last7DaysPurchases) {
      const key = format(p.purchasedAt, 'yyyy-MM-dd');
      if (trendBuckets[key]) {
        trendBuckets[key].total += p.total;
        trendBuckets[key].count += 1;
      }
    }

    // Enrich top suppliers
    const supplierIds = topSuppliersRaw.map((s) => s.supplierId);
    const suppliers = await this.prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: {
        id: true,
        name: true,
        phone: true,
        logoUrl: true,
        city: true,
        totalPurchased: true,
        outstandingDue: true,
        paymentTerms: true,
      },
    });
    const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
    const topSuppliers = topSuppliersRaw.map((s) => ({
      supplierId: s.supplierId,
      supplier: supplierMap.get(s.supplierId),
      totalSpent: s._sum.total ?? 0,
      totalPaid: s._sum.paidAmount ?? 0,
      outstanding: (s._sum.total ?? 0) - (s._sum.paidAmount ?? 0),
      orderCount: s._count._all,
    }));

    const monthTotal = monthAgg._sum.total ?? 0;
    const lastMonthTotal = lastMonthAgg._sum.total ?? 0;
    const growthVsLastMonth = lastMonthTotal > 0
      ? ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : monthTotal > 0 ? 100 : 0;

    return {
      totalSuppliers: totalCount,
      activeSuppliers: activeCount,
      suppliersWithDebt: withDebtCount,
      totalPurchased: totalsAgg._sum.totalPurchased ?? 0,
      totalOutstanding: totalsAgg._sum.outstandingDue ?? 0,
      monthPurchases: monthTotal,
      monthCount: monthAgg._count._all ?? 0,
      monthPaid: monthAgg._sum.paidAmount ?? 0,
      lastMonthPurchases: lastMonthTotal,
      growthVsLastMonth,
      trend7Days: Object.values(trendBuckets),
      topSuppliers,
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
