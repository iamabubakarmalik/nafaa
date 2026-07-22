import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JoinGroupBuyDto } from './dto/join-group-buy.dto';
import { ListGroupBuysDto } from './dto/list-group-buys.dto';

@Injectable()
export class MarketplaceGroupBuyService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // LIST ACTIVE GROUP BUYS
  // ═══════════════════════════════════════════════════════════

  async listActive(dto: ListGroupBuysDto, customerId?: string) {
    const where: Prisma.GroupBuyWhereInput = {
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
      ...(dto.shopId ? { shopId: dto.shopId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.groupBuy.findMany({
        where,
        orderBy: [{ currentCount: 'desc' }, { expiresAt: 'asc' }],
        take: dto.limit ?? 20,
        skip: dto.offset ?? 0,
        include: {
          shop: {
            select: {
              id: true,
              marketplaceProfile: {
                select: { slug: true, publicName: true, logoUrl: true, city: true },
              },
            },
          },
        },
      }),
      this.prisma.groupBuy.count({ where }),
    ]);

    // Check which ones customer joined
    let joinedIds = new Set<string>();
    if (customerId && items.length) {
      const parts = await this.prisma.groupBuyParticipant.findMany({
        where: { customerId, groupBuyId: { in: items.map((i) => i.id) } },
        select: { groupBuyId: true, quantity: true },
      });
      joinedIds = new Set(parts.map((p) => p.groupBuyId));
    }

    return {
      items: items.map((g) => ({
        ...g,
        savingsPerUnit: Number(g.regularPrice) - Number(g.groupPrice),
        savingsPercent: Math.round(
          ((Number(g.regularPrice) - Number(g.groupPrice)) / Number(g.regularPrice)) * 100,
        ),
        progressPercent: Math.min(
          100,
          Math.round((g.currentCount / g.minParticipants) * 100),
        ),
        remainingToTarget: Math.max(0, g.minParticipants - g.currentCount),
        hasJoined: joinedIds.has(g.id),
        timeRemainingMs: g.expiresAt.getTime() - Date.now(),
      })),
      total,
      limit: dto.limit ?? 20,
      offset: dto.offset ?? 0,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // GET DETAIL
  // ═══════════════════════════════════════════════════════════

  async getDetail(groupBuyId: string, customerId?: string) {
    const gb = await this.prisma.groupBuy.findUnique({
      where: { id: groupBuyId },
      include: {
        shop: {
          select: {
            id: true,
            marketplaceProfile: {
              select: {
                slug: true, publicName: true, logoUrl: true,
                city: true, ratingAverage: true, ratingCount: true,
              },
            },
          },
        },
        participants: {
          take: 20,
          orderBy: { joinedAt: 'desc' },
          include: {
            customer: { select: { fullName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!gb) throw new NotFoundException('Group buy not found');

    const myParticipation = customerId
      ? await this.prisma.groupBuyParticipant.findUnique({
          where: {
            groupBuyId_customerId: { groupBuyId, customerId },
          },
        })
      : null;

    return {
      ...gb,
      savingsPerUnit: Number(gb.regularPrice) - Number(gb.groupPrice),
      savingsPercent: Math.round(
        ((Number(gb.regularPrice) - Number(gb.groupPrice)) / Number(gb.regularPrice)) * 100,
      ),
      progressPercent: Math.min(100, Math.round((gb.currentCount / gb.minParticipants) * 100)),
      remainingToTarget: Math.max(0, gb.minParticipants - gb.currentCount),
      timeRemainingMs: gb.expiresAt.getTime() - Date.now(),
      hasJoined: !!myParticipation,
      myQuantity: myParticipation?.quantity ?? 0,
      canJoin: gb.status === 'ACTIVE'
        && gb.expiresAt > new Date()
        && (!gb.maxParticipants || gb.currentCount < gb.maxParticipants),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // JOIN GROUP BUY
  // ═══════════════════════════════════════════════════════════

  async join(customerId: string, groupBuyId: string, dto: JoinGroupBuyDto) {
    const gb = await this.prisma.groupBuy.findUnique({ where: { id: groupBuyId } });
    if (!gb) throw new NotFoundException('Group buy not found');
    if (gb.status !== 'ACTIVE') throw new BadRequestException('Group buy active nahi hai');
    if (gb.expiresAt < new Date()) throw new BadRequestException('Group buy expire ho gaya');

    const qty = dto.quantity ?? 1;
    if (gb.maxParticipants && gb.currentCount + qty > gb.maxParticipants) {
      throw new BadRequestException('Group buy is full');
    }

    // Add product to cart at group price (via CartLine with groupBuyId)
    const result = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.marketplaceCart.upsert({
        where: { customerId }, update: {}, create: { customerId },
      });

      const existing = await tx.groupBuyParticipant.findUnique({
        where: { groupBuyId_customerId: { groupBuyId, customerId } },
      });

      if (existing) {
        await tx.groupBuyParticipant.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + qty,
            amount: new Prisma.Decimal(Number(gb.groupPrice) * (existing.quantity + qty)),
          },
        });
      } else {
        await tx.groupBuyParticipant.create({
          data: {
            groupBuyId,
            customerId,
            quantity: qty,
            amount: new Prisma.Decimal(Number(gb.groupPrice) * qty),
          },
        });
      }

      const updated = await tx.groupBuy.update({
        where: { id: groupBuyId },
        data: { currentCount: { increment: qty } },
      });

      // Add to cart with group buy link
      await tx.marketplaceCartLine.create({
        data: {
          cartId: cart.id,
          shopId: gb.shopId,
          productId: gb.productId,
          variantId: gb.variantId,
          productName: gb.productName,
          imageUrl: gb.imageUrl,
          unitPrice: gb.groupPrice,
          quantity: qty,
          groupBuyId: gb.id,
        },
      });

      // Check if target hit
      if (updated.currentCount >= updated.minParticipants && !updated.reachedTargetAt) {
        await tx.groupBuy.update({
          where: { id: groupBuyId },
          data: {
            reachedTargetAt: new Date(),
            status: 'SUCCESS',
          },
        });
      }

      return updated;
    });

    return {
      success: true,
      groupBuy: result,
      message: `Group buy join ho gaya! Cart mein check karain.`,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // LEAVE GROUP BUY (before it succeeds)
  // ═══════════════════════════════════════════════════════════

  async leave(customerId: string, groupBuyId: string) {
    const participation = await this.prisma.groupBuyParticipant.findUnique({
      where: { groupBuyId_customerId: { groupBuyId, customerId } },
    });
    if (!participation) throw new NotFoundException('Aap ne join nahi kiya');

    if (participation.orderId) {
      throw new BadRequestException('Order create ho chuka hai — leave nahi kar sakte');
    }

    const gb = await this.prisma.groupBuy.findUnique({ where: { id: groupBuyId } });
    if (!gb) throw new NotFoundException();
    if (gb.status === 'SUCCESS') {
      throw new BadRequestException('Group already succeeded — leave nahi ho sakta');
    }

    await this.prisma.$transaction([
      this.prisma.groupBuy.update({
        where: { id: groupBuyId },
        data: { currentCount: { decrement: participation.quantity } },
      }),
      this.prisma.groupBuyParticipant.delete({
        where: { id: participation.id },
      }),
      this.prisma.marketplaceCartLine.deleteMany({
        where: {
          cart: { customerId },
          groupBuyId,
        },
      }),
    ]);

    return { success: true, message: 'Group buy leave kar diya' };
  }

  // ═══════════════════════════════════════════════════════════
  // MY GROUP BUYS
  // ═══════════════════════════════════════════════════════════

  async myGroupBuys(customerId: string, limit = 20, offset = 0) {
    const participations = await this.prisma.groupBuyParticipant.findMany({
      where: { customerId },
      orderBy: { joinedAt: 'desc' },
      take: limit, skip: offset,
      include: {
        groupBuy: {
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
        },
      },
    });
    const total = await this.prisma.groupBuyParticipant.count({ where: { customerId } });
    return { items: participations, total, limit, offset };
  }
}
