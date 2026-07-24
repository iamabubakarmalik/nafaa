import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuctionsManageService {
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
      this.prisma.auction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          bids: {
            take: 3,
            orderBy: { amount: 'desc' },
            include: {
              customer: { select: { fullName: true, avatarUrl: true } },
            },
          },
        },
      }),
      this.prisma.auction.count({ where }),
      this.prisma.auction.groupBy({
        by: ['status'],
        where: { shopId: resolvedShopId },
        _count: { _all: true },
      }),
    ]);

    const counts: Record<string, number> = {};
    statusCounts.forEach((s) => { counts[s.status] = s._count._all; });

    return {
      items: items.map((a) => ({
        ...a,
        startingPrice: Number(a.startingPrice),
        reservePrice: a.reservePrice ? Number(a.reservePrice) : undefined,
        currentPrice: Number(a.currentPrice),
        bidIncrement: Number(a.bidIncrement),
        recentBids: a.bids.map((b) => ({
          ...b,
          amount: Number(b.amount),
        })),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts,
    };
  }

  async create(tenantId: string, shopId: string | null | undefined, dto: any) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const now = new Date();
    const startsAt = new Date(dto.startsAt);

    return this.prisma.auction.create({
      data: {
        productId: dto.productId || null,
        shopId: resolvedShopId,
        tenantId,
        title: dto.title,
        description: dto.description,
        imageUrls: dto.imageUrls || [],
        startingPrice: dto.startPrice,
        reservePrice: dto.reservePrice,
        currentPrice: dto.startPrice,
        bidIncrement: dto.bidIncrement,
        bidCount: 0,
        status: startsAt > now ? 'SCHEDULED' : 'LIVE',
        startsAt,
        endsAt: new Date(dto.endsAt),
        autoExtendOnBid: dto.autoExtendOnBid ?? true,
      },
    });
  }

  async cancel(tenantId: string, shopId: string | null | undefined, auctionId: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const a = await this.prisma.auction.findFirst({ where: { id: auctionId, shopId: resolvedShopId } });
    if (!a) throw new NotFoundException();

    return this.prisma.auction.update({
      where: { id: auctionId },
      data: { status: 'CANCELLED' },
    });
  }
}
