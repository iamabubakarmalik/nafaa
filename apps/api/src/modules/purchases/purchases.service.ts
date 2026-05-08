import { Injectable, NotFoundException } from '@nestjs/common';
import { startOfDay, startOfMonth } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreatePurchaseDto) {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id: dto.supplierId,
        tenantId: user.tenantId,
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        id: { in: productIds },
      },
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
      };
    });

    const discount = dto.discount ?? 0;
    const total = Math.max(subtotal - discount, 0);
    const paidAmount = dto.paidAmount ?? total;

    const purchaseNumber = `PO-${Date.now().toString().slice(-8)}`;

    return this.prisma.$transaction(async (tx) => {
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
            create: normalizedItems,
          },
        },
        include: {
          items: { include: { product: true } },
          supplier: true,
        },
      });

      for (const item of normalizedItems) {
        const updated = await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            costPrice: item.costPrice,
          },
        });

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
      }

      return purchase;
    });
  }

  findAll(user: AuthenticatedUser) {
    return this.prisma.purchase.findMany({
      where: {
        tenantId: user.tenantId,
      },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { purchasedAt: 'desc' },
      take: 50,
    });
  }

  async summary(user: AuthenticatedUser) {
    const todayStart = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());

    const [todayAgg, monthAgg, totalAgg, totalCount] = await Promise.all([
      this.prisma.purchase.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'RECEIVED',
          purchasedAt: { gte: todayStart },
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.purchase.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'RECEIVED',
          purchasedAt: { gte: monthStart },
        },
        _sum: { total: true },
      }),
      this.prisma.purchase.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'RECEIVED',
        },
        _sum: { total: true },
      }),
      this.prisma.purchase.count({
        where: {
          tenantId: user.tenantId,
          status: 'RECEIVED',
        },
      }),
    ]);

    return {
      todayPurchases: todayAgg._sum.total ?? 0,
      todayCount: todayAgg._count._all ?? 0,
      monthPurchases: monthAgg._sum.total ?? 0,
      totalPurchases: totalAgg._sum.total ?? 0,
      totalCount,
    };
  }
}
