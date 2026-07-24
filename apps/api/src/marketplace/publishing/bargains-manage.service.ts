import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BargainsManageService {
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

  async list(tenantId: string, shopId: string | null | undefined, opts: {
    status?: string[];
    page?: number;
    limit?: number;
  }) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const page = opts.page || 1;
    const limit = opts.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { shopId: resolvedShopId };
    if (opts.status?.length) where.status = { in: opts.status };

    const [items, total, statusCounts] = await Promise.all([
      this.prisma.bargain.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          customer: { select: { id: true, fullName: true, phone: true, avatarUrl: true } },
        },
      }),
      this.prisma.bargain.count({ where }),
      this.prisma.bargain.groupBy({
        by: ['status'],
        where: { shopId: resolvedShopId },
        _count: { _all: true },
      }),
    ]);

    const counts: Record<string, number> = {};
    statusCounts.forEach((s) => { counts[s.status] = s._count._all; });

    const productIds = items.map((b) => b.productId);
    const productProfiles = await this.prisma.productMarketplaceProfile.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, publicImages: true },
    });
    const imgMap = new Map(productProfiles.map((p) => [p.productId, p.publicImages?.[0]]));

    return {
      items: items.map((b) => ({
        ...b,
        originalPrice: Number(b.originalPrice),
        customerOffer: Number(b.customerOffer),
        shopCounterOffer: Number(b.currentOffer),
        finalPrice: b.finalPrice ? Number(b.finalPrice) : undefined,
        productImage: imgMap.get(b.productId),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts,
    };
  }

  async get(tenantId: string, shopId: string | null | undefined, bargainId: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const bargain = await this.prisma.bargain.findFirst({
      where: { id: bargainId, shopId: resolvedShopId },
      include: {
        customer: { select: { id: true, fullName: true, phone: true, avatarUrl: true } },
      },
    });
    if (!bargain) throw new NotFoundException('Bargain not found');

    return {
      ...bargain,
      originalPrice: Number(bargain.originalPrice),
      customerOffer: Number(bargain.customerOffer),
      shopCounterOffer: Number(bargain.currentOffer),
      finalPrice: bargain.finalPrice ? Number(bargain.finalPrice) : undefined,
    };
  }

  async accept(tenantId: string, shopId: string | null | undefined, bargainId: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const bargain = await this.prisma.bargain.findFirst({
      where: { id: bargainId, shopId: resolvedShopId },
    });
    if (!bargain) throw new NotFoundException('Bargain not found');
    if (!['PENDING', 'COUNTER_OFFERED'].includes(bargain.status)) {
      throw new BadRequestException('Bargain not in accept-able state');
    }

    return this.prisma.bargain.update({
      where: { id: bargainId },
      data: {
        status: 'ACCEPTED',
        finalPrice: bargain.customerOffer,
      },
    });
  }

  async reject(tenantId: string, shopId: string | null | undefined, bargainId: string, reason?: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const bargain = await this.prisma.bargain.findFirst({
      where: { id: bargainId, shopId: resolvedShopId },
    });
    if (!bargain) throw new NotFoundException('Bargain not found');
    if (!['PENDING', 'COUNTER_OFFERED'].includes(bargain.status)) {
      throw new BadRequestException('Bargain not in reject-able state');
    }

    return this.prisma.bargain.update({
      where: { id: bargainId },
      data: {
        status: 'REJECTED',
        rejectReason: reason,
      },
    });
  }

  async counter(tenantId: string, shopId: string | null | undefined, bargainId: string, counterOffer: number, message?: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const bargain = await this.prisma.bargain.findFirst({
      where: { id: bargainId, shopId: resolvedShopId },
    });
    if (!bargain) throw new NotFoundException('Bargain not found');
    if (bargain.status !== 'PENDING') {
      throw new BadRequestException('Can only counter PENDING bargains');
    }
    if (counterOffer <= Number(bargain.customerOffer)) {
      throw new BadRequestException('Counter must be higher than customer offer');
    }
    if (counterOffer >= Number(bargain.originalPrice)) {
      throw new BadRequestException('Counter must be lower than original price');
    }

    return this.prisma.bargain.update({
      where: { id: bargainId },
      data: {
        status: 'COUNTER_OFFERED',
        currentOffer: counterOffer,
        offerCount: { increment: 1 },
      },
    });
  }
}
