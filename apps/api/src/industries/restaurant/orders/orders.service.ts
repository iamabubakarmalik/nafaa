import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { ShopScope, applyStockDelta, resolveWriteShopId } from '../../../common/shop-scope';
import { RecipesService } from '../recipes/recipes.service';
import { round2 } from '../recipes/recipe-units';
import { CreateOrderDto, OrderItemDto } from './dto/create-order.dto';
import { AddPaymentDto, SplitBillDto, UpdateOrderStatusDto } from './dto/update-status.dto';

const MODE_LABEL: Record<string, string> = {
  DINE_IN: 'Dine-in', TAKEAWAY: 'Takeaway', DELIVERY: 'Delivery',
  DRIVE_THRU: 'Drive-thru', ROOM_SERVICE: 'Room service', PICKUP: 'Pickup',
};

const toSaleMethod = (m: string): PaymentMethod =>
  (m === 'BANK' ? 'BANK_TRANSFER' : m) as PaymentMethod;

/** Kitchen-made stock movements carry this prefix so a dish stays classed as made. */
const KITCHEN_REF = 'Kitchen:';

type SettleOptions = { customerId?: string; managerPin?: string; closeOnCredit?: boolean };
type Payment = { amount: number; paymentMethod: string; paidBy?: string; reference?: string; notes?: string };

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipes: RecipesService,
    private readonly sales: SalesService,
  ) {}

  /* ─────────────── pricing ─────────────── */

  private async priceItems(user: AuthenticatedUser, items: OrderItemDto[]) {
    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId: user.tenantId },
      select: { id: true, price: true, costPrice: true },
    });
    if (products.length !== productIds.length) throw new NotFoundException('Menu ka ek ya zyada item nahi mila');
    const productMap = new Map(products.map((p) => [p.id, p]));

    const variantIds = items.map((i) => i.variantId).filter(Boolean) as string[];
    const variants = variantIds.length
      ? await this.prisma.productVariant.findMany({ where: { id: { in: variantIds }, product: { tenantId: user.tenantId } } })
      : [];
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    const optionIds = items.flatMap((i) => (i.modifiers ?? []).map((m) => m.modifierOptionId));
    const options = optionIds.length
      ? await this.prisma.modifierOption.findMany({ where: { id: { in: optionIds }, tenantId: user.tenantId } })
      : [];
    const optionMap = new Map(options.map((o) => [o.id, o]));

    return items.map((item) => {
      const product = productMap.get(item.productId)!;
      const variant = item.variantId ? variantMap.get(item.variantId) : undefined;
      if (item.variantId && !variant) throw new NotFoundException('Item ka size/variant nahi mila');
      // The client price is the menu price before modifiers; modifiers are always priced here.
      const basePrice = item.basePrice ?? variant?.price ?? product.price ?? 0;
      let modifierTotal = 0;
      const modifiers = (item.modifiers ?? []).map((m) => {
        const opt = optionMap.get(m.modifierOptionId);
        if (!opt) throw new NotFoundException('Modifier option nahi mila');
        const quantity = m.quantity ?? 1;
        modifierTotal += opt.priceAdjustment * quantity;
        return { modifierOptionId: m.modifierOptionId, quantity, priceAdjustment: opt.priceAdjustment, notes: m.notes };
      });
      const total = round2(Math.max((basePrice + modifierTotal) * item.quantity - (item.itemDiscount ?? 0), 0));
      return {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unit: item.unit ?? 'piece',
        basePrice: round2(basePrice),
        modifierTotal: round2(modifierTotal),
        itemDiscount: item.itemDiscount ?? 0,
        total,
        costPrice: variant?.costPrice ?? product.costPrice ?? 0,
        specialInstructions: item.specialInstructions,
        spiceLevel: item.spiceLevel,
        cookingNote: item.cookingNote,
        courseNumber: item.courseNumber,
        status: 'PLACED' as const,
        sentToKitchenAt: new Date(),
        modifiers,
      };
    });
  }

  private totals(o: { serviceChargePct: number; taxPct: number; deliveryFee: number; packagingFee: number; tip: number; discount: number }, subtotal: number) {
    const serviceCharge = round2(subtotal * (o.serviceChargePct / 100));
    const taxAmount = round2((subtotal + serviceCharge) * (o.taxPct / 100));
    const total = round2(Math.max(subtotal + serviceCharge + taxAmount + o.deliveryFee + o.packagingFee + o.tip - o.discount, 0));
    return { subtotal: round2(subtotal), serviceCharge, taxAmount, total };
  }

  private async nextOrderNumber(tenantId: string) {
    const year = new Date().getFullYear();
    const prefix = `ORD-${year}-`;
    const last = await this.prisma.restaurantOrder.findFirst({
      where: { tenantId, orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    const n = last ? parseInt(last.orderNumber.slice(prefix.length), 10) || 0 : 0;
    return `${prefix}${String(n + 1).padStart(4, '0')}`;
  }

  /* ─────────────── orders ─────────────── */

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateOrderDto) {
    if (!dto.items?.length) throw new BadRequestException('Kam se kam ek item zaroori hai');
    if (dto.mode === 'DINE_IN' && dto.tableId) {
      const table = await this.prisma.restaurantTableV2.findFirst({ where: { id: dto.tableId, tenantId: user.tenantId, isActive: true } });
      if (!table) throw new NotFoundException('Table nahi mili');
    }
    if (dto.customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId } });
      if (!c) throw new NotFoundException('Customer nahi mila');
    }
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope, dto.shopId);
    const lines = await this.priceItems(user, dto.items);
    const charges = {
      serviceChargePct: dto.serviceChargePct ?? 0,
      taxPct: dto.taxPct ?? 0,
      discount: dto.discount ?? 0,
      deliveryFee: dto.deliveryFee ?? 0,
      packagingFee: dto.packagingFee ?? 0,
      tip: dto.tip ?? 0,
    };
    const t = this.totals(charges, lines.reduce((s, l) => s + l.total, 0));

    let order: any;
    for (let attempt = 0; ; attempt++) {
      const orderNumber = await this.nextOrderNumber(user.tenantId);
      try {
        order = await this.prisma.restaurantOrder.create({
          data: {
            tenantId: user.tenantId,
            shopId,
            tableId: dto.mode === 'DINE_IN' ? dto.tableId : undefined,
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
            ...charges,
            ...t,
            placedAt: new Date(),
            deliveryAddress: dto.deliveryAddress,
            deliveryLat: dto.deliveryLat,
            deliveryLng: dto.deliveryLng,
            deliveryNotes: dto.deliveryNotes,
            items: {
              create: lines.map(({ modifiers, ...l }) => ({
                ...l,
                modifiers: modifiers.length ? { create: modifiers } : undefined,
              })),
            },
          },
          include: {
            items: { include: { product: true, modifiers: { include: { modifierOption: true } } } },
            table: true,
          },
        });
        break;
      } catch (e) {
        // Two counters took the same number at once; take the next one.
        if (attempt < 3 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }

    if (order.tableId) {
      await this.prisma.restaurantTableV2.update({
        where: { id: order.tableId },
        data: { status: 'OCCUPIED', occupiedAt: new Date(), currentOrderId: order.id },
      });
    }
    return order;
  }

  async list(user: AuthenticatedUser, params: { status?: string; mode?: string; tableId?: string; from?: string; to?: string; search?: string; saleId?: string; shopId?: string }) {
    return this.prisma.restaurantOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.shopId && { OR: [{ shopId: params.shopId }, { shopId: null }] }),
        ...(params.saleId && { saleId: params.saleId }),
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
          AND: [{
            OR: [
              { orderNumber: { contains: params.search, mode: 'insensitive' } },
              { customerName: { contains: params.search, mode: 'insensitive' } },
              { customerPhone: { contains: params.search } },
            ],
          }],
        }),
      },
      include: {
        items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } }, modifiers: { include: { modifierOption: true } } } },
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
    if (!o) throw new NotFoundException('Order nahi mila');
    return o;
  }

  async updateStatus(user: AuthenticatedUser, scope: ShopScope, id: string, dto: UpdateOrderStatusDto) {
    const o = await this.prisma.restaurantOrder.findFirst({ where: { id, tenantId: user.tenantId }, include: { items: true } });
    if (!o) throw new NotFoundException('Order nahi mila');
    if (o.status === dto.status) return this.prisma.restaurantOrder.findUnique({ where: { id }, include: { items: true, table: true } });

    if (dto.status === 'COMPLETED' && !o.saleId) {
      throw new BadRequestException('Pehle bill ki payment lein — payment poori hote hi order khud complete ho jata hai');
    }
    if (dto.status === 'CANCELLED' && o.saleId) {
      throw new BadRequestException('Is order ka bill ban chuka hai — wapsi Returns se karein');
    }
    if (o.status === 'CANCELLED') throw new BadRequestException('Cancel hua order dobara nahi khulta');

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

    // The kitchen starts cooking: ingredients leave the store.
    if (dto.status === 'COOKING') {
      const shopId = o.shopId ?? await resolveWriteShopId(this.prisma, user.tenantId, scope);
      await this.recipes.consumeForLines(user, shopId, o.items, o.orderNumber);
    }

    if ((dto.status === 'COMPLETED' || dto.status === 'CANCELLED') && o.tableId) {
      await this.freeTable(o.tableId, o.id);
    }

    return this.prisma.restaurantOrder.update({ where: { id }, data: patch, include: { items: true, table: true } });
  }

  private async freeTable(tableId: string, orderId: string) {
    // Only free the table when this order is the one sitting on it.
    await this.prisma.restaurantTableV2.updateMany({
      where: { id: tableId, OR: [{ currentOrderId: orderId }, { currentOrderId: null }] },
      data: { status: 'CLEANING', currentOrderId: null, occupiedAt: null },
    });
  }

  /* ─────────────── payment → bill ─────────────── */

  async addPayment(user: AuthenticatedUser, scope: ShopScope, id: string, dto: AddPaymentDto) {
    const o = await this.prisma.restaurantOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order nahi mila');
    if (o.status === 'CANCELLED') throw new BadRequestException('Cancel hue order par payment nahi hoti');
    if (o.saleId) throw new BadRequestException('Is order ka bill pehle hi ban chuka hai');
    if (!(dto.amount > 0) && !dto.closeOnCredit) throw new BadRequestException('Raqam likhein');

    const payment: Payment = { amount: dto.amount, paymentMethod: dto.paymentMethod, paidBy: dto.paidBy, reference: dto.reference, notes: dto.notes };
    const newPaid = round2(o.paidAmount + dto.amount);

    // Fully paid, or closed on khata: the order becomes a bill. Payments are
    // written only when the bill succeeds, so a failed bill can be retried.
    if (newPaid >= o.total - 0.01 || dto.closeOnCredit) {
      await this.settle(user, scope, id, dto.amount > 0 ? [payment] : [], dto);
      return this.getOne(user, id);
    }

    await this.prisma.$transaction([
      this.prisma.restaurantOrderPayment.create({ data: { orderId: id, ...payment } }),
      this.prisma.restaurantOrder.update({ where: { id }, data: { paidAmount: newPaid } }),
    ]);
    return this.getOne(user, id);
  }

  async splitBill(user: AuthenticatedUser, scope: ShopScope, orderId: string, dto: SplitBillDto) {
    const o = await this.prisma.restaurantOrder.findFirst({ where: { id: orderId, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order nahi mila');
    if (o.status === 'CANCELLED') throw new BadRequestException('Cancel hue order par payment nahi hoti');
    if (o.saleId) throw new BadRequestException('Is order ka bill pehle hi ban chuka hai');

    const splits = dto.splits.filter((s) => s.amount > 0);
    const sum = round2(splits.reduce((s, sp) => s + sp.amount, 0));
    const remaining = round2(o.total - o.paidAmount);
    if (Math.abs(sum - remaining) > 0.01) {
      throw new BadRequestException(`Hisson ka jor (${sum}) baqi raqam (${remaining}) ke barabar nahi`);
    }
    await this.settle(user, scope, orderId, splits.map((s) => ({ amount: s.amount, paymentMethod: s.paymentMethod, paidBy: s.paidBy })), { managerPin: dto.managerPin });
    await this.prisma.restaurantOrder.update({ where: { id: orderId }, data: { isSplitBill: true } });
    return this.getOne(user, orderId);
  }

  /**
   * Turn a paid order into a Sale so it reaches the day book, cash drawer,
   * khata, stock and every report. Before the sale:
   *   • ingredients of lines not cooked yet are taken out (recipes);
   *   • a kitchen-made dish gets the plates it needs, because a dish is
   *     cooked to order and has no shelf stock of its own.
   */
  private async settle(user: AuthenticatedUser, scope: ShopScope, orderId: string, newPayments: Payment[], opts: SettleOptions) {
    const order = await this.prisma.restaurantOrder.findFirst({
      where: { id: orderId, tenantId: user.tenantId },
      include: {
        items: { include: { modifiers: { include: { modifierOption: { select: { name: true } } } } } },
        payments: true,
        table: { select: { tableNumber: true } },
      },
    });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (!order.items.length) throw new BadRequestException('Order me koi item nahi');

    const shopId = order.shopId ?? await resolveWriteShopId(this.prisma, user.tenantId, scope);
    const customerId = order.customerId ?? opts.customerId;
    const payments = [...order.payments.map((p) => ({ amount: p.amount, paymentMethod: p.paymentMethod })), ...newPayments];
    const paid = round2(payments.reduce((s, p) => s + p.amount, 0));
    if (paid < order.total - 0.01 && !customerId) {
      throw new BadRequestException('Udhaar ke liye customer chunein');
    }

    await this.recipes.consumeForLines(user, shopId, order.items, order.orderNumber);
    await this.recipes.refreshDishCosts(user.tenantId, [...new Set(order.items.map((i) => i.productId))]);
    const made = await this.makeDishes(user, shopId, order.orderNumber, order.items);

    // The method that took the most money stands for the bill.
    const byMethod = new Map<string, number>();
    for (const p of payments) byMethod.set(p.paymentMethod, (byMethod.get(p.paymentMethod) ?? 0) + p.amount);
    const method = [...byMethod.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'CASH';

    const charges = [
      { type: 'SERVICE', label: 'Service charge', amount: order.serviceCharge },
      { type: 'TAX', label: 'Tax', amount: order.taxAmount },
      { type: 'DELIVERY', label: 'Delivery charge', amount: order.deliveryFee },
      { type: 'PACKAGING', label: 'Packing', amount: order.packagingFee },
      { type: 'TIP', label: 'Tip', amount: order.tip },
    ].filter((c) => c.amount > 0).map((c) => ({ ...c, amount: round2(c.amount) }));

    let sale: any;
    try {
      sale = await this.sales.create(user, new ShopScope(shopId, false), {
        shopId,
        customerId,
        paymentMethod: toSaleMethod(method),
        paidAmount: paid,
        discount: order.discount || undefined,
        allowCredit: paid < order.total - 0.01 ? true : undefined,
        managerPin: opts.managerPin,
        note: [MODE_LABEL[order.mode] ?? order.mode, order.orderNumber, order.table ? `Table ${order.table.tableNumber}` : null]
          .filter(Boolean).join(' · '),
        serviceCharges: charges.length ? charges : undefined,
        items: order.items.map((it) => {
          const mods = it.modifiers.map((m) => (m.quantity > 1 ? `${m.quantity}× ` : '') + m.modifierOption.name);
          const note = [mods.join(', '), it.specialInstructions].filter(Boolean).join(' · ');
          return {
            productId: it.productId,
            variantId: it.variantId ?? undefined,
            quantity: it.quantity,
            priceOverride: round2(it.basePrice + it.modifierTotal),
            lineDiscount: it.itemDiscount || undefined,
            note: note || undefined,
          };
        }),
      } as any);
    } catch (e) {
      await this.unmakeDishes(user, shopId, order.orderNumber, made);
      throw e;
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      for (const p of newPayments) {
        await tx.restaurantOrderPayment.create({ data: { orderId, ...p } });
      }
      await tx.restaurantOrder.update({
        where: { id: orderId },
        data: { saleId: sale.id, paidAmount: paid, customerId, status: 'COMPLETED', completedAt: now },
      });
      for (const it of order.items) {
        await tx.restaurantMenuItem.updateMany({ where: { productId: it.productId, tenantId: user.tenantId }, data: { totalOrdered: { increment: Math.round(it.quantity) } } });
      }
      if (order.tableId) {
        await tx.restaurantTableV2.update({
          where: { id: order.tableId },
          data: { totalOrders: { increment: 1 }, totalRevenue: { increment: order.total } },
        });
      }
    });
    if (order.tableId) await this.freeTable(order.tableId, order.id);
    return sale;
  }

  /**
   * Add the plates a kitchen-made dish is short of, so the sale can take them.
   * A dish counts as kitchen-made when it is marked MADE, has a recipe, or is
   * an unmarked menu item that has never had stock of its own.
   */
  private async makeDishes(user: AuthenticatedUser, shopId: string, orderNumber: string, items: Array<{ productId: string; variantId: string | null; quantity: number }>) {
    const need = new Map<string, { productId: string; variantId: string | null; qty: number }>();
    for (const it of items) {
      const key = `${it.productId}:${it.variantId ?? ''}`;
      const row = need.get(key) ?? { productId: it.productId, variantId: it.variantId ?? null, qty: 0 };
      row.qty += it.quantity;
      need.set(key, row);
    }
    const productIds = [...new Set(items.map((i) => i.productId))];
    const [products, withRecipe, history] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: productIds }, tenantId: user.tenantId }, select: { id: true, name: true, productType: true, isRawMaterial: true, costPrice: true } }),
      this.prisma.restaurantMenuItem.findMany({ where: { productId: { in: productIds }, tenantId: user.tenantId, recipe: { isNot: null } }, select: { productId: true } }),
      this.prisma.stockMovement.groupBy({
        by: ['productId'],
        where: {
          tenantId: user.tenantId,
          productId: { in: productIds },
          NOT: { reference: { startsWith: KITCHEN_REF } },
          type: { in: ['PURCHASE_IN', 'OPENING_BALANCE', 'TRANSFER_IN', 'SALE_OUT'] },
        },
        _count: { _all: true },
      }),
    ]);
    const recipeSet = new Set(withRecipe.map((r) => r.productId));
    const historySet = new Set(history.map((h) => h.productId));
    const productMap = new Map(products.map((p) => [p.id, p]));

    const made: Array<{ productId: string; variantId: string | null; qty: number }> = [];
    for (const row of need.values()) {
      const p = productMap.get(row.productId);
      if (!p) continue;
      const isMade = p.productType === 'MADE' || recipeSet.has(p.id)
        || (!p.productType && !p.isRawMaterial && !historySet.has(p.id));
      if (!isMade) continue;
      const stock = await this.prisma.shopStock.findFirst({
        where: { shopId, productId: row.productId, variantId: row.variantId },
        select: { stock: true },
      });
      const shortfall = round2(row.qty - Math.max(Number(stock?.stock ?? 0), 0));
      if (shortfall <= 0) continue;
      await this.prisma.$transaction(async (tx) => {
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId, productId: row.productId, variantId: row.variantId,
          delta: shortfall, movementType: 'ADJUSTMENT_IN',
          reference: `${KITCHEN_REF} ${orderNumber}`, note: 'Kitchen me tayyar', userId: user.id,
        });
        if (!p.productType) await tx.product.update({ where: { id: p.id }, data: { productType: 'MADE' } });
      });
      made.push({ ...row, qty: shortfall });
    }
    return made;
  }

  private async unmakeDishes(user: AuthenticatedUser, shopId: string, orderNumber: string, made: Array<{ productId: string; variantId: string | null; qty: number }>) {
    for (const row of made) {
      await this.prisma.$transaction((tx) => applyStockDelta({
        tx, tenantId: user.tenantId, shopId, productId: row.productId, variantId: row.variantId,
        delta: -row.qty, movementType: 'ADJUSTMENT_OUT',
        reference: `${KITCHEN_REF} ${orderNumber}`, note: 'Bill nahi bana — wapis', userId: user.id,
      })).catch(() => undefined);
    }
  }

  /* ─────────────── editing an open order ─────────────── */

  private async recalc(orderId: string) {
    const o = await this.prisma.restaurantOrder.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    const t = this.totals(o, o.items.reduce((s, r) => s + r.total, 0));
    return this.prisma.restaurantOrder.update({ where: { id: orderId }, data: t, include: { items: true } });
  }

  async addItems(user: AuthenticatedUser, id: string, items: OrderItemDto[]) {
    const o = await this.prisma.restaurantOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order nahi mila');
    if (o.saleId || ['COMPLETED', 'CANCELLED'].includes(o.status)) throw new BadRequestException('Band order me item nahi barhte');

    const lines = await this.priceItems(user, items);
    for (const { modifiers, ...l } of lines) {
      await this.prisma.restaurantOrderItem.create({
        data: { orderId: id, ...l, modifiers: modifiers.length ? { create: modifiers } : undefined },
      });
    }
    return this.recalc(id);
  }

  async removeItem(user: AuthenticatedUser, orderId: string, itemId: string) {
    const o = await this.prisma.restaurantOrder.findFirst({ where: { id: orderId, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order nahi mila');
    if (o.saleId || ['COMPLETED', 'CANCELLED'].includes(o.status)) throw new BadRequestException('Band order se item nahi hatta');
    const item = await this.prisma.restaurantOrderItem.findFirst({ where: { id: itemId, orderId } });
    if (!item) throw new NotFoundException('Item nahi mila');
    if (['SERVED', 'DELIVERED', 'COMPLETED'].includes(item.status)) throw new BadRequestException('Serve ho chuka item nahi hatta');

    await this.prisma.restaurantOrderItem.delete({ where: { id: itemId } });
    return this.recalc(orderId);
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
}
