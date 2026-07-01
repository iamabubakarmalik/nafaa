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
    // ─── Validate shop ────────────────────────────────────────
    const shop = await this.prisma.shop.findFirst({
      where: { id: dto.shopId, tenantId: user.tenantId, isActive: true },
    });
    if (!shop) throw new NotFoundException('Shop not found or inactive');

    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const variantIds = [
      ...new Set(dto.items.map((i) => i.variantId).filter(Boolean) as string[]),
    ];
    const imeiIds = [
      ...new Set(dto.items.map((i) => i.imeiId).filter(Boolean) as string[]),
    ];

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
      throw new NotFoundException('One or more variants not found');
    }

    // ─── Validate IMEIs ─────────────────────────────────────────
    const imeis = imeiIds.length
      ? await this.prisma.productImei.findMany({
          where: {
            id: { in: imeiIds },
            tenantId: user.tenantId,
          },
        })
      : [];
    if (imeis.length !== imeiIds.length) {
      throw new NotFoundException('One or more IMEIs not found');
    }
    // Ensure all IMEIs are IN_STOCK
    const unavailableImei = imeis.find((i) => i.status !== 'IN_STOCK');
    if (unavailableImei) {
      throw new BadRequestException(
        `IMEI ${unavailableImei.imei1} is ${unavailableImei.status} — cannot sell`,
      );
    }
    // Check for duplicates in current cart
    const dupCheck = new Set<string>();
    for (const id of imeiIds) {
      if (dupCheck.has(id)) {
        throw new BadRequestException('Duplicate IMEI in cart');
      }
      dupCheck.add(id);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const variantMap = new Map(variants.map((v) => [v.id, v]));
    const imeiMap = new Map(imeis.map((i) => [i.id, i]));

    // ─── Detect carpet items ─────────────────────────────────
    const carpetUnits = new Set(['sqft', 'sqm', 'sqyd']);
    const carpetItemIndices = new Set<number>();
    dto.items.forEach((item, idx) => {
      const product = productMap.get(item.productId);
      const note = item.note || '';
      const isCarpetSale =
        note.startsWith('Cut from ') ||
        note.startsWith('Cut piece ') ||
        (product && carpetUnits.has(product.unit));
      if (isCarpetSale) carpetItemIndices.add(idx);
    });

    // ─── IMEI items: also skip ShopStock check (stock managed by IMEI count) ──
    const imeiItemIndices = new Set<number>();
    dto.items.forEach((item, idx) => {
      if (item.imeiId) imeiItemIndices.add(idx);
    });

    // ─── Fetch shop stock for standard items only ────────────
    const standardItems = dto.items.filter(
      (_, idx) => !carpetItemIndices.has(idx) && !imeiItemIndices.has(idx),
    );
    const shopStocks = standardItems.length > 0
      ? await this.prisma.shopStock.findMany({
          where: {
            shopId: dto.shopId,
            OR: standardItems.map((i) => ({
              productId: i.productId,
              variantId: i.variantId ?? null,
            })),
          },
        })
      : [];
    const stockMap = new Map(
      shopStocks.map((s) => [`${s.productId}:${s.variantId ?? 'null'}`, s]),
    );

    let subtotal = 0;
    let costOfGoods = 0;
    let totalLineDiscount = 0;

    const normalizedItems = dto.items.map((item, idx) => {
      const product = productMap.get(item.productId)!;
      const variant = item.variantId ? variantMap.get(item.variantId) : null;
      const imei = item.imeiId ? imeiMap.get(item.imeiId) : null;
      const itemName = variant ? `${product.name} (${variant.name})` : product.name;

      // ─── Resolve unit price ─────────────────────────────────
      let unitPrice: number;
      if (item.priceOverride !== undefined && item.priceOverride !== null) {
        unitPrice = item.priceOverride;
      } else if (item.useWholesale) {
        unitPrice = (variant?.wholesalePrice ?? product.wholesalePrice ?? variant?.price ?? product.price);
      } else {
        unitPrice = variant?.price ?? product.price;
      }

      // IMEI cost takes precedence (per-unit cost on IMEI)
      const unitCost = imei?.costPrice ?? variant?.costPrice ?? product.costPrice ?? 0;
      const quantity = Number(item.quantity);

      // ─── IMEI sale: enforce quantity = 1 ───────────────────
      if (item.imeiId && quantity !== 1) {
        throw new BadRequestException(
          `${itemName}: IMEI sale must have quantity = 1`,
        );
      }

      // ─── Stock check (skip for carpet + IMEI) ──────────────
      const isCarpetItem = carpetItemIndices.has(idx);
      const isImeiItem = imeiItemIndices.has(idx);
      let shopStock = null;

      if (!isCarpetItem && !isImeiItem) {
        const stockKey = `${item.productId}:${item.variantId ?? 'null'}`;
        shopStock = stockMap.get(stockKey);

        if (!shopStock) {
          throw new BadRequestException(
            `${itemName} is not available in ${shop.name}. Transfer karein ya purchase entry karein.`,
          );
        }

        if (shopStock.stock < quantity) {
          throw new BadRequestException(
            `${itemName} insufficient in ${shop.name}. Available: ${shopStock.stock}`,
          );
        }
      }

      const lineGross = unitPrice * quantity;
      const lineDiscount = item.lineDiscount ?? 0;
      if (lineDiscount > lineGross) {
        throw new BadRequestException(`Line discount cannot exceed line total for ${itemName}`);
      }

      const lineTotal = lineGross - lineDiscount;
      const lineCost = unitCost * quantity;

      subtotal += lineGross;
      totalLineDiscount += lineDiscount;
      costOfGoods += lineCost;

      return {
        productId: product.id,
        variantId: variant?.id,
        imeiId: imei?.id,
        imeiNumber: imei?.imei1,
        shopStockId: shopStock?.id ?? null,
        isCarpetItem,
        isImeiItem,
        quantity,
        price: unitPrice,
        costPrice: unitCost,
        lineDiscount,
        total: lineTotal,
        note: item.note,
        internalNote: item.internalNote,
      };
    });

    // ─── Discount code ────────────────────────────────────────
    let discount = (dto.discount ?? 0) + totalLineDiscount;
    let discountCodeId: string | undefined;
    let discountCodeStr: string | undefined;

    if (dto.discountCode) {
      const validated = await this.discounts.validate(
        user, dto.discountCode, subtotal - totalLineDiscount,
      );
      discount += validated.discount;
      discountCodeId = validated.id;
      discountCodeStr = validated.code;
    }

    // ─── Loyalty ──────────────────────────────────────────────
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    });

    let loyaltyDiscount = 0;
    let loyaltyPointsUsed = 0;

    if (dto.loyaltyPointsToUse && dto.loyaltyPointsToUse > 0 && dto.customerId && settings?.enableLoyalty) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId: user.tenantId },
      });
      if (!customer) throw new NotFoundException('Customer not found');
      if (dto.loyaltyPointsToUse > customer.loyaltyPoints) {
        throw new BadRequestException(`Insufficient loyalty points (have ${customer.loyaltyPoints})`);
      }
      loyaltyDiscount = dto.loyaltyPointsToUse * settings.loyaltyRedemptionRate;
      loyaltyPointsUsed = dto.loyaltyPointsToUse;
    }

    const totalDiscount = discount + loyaltyDiscount;

    // ─── Service Charges (Carpet installation, glue, delivery, etc.) ──
    const serviceChargesArr = dto.serviceCharges ?? [];
    const serviceChargesTotal = serviceChargesArr.reduce(
      (sum, sc) => sum + Number(sc.amount || 0),
      0,
    );

    const total = Math.max(subtotal - totalDiscount + serviceChargesTotal, 0);
    const paidAmount = dto.paidAmount;
    const creditAmount = Math.max(total - paidAmount, 0);
    const changeAmount = Math.max(paidAmount - total, 0);

    if (creditAmount > 0 && !dto.customerId) {
      throw new BadRequestException('Udhaar sale ke liye customer select karna zaroori hai');
    }

    let loyaltyEarned = 0;
    if (settings?.enableLoyalty && dto.customerId && total > 0) {
      loyaltyEarned = Math.floor(total * settings.loyaltyPointsPerRupee);
    }

    const saleNumber = `NF-${Date.now().toString().slice(-8)}`;

    const cashRegister = await this.prisma.cashRegister.findFirst({
      where: { tenantId: user.tenantId, shopId: dto.shopId, status: 'OPEN' },
    });

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
          shopId: dto.shopId,
          cashRegisterId: cashRegister?.id,
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
          serviceCharges: serviceChargesTotal,
          serviceChargesBreakdown:
            serviceChargesArr.length > 0
              ? (serviceChargesArr as any)
              : undefined,
          items: {
            create: normalizedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              costPrice: item.costPrice,
              total: item.total,
              note: item.note,
              internalNote: item.internalNote,
              ...(item.variantId && {
                variantLink: { create: { variantId: item.variantId } },
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
          shop: true,
          createdBy: { select: { id: true, fullName: true, email: true } },
        },
      });

      // ─── Process each item ──────────────────────────────────
      for (let idx = 0; idx < normalizedItems.length; idx++) {
        const item = normalizedItems[idx];
        const saleItem = sale.items[idx];

        // ─── IMEI items: mark SOLD + sync stock ───────────────
        if (item.isImeiItem && item.imeiId) {
          const updatedImei = await tx.productImei.update({
            where: { id: item.imeiId },
            data: {
              status: 'SOLD',
              saleItemId: saleItem.id,
              soldPrice: item.price,
              soldAt: new Date(),
            },
          });

          // Recalc product/variant stock from remaining IN_STOCK IMEIs
          const productStock = await tx.productImei.count({
            where: {
              tenantId: user.tenantId,
              productId: item.productId,
              status: 'IN_STOCK',
            },
          });
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: productStock },
          });

          if (item.variantId) {
            const variantStock = await tx.productImei.count({
              where: {
                tenantId: user.tenantId,
                productId: item.productId,
                variantId: item.variantId,
                status: 'IN_STOCK',
              },
            });
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: variantStock },
            });
          }

          // Sync ShopStock for this shop
          const existingShopStock = await tx.shopStock.findFirst({
            where: {
              shopId: dto.shopId,
              productId: item.productId,
              variantId: item.variantId ?? null,
            },
          });
          if (existingShopStock) {
            const newShopStock = Math.max(Number(existingShopStock.stock) - 1, 0);
            await tx.shopStock.update({
              where: { id: existingShopStock.id },
              data: { stock: newShopStock },
            });
          }

          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId,
              productId: item.productId,
              type: 'SALE_OUT',
              quantity: -item.quantity,
              balanceAfter: productStock,
              reference: sale.saleNumber,
              note: `IMEI ${updatedImei.imei1} sold at ${shop.name}`,
            },
          });
          continue;
        }

        // ─── Carpet items: audit log only ─────────────────────
        if (item.isCarpetItem) {
          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId,
              productId: item.productId,
              type: 'SALE_OUT',
              quantity: -item.quantity,
              balanceAfter: 0,
              reference: sale.saleNumber,
              note: `Carpet sale at ${shop.name}${item.note ? ` • ${item.note}` : ''}`,
            },
          });
          continue;
        }

        // ─── Standard items: decrement ShopStock + global stock ──
        const updatedShopStock = await tx.shopStock.update({
          where: { id: item.shopStockId! },
          data: { stock: { decrement: item.quantity } },
        });

        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            productId: item.productId,
            type: 'SALE_OUT',
            quantity: -item.quantity,
            balanceAfter: updatedShopStock.stock,
            reference: sale.saleNumber,
            note: `Sale at ${shop.name}${item.note ? ` • ${item.note}` : ''}`,
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
            note: `Udhaar sale: ${sale.saleNumber} (${shop.name})`,
          },
        });
      }

      if (customer) {
        let newPoints = customer.loyaltyPoints;
        if (loyaltyPointsUsed > 0) {
          newPoints -= loyaltyPointsUsed;
          await tx.loyaltyTransaction.create({
            data: {
              tenantId: user.tenantId, customerId: customer.id, type: 'REDEEMED',
              points: -loyaltyPointsUsed, balanceAfter: newPoints,
              reference: sale.saleNumber, note: `Redeemed for Rs ${loyaltyDiscount.toFixed(2)}`,
            },
          });
        }
        if (loyaltyEarned > 0) {
          newPoints += loyaltyEarned;
          await tx.loyaltyTransaction.create({
            data: {
              tenantId: user.tenantId, customerId: customer.id, type: 'EARNED',
              points: loyaltyEarned, balanceAfter: newPoints,
              reference: sale.saleNumber, note: `Earned from ${sale.saleNumber}`,
            },
          });
        }
        await tx.customer.update({
          where: { id: customer.id },
          data: { loyaltyPoints: newPoints, totalSpent: { increment: total } },
        });
      }

      return sale;
    });
  }

  async findAll(user: AuthenticatedUser, shopId?: string) {
    return this.prisma.sale.findMany({
      where: {
        tenantId: user.tenantId,
        ...(shopId && { shopId }),
      },
      include: {
        customer: true,
        shop: true,
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
        shop: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        items: {
          include: {
            product: { include: { brand: true } },
            variantLink: { include: { variant: true } },
          },
        },
        tenant: true,
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');

    // Enrich with IMEIs sold under this sale
    const saleItemIds = sale.items.map((i) => i.id);
    const imeis = saleItemIds.length > 0
      ? await this.prisma.productImei.findMany({
          where: {
            tenantId: user.tenantId,
            saleItemId: { in: saleItemIds },
          },
          select: {
            id: true,
            imei1: true,
            imei2: true,
            serialNumber: true,
            ptaStatus: true,
            ptaTaxPaid: true,
            warrantyMonths: true,
            warrantyExpiry: true,
            color: true,
            costPrice: true,
            soldPrice: true,
            saleItemId: true,
            productId: true,
          },
        })
      : [];

    // Attach IMEIs to corresponding sale items
    const enrichedItems = sale.items.map((item) => ({
      ...item,
      imeis: imeis.filter((i) => i.saleItemId === item.id),
    }));

    return { ...sale, items: enrichedItems };
  }

  async summary(user: AuthenticatedUser, shopId?: string) {
    const todayStart = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());
    const baseWhere = {
      tenantId: user.tenantId,
      status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] as any },
      ...(shopId && { shopId }),
    };

    const [todayAgg, monthAgg, totalAgg, totalOrders, paymentBreakdown, shopBreakdown] =
      await Promise.all([
        this.prisma.sale.aggregate({
          where: { ...baseWhere, soldAt: { gte: todayStart } },
          _sum: { total: true, costOfGoods: true, creditAmount: true, paidAmount: true },
          _count: { _all: true },
        }),
        this.prisma.sale.aggregate({
          where: { ...baseWhere, soldAt: { gte: monthStart } },
          _sum: { total: true, costOfGoods: true },
        }),
        this.prisma.sale.aggregate({
          where: baseWhere,
          _sum: { total: true, costOfGoods: true },
        }),
        this.prisma.sale.count({ where: baseWhere }),
        this.prisma.sale.groupBy({
          by: ['paymentMethod'], where: baseWhere,
          _count: { _all: true }, _sum: { total: true },
        }),
        this.prisma.sale.groupBy({
          by: ['shopId'],
          where: { tenantId: user.tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } },
          _count: { _all: true }, _sum: { total: true, costOfGoods: true },
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
      shopBreakdown,
    };
  }

  async voidSale(user: AuthenticatedUser, id: string, reason?: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: { include: { variantLink: true } } },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status === 'VOIDED') throw new BadRequestException('Sale already voided');
    if (!sale.shopId) throw new BadRequestException('Sale has no shop linked — cannot void safely');

    return this.prisma.$transaction(async (tx) => {
      // ─── Restore IMEIs (mark IN_STOCK again) ──────────────────
      const saleItemIds = sale.items.map((i) => i.id);
      if (saleItemIds.length > 0) {
        const imeis = await tx.productImei.findMany({
          where: {
            tenantId: user.tenantId,
            saleItemId: { in: saleItemIds },
          },
        });
        for (const imei of imeis) {
          await tx.productImei.update({
            where: { id: imei.id },
            data: {
              status: 'IN_STOCK',
              saleItemId: null,
              soldPrice: null,
              soldAt: null,
            },
          });
        }
      }

      for (const item of sale.items) {
        const itemNote = (item as any).note || '';
        const isCarpetItem = itemNote.startsWith('Cut from ') || itemNote.startsWith('Cut piece ');
        const isImeiItem = itemNote.startsWith('IMEI:');

        if (isCarpetItem) {
          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId,
              productId: item.productId,
              type: 'RETURN_IN',
              quantity: item.quantity,
              balanceAfter: 0,
              reference: sale.saleNumber,
              note: `Voided carpet sale — manual roll adjustment needed: ${reason || 'No reason'}`,
            },
          });
          continue;
        }

        const variantId = item.variantLink?.variantId ?? null;

        if (isImeiItem) {
          // IMEI restoration: recalc stock from IMEI count
          const productStock = await tx.productImei.count({
            where: {
              tenantId: user.tenantId,
              productId: item.productId,
              status: 'IN_STOCK',
            },
          });
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: productStock },
          });
          if (variantId) {
            const variantStock = await tx.productImei.count({
              where: {
                tenantId: user.tenantId,
                productId: item.productId,
                variantId,
                status: 'IN_STOCK',
              },
            });
            await tx.productVariant.update({
              where: { id: variantId },
              data: { stock: variantStock },
            });
          }
          // ShopStock restore
          const existing = await tx.shopStock.findFirst({
            where: { shopId: sale.shopId!, productId: item.productId, variantId },
          });
          if (existing) {
            await tx.shopStock.update({
              where: { id: existing.id },
              data: { stock: { increment: item.quantity } },
            });
          }

          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId,
              productId: item.productId,
              type: 'RETURN_IN',
              quantity: item.quantity,
              balanceAfter: productStock,
              reference: sale.saleNumber,
              note: `Voided IMEI sale: ${reason || 'No reason'}`,
            },
          });
          continue;
        }

        // Standard items
        const shopStock = await tx.shopStock.findFirst({
          where: { shopId: sale.shopId!, productId: item.productId, variantId },
        });

        if (shopStock) {
          await tx.shopStock.update({
            where: { id: shopStock.id },
            data: { stock: { increment: item.quantity } },
          });
        } else {
          await tx.shopStock.create({
            data: {
              tenantId: user.tenantId,
              shopId: sale.shopId!,
              productId: item.productId,
              variantId,
              stock: item.quantity,
            },
          });
        }

        if (variantId) {
          await tx.productVariant.update({
            where: { id: variantId },
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
        const customer = await tx.customer.findUnique({ where: { id: sale.customerId } });
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

      return tx.sale.update({ where: { id }, data: { status: 'VOIDED' } });
    });
  }
}
