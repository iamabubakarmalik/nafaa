import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, RiderDeliveryStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { OrdersService } from '../orders/orders.service';
import { round2 } from '../recipes/recipe-units';
import { AssignRiderDto, DeliveryStatusDto, SettleRiderCashDto } from './dto/delivery.dto';

/** Trips still under way. */
const ON_TRIP: RiderDeliveryStatus[] = ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'ARRIVED'];
const DONE: RiderDeliveryStatus[] = ['DELIVERED', 'FAILED', 'RETURNED'];

/** Expense category for rider fees: the shop's own delivery or rider category, else Transport (a starter category). */
const RIDER_CATEGORY = { name: 'Transport', icon: '🚗', color: '#06b6d4' };

/** Each trip step may only move forward. */
const STEP: Record<RiderDeliveryStatus, number> = {
  PENDING: 0, ASSIGNED: 1, PICKED_UP: 2, ON_THE_WAY: 3, ARRIVED: 4, DELIVERED: 5, FAILED: 5, RETURNED: 5,
};

const boardOrder = {
  id: true, orderNumber: true, status: true, total: true, paidAmount: true, saleId: true, createdAt: true, readyAt: true,
  customerName: true, customerPhone: true, deliveryAddress: true, deliveryNotes: true, deliveryFee: true, riderId: true,
  delivery: { include: { rider: { select: { id: true, name: true, phone: true, vehicleNumber: true } } } },
  items: { where: { isReturned: false }, select: { quantity: true, status: true, product: { select: { name: true } } } },
} satisfies Prisma.RestaurantOrderSelect;

@Injectable()
export class DeliveryService {
  private readonly log = new Logger(DeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly expenses: ExpensesService,
  ) {}

  private shopWhere(shopId?: string): Prisma.RestaurantOrderWhereInput {
    return shopId ? { OR: [{ shopId }, { shopId: null }] } : {};
  }

  /** A rider with no trip left goes back to free. */
  private async freeRider(riderId: string | null | undefined) {
    if (!riderId) return;
    const busy = await this.prisma.deliveryTracking.count({ where: { riderId, status: { in: ON_TRIP } } });
    if (!busy) await this.prisma.rider.updateMany({ where: { id: riderId, status: 'BUSY' }, data: { status: 'ACTIVE' } });
  }

  async assign(user: AuthenticatedUser, orderId: string, dto: AssignRiderDto) {
    const order = await this.prisma.restaurantOrder.findFirst({ where: { id: orderId, tenantId: user.tenantId } });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (order.mode !== 'DELIVERY') throw new BadRequestException('Rider sirf delivery order par lagta hai');
    if (order.status === 'CANCELLED') throw new BadRequestException('Cancel hue order par rider nahi lagta');

    const rider = await this.prisma.rider.findFirst({ where: { id: dto.riderId, tenantId: user.tenantId, isActive: true } });
    if (!rider) throw new NotFoundException('Rider nahi mila');
    if (rider.status === 'OFFLINE' || rider.status === 'INACTIVE') throw new BadRequestException(`${rider.name} abhi duty par nahi`);

    const existing = await this.prisma.deliveryTracking.findUnique({ where: { orderId } });
    if (existing && (existing.status === 'DELIVERED')) throw new BadRequestException('Ye order deliver ho chuka hai');
    if (existing && STEP[existing.status] >= STEP.PICKED_UP && !DONE.includes(existing.status) && existing.riderId !== dto.riderId) {
      throw new BadRequestException('Rider khana utha chuka hai — pehle wapas aane dein');
    }

    const data = {
      riderId: dto.riderId,
      status: 'ASSIGNED' as const,
      assignedAt: new Date(),
      failureReason: null,
      dropoffLat: order.deliveryLat ?? null,
      dropoffLng: order.deliveryLng ?? null,
      distanceKm: dto.distanceKm,
      estimatedMinutes: dto.estimatedMinutes,
      deliveryFee: dto.deliveryFee ?? order.deliveryFee,
      riderCommission: dto.riderCommission ?? existing?.riderCommission ?? 0,
    };
    const tracking = existing
      ? await this.prisma.deliveryTracking.update({ where: { orderId }, data })
      : await this.prisma.deliveryTracking.create({ data: { orderId, ...data } });

    await this.prisma.rider.update({ where: { id: dto.riderId }, data: { status: 'BUSY' } });
    await this.prisma.restaurantOrder.update({ where: { id: orderId }, data: { riderId: dto.riderId, deliveryStatus: 'ASSIGNED' } });
    if (existing?.riderId && existing.riderId !== dto.riderId) await this.freeRider(existing.riderId);
    return tracking;
  }

  async updateStatus(user: AuthenticatedUser, orderId: string, dto: DeliveryStatusDto) {
    const t = await this.prisma.deliveryTracking.findFirst({ where: { orderId, order: { tenantId: user.tenantId } } });
    if (!t) throw new NotFoundException('Delivery nahi mili — pehle rider lagayein');
    const status = dto.status;
    if (status === t.status) return t;
    if (DONE.includes(t.status)) throw new BadRequestException('Ye delivery band ho chuki hai');
    if (STEP[status] < STEP[t.status]) throw new BadRequestException('Delivery ka qadam peeche nahi ja sakta');
    if (status === 'FAILED' && !dto.failureReason?.trim()) throw new BadRequestException('Delivery na hone ki wajah likhein');

    const now = new Date();
    const patch: Prisma.DeliveryTrackingUpdateInput = { status };
    if (status === 'PICKED_UP') patch.pickedUpAt = now;
    if (status === 'ON_THE_WAY') patch.onTheWayAt = now;
    if (status === 'ARRIVED') patch.arrivedAt = now;
    if (status === 'DELIVERED') {
      patch.deliveredAt = now;
      if (t.assignedAt) patch.actualMinutes = Math.round((now.getTime() - t.assignedAt.getTime()) / 60000);
      if (dto.customerRating !== undefined) patch.customerRating = dto.customerRating;
      if (dto.feedback) patch.customerFeedback = dto.feedback;
      if (dto.proofPhotoUrl) patch.proofPhotoUrl = dto.proofPhotoUrl;
    }
    if (status === 'FAILED' || status === 'RETURNED') patch.failureReason = dto.failureReason?.trim() || null;

    const updated = await this.prisma.deliveryTracking.update({ where: { orderId }, data: patch });
    if (status === 'DELIVERED' && t.riderId) {
      await this.prisma.rider.update({ where: { id: t.riderId }, data: { totalDeliveries: { increment: 1 }, ...(t.distanceKm && { totalDistance: { increment: t.distanceKm } }) } });
    }
    if (DONE.includes(status)) await this.freeRider(t.riderId);

    // The order follows the trip; a bill already paid stays COMPLETED.
    const orderStatus: Partial<Record<RiderDeliveryStatus, 'OUT_FOR_DELIVERY' | 'DELIVERED'>> = {
      PICKED_UP: 'OUT_FOR_DELIVERY', ON_THE_WAY: 'OUT_FOR_DELIVERY', ARRIVED: 'OUT_FOR_DELIVERY', DELIVERED: 'DELIVERED',
    };
    const order = await this.prisma.restaurantOrder.findUnique({ where: { id: orderId }, select: { status: true } });
    const next = orderStatus[status];
    const open = !!order && !['COMPLETED', 'CANCELLED'].includes(order.status);
    // A trip that did not happen brings the food back: the order waits for a
    // new rider and no cash is owed by this one.
    const back = (status === 'FAILED' || status === 'RETURNED') && open;
    await this.prisma.restaurantOrder.update({
      where: { id: orderId },
      data: {
        deliveryStatus: status,
        ...(next && open && { status: next }),
        ...(back && { status: 'READY', riderId: null }),
        ...(status === 'DELIVERED' && { deliveredAt: now }),
        ...((status === 'PICKED_UP' || status === 'ON_THE_WAY') && { outForDeliveryAt: now }),
      },
    });
    return updated;
  }

  async listActive(user: AuthenticatedUser, shopId?: string) {
    return this.prisma.deliveryTracking.findMany({
      where: { status: { notIn: DONE }, order: { tenantId: user.tenantId, ...this.shopWhere(shopId) } },
      include: { order: { include: { table: true } }, rider: true },
      orderBy: { assignedAt: 'desc' },
    });
  }

  /**
   * Delivery orders of the branch by stage: in the kitchen without a rider,
   * on the way, and delivered with the cash still with the rider. Paid and
   * delivered orders of the last 12 hours close the board.
   */
  async board(user: AuthenticatedUser, shopId?: string) {
    const since = new Date(Date.now() - 12 * 3600_000);
    const rows = await this.prisma.restaurantOrder.findMany({
      where: {
        tenantId: user.tenantId, ...this.shopWhere(shopId), mode: 'DELIVERY',
        OR: [
          { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          { status: 'COMPLETED', createdAt: { gte: since }, OR: [{ deliveryStatus: null }, { deliveryStatus: { notIn: DONE } }] },
          { deliveredAt: { gte: since } },
        ],
      },
      select: boardOrder,
      orderBy: { createdAt: 'asc' },
      take: 300,
    });
    const tokens = await this.orders.tokens(user.tenantId, rows);
    const stage = (o: (typeof rows)[number]) => {
      const d = o.delivery?.status;
      if (d === 'DELIVERED' || o.status === 'DELIVERED') return o.saleId ? 'done' : 'cash';
      if (d && ON_TRIP.includes(d) && d !== 'ASSIGNED') return 'onTheWay';
      if (d === 'ASSIGNED') return 'assigned';
      return 'needsRider';
    };
    return tokens.map((o) => ({ ...o, stage: stage(o), due: round2(o.total - o.paidAmount) }));
  }

  async riderCash(user: AuthenticatedUser, shopId?: string) {
    const due = await this.prisma.restaurantOrder.findMany({
      where: { tenantId: user.tenantId, ...this.shopWhere(shopId), mode: 'DELIVERY', saleId: null, riderId: { not: null }, status: { in: ['OUT_FOR_DELIVERY', 'DELIVERED'] } },
      select: {
        id: true, orderNumber: true, total: true, paidAmount: true, riderId: true, status: true, deliveredAt: true, customerName: true,
        delivery: { select: { riderCommission: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const riders = await this.prisma.rider.findMany({ where: { tenantId: user.tenantId, id: { in: [...new Set(due.map((d) => d.riderId!))] } }, select: { id: true, name: true, phone: true } });
    return riders.map((r) => {
      const orders = due.filter((d) => d.riderId === r.id)
        .map(({ delivery, ...d }) => ({ ...d, due: round2(d.total - d.paidAmount), riderFee: round2(delivery?.riderCommission ?? 0) }));
      return {
        rider: r, orders, delivered: orders.filter((o) => o.status === 'DELIVERED').length,
        amount: round2(orders.reduce((n, o) => n + o.due, 0)), riderFee: round2(orders.reduce((n, o) => n + o.riderFee, 0)),
      };
    });
  }

  /**
   * The rider hands over the cash of delivered orders. Each order is paid in
   * cash now and becomes a bill, so the money reaches the drawer and the day
   * book at the moment it is actually in the shop.
   */
  async settle(user: AuthenticatedUser, scope: ShopScope, dto: SettleRiderCashDto) {
    if (dto.payRiderFee && !hasPermission(user.role, user.permissions, PERMISSIONS.EXPENSES_CREATE)) {
      throw new ForbiddenException('Rider ka kiraya drawer se dene ke liye "Expense likhna" (expenses.create) ki permission chahiye');
    }
    const orders = await this.prisma.restaurantOrder.findMany({
      where: { id: { in: dto.orderIds }, tenantId: user.tenantId },
      select: {
        id: true, orderNumber: true, riderId: true, mode: true, status: true, saleId: true, total: true, paidAmount: true, shopId: true,
        delivery: { select: { riderCommission: true } },
      },
    });
    if (orders.length !== dto.orderIds.length) throw new NotFoundException('Ek ya zyada order nahi mile');
    const wrong = orders.find((o) => o.mode !== 'DELIVERY' || o.riderId !== dto.riderId || o.saleId || !['OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status));
    if (wrong) throw new BadRequestException(`${wrong.orderNumber} is rider ka baqi cash wala order nahi`);

    const done: Array<{ orderId: string; orderNumber: string; amount: number; saleId: string | null }> = [];
    const failed: Array<{ orderNumber: string; error: string }> = [];
    for (const o of orders) {
      const amount = round2(o.total - o.paidAmount);
      try {
        const res = await this.orders.checkout(user, scope, o.id, { payments: amount > 0 ? [{ method: 'CASH', amount, paidBy: 'Rider' }] : [] });
        done.push({ orderId: o.id, orderNumber: o.orderNumber, amount, saleId: res.saleId });
      } catch (e) {
        failed.push({ orderNumber: o.orderNumber, error: (e as { message?: string })?.message ?? 'Bill nahi bana' });
      }
    }
    const fee = dto.payRiderFee ? await this.payRiderFee(user, scope, dto.riderId, orders.filter((o) => done.some((d) => d.orderId === o.id))) : null;
    return { settled: done, failed, amount: round2(done.reduce((n, d) => n + d.amount, 0)), ...(fee && { riderFee: fee }) };
  }

  /**
   * The rider's fee for the settled trips leaves the drawer now: one PAID cash
   * expense per branch through the shared expenses service, so the drawer
   * count and the P&L both show it. Trips are settled only once, so a fee is
   * never posted twice.
   */
  private async payRiderFee(
    user: AuthenticatedUser, scope: ShopScope, riderId: string,
    orders: Array<{ orderNumber: string; shopId: string | null; delivery: { riderCommission: number } | null }>,
  ) {
    const paid = orders.filter((o) => (o.delivery?.riderCommission ?? 0) > 0);
    const amount = round2(paid.reduce((n, o) => n + (o.delivery?.riderCommission ?? 0), 0));
    if (!(amount > 0)) return { amount: 0, expenseNumbers: [] as string[] };
    try {
      const rider = await this.prisma.rider.findFirst({ where: { id: riderId, tenantId: user.tenantId }, select: { name: true } });
      const categoryId = await this.riderCategory(user.tenantId);
      const byShop = new Map<string, typeof paid>();
      for (const o of paid) byShop.set(o.shopId ?? '', [...(byShop.get(o.shopId ?? '') ?? []), o]);
      const expenseNumbers: string[] = [];
      for (const [shopId, rows] of byShop) {
        const numbers = rows.map((o) => o.orderNumber);
        const e = await this.expenses.create(user, scope, {
          title: `Rider kiraya: ${rider?.name ?? 'Rider'} (${numbers.join(', ')})`.slice(0, 120),
          description: `Delivery ${numbers.join(', ')} — cash lete waqt drawer se diya`.slice(0, 500),
          amount: round2(rows.reduce((n, o) => n + (o.delivery?.riderCommission ?? 0), 0)),
          paymentMethod: 'CASH',
          status: 'PAID',
          categoryId,
          ...(shopId && { shopId }),
        });
        expenseNumbers.push(e.expenseNumber);
      }
      return { amount, expenseNumbers };
    } catch (e) {
      // The bills are made already; the fee can still be written by hand.
      this.log.warn(`Rider fee expense not saved: ${(e as Error).message}`);
      return { amount, expenseNumbers: [] as string[], error: 'Rider ka kiraya Expense me nahi likha gaya — Expenses me khud likhein' };
    }
  }

  private async riderCategory(tenantId: string) {
    const named = (words: string[]) => this.prisma.expenseCategory.findFirst({
      where: { tenantId, isActive: true, OR: words.map((w) => ({ name: { contains: w, mode: 'insensitive' as const } })) },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    const own = (await named(['rider', 'delivery'])) ?? (await named(['transport']));
    if (own) return own.id;
    const made = await this.prisma.expenseCategory.upsert({
      where: { tenantId_name: { tenantId, name: RIDER_CATEGORY.name } },
      update: {},
      create: { tenantId, ...RIDER_CATEGORY },
      select: { id: true },
    });
    return made.id;
  }
}
