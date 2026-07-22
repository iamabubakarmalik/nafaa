import { Injectable, Logger } from '@nestjs/common';
import { CartRecoveryStage, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../core/queue/queue.service';

@Injectable()
export class CartRecoveryService {
  private readonly logger = new Logger(CartRecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  /** Detect abandoned carts idle > 1 hour and start recovery */
  async detectAndStartRecovery() {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    const carts = await this.prisma.marketplaceCart.findMany({
      where: {
        updatedAt: { lt: cutoff, gt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
        lines: { some: {} },
      },
      include: { lines: true },
      take: 500,
    });

    let started = 0;
    for (const cart of carts) {
      const existing = await this.prisma.cartRecoveryCampaign.findFirst({
        where: { customerId: cart.customerId, stage: { not: 'RECOVERED' } },
      });
      if (existing) continue;

      const cartValue = cart.lines.reduce(
        (s, l) => s + Number(l.unitPrice) * l.quantity,
        0,
      );
      if (cartValue < 100) continue;

      await this.prisma.cartRecoveryCampaign.create({
        data: {
          customerId: cart.customerId,
          cartValue,
          itemCount: cart.lines.length,
          stage: 'DETECTED',
          cartSnapshot: cart.lines as unknown as Prisma.InputJsonValue,
        },
      });
      await this.sendFirstReminder(cart.customerId);
      started++;
    }
    this.logger.log(`🛒 Started recovery for ${started} abandoned carts`);
    return { started };
  }

  async sendFirstReminder(customerId: string) {
    const c = await this.prisma.cartRecoveryCampaign.findFirst({
      where: { customerId, stage: 'DETECTED' },
    });
    if (!c) return;
    await this.queue.createNotification({
      customerId,
      type: 'CART_REMINDER_1',
      title: '🛒 Aap ka cart intezar kar raha hai!',
      body: `${c.itemCount} items — total PKR ${Number(c.cartValue).toFixed(0)}. Ab checkout karain!`,
      actionUrl: '/market/cart',
      channels: ['PUSH', 'IN_APP'],
    });
    await this.prisma.cartRecoveryCampaign.update({
      where: { id: c.id },
      data: {
        stage: 'FIRST_REMINDER',
        firstReminderAt: new Date(),
        lastReminderChannel: 'PUSH',
      },
    });
    return { sent: true };
  }

  async sendSecondReminder(customerId: string) {
    const c = await this.prisma.cartRecoveryCampaign.findFirst({
      where: { customerId, stage: 'FIRST_REMINDER' },
    });
    if (!c) return;
    const customer = await this.prisma.marketplaceCustomer.findUnique({
      where: { id: customerId },
      select: { phone: true, marketingSms: true },
    });
    if (customer?.marketingSms && customer.phone) {
      await this.queue.sendSms({
        toPhone: customer.phone,
        message: `Nafaa Bazaar: ${c.itemCount} items cart mein wait kar rahe hain. PKR ${Number(c.cartValue).toFixed(0)} ka order — checkout karain!`,
      });
    }
    await this.prisma.cartRecoveryCampaign.update({
      where: { id: c.id },
      data: {
        stage: 'SECOND_REMINDER',
        secondReminderAt: new Date(),
        lastReminderChannel: 'SMS',
      },
    });
    return { sent: true };
  }

  /** Final push: offer coupon */
  async offerCoupon(customerId: string) {
    const c = await this.prisma.cartRecoveryCampaign.findFirst({
      where: { customerId, stage: 'SECOND_REMINDER' },
    });
    if (!c) return;

    // Create one-off coupon
    const couponCode = `WIN${customerId.slice(0, 6).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const discountPct = 10;

    await this.prisma.promotion.create({
      data: {
        type: 'COUPON',
        status: 'ACTIVE',
        scope: 'FIRST_ORDER',
        title: `Cart Recovery — ${discountPct}% Off`,
        slug: `cart-recovery-${couponCode.toLowerCase()}`,
        discountType: 'PERCENT',
        discountValue: discountPct,
        maxDiscount: 500,
        couponCode,
        usageLimit: 1,
        perCustomerLimit: 1,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    await this.queue.createNotification({
      customerId,
      type: 'CART_COUPON',
      title: `🎁 ${discountPct}% special discount aap ke liye!`,
      body: `Coupon: ${couponCode} — 48 hours ke andar use karain. Save up to PKR 500!`,
      actionUrl: '/market/cart',
      data: { couponCode, discountPct },
      channels: ['PUSH', 'SMS', 'IN_APP'],
    });

    await this.prisma.cartRecoveryCampaign.update({
      where: { id: c.id },
      data: {
        stage: 'COUPON_OFFERED',
        couponOfferedAt: new Date(),
        couponCode,
        couponDiscountPct: discountPct,
      },
    });
    return { couponCode, discountPct };
  }

  async markRecovered(customerId: string, orderId: string) {
    return this.prisma.cartRecoveryCampaign.updateMany({
      where: { customerId, stage: { in: ['DETECTED', 'FIRST_REMINDER', 'SECOND_REMINDER', 'COUPON_OFFERED'] } },
      data: {
        stage: 'RECOVERED',
        recoveredAt: new Date(),
        recoveredOrderId: orderId,
      },
    });
  }

  async listCampaigns(opts: { stage?: CartRecoveryStage; limit?: number }) {
    return this.prisma.cartRecoveryCampaign.findMany({
      where: opts.stage ? { stage: opts.stage } : {},
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 50,
    });
  }

  async getStats() {
    const [total, recovered, byStage] = await Promise.all([
      this.prisma.cartRecoveryCampaign.count(),
      this.prisma.cartRecoveryCampaign.count({ where: { stage: 'RECOVERED' } }),
      this.prisma.cartRecoveryCampaign.groupBy({
        by: ['stage'],
        _count: { stage: true },
      }),
    ]);
    const recoveryRate = total > 0 ? (recovered / total) * 100 : 0;
    return { total, recovered, recoveryRate: recoveryRate.toFixed(2), byStage };
  }
}
