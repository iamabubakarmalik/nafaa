/**
 * Keeps the customer's MarketplaceOrder in step with the shop's ChannelOrder.
 *
 * The ChannelOrder (Online Orders) is the single source of truth: the shop
 * accepts, prepares, sends and cancels it from the POS. This service listens
 * to the in-process order events and copies each change to the Market order,
 * its status history and a customer notification. Cancelling a bill emits no
 * event, so a short sweep also picks up changes the events missed.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MarketplaceOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron } from '../../core/system-control/cron.decorator';
import { ChannelStatus, OrderAccepted, OrderStatusEvent, channelStatusEvents, orderEvents } from '../../integrations/online-orders/order-events';
import { courierLink, courierName } from '../../integrations/online-orders/couriers';
import { MarketplaceNotificationsService } from '../notifications/notifications.service';
import { MarketIntakeService } from './market-intake.service';

/** Intake retries before a Market order that never reached the shop is cancelled. */
const MAX_INTAKE_ATTEMPTS = 3;
const INTAKE_GIVE_UP_MS = 10 * 60_000;
const UNDELIVERED_REASON = 'Dukaan tak order nahi pohancha, dobara try karein';

const STATUS_MAP: Record<string, MarketplaceOrderStatus> = {
  PENDING: 'PENDING',
  ACCEPTING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY: 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'CANCELLED',
  RETURNED: 'RETURNED',
};

const OPEN_STATUSES: MarketplaceOrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'];
const ENDED: MarketplaceOrderStatus[] = ['DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'];

/** Customer-facing status label in simple Roman Urdu. */
export const MARKET_STATUS_LABEL: Record<MarketplaceOrderStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Order mil gaya, confirm ho raha hai',
  CONFIRMED: 'Confirm ho gaya',
  PREPARING: 'Tayyar ho raha hai',
  READY_FOR_PICKUP: 'Tayyar hai',
  OUT_FOR_DELIVERY: 'Raste me hai',
  DELIVERED: 'Deliver ho gaya',
  CANCELLED: 'Cancel ho gaya',
  REFUNDED: 'Paise wapas',
  DISPUTED: 'Masla report hua',
  RETURNED: 'Wapas ho gaya',
};

function notice(status: MarketplaceOrderStatus, no: string, shop: string, pickup: boolean): { title: string; body: string } | null {
  switch (status) {
    case 'CONFIRMED': return { title: 'Order confirm ho gaya', body: `${shop} ne aapka order #${no} confirm kar diya.` };
    case 'PREPARING': return { title: 'Order tayyar ho raha hai', body: `${shop} aapka order #${no} tayyar kar rahi hai.` };
    case 'READY_FOR_PICKUP': return pickup
      ? { title: 'Order tayyar hai', body: `Order #${no} tayyar hai. ${shop} se le lein.` }
      : { title: 'Order pack ho gaya', body: `Order #${no} pack ho gaya, jald bhej diya jayega.` };
    case 'OUT_FOR_DELIVERY': return { title: 'Order raste me hai', body: `Order #${no} aap ki taraf aa raha hai.` };
    case 'DELIVERED': return { title: 'Order deliver ho gaya', body: `Order #${no} deliver ho gaya. Shukriya! Apna review zaroor dein.` };
    case 'CANCELLED': return { title: 'Order cancel ho gaya', body: `Order #${no} cancel ho gaya. Wallet ya points use kiye the to wapas aa gaye hain.` };
    case 'RETURNED': return { title: 'Order wapas ho gaya', body: `Order #${no} dukaan ko wapas chala gaya.` };
    default: return null;
  }
}

@Injectable()
export class MarketStatusSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketStatusSyncService.name);
  private readonly onAccepted = (e: OrderAccepted) => void this.syncSafe(e.orderId);
  private readonly onStatus = (e: OrderStatusEvent) => { if (e.status !== 'SETTLED') void this.syncSafe(e.orderId); };
  private readonly onChannel = (e: ChannelStatus) => void this.syncSafe(e.orderId);

  /** Failed intake attempts per Market order (this process only; the age limit covers restarts). */
  private readonly intakeAttempts = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: MarketplaceNotificationsService,
    private readonly intake: MarketIntakeService,
  ) {}

  onModuleInit() {
    orderEvents.on('accepted', this.onAccepted);
    orderEvents.on('status', this.onStatus);
    channelStatusEvents.on('status', this.onChannel);
  }

  onModuleDestroy() {
    orderEvents.off('accepted', this.onAccepted);
    orderEvents.off('status', this.onStatus);
    channelStatusEvents.off('status', this.onChannel);
  }

  private async syncSafe(channelOrderId: string) {
    try {
      await this.syncFromChannel(channelOrderId);
    } catch (e: any) {
      this.logger.warn(`Market sync failed for ${channelOrderId}: ${e?.message ?? e}`);
    }
  }

  /** Catches changes without an event (cancel, return) on open Market orders. */
  @Cron('0 */2 * * * *')
  async sweep() {
    await this.retryIntake();
    const open = await this.prisma.marketplaceOrder.findMany({
      where: { channelOrderId: { not: null }, status: { in: OPEN_STATUSES }, createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
      select: { status: true, channelOrderId: true },
      take: 500,
      orderBy: { updatedAt: 'asc' },
    });
    if (!open.length) return;
    const channel = await this.prisma.channelOrder.findMany({
      where: { id: { in: open.map((o) => o.channelOrderId!) } },
      select: { id: true, orderStatus: true },
    });
    const want = new Map(channel.map((c) => [c.id, STATUS_MAP[c.orderStatus]]));
    for (const o of open) {
      const target = want.get(o.channelOrderId!);
      if (target && target !== o.status) await this.syncSafe(o.channelOrderId!);
    }
  }

  /**
   * Market orders whose ChannelOrder was never created (intake failed at
   * checkout): try again; after a few failures or ten minutes, cancel the
   * order, refund wallet/points and tell the customer.
   */
  private async retryIntake() {
    const now = Date.now();
    const orphans = await this.prisma.marketplaceOrder.findMany({
      where: { channelOrderId: null, status: 'PENDING', createdAt: { lte: new Date(now - 60_000), gte: new Date(now - 7 * 86_400_000) } },
      select: { id: true, orderNumber: true, createdAt: true },
      take: 50,
      orderBy: { createdAt: 'asc' },
    });
    for (const o of orphans) {
      try {
        await this.intake.push(o.id);
        this.intakeAttempts.delete(o.id);
      } catch (e: any) {
        const tries = (this.intakeAttempts.get(o.id) ?? 0) + 1;
        this.intakeAttempts.set(o.id, tries);
        this.logger.warn(`Market order ${o.orderNumber}: intake retry ${tries} failed: ${e?.message ?? e}`);
        if (tries >= MAX_INTAKE_ATTEMPTS || now - o.createdAt.getTime() > INTAKE_GIVE_UP_MS) {
          await this.cancelUndelivered(o.id).catch((err: any) => this.logger.error(`Market order ${o.orderNumber}: cancel failed: ${err?.message ?? err}`));
          this.intakeAttempts.delete(o.id);
        }
      }
    }
  }

  /** Cancels a Market order that never reached the shop. */
  private async cancelUndelivered(orderId: string) {
    const order = await this.prisma.marketplaceOrder.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, customerId: true, status: true, paymentStatus: true, walletUsed: true, loyaltyPointsUsed: true, channelOrderId: true },
    });
    if (!order || order.status !== 'PENDING' || order.channelOrderId) return;
    const done = await this.prisma.$transaction(async (tx) => {
      const res = await tx.marketplaceOrder.updateMany({
        where: { id: order.id, status: 'PENDING', channelOrderId: null },
        data: {
          status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: 'SYSTEM', cancelReason: UNDELIVERED_REASON,
          paymentStatus: order.paymentStatus === 'PAID' ? 'REFUNDED' : 'FAILED',
        },
      });
      if (!res.count) return false;
      await tx.orderStatusHistory.create({ data: { orderId: order.id, status: 'CANCELLED', note: UNDELIVERED_REASON, changedBy: 'SYSTEM' } });
      await this.refundCustomer(tx, order);
      return true;
    });
    if (!done) return;
    await this.notifications.create({
      customerId: order.customerId,
      type: 'ORDER',
      title: 'Order cancel ho gaya',
      body: `Order #${order.orderNumber}: ${UNDELIVERED_REASON}. Wallet ya points use kiye the to wapas aa gaye hain.`,
      actionUrl: `/orders/${order.id}`,
      data: { orderId: order.id, status: 'CANCELLED' },
    }).catch(() => null);
  }

  /** Copies the ChannelOrder's status, rider and tracking to its Market order. */
  async syncFromChannel(channelOrderId: string, opts: { by?: string; note?: string } = {}) {
    const co = await this.prisma.channelOrder.findUnique({
      where: { id: channelOrderId },
      select: {
        id: true, orderStatus: true, paymentStatus: true, cancelReason: true, deliveredAt: true,
        courierCode: true, courierName: true, trackingNumber: true, assignedToId: true,
        integration: { select: { type: true } },
      },
    });
    if (!co || co.integration.type !== 'NAFAA_MARKET') return null;
    const order = await this.prisma.marketplaceOrder.findUnique({
      where: { channelOrderId },
      select: {
        id: true, orderNumber: true, customerId: true, status: true, deliveryType: true, paymentMethod: true, paymentStatus: true,
        walletUsed: true, loyaltyPointsUsed: true, riderName: true, riderPhone: true,
        shop: { select: { name: true, marketplaceProfile: { select: { publicName: true } } } },
      },
    });
    if (!order) return null;

    const rider = co.assignedToId
      ? await this.prisma.user.findUnique({ where: { id: co.assignedToId }, select: { fullName: true, phone: true } })
      : null;
    const riderName = rider?.fullName ?? (co.courierCode ? courierName(co.courierCode) : co.courierName) ?? null;
    const riderPhone = rider?.phone ?? null;
    const target = STATUS_MAP[co.orderStatus];

    // Rider / courier details may change without a status change.
    if (!target || target === order.status || ENDED.includes(order.status)) {
      if (riderName !== order.riderName || riderPhone !== order.riderPhone) {
        await this.prisma.marketplaceOrder.update({ where: { id: order.id }, data: { riderName, riderPhone } });
      }
      return order.status;
    }

    const now = new Date();
    const cancelling = target === 'CANCELLED';
    const data: Prisma.MarketplaceOrderUpdateInput = { status: target, riderName, riderPhone };
    if (target === 'DELIVERED') {
      data.actualDeliveryAt = co.deliveredAt ?? now;
      if (co.paymentStatus === 'PAID' || co.paymentStatus === 'COLLECTED') {
        data.paymentStatus = 'PAID';
        data.paidAt = now;
      }
    }
    if (cancelling) {
      data.cancelledAt = now;
      data.cancelledBy = opts.by ?? 'SHOP';
      data.cancelReason = co.cancelReason ?? opts.note ?? null;
      data.paymentStatus = order.paymentStatus === 'PAID' ? 'REFUNDED' : 'FAILED';
    }

    const changed = await this.prisma.$transaction(async (tx) => {
      // Guarded on the old status so two events never apply (or refund) twice.
      const res = await tx.marketplaceOrder.updateMany({ where: { id: order.id, status: order.status }, data: data as Prisma.MarketplaceOrderUpdateManyMutationInput });
      if (!res.count) return false;
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: target, note: opts.note ?? (cancelling ? co.cancelReason : null) ?? MARKET_STATUS_LABEL[target], changedBy: opts.by ?? 'SHOP' },
      });
      if (cancelling) await this.refundCustomer(tx, order);
      return true;
    });
    if (!changed) return order.status;

    const shopName = order.shop.marketplaceProfile?.publicName ?? order.shop.name;
    const msg = notice(target, order.orderNumber, shopName, order.deliveryType === 'PICKUP' || order.deliveryType === 'SELF_PICKUP');
    if (msg && opts.by !== 'CUSTOMER') {
      await this.notifications.create({
        customerId: order.customerId,
        type: 'ORDER',
        title: msg.title,
        body: msg.body,
        actionUrl: `/orders/${order.id}`,
        data: { orderId: order.id, status: target, ...(co.trackingNumber && { trackingNumber: co.trackingNumber, trackUrl: courierLink(co.courierCode, co.trackingNumber) }) },
      }).catch(() => null);
    }
    return target;
  }

  /** Gives back the wallet money and loyalty points a cancelled order used. */
  private async refundCustomer(
    tx: Prisma.TransactionClient,
    order: { id: string; orderNumber: string; customerId: string; walletUsed: Prisma.Decimal; loyaltyPointsUsed: number },
  ) {
    const wallet = Number(order.walletUsed) || 0;
    if (wallet > 0) {
      const c = await tx.marketplaceCustomer.update({
        where: { id: order.customerId },
        data: { walletBalance: { increment: wallet } },
        select: { walletBalance: true },
      });
      await tx.customerWalletTxn.create({
        data: {
          customerId: order.customerId, type: 'REFUND', amount: wallet, balanceAfter: c.walletBalance,
          reason: `Cancel order ${order.orderNumber} ka refund`, referenceType: 'ORDER', referenceId: order.id,
        },
      });
    }
    if (order.loyaltyPointsUsed > 0) {
      await tx.marketplaceCustomer.update({ where: { id: order.customerId }, data: { loyaltyPoints: { increment: order.loyaltyPointsUsed } } });
    }
  }
}
