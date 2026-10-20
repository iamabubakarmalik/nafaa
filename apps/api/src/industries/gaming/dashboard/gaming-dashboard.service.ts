import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { startOfDayTz, subDaysTz } from '../../../common/helpers/business-time.helper';
import { BILL_PREFIX, TIME_SKU, TOPUP_SKU_PREFIX, r2 } from '../common/gaming-catalog';

const LIVE: Prisma.EnumSaleStatusFilter = { notIn: ['VOIDED'] };

@Injectable()
export class GamingDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Money by stream from the bills themselves, so the dashboard matches the
   * day book and sales reports: station time (counter lines and session
   * bills), cards (counter lines and single-card bills), rentals and
   * tournament entries. Line amounts are before any bill discount.
   */
  private async streams(tenantId: string, from: Date) {
    const sale = { tenantId, status: LIVE, createdAt: { gte: from } };
    const billSum = (prefix: string) => this.prisma.sale.aggregate({ where: { ...sale, saleNumber: { startsWith: prefix } }, _sum: { total: true }, _count: { _all: true } });
    const [sessionBills, timeLines, topupBills, cardLines, rentalBills, entryBills] = await Promise.all([
      billSum(BILL_PREFIX.session),
      this.prisma.saleItem.aggregate({ where: { sale, product: { tenantId, sku: TIME_SKU } }, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.sale.aggregate({ where: { ...sale, saleNumber: { startsWith: BILL_PREFIX.topup } }, _sum: { total: true, costOfGoods: true }, _count: { _all: true } }),
      this.prisma.saleItem.aggregate({ where: { sale, product: { tenantId, sku: { startsWith: TOPUP_SKU_PREFIX } } }, _sum: { total: true, quantity: true }, _count: { _all: true } }),
      billSum(BILL_PREFIX.rental),
      billSum(BILL_PREFIX.tournament),
    ]);
    const cardRows = await this.prisma.saleItem.findMany({
      where: { sale, product: { tenantId, sku: { startsWith: TOPUP_SKU_PREFIX } } },
      select: { costPrice: true, quantity: true },
    });
    const cardCost = cardRows.reduce((a, r) => a + Number(r.costPrice) * Number(r.quantity), 0);
    const cafe = r2(Number(sessionBills._sum.total ?? 0) + Number(timeLines._sum.total ?? 0));
    const topup = r2(Number(topupBills._sum.total ?? 0) + Number(cardLines._sum.total ?? 0));
    const topupProfit = r2(topup - Number(topupBills._sum.costOfGoods ?? 0) - cardCost);
    const rental = r2(Number(rentalBills._sum.total ?? 0));
    const tournament = r2(Number(entryBills._sum.total ?? 0));
    return {
      cafeRevenue: cafe, sessionsCount: sessionBills._count._all + timeLines._count._all,
      topupRevenue: topup, topupProfit, topupCount: topupBills._count._all + Math.round(Number(cardLines._sum.quantity ?? 0)),
      rentalRevenue: rental, rentalCount: rentalBills._count._all,
      tournamentRevenue: tournament, entryCount: entryBills._count._all,
      totalRevenue: r2(cafe + topup + rental + tournament),
    };
  }

  async overview(user: AuthenticatedUser) {
    const now = new Date();
    const [
      totalProducts, totalStations, activeSessions,
      activeRentals, overdueRentals,
      availableTopups, upcomingTournaments,
    ] = await Promise.all([
      this.prisma.gamingProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.gamingStation.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.gamingCafeSession.count({ where: { tenantId: user.tenantId, status: { in: ['ACTIVE', 'PAUSED'] } } }),
      this.prisma.gamingRental.count({ where: { tenantId: user.tenantId, status: 'ACTIVE', rentalEndDate: { gte: now } } }),
      this.prisma.gamingRental.count({ where: { tenantId: user.tenantId, OR: [{ status: 'OVERDUE' }, { status: 'ACTIVE', rentalEndDate: { lt: now } }] } }),
      this.prisma.gamingDigitalTopup.count({ where: { tenantId: user.tenantId, soldAt: null, isRedeemed: false } }),
      this.prisma.gamingTournament.count({ where: { tenantId: user.tenantId, scheduledDate: { gte: now }, status: 'UPCOMING' } }),
    ]);
    const activeStations = activeSessions;

    const [today, monthly] = await Promise.all([
      this.streams(user.tenantId, startOfDayTz()),
      this.streams(user.tenantId, subDaysTz(startOfDayTz(), 29)),
    ]);

    // Live station status
    const liveSessions = await this.prisma.gamingCafeSession.findMany({
      where: { tenantId: user.tenantId, status: { in: ['ACTIVE', 'PAUSED'] } },
      include: { station: true },
      orderBy: { startedAt: 'asc' },
    });

    // Top selling games
    const topProducts = await this.prisma.gamingProductProfile.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { totalSold: 'desc' },
      take: 10,
    });

    // Upcoming tournaments
    const tournaments = await this.prisma.gamingTournament.findMany({
      where: { tenantId: user.tenantId, scheduledDate: { gte: startOfDayTz() }, status: { in: ['UPCOMING', 'ONGOING'] } },
      orderBy: { scheduledDate: 'asc' },
      take: 5,
    });

    return {
      totals: { totalProducts, totalStations, activeStations, activeSessions },
      inventory: { availableTopups, upcomingTournaments },
      rentals: { active: activeRentals, overdue: overdueRentals },
      today,
      monthly,
      liveSessions, topProducts, tournaments,
    };
  }
}
