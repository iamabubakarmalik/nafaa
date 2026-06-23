import { Injectable, NotFoundException } from '@nestjs/common';
import { startOfDay, startOfMonth, subDays, subMonths, format } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreatePurchaseDto) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, tenantId: user.tenantId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: productIds } },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const normalizedItems = dto.items.map((item) => {
      const lineTotal = item.costPrice * item.quantity;
      subtotal += lineTotal;
      return {
        productId: item.productId,
        quantity: item.quantity,
        costPrice: item.costPrice,
        total: lineTotal,
        rolls: item.rolls ?? [],
      };
    });

    const discount = dto.discount ?? 0;
    const total = Math.max(subtotal - discount, 0);
    const paidAmount = dto.paidAmount ?? total;
    const purchaseNumber = `PO-${Date.now().toString().slice(-8)}`;

    return this.prisma.$transaction(async (tx) => {
      // Create purchase + items
      const purchase = await tx.purchase.create({
        data: {
          tenantId: user.tenantId,
          supplierId: supplier.id,
          createdById: user.id,
          purchaseNumber,
          subtotal,
          discount,
          total,
          paidAmount,
          paymentMethod: dto.paymentMethod,
          notes: dto.notes,
          status: 'RECEIVED',
          items: {
            create: normalizedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              costPrice: item.costPrice,
              total: item.total,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          supplier: true,
        },
      });

      // Update supplier totals
      await tx.supplier.update({
        where: { id: supplier.id },
        data: {
          totalPurchased: { increment: total },
          outstandingDue: { increment: Math.max(total - paidAmount, 0) },
        },
      });

      // Process items + carpet rolls
      const createdRollsByItem: Record<string, any[]> = {};

      for (const item of normalizedItems) {
        const product = productMap.get(item.productId);
        const isCarpet = product && CARPET_UNITS.has(product.unit);

        // Update product stock + cost
        const updated = await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            costPrice: item.costPrice,
          },
        });

        // Stock movement
        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            productId: item.productId,
            type: 'PURCHASE_IN',
            quantity: item.quantity,
            balanceAfter: updated.stock,
            reference: purchase.purchaseNumber,
            note: `Purchase from ${supplier.name}`,
          },
        });

        // Create carpet rolls if carpet product with rolls data
        if (isCarpet && item.rolls && item.rolls.length > 0) {
          const createdRolls: any[] = [];

          for (let i = 0; i < item.rolls.length; i++) {
            const roll = item.rolls[i];
            const widthFt = Number(roll.widthFt);
            const widthInch = Number(roll.widthInch ?? 0);
            const lengthFt = Number(roll.lengthFt);
            const fullWidthFt = widthFt + widthInch / 12;
            const sqft = Number((fullWidthFt * lengthFt).toFixed(2));

            // Generate roll number if not provided
            const rollNumber =
              roll.rollNumber?.trim() ||
              `CR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${i + 1}`;

            const createdRoll = await tx.carpetRoll.create({
              data: {
                tenantId: user.tenantId,
                shopId: dto.shopId ?? null,
                productId: item.productId,
                variantId: roll.variantId ?? null,
                rollNumber,
                designCode: roll.designCode ?? null,
                widthFt,
                widthInch,
                originalLengthFt: lengthFt,
                remainingLengthFt: lengthFt,
                originalSqft: sqft,
                remainingSqft: sqft,
                costPerSqft: Number(roll.costPerSqft ?? item.costPrice),
                salePricePerSqft: Number(roll.salePricePerSqft ?? 0),
                wholesalePricePerSqft: roll.wholesalePricePerSqft
                  ? Number(roll.wholesalePricePerSqft)
                  : null,
                status: 'ACTIVE',
                sourceType: 'PURCHASE',
                purchaseId: purchase.id,
                rackNumber: roll.rackNumber ?? null,
                quality: roll.quality ?? null,
                pile: roll.pile ?? null,
                notes: roll.notes ?? null,
                createdById: user.id,
              },
            });

            // Roll movement (opening entry)
            await tx.carpetRollMovement.create({
              data: {
                rollId: createdRoll.id,
                tenantId: user.tenantId,
                type: 'OPENING',
                lengthFt,
                sqft,
                balanceLengthAfter: lengthFt,
                balanceSqftAfter: sqft,
                reference: purchase.purchaseNumber,
                note: `Roll received from ${supplier.name}`,
                createdById: user.id,
              },
            });

            createdRolls.push(createdRoll);
          }

          createdRollsByItem[item.productId] = createdRolls;
        }
      }

      return { ...purchase, createdRollsByItem };
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        supplier: true,
        items: { include: { product: { include: { images: { take: 1 } } } } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!purchase) throw new NotFoundException('Purchase not found');

    const rolls = await this.prisma.carpetRoll.findMany({
      where: { tenantId: user.tenantId, purchaseId: id },
      include: {
        product: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true, color: true, colorHex: true } },
      },
    });

    return { ...purchase, carpetRolls: rolls };
  }

  findAll(user: AuthenticatedUser) {
    return this.prisma.purchase.findMany({
      where: { tenantId: user.tenantId },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
      orderBy: { purchasedAt: 'desc' },
      take: 100,
    });
  }

  async summary(user: AuthenticatedUser) {
    const todayStart = startOfDay(new Date());
    const yesterdayStart = startOfDay(subDays(new Date(), 1));
    const monthStart = startOfMonth(new Date());
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
    const sevenDaysAgo = subDays(todayStart, 6);

    const [
      todayAgg, yesterdayAgg, monthAgg, lastMonthAgg, totalAgg, totalCount,
      pendingPaymentAgg, last7DaysPurchases, paymentBreakdown,
      topSuppliersRaw, topProductsRaw, recentPurchases,
    ] = await Promise.all([
      this.prisma.purchase.aggregate({
        where: { tenantId: user.tenantId, status: 'RECEIVED', purchasedAt: { gte: todayStart } },
        _sum: { total: true, paidAmount: true },
        _count: { _all: true },
      }),
      this.prisma.purchase.aggregate({
        where: {
          tenantId: user.tenantId, status: 'RECEIVED',
          purchasedAt: { gte: yesterdayStart, lt: todayStart },
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.purchase.aggregate({
        where: { tenantId: user.tenantId, status: 'RECEIVED', purchasedAt: { gte: monthStart } },
        _sum: { total: true, paidAmount: true },
        _count: { _all: true },
      }),
      this.prisma.purchase.aggregate({
        where: {
          tenantId: user.tenantId, status: 'RECEIVED',
          purchasedAt: { gte: lastMonthStart, lt: monthStart },
        },
        _sum: { total: true },
      }),
      this.prisma.purchase.aggregate({
        where: { tenantId: user.tenantId, status: 'RECEIVED' },
        _sum: { total: true, paidAmount: true },
      }),
      this.prisma.purchase.count({ where: { tenantId: user.tenantId, status: 'RECEIVED' } }),
      this.prisma.supplier.aggregate({
        where: { tenantId: user.tenantId, outstandingDue: { gt: 0 } },
        _sum: { outstandingDue: true },
        _count: { _all: true },
      }),
      this.prisma.purchase.findMany({
        where: { tenantId: user.tenantId, status: 'RECEIVED', purchasedAt: { gte: sevenDaysAgo } },
        select: { purchasedAt: true, total: true },
      }),
      this.prisma.purchase.groupBy({
        by: ['paymentMethod'],
        where: { tenantId: user.tenantId, status: 'RECEIVED', purchasedAt: { gte: monthStart } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.purchase.groupBy({
        by: ['supplierId'],
        where: { tenantId: user.tenantId, status: 'RECEIVED' },
        _sum: { total: true },
        _count: { _all: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      this.prisma.purchaseItem.groupBy({
        by: ['productId'],
        where: {
          purchase: { tenantId: user.tenantId, status: 'RECEIVED', purchasedAt: { gte: monthStart } },
        },
        _sum: { quantity: true, total: true },
        _count: { _all: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      this.prisma.purchase.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { purchasedAt: 'desc' },
        take: 5,
        include: { supplier: { select: { name: true } } },
      }),
    ]);

    // 7-day trend
    const trendBuckets: Record<string, { date: string; total: number; orders: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      trendBuckets[d] = { date: d, total: 0, orders: 0 };
    }
    for (const p of last7DaysPurchases) {
      const key = format(p.purchasedAt, 'yyyy-MM-dd');
      if (trendBuckets[key]) {
        trendBuckets[key].total += p.total;
        trendBuckets[key].orders += 1;
      }
    }

    // Enrich top suppliers
    const supplierIds = topSuppliersRaw.map((s) => s.supplierId);
    const suppliers = await this.prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, name: true, phone: true, totalPurchased: true, outstandingDue: true },
    });
    const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
    const topSuppliers = topSuppliersRaw.map((s) => ({
      supplierId: s.supplierId,
      supplier: supplierMap.get(s.supplierId),
      totalSpent: s._sum.total ?? 0,
      orderCount: s._count._all,
    }));

    // Enrich top products
    const productIds = topProductsRaw.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true, name: true, sku: true, unit: true, costPrice: true,
        images: { take: 1, select: { url: true } },
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const topProducts = topProductsRaw.map((p) => ({
      productId: p.productId,
      product: productMap.get(p.productId),
      quantityPurchased: p._sum.quantity ?? 0,
      totalSpent: p._sum.total ?? 0,
      orderCount: p._count._all,
    }));

    const todayTotal = todayAgg._sum.total ?? 0;
    const yesterdayTotal = yesterdayAgg._sum.total ?? 0;
    const monthTotal = monthAgg._sum.total ?? 0;
    const lastMonthTotal = lastMonthAgg._sum.total ?? 0;

    const growthVsYesterday = yesterdayTotal > 0
      ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
      : todayTotal > 0 ? 100 : 0;
    const growthVsLastMonth = lastMonthTotal > 0
      ? ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : monthTotal > 0 ? 100 : 0;

    return {
      todayPurchases: todayTotal,
      todayCount: todayAgg._count._all ?? 0,
      todayPaid: todayAgg._sum.paidAmount ?? 0,
      yesterdayPurchases: yesterdayTotal,
      growthVsYesterday,
      monthPurchases: monthTotal,
      monthCount: monthAgg._count._all ?? 0,
      monthPaid: monthAgg._sum.paidAmount ?? 0,
      lastMonthPurchases: lastMonthTotal,
      growthVsLastMonth,
      totalPurchases: totalAgg._sum.total ?? 0,
      totalPaid: totalAgg._sum.paidAmount ?? 0,
      totalCount,
      outstandingDue: pendingPaymentAgg._sum.outstandingDue ?? 0,
      suppliersWithDue: pendingPaymentAgg._count._all ?? 0,
      salesTrend7Days: Object.values(trendBuckets),
      paymentBreakdown: paymentBreakdown.map((p) => ({
        paymentMethod: p.paymentMethod,
        total: p._sum.total ?? 0,
        count: p._count._all,
      })),
      topSuppliers,
      topProducts,
      recentPurchases: recentPurchases.map((p) => ({
        id: p.id,
        purchaseNumber: p.purchaseNumber,
        total: p.total,
        supplierName: p.supplier?.name,
        purchasedAt: p.purchasedAt,
      })),
    };
  }
}
