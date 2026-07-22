import { Injectable, NotFoundException } from '@nestjs/common';
import { LoyaltyTierLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_CONFIGS: Record<LoyaltyTierLevel, any> = {
  BRONZE:   { displayName: 'Bronze',   minLifetimeSpend: 0,      minOrdersCount: 0,  pointsMultiplier: 1.0, cashbackPercent: 1,  prioritySupport: false, earlyAccessDrops: false, birthdayBonusPoints: 50,  exclusiveDeals: false, badgeColor: '#CD7F32', badgeIcon: '🥉' },
  SILVER:   { displayName: 'Silver',   minLifetimeSpend: 10000,  minOrdersCount: 5,  pointsMultiplier: 1.25, cashbackPercent: 2, prioritySupport: false, earlyAccessDrops: false, birthdayBonusPoints: 100, exclusiveDeals: true,  badgeColor: '#C0C0C0', badgeIcon: '🥈' },
  GOLD:     { displayName: 'Gold',     minLifetimeSpend: 50000,  minOrdersCount: 15, pointsMultiplier: 1.5,  cashbackPercent: 3, prioritySupport: true,  earlyAccessDrops: true,  birthdayBonusPoints: 250, exclusiveDeals: true,  badgeColor: '#FFD700', badgeIcon: '🥇' },
  PLATINUM: { displayName: 'Platinum', minLifetimeSpend: 200000, minOrdersCount: 50, pointsMultiplier: 2.0,  cashbackPercent: 5, prioritySupport: true,  earlyAccessDrops: true,  birthdayBonusPoints: 500, exclusiveDeals: true,  freeDeliveryAbove: 500, badgeColor: '#E5E4E2', badgeIcon: '💎' },
};

const TIER_ORDER: LoyaltyTierLevel[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

@Injectable()
export class LoyaltyTiersService {
  constructor(private readonly prisma: PrismaService) {}

  async seedDefaultConfigs() {
    for (const [level, cfg] of Object.entries(DEFAULT_CONFIGS)) {
      await this.prisma.loyaltyTierConfig.upsert({
        where: { level: level as LoyaltyTierLevel },
        update: {},
        create: { level: level as LoyaltyTierLevel, ...cfg },
      });
    }
    return { seeded: 4 };
  }

  async getAllConfigs() {
    return this.prisma.loyaltyTierConfig.findMany({ orderBy: { minLifetimeSpend: 'asc' } });
  }

  async updateConfig(level: LoyaltyTierLevel, data: any) {
    return this.prisma.loyaltyTierConfig.update({ where: { level }, data });
  }

  async getCustomerState(customerId: string) {
    let state = await this.prisma.customerLoyaltyState.findUnique({ where: { customerId } });
    if (!state) {
      state = await this.prisma.customerLoyaltyState.create({
        data: { customerId },
      });
    }
    const config = await this.prisma.loyaltyTierConfig.findUnique({ where: { level: state.currentTier } });
    return { state, config };
  }

  async recomputeTier(customerId: string) {
    // Aggregate lifetime stats
    const [orderStats, customer] = await Promise.all([
      this.prisma.marketplaceOrder.aggregate({
        where: { customerId, status: 'DELIVERED' },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.marketplaceCustomer.findUnique({
        where: { id: customerId }, select: { loyaltyPoints: true },
      }),
    ]);

    const lifetimeSpend = Number(orderStats._sum.total ?? 0);
    const lifetimeOrders = orderStats._count._all;
    const configs = await this.prisma.loyaltyTierConfig.findMany({ orderBy: { minLifetimeSpend: 'desc' } });

    // Find highest tier customer qualifies for
    const qualified = configs.find(
      (c) => lifetimeSpend >= Number(c.minLifetimeSpend) && lifetimeOrders >= c.minOrdersCount,
    );
    const newTier = qualified?.level ?? 'BRONZE';

    // Compute next tier progress
    const currentIdx = TIER_ORDER.indexOf(newTier);
    const nextTier = currentIdx < TIER_ORDER.length - 1 ? TIER_ORDER[currentIdx + 1] : null;
    const nextCfg = nextTier ? configs.find((c) => c.level === nextTier) : null;
    const progressPct = nextCfg
      ? Math.min(100, (lifetimeSpend / Number(nextCfg.minLifetimeSpend)) * 100)
      : 100;
    const amountToNext = nextCfg ? Math.max(0, Number(nextCfg.minLifetimeSpend) - lifetimeSpend) : 0;

    const existing = await this.prisma.customerLoyaltyState.findUnique({ where: { customerId } });
    const state = await this.prisma.customerLoyaltyState.upsert({
      where: { customerId },
      update: {
        currentTier: newTier, lifetimeSpend, lifetimeOrders,
        lifetimePoints: customer?.loyaltyPoints ?? 0,
        nextTier, progressToNext: progressPct, amountToNextTier: amountToNext,
        tierAchievedAt: existing?.currentTier !== newTier ? new Date() : existing.tierAchievedAt,
      },
      create: {
        customerId, currentTier: newTier, lifetimeSpend, lifetimeOrders,
        lifetimePoints: customer?.loyaltyPoints ?? 0,
        nextTier, progressToNext: progressPct, amountToNextTier: amountToNext,
        tierAchievedAt: new Date(),
      },
    });

    // Record tier upgrade in history
    if (existing && existing.currentTier !== newTier) {
      await this.prisma.loyaltyTierHistory.create({
        data: { stateId: state.id, fromTier: existing.currentTier, toTier: newTier, reason: 'Auto-recompute' },
      });
    }
    return state;
  }

  async getTierHistory(customerId: string) {
    const state = await this.prisma.customerLoyaltyState.findUnique({ where: { customerId } });
    if (!state) return [];
    return this.prisma.loyaltyTierHistory.findMany({
      where: { stateId: state.id },
      orderBy: { changedAt: 'desc' },
    });
  }

  async listByTier(tier?: LoyaltyTierLevel, limit = 50, offset = 0) {
    return this.prisma.customerLoyaltyState.findMany({
      where: tier ? { currentTier: tier } : {},
      orderBy: { lifetimeSpend: 'desc' },
      take: limit, skip: offset,
    });
  }
}
