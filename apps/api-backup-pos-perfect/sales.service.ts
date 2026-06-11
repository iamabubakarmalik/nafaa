import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { startOfDay, startOfMonth } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateSaleDto } from './dto/create-sale.dto';
import { DiscountsService } from '../discounts/discounts.service';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discounts: DiscountsService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateSaleDto) {
    const productIds = dto.items.map((item) => item.productId);

    const products = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        id: { in: productIds },
        isActive: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    let costOfGoods = 0;

    const normalizedItems = dto.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new NotFoundException('Product not found');

      if (product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      }

      const lineTotal = product.price * item.quantity;
      const lineCost = product.costPrice * item.quantity;
      subtotal += lineTotal;
      costOfGoods += lineCost;

      return {
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
        costPrice: product.costPrice,
        total: lineTotal,
      };
    });

    let discount = dto.discount ?? 0;
    let discountCodeId: string | undefined;
    let discountCodeStr: string | undefined;

    if (dto.discountCode) {
      const validated = await this.discounts.validate(user, dto.discountCode, subtotal);
      discount += validated.discount;
      discountCodeId = validated.id;
      discountCodeStr = validated.code;
    }

    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    });

    let loyaltyDiscount = 0;
    let loyaltyPointsUsed = 0;

    if (
      dto.loyaltyPointsToUse &&
      dto.loyaltyPointsToUse > 0 &&
      dto.customerId &&
      settings?.enableLoyalty
    ) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId: user.tenantId },
      });
      if (!customer) throw new NotFoundException('Customer not found');

      if (dto.loyaltyPointsToUse > customer.loyaltyPoints) {
        throw new BadRequestException(
          `Insufficient loyalty points (have ${customer.loyaltyPoints})`,
        );
      }

      // Minimum redemption check removed (use loyaltyRedemptionRate instead)

      loyaltyDiscount = dto.loyaltyPointsToUse * settings.loyaltyRedemptionRate;
      loyaltyPointsUsed = dto.loyaltyPointsToUse;
    }

    const totalDiscount = discount + loyaltyDiscount;
    const total = Math.max(subtotal - totalDiscount, 0);

    const paidAmount = dto.paidAmount;
    const creditAmount = Math.max(total - paidAmount, 0);
    const changeAmount = Math.max(paidAmount - total, 0);

    // ✅ AUTO-ALLOW CREDIT if customer is selected
    if (creditAmount > 0) {
      if (!dto.customerId) {
        throw new BadRequestException(
          'Udhaar/Khata sale ke liye customer select karna zaroori hai',
        );
      }
      // If customer is provided, automatically allow credit (user-friendly)
    }

    let loyaltyEarned = 0;
    if (settings?.enableLoyalty && dto.customerId && total > 0) {
      loyaltyEarned = Math.floor(total * settings.loyaltyPointsPerRupee);
    }

    const saleNumber = `NF-${Date.now().toString().slice(-8)}`;

    return this.prisma.$transaction(async (tx) => {
      let customer = null;
      if (dto.customerId) {
        customer = await tx.customer.findFirst({
          where: { id: dto.customerId, tenantId: user.tenantId },
        });
        if (!customer) throw new NotFoundException('Customer not found');
      }

      const sale = await tx.sale.create({
        data: {
          tenantId: user.tenantId,
          customerId: dto.customerId,
          createdById: user.id,
          discountCodeId,
          discountCode: discountCodeStr,
          saleNumber,
          subtotal,
          discount: totalDiscount,
          loyaltyUsed: loyaltyPointsUsed,
          loyaltyEarned,
          total,
          costOfGoods,
          paidAmount,
          changeAmount,
          creditAmount,
          paymentMethod: dto.paymentMethod,
          status: 'COMPLETED',
          items: { create: normalizedItems },
        },
        include: {
          items: { include: { product: true } },
          customer: true,
          createdBy: { select: { id: true, fullName: true, email: true } },
        },
      });

      for (const item of normalizedItems) {
        const updated = await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            productId: item.productId,
            type: 'SALE_OUT',
            quantity: -item.quantity,
            balanceAfter: updated.stock,
            reference: sale.saleNumber,
            note: 'POS sale',
          },
        });
      }

      if (discountCodeId) {
        await tx.discountCode.update({
          where: { id: discountCodeId },
          data: { usageCount: { increment: 1 } },
        });
      }

      if (creditAmount > 0 && customer) {
        const newBalance = customer.balance + creditAmount;
        await tx.customer.update({
          where: { id: customer.id },
          data: { balance: newBalance },
        });

        await tx.customerLedger.create({
          data: {
            tenantId: user.tenantId,
            customerId: customer.id,
            createdById: user.id,
            type: 'SALE_CREDIT',
            amount: creditAmount,
            balanceAfter: newBalance,
            reference: sale.saleNumber,
            note: `Udhaar sale: ${sale.saleNumber}`,
          },
        });
      }

      if (customer) {
        let newPoints = customer.loyaltyPoints;

        if (loyaltyPointsUsed > 0) {
          newPoints -= loyaltyPointsUsed;
          await tx.loyaltyTransaction.create({
            data: {
              tenantId: user.tenantId,
              customerId: customer.id,
              type: 'REDEEMED',
              points: -loyaltyPointsUsed,
              balanceAfter: newPoints,
              reference: sale.saleNumber,
              note: `Redeemed for Rs ${loyaltyDiscount.toFixed(0)}`,
            },
          });
        }

        if (loyaltyEarned > 0) {
          newPoints += loyaltyEarned;
          await tx.loyaltyTransaction.create({
            data: {
              tenantId: user.tenantId,
              customerId: customer.id,
              type: 'EARNED',
              points: loyaltyEarned,
              balanceAfter: newPoints,
              reference: sale.saleNumber,
              note: `Earned from ${sale.saleNumber}`,
            },
          });
        }

        await tx.customer.update({
          where: { id: customer.id },
          data: {
            loyaltyPoints: newPoints,
            totalSpent: { increment: total },
          },
        });
      }

      return sale;
    });
  }

  async findAll(user: AuthenticatedUser) {
    return this.prisma.sale.findMany({
      where: { tenantId: user.tenantId },
      include: {
        customer: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        items: { include: { product: true } },
      },
      orderBy: { soldAt: 'desc' },
      take: 50,
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        customer: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        items: { include: { product: true } },
        tenant: true,
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async summary(user: AuthenticatedUser) {
    const todayStart = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());

    const [todayAgg, monthAgg, totalAgg, totalOrders, paymentBreakdown] =
      await Promise.all([
        this.prisma.sale.aggregate({
          where: {
            tenantId: user.tenantId,
            status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
            soldAt: { gte: todayStart },
          },
          _sum: { total: true, costOfGoods: true, creditAmount: true, paidAmount: true },
          _count: { _all: true },
        }),
        this.prisma.sale.aggregate({
          where: {
            tenantId: user.tenantId,
            status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
            soldAt: { gte: monthStart },
          },
          _sum: { total: true, costOfGoods: true },
        }),
        this.prisma.sale.aggregate({
          where: {
            tenantId: user.tenantId,
            status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
          },
          _sum: { total: true, costOfGoods: true },
        }),
        this.prisma.sale.count({
          where: {
            tenantId: user.tenantId,
            status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
          },
        }),
        this.prisma.sale.groupBy({
          by: ['paymentMethod'],
          where: {
            tenantId: user.tenantId,
            status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
          },
          _count: { _all: true },
          _sum: { total: true },
        }),
      ]);

    return {
      todaySales: todayAgg._sum.total ?? 0,
      todayOrders: todayAgg._count._all ?? 0,
      todayProfit: (todayAgg._sum.total ?? 0) - (todayAgg._sum.costOfGoods ?? 0),
      todayCredit: todayAgg._sum.creditAmount ?? 0,
      todayPaid: todayAgg._sum.paidAmount ?? 0,
      monthSales: monthAgg._sum.total ?? 0,
      monthProfit: (monthAgg._sum.total ?? 0) - (monthAgg._sum.costOfGoods ?? 0),
      totalSales: totalAgg._sum.total ?? 0,
      totalProfit: (totalAgg._sum.total ?? 0) - (totalAgg._sum.costOfGoods ?? 0),
      totalOrders,
      paymentBreakdown,
    };
  }

  async voidSale(user: AuthenticatedUser, id: string, reason?: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status === 'VOIDED') {
      throw new BadRequestException('Sale already voided');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        const updated = await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            productId: item.productId,
            type: 'RETURN_IN',
            quantity: item.quantity,
            balanceAfter: updated.stock,
            reference: sale.saleNumber,
            note: `Voided: ${reason || 'No reason'}`,
          },
        });
      }

      if (sale.creditAmount > 0 && sale.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: sale.customerId },
        });
        if (customer) {
          const newBalance = Math.max(customer.balance - sale.creditAmount, 0);
          await tx.customer.update({
            where: { id: sale.customerId },
            data: { balance: newBalance },
          });
          await tx.customerLedger.create({
            data: {
              tenantId: user.tenantId,
              customerId: sale.customerId,
              createdById: user.id,
              type: 'ADJUSTMENT',
              amount: -sale.creditAmount,
              balanceAfter: newBalance,
              reference: sale.saleNumber,
              note: `Sale voided: ${reason || ''}`,
            },
          });
        }
      }

      return tx.sale.update({
        where: { id },
        data: { status: 'VOIDED' },
      });
    });
  }
}
