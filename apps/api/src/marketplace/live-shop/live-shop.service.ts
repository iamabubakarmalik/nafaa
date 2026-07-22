import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListLiveShopsDto } from './dto/list-live-shops.dto';
import { SendLiveMessageDto } from './dto/send-message.dto';

@Injectable()
export class MarketplaceLiveShopService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // LIST (live now + upcoming)
  // ═══════════════════════════════════════════════════════════

  async list(dto: ListLiveShopsDto) {
    const where: Prisma.LiveShopWhereInput = {};
    if (dto.shopId) where.shopId = dto.shopId;
    if (dto.status) where.status = dto.status;
    else where.status = { in: ['LIVE', 'SCHEDULED'] };

    const [items, total] = await Promise.all([
      this.prisma.liveShop.findMany({
        where,
        orderBy: [
          { status: 'asc' },
          { peakViewerCount: 'desc' },
          { scheduledAt: 'asc' },
        ],
        take: dto.limit ?? 20,
        skip: dto.offset ?? 0,
        include: {
          shopProfile: {
            select: {
              slug: true, publicName: true, logoUrl: true,
              ratingAverage: true, ratingCount: true,
            },
          },
        },
      }),
      this.prisma.liveShop.count({ where }),
    ]);

    return {
      items: items.map((ls) => ({
        ...ls,
        isLive: ls.status === 'LIVE',
        isStartingSoon: ls.status === 'SCHEDULED'
          && ls.scheduledAt
          && ls.scheduledAt.getTime() - Date.now() < 30 * 60 * 1000,
      })),
      total,
      limit: dto.limit ?? 20,
      offset: dto.offset ?? 0,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // DETAIL — with featured products loaded
  // ═══════════════════════════════════════════════════════════

  async getDetail(liveShopId: string, customerId?: string) {
    const ls = await this.prisma.liveShop.findUnique({
      where: { id: liveShopId },
      include: {
        shopProfile: {
          select: {
            shopId: true, slug: true, publicName: true, logoUrl: true, coverUrl: true,
            city: true, ratingAverage: true, ratingCount: true, followerCount: true,
            verificationLevel: true,
          },
        },
      },
    });
    if (!ls) throw new NotFoundException('Live show not found');

    // Featured products
    const featuredProducts = ls.featuredProductIds.length
      ? await this.prisma.productMarketplaceProfile.findMany({
          where: {
            productId: { in: ls.featuredProductIds },
            isListedOnMarketplace: true,
          },
          select: {
            productId: true, publicName: true, publicPrice: true, compareAtPrice: true,
            publicImages: true, ratingAverage: true, ratingCount: true, totalSold: true,
            bargainEnabled: true, groupBuyEnabled: true,
          },
        })
      : [];

    // Recent messages (last 50)
    const recentMessages = await this.prisma.liveShopMessage.findMany({
      where: { liveShopId, isHidden: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        customer: { select: { fullName: true, avatarUrl: true } },
      },
    });

    // Am I watching?
    const isViewer = customerId
      ? await this.prisma.liveShopViewer.findUnique({
          where: {
            liveShopId_customerId: { liveShopId, customerId },
          },
        })
      : null;

    return {
      ...ls,
      isLive: ls.status === 'LIVE',
      hasEnded: ls.status === 'ENDED',
      featuredProducts,
      recentMessages: recentMessages.reverse(),
      isJoined: !!isViewer && !isViewer.leftAt,
      currentViewerCount: await this.prisma.liveShopViewer.count({
        where: { liveShopId, leftAt: null },
      }),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // JOIN AS VIEWER
  // ═══════════════════════════════════════════════════════════

  async join(customerId: string, liveShopId: string) {
    const ls = await this.prisma.liveShop.findUnique({ where: { id: liveShopId } });
    if (!ls) throw new NotFoundException('Live show not found');
    if (ls.status !== 'LIVE') throw new BadRequestException('Stream live nahi hai abhi');

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.liveShopViewer.findUnique({
        where: { liveShopId_customerId: { liveShopId, customerId } },
      });

      if (existing) {
        await tx.liveShopViewer.update({
          where: { id: existing.id },
          data: { leftAt: null, joinedAt: new Date() },
        });
      } else {
        await tx.liveShopViewer.create({
          data: { liveShopId, customerId },
        });
        await tx.liveShop.update({
          where: { id: liveShopId },
          data: {
            totalViewers: { increment: 1 },
            peakViewerCount: { increment: 0 }, // will bump below if needed
          },
        });
      }

      // Update peak viewer count
      const current = await tx.liveShopViewer.count({
        where: { liveShopId, leftAt: null },
      });
      if (current > ls.peakViewerCount) {
        await tx.liveShop.update({
          where: { id: liveShopId },
          data: { peakViewerCount: current },
        });
      }
    });

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // LEAVE
  // ═══════════════════════════════════════════════════════════

  async leave(customerId: string, liveShopId: string) {
    const viewer = await this.prisma.liveShopViewer.findUnique({
      where: { liveShopId_customerId: { liveShopId, customerId } },
    });
    if (!viewer || viewer.leftAt) return { success: true, alreadyLeft: true };

    const watchTime = Math.round((Date.now() - viewer.joinedAt.getTime()) / 1000);
    await this.prisma.liveShopViewer.update({
      where: { id: viewer.id },
      data: {
        leftAt: new Date(),
        watchTimeSec: { increment: watchTime },
      },
    });

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // SEND CHAT MESSAGE
  // ═══════════════════════════════════════════════════════════

  async sendMessage(customerId: string, liveShopId: string, dto: SendLiveMessageDto) {
    const ls = await this.prisma.liveShop.findUnique({ where: { id: liveShopId } });
    if (!ls) throw new NotFoundException('Live show not found');
    if (ls.status !== 'LIVE') throw new BadRequestException('Stream live nahi hai');

    // Rate limit: 5 messages per 10 seconds
    const recent = await this.prisma.liveShopMessage.count({
      where: {
        customerId,
        liveShopId,
        createdAt: { gt: new Date(Date.now() - 10 * 1000) },
      },
    });
    if (recent >= 5) {
      throw new BadRequestException('Slow down — bohat tez messages');
    }

    const msg = await this.prisma.$transaction(async (tx) => {
      const m = await tx.liveShopMessage.create({
        data: {
          liveShopId,
          senderType: 'CUSTOMER',
          customerId,
          message: dto.message,
        },
        include: {
          customer: { select: { fullName: true, avatarUrl: true } },
        },
      });
      await tx.liveShop.update({
        where: { id: liveShopId },
        data: { totalMessages: { increment: 1 } },
      });
      return m;
    });

    return msg;
  }

  // ═══════════════════════════════════════════════════════════
  // GET MESSAGES (poll for chat)
  // ═══════════════════════════════════════════════════════════

  async getMessages(liveShopId: string, sinceMessageId?: string, limit = 50) {
    const where: Prisma.LiveShopMessageWhereInput = {
      liveShopId, isHidden: false,
    };
    if (sinceMessageId) {
      const anchor = await this.prisma.liveShopMessage.findUnique({
        where: { id: sinceMessageId }, select: { createdAt: true },
      });
      if (anchor) where.createdAt = { gt: anchor.createdAt };
    }
    return this.prisma.liveShopMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        customer: { select: { fullName: true, avatarUrl: true } },
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // UPCOMING LIVE SHOWS (schedule)
  // ═══════════════════════════════════════════════════════════

  async getSchedule(limit = 20) {
    return this.prisma.liveShop.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { gt: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
      include: {
        shopProfile: {
          select: {
            slug: true, publicName: true, logoUrl: true,
          },
        },
      },
    });
  }
}
