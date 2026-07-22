import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // Every 5 minutes — expire timed-out bargains
  // ═══════════════════════════════════════════════════════════
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireBargains() {
    const res = await this.prisma.bargain.updateMany({
      where: {
        status: { in: ['PENDING', 'COUNTER_OFFERED'] },
        expiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
    if (res.count > 0) this.logger.log(`⏰ Expired ${res.count} bargains`);
  }

  // ═══════════════════════════════════════════════════════════
  // Every minute — close auctions past endsAt
  // ═══════════════════════════════════════════════════════════
  @Cron(CronExpression.EVERY_MINUTE)
  async closeAuctions() {
    const ending = await this.prisma.auction.findMany({
      where: { status: 'LIVE', endsAt: { lt: new Date() } },
      select: { id: true, endsAt: true },
    });
    for (const a of ending) {
      await this.queue.scheduleAuctionEnd(a.id, a.endsAt);
    }
    if (ending.length > 0) this.logger.log(`🏁 Queued ${ending.length} auctions to close`);
  }

  // ═══════════════════════════════════════════════════════════
  // Every minute — start scheduled auctions
  // ═══════════════════════════════════════════════════════════
  @Cron(CronExpression.EVERY_MINUTE)
  async startAuctions() {
    const starting = await this.prisma.auction.findMany({
      where: { status: 'SCHEDULED', startsAt: { lt: new Date() } },
      select: { id: true, startsAt: true },
    });
    for (const a of starting) {
      await this.queue.scheduleAuctionStart(a.id, a.startsAt);
    }
    if (starting.length > 0) this.logger.log(`🎬 Queued ${starting.length} auctions to start`);
  }

  // ═══════════════════════════════════════════════════════════
  // Every 5 minutes — finalize expired group buys
  // ═══════════════════════════════════════════════════════════
  @Cron(CronExpression.EVERY_5_MINUTES)
  async finalizeGroupBuys() {
    const expiring = await this.prisma.groupBuy.findMany({
      where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
      select: { id: true, expiresAt: true },
    });
    for (const gb of expiring) {
      await this.queue.scheduleGroupBuyExpiry(gb.id, gb.expiresAt);
    }
    if (expiring.length > 0) this.logger.log(`👥 Queued ${expiring.length} group buys to finalize`);
  }

  // ═══════════════════════════════════════════════════════════
  // Every 10 minutes — abandoned cart recovery (after 1 hour of inactivity)
  // ═══════════════════════════════════════════════════════════
  @Cron(CronExpression.EVERY_10_MINUTES)
  async triggerCartRecovery() {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const abandonedCarts = await this.prisma.marketplaceCart.findMany({
      where: {
        updatedAt: { lt: cutoff, gt: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // 1-2h window
        lines: { some: {} },
      },
      select: { customerId: true },
      take: 500,
    });
    for (const c of abandonedCarts) {
      await this.queue.scheduleCartRecovery(c.customerId, 0);
    }
    if (abandonedCarts.length > 0) this.logger.log(`🛒 Triggered ${abandonedCarts.length} cart recoveries`);
  }

  // ═══════════════════════════════════════════════════════════
  // Every 15 minutes — auto-cancel unpaid orders after 30 min
  // ═══════════════════════════════════════════════════════════
  @Cron('0 */15 * * * *')
  async cancelUnpaidOrders() {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const orders = await this.prisma.marketplaceOrder.findMany({
      where: {
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: { notIn: ['COD'] },
        createdAt: { lt: cutoff },
      },
      select: { id: true },
      take: 100,
    });
    for (const o of orders) {
      await this.prisma.marketplaceOrder.update({
        where: { id: o.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: 'SYSTEM',
          cancelReason: 'Payment timeout',
          paymentStatus: 'FAILED',
        },
      });
      await this.prisma.orderStatusHistory.create({
        data: {
          orderId: o.id,
          status: 'CANCELLED',
          note: 'Auto-cancelled: payment timeout',
          changedBy: 'SYSTEM',
        },
      });
    }
    if (orders.length > 0) this.logger.log(`❌ Auto-cancelled ${orders.length} unpaid orders`);
  }

  // ═══════════════════════════════════════════════════════════
  // Daily 3 AM — cleanup expired sessions / old data
  // ═══════════════════════════════════════════════════════════
  @Cron('0 3 * * *')
  async dailyCleanup() {
    const [customerSessions, tenantSessions, oldOtps] = await Promise.all([
      this.prisma.customerSession.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      }),
      this.prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      }),
      this.prisma.customerOtpCode.deleteMany({
        where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);
    this.logger.log(
      `🧹 Daily cleanup: ${customerSessions.count} customer sessions, ${tenantSessions.count} tenant sessions, ${oldOtps.count} OTPs`,
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Daily 4 AM — recompute shop ratings (safeguard for denormalized data)
  // ═══════════════════════════════════════════════════════════
  @Cron('0 4 * * *')
  async recomputeShopRatings() {
    const shops = await this.prisma.shopMarketplaceProfile.findMany({
      select: { shopId: true },
    });
    for (const s of shops) {
      const agg = await this.prisma.marketplaceReview.aggregate({
        where: {
          shopId: s.shopId, reviewType: 'SHOP',
          isApproved: true, isHidden: false,
        },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await this.prisma.shopMarketplaceProfile.update({
        where: { shopId: s.shopId },
        data: {
          ratingAverage: agg._avg.rating ?? 0,
          ratingCount: agg._count.rating,
        },
      });
    }
    this.logger.log(`⭐ Recomputed ratings for ${shops.length} shops`);
  }

  // ═══════════════════════════════════════════════════════════
  // Weekly Sunday 5 AM — deactivate inactive customer push tokens (>30 days)
  // ═══════════════════════════════════════════════════════════
  @Cron('0 5 * * 0')
  async deactivateInactivePushTokens() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const res = await this.prisma.customerPushToken.updateMany({
      where: { lastUsedAt: { lt: cutoff }, isActive: true },
      data: { isActive: false },
    });
    if (res.count > 0) this.logger.log(`📵 Deactivated ${res.count} inactive push tokens`);
  }

  // ═══════════════════════════════════════════════════════════
  // Every hour — deliver "review requested" reminder for delivered orders
  // ═══════════════════════════════════════════════════════════
  @Cron(CronExpression.EVERY_HOUR)
  async remindReviews() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const orders = await this.prisma.marketplaceOrder.findMany({
      where: {
        status: 'DELIVERED',
        isRated: false,
        actualDeliveryAt: { lt: cutoff, gt: new Date(Date.now() - 26 * 60 * 60 * 1000) },
      },
      select: { id: true, customerId: true, orderNumber: true, shopId: true },
      take: 200,
    });
    for (const o of orders) {
      await this.queue.createNotification({
        customerId: o.customerId,
        type: 'REVIEW_REMINDER',
        title: '⭐ Review chahiye!',
        body: `Order ${o.orderNumber} kaisa laga? 5 loyalty points milenge.`,
        actionUrl: `/market/orders/${o.id}/rate`,
        data: { orderId: o.id },
        channels: ['PUSH', 'IN_APP'],
      });
    }
    if (orders.length > 0) this.logger.log(`⭐ Sent ${orders.length} review reminders`);
  }
}
