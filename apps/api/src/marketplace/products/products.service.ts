import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchProductsDto } from './dto/search-products.dto';
import { ProductReviewsQueryDto } from './dto/product-reviews.dto';

@Injectable()
export class MarketplaceProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // SEARCH / LIST
  // ═══════════════════════════════════════════════════════════

  async search(dto: SearchProductsDto, customerId?: string) {
    const where: Prisma.ProductMarketplaceProfileWhereInput = {
      isListedOnMarketplace: true,
    };
    if (dto.inStockOnly !== false) where.isAvailable = true;
    if (dto.shopId) where.shopId = dto.shopId;
    if (dto.category) where.marketplaceCategory = dto.category;
    if (dto.subCategory) where.marketplaceSubCategory = dto.subCategory;
    if (dto.bargainEnabled) where.bargainEnabled = true;
    if (dto.groupBuyEnabled) where.groupBuyEnabled = true;
    if (dto.minRating !== undefined) where.ratingAverage = { gte: dto.minRating };
    if (dto.onDiscount) where.compareAtPrice = { not: null };
    if (dto.minPrice !== undefined) where.publicPrice = { gte: dto.minPrice };
    if (dto.maxPrice !== undefined) {
      where.publicPrice = { ...(where.publicPrice as any), lte: dto.maxPrice };
    }
    if (dto.q) {
      where.OR = [
        { publicName: { contains: dto.q, mode: 'insensitive' } },
        { publicDescription: { contains: dto.q, mode: 'insensitive' } },
        { tags: { has: dto.q.toLowerCase() } },
      ];
    }

    // Shop-level filters (city, free delivery) via marketplaceProfile of shop
    if (dto.city || dto.freeDelivery) {
      where.shop = {
        is: {
          marketplaceProfile: {
            is: {
              isListedOnMarketplace: true,
              isOpen: true,
              ...(dto.city ? { city: { equals: dto.city, mode: 'insensitive' } } : {}),
              ...(dto.freeDelivery ? { freeDeliveryAbove: { not: null } } : {}),
            },
          },
        },
      };
    }

    const orderBy: Prisma.ProductMarketplaceProfileOrderByWithRelationInput[] = (() => {
      switch (dto.sortBy) {
        case 'newest':      return [{ listedAt: 'desc' }];
        case 'price_asc':   return [{ publicPrice: 'asc' }];
        case 'price_desc':  return [{ publicPrice: 'desc' }];
        case 'rating':      return [{ ratingAverage: 'desc' }, { ratingCount: 'desc' }];
        case 'bestsellers': return [{ totalSold: 'desc' }];
        default:            return [{ ratingAverage: 'desc' }, { totalSold: 'desc' }];
      }
    })();

    const [items, total, categoryFacets] = await Promise.all([
      this.prisma.productMarketplaceProfile.findMany({
        where, orderBy,
        take: dto.limit ?? 24,
        skip: dto.offset ?? 0,
        select: {
          id: true, productId: true, shopId: true,
          publicName: true, publicDescription: true,
          publicPrice: true, compareAtPrice: true,
          publicImages: true, marketplaceCategory: true, marketplaceSubCategory: true,
          tags: true, isAvailable: true,
          totalSold: true, ratingAverage: true, ratingCount: true, viewCount: true,
          bargainEnabled: true, groupBuyEnabled: true, auctionEnabled: true,
          shop: {
            select: {
              id: true,
              marketplaceProfile: {
                select: {
                  shopId: true, slug: true, publicName: true, logoUrl: true,
                  city: true, area: true, verificationLevel: true,
                  deliveryFee: true, freeDeliveryAbove: true,
                  estimatedDeliveryMinutes: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.productMarketplaceProfile.count({ where }),
      this.prisma.productMarketplaceProfile.groupBy({
        by: ['marketplaceCategory'],
        where: { ...where, marketplaceCategory: { not: null } },
        _count: { marketplaceCategory: true },
        orderBy: { _count: { marketplaceCategory: 'desc' } },
        take: 20,
      }),
    ]);

    // Record search query
    if (dto.q && customerId) {
      this.prisma.customerSearchHistory
        .create({ data: { customerId, query: dto.q, resultCount: total, filters: dto as any } })
        .catch(() => {});
    }

    // Enrich wishlist status
    let inWishlist = new Set<string>();
    if (customerId && items.length) {
      const wish = await this.prisma.wishlistItem.findMany({
        where: { customerId, productId: { in: items.map((i) => i.productId) } },
        select: { productId: true },
      });
      inWishlist = new Set(wish.map((w) => w.productId));
    }

    return {
      items: items.map((i) => ({ ...i, isInWishlist: inWishlist.has(i.productId) })),
      total,
      limit: dto.limit ?? 24,
      offset: dto.offset ?? 0,
      facets: {
        categories: categoryFacets.map((c) => ({
          name: c.marketplaceCategory,
          count: c._count.marketplaceCategory,
        })),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PRODUCT DETAIL
  // ═══════════════════════════════════════════════════════════

  async getProductDetail(productId: string, customerId?: string) {
    const profile = await this.prisma.productMarketplaceProfile.findUnique({
      where: { productId },
      include: {
        product: {
          include: {
            variants: {
              where: { isActive: true },
              select: {
                id: true, name: true, sku: true, barcode: true,
                price: true,
              },
            },
            images: {
              orderBy: { sortOrder: 'asc' },
              select: { url: true, alt: true, isPrimary: true },
            },
            brand: { select: { id: true, name: true, logoUrl: true } },
          },
        },
        shop: {
          select: {
            id: true,
            marketplaceProfile: {
              select: {
                shopId: true, slug: true, publicName: true, tagline: true,
                logoUrl: true, coverUrl: true, city: true, area: true,
                industry: true, verificationLevel: true,
                ratingAverage: true, ratingCount: true, totalOrders: true, followerCount: true,
                offersDelivery: true, offersPickup: true, deliveryFee: true,
                freeDeliveryAbove: true, minOrderAmount: true,
                estimatedDeliveryMinutes: true,
                acceptsCod: true, acceptsCard: true, acceptsJazzcash: true,
                acceptsEasypaisa: true, acceptsRaast: true, acceptsWallet: true,
                bargainEnabled: true, bargainMinPercent: true,
                groupBuyEnabled: true, liveShopEnabled: true,
              },
            },
          },
        },
      },
    });

    if (!profile || !profile.isListedOnMarketplace) {
      throw new NotFoundException('Product not found');
    }

    // View tracking (fire-and-forget)
    this.prisma.productMarketplaceProfile
      .update({ where: { productId }, data: { viewCount: { increment: 1 } } })
      .catch(() => {});
    this.prisma.productView
      .create({
        data: {
          customerId, productId, shopId: profile.shopId,
          source: 'detail',
        },
      })
      .catch(() => {});

    // Related / activity
    const [reviews, related, activeGroupBuy, activeAuction, inWishlist, isFollowingShop] =
      await Promise.all([
        this.prisma.marketplaceReview.findMany({
          where: {
            productId, isApproved: true, isHidden: false, reviewType: 'PRODUCT',
          },
          orderBy: [{ helpfulCount: 'desc' }, { createdAt: 'desc' }],
          take: 5,
          select: {
            id: true, rating: true, title: true, comment: true,
            imageUrls: true, videoUrl: true,
            isVerifiedPurchase: true, helpfulCount: true,
            replyFromShop: true, replyAt: true, createdAt: true,
            customer: { select: { fullName: true, avatarUrl: true } },
          },
        }),
        this.prisma.productMarketplaceProfile.findMany({
          where: {
            isListedOnMarketplace: true, isAvailable: true,
            productId: { not: productId },
            OR: [
              { marketplaceCategory: profile.marketplaceCategory ?? undefined },
              { shopId: profile.shopId },
            ],
          },
          orderBy: [{ ratingAverage: 'desc' }, { totalSold: 'desc' }],
          take: 12,
          select: {
            productId: true, publicName: true, publicPrice: true, compareAtPrice: true,
            publicImages: true, ratingAverage: true, ratingCount: true,
          },
        }),
        this.prisma.groupBuy.findFirst({
          where: { productId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
          orderBy: { currentCount: 'desc' },
          select: {
            id: true, groupPrice: true, regularPrice: true,
            minParticipants: true, currentCount: true, expiresAt: true,
          },
        }),
        this.prisma.auction.findFirst({
          where: { productId, status: 'LIVE' },
          select: {
            id: true, title: true, currentPrice: true, bidCount: true,
            startsAt: true, endsAt: true,
          },
        }),
        customerId
          ? this.prisma.wishlistItem.findUnique({
              where: { customerId_productId: { customerId, productId } },
            })
          : null,
        customerId
          ? this.prisma.customerFollowsShop.findUnique({
              where: { customerId_shopId: { customerId, shopId: profile.shopId } },
            })
          : null,
      ]);

    return {
      ...profile,
      reviews,
      related,
      activeGroupBuy,
      activeAuction,
      isInWishlist: !!inWishlist,
      isFollowingShop: !!isFollowingShop,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PRODUCT REVIEWS
  // ═══════════════════════════════════════════════════════════

  async getProductReviews(productId: string, dto: ProductReviewsQueryDto) {
    const where: Prisma.MarketplaceReviewWhereInput = {
      productId, reviewType: 'PRODUCT', isApproved: true, isHidden: false,
    };
    if (dto.rating) where.rating = dto.rating;
    if (dto.withPhotos) where.imageUrls = { isEmpty: false };
    if (dto.withVideo) where.videoUrl = { not: null };

    const orderBy: Prisma.MarketplaceReviewOrderByWithRelationInput[] = (() => {
      switch (dto.sortBy) {
        case 'helpful':     return [{ helpfulCount: 'desc' }];
        case 'rating_high': return [{ rating: 'desc' }];
        case 'rating_low':  return [{ rating: 'asc' }];
        default:            return [{ createdAt: 'desc' }];
      }
    })();

    const [items, total, breakdown] = await Promise.all([
      this.prisma.marketplaceReview.findMany({
        where, orderBy, take: dto.limit ?? 20, skip: dto.offset ?? 0,
        select: {
          id: true, rating: true, title: true, comment: true,
          imageUrls: true, videoUrl: true,
          isVerifiedPurchase: true, helpfulCount: true, unhelpfulCount: true,
          replyFromShop: true, replyAt: true, createdAt: true,
          customer: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      }),
      this.prisma.marketplaceReview.count({ where }),
      this.prisma.marketplaceReview.groupBy({
        by: ['rating'],
        where: { productId, reviewType: 'PRODUCT', isApproved: true, isHidden: false },
        _count: { rating: true },
      }),
    ]);

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    breakdown.forEach((b) => { distribution[b.rating] = b._count.rating; });

    return { items, total, limit: dto.limit ?? 20, offset: dto.offset ?? 0, distribution };
  }

  // ═══════════════════════════════════════════════════════════
  // PRICE COMPARE (same product across shops — by name similarity)
  // ═══════════════════════════════════════════════════════════

  async priceCompare(productId: string) {
    const base = await this.prisma.productMarketplaceProfile.findUnique({
      where: { productId },
      select: { publicName: true, marketplaceCategory: true },
    });
    if (!base) throw new NotFoundException('Product not found');

    const others = await this.prisma.productMarketplaceProfile.findMany({
      where: {
        isListedOnMarketplace: true, isAvailable: true,
        productId: { not: productId },
        publicName: { contains: base.publicName.split(' ')[0], mode: 'insensitive' },
      },
      orderBy: [{ publicPrice: 'asc' }],
      take: 20,
      select: {
        productId: true, publicName: true, publicPrice: true, compareAtPrice: true,
        publicImages: true, ratingAverage: true, ratingCount: true,
        shop: {
          select: {
            id: true,
            marketplaceProfile: {
              select: {
                shopId: true, slug: true, publicName: true, logoUrl: true,
                city: true, deliveryFee: true, verificationLevel: true,
              },
            },
          },
        },
      },
    });

    return { baseProductId: productId, alternatives: others };
  }

  // ═══════════════════════════════════════════════════════════
  // CATEGORIES
  // ═══════════════════════════════════════════════════════════

  async listCategories() {
    const groups = await this.prisma.productMarketplaceProfile.groupBy({
      by: ['marketplaceCategory'],
      where: { isListedOnMarketplace: true, marketplaceCategory: { not: null } },
      _count: { marketplaceCategory: true },
      orderBy: { _count: { marketplaceCategory: 'desc' } },
    });
    return groups.map((g) => ({
      name: g.marketplaceCategory,
      productCount: g._count.marketplaceCategory,
    }));
  }

  async listSubCategories(category: string) {
    const groups = await this.prisma.productMarketplaceProfile.groupBy({
      by: ['marketplaceSubCategory'],
      where: {
        isListedOnMarketplace: true,
        marketplaceCategory: category,
        marketplaceSubCategory: { not: null },
      },
      _count: { marketplaceSubCategory: true },
      orderBy: { _count: { marketplaceSubCategory: 'desc' } },
    });
    return groups.map((g) => ({
      name: g.marketplaceSubCategory,
      productCount: g._count.marketplaceSubCategory,
    }));
  }
}
