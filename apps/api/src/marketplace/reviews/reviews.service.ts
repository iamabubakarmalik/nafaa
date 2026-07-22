import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReviewType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ListMyReviewsDto } from './dto/list-my-reviews.dto';

@Injectable()
export class MarketplaceReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // CREATE REVIEW (product / shop / rider / order)
  // ═══════════════════════════════════════════════════════════

  async createReview(customerId: string, dto: CreateReviewDto) {
    // Validate the required target based on type
    if (dto.reviewType === 'PRODUCT' && !dto.productId) {
      throw new BadRequestException('productId is required for PRODUCT review');
    }
    if (dto.reviewType === 'SHOP' && !dto.shopId) {
      throw new BadRequestException('shopId is required for SHOP review');
    }
    if (dto.reviewType === 'RIDER' && !dto.riderId) {
      throw new BadRequestException('riderId is required for RIDER review');
    }
    if (dto.reviewType === 'ORDER' && !dto.orderId) {
      throw new BadRequestException('orderId is required for ORDER review');
    }

    // Verify order ownership + delivered status if orderId provided
    let isVerifiedPurchase = false;
    if (dto.orderId) {
      const order = await this.prisma.marketplaceOrder.findFirst({
        where: { id: dto.orderId, customerId },
        include: { items: true },
      });
      if (!order) throw new NotFoundException('Order not found or does not belong to you');
      if (order.status !== 'DELIVERED') {
        throw new BadRequestException('Can only review delivered orders');
      }
      isVerifiedPurchase = true;

      // For PRODUCT review from order — check product was actually in the order
      if (dto.reviewType === 'PRODUCT' && dto.productId) {
        const inOrder = order.items.some((i) => i.productId === dto.productId);
        if (!inOrder) throw new BadRequestException('Product was not in this order');
      }
      // For SHOP review from order — force shopId to match order
      if (dto.reviewType === 'SHOP') {
        dto.shopId = order.shopId;
      }
    }

    // Prevent duplicate review (per customer per target)
    const dupWhere: Prisma.MarketplaceReviewWhereInput = {
      customerId,
      reviewType: dto.reviewType,
    };
    if (dto.productId) dupWhere.productId = dto.productId;
    if (dto.shopId) dupWhere.shopId = dto.shopId;
    if (dto.riderId) dupWhere.riderId = dto.riderId;
    if (dto.orderId) dupWhere.orderId = dto.orderId;

    const existing = await this.prisma.marketplaceReview.findFirst({ where: dupWhere });
    if (existing) {
      throw new BadRequestException('Aap ne pehle se review kar diya hai — edit karain');
    }

    // Create + update denormalized ratings
    const txResult = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.marketplaceReview.create({
        data: {
          customerId,
          reviewType: dto.reviewType,
          orderId: dto.orderId,
          productId: dto.productId,
          shopId: dto.shopId,
          riderId: dto.riderId,
          rating: dto.rating,
          title: dto.title,
          comment: dto.comment,
          imageUrls: dto.imageUrls ?? [],
          videoUrl: dto.videoUrl,
          qualityRating: dto.qualityRating,
          packagingRating: dto.packagingRating,
          deliveryRating: dto.deliveryRating,
          valueRating: dto.valueRating,
          isVerifiedPurchase,
        },
      });

      // Update product rating
      if (dto.productId) {
        const agg = await tx.marketplaceReview.aggregate({
          where: {
            productId: dto.productId,
            reviewType: 'PRODUCT',
            isApproved: true,
            isHidden: false,
          },
          _avg: { rating: true },
          _count: { rating: true },
        });
        await tx.productMarketplaceProfile.update({
          where: { productId: dto.productId },
          data: {
            ratingAverage: agg._avg.rating ?? 0,
            ratingCount: agg._count.rating,
          },
        });
      }

      // Update shop rating
      if (dto.shopId) {
        const agg = await tx.marketplaceReview.aggregate({
          where: {
            shopId: dto.shopId,
            reviewType: 'SHOP',
            isApproved: true,
            isHidden: false,
          },
          _avg: { rating: true },
          _count: { rating: true },
        });
        await tx.shopMarketplaceProfile.update({
          where: { shopId: dto.shopId },
          data: {
            ratingAverage: agg._avg.rating ?? 0,
            ratingCount: agg._count.rating,
          },
        });
      }

      // If this review came from an order, mark it rated
      if (dto.orderId) {
        await tx.marketplaceOrder.update({
          where: { id: dto.orderId },
          data: {
            isRated: true,
            ...(dto.reviewType === 'SHOP' ? { shopRating: dto.rating } : {}),
            ...(dto.reviewType === 'RIDER' ? { riderRating: dto.rating } : {}),
          },
        });
      }

      // Award loyalty (2 pts for text, 5 for photo/video)
      const points = dto.imageUrls?.length || dto.videoUrl ? 5 : 2;
      await tx.marketplaceCustomer.update({
        where: { id: customerId },
        data: { loyaltyPoints: { increment: points } },
      });

      return { review: created, pointsEarned: points };
    });

    return {
      success: true,
      review: txResult.review,
      pointsEarned: txResult.pointsEarned,
      message: `Shukriya! ${txResult.pointsEarned} loyalty points earned`,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // UPDATE REVIEW (only within 30 days)
  // ═══════════════════════════════════════════════════════════

  async updateReview(customerId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.marketplaceReview.findFirst({
      where: { id: reviewId, customerId },
    });
    if (!review) throw new NotFoundException('Review not found');

    const daysSince = (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 30) {
      throw new BadRequestException('Reviews can only be edited within 30 days');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.marketplaceReview.update({
        where: { id: reviewId },
        data: {
          rating: dto.rating,
          title: dto.title,
          comment: dto.comment,
          imageUrls: dto.imageUrls,
          videoUrl: dto.videoUrl,
          qualityRating: dto.qualityRating,
          packagingRating: dto.packagingRating,
          deliveryRating: dto.deliveryRating,
          valueRating: dto.valueRating,
        },
      });

      // Recompute denormalized ratings if rating changed
      if (dto.rating !== undefined && dto.rating !== review.rating) {
        if (review.productId) {
          const agg = await tx.marketplaceReview.aggregate({
            where: { productId: review.productId, reviewType: 'PRODUCT', isApproved: true, isHidden: false },
            _avg: { rating: true },
            _count: { rating: true },
          });
          await tx.productMarketplaceProfile.update({
            where: { productId: review.productId },
            data: {
              ratingAverage: agg._avg.rating ?? 0,
              ratingCount: agg._count.rating,
            },
          });
        }
        if (review.shopId) {
          const agg = await tx.marketplaceReview.aggregate({
            where: { shopId: review.shopId, reviewType: 'SHOP', isApproved: true, isHidden: false },
            _avg: { rating: true },
            _count: { rating: true },
          });
          await tx.shopMarketplaceProfile.update({
            where: { shopId: review.shopId },
            data: {
              ratingAverage: agg._avg.rating ?? 0,
              ratingCount: agg._count.rating,
            },
          });
        }
      }
      return u;
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════
  // DELETE REVIEW
  // ═══════════════════════════════════════════════════════════

  async deleteReview(customerId: string, reviewId: string) {
    const review = await this.prisma.marketplaceReview.findFirst({
      where: { id: reviewId, customerId },
    });
    if (!review) throw new NotFoundException('Review not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.marketplaceReview.delete({ where: { id: reviewId } });

      if (review.productId) {
        const agg = await tx.marketplaceReview.aggregate({
          where: { productId: review.productId, reviewType: 'PRODUCT', isApproved: true, isHidden: false },
          _avg: { rating: true },
          _count: { rating: true },
        });
        await tx.productMarketplaceProfile.update({
          where: { productId: review.productId },
          data: {
            ratingAverage: agg._avg.rating ?? 0,
            ratingCount: agg._count.rating,
          },
        });
      }
      if (review.shopId) {
        const agg = await tx.marketplaceReview.aggregate({
          where: { shopId: review.shopId, reviewType: 'SHOP', isApproved: true, isHidden: false },
          _avg: { rating: true },
          _count: { rating: true },
        });
        await tx.shopMarketplaceProfile.update({
          where: { shopId: review.shopId },
          data: {
            ratingAverage: agg._avg.rating ?? 0,
            ratingCount: agg._count.rating,
          },
        });
      }

      if (review.orderId) {
        await tx.marketplaceOrder.update({
          where: { id: review.orderId },
          data: { isRated: false },
        });
      }
    });

    return { success: true, message: 'Review deleted' };
  }

  // ═══════════════════════════════════════════════════════════
  // MY REVIEWS
  // ═══════════════════════════════════════════════════════════

  async myReviews(customerId: string, dto: ListMyReviewsDto) {
    const where: Prisma.MarketplaceReviewWhereInput = { customerId };
    if (dto.reviewType) where.reviewType = dto.reviewType;

    const [items, total, stats] = await Promise.all([
      this.prisma.marketplaceReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: dto.limit ?? 20,
        skip: dto.offset ?? 0,
        include: {
          productProfile: {
            select: {
              productId: true, publicName: true, publicImages: true, publicPrice: true,
            },
          },
          shopProfile: {
            select: {
              shopId: true, slug: true, publicName: true, logoUrl: true,
            },
          },
        },
      }),
      this.prisma.marketplaceReview.count({ where }),
      this.prisma.marketplaceReview.groupBy({
        by: ['reviewType'],
        where: { customerId },
        _count: { reviewType: true },
      }),
    ]);

    const typeCounts: Record<string, number> = { PRODUCT: 0, SHOP: 0, RIDER: 0, ORDER: 0 };
    stats.forEach((s) => (typeCounts[s.reviewType] = s._count.reviewType));

    return {
      items,
      total,
      limit: dto.limit ?? 20,
      offset: dto.offset ?? 0,
      counts: typeCounts,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // GET REVIEW (public)
  // ═══════════════════════════════════════════════════════════

  async getReview(reviewId: string, customerId?: string) {
    const review = await this.prisma.marketplaceReview.findUnique({
      where: { id: reviewId },
      include: {
        customer: { select: { id: true, fullName: true, avatarUrl: true } },
        productProfile: {
          select: {
            productId: true, publicName: true, publicImages: true, publicPrice: true,
          },
        },
        shopProfile: {
          select: {
            shopId: true, slug: true, publicName: true, logoUrl: true,
          },
        },
        votes: customerId ? { where: { customerId }, select: { isHelpful: true } } : false,
      },
    });
    if (!review || !review.isApproved || review.isHidden) {
      throw new NotFoundException('Review not found');
    }
    return {
      ...review,
      myVote: (review as any).votes?.[0]?.isHelpful ?? null,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // VOTE ON REVIEW (helpful / unhelpful)
  // ═══════════════════════════════════════════════════════════

  async voteReview(customerId: string, reviewId: string, isHelpful: boolean) {
    const review = await this.prisma.marketplaceReview.findUnique({
      where: { id: reviewId },
    });
    if (!review || !review.isApproved || review.isHidden) {
      throw new NotFoundException('Review not found');
    }
    if (review.customerId === customerId) {
      throw new BadRequestException('Aap apne review pe vote nahi kar sakte');
    }

    const existing = await this.prisma.reviewVote.findUnique({
      where: { reviewId_customerId: { reviewId, customerId } },
    });

    await this.prisma.$transaction(async (tx) => {
      if (existing) {
        if (existing.isHelpful === isHelpful) {
          // Same vote — remove (toggle off)
          await tx.reviewVote.delete({
            where: { reviewId_customerId: { reviewId, customerId } },
          });
          await tx.marketplaceReview.update({
            where: { id: reviewId },
            data: {
              helpfulCount: isHelpful ? { decrement: 1 } : undefined,
              unhelpfulCount: !isHelpful ? { decrement: 1 } : undefined,
            },
          });
        } else {
          // Switch vote
          await tx.reviewVote.update({
            where: { reviewId_customerId: { reviewId, customerId } },
            data: { isHelpful },
          });
          await tx.marketplaceReview.update({
            where: { id: reviewId },
            data: {
              helpfulCount: isHelpful ? { increment: 1 } : { decrement: 1 },
              unhelpfulCount: isHelpful ? { decrement: 1 } : { increment: 1 },
            },
          });
        }
      } else {
        // New vote
        await tx.reviewVote.create({
          data: { reviewId, customerId, isHelpful },
        });
        await tx.marketplaceReview.update({
          where: { id: reviewId },
          data: {
            helpfulCount: isHelpful ? { increment: 1 } : undefined,
            unhelpfulCount: !isHelpful ? { increment: 1 } : undefined,
          },
        });
      }
    });

    const updated = await this.prisma.marketplaceReview.findUnique({
      where: { id: reviewId },
      select: { helpfulCount: true, unhelpfulCount: true },
    });
    return { success: true, ...updated };
  }

  // ═══════════════════════════════════════════════════════════
  // REPORT REVIEW (for moderation)
  // ═══════════════════════════════════════════════════════════

  async reportReview(customerId: string, reviewId: string, reason: string) {
    const review = await this.prisma.marketplaceReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');

    // Simple flagging — in production would be a separate reports table
    await this.prisma.customerNotification.create({
      data: {
        customerId,
        type: 'REVIEW_REPORTED',
        title: 'Review report received',
        body: `Shukriya, aapki report humein mil gayi. Team review karegi.`,
        data: { reviewId, reason },
      },
    });

    return { success: true, message: 'Report submitted for moderation' };
  }

  // ═══════════════════════════════════════════════════════════
  // PENDING REVIEWS (delivered orders not yet reviewed)
  // ═══════════════════════════════════════════════════════════

  async getPendingReviews(customerId: string) {
    const orders = await this.prisma.marketplaceOrder.findMany({
      where: {
        customerId,
        status: 'DELIVERED',
        isRated: false,
        actualDeliveryAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { actualDeliveryAt: 'desc' },
      select: {
        id: true, orderNumber: true, total: true, actualDeliveryAt: true, shopId: true,
        items: {
          take: 4,
          select: {
            productId: true, productName: true, imageUrl: true, quantity: true,
          },
        },
        shop: {
          select: {
            id: true,
            marketplaceProfile: {
              select: { publicName: true, logoUrl: true, slug: true },
            },
          },
        },
      },
    });

    return { items: orders, count: orders.length };
  }
}
