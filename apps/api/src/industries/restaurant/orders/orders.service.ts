import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod, Prisma, RestaurantOrderMode, RestaurantOrderStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { ShopScope, applyStockDelta, resolveWriteShopId } from '../../../common/shop-scope';
import { RecipesService } from '../recipes/recipes.service';
import { convertQty, round2 } from '../recipes/recipe-units';
import { KotService, OPEN_KOT } from '../kot/kot.service';
import { HappyHoursService } from '../happy-hours/happy-hours.service';
import { CreateOrderDto, OrderItemDto } from './dto/create-order.dto';
import {
  AddPaymentDto, CheckoutDto, SplitBillDto, SplitItemsDto, UpdateOrderDto, UpdateOrderStatusDto, VoidItemDto,
} from './dto/update-status.dto';
import { approveKitchenVoid } from './void-approval';
import { menuBranch, offAtBranch } from '../menu-items/branch-availability';
import { OPEN_ORDER, withTokens } from './order-tokens';

const MODE_LABEL: Record<string, string> = {
  DINE_IN: 'Dine-in', TAKEAWAY: 'Takeaway', DELIVERY: 'Delivery',
  DRIVE_THRU: 'Drive-thru', ROOM_SERVICE: 'Room service', PICKUP: 'Pickup',
};

const toSaleMethod = (m: string): PaymentMethod =>
  (m === 'BANK' ? 'BANK_TRANSFER' : m) as PaymentMethod;

/** Kitchen-made stock movements carry this prefix so a dish stays classed as made. */
const KITCHEN_REF = 'Kitchen:';

/** A bill being made holds the order with this marker in `saleId`; older than this it counts as abandoned. */
const CLAIM_PREFIX = 'pending:';
const CLAIM_STALE_MS = 2 * 60_000;

/** Statuses an order may be moved to by hand; the rest follow from kitchen, payment or delivery. */
const MANUAL_STATUS: RestaurantOrderStatus[] = ['CONFIRMED', 'COOKING', 'READY', 'SERVED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED'];

const isStatus = (v: string): v is RestaurantOrderStatus => (Object.values(RestaurantOrderStatus) as string[]).includes(v);
const isMode = (v: string): v is RestaurantOrderMode => (Object.values(RestaurantOrderMode) as string[]).includes(v);

type SettleOptions = { customerId?: string; managerPin?: string };
type Payment = { amount: number; paymentMethod: string; paidBy?: string; reference?: string; notes?: string };
type Charges = { serviceChargePct: number; taxPct: number; deliveryFee: number; packagingFee: number; tip: number; discount: number };

export const orderDetailInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      product: { include: { images: true, category: true, variants: { select: { id: true, name: true } } } },
      modifiers: { include: { modifierOption: { include: { modifierGroup: true } } } },
    },
  },
  table: true,
  delivery: { include: { rider: true } },
  kots: { orderBy: { createdAt: 'desc' } },
  payments: { orderBy: { paidAt: 'desc' } },
} satisfies Prisma.RestaurantOrderInclude;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipes: RecipesService,
    private readonly sales: SalesService,
    private readonly kitchen: KotService,
    private readonly tz: TenantTimezoneService,
    private readonly happy: HappyHoursService,
  ) {}

  /** Creates an order row under the next free number (two counters may take one at once). */
  private async withNumber(tenantId: string, create: (orderNumber: string) => Promise<{ id: string }>) {
    for (let attempt = 0; ; attempt++) {
      try {
        return (await create(await this.nextOrderNumber(tenantId))).id;
      } catch (e) {
        if (attempt < 4 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }
  }

  async tokens<T extends { id: string; createdAt: Date }>(tenantId: string, rows: T[]) {
    return withTokens(this.prisma, tenantId, await this.tz.clock(tenantId), rows);
  }

  /* ─────────────── pricing ─────────────── */

  /**
   * Prices new lines: menu or size price, add-ons, the typed line discount
   * and any happy hour running now for this order type. `existing` are the
   * order's live lines, so a happy hour's minimum bill and cap see the
   * whole order when dishes are added later. A dish "86" at the order's
   * branch is refused first, then one switched off shop-wide.
   */
  private async priceItems(
    user: AuthenticatedUser, items: OrderItemDto[], mode: RestaurantOrderMode, shopId: string | null,
    existing: Array<{ productId: string; quantity: number; basePrice: number }> = [],
  ) {
    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId: user.tenantId, isActive: true },
      select: { id: true, price: true, costPrice: true, unit: true, isRawMaterial: true, name: true, menuItem: { select: { id: true, isAvailable: true } } },
    });
    if (products.length !== productIds.length) throw new NotFoundException('Menu ka ek ya zyada item nahi mila (band ya mita hua)');
    const raw = products.find((p) => p.isRawMaterial);
    if (raw) throw new BadRequestException(`"${raw.name}" kachcha maal hai — menu par nahi bikta`);
    const menuIds = products.map((p) => p.menuItem?.id).filter(Boolean) as string[];
    const offHere = await offAtBranch(this.prisma, user.tenantId, await menuBranch(this.prisma, user.tenantId, shopId), menuIds);
    const branchOff = products.find((p) => p.menuItem && offHere.has(p.menuItem.id));
    if (branchOff) {
      const until = offHere.get(branchOff.menuItem!.id);
      throw new BadRequestException(`"${branchOff.name}" is branch me abhi khatam hai (86)${until ? ' — waqt poora hone par khud chalu ho jayegi' : ''}. Menu se chalu karein`);
    }
    const off = products.find((p) => p.menuItem && !p.menuItem.isAvailable);
    if (off) throw new BadRequestException(`"${off.name}" abhi khatam hai (86) — Menu se dobara chalu karein`);
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

    const lines = items.map((item) => {
      const product = productMap.get(item.productId)!;
      const variant = item.variantId ? variantMap.get(item.variantId) : undefined;
      if (item.variantId && (!variant || variant.productId !== item.productId)) throw new NotFoundException('Item ka size/variant nahi mila');
      const menuPrice = Number(variant?.price ?? product.price ?? 0);
      // An open-price dish (menu price 0) takes the typed price; a lower typed
      // price is a discount and stays visible as one.
      const typed = item.basePrice;
      const basePrice = menuPrice > 0 ? Math.max(menuPrice, typed ?? 0) : (typed ?? 0);
      const priceCut = menuPrice > 0 && typed !== undefined && typed < menuPrice ? (menuPrice - typed) * item.quantity : 0;
      let modifierTotal = 0;
      const modifiers = (item.modifiers ?? []).map((m) => {
        const opt = optionMap.get(m.modifierOptionId);
        if (!opt) throw new NotFoundException('Modifier option nahi mila');
        const quantity = m.quantity ?? 1;
        modifierTotal += opt.priceAdjustment * quantity;
        return { modifierOptionId: m.modifierOptionId, quantity, priceAdjustment: opt.priceAdjustment, notes: m.notes };
      });
      const gross = (basePrice + modifierTotal) * item.quantity;
      const itemDiscount = round2(Math.min((item.itemDiscount ?? 0) + priceCut, Math.max(gross, 0)));
      return {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unit: item.unit ?? product.unit ?? 'piece',
        basePrice: round2(basePrice),
        modifierTotal: round2(modifierTotal),
        itemDiscount,
        total: round2(Math.max(gross - itemDiscount, 0)),
        costPrice: variant?.costPrice ?? product.costPrice ?? 0,
        specialInstructions: item.specialInstructions?.trim() || undefined,
        spiceLevel: item.spiceLevel,
        cookingNote: item.cookingNote?.trim() || undefined,
        courseNumber: item.courseNumber,
        status: 'PLACED' as const,
        modifiers,
      };
    });

    const cuts = await this.happyHourCuts(user.tenantId, mode, lines, existing);
    return lines.map((l, i) => {
      const { cut, ruleId } = cuts[i];
      if (!(cut > 0)) return l;
      const gross = (l.basePrice + l.modifierTotal) * l.quantity;
      const itemDiscount = round2(Math.min(l.itemDiscount + cut, Math.max(gross, 0)));
      return { ...l, itemDiscount, total: round2(Math.max(gross - itemDiscount, 0)), happyHourRuleId: ruleId ?? undefined };
    });
  }

  /**
   * Happy-hour discount for each new line, on the menu price before add-ons.
   * A shop that has switched hand discounts off gets none, since the bill
   * would be refused for carrying a discount. With lines already on the
   * order, a rule's cap is shared: the new lines get what the whole order
   * earns less what the earlier lines earn on their own.
   */
  private async happyHourCuts(
    tenantId: string, mode: RestaurantOrderMode,
    lines: Array<{ productId: string; quantity: number; basePrice: number }>,
    existing: Array<{ productId: string; quantity: number; basePrice: number }>,
  ): Promise<Array<{ cut: number; ruleId: string | null }>> {
    const none = lines.map(() => ({ cut: 0, ruleId: null }));
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId }, select: { allowDiscount: true } });
    if (settings && !settings.allowDiscount) return none;
    const at = new Date();
    const asHappy = (l: { productId: string; quantity: number; basePrice: number }) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.basePrice });
    const all = await this.happy.priceLines(tenantId, [...existing, ...lines].map(asHappy), { mode, at });
    if (!(all.discount > 0)) return none;
    const fresh = all.lines.slice(existing.length);
    if (!existing.length) return fresh.map((l) => ({ cut: l.discount, ruleId: l.ruleId }));

    const before = await this.happy.priceLines(tenantId, existing.map(asHappy), { mode, at });
    const cuts = fresh.map((l) => l.discount);
    for (const rule of all.rules) {
      const earlier = before.rules.find((r) => r.id === rule.id)?.saved ?? 0;
      const budget = Math.max(rule.saved - earlier, 0);
      const mine = fresh.reduce((s, l) => s + (l.ruleId === rule.id ? l.discount : 0), 0);
      if (mine <= budget + 0.005) continue;
      const k = mine > 0 ? budget / mine : 0;
      fresh.forEach((l, i) => { if (l.ruleId === rule.id) cuts[i] = round2(l.discount * k); });
    }
    return cuts.map((cut, i) => ({ cut, ruleId: cut > 0 ? fresh[i].ruleId : null }));
  }

  private totals(o: Charges, subtotal: number) {
    const serviceCharge = round2(subtotal * (o.serviceChargePct / 100));
    const taxAmount = round2((subtotal + serviceCharge) * (o.taxPct / 100));
    const total = round2(Math.max(subtotal + serviceCharge + taxAmount + o.deliveryFee + o.packagingFee + o.tip - o.discount, 0));
    return { subtotal: round2(subtotal), serviceCharge, taxAmount, total };
  }

  private checkDiscount(charges: Charges, subtotal: number) {
    const gross = subtotal + subtotal * (charges.serviceChargePct / 100);
    if (charges.discount > gross + charges.deliveryFee + charges.packagingFee + 0.01) {
      throw new BadRequestException('Discount bill se zyada nahi ho sakta');
    }
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

  /** A waiter must be an active member of this business. */
  private async checkWaiter(tenantId: string, waiterId?: string | null) {
    if (!waiterId) return;
    const w = await this.prisma.user.findFirst({ where: { id: waiterId, tenantId, isActive: true }, select: { id: true } });
    if (!w) throw new NotFoundException('Waiter nahi mila');
  }

  private async checkCustomer(tenantId: string, customerId?: string | null) {
    if (!customerId) return;
    const c = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId }, select: { id: true } });
    if (!c) throw new NotFoundException('Customer nahi mila');
  }

  /** Table the order may sit on: active, in this branch, not out of service, and not taken by another open order. */
  private async checkTable(tenantId: string, tableId: string, shopId: string | null, exceptOrderId?: string) {
    const table = await this.prisma.restaurantTableV2.findFirst({ where: { id: tableId, tenantId, isActive: true } });
    if (!table) throw new NotFoundException('Table nahi mili');
    if (table.shopId && shopId && table.shopId !== shopId) throw new BadRequestException('Ye table doosri branch ki hai');
    if (table.status === 'OUT_OF_SERVICE') throw new BadRequestException(`Table ${table.tableNumber} band hai`);
    const busy = await this.prisma.restaurantOrder.findFirst({
      where: { tenantId, tableId, status: { in: OPEN_ORDER }, saleId: null, ...(exceptOrderId && { id: { not: exceptOrderId } }) },
      select: { orderNumber: true },
    });
    if (busy) throw new BadRequestException(`Table ${table.tableNumber} par pehle se order ${busy.orderNumber} chal raha hai — usi me item daalein`);
    return table;
  }

  private async seat(tableId: string, orderId: string, since?: Date | null) {
    await this.prisma.restaurantTableV2.update({
      where: { id: tableId },
      data: {
        status: 'OCCUPIED', occupiedAt: since ?? new Date(), currentOrderId: orderId,
        reservedAt: null, reservedFor: null, reservedByName: null, reservedByPhone: null, reservationNote: null,
      },
    });
  }

  /* ─────────────── orders ─────────────── */

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateOrderDto) {
    if (!dto.items?.length) throw new BadRequestException('Kam se kam ek item zaroori hai');
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope, dto.shopId);
    const tableId = dto.mode === 'DINE_IN' ? dto.tableId || undefined : undefined;
    if (tableId) await this.checkTable(user.tenantId, tableId, shopId);
    if (dto.mode === 'DELIVERY' && !(dto.deliveryAddress?.trim() || dto.customerAddress?.trim())) {
      throw new BadRequestException('Delivery ke liye pata likhein');
    }
    await this.checkCustomer(user.tenantId, dto.customerId);
    await this.checkWaiter(user.tenantId, dto.waiterId);

    const lines = await this.priceItems(user, dto.items, dto.mode, shopId);
    // A dine-in order takes the shop's service charge unless the counter sends its own.
    const shopService = dto.serviceChargePct === undefined && dto.mode === 'DINE_IN'
      ? (await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { serviceChargePct: true } }))?.serviceChargePct ?? 0
      : 0;
    const charges: Charges = {
      serviceChargePct: dto.serviceChargePct ?? shopService,
      taxPct: dto.taxPct ?? 0,
      discount: dto.discount ?? 0,
      deliveryFee: dto.mode === 'DELIVERY' ? dto.deliveryFee ?? 0 : 0,
      packagingFee: dto.packagingFee ?? 0,
      tip: dto.tip ?? 0,
    };
    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    this.checkDiscount(charges, subtotal);
    const t = this.totals(charges, subtotal);

    const orderId = await this.withNumber(user.tenantId, (orderNumber) => this.prisma.restaurantOrder.create({
      data: {
        tenantId: user.tenantId,
        shopId,
        tableId,
        customerId: dto.customerId || undefined,
        waiterId: dto.waiterId || user.id,
        orderNumber,
        mode: dto.mode,
        status: 'PLACED',
        customerName: dto.customerName?.trim() || undefined,
        customerPhone: dto.customerPhone?.trim() || undefined,
        customerAddress: dto.customerAddress?.trim() || undefined,
        numberOfGuests: dto.numberOfGuests,
        specialRequests: dto.specialRequests?.trim() || undefined,
        estimatedPrepTime: dto.estimatedPrepTime,
        ...charges,
        ...t,
        placedAt: new Date(),
        deliveryAddress: dto.mode === 'DELIVERY' ? (dto.deliveryAddress || dto.customerAddress)?.trim() : undefined,
        deliveryLat: dto.deliveryLat,
        deliveryLng: dto.deliveryLng,
        deliveryNotes: dto.deliveryNotes?.trim() || undefined,
        items: {
          create: lines.map(({ modifiers, ...l }) => ({
            ...l,
            modifiers: modifiers.length ? { create: modifiers } : undefined,
          })),
        },
      },
      select: { id: true },
    }));

    if (tableId) await this.seat(tableId, orderId);
    if (dto.sendToKitchen) await this.kitchen.fire(user, orderId);
    return this.getOne(user, orderId);
  }

  whereFor(user: AuthenticatedUser, params: {
    status?: string; mode?: string; tableId?: string; waiterId?: string; search?: string; saleId?: string; shopId?: string; open?: boolean;
    created?: { gte?: Date; lt?: Date; lte?: Date };
  }, saleIds: string[]): Prisma.RestaurantOrderWhereInput {
    const and: Prisma.RestaurantOrderWhereInput[] = [];
    if (params.shopId) and.push({ OR: [{ shopId: params.shopId }, { shopId: null }] });
    if (params.search?.trim()) {
      const q = params.search.trim();
      and.push({
        OR: [
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { customerName: { contains: q, mode: 'insensitive' } },
          { customerPhone: { contains: q } },
          { table: { tableNumber: { equals: q, mode: 'insensitive' } } },
          // The receipt looks its order up by the bill number.
          ...(saleIds.length ? [{ saleId: { in: saleIds } }] : []),
        ],
      });
    }
    return {
      tenantId: user.tenantId,
      ...(params.saleId && { saleId: params.saleId }),
      ...(params.open && { status: { in: OPEN_ORDER } }),
      ...(params.status && !params.open && isStatus(params.status) && { status: params.status }),
      ...(params.mode && isMode(params.mode) && { mode: params.mode }),
      ...(params.tableId && { tableId: params.tableId }),
      ...(params.waiterId && { waiterId: params.waiterId }),
      ...(params.created && { createdAt: params.created }),
      ...(and.length ? { AND: and } : {}),
    };
  }

  /** Bills whose number matches a search, so an order can be found from its receipt. */
  async saleIdsFor(tenantId: string, search?: string) {
    const q = search?.trim();
    if (!q || q.length < 3) return [];
    const sales = await this.prisma.sale.findMany({ where: { tenantId, saleNumber: { contains: q, mode: 'insensitive' } }, select: { id: true }, take: 20 });
    return sales.map((s) => s.id);
  }

  async list(user: AuthenticatedUser, params: {
    status?: string; mode?: string; tableId?: string; from?: string; to?: string; search?: string; saleId?: string; shopId?: string; open?: boolean; waiterId?: string;
    saleIds?: string[];
  }) {
    const created = params.from || params.to ? {
      ...(params.from && { gte: new Date(params.from) }),
      ...(params.to && { lte: new Date(params.to) }),
    } : undefined;
    const saleIds = await this.saleIdsFor(user.tenantId, params.search);
    const where = this.whereFor(user, { ...params, created }, saleIds);
    const rows = await this.prisma.restaurantOrder.findMany({
      where: params.saleIds?.length ? { ...where, saleId: { in: params.saleIds } } : where,
      include: {
        items: {
          where: { isReturned: false },
          include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } }, modifiers: { include: { modifierOption: true } } },
        },
        table: true,
        delivery: { include: { rider: true } },
        kots: { select: { id: true, kotNumber: true, status: true, station: true, priority: true }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: params.open ? 500 : 200,
    });
    return this.tokens(user.tenantId, rows);
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.restaurantOrder.findFirst({ where: { id, tenantId: user.tenantId }, include: orderDetailInclude });
    if (!o) throw new NotFoundException('Order nahi mila');
    const [withToken] = await this.tokens(user.tenantId, [o]);
    const [waiter, sale, children, parent] = await Promise.all([
      o.waiterId ? this.prisma.user.findFirst({ where: { id: o.waiterId, tenantId: user.tenantId }, select: { id: true, fullName: true } }) : null,
      o.saleId && !o.saleId.startsWith(CLAIM_PREFIX)
        ? this.prisma.sale.findFirst({ where: { id: o.saleId, tenantId: user.tenantId }, select: { id: true, saleNumber: true, status: true, total: true, creditAmount: true } })
        : null,
      this.prisma.restaurantOrder.findMany({ where: { tenantId: user.tenantId, parentOrderId: id }, select: { id: true, orderNumber: true, total: true, status: true, saleId: true } }),
      o.parentOrderId ? this.prisma.restaurantOrder.findFirst({ where: { id: o.parentOrderId, tenantId: user.tenantId }, select: { id: true, orderNumber: true, status: true } }) : null,
    ]);
    return { ...withToken, waiter, sale, splitOrders: children, parentOrder: parent };
  }

  async updateStatus(user: AuthenticatedUser, scope: ShopScope, id: string, dto: UpdateOrderStatusDto) {
    const o = await this.prisma.restaurantOrder.findFirst({ where: { id, tenantId: user.tenantId }, include: { items: true } });
    if (!o) throw new NotFoundException('Order nahi mila');
    if (o.status === dto.status) return this.getOne(user, id);
    if (!MANUAL_STATUS.includes(dto.status)) throw new BadRequestException('Ye status haath se nahi lagta');
    if (o.status === 'CANCELLED') throw new BadRequestException('Cancel hua order dobara nahi khulta');
    if (o.saleId?.startsWith(CLAIM_PREFIX)) throw new BadRequestException('Is order ka bill ban raha hai — thori der baad');
    if (dto.status === 'COMPLETED' && !o.saleId) {
      throw new BadRequestException('Pehle bill ki payment lein — payment poori hote hi order khud complete ho jata hai');
    }
    if (dto.status === 'CANCELLED' && o.saleId) {
      throw new BadRequestException('Is order ka bill ban chuka hai — Sale record se Return ya Void karein');
    }
    if ((dto.status === 'OUT_FOR_DELIVERY' || dto.status === 'DELIVERED') && o.mode !== 'DELIVERY') {
      throw new BadRequestException('Ye status sirf delivery order ka hai');
    }

    const now = new Date();
    const patch: Prisma.RestaurantOrderUpdateInput = { status: dto.status };
    if (dto.status === 'CONFIRMED') patch.confirmedAt = now;
    if (dto.status === 'COOKING') patch.cookingStartedAt = now;
    if (dto.status === 'READY') patch.readyAt = now;
    if (dto.status === 'SERVED') patch.servedAt = now;
    if (dto.status === 'OUT_FOR_DELIVERY') patch.outForDeliveryAt = now;
    if (dto.status === 'DELIVERED') patch.deliveredAt = now;
    if (dto.status === 'COMPLETED') patch.completedAt = now;

    const live = o.items.filter((it) => !it.isReturned);
    if (dto.status === 'CANCELLED') {
      const reason = dto.cancellationReason?.trim();
      if (!reason || reason.length < 3) throw new BadRequestException('Cancel karne ki wajah likhein');
      const sent = live.filter((it) => it.sentToKitchenAt);
      const approval = sent.length ? await approveKitchenVoid(this.prisma, user, dto.managerPin, 'Kitchen ja chuka order cancel') : null;
      patch.cancelledAt = now;
      patch.cancellationReason = reason;
      await this.prisma.kot.updateMany({ where: { orderId: id, status: { in: OPEN_KOT } }, data: { status: 'CANCELLED', cancelledAt: now } });
      if (sent.length) await this.kitchen.cancelTicket(user, id, sent.map((it) => ({ itemId: it.id, quantity: it.quantity })), `Order cancel: ${reason}`);
      await this.prisma.restaurantOrderItem.updateMany({ where: { orderId: id, isReturned: false }, data: { status: 'CANCELLED' } });
      await this.releaseRider(id);
      await this.prisma.activityLog.create({
        data: {
          tenantId: user.tenantId, userId: user.id, action: 'RESTAURANT_ORDER_CANCELLED', entityType: 'RestaurantOrder', entityId: id,
          description: `Order ${o.orderNumber} cancel (Rs ${o.total}) — ${reason}`,
          metadata: { total: o.total, sentToKitchen: sent.length, approvedBy: approval?.by ?? null, approverId: approval?.approverId ?? null, paidBefore: o.paidAmount },
        },
      });
    }

    // The kitchen starts cooking: ingredients leave the store.
    if (dto.status === 'COOKING') {
      const shopId = o.shopId ?? await resolveWriteShopId(this.prisma, user.tenantId, scope);
      await this.recipes.consumeForLines(user, shopId, live, o.orderNumber);
    }
    if (['COOKING', 'READY', 'SERVED'].includes(dto.status)) {
      await this.prisma.restaurantOrderItem.updateMany({ where: { orderId: id, isReturned: false }, data: { status: dto.status } });
    }

    await this.prisma.restaurantOrder.update({ where: { id }, data: patch });
    if ((dto.status === 'COMPLETED' || dto.status === 'CANCELLED') && o.tableId) {
      await this.freeTable(o.tableId, o.id);
    }
    return this.getOne(user, id);
  }

  /** A delivery that will not happen frees its rider. */
  private async releaseRider(orderId: string) {
    const t = await this.prisma.deliveryTracking.findUnique({ where: { orderId } });
    if (!t || ['DELIVERED', 'FAILED', 'RETURNED'].includes(t.status)) return;
    await this.prisma.deliveryTracking.update({ where: { orderId }, data: { status: 'FAILED', failureReason: 'Order cancel' } });
    if (t.riderId) {
      const busy = await this.prisma.deliveryTracking.count({ where: { riderId: t.riderId, status: { in: ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'ARRIVED'] } } });
      if (!busy) await this.prisma.rider.updateMany({ where: { id: t.riderId, status: 'BUSY' }, data: { status: 'ACTIVE' } });
    }
  }

  /**
   * The order leaves its table. When another open order (a split bill) still
   * sits there the table stays taken by it; otherwise it waits for cleaning.
   */
  private async freeTable(tableId: string, orderId: string) {
    const other = await this.prisma.restaurantOrder.findFirst({
      where: { tableId, id: { not: orderId }, status: { in: OPEN_ORDER }, saleId: null },
      orderBy: { createdAt: 'asc' }, select: { id: true },
    });
    if (other) {
      await this.prisma.restaurantTableV2.updateMany({ where: { id: tableId, currentOrderId: orderId }, data: { currentOrderId: other.id } });
      return;
    }
    await this.prisma.restaurantTableV2.updateMany({
      where: { id: tableId, OR: [{ currentOrderId: orderId }, { currentOrderId: null }] },
      data: { status: 'CLEANING', currentOrderId: null, occupiedAt: null },
    });
  }

  /* ─────────────── payment → bill ─────────────── */

  async addPayment(user: AuthenticatedUser, scope: ShopScope, id: string, dto: AddPaymentDto) {
    const o = await this.openOrder(user, id);
    if (!(dto.amount > 0) && !dto.closeOnCredit) throw new BadRequestException('Amount likhein');

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
    const o = await this.openOrder(user, orderId);
    const splits = dto.splits.filter((s) => s.amount > 0);
    const sum = round2(splits.reduce((s, sp) => s + sp.amount, 0));
    const remaining = round2(o.total - o.paidAmount);
    if (Math.abs(sum - remaining) > 0.01) {
      throw new BadRequestException(`Hisson ka jor (${sum}) baqi amount (${remaining}) ke barabar nahi`);
    }
    await this.settle(user, scope, orderId, splits.map((s) => ({ amount: s.amount, paymentMethod: s.paymentMethod, paidBy: s.paidBy })), { managerPin: dto.managerPin });
    await this.prisma.restaurantOrder.update({ where: { id: orderId }, data: { isSplitBill: splits.length > 1 } });
    return this.getOne(user, orderId);
  }

  /**
   * One payment step from the checkout dialog: cash, card, wallet or several
   * of them, with the unpaid part on khata when asked. Cash over the bill is
   * change and is not recorded.
   */
  async checkout(user: AuthenticatedUser, scope: ShopScope, orderId: string, dto: CheckoutDto) {
    const o = await this.openOrder(user, orderId);
    const remaining = round2(o.total - o.paidAmount);
    const parts = dto.payments.map((p) => ({ ...p, amount: round2(p.amount) }));
    let over = round2(parts.reduce((s, p) => s + p.amount, 0) - remaining);
    if (over < -0.01 && !dto.closeOnCredit) {
      throw new BadRequestException(`Rs ${Math.abs(over)} kam hain — poori payment lein ya baqi udhaar karein`);
    }
    // Change comes off the cash, last part first; card or wallet never gives change.
    for (let i = parts.length - 1; i >= 0 && over > 0.005; i--) {
      if (toSaleMethod(parts[i].method) !== 'CASH') continue;
      const cut = Math.min(parts[i].amount, over);
      parts[i].amount = round2(parts[i].amount - cut);
      over = round2(over - cut);
    }
    if (over > 0.01) throw new BadRequestException('Card, bank ya wallet par change nahi diya ja sakta — zyada paisa sirf Cash me lein');
    const payments: Payment[] = parts.filter((p) => p.amount > 0)
      .map((p) => ({ amount: p.amount, paymentMethod: p.method === 'BANK' ? 'BANK_TRANSFER' : p.method, reference: p.reference, paidBy: p.paidBy }));
    await this.settle(user, scope, orderId, payments, { customerId: dto.customerId, managerPin: dto.managerPin });
    if (payments.length > 1) await this.prisma.restaurantOrder.update({ where: { id: orderId }, data: { isSplitBill: true } });
    return this.getOne(user, orderId);
  }

  private async openOrder(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.restaurantOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order nahi mila');
    if (o.status === 'CANCELLED') throw new BadRequestException('Cancel hue order par ye kaam nahi hota');
    if (o.saleId?.startsWith(CLAIM_PREFIX)) throw new BadRequestException('Is order ka bill ban raha hai — thori der baad dekhein');
    if (o.saleId) throw new BadRequestException('Is order ka bill pehle hi ban chuka hai');
    return o;
  }

  /** Marks the order as being billed so two counters cannot make two bills for it. */
  private async claim(orderId: string) {
    const token = `${CLAIM_PREFIX}${randomUUID()}`;
    const r = await this.prisma.restaurantOrder.updateMany({
      where: {
        id: orderId,
        status: { not: 'CANCELLED' },
        OR: [{ saleId: null }, { saleId: { startsWith: CLAIM_PREFIX }, updatedAt: { lt: new Date(Date.now() - CLAIM_STALE_MS) } }],
      },
      data: { saleId: token },
    });
    if (!r.count) throw new BadRequestException('Is order ka bill ban raha hai ya ban chuka hai — page taaza karein');
    return token;
  }

  private release(orderId: string, token: string) {
    return this.prisma.restaurantOrder.updateMany({ where: { id: orderId, saleId: token }, data: { saleId: null } });
  }

  /**
   * Turn a paid order into a Sale so it reaches the day book, cash drawer,
   * khata, stock and every report. Before the sale:
   *   • ingredients of lines not cooked yet are taken out (recipes);
   *   • a kitchen-made dish gets the plates it needs, because a dish is
   *     cooked to order and has no shelf stock of its own.
   */
  private async settle(user: AuthenticatedUser, scope: ShopScope, orderId: string, newPayments: Payment[], opts: SettleOptions) {
    const token = await this.claim(orderId);
    try {
      return await this.makeBill(user, scope, orderId, newPayments, opts, token);
    } catch (e) {
      await this.release(orderId, token);
      throw e;
    }
  }

  private async makeBill(user: AuthenticatedUser, scope: ShopScope, orderId: string, newPayments: Payment[], opts: SettleOptions, token: string) {
    const order = await this.prisma.restaurantOrder.findFirst({
      where: { id: orderId, tenantId: user.tenantId },
      include: {
        items: {
          where: { isReturned: false },
          include: {
            modifiers: {
              include: {
                modifierOption: {
                  select: { name: true, ingredientQty: true, ingredientUnit: true, ingredient: { select: { unit: true, costPrice: true } } },
                },
              },
            },
          },
        },
        payments: true,
        table: { select: { tableNumber: true } },
      },
    });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (!order.items.length) throw new BadRequestException('Order me koi item nahi — khaali order cancel karein');

    const shopId = order.shopId ?? await resolveWriteShopId(this.prisma, user.tenantId, scope);
    const customerId = order.customerId ?? (opts.customerId || undefined);
    if (!order.customerId) await this.checkCustomer(user.tenantId, customerId);
    const payments = [...order.payments.map((p) => ({ amount: p.amount, paymentMethod: p.paymentMethod, reference: p.reference })), ...newPayments];
    const paid = round2(payments.reduce((s, p) => s + p.amount, 0));
    if (paid > order.total + 0.01) throw new BadRequestException('Payment bill se zyada hai');
    if (paid < order.total - 0.01 && !customerId) {
      throw new BadRequestException('Udhaar ke liye customer chunein');
    }
    const waiter = order.waiterId
      ? await this.prisma.user.findFirst({ where: { id: order.waiterId, tenantId: user.tenantId }, select: { id: true } })
      : null;

    await this.recipes.consumeForLines(user, shopId, order.items, order.orderNumber);
    await this.recipes.refreshDishCosts(user.tenantId, [...new Set(order.items.map((i) => i.productId))]);
    const made = await this.makeDishes(user, shopId, order.orderNumber, order.items);
    const unitCosts = await this.plateCosts(order.items);

    // Each method is kept on the bill (cash + card on a split bill); the sale
    // picks the largest as its main method.
    const byMethod = new Map<PaymentMethod, { amount: number; reference?: string | null }>();
    for (const p of payments.filter((x) => x.amount > 0)) {
      const m = toSaleMethod(p.paymentMethod);
      const row = byMethod.get(m) ?? { amount: 0, reference: p.reference };
      byMethod.set(m, { amount: round2(row.amount + p.amount), reference: row.reference ?? p.reference });
    }
    const parts = [...byMethod.entries()]
      .map(([method, r]) => ({ method, amount: r.amount, reference: r.reference ?? undefined }))
      .sort((a, b) => b.amount - a.amount);

    const charges = [
      { type: 'SERVICE', label: `Service charge${order.serviceChargePct ? ` (${order.serviceChargePct}%)` : ''}`, amount: order.serviceCharge },
      { type: 'TAX', label: `Tax${order.taxPct ? ` (${order.taxPct}%)` : ''}`, amount: order.taxAmount },
      { type: 'DELIVERY', label: 'Delivery charge', amount: order.deliveryFee },
      { type: 'PACKAGING', label: 'Packing', amount: order.packagingFee },
      { type: 'TIP', label: 'Tip', amount: order.tip },
    ].filter((c) => c.amount > 0).map((c) => ({ ...c, amount: round2(c.amount) }));

    let sale: { id: string; saleNumber: string };
    try {
      sale = await this.sales.create(user, new ShopScope(shopId, false), {
        shopId,
        customerId,
        soldById: waiter?.id,
        paymentMethod: parts[0]?.method ?? 'CASH',
        paidAmount: paid,
        payments: parts.length ? parts : undefined,
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
      } as Parameters<SalesService['create']>[2], undefined, { unitCosts });
    } catch (e) {
      await this.unmakeDishes(user, shopId, order.orderNumber, made);
      throw e;
    }

    const now = new Date();
    const happy = await this.happy.billSavings(user.tenantId, order.items);
    await this.prisma.$transaction(async (tx) => {
      for (const p of newPayments) {
        await tx.restaurantOrderPayment.create({ data: { orderId, ...p } });
      }
      await tx.restaurantOrder.updateMany({
        where: { id: orderId, saleId: token },
        data: { saleId: sale.id, paidAmount: paid, customerId: customerId ?? null, status: 'COMPLETED', completedAt: now },
      });
      for (const it of order.items) {
        await tx.restaurantMenuItem.updateMany({ where: { productId: it.productId, tenantId: user.tenantId }, data: { totalOrdered: { increment: Math.round(it.quantity) } } });
      }
      // Each bill a happy hour priced counts once, with what it saved.
      for (const h of happy) {
        await tx.happyHourRule.update({ where: { id: h.id }, data: { totalUsage: { increment: 1 }, totalSaved: { increment: h.saved } } });
      }
      if (order.tableId) {
        await tx.restaurantTableV2.update({
          where: { id: order.tableId },
          data: { totalOrders: { increment: 1 }, totalRevenue: { increment: order.total } },
        });
      }
      // Guests at a table pay after eating: whatever the kitchen still shows was served.
      if (order.mode === 'DINE_IN' || order.mode === 'ROOM_SERVICE') {
        await tx.kot.updateMany({ where: { orderId, status: { in: OPEN_KOT } }, data: { status: 'SERVED', servedAt: now } });
        await tx.restaurantOrderItem.updateMany({ where: { orderId, isReturned: false, status: { notIn: ['SERVED', 'CANCELLED'] } }, data: { status: 'SERVED', servedAt: now } });
      }
    });
    if (order.tableId) await this.freeTable(order.tableId, order.id);
    return sale;
  }

  /**
   * Cost per plate for lines with add-ons that use raw material (extra
   * cheese): the dish's own cost plus those ingredients at today's cost, so
   * the bill's cost of goods includes them. Other lines keep the dish cost
   * the sale reads itself (undefined). Run after the dish costs are refreshed.
   */
  private async plateCosts(items: Array<{
    productId: string; variantId: string | null;
    modifiers: Array<{ quantity: number; modifierOption: { ingredientQty: number | null; ingredientUnit: string | null; ingredient: { unit: string; costPrice: number } | null } }>;
  }>): Promise<Array<number | undefined>> {
    const addOn = items.map((it) => round2(it.modifiers.reduce((s, m) => {
      const o = m.modifierOption;
      if (!o.ingredient || !(Number(o.ingredientQty) > 0)) return s;
      return s + convertQty(Number(o.ingredientQty) * m.quantity, o.ingredientUnit, o.ingredient.unit) * (Number(o.ingredient.costPrice) || 0);
    }, 0)));
    if (!addOn.some((c) => c > 0)) return items.map(() => undefined);
    const productIds = [...new Set(items.map((i) => i.productId))];
    const variantIds = [...new Set(items.map((i) => i.variantId).filter((v): v is string => !!v))];
    const [products, variants] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, costPrice: true } }),
      variantIds.length ? this.prisma.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, costPrice: true } }) : [],
    ]);
    const productCost = new Map(products.map((p) => [p.id, Number(p.costPrice) || 0]));
    const variantCost = new Map(variants.map((v) => [v.id, Number(v.costPrice) || 0]));
    // Same plate cost the sale would use: the size's cost when a size was sold, else the dish's.
    return items.map((it, i) => (addOn[i] > 0
      ? round2((it.variantId && variantCost.has(it.variantId) ? variantCost.get(it.variantId)! : productCost.get(it.productId) ?? 0) + addOn[i])
      : undefined));
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
      // A kitchen dish has no real shelf stock, so a count below zero (plates
      // taken while a void was being settled) is made up here as well.
      const shortfall = round2(row.qty - Number(stock?.stock ?? 0));
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
    const o = await this.prisma.restaurantOrder.findUniqueOrThrow({ where: { id: orderId }, include: { items: { where: { isReturned: false } } } });
    const t = this.totals(o, o.items.reduce((s, r) => s + r.total, 0));
    await this.prisma.restaurantOrder.update({ where: { id: orderId }, data: t });
  }

  async addItems(user: AuthenticatedUser, id: string, items: OrderItemDto[], sendToKitchen = false) {
    const o = await this.openOrder(user, id);
    const live = await this.prisma.restaurantOrderItem.findMany({
      where: { orderId: id, isReturned: false }, select: { productId: true, quantity: true, basePrice: true },
    });
    const lines = await this.priceItems(user, items, o.mode, o.shopId, live);
    const ids: string[] = [];
    for (const { modifiers, ...l } of lines) {
      const row = await this.prisma.restaurantOrderItem.create({
        data: { orderId: id, ...l, modifiers: modifiers.length ? { create: modifiers } : undefined },
        select: { id: true },
      });
      ids.push(row.id);
    }
    await this.recalc(id);
    if (sendToKitchen) await this.kitchen.fire(user, id, { itemIds: ids });
    else if (o.status === 'ON_HOLD') await this.prisma.restaurantOrder.update({ where: { id }, data: { status: 'PLACED' } });
    return this.getOne(user, id);
  }

  /** Sends every line that has not gone to the kitchen yet. */
  async sendToKitchen(user: AuthenticatedUser, id: string) {
    await this.openOrder(user, id);
    const kots = await this.kitchen.fire(user, id);
    if (!kots.length) throw new BadRequestException('Kitchen ke liye koi naya item nahi');
    return { kots, order: await this.getOne(user, id) };
  }

  /**
   * Takes a line (or part of it) off the bill. A line still with the waiter
   * simply goes; one the kitchen has is voided with a reason and approval,
   * kept on the order for the record, and the kitchen gets a cancel ticket.
   */
  async voidItem(user: AuthenticatedUser, orderId: string, itemId: string, dto: VoidItemDto) {
    const o = await this.openOrder(user, orderId);
    const item = await this.prisma.restaurantOrderItem.findFirst({ where: { id: itemId, orderId }, include: { modifiers: true, product: { select: { name: true } } } });
    if (!item || item.isReturned) throw new NotFoundException('Item nahi mila');
    const qty = round2(Math.min(dto.quantity ?? item.quantity, item.quantity));
    if (!(qty > 0)) throw new BadRequestException('Quantity likhein');
    const reason = dto.reason.trim();
    const sent = !!item.sentToKitchenAt;
    const approval = sent ? await approveKitchenVoid(this.prisma, user, dto.managerPin, 'Kitchen ja chuka item hatane') : null;

    const share = qty / item.quantity;
    const voidDiscount = round2(item.itemDiscount * share);
    const voidTotal = round2((item.basePrice + item.modifierTotal) * qty - voidDiscount);
    await this.prisma.$transaction(async (tx) => {
      if (qty >= item.quantity - 0.0001) {
        await tx.restaurantOrderItem.update({ where: { id: item.id }, data: { isReturned: true, returnReason: reason, status: 'CANCELLED' } });
        return;
      }
      await tx.restaurantOrderItem.update({
        where: { id: item.id },
        data: {
          quantity: round2(item.quantity - qty),
          itemDiscount: round2(item.itemDiscount - voidDiscount),
          total: round2(item.total - voidTotal),
        },
      });
      // The taken-back part stays as its own line for the record.
      const { id: _id, createdAt: _c, updatedAt: _u, modifiers, product: _p, ...rest } = item;
      await tx.restaurantOrderItem.create({
        data: {
          ...rest, quantity: qty, itemDiscount: voidDiscount, total: voidTotal, isReturned: true, returnReason: reason, status: 'CANCELLED',
          modifiers: modifiers.length ? { create: modifiers.map((m) => ({ modifierOptionId: m.modifierOptionId, quantity: m.quantity, priceAdjustment: m.priceAdjustment, notes: m.notes })) } : undefined,
        },
      });
    });
    await this.recalc(orderId);
    if (sent) {
      await this.kitchen.cancelTicket(user, orderId, [{ itemId: item.id, quantity: qty }], reason);
      await this.prisma.activityLog.create({
        data: {
          tenantId: user.tenantId, userId: user.id, action: 'RESTAURANT_ITEM_VOID', entityType: 'RestaurantOrder', entityId: orderId,
          description: `${o.orderNumber}: ${qty} × ${item.product?.name ?? 'item'} (Rs ${voidTotal}) wapas — ${reason}`,
          metadata: { itemId, quantity: qty, amount: voidTotal, cooked: !!item.cookingStartedAt, approvedBy: approval?.by ?? null, approverId: approval?.approverId ?? null },
        },
      });
    }
    return this.getOne(user, orderId);
  }

  /** Older screens delete a line; one already in the kitchen needs a void with a reason. */
  async removeItem(user: AuthenticatedUser, orderId: string, itemId: string) {
    await this.openOrder(user, orderId);
    const item = await this.prisma.restaurantOrderItem.findFirst({ where: { id: itemId, orderId } });
    if (!item || item.isReturned) throw new NotFoundException('Item nahi mila');
    if (item.sentToKitchenAt) throw new BadRequestException('Ye item kitchen ja chuka hai — wajah likh kar "Void" karein');
    return this.voidItem(user, orderId, itemId, { reason: 'Kitchen se pehle hataya' });
  }

  /** Changes charges, guests, waiter, customer or delivery details of an open order. */
  async update(user: AuthenticatedUser, id: string, dto: UpdateOrderDto) {
    const o = await this.openOrder(user, id);
    await this.checkWaiter(user.tenantId, dto.waiterId);
    await this.checkCustomer(user.tenantId, dto.customerId);
    const charges: Charges = {
      serviceChargePct: dto.serviceChargePct ?? o.serviceChargePct,
      taxPct: dto.taxPct ?? o.taxPct,
      discount: dto.discount ?? o.discount,
      deliveryFee: o.mode === 'DELIVERY' ? dto.deliveryFee ?? o.deliveryFee : 0,
      packagingFee: dto.packagingFee ?? o.packagingFee,
      tip: dto.tip ?? o.tip,
    };
    const items = await this.prisma.restaurantOrderItem.findMany({ where: { orderId: id, isReturned: false }, select: { total: true } });
    const subtotal = items.reduce((s, r) => s + r.total, 0);
    this.checkDiscount(charges, subtotal);
    const total = this.totals(charges, subtotal).total;
    if (total < o.paidAmount - 0.01) throw new BadRequestException(`Rs ${o.paidAmount} pehle mil chuke — bill is se kam nahi ho sakta`);
    await this.prisma.restaurantOrder.update({
      where: { id },
      data: {
        ...charges,
        ...this.totals(charges, subtotal),
        ...(dto.numberOfGuests !== undefined && { numberOfGuests: dto.numberOfGuests }),
        ...(dto.waiterId !== undefined && { waiterId: dto.waiterId || null }),
        ...(dto.customerId !== undefined && { customerId: dto.customerId || null }),
        ...(dto.customerName !== undefined && { customerName: dto.customerName.trim() || null }),
        ...(dto.customerPhone !== undefined && { customerPhone: dto.customerPhone.trim() || null }),
        ...(dto.specialRequests !== undefined && { specialRequests: dto.specialRequests.trim() || null }),
        ...(o.mode === 'DELIVERY' && dto.deliveryAddress !== undefined && { deliveryAddress: dto.deliveryAddress.trim() || null }),
        ...(o.mode === 'DELIVERY' && dto.deliveryNotes !== undefined && { deliveryNotes: dto.deliveryNotes.trim() || null }),
      },
    });
    return this.getOne(user, id);
  }

  /** Pre-bill printed: the table waits for payment. */
  async printBill(user: AuthenticatedUser, id: string) {
    const o = await this.openOrder(user, id);
    const live = await this.prisma.restaurantOrderItem.count({ where: { orderId: id, isReturned: false } });
    if (!live) throw new BadRequestException('Order me koi item nahi');
    if (o.status !== 'ON_HOLD') await this.prisma.restaurantOrder.update({ where: { id }, data: { status: 'ON_HOLD' } });
    return this.getOne(user, id);
  }

  /** Guests move to another table; the old one waits for cleaning. */
  async moveTable(user: AuthenticatedUser, id: string, tableId: string) {
    const o = await this.openOrder(user, id);
    if (o.mode !== 'DINE_IN') throw new BadRequestException('Sirf dine-in order ki table badalti hai');
    if (o.tableId === tableId) return this.getOne(user, id);
    await this.checkTable(user.tenantId, tableId, o.shopId, id);
    const old = o.tableId ? await this.prisma.restaurantTableV2.findUnique({ where: { id: o.tableId }, select: { occupiedAt: true } }) : null;
    await this.prisma.restaurantOrder.update({ where: { id }, data: { tableId } });
    await this.seat(tableId, id, old?.occupiedAt);
    if (o.tableId) await this.freeTable(o.tableId, id);
    return this.getOne(user, id);
  }

  /**
   * Two tables become one bill: the other order's dishes, kitchen tickets
   * and payments move here; it is closed as merged and its table is freed.
   */
  async merge(user: AuthenticatedUser, id: string, fromOrderId: string) {
    if (id === fromOrderId) throw new BadRequestException('Order apne aap me nahi milta');
    const target = await this.openOrder(user, id);
    const source = await this.openOrder(user, fromOrderId);
    if ((target.shopId ?? null) !== (source.shopId ?? null)) throw new BadRequestException('Doosri branch ka order nahi milta');
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.restaurantOrderItem.updateMany({ where: { orderId: fromOrderId }, data: { orderId: id } });
      await tx.kot.updateMany({ where: { orderId: fromOrderId }, data: { orderId: id } });
      await tx.restaurantOrderPayment.updateMany({ where: { orderId: fromOrderId }, data: { orderId: id } });
      await tx.restaurantOrder.update({
        where: { id },
        data: {
          paidAmount: round2(target.paidAmount + source.paidAmount),
          numberOfGuests: (target.numberOfGuests ?? 0) + (source.numberOfGuests ?? 0) || null,
          tip: round2(target.tip + source.tip),
          packagingFee: round2(target.packagingFee + source.packagingFee),
          discount: round2(target.discount + source.discount),
          ...(target.status === 'ON_HOLD' && { status: 'PLACED' }),
        },
      });
      await tx.restaurantOrder.update({
        where: { id: fromOrderId },
        data: { status: 'CANCELLED', cancelledAt: now, cancellationReason: `Order ${target.orderNumber} me mila diya`, paidAmount: 0, subtotal: 0, serviceCharge: 0, taxAmount: 0, total: 0, tip: 0, discount: 0, packagingFee: 0 },
      });
    });
    await this.recalc(id);
    if (source.tableId && source.tableId !== target.tableId) await this.freeTable(source.tableId, fromOrderId);
    await this.prisma.activityLog.create({
      data: { tenantId: user.tenantId, userId: user.id, action: 'RESTAURANT_ORDER_MERGED', entityType: 'RestaurantOrder', entityId: id, description: `${source.orderNumber} → ${target.orderNumber}` },
    });
    return this.getOne(user, id);
  }

  /**
   * Some guests pay for what they ate: the chosen lines (or part of a line)
   * move to a new bill on the same table. Service and tax rates go along;
   * fixed charges and the discount stay on the first bill.
   */
  async splitItems(user: AuthenticatedUser, id: string, dto: SplitItemsDto) {
    const o = await this.openOrder(user, id);
    if (o.paidAmount > 0) throw new BadRequestException('Is order par payment li ja chuki — pehle bill band karein');
    const items = await this.prisma.restaurantOrderItem.findMany({ where: { orderId: id, isReturned: false }, include: { modifiers: true } });
    const byId = new Map(items.map((it) => [it.id, it]));
    const picks = dto.lines.map((l) => {
      const it = byId.get(l.itemId);
      if (!it) throw new NotFoundException('Item nahi mila');
      return { it, qty: round2(Math.min(l.quantity ?? it.quantity, it.quantity)) };
    }).filter((p) => p.qty > 0);
    const movingAll = items.every((it) => picks.some((p) => p.it.id === it.id && p.qty >= it.quantity - 0.0001));
    if (!picks.length || movingAll) throw new BadRequestException('Kuch items pehle bill par rehne chahiye');

    const childId = await this.withNumber(user.tenantId, (orderNumber) => this.prisma.restaurantOrder.create({
      data: {
        tenantId: user.tenantId, shopId: o.shopId, tableId: o.tableId, waiterId: o.waiterId, customerId: o.customerId,
        orderNumber, mode: o.mode, status: o.status === 'ON_HOLD' ? 'SERVED' : o.status, parentOrderId: id, isSplitBill: true,
        customerName: o.customerName, customerPhone: o.customerPhone, numberOfGuests: null,
        serviceChargePct: o.serviceChargePct, taxPct: o.taxPct, placedAt: o.placedAt ?? new Date(),
      },
      select: { id: true },
    }));
    await this.prisma.$transaction(async (tx) => {
      for (const { it, qty } of picks) {
        if (qty >= it.quantity - 0.0001) {
          await tx.restaurantOrderItem.update({ where: { id: it.id }, data: { orderId: childId } });
          continue;
        }
        const share = qty / it.quantity;
        const disc = round2(it.itemDiscount * share);
        const tot = round2((it.basePrice + it.modifierTotal) * qty - disc);
        await tx.restaurantOrderItem.update({ where: { id: it.id }, data: { quantity: round2(it.quantity - qty), itemDiscount: round2(it.itemDiscount - disc), total: round2(it.total - tot) } });
        // The copy keeps the kitchen stamps so it is neither sent nor cooked again.
        const { id: _id, createdAt: _c, updatedAt: _u, modifiers, orderId: _o, ...rest } = it;
        await tx.restaurantOrderItem.create({
          data: {
            ...rest, orderId: childId, quantity: qty, itemDiscount: disc, total: tot,
            modifiers: modifiers.length ? { create: modifiers.map((m) => ({ modifierOptionId: m.modifierOptionId, quantity: m.quantity, priceAdjustment: m.priceAdjustment, notes: m.notes })) } : undefined,
          },
        });
      }
    });
    await this.recalc(id);
    await this.recalc(childId);
    return { parent: await this.getOne(user, id), child: await this.getOne(user, childId) };
  }

  async summary(user: AuthenticatedUser, params: { from?: string; to?: string; shopId?: string }) {
    const where: Prisma.RestaurantOrderWhereInput = {
      tenantId: user.tenantId, status: 'COMPLETED',
      ...(params.shopId && { OR: [{ shopId: params.shopId }, { shopId: null }] }),
    };
    if (params.from || params.to) {
      where.createdAt = {
        ...(params.from && { gte: new Date(params.from) }),
        ...(params.to && { lte: new Date(params.to) }),
      };
    }

    const [totals, byMode, byStatus] = await Promise.all([
      this.prisma.restaurantOrder.aggregate({ where, _sum: { total: true, subtotal: true, tip: true, discount: true }, _count: { _all: true } }),
      this.prisma.restaurantOrder.groupBy({ by: ['mode'], where, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.restaurantOrder.groupBy({ by: ['status'], where: { tenantId: user.tenantId, ...(params.shopId && { OR: [{ shopId: params.shopId }, { shopId: null }] }) }, _count: { _all: true } }),
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

