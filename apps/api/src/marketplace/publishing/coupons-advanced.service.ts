import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class CouponsAdvancedService {
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

  async bulkGenerate(tenantId: string, shopId: string | null | undefined, dto: any) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    if (dto.count < 1 || dto.count > 5000) {
      throw new BadRequestException('Count must be between 1 and 5000');
    }

    const codes: string[] = [];
    const prefix = (dto.prefix || 'NAFAA').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    const now = new Date();

    // Generate unique codes
    const usedCodes = new Set<string>();
    while (codes.length < dto.count) {
      const random = randomBytes(4).toString('hex').toUpperCase();
      const code = `${prefix}-${random}`;
      if (!usedCodes.has(code)) {
        usedCodes.add(code);
        codes.push(code);
      }
    }

    // Bulk create promotions
    const created = await this.prisma.$transaction(
      codes.map((code) =>
        this.prisma.promotion.create({
          data: {
            tenantId,
            shopId: resolvedShopId,
            type: 'COUPON',
            status: 'ACTIVE',
            scope: 'SHOP',
            title: `Bulk-generated coupon (${prefix})`,
            slug: `bulk-${code.toLowerCase()}`,
            discountType: dto.discountType,
            discountValue: dto.discountValue,
            maxDiscount: dto.maxDiscount,
            minOrderAmount: dto.minOrderAmount || 0,
            couponCode: code,
            isPublic: false,
            requiresLogin: true,
            usageLimit: dto.usageLimit || 1,
            usageCount: 0,
            perCustomerLimit: dto.perCustomerLimit || 1,
            targetProductIds: dto.targetProductIds || [],
            targetCategoryIds: dto.targetCategoryIds || [],
            excludedProductIds: [],
            startsAt: new Date(dto.startsAt),
            endsAt: new Date(dto.endsAt),
            isFlashSale: false,
            displayOrder: 0,
          },
        }),
      ),
    );

    return { count: created.length, codes };
  }

  async analytics(tenantId: string, shopId: string | null | undefined, range: '7d' | '30d' | '90d' | 'year' = '30d') {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    const fromDate = new Date(Date.now() - days * 86400000);

    const [totalCoupons, activeCoupons, redemptions, allCoupons] = await Promise.all([
      this.prisma.promotion.count({
        where: { shopId: resolvedShopId, type: 'COUPON' },
      }),
      this.prisma.promotion.count({
        where: {
          shopId: resolvedShopId,
          type: 'COUPON',
          status: 'ACTIVE',
          startsAt: { lte: new Date() },
          endsAt: { gt: new Date() },
        },
      }),
      this.prisma.promoRedemption.findMany({
        where: {
          promotion: { shopId: resolvedShopId, type: 'COUPON' },
          redeemedAt: { gte: fromDate },
        },
        include: {
          promotion: {
            select: { id: true, title: true, couponCode: true, discountType: true },
          },
        },
      }),
      this.prisma.promotion.findMany({
        where: { shopId: resolvedShopId, type: 'COUPON' },
        select: { id: true, couponCode: true, title: true, usageCount: true },
      }),
    ]);

    // Total discount + revenue from redemption orders
    const orderIds = redemptions.map((r) => r.orderId).filter(Boolean) as string[];
    const orders = await this.prisma.marketplaceOrder.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, total: true },
    });
    const orderMap = new Map(orders.map((o) => [o.id, Number(o.total)]));
    const totalDiscountGiven = redemptions.reduce((sum, r) => sum + Number(r.discountAmount), 0);
    const totalRevenue = orderIds.reduce((sum, id) => sum + (orderMap.get(id) || 0), 0);
    const roi = totalDiscountGiven > 0 ? totalRevenue / totalDiscountGiven : 0;

    // AOV comparison
    const [aovWithCoupon, aovWithoutCoupon] = await Promise.all([
      this.prisma.marketplaceOrder.aggregate({
        where: {
          shopId: resolvedShopId,
          createdAt: { gte: fromDate },
          couponCode: { not: null },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
        _avg: { total: true },
      }),
      this.prisma.marketplaceOrder.aggregate({
        where: {
          shopId: resolvedShopId,
          createdAt: { gte: fromDate },
          couponCode: null,
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
        _avg: { total: true },
      }),
    ]);

    // Top coupons by revenue
    const revenuePerCoupon = new Map<string, { revenue: number; redemptions: number; discountGiven: number }>();
    for (const r of redemptions) {
      const key = r.promotionId;
      const orderTotal = r.orderId ? orderMap.get(r.orderId) || 0 : 0;
      const existing = revenuePerCoupon.get(key) || { revenue: 0, redemptions: 0, discountGiven: 0 };
      existing.revenue += orderTotal;
      existing.redemptions += 1;
      existing.discountGiven += Number(r.discountAmount);
      revenuePerCoupon.set(key, existing);
    }

    const couponMap = new Map(allCoupons.map((c) => [c.id, c]));
    const topCoupons = Array.from(revenuePerCoupon.entries())
      .map(([id, stats]) => ({
        id,
        code: couponMap.get(id)?.couponCode || '',
        title: couponMap.get(id)?.title || '',
        redemptions: stats.redemptions,
        revenue: stats.revenue,
        discountGiven: stats.discountGiven,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Trend
    const trend: Record<string, { count: number; revenue: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      trend[key] = { count: 0, revenue: 0 };
    }
    for (const r of redemptions) {
      const key = r.redeemedAt.toISOString().slice(0, 10);
      if (trend[key]) {
        trend[key].count += 1;
        if (r.orderId) trend[key].revenue += orderMap.get(r.orderId) || 0;
      }
    }

    const redemptionsTrend = Object.entries(trend)
      .map(([date, val]) => ({ date, count: val.count, revenue: val.revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalCoupons,
      activeCoupons,
      totalRedemptions: redemptions.length,
      totalDiscountGiven,
      totalRevenue,
      roi,
      avgOrderValueWithCoupon: Number(aovWithCoupon._avg.total || 0),
      avgOrderValueWithoutCoupon: Number(aovWithoutCoupon._avg.total || 0),
      topCoupons,
      redemptionsTrend,
    };
  }

  async listRedemptions(tenantId: string, shopId: string | null | undefined, promotionId: string, opts: { page?: number; limit?: number }) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const promo = await this.prisma.promotion.findFirst({
      where: { id: promotionId, shopId: resolvedShopId },
    });
    if (!promo) throw new NotFoundException('Coupon not found');

    const page = opts.page || 1;
    const limit = opts.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.promoRedemption.findMany({
        where: { promotionId },
        orderBy: { redeemedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.promoRedemption.count({ where: { promotionId } }),
    ]);

    const customerIds = items.map((r) => r.customerId);
    const customers = await this.prisma.marketplaceCustomer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, fullName: true, phone: true, avatarUrl: true },
    });
    const custMap = new Map(customers.map((c) => [c.id, c]));

    return {
      items: items.map((r) => ({
        ...r,
        discountAmount: Number(r.discountAmount),
        customer: custMap.get(r.customerId),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
