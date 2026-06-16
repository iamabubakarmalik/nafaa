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
    // Collect all unique product IDs and variant IDs
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const variantIds = [
      ...new Set(dto.items.map((i) => i.variantId).filter(Boolean) as string[]),
    ];

    // Fetch products
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

    // Fetch variants if any
    const variants = variantIds.length
      ? await this.prisma.productVariant.findMany({
          where: {
            id: { in: variantIds },
            isActive: true,
            product: { tenantId: user.tenantId, isActive: true },
          },
        })
      : [];

    if (variants.length !== variantIds.length) {
      throw new NotFoundException('One or more variants not found or inactive');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    let subtotal = 0;
    let costOfGoods = 0;
    let totalLineDiscount = 0;

    const normalizedItems = dto.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new NotFoundException('Product not found');

      const variant = item.variantId ? variantMap.get(item.variantId) : null;
      if (item.variantId && !variant) {
        throw new NotFoundException('Variant not found');
      }
      if (variant && variant.productId !== product.id) {
        throw new BadRequestException('Variant does not belong to this product');
      }

      // Resolve unit price: priceOverride > wholesale > variant.price > product.price
      let unitPrice: number;
      if (item.priceOverride !== undefined && item.priceOverride !== null) {
        unitPrice = item.priceOverride;
      } else if (item.useWholesale) {
        unitPrice =
          (variant?.wholesalePrice ?? product.wholesalePrice ?? variant?.price ?? product.price);
      } else {
        unitPrice = variant?.price ?? product.price;
      }

      const unitCost = variant?.costPrice ?? product.costPrice ?? 0;
      const quantity = Number(item.quantity);

      // Stock check
      const availableStock = variant ? variant.stock : product.stock;
      const itemName = variant
        ? `${product.name} (${variant.name})`
        : product.name;

      if (availableStock < quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${itemName}. Available: ${availableStock}`,
        );
      }

      const lineGross = unitPrice * quantity;
      const lineDiscount = item.lineDiscount ?? 0;

      if (lineDiscount > lineGross) {
        throw new BadRequestException(
          `Line discount cannot exceed line total for ${itemName}`,
        );
      }

      const lineTotal = lineGross - lineDiscount;
      const lineCost = unitCost * quantity;

      subtotal += lineGross;
      totalLineDiscount += lineDiscount;
      costOfGoods += lineCost;

      return {
        productId: product.id,
        variantId: variant?.id,
        quantity,
        price: unitPrice,
        costPrice: unitCost,
        lineDiscount,
        total: lineTotal,
        note: item.note,
        productSnapshot: { name: product.name, unit: product.unit },
        variantSnapshot: variant ? { name: variant.name, sku: variant.sku } : null,
      };
    });

    // Apply discount code
    let discount = (dto.discount ?? 0) + totalLineDiscount;
    let discountCodeId: string | undefined;
    let discountCodeStr: string | undefined;

    if (dto.discountCode) {
      const validated = await this.discounts.validate(
        user,
        dto.discountCode,
        subtotal - totalLineDiscount,
      );
      discount += validated.discount;
      discountCodeId = validated.id;
      discountCodeStr = validated.code;
    }

    // Loyalty discount
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

      loyaltyDiscount = dto.loyaltyPointsToUse * settings.loyaltyRedemptionRate;
      loyaltyPointsUsed = dto.loyaltyPointsToUse;
    }

    const totalDiscount = discount + loyaltyDiscount;
    const total = Math.max(subtotal - totalDiscount, 0);

    const paidAmount = dto.paidAmount;
    const creditAmount = Math.max(total - paidAmount, 0);
    const changeAmount = Math.max(paidAmount - total, 0);

    // Auto-allow credit if customer selected
    if (creditAmount > 0) {
      if (!dto.customerId) {
        throw new BadRequestException(
          'Udhaar/Khata sale ke liye customer select karna zaroori hai',
        );
      }
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
          items: {
            create: normalizedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              costPrice: item.costPrice,
              total: item.total,
              ...(item.variantId && {
                variantLink: {
                  create: { variantId: item.variantId },
                },
              }),
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
              variantLink: { include: { variant: true } },
            },
          },
          customer: true,
          createdBy: { select: { id: true, fullName: true, email: true } },
        },
      });

      // Decrement stock — variant if specified, else product
      for (const item of normalizedItems) {
        if (item.variantId) {
          const updated = await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
          // Also decrement parent product stock to keep it in sync
          const parentUpdated = await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId,
              productId: item.productId,
              type: 'SALE_OUT',
              quantity: -item.quantity,
              balanceAfter: parentUpdated.stock,
              reference: sale.saleNumber,
              note: `Variant: ${updated.name}${item.note ? ` • ${item.note}` : ''}`,
            },
          });
        } else {
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
              note: item.note || 'POS sale',
            },
          });
        }
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
              note: `Redeemed for Rs ${loyaltyDiscount.toFixed(2)}`,
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
        items: {
          include: {
            product: true,
            variantLink: { include: { variant: true } },
          },
        },
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
        items: {
          include: {
            product: true,
            variantLink: { include: { variant: true } },
          },
        },
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
      include: {
        items: {
          include: { variantLink: true },
        },
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status === 'VOIDED') {
      throw new BadRequestException('Sale already voided');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        // Restore variant stock if applicable
        if (item.variantLink) {
          await tx.productVariant.update({
            where: { id: item.variantLink.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }

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
