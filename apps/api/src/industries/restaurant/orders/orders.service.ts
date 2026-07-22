import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RecipesService } from '../recipes/recipes.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddPaymentDto, UpdateOrderStatusDto } from './dto/update-status.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService, private readonly recipes: RecipesService) {}

  private async computeItemTotal(user: AuthenticatedUser, item: CreateOrderDto['items'][0]) {
    let basePrice = item.basePrice ?? 0;
    if (!basePrice) {
      const product = await this.prisma.product.findFirst({ where: { id: item.productId, tenantId: user.tenantId } });
      basePrice = item.variantId
        ? (await this.prisma.productVariant.findUnique({ where: { id: item.variantId } }))?.price ?? product?.price ?? 0
        : product?.price ?? 0;
    }
    let modifierTotal = 0;
    const enrichedModifiers: any[] = [];
    if (item.modifiers?.length) {
      const optionIds = item.modifiers.map((m) => m.modifierOptionId);
      const options = await this.prisma.modifierOption.findMany({ where: { id: { in: optionIds }, tenantId: user.tenantId } });
      for (const m of item.modifiers) {
        const opt = options.find((o) => o.id === m.modifierOptionId);
        const adjust = opt?.priceAdjustment ?? 0;
        modifierTotal += adjust * (m.quantity ?? 1);
        enrichedModifiers.push({
          modifierOptionId: m.modifierOptionId,
          quantity: m.quantity ?? 1,
          priceAdjustment: adjust,
          notes: m.notes,
        });
      }
    }
    const lineSubtotal = (basePrice + modifierTotal) * item.quantity;
    const total = Math.max(lineSubtotal - (item.itemDiscount ?? 0), 0);
    return { basePrice, modifierTotal, total, enrichedModifiers };
  }

  async create(user: AuthenticatedUser, dto: CreateOrderDto) {
    if (!dto.items?.length) throw new BadRequestException('At least one item required');

    // Order number
    const count = await this.prisma.restaurantOrder.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const orderNumber = `ORD-${year}-${String(count + 1).padStart(4, '0')}`;

    // Compute totals
    let subtotal = 0;
    const enrichedItems = [] as any[];
    for (const it of dto.items) {
      const { basePrice, modifierTotal, total, enrichedModifiers } = await this.computeItemTotal(user, it);
      subtotal += total;
      enrichedItems.push({ ...it, basePrice, modifierTotal, total, modifiers: enrichedModifiers });
    }

    const serviceChargePct = dto.serviceChargePct ?? 0;
    const taxPct = dto.taxPct ?? 0;
    const serviceCharge = subtotal * (serviceChargePct / 100);
    const taxAmount = (subtotal + serviceCharge) * (taxPct / 100);
    const total = subtotal + serviceCharge + taxAmount + (dto.deliveryFee ?? 0) + (dto.packagingFee ?? 0) + (dto.tip ?? 0) - (dto.discount ?? 0);

    const order = await this.prisma.restaurantOrder.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        tableId: dto.tableId,
        customerId: dto.customerId,
        waiterId: dto.waiterId,
        orderNumber,
        mode: dto.mode,
        status: 'PLACED',
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerAddress: dto.customerAddress,
        numberOfGuests: dto.numberOfGuests,
        specialRequests: dto.specialRequests,
        subtotal,
        serviceCharge,
        serviceChargePct,
        taxAmount,
        taxPct,
        discount: dto.discount ?? 0,
        deliveryFee: dto.deliveryFee ?? 0,
        packagingFee: dto.packagingFee ?? 0,
        tip: dto.tip ?? 0,
        total: Math.max(total, 0),
        placedAt: new Date(),
        deliveryAddress: dto.deliveryAddress,
        deliveryLat: dto.deliveryLat,
        deliveryLng: dto.deliveryLng,
        deliveryNotes: dto.deliveryNotes,
        items: {
          create: enrichedItems.map((it) => ({
            productId: it.productId,
            variantId: it.variantId,
            quantity: it.quantity,
            unit: it.unit ?? 'piece',
            basePrice: it.basePrice,
            modifierTotal: it.modifierTotal,
            itemDiscount: it.itemDiscount ?? 0,
            total: it.total,
            specialInstructions: it.specialInstructions,
            spiceLevel: it.spiceLevel,
            cookingNote: it.cookingNote,
            courseNumber: it.courseNumber,
            status: 'PLACED',
            sentToKitchenAt: new Date(),
            modifiers: it.modifiers?.length
              ? {
                  create: (it.modifiers as any[]).map((m: any) => ({
                    modifierOptionId: m.modifierOptionId,
                    quantity: m.quantity ?? 1,
                    priceAdjustment: m.priceAdjustment ?? 0,
                    notes: m.notes,
                  })),
                }
              : undefined,
          })),
        },
      },
      include: {
        items: { include: { product: true, modifiers: { include: { modifierOption: true } } } },
        table: true,
      },
    });

    // Mark table occupied if dine-in
    if (dto.tableId && dto.mode === 'DINE_IN') {
      await this.prisma.restaurantTableV2.update({
        where: { id: dto.tableId },
        data: { status: 'OCCUPIED', occupiedAt: new Date(), currentOrderId: order.id },
      });
    }

    return order;
  }

  async list(user: AuthenticatedUser, params: { status?: string; mode?: string; tableId?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.restaurantOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.mode && { mode: params.mode as any }),
        ...(params.tableId && { tableId: params.tableId }),
        ...(params.from || params.to ? {
          createdAt: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { orderNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      include: {
        items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } } },
        table: true,
        delivery: { include: { rider: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.restaurantOrder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        items: {
          include: {
            product: { include: { images: true, category: true } },
            modifiers: { include: { modifierOption: { include: { modifierGroup: true } } } },
          },
        },
        table: true,
        delivery: { include: { rider: true } },
        kots: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateOrderStatusDto) {
    const o = await this.prisma.restaurantOrder.findFirst({ where: { id, tenantId: user.tenantId }, include: { items: true } });
    if (!o) throw new NotFoundException('Order not found');

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'CONFIRMED') patch.confirmedAt = now;
    if (dto.status === 'COOKING') patch.cookingStartedAt = now;
    if (dto.status === 'READY') patch.readyAt = now;
    if (dto.status === 'SERVED') patch.servedAt = now;
    if (dto.status === 'OUT_FOR_DELIVERY') patch.outForDeliveryAt = now;
    if (dto.status === 'DELIVERED') patch.deliveredAt = now;
    if (dto.status === 'COMPLETED') patch.completedAt = now;
    if (dto.status === 'CANCELLED') {
      patch.cancelledAt = now;
      patch.cancellationReason = dto.cancellationReason;
    }

    // On COOKING — deduct ingredient stock via recipes
    if (dto.status === 'COOKING' && o.status !== 'COOKING') {
      for (const item of o.items) {
        const menuItem = await this.prisma.restaurantMenuItem.findUnique({ where: { productId: item.productId } });
        if (menuItem) await this.recipes.deductIngredients(user, menuItem.id, item.quantity);
      }
    }

    // On COMPLETED / CANCELLED — free the table
    if ((dto.status === 'COMPLETED' || dto.status === 'CANCELLED') && o.tableId) {
      await this.prisma.restaurantTableV2.update({
        where: { id: o.tableId },
        data: { status: 'CLEANING', currentOrderId: null, occupiedAt: null },
      });
    }

    return this.prisma.restaurantOrder.update({ where: { id }, data: patch, include: { items: true, table: true } });
  }

  async addPayment(user: AuthenticatedUser, id: string, dto: AddPaymentDto) {
    const o = await this.prisma.restaurantOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.restaurantOrderPayment.create({
        data: {
          orderId: id,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          paidBy: dto.paidBy,
          reference: dto.reference,
          notes: dto.notes,
        },
      });

      const newPaid = o.paidAmount + dto.amount;
      const updates: any = { paidAmount: newPaid };
      if (newPaid >= o.total) {
        updates.status = 'COMPLETED';
        updates.completedAt = new Date();
        if (o.tableId) {
          await tx.restaurantTableV2.update({
            where: { id: o.tableId },
            data: { status: 'CLEANING', currentOrderId: null, occupiedAt: null },
          });
        }
      }

      return tx.restaurantOrder.update({ where: { id }, data: updates, include: { payments: true, table: true } });
    });
  }

  async addItems(user: AuthenticatedUser, id: string, items: CreateOrderDto['items']) {
    const o = await this.prisma.restaurantOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    if (['COMPLETED', 'CANCELLED'].includes(o.status)) throw new BadRequestException(`Cannot add items — order is ${o.status}`);

    let addSubtotal = 0;
    for (const it of items) {
      const { basePrice, modifierTotal, total } = await this.computeItemTotal(user, it);
      addSubtotal += total;
      await this.prisma.restaurantOrderItem.create({
        data: {
          orderId: id,
          productId: it.productId,
          variantId: it.variantId,
          quantity: it.quantity,
          unit: it.unit ?? 'piece',
          basePrice,
          modifierTotal,
          itemDiscount: it.itemDiscount ?? 0,
          total,
          specialInstructions: it.specialInstructions,
          spiceLevel: it.spiceLevel,
          cookingNote: it.cookingNote,
          status: 'PLACED',
          sentToKitchenAt: new Date(),
        },
      });
    }

    const newSubtotal = o.subtotal + addSubtotal;
    const svc = newSubtotal * (o.serviceChargePct / 100);
    const tax = (newSubtotal + svc) * (o.taxPct / 100);
    const total = newSubtotal + svc + tax + o.deliveryFee + o.packagingFee + o.tip - o.discount;

    return this.prisma.restaurantOrder.update({
      where: { id },
      data: { subtotal: newSubtotal, serviceCharge: svc, taxAmount: tax, total: Math.max(total, 0) },
      include: { items: true },
    });
  }

  async removeItem(user: AuthenticatedUser, orderId: string, itemId: string) {
    const o = await this.prisma.restaurantOrder.findFirst({ where: { id: orderId, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    const item = await this.prisma.restaurantOrderItem.findFirst({ where: { id: itemId, orderId } });
    if (!item) throw new NotFoundException('Item not found');
    if (['SERVED', 'DELIVERED', 'COMPLETED'].includes(item.status)) throw new BadRequestException('Cannot remove — item already served');

    await this.prisma.restaurantOrderItem.delete({ where: { id: itemId } });

    const remaining = await this.prisma.restaurantOrderItem.findMany({ where: { orderId } });
    const newSub = remaining.reduce((s, r) => s + r.total, 0);
    const svc = newSub * (o.serviceChargePct / 100);
    const tax = (newSub + svc) * (o.taxPct / 100);
    const total = newSub + svc + tax + o.deliveryFee + o.packagingFee + o.tip - o.discount;

    return this.prisma.restaurantOrder.update({
      where: { id: orderId },
      data: { subtotal: newSub, serviceCharge: svc, taxAmount: tax, total: Math.max(total, 0) },
    });
  }

  async summary(user: AuthenticatedUser, params: { from?: string; to?: string }) {
    const where: any = { tenantId: user.tenantId, status: 'COMPLETED' };
    if (params.from || params.to) {
      where.createdAt = {
        ...(params.from && { gte: new Date(params.from) }),
        ...(params.to && { lte: new Date(params.to) }),
      };
    }

    const [totals, byMode, byStatus] = await Promise.all([
      this.prisma.restaurantOrder.aggregate({ where, _sum: { total: true, subtotal: true, tip: true, discount: true }, _count: { _all: true } }),
      this.prisma.restaurantOrder.groupBy({ by: ['mode'], where, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.restaurantOrder.groupBy({ by: ['status'], where: { tenantId: user.tenantId }, _count: { _all: true } }),
    ]);

    return {
      totalRevenue: totals._sum.total ?? 0,
      totalOrders: totals._count._all,
      totalTips: totals._sum.tip ?? 0,
      totalDiscount: totals._sum.discount ?? 0,
      byMode,
      byStatus,
    };
  }

  async splitBill(user: AuthenticatedUser, orderId: string, splits: { paidBy: string; amount: number; paymentMethod: string }[]) {
    const o = await this.prisma.restaurantOrder.findFirst({ where: { id: orderId, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');

    const sumSplits = splits.reduce((s, sp) => s + sp.amount, 0);
    if (Math.abs(sumSplits - (o.total - o.paidAmount)) > 0.01) {
      throw new BadRequestException(`Split total (${sumSplits}) doesn't match remaining (${o.total - o.paidAmount})`);
    }

    return this.prisma.$transaction(async (tx) => {
      for (const s of splits) {
        await tx.restaurantOrderPayment.create({
          data: { orderId, amount: s.amount, paymentMethod: s.paymentMethod, paidBy: s.paidBy },
        });
      }
      const patch: any = { paidAmount: o.total, isSplitBill: true, status: 'COMPLETED', completedAt: new Date() };
      if (o.tableId) {
        await tx.restaurantTableV2.update({
          where: { id: o.tableId },
          data: { status: 'CLEANING', currentOrderId: null, occupiedAt: null },
        });
      }
      return tx.restaurantOrder.update({ where: { id: orderId }, data: patch, include: { payments: true } });
    });
  }
}
