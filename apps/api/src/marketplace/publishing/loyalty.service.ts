import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LoyaltyTierLevel } from '@prisma/client';

const TIER_ORDER: LoyaltyTierLevel[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

const DEFAULT_TIERS: Record<LoyaltyTierLevel, any> = {
  BRONZE:   { displayName: 'Bronze',   minLifetimeSpend: 0,      minOrdersCount: 0,  pointsMultiplier: 1,    cashbackPercent: 1, prioritySupport: false, earlyAccessDrops: false, birthdayBonusPoints: 100,  exclusiveDeals: false, badgeIcon: '🥉' },
  SILVER:   { displayName: 'Silver',   minLifetimeSpend: 10000,  minOrdersCount: 5,  pointsMultiplier: 1.25, cashbackPercent: 2, prioritySupport: false, earlyAccessDrops: false, birthdayBonusPoints: 250,  exclusiveDeals: true,  badgeIcon: '🥈' },
  GOLD:     { displayName: 'Gold',     minLifetimeSpend: 50000,  minOrdersCount: 20, pointsMultiplier: 1.5,  cashbackPercent: 3, prioritySupport: true,  earlyAccessDrops: true,  birthdayBonusPoints: 500,  exclusiveDeals: true,  badgeIcon: '🥇' },
  PLATINUM: { displayName: 'Platinum', minLifetimeSpend: 200000, minOrdersCount: 50, pointsMultiplier: 2,    cashbackPercent: 5, prioritySupport: true,  earlyAccessDrops: true,  birthdayBonusPoints: 1000, exclusiveDeals: true,  freeDeliveryAbove: 500, badgeIcon: '💎' },
};

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveShopId(tenantId: string, shopId?: string | null): Promise<string> {
    if (shopId) return shopId;
    const shop = await this.prisma.shop.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('No shop found');
    return shop.id;
  }

  private async ensureTierConfigs() {
    for (const [level, defaults] of Object.entries(DEFAULT_TIERS)) {
      await this.prisma.loyaltyTierConfig.upsert({
        where: { level: level as LoyaltyTierLevel },
        create: { level: level as LoyaltyTierLevel, ...defaults },
        update: {},
      });
    }
  }

  async overview(tenantId: string, shopId: string | null | undefined) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    await this.ensureTierConfigs();

    const tierConfigs = await this.prisma.loyaltyTierConfig.findMany({
      orderBy: { minLifetimeSpend: 'asc' },
    });

    // Customer counts per tier (shop-scoped)
    const shopCustomerOrders = await this.prisma.marketplaceOrder.groupBy({
      by: ['customerId'],
      where: { shopId: resolvedShopId, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      _sum: { total: true },
      _count: { _all: true },
    });

    const shopCustomerIds = shopCustomerOrders.map((o) => o.customerId);
    const loyaltyStates = await this.prisma.customerLoyaltyState.findMany({
      where: { customerId: { in: shopCustomerIds } },
    });
    const stateMap = new Map(loyaltyStates.map((s) => [s.customerId, s]));

    // Compute tier for each customer based on shop lifetime spend
    const tierCounts: Record<LoyaltyTierLevel, { count: number; totalRevenue: number }> = {
      BRONZE:   { count: 0, totalRevenue: 0 },
      SILVER:   { count: 0, totalRevenue: 0 },
      GOLD:     { count: 0, totalRevenue: 0 },
      PLATINUM: { count: 0, totalRevenue: 0 },
    };

    for (const co of shopCustomerOrders) {
      const spend = Number(co._sum.total || 0);
      const orders = co._count._all;
      let tier: LoyaltyTierLevel = 'BRONZE';
      for (const cfg of tierConfigs) {
        if (spend >= Number(cfg.minLifetimeSpend) && orders >= cfg.minOrdersCount) {
          tier = cfg.level;
        }
      }
      tierCounts[tier].count += 1;
      tierCounts[tier].totalRevenue += spend;
    }

    const tiers = tierConfigs.map((cfg) => ({
      id: cfg.id,
      level: cfg.level,
      displayName: cfg.displayName,
      minLifetimeSpend: Number(cfg.minLifetimeSpend),
      minOrdersCount: cfg.minOrdersCount,
      pointsMultiplier: cfg.pointsMultiplier,
      cashbackPercent: cfg.cashbackPercent,
      freeDeliveryAbove: cfg.freeDeliveryAbove ? Number(cfg.freeDeliveryAbove) : undefined,
      prioritySupport: cfg.prioritySupport,
      earlyAccessDrops: cfg.earlyAccessDrops,
      birthdayBonusPoints: cfg.birthdayBonusPoints,
      exclusiveDeals: cfg.exclusiveDeals,
      badgeColor: cfg.badgeColor,
      badgeIcon: cfg.badgeIcon,
      customerCount: tierCounts[cfg.level].count,
      totalRevenue: tierCounts[cfg.level].totalRevenue,
    }));

    // Stats
    const totalPointsIssued = loyaltyStates.reduce((s, x) => s + x.lifetimePoints, 0);
    const referrals = await this.prisma.marketplaceCustomer.count({
      where: { referredById: { in: shopCustomerIds } },
    });

    // Top earners
    const topEarnerStates = loyaltyStates.sort((a, b) => b.lifetimePoints - a.lifetimePoints).slice(0, 10);
    const topEarnerCustIds = topEarnerStates.map((s) => s.customerId);
    const topCustDetails = await this.prisma.marketplaceCustomer.findMany({
      where: { id: { in: topEarnerCustIds } },
      select: { id: true, fullName: true, avatarUrl: true },
    });
    const custMap = new Map(topCustDetails.map((c) => [c.id, c]));

    const topEarners = topEarnerStates.map((s) => {
      const c = custMap.get(s.customerId);
      const shopOrder = shopCustomerOrders.find((o) => o.customerId === s.customerId);
      return {
        customerId: s.customerId,
        fullName: c?.fullName || 'Unknown',
        avatarUrl: c?.avatarUrl,
        tier: s.currentTier,
        lifetimePoints: s.lifetimePoints,
        lifetimeSpend: Number(shopOrder?._sum.total || 0),
        lifetimeOrders: shopOrder?._count._all || 0,
      };
    });

    // Points activity trend (last 30 days) — from wallet transactions
    const fromDate = new Date(Date.now() - 30 * 86400000);
    const txns = await this.prisma.customerWalletTxn.findMany({
      where: {
        customerId: { in: shopCustomerIds },
        createdAt: { gte: fromDate },
        type: { in: ['CREDIT', 'DEBIT', 'CASHBACK', 'REFERRAL_BONUS'] },
      },
      select: { type: true, amount: true, createdAt: true },
    });

    const activityMap: Record<string, { issued: number; redeemed: number }> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      activityMap[key] = { issued: 0, redeemed: 0 };
    }
    for (const t of txns) {
      const key = t.createdAt.toISOString().slice(0, 10);
      if (!activityMap[key]) continue;
      if (t.type === 'CREDIT' || t.type === 'CASHBACK' || t.type === 'REFERRAL_BONUS') {
        activityMap[key].issued += Math.abs(Number(t.amount));
      } else {
        activityMap[key].redeemed += Math.abs(Number(t.amount));
      }
    }

    const pointsActivity = Object.entries(activityMap)
      .map(([date, val]) => ({ date, issued: Math.round(val.issued), redeemed: Math.round(val.redeemed) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      tiers,
      stats: {
        totalCustomers: shopCustomerOrders.length,
        totalPointsIssued,
        totalPointsRedeemed: 0,
        totalCashbackPaid: 0,
        activeReferrals: referrals,
        conversionRate: 0,
      },
      topEarners,
      pointsActivity,
    };
  }

  async updateTier(level: LoyaltyTierLevel, data: any) {
    return this.prisma.loyaltyTierConfig.update({
      where: { level },
      data,
    });
  }

  async listCustomers(tenantId: string, shopId: string | null | undefined, opts: { tier?: LoyaltyTierLevel; search?: string; page?: number; limit?: number }) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    await this.ensureTierConfigs();

    const shopCustomerOrders = await this.prisma.marketplaceOrder.groupBy({
      by: ['customerId'],
      where: { shopId: resolvedShopId, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      _sum: { total: true },
      _count: { _all: true },
    });

    const tierConfigs = await this.prisma.loyaltyTierConfig.findMany({ orderBy: { minLifetimeSpend: 'asc' } });
    const shopCustomerIds = shopCustomerOrders.map((o) => o.customerId);

    let customers = await this.prisma.marketplaceCustomer.findMany({
      where: {
        id: { in: shopCustomerIds },
        ...(opts.search ? {
          OR: [
            { fullName: { contains: opts.search, mode: 'insensitive' } },
            { phone: { contains: opts.search } },
          ],
        } : {}),
      },
      select: {
        id: true, fullName: true, phone: true, avatarUrl: true,
        loyaltyPoints: true, createdAt: true,
      },
    });

    const stateMap = new Map(
      (await this.prisma.customerLoyaltyState.findMany({ where: { customerId: { in: shopCustomerIds } } }))
        .map((s) => [s.customerId, s]),
    );

    let enriched = customers.map((c) => {
      const orderData = shopCustomerOrders.find((o) => o.customerId === c.id);
      const spend = Number(orderData?._sum.total || 0);
      const orders = orderData?._count._all || 0;

      let currentTier: LoyaltyTierLevel = 'BRONZE';
      for (const cfg of tierConfigs) {
        if (spend >= Number(cfg.minLifetimeSpend) && orders >= cfg.minOrdersCount) {
          currentTier = cfg.level;
        }
      }

      const currentIdx = TIER_ORDER.indexOf(currentTier);
      const nextTier = currentIdx < 3 ? TIER_ORDER[currentIdx + 1] : undefined;
      const nextCfg = nextTier ? tierConfigs.find((c) => c.level === nextTier) : null;
      const amountToNext = nextCfg ? Math.max(0, Number(nextCfg.minLifetimeSpend) - spend) : 0;
      const progressToNext = nextCfg ? Math.min(100, (spend / Number(nextCfg.minLifetimeSpend)) * 100) : 100;

      const state = stateMap.get(c.id);
      return {
        customerId: c.id,
        fullName: c.fullName,
        phone: c.phone,
        avatarUrl: c.avatarUrl,
        currentTier,
        lifetimeSpend: spend,
        lifetimeOrders: orders,
        lifetimePoints: state?.lifetimePoints || c.loyaltyPoints,
        pointsThisYear: state?.pointsThisYear || 0,
        tierAchievedAt: state?.tierAchievedAt?.toISOString(),
        nextTier,
        progressToNext,
        amountToNextTier: amountToNext,
      };
    });

    if (opts.tier) enriched = enriched.filter((c) => c.currentTier === opts.tier);
    enriched.sort((a, b) => b.lifetimePoints - a.lifetimePoints);

    const page = opts.page || 1;
    const limit = opts.limit || 20;
    const start = (page - 1) * limit;
    const total = enriched.length;

    return {
      items: enriched.slice(start, start + limit),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async awardPoints(customerId: string, points: number, reason: string) {
    if (points < 1) throw new BadRequestException('Points must be positive');
    const customer = await this.prisma.marketplaceCustomer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const newBalance = customer.loyaltyPoints + points;

    await this.prisma.$transaction([
      this.prisma.marketplaceCustomer.update({
        where: { id: customerId },
        data: { loyaltyPoints: newBalance },
      }),
      this.prisma.customerWalletTxn.create({
        data: {
          customerId,
          type: 'CREDIT',
          amount: points,
          balanceAfter: newBalance,
          reason,
          referenceType: 'LOYALTY_AWARD',
        },
      }),
    ]);

    return { success: true, newBalance };
  }

  async redeemPoints(customerId: string, points: number, orderId?: string) {
    const customer = await this.prisma.marketplaceCustomer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException();
    if (customer.loyaltyPoints < points) {
      throw new BadRequestException('Insufficient points');
    }

    const newBalance = customer.loyaltyPoints - points;
    await this.prisma.$transaction([
      this.prisma.marketplaceCustomer.update({
        where: { id: customerId },
        data: { loyaltyPoints: newBalance },
      }),
      this.prisma.customerWalletTxn.create({
        data: {
          customerId,
          type: 'DEBIT',
          amount: points,
          balanceAfter: newBalance,
          reason: `Points redeemed${orderId ? ` for order ${orderId}` : ''}`,
          referenceId: orderId,
          referenceType: 'LOYALTY_REDEEM',
        },
      }),
    ]);

    return { success: true, newBalance };
  }
}
