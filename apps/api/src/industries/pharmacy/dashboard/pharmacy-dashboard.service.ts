import { Injectable } from '@nestjs/common';
import { startOfDay, subDays, addDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class PharmacyDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser, shopId?: string) {
    const todayStart = startOfDay(new Date());
    const soon = addDays(new Date(), 30);
    const weekAgo = subDays(new Date(), 7);

    const [
      medicines, controlledCount, coldChainCount,
      pendingRx, verifiedRx, dispensedToday,
      expiringSoon, expired, refillsDueToday,
      recentTempBreaches,
    ] = await Promise.all([
      this.prisma.pharmacyMedicine.count({ where: { tenantId: user.tenantId } }),
      this.prisma.pharmacyMedicine.count({ where: { tenantId: user.tenantId, isNarcotic: true } }),
      this.prisma.pharmacyMedicine.count({ where: { tenantId: user.tenantId, requiresColdChain: true } }),
      this.prisma.prescription.count({ where: { tenantId: user.tenantId, status: 'PENDING' } }),
      this.prisma.prescription.count({ where: { tenantId: user.tenantId, status: 'VERIFIED' } }),
      this.prisma.prescription.count({ where: { tenantId: user.tenantId, status: 'DISPENSED', dispensedAt: { gte: todayStart } } }),
      this.prisma.productBatch.count({ where: { product: { tenantId: user.tenantId }, expiryDate: { gte: new Date(), lte: soon }, quantity: { gt: 0 } } }),
      this.prisma.productBatch.count({ where: { product: { tenantId: user.tenantId }, expiryDate: { lt: new Date() }, quantity: { gt: 0 } } }),
      this.prisma.refillReminder.count({ where: { tenantId: user.tenantId, status: 'PENDING', scheduledFor: { lte: addDays(new Date(), 1) } } }),
      this.prisma.temperatureLog.count({ where: { tenantId: user.tenantId, logDate: { gte: weekAgo }, isWithinRange: false } }),
    ]);

    // Top selling medicines today
    const todaySales = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: { tenantId: user.tenantId, soldAt: { gte: todayStart }, status: 'COMPLETED' },
        product: { pharmacyMedicine: { isNot: null } },
      },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 8,
    });
    const productIds = todaySales.map((t) => t.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        productSalts: { include: { salt: true } },
      },
    });

    // Expiring soon list
    const expiringList = await this.prisma.productBatch.findMany({
      where: {
        product: { tenantId: user.tenantId },
        expiryDate: { gte: new Date(), lte: soon },
        quantity: { gt: 0 },
      },
      include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } },
      orderBy: { expiryDate: 'asc' },
      take: 10,
    });

    return {
      totals: {
        medicines,
        controlledCount,
        coldChainCount,
      },
      prescriptions: {
        pending: pendingRx,
        verified: verifiedRx,
        dispensedToday,
      },
      alerts: {
        expiringSoon,
        expired,
        refillsDueToday,
        recentTempBreaches,
      },
      topSelling: todaySales.map((t) => ({ ...t, product: products.find((p) => p.id === t.productId) })),
      expiringList,
    };
  }

  async expiringMedicines(user: AuthenticatedUser, days: number = 90) {
    const cutoff = addDays(new Date(), days);
    return this.prisma.productBatch.findMany({
      where: {
        product: { tenantId: user.tenantId, isActive: true },
        expiryDate: { lte: cutoff },
        quantity: { gt: 0 },
      },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            productSalts: { include: { salt: true } },
            pharmacyMedicine: true,
          },
        },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }
}
