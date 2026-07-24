import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewsManageService {
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
    rating?: number;
    hasReply?: boolean;
    productId?: string;
    page?: number;
    limit?: number;
  }) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const page = opts.page || 1;
    const limit = opts.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { shopId: resolvedShopId, isHidden: false };
    if (opts.rating) where.rating = opts.rating;
    if (opts.hasReply === false) where.replyFromShop = null;
    if (opts.hasReply === true) where.replyFromShop = { not: null };
    if (opts.productId) where.productId = opts.productId;

    const [items, total] = await Promise.all([
      this.prisma.marketplaceReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          customer: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      }),
      this.prisma.marketplaceReview.count({ where }),
    ]);

    const [totalCount, unrespondedCount, avgResult, byStarStats] = await Promise.all([
      this.prisma.marketplaceReview.count({ where: { shopId: resolvedShopId, isHidden: false } }),
      this.prisma.marketplaceReview.count({ where: { shopId: resolvedShopId, isHidden: false, replyFromShop: null } }),
      this.prisma.marketplaceReview.aggregate({
        where: { shopId: resolvedShopId, isHidden: false },
        _avg: { rating: true },
      }),
      this.prisma.marketplaceReview.groupBy({
        by: ['rating'],
        where: { shopId: resolvedShopId, isHidden: false },
        _count: { _all: true },
      }),
    ]);

    const byStar: Record<number, number> = {};
    byStarStats.forEach((s) => { byStar[s.rating] = s._count._all; });

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts: {
        total: totalCount,
        unresponded: unrespondedCount,
        avgRating: avgResult._avg.rating || 0,
        byStar,
      },
    };
  }

  async reply(tenantId: string, shopId: string | null | undefined, reviewId: string, reply: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const review = await this.prisma.marketplaceReview.findFirst({
      where: { id: reviewId, shopId: resolvedShopId },
    });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.marketplaceReview.update({
      where: { id: reviewId },
      data: {
        replyFromShop: reply,
        replyAt: new Date(),
      },
    });
  }

  async hide(tenantId: string, shopId: string | null | undefined, reviewId: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const review = await this.prisma.marketplaceReview.findFirst({
      where: { id: reviewId, shopId: resolvedShopId },
    });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.marketplaceReview.update({
      where: { id: reviewId },
      data: { isHidden: true },
    });
  }

  async report(tenantId: string, shopId: string | null | undefined, reviewId: string, reason: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const review = await this.prisma.marketplaceReview.findFirst({
      where: { id: reviewId, shopId: resolvedShopId },
    });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.marketplaceReview.update({
      where: { id: reviewId },
      data: { unhelpfulCount: { increment: 1 } },
    });
  }
}
