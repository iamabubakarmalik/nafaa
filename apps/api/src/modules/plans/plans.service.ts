import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic() {
    return this.prisma.plan.findMany({
      where: { isActive: true, isPublic: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  listAll() {
    return this.prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    const plan = await this.prisma.plan.findUnique({ where: { slug } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async findById(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async seedDefaultPlans() {
    const count = await this.prisma.plan.count();
    if (count > 0) return { skipped: true };

    const plans = [
      {
        name: 'Free Trial',
        slug: 'free-trial',
        description: '7 din free trial — koi credit card nahi chahiye',
        priceMonthly: 0,
        priceQuarterly: 0,
        priceYearly: 0,
        trialDays: 7,
        sortOrder: 1,
        maxProducts: 30,
        maxUsers: 2,
        maxShops: 1,
        maxSalesPerMonth: 100,
        featurePos: true,
        featureBarcodeScanner: true,
        featureKhata: true,
        featureReports: true,
        featureNotifications: true,
        featureCashRegister: true,
        featureReturns: true,
      },
      {
        name: 'Basic',
        slug: 'basic',
        description: 'Chhoti dukan ke liye perfect',
        priceMonthly: 1500,
        priceQuarterly: 4000,
        priceYearly: 15000,
        sortOrder: 2,
        maxProducts: 500,
        maxUsers: 3,
        maxShops: 1,
        maxSalesPerMonth: 2000,
        featurePos: true,
        featureBarcodeScanner: true,
        featureKhata: true,
        featureReports: true,
        featureDiscounts: true,
        featureNotifications: true,
        featureCashRegister: true,
        featureReturns: true,
        featureExports: true,
      },
      {
        name: 'Pro',
        slug: 'pro',
        description: 'Bari shops aur multi-branch ke liye',
        priceMonthly: 3500,
        priceQuarterly: 9500,
        priceYearly: 36000,
        sortOrder: 3,
        maxProducts: 5000,
        maxUsers: 10,
        maxShops: 3,
        maxSalesPerMonth: 10000,
        featurePos: true,
        featureBarcodeScanner: true,
        featureMultiShop: true,
        featureKhata: true,
        featureReports: true,
        featureProfitReport: true,
        featureLoyalty: true,
        featureDiscounts: true,
        featureNotifications: true,
        featureCashRegister: true,
        featureStockTransfer: true,
        featureReturns: true,
        featureExports: true,
        featureBackup: true,
        featureWhatsappReceipt: true,
      },
      {
        name: 'Enterprise',
        slug: 'enterprise',
        description: 'Unlimited everything + 24/7 support',
        priceMonthly: 9500,
        priceQuarterly: 27000,
        priceYearly: 99000,
        sortOrder: 4,
        maxProducts: 999999,
        maxUsers: 999,
        maxShops: 999,
        maxSalesPerMonth: 999999,
        featurePos: true,
        featureBarcodeScanner: true,
        featureMultiShop: true,
        featureKhata: true,
        featureReports: true,
        featureProfitReport: true,
        featureLoyalty: true,
        featureDiscounts: true,
        featureNotifications: true,
        featureCashRegister: true,
        featureStockTransfer: true,
        featureReturns: true,
        featureExports: true,
        featureBackup: true,
        featureSupport24x7: true,
        featureWhatsappReceipt: true,
        featureCustomBranding: true,
      },
    ];

    await this.prisma.plan.createMany({ data: plans });
    return { seeded: plans.length };
  }
}
