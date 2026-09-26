import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { startOfDay, startOfMonth } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import { CreateSaleDto } from './dto/create-sale.dto';
import { DiscountsService } from '../discounts/discounts.service';
import { FbrService } from '../../../integrations/fbr/fbr.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService,
    private readonly discounts: DiscountsService,
    private readonly notifications: NotificationsService,
    private readonly fbr: FbrService,
  ) {}

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateSaleDto) {
    // A sale happens at exactly one counter. The body may name the branch
    // (offline queue replays carry it); otherwise use the one being viewed.
    const sellingShopId = await resolveWriteShopId(
      this.prisma,
      user.tenantId,
      scope,
      dto.shopId,
    );

    // ─── Validate every item has EITHER productId OR usedPhoneId ──
    for (const item of dto.items) {
      if (!item.productId && !item.usedPhoneId) {
        throw new BadRequestException('Har item ke liye productId ya usedPhoneId zaroori hai');
      }
      if (item.productId && item.usedPhoneId) {
        throw new BadRequestException('Ek item me productId aur usedPhoneId dono nahi ho sakte');
      }
    }

    // ─── Validate shop ────────────────────────────────────────
    const shop = await this.prisma.shop.findFirst({
      where: { id: sellingShopId, tenantId: user.tenantId, isActive: true },
    });
    if (!shop) throw new NotFoundException('Shop not found or inactive');

    const productItems = dto.items.filter((i) => !!i.productId);
    const usedPhoneItems = dto.items.filter((i) => !!i.usedPhoneId);

    const productIds = [...new Set(productItems.map((i) => i.productId as string))];
    const variantIds = [
      ...new Set(productItems.map((i) => i.variantId).filter(Boolean) as string[]),
    ];
    const imeiIds = [
      ...new Set(productItems.map((i) => i.imeiId).filter(Boolean) as string[]),
    ];
    const usedPhoneIds = [
      ...new Set(usedPhoneItems.map((i) => i.usedPhoneId as string)),
    ];
    // Electronics: serial/IMEI se track hone wale units (laptop, TV, camera…)
    const serialIds = [
      ...new Set(productItems.map((i) => i.serialId).filter(Boolean) as string[]),
    ];

    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: {
            tenantId: user.tenantId,
            id: { in: productIds },
            isActive: true,
          },
        })
      : [];
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

    // ─── Validate new-phone IMEIs ─────────────────────────────
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
    const unavailableImei = imeis.find((i) => i.status !== 'IN_STOCK');
    if (unavailableImei) {
      throw new BadRequestException(
        `IMEI ${unavailableImei.imei1} is ${unavailableImei.status} — cannot sell`,
      );
    }
    const imeiDupCheck = new Set<string>();
    for (const id of imeiIds) {
      if (imeiDupCheck.has(id)) throw new BadRequestException('Duplicate IMEI in cart');
      imeiDupCheck.add(id);
    }

    // ─── Validate electronics serials ─────────────────────────
    const serials = serialIds.length
      ? await this.prisma.electronicsSerialTracking.findMany({
          where: { id: { in: serialIds }, tenantId: user.tenantId },
        })
      : [];
    if (serials.length !== serialIds.length) {
      throw new NotFoundException('Ek ya zyada serial nahi mile');
    }
    const unavailableSerial = serials.find((sr) => sr.status !== 'IN_STOCK');
    if (unavailableSerial) {
      throw new BadRequestException(
        `Serial ${unavailableSerial.serialNumber} is ${unavailableSerial.status} — bech nahi sakte`,
      );
    }
    const serialDupCheck = new Set<string>();
    for (const id of serialIds) {
      if (serialDupCheck.has(id)) throw new BadRequestException('Ek hi serial cart me do dafa hai');
      serialDupCheck.add(id);
    }

    // ─── Validate used phones ───────────────────────────────────
    const usedPhones = usedPhoneIds.length
      ? await this.prisma.usedPhone.findMany({
          where: {
            id: { in: usedPhoneIds },
            tenantId: user.tenantId,
          },
        })
      : [];
    if (usedPhones.length !== usedPhoneIds.length) {
      throw new NotFoundException('One or more used phones not found');
    }
    const unavailableUsedPhone = usedPhones.find((p) => p.status !== 'IN_STOCK');
    if (unavailableUsedPhone) {
      throw new BadRequestException(
        `${unavailableUsedPhone.brand} ${unavailableUsedPhone.model} (${unavailableUsedPhone.usedPhoneCode}) is ${unavailableUsedPhone.status} — cannot sell`,
      );
    }
    const usedPhoneDupCheck = new Set<string>();
    for (const id of usedPhoneIds) {
      if (usedPhoneDupCheck.has(id)) throw new BadRequestException('Duplicate used phone in cart');
      usedPhoneDupCheck.add(id);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const variantMap = new Map(variants.map((v) => [v.id, v]));
    const imeiMap = new Map(imeis.map((i) => [i.id, i]));
    const usedPhoneMap = new Map(usedPhones.map((p) => [p.id, p]));
    const serialMap = new Map(serials.map((sr) => [sr.id, sr]));

    // ─── Detect carpet items ─────────────────────────────────
    const carpetUnits = new Set(['sqft', 'sqm', 'sqyd']);
    const carpetItemIndices = new Set<number>();
    dto.items.forEach((item, idx) => {
      if (!item.productId) return;
      const product = productMap.get(item.productId);
      const note = item.note || '';
      const isCarpetSale =
        note.startsWith('Cut from ') ||
        note.startsWith('Cut piece ') ||
        (product && carpetUnits.has(product.unit));
      if (isCarpetSale) carpetItemIndices.add(idx);
    });

    // ─── IMEI + used-phone items: skip ShopStock check ────────
    const imeiItemIndices = new Set<number>();
    const usedPhoneItemIndices = new Set<number>();
    // Serial wale items ka stock aam tareeqe se ghatta hai (IMEI se alag) —
    // yahan sirf ye yaad rakhna hai ke kaunsi line par kaunsa unit gaya.
    const serialItemIndices = new Set<number>();
    dto.items.forEach((item, idx) => {
      if (item.imeiId) imeiItemIndices.add(idx);
      if (item.usedPhoneId) usedPhoneItemIndices.add(idx);
      if (item.serialId) serialItemIndices.add(idx);
    });

    // ─── Fetch shop stock for standard items only ────────────
    const standardItems = dto.items.filter(
      (item, idx) =>
        !carpetItemIndices.has(idx) &&
        !imeiItemIndices.has(idx) &&
        !usedPhoneItemIndices.has(idx) &&
        !!item.productId,
    );
    const shopStocks = standardItems.length > 0
      ? await this.prisma.shopStock.findMany({
          where: {
            shopId: sellingShopId,
            OR: standardItems.map((i) => ({
              productId: i.productId as string,
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
      const isUsedPhoneItem = usedPhoneItemIndices.has(idx);
      const usedPhone = isUsedPhoneItem ? usedPhoneMap.get(item.usedPhoneId as string)! : null;

      const product = item.productId ? productMap.get(item.productId) : undefined;
      const variant = item.variantId ? variantMap.get(item.variantId) : null;
      const imei = item.imeiId ? imeiMap.get(item.imeiId) : null;

      const itemName = usedPhone
        ? `${usedPhone.brand} ${usedPhone.model} (${usedPhone.usedPhoneCode})`
        : variant
          ? `${product!.name} (${variant.name})`
          : product!.name;

      // ─── Resolve unit price ─────────────────────────────────
      let unitPrice: number;
      if (item.priceOverride !== undefined && item.priceOverride !== null) {
        unitPrice = item.priceOverride;
      } else if (isUsedPhoneItem) {
        unitPrice = Number(usedPhone!.resalePrice) || 0;
      } else if (item.useWholesale) {
        unitPrice = (variant?.wholesalePrice ?? product!.wholesalePrice ?? variant?.price ?? product!.price);
      } else {
        unitPrice = variant?.price ?? product!.price;
      }

      // Cost: IMEI cost > used-phone total cost > variant/product cost
      const unitCost = isUsedPhoneItem
        ? Number(usedPhone!.totalCost) || 0
        : imei?.costPrice ?? variant?.costPrice ?? product?.costPrice ?? 0;

      const quantity = Number(item.quantity);

      // ─── IMEI / used-phone / serial: enforce quantity = 1 ──
      if ((item.imeiId || isUsedPhoneItem || item.serialId) && quantity !== 1) {
        throw new BadRequestException(
          `${itemName}: quantity must be = 1`,
        );
      }

      // ─── Stock check (skip for carpet + IMEI + used phone) ──
      const isCarpetItem = carpetItemIndices.has(idx);
      const isImeiItem = imeiItemIndices.has(idx);
      let shopStock = null;

      if (!isCarpetItem && !isImeiItem && !isUsedPhoneItem) {
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
        productId: product?.id ?? null,
        variantId: variant?.id,
        imeiId: imei?.id,
        imeiNumber: imei?.imei1,
        usedPhoneId: usedPhone?.id ?? null,
        serialId: item.serialId ?? null,
        shopStockId: shopStock?.id ?? null,
        isCarpetItem,
        isImeiItem,
        isUsedPhoneItem,
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

    // ─── Service Charges ────────────────────────────────────
    const serviceChargesArr = dto.serviceCharges ?? [];
    const serviceChargesTotal = serviceChargesArr.reduce(
      (sum, sc) => sum + Number(sc.amount || 0),
      0,
    );

    // Kuch services par dukan ka apna kharcha hota hai (rider ka kiraya
    // waghera). Wo costOfGoods me jurta hai — warna `total - costOfGoods`
    // wali har report delivery charge ko poora munafa gin leti thi.
    const serviceChargesCost = serviceChargesArr.reduce(
      (sum, sc) => sum + Number((sc as any).cost || 0),
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
      where: { tenantId: user.tenantId, shopId: sellingShopId, status: 'OPEN' },
    });

    const result = await this.prisma.$transaction(async (tx) => {
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
          shopId: sellingShopId,
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
          costOfGoods: costOfGoods + serviceChargesCost,
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
          // Khali string ko NULL banate hain — warna "pehle kaun aaya
          // tha" wali list me khali naam bhi shamil ho jate hain.
          receivedByName: dto.receivedByName?.trim() || null,
          receivedByPhone: dto.receivedByPhone?.trim() || null,
          receivedByCnic: dto.receivedByCnic?.trim() || null,
          items: {
            create: normalizedItems.map((item) => ({
              ...(item.productId ? { productId: item.productId } : {}),
              ...(item.usedPhoneId ? { usedPhoneId: item.usedPhoneId } : {}),
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
              usedPhone: true,
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

        // ─── USED PHONE items: mark SOLD, no stock table sync ──
        if (item.isUsedPhoneItem && item.usedPhoneId) {
          await tx.usedPhone.update({
            where: { id: item.usedPhoneId },
            data: {
              status: 'SOLD',
              finalSoldPrice: item.price,
              soldAt: new Date(),
              soldSaleId: sale.id,
            },
          });
          continue;
        }

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

          const productStock = await tx.productImei.count({
            where: {
              tenantId: user.tenantId,
              productId: item.productId!,
              status: 'IN_STOCK',
            },
          });
          await tx.product.update({
            where: { id: item.productId! },
            data: { stock: productStock },
          });

          if (item.variantId) {
            const variantStock = await tx.productImei.count({
              where: {
                tenantId: user.tenantId,
                productId: item.productId!,
                variantId: item.variantId,
                status: 'IN_STOCK',
              },
            });
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: variantStock },
            });
          }

          const existingShopStock = await tx.shopStock.findFirst({
            where: {
              shopId: sellingShopId,
              productId: item.productId!,
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
              productId: item.productId!,
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
              productId: item.productId!,
              type: 'SALE_OUT',
              quantity: -item.quantity,
              balanceAfter: 0,
              reference: sale.saleNumber,
              note: `Carpet sale at ${shop.name}${item.note ? ` • ${item.note}` : ''}`,
            },
          });
          continue;
        }

        // ─── Electronics serial: us unit ko SOLD mark karo ──────
        // Stock aam tareeqe se neeche ghatta hai — serial sirf ye
        // batata hai ke kaunsa asli unit gaya (warranty ke liye zaroori).
        if (item.serialId) {
          await tx.electronicsSerialTracking.update({
            where: { id: item.serialId },
            data: {
              status: 'SOLD',
              saleId: sale.id,
              saleItemId: saleItem.id,
              soldPrice: item.price,
              soldAt: new Date(),
              soldToCustomerId: dto.customerId ?? null,
              invoiceNumber: sale.saleNumber,
            },
          });
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
          where: { id: item.productId! },
          data: { stock: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            shopId: sellingShopId,
            productId: item.productId!,
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
            shopId: sellingShopId,
            customerId: customer.id,
            createdById: user.id,
            type: 'SALE_CREDIT',
            amount: creditAmount,
            balanceAfter: newBalance,
            reference: sale.saleNumber,
            // Khate me bhi receiver ka naam — mahine ke aakhir me
            // khata kholte waqt saaf dikhe ke maal kis ne uthaya.
            note: sale.receivedByName
              ? `Udhaar sale: ${sale.saleNumber} (${shop.name}) — le gaya: ${sale.receivedByName}`
              : `Udhaar sale: ${sale.saleNumber} (${shop.name})`,
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

    // 🔔 Sale notification (async, non-blocking, fire-and-forget)
    this.notifications.create({
      tenantId: user.tenantId,
      type: 'NEW_SALE' as any,
      title: '💰 Sale Complete',
      message: `${saleNumber} · Rs ${(result as any).total ?? total} · ${dto.items.length} items`,
      link: `/sales/${(result as any).id}/receipt`,
      metadata: { saleId: (result as any).id, total, itemCount: dto.items.length },
    }).catch(() => null);

    return result;
  }

  async findAll(user: AuthenticatedUser, scope: ShopScope, shopId?: string) {
    // An explicit ?shopId= still wins (report drill-downs use it); otherwise
    // the branch from the switcher applies.
    const shopWhere =
      shopId && shopId !== 'all' ? { shopId } : scope.where;

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId: user.tenantId,
        ...shopWhere,
      },
      include: {
        customer: true,
        shop: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        // Repair delivery se bani sale — isi se pata chalta hai ye repair ki kamai hai
        repairTicket: {
          select: {
            id: true, ticketNumber: true,
            deviceBrand: true, deviceModel: true,
            reportedIssue: true, diagnosedIssue: true,
          },
        },
        items: {
          include: {
            product: true,
            usedPhone: true,
            variantLink: { include: { variant: true } },
          },
        },
      },
      orderBy: { soldAt: 'desc' },
      take: 200,
    });

    // Har item ke saath uske bike hue IMEIs — warna list me phone ka
    // koi nishaan nahi milta aur mobile ke filters khaali reh jate hain.
    const saleItemIds = sales.flatMap((s) => s.items.map((i) => i.id));
    const imeis = saleItemIds.length > 0
      ? await this.prisma.productImei.findMany({
          where: { tenantId: user.tenantId, saleItemId: { in: saleItemIds } },
          select: {
            id: true, imei1: true, imei2: true, serialNumber: true,
            ptaStatus: true, ptaTaxPaid: true,
            warrantyMonths: true, warrantyExpiry: true,
            color: true, costPrice: true, soldPrice: true,
            saleItemId: true, productId: true,
          },
        })
      : [];

    // Electronics ke serial-tracked units — laptop/camera/drone waghera.
    // Inke baghair electronics sales list me pata hi nahi chalta ke
    // kaun sa exact unit gaya aur uski warranty kab tak hai.
    const serials = saleItemIds.length > 0
      ? await this.prisma.electronicsSerialTracking.findMany({
          where: { tenantId: user.tenantId, saleItemId: { in: saleItemIds } },
          select: {
            id: true, serialNumber: true, imei: true, imei2: true, macAddress: true,
            warrantyStartDate: true, warrantyEndDate: true, warrantyStatus: true,
            physicalCondition: true, batteryHealthPct: true,
            soldPrice: true, purchasePrice: true,
            saleItemId: true, productId: true,
          },
        })
      : [];

    const byItem = new Map<string, typeof imeis>();
    for (const im of imeis) {
      const key = im.saleItemId as string;
      const list = byItem.get(key) ?? [];
      list.push(im);
      byItem.set(key, list);
    }

    const serialsByItem = new Map<string, typeof serials>();
    for (const sn of serials) {
      const key = sn.saleItemId as string;
      const list = serialsByItem.get(key) ?? [];
      list.push(sn);
      serialsByItem.set(key, list);
    }

    return sales.map((sale) => ({
      ...sale,
      items: sale.items.map((item) => ({
        ...item,
        imeis: byItem.get(item.id) ?? [],
        serials: serialsByItem.get(item.id) ?? [],
      })),
    }));
  }

  // Deliberately not narrowed by branch: receipt links, WhatsApp shares and
  // support lookups must still open a sale made at another branch. Tenant
  // isolation is what matters here, and that is enforced below.
  async findOne(user: AuthenticatedUser, _scope: ShopScope, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        customer: true,
        shop: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        items: {
          include: {
            product: { include: { brand: true } },
            usedPhone: true,
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

    // Electronics serial units — receipt par serial + warranty
    // chhapne ke liye zaroori hain.
    const serials = saleItemIds.length > 0
      ? await this.prisma.electronicsSerialTracking.findMany({
          where: { tenantId: user.tenantId, saleItemId: { in: saleItemIds } },
          select: {
            id: true, serialNumber: true, imei: true, imei2: true, macAddress: true,
            warrantyStartDate: true, warrantyEndDate: true, warrantyStatus: true,
            physicalCondition: true, batteryHealthPct: true,
            soldPrice: true, purchasePrice: true,
            saleItemId: true, productId: true,
          },
        })
      : [];

    // Attach IMEIs + serials to corresponding sale items
    const enrichedItems = sale.items.map((item) => ({
      ...item,
      imeis: imeis.filter((i) => i.saleItemId === item.id),
      serials: serials.filter((sn) => sn.saleItemId === item.id),
    }));

    return { ...sale, items: enrichedItems };
  }

  /**
   * Is customer ke pichhle receivers — POS ke suggestion box ke liye.
   *
   * Sab se haal hi wale pehle: jo banda kal aaya tha wo aaj bhi aa sakta
   * hai, mahine pehle wala kam mumkin hai.
   */
  async recentReceivers(user: AuthenticatedUser, customerId?: string) {
    if (!customerId) return [];

    const rows = await this.prisma.sale.findMany({
      where: {
        tenantId: user.tenantId,
        customerId,
        receivedByName: { not: null },
      },
      select: { receivedByName: true, receivedByPhone: true, soldAt: true },
      orderBy: { soldAt: 'desc' },
      take: 60,
    });

    // Ek hi naam baar baar aata hai — sirf pehli (sab se nayi) dafa rakhein.
    const seen = new Map<string, { name: string; phone: string | null; lastAt: Date }>();
    for (const r of rows) {
      const name = (r.receivedByName ?? '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.set(key, { name, phone: r.receivedByPhone, lastAt: r.soldAt });
      if (seen.size >= 12) break;
    }

    return [...seen.values()];
  }

  async summary(user: AuthenticatedUser, scope: ShopScope, shopId?: string) {
    const todayStart = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());
    const baseWhere = {
      tenantId: user.tenantId,
      status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] as any },
      ...(shopId && shopId !== 'all' ? { shopId } : scope.where),
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

  async voidSale(
    user: AuthenticatedUser,
    scope: ShopScope,
    id: string,
    reason?: string,
  ) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId: user.tenantId, ...scope.where },
      include: { items: { include: { variantLink: true } } },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status === 'VOIDED') throw new BadRequestException('Sale already voided');
    if (!sale.shopId) throw new BadRequestException('Sale has no shop linked — cannot void safely');

    return this.prisma.$transaction(async (tx) => {
      // ─── Restore used phones (mark IN_STOCK again) ────────────
      const usedPhoneItems = sale.items.filter((i) => (i as any).usedPhoneId);
      for (const item of usedPhoneItems) {
        await tx.usedPhone.update({
          where: { id: (item as any).usedPhoneId },
          data: {
            status: 'IN_STOCK',
            finalSoldPrice: null,
            soldAt: null,
            soldSaleId: null,
          },
        });
      }

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
        if ((item as any).usedPhoneId) continue; // already handled above

        const itemNote = (item as any).note || '';
        const isCarpetItem = itemNote.startsWith('Cut from ') || itemNote.startsWith('Cut piece ');
        const isImeiItem = itemNote.startsWith('IMEI:');

        if (!item.productId) continue; // safety guard

        if (isCarpetItem) {
          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId,
              shopId: sale.shopId,
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
              shopId: sale.shopId,
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
            shopId: sale.shopId,
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
              shopId: sale.shopId,
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
    }).then((result) => {
      void this.fbr
        .cancelInvoice(user.tenantId, id, reason ?? 'Sale voided')
        .catch(() => undefined);
      return result;
    });
  }
}

