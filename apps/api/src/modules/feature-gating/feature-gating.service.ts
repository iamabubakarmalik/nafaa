import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { startOfMonth } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class FeatureGatingService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentPlan(tenantId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['TRIAL', 'ACTIVE'] },
      },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });

    if (sub) return sub.plan;

    return this.prisma.plan.findUnique({ where: { slug: 'free-trial' } });
  }

  async getUsage(user: AuthenticatedUser) {
    const monthStart = startOfMonth(new Date());

    const [products, users, shops, salesThisMonth] = await Promise.all([
      this.prisma.product.count({
        where: { tenantId: user.tenantId, isActive: true },
      }),
      this.prisma.user.count({
        where: { tenantId: user.tenantId, isActive: true },
      }),
      this.prisma.shop.count({
        where: { tenantId: user.tenantId, isActive: true },
      }),
      this.prisma.sale.count({
        where: {
          tenantId: user.tenantId,
          status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
          soldAt: { gte: monthStart },
        },
      }),
    ]);

    const plan = await this.getCurrentPlan(user.tenantId);
    if (!plan) throw new NotFoundException('No active plan');

    return {
      plan: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
      },
      usage: {
        products: { current: products, limit: plan.maxProducts },
        users: { current: users, limit: plan.maxUsers },
        shops: { current: shops, limit: plan.maxShops },
        salesThisMonth: {
          current: salesThisMonth,
          limit: plan.maxSalesPerMonth,
        },
      },
      features: {
        pos: plan.featurePos,
        barcodeScanner: plan.featureBarcodeScanner,
        multiShop: plan.featureMultiShop,
        reports: plan.featureReports,
        profitReport: plan.featureProfitReport,
        loyalty: plan.featureLoyalty,
        discounts: plan.featureDiscounts,
        khata: plan.featureKhata,
        exports: plan.featureExports,
        backup: plan.featureBackup,
        notifications: plan.featureNotifications,
        cashRegister: plan.featureCashRegister,
        stockTransfer: plan.featureStockTransfer,
        returns: plan.featureReturns,
        support24x7: plan.featureSupport24x7,
        whatsappReceipt: plan.featureWhatsappReceipt,
        customBranding: plan.featureCustomBranding,
      },
    };
  }

  async assertFeature(tenantId: string, feature: string) {
    const plan = await this.getCurrentPlan(tenantId);
    if (!plan) throw new ForbiddenException('No active plan');

    const map: Record<string, boolean> = {
      pos: plan.featurePos,
      multiShop: plan.featureMultiShop,
      profitReport: plan.featureProfitReport,
      loyalty: plan.featureLoyalty,
      discounts: plan.featureDiscounts,
      exports: plan.featureExports,
      backup: plan.featureBackup,
      stockTransfer: plan.featureStockTransfer,
      whatsappReceipt: plan.featureWhatsappReceipt,
      customBranding: plan.featureCustomBranding,
    };

    if (map[feature] === false) {
      throw new ForbiddenException(
        `Aap ka current plan (${plan.name}) is feature ko allow nahi karta. Upgrade karein.`,
      );
    }

    return true;
  }
}
