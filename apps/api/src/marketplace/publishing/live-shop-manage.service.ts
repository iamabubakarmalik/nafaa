import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LiveShopManageService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveShopId(tenantId: string, shopId?: string | null): Promise<string> {
    if (shopId) return shopId;
    const shop = await this.prisma.shop.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (!shop) throw new NotFoundException('No shop found');
    return shop.id;
  }

  async list(tenantId: string, shopId: string | null | undefined, opts: any) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const page = opts.page || 1;
    const limit = opts.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { shopId: resolvedShopId };
    if (opts.status) where.status = opts.status;

    const [items, total, statusCounts] = await Promise.all([
      this.prisma.liveShop.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.liveShop.count({ where }),
      this.prisma.liveShop.groupBy({
        by: ['status'],
        where: { shopId: resolvedShopId },
        _count: { _all: true },
      }),
    ]);

    const counts: Record<string, number> = {};
    statusCounts.forEach((s) => { counts[s.status] = s._count._all; });

    return {
      items: items.map((ls) => ({
        ...ls,
        totalRevenue: Number(ls.totalRevenue),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts,
    };
  }

  async create(tenantId: string, shopId: string | null | undefined, dto: any) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    return this.prisma.liveShop.create({
      data: {
        shopId: resolvedShopId,
        tenantId,
        title: dto.title,
        description: dto.description,
        coverImageUrl: dto.coverImageUrl,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        featuredProductIds: dto.featuredProductIds || [],
        status: 'SCHEDULED',
        peakViewerCount: 0,
        totalViewers: 0,
        totalMessages: 0,
        totalOrders: 0,
        totalRevenue: 0,
      },
    });
  }

  async goLive(tenantId: string, shopId: string | null | undefined, id: string, streamUrl: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    return this.prisma.liveShop.update({
      where: { id },
      data: { status: 'LIVE', streamUrl, startedAt: new Date() },
    });
  }

  async endLive(tenantId: string, shopId: string | null | undefined, id: string) {
    return this.prisma.liveShop.update({
      where: { id },
      data: { status: 'ENDED', endedAt: new Date() },
    });
  }

  async cancel(tenantId: string, shopId: string | null | undefined, id: string) {
    return this.prisma.liveShop.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
