import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { todayStart } from '../common/pharmacy-time';

const DAY = 86_400_000;

/**
 * Pharmacy numbers for the dashboard. Days follow the shop's own clock and
 * every count is for the branch being viewed (all branches for "All shops").
 */
@Injectable()
export class PharmacyDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  async overview(user: AuthenticatedUser, scope: ShopScope) {
    const tenantId = user.tenantId;
    const dayStart = await todayStart(this.tz, tenantId);
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * DAY);
    const weekAgo = new Date(dayStart.getTime() - 7 * DAY);
    const live = { tenantId, ...scope.where, isActive: true, quantity: { gt: 0.0001 } };

    const [
      medicines, controlledCount, coldChainCount,
      pendingRx, verifiedRx, dispensedToday,
      expiringSoon, expired, refillsDueToday,
      recentTempBreaches,
    ] = await Promise.all([
      this.prisma.pharmacyMedicine.count({ where: { tenantId } }),
      this.prisma.pharmacyMedicine.count({ where: { tenantId, isNarcotic: true } }),
      this.prisma.pharmacyMedicine.count({ where: { tenantId, requiresColdChain: true } }),
      this.prisma.prescription.count({ where: { tenantId, ...scope.whereLoose, status: 'PENDING' } }),
      this.prisma.prescription.count({ where: { tenantId, ...scope.whereLoose, status: { in: ['VERIFIED', 'PARTIALLY_DISPENSED'] } } }),
      this.prisma.prescription.count({ where: { tenantId, ...scope.whereLoose, status: 'DISPENSED', dispensedAt: { gte: dayStart } } }),
      this.prisma.productBatch.count({ where: { ...live, expiryDate: { gte: now, lte: soon } } }),
      this.prisma.productBatch.count({ where: { ...live, expiryDate: { lt: now } } }),
      this.prisma.refillReminder.count({ where: { tenantId, status: 'PENDING', scheduledFor: { lt: new Date(dayStart.getTime() + 2 * DAY) } } }),
      this.prisma.temperatureLog.count({ where: { tenantId, ...scope.whereLoose, logDate: { gte: weekAgo }, isWithinRange: false } }),
    ]);

    // Best-selling medicines today, by amount.
    const todaySales = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: { tenantId, ...scope.where, soldAt: { gte: dayStart }, status: { not: 'VOIDED' } },
        product: { pharmacyMedicine: { isNot: null } },
      },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 8,
    });
    const productIds = todaySales.map((t) => t.productId).filter((id): id is string => !!id);
    const products = productIds.length
      ? await this.prisma.product.findMany({
        where: { id: { in: productIds }, tenantId },
        include: { images: { where: { isPrimary: true }, take: 1 }, productSalts: { include: { salt: true } } },
      })
      : [];

    const expiringList = await this.prisma.productBatch.findMany({
      where: { ...live, expiryDate: { gte: now, lte: soon } },
      include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } },
      orderBy: { expiryDate: 'asc' },
      take: 10,
    });

    return {
      totals: { medicines, controlledCount, coldChainCount },
      prescriptions: { pending: pendingRx, verified: verifiedRx, dispensedToday },
      alerts: { expiringSoon, expired, refillsDueToday, recentTempBreaches },
      topSelling: todaySales.map((t) => ({ ...t, product: products.find((p) => p.id === t.productId) })),
      expiringList,
    };
  }

  /** Batches with stock that expire within `days` (expired ones included), soonest first. */
  async expiringMedicines(user: AuthenticatedUser, scope: ShopScope, days = 90) {
    const span = Number.isFinite(days) ? Math.min(Math.max(days, 1), 730) : 90;
    return this.prisma.productBatch.findMany({
      where: {
        tenantId: user.tenantId,
        ...scope.where,
        isActive: true,
        product: { tenantId: user.tenantId, isActive: true },
        expiryDate: { lte: new Date(Date.now() + span * DAY) },
        quantity: { gt: 0.0001 },
      },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            productSalts: { include: { salt: true } },
            pharmacyMedicine: true,
          },
        },
        shop: { select: { id: true, name: true } },
      },
      orderBy: { expiryDate: 'asc' },
      take: 2000,
    });
  }
}
