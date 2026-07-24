import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../core/queue/queue.service';

const SEGMENT_NAMES: Record<string, { displayName: string; description: string; color: string }> = {
  CHAMPIONS:          { displayName: 'Champions', description: 'Best customers — recent, frequent, high spenders', color: '#9333ea' },
  LOYAL:              { displayName: 'Loyal', description: 'Consistent buyers', color: '#ec4899' },
  POTENTIAL_LOYALIST: { displayName: 'Potential Loyalist', description: 'Recent buyers with growing frequency', color: '#3b82f6' },
  NEW_CUSTOMERS:      { displayName: 'New Customers', description: 'Just started', color: '#10b981' },
  PROMISING:          { displayName: 'Promising', description: 'Recent low-value buyers', color: '#14b8a6' },
  NEEDS_ATTENTION:    { displayName: 'Needs Attention', description: 'Recency dropping', color: '#f59e0b' },
  ABOUT_TO_SLEEP:     { displayName: 'About to Sleep', description: 'Low recency AND frequency', color: '#ea580c' },
  AT_RISK:            { displayName: 'At Risk', description: 'Used to spend a lot', color: '#dc2626' },
  HIBERNATING:        { displayName: 'Hibernating', description: 'Long-gone low-value', color: '#64748b' },
  LOST:               { displayName: 'Lost', description: 'Very low recency & frequency', color: '#991b1b' },
};

interface RfmCustomer {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  avatarUrl?: string | null;
  recency: number;
  frequency: number;
  monetary: number;
  lastOrderAt?: Date;
  totalOrders: number;
  totalSpent: number;
  currentTier: string;
  loyaltyPoints: number;
  createdAt: Date;
  rScore: number;
  fScore: number;
  mScore: number;
  segment: string;
}

@Injectable()
export class SegmentationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

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

  private classifySegment(r: number, f: number, m: number): string {
    if (r >= 4 && f >= 4 && m >= 4) return 'CHAMPIONS';
    if (r >= 3 && f >= 3 && m >= 3) return 'LOYAL';
    if (r >= 4 && f <= 2) return 'POTENTIAL_LOYALIST';
    if (r >= 4 && f === 1) return 'NEW_CUSTOMERS';
    if (r >= 3 && f <= 2 && m <= 2) return 'PROMISING';
    if (r >= 2 && r <= 3 && f >= 2 && f <= 3) return 'NEEDS_ATTENTION';
    if (r >= 2 && r <= 3 && f <= 2) return 'ABOUT_TO_SLEEP';
    if (r <= 2 && f >= 3 && m >= 3) return 'AT_RISK';
    if (r <= 2 && f <= 2 && m <= 2) return 'HIBERNATING';
    return 'LOST';
  }

  private async computeRfm(shopId: string): Promise<RfmCustomer[]> {
    const customerOrders = await this.prisma.marketplaceOrder.groupBy({
      by: ['customerId'],
      where: {
        shopId,
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
      _count: { _all: true },
      _sum: { total: true },
      _max: { createdAt: true },
    });

    if (customerOrders.length === 0) return [];

    const customerIds = customerOrders.map((c) => c.customerId);
    const customers = await this.prisma.marketplaceCustomer.findMany({
      where: { id: { in: customerIds } },
      select: {
        id: true, fullName: true, phone: true, email: true, avatarUrl: true,
        loyaltyPoints: true, createdAt: true,
      },
    });
    const custMap = new Map(customers.map((c) => [c.id, c]));

    // Compute R, F, M values
    const now = Date.now();
    const raw = customerOrders
      .map((co) => {
        const c = custMap.get(co.customerId);
        if (!c) return null;
        const lastOrder = co._max.createdAt || new Date();
        const recency = Math.floor((now - lastOrder.getTime()) / 86400000);
        const frequency = co._count._all;
        const monetary = Number(co._sum.total || 0);
        return {
          id: c.id,
          fullName: c.fullName,
          phone: c.phone,
          email: c.email,
          avatarUrl: c.avatarUrl,
          recency,
          frequency,
          monetary,
          lastOrderAt: lastOrder,
          totalOrders: frequency,
          totalSpent: monetary,
          loyaltyPoints: c.loyaltyPoints,
          currentTier: 'BRONZE',
          createdAt: c.createdAt,
        };
      })
      .filter(Boolean) as any[];

    if (raw.length === 0) return [];

    // Quintile scoring (1-5)
    const sortedByR = [...raw].sort((a, b) => a.recency - b.recency);
    const sortedByF = [...raw].sort((a, b) => b.frequency - a.frequency);
    const sortedByM = [...raw].sort((a, b) => b.monetary - a.monetary);

    const quintile = (index: number, total: number) => 5 - Math.floor((index / total) * 5);

    const rMap = new Map(sortedByR.map((c, i) => [c.id, quintile(i, sortedByR.length)]));
    const fMap = new Map(sortedByF.map((c, i) => [c.id, quintile(i, sortedByF.length)]));
    const mMap = new Map(sortedByM.map((c, i) => [c.id, quintile(i, sortedByM.length)]));

    return raw.map((c) => {
      const rScore = rMap.get(c.id) || 1;
      const fScore = fMap.get(c.id) || 1;
      const mScore = mMap.get(c.id) || 1;
      return {
        ...c,
        rScore,
        fScore,
        mScore,
        segment: this.classifySegment(rScore, fScore, mScore),
      };
    });
  }

  async overview(tenantId: string, shopId: string | null | undefined) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const rfmData = await this.computeRfm(resolvedShopId);

    const grouped: Record<string, RfmCustomer[]> = {};
    for (const c of rfmData) {
      if (!grouped[c.segment]) grouped[c.segment] = [];
      grouped[c.segment].push(c);
    }

    const segments = Object.entries(SEGMENT_NAMES).map(([key, meta]) => {
      const custs = grouped[key] || [];
      const totalRevenue = custs.reduce((s, c) => s + c.monetary, 0);
      const totalOrders = custs.reduce((s, c) => s + c.frequency, 0);
      return {
        segment: key as any,
        displayName: meta.displayName,
        description: meta.description,
        color: meta.color,
        count: custs.length,
        totalRevenue,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        avgOrdersPerCustomer: custs.length > 0 ? totalOrders / custs.length : 0,
      };
    });

    return {
      segments,
      totalCustomers: rfmData.length,
      lastComputedAt: new Date().toISOString(),
    };
  }

  async recompute(tenantId: string, shopId: string | null | undefined) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const rfm = await this.computeRfm(resolvedShopId);
    const segmentCount = new Set(rfm.map((c) => c.segment)).size;
    return { totalCustomers: rfm.length, segments: segmentCount };
  }

  async customers(tenantId: string, shopId: string | null | undefined, segment: string, opts: { page?: number; limit?: number; search?: string }) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const rfm = await this.computeRfm(resolvedShopId);
    let filtered = rfm.filter((c) => c.segment === segment);

    if (opts.search) {
      const q = opts.search.toLowerCase();
      filtered = filtered.filter((c) =>
        c.fullName.toLowerCase().includes(q) || c.phone.includes(q) || c.email?.toLowerCase().includes(q),
      );
    }

    const page = opts.page || 1;
    const limit = opts.limit || 20;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit).map((c) => ({
      id: c.id,
      fullName: c.fullName,
      phone: c.phone,
      email: c.email,
      avatarUrl: c.avatarUrl,
      segment: c.segment,
      recency: c.recency,
      frequency: c.frequency,
      monetary: c.monetary,
      lastOrderAt: c.lastOrderAt?.toISOString(),
      totalOrders: c.totalOrders,
      totalSpent: c.totalSpent,
      currentTier: c.currentTier,
      loyaltyPoints: c.loyaltyPoints,
      createdAt: c.createdAt.toISOString(),
    }));

    return {
      items: paginated,
      meta: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
    };
  }

  async broadcastToSegment(tenantId: string, shopId: string | null | undefined, dto: {
    segment: string;
    channel: 'PUSH' | 'SMS' | 'EMAIL' | 'WHATSAPP';
    title?: string;
    body: string;
    couponCode?: string;
  }) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const rfm = await this.computeRfm(resolvedShopId);
    const targetCustomers = rfm.filter((c) => c.segment === dto.segment);

    let bodyWithCoupon = dto.body;
    if (dto.couponCode) {
      bodyWithCoupon += `\n\nCode: ${dto.couponCode}`;
    }

    let sent = 0;
    for (const customer of targetCustomers) {
      try {
        if (dto.channel === 'PUSH') {
          await this.queue.sendPush({
            customerId: customer.id,
            title: dto.title || 'Nafaa',
            body: bodyWithCoupon,
          });
        } else if (dto.channel === 'SMS') {
          await this.queue.sendSms({ toPhone: customer.phone, message: bodyWithCoupon });
        } else if (dto.channel === 'EMAIL' && customer.email) {
          await this.queue.sendEmail({
            templateSlug: 'segment-broadcast',
            toEmail: customer.email,
            toName: customer.fullName,
            variables: { subject: dto.title, body: bodyWithCoupon },
          });
        } else if (dto.channel === 'WHATSAPP') {
          await this.queue.sendWhatsapp({ toPhone: customer.phone, message: bodyWithCoupon });
        }
        sent++;
      } catch {
        // Continue on errors
      }
    }

    return { sent };
  }

  async customerRfmDetails(tenantId: string, shopId: string | null | undefined, customerId: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const rfm = await this.computeRfm(resolvedShopId);
    const customer = rfm.find((c) => c.id === customerId);
    if (!customer) throw new NotFoundException('Customer not found in shop');

    const [recentOrders, favCategories] = await Promise.all([
      this.prisma.marketplaceOrder.findMany({
        where: { customerId, shopId: resolvedShopId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, orderNumber: true, total: true, createdAt: true, status: true },
      }),
      this.prisma.marketplaceOrderItem.groupBy({
        by: ['productId'],
        where: { order: { customerId, shopId: resolvedShopId } },
        _count: { _all: true },
      }).then(async (grouped) => {
        const pids = grouped.map((g) => g.productId);
        const profiles = await this.prisma.productMarketplaceProfile.findMany({
          where: { productId: { in: pids } },
          select: { productId: true, marketplaceCategory: true },
        });
        const catMap: Record<string, number> = {};
        for (const g of grouped) {
          const cat = profiles.find((p) => p.productId === g.productId)?.marketplaceCategory || 'Uncategorized';
          catMap[cat] = (catMap[cat] || 0) + g._count._all;
        }
        return Object.entries(catMap).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
      }),
    ]);

    return {
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email,
        avatarUrl: customer.avatarUrl,
        segment: customer.segment,
        recency: customer.recency,
        frequency: customer.frequency,
        monetary: customer.monetary,
        lastOrderAt: customer.lastOrderAt?.toISOString(),
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        currentTier: customer.currentTier,
        loyaltyPoints: customer.loyaltyPoints,
        createdAt: customer.createdAt.toISOString(),
      },
      recentOrders: recentOrders.map((o) => ({ ...o, total: Number(o.total), createdAt: o.createdAt.toISOString() })),
      favoriteCategories: favCategories.slice(0, 5),
    };
  }
}
