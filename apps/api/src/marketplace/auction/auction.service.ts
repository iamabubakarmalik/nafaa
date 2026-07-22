import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuctionStatus, Prisma } from '@prisma/client';
import { addMinutes } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { PlaceBidDto } from './dto/place-bid.dto';
import { ListAuctionsDto } from './dto/list-auctions.dto';

const ANTI_SNIPE_EXTEND_MINUTES = 2;

@Injectable()
export class MarketplaceAuctionService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // LIST AUCTIONS
  // ═══════════════════════════════════════════════════════════

  async list(dto: ListAuctionsDto) {
    const where: Prisma.AuctionWhereInput = {};
    if (dto.shopId) where.shopId = dto.shopId;
    if (dto.status) where.status = dto.status;
    else where.status = { in: ['LIVE', 'SCHEDULED'] };

    const [items, total] = await Promise.all([
      this.prisma.auction.findMany({
        where,
        orderBy: [{ status: 'asc' }, { endsAt: 'asc' }],
        take: dto.limit ?? 20,
        skip: dto.offset ?? 0,
        include: {
          shop: {
            select: {
              id: true,
              marketplaceProfile: {
                select: { slug: true, publicName: true, logoUrl: true },
              },
            },
          },
        },
      }),
      this.prisma.auction.count({ where }),
    ]);

    return {
      items: items.map((a) => ({
        ...a,
        timeRemainingMs: Math.max(0, a.endsAt.getTime() - Date.now()),
        isLive: a.status === 'LIVE',
        isStartingSoon: a.status === 'SCHEDULED' && a.startsAt.getTime() - Date.now() < 3600000,
      })),
      total,
      limit: dto.limit ?? 20,
      offset: dto.offset ?? 0,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // DETAIL
  // ═══════════════════════════════════════════════════════════

  async getDetail(auctionId: string, customerId?: string) {
    const a = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        shop: {
          select: {
            id: true,
            marketplaceProfile: {
              select: {
                slug: true, publicName: true, logoUrl: true,
                ratingAverage: true, ratingCount: true, verificationLevel: true,
              },
            },
          },
        },
        bids: {
          orderBy: { amount: 'desc' },
          take: 20,
          include: {
            customer: {
              select: {
                id: true, fullName: true, avatarUrl: true,
              },
            },
          },
        },
      },
    });
    if (!a) throw new NotFoundException('Auction not found');

    const myBids = customerId
      ? a.bids.filter((b) => b.customerId === customerId)
      : [];
    const highestBid = a.bids[0];
    const isWinning = customerId && highestBid?.customerId === customerId;

    return {
      ...a,
      timeRemainingMs: Math.max(0, a.endsAt.getTime() - Date.now()),
      isLive: a.status === 'LIVE',
      hasEnded: a.status === 'ENDED' || a.endsAt < new Date(),
      nextMinBid: Number(a.currentPrice) + Number(a.bidIncrement),
      myBidsCount: myBids.length,
      isWinning,
      isWinner: a.winnerId === customerId,
      canBid: a.status === 'LIVE' && a.endsAt > new Date(),
      // Mask customer names for privacy (only show first name)
      bids: a.bids.map((b) => ({
        ...b,
        customer: {
          id: b.customer.id,
          fullName: b.customer.fullName.split(' ')[0] + ' ***',
          avatarUrl: b.customer.avatarUrl,
        },
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PLACE BID
  // ═══════════════════════════════════════════════════════════

  async placeBid(customerId: string, auctionId: string, dto: PlaceBidDto) {
    const auction = await this.prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) throw new NotFoundException('Auction not found');
    if (auction.status !== 'LIVE') throw new BadRequestException('Auction live nahi hai');
    if (auction.endsAt < new Date()) throw new BadRequestException('Auction khatam ho gayi');

    const minBid = Number(auction.currentPrice) + Number(auction.bidIncrement);
    if (dto.amount < minBid) {
      throw new BadRequestException(
        `Minimum bid ${minBid.toFixed(0)} PKR honi chahiye`,
      );
    }
    if (dto.isAutoBid && (!dto.maxAutoBid || dto.maxAutoBid < dto.amount)) {
      throw new BadRequestException('Max auto-bid current amount se zyada honi chahiye');
    }

    // Check if last bid was by same customer (prevent self-outbidding)
    const lastBid = await this.prisma.auctionBid.findFirst({
      where: { auctionId, isRetracted: false },
      orderBy: { amount: 'desc' },
    });
    if (lastBid && lastBid.customerId === customerId) {
      throw new BadRequestException('Aap already highest bidder hain');
    }

    // Anti-snipe extend
    let extendedUntil: Date | null = null;
    const timeLeftMs = auction.endsAt.getTime() - Date.now();
    if (timeLeftMs < ANTI_SNIPE_EXTEND_MINUTES * 60 * 1000 && auction.autoExtendOnBid) {
      extendedUntil = addMinutes(new Date(), ANTI_SNIPE_EXTEND_MINUTES);
    }

    const bid = await this.prisma.$transaction(async (tx) => {
      const b = await tx.auctionBid.create({
        data: {
          auctionId,
          customerId,
          amount: new Prisma.Decimal(dto.amount),
          isAutoBid: dto.isAutoBid ?? false,
          maxAutoBid: dto.maxAutoBid ? new Prisma.Decimal(dto.maxAutoBid) : null,
        },
      });

      await tx.auction.update({
        where: { id: auctionId },
        data: {
          currentPrice: new Prisma.Decimal(dto.amount),
          bidCount: { increment: 1 },
          ...(extendedUntil ? { endsAt: extendedUntil, extendedUntil } : {}),
        },
      });

      return b;
    });

    return {
      success: true,
      bid,
      extendedUntil,
      message: extendedUntil
        ? `Bid place ho gaya! Auction 2 min extend ho gayi.`
        : `Bid place ho gaya!`,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // MY BIDS
  // ═══════════════════════════════════════════════════════════

  async myBids(customerId: string, limit = 20, offset = 0) {
    const [bids, total] = await Promise.all([
      this.prisma.auctionBid.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: limit, skip: offset,
        include: {
          auction: {
            select: {
              id: true, title: true, imageUrls: true,
              currentPrice: true, endsAt: true, status: true, winnerId: true,
            },
          },
        },
      }),
      this.prisma.auctionBid.count({ where: { customerId } }),
    ]);

    return {
      items: bids.map((b) => ({
        ...b,
        isWinning: b.auction.winnerId === customerId,
        isCurrentHighest: Number(b.amount) === Number(b.auction.currentPrice),
        auctionEnded: b.auction.status === 'ENDED',
      })),
      total, limit, offset,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // WATCHLIST (add/remove — via CustomerFollowsShop-like table would be better,
  // for MVP we reuse wishlist-like behavior on productId if auction has one)
  // ═══════════════════════════════════════════════════════════
  
  async myWins(customerId: string) {
    const wins = await this.prisma.auction.findMany({
      where: { winnerId: customerId, status: 'ENDED' },
      orderBy: { endsAt: 'desc' },
      include: {
        shop: {
          select: {
            id: true,
            marketplaceProfile: {
              select: { slug: true, publicName: true, logoUrl: true },
            },
          },
        },
      },
    });
    return { items: wins, count: wins.length };
  }
}
