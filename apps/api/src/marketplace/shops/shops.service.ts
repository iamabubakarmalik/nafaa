import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ShopVerificationLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketCatalogService } from '../_shared/market-catalog.service';
import { MarketSettingsService } from '../_shared/market-settings.service';
import { isMarketGate } from '../_shared/market-config';
import { isOpenAt } from '../_shared/market-hours';
import { ListShopsDto } from './dto/list-shops.dto';
import { ShopProductsDto } from './dto/shop-products.dto';
import { ShopReviewsQueryDto } from './dto/shop-reviews.dto';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const VERIFICATION_ORDER: Record<ShopVerificationLevel, number> = {
  UNVERIFIED: 0, BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4,
};

/** Open right now in Pakistan time (the server runs in UTC). */
function isShopOpenNow(workingHours: any, holidayDates?: Date[]): boolean {
  return isOpenAt(workingHours, holidayDates);
}

@Injectable()
export class MarketplaceShopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: MarketSettingsService,
    private readonly catalog: MarketCatalogService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // LIST SHOPS (filters + sort + pagination)
  // ═══════════════════════════════════════════════════════════

  async listShops(dto: ListShopsDto, customerId?: string) {
    const where: Prisma.ShopMarketplaceProfileWhereInput = {
      isListedOnMarketplace: true,
    };
    if (dto.onlyOpen) { where.isOpen = true; where.isPaused = false; }
    if (dto.city)     where.city = { equals: dto.city, mode: 'insensitive' };
    if (dto.area)     where.area = { equals: dto.area, mode: 'insensitive' };
    if (dto.industry) where.industry = dto.industry;
    if (dto.freeDelivery) where.freeDeliveryAbove = { not: null };
    const gate = isMarketGate(dto.gate) ? dto.gate : null;
    // Shops without a saved gate take it from their business type (checked below).
    if (gate) where.AND = [{ OR: [{ gate }, { gate: null }] }];
    if (dto.minRating !== undefined) where.ratingAverage = { gte: dto.minRating };
    if (dto.minVerification) {
      const allowed = Object.entries(VERIFICATION_ORDER)
        .filter(([, v]) => v >= VERIFICATION_ORDER[dto.minVerification!])
        .map(([k]) => k as ShopVerificationLevel);
      where.verificationLevel = { in: allowed };
    }
    if (dto.search) {
      where.OR = [
        { publicName: { contains: dto.search, mode: 'insensitive' } },
        { tagline: { contains: dto.search, mode: 'insensitive' } },
        { keywords: { has: dto.search.toLowerCase() } },
      ];
    }

    // Bbox prefilter if lat/lng given
    if (dto.lat && dto.lng) {
      const radiusKm = dto.radiusKm ?? 10;
      const deltaLat = radiusKm / 111;
      const deltaLng = radiusKm / (111 * Math.cos((dto.lat * Math.PI) / 180));
      where.lat = { gte: dto.lat - deltaLat, lte: dto.lat + deltaLat };
      where.lng = { gte: dto.lng - deltaLng, lte: dto.lng + deltaLng };
    }

    const rawTake = dto.lat && dto.lng ? 300 : gate ? 500 : (dto.limit ?? 20) + (dto.offset ?? 0);
    const raw = await this.prisma.shopMarketplaceProfile.findMany({
      where,
      take: rawTake,
      select: {
        id: true, shopId: true, slug: true, publicName: true, tagline: true,
        logoUrl: true, coverUrl: true, city: true, area: true,
        lat: true, lng: true, industry: true, subCategories: true,
        verificationLevel: true, ratingAverage: true, ratingCount: true,
        totalOrders: true, followerCount: true,
        offersDelivery: true, offersPickup: true, offersDineIn: true,
        deliveryFee: true, freeDeliveryAbove: true,
        minOrderAmount: true, estimatedDeliveryMinutes: true, listedAt: true,
        acceptsCod: true, acceptsCard: true, acceptsJazzcash: true, acceptsEasypaisa: true,
        isOpen: true, isPaused: true, workingHours: true, holidayDates: true,
        gate: true, flowSettings: true, tenant: { select: { businessType: true } },
      },
    });

    // Attach gate, flow, open-now and distance
    const withDist = raw.map(({ tenant, workingHours, holidayDates, ...s }) => ({
      ...s,
      ...this.settings.shopGate({ gate: s.gate, flowSettings: s.flowSettings, tenant }),
      currentlyOpen: s.isOpen && !s.isPaused && isShopOpenNow(workingHours, holidayDates),
      distanceKm:
        dto.lat && dto.lng && s.lat != null && s.lng != null
          ? haversineKm(dto.lat, dto.lng, s.lat, s.lng)
          : null,
    }));

    // Radius and gate filters
    const filtered = withDist
      .filter((s) => !(dto.lat && dto.lng) || (s.distanceKm !== null && s.distanceKm <= (dto.radiusKm ?? 10)))
      .filter((s) => !gate || s.gate === gate);

    // Sort
    const sortBy = dto.sortBy ?? 'popular';
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'distance': return (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9);
        case 'rating':   return b.ratingAverage - a.ratingAverage;
        case 'popular':  return b.totalOrders - a.totalOrders;
        case 'newest':   return (b.listedAt?.getTime() ?? 0) - (a.listedAt?.getTime() ?? 0);
        case 'delivery_time':
          return (a.estimatedDeliveryMinutes ?? 999) - (b.estimatedDeliveryMinutes ?? 999);
        default:         return 0;
      }
    });

    const offset = dto.offset ?? 0;
    const limit = dto.limit ?? 20;
    const page = filtered.slice(offset, offset + limit);

    // Enrich with follow-status if customer is logged in
    if (customerId && page.length) {
      const follows = await this.prisma.customerFollowsShop.findMany({
        where: { customerId, shopId: { in: page.map((p) => p.shopId) } },
        select: { shopId: true },
      });
      const followSet = new Set(follows.map((f) => f.shopId));
      return {
        items: page.map((p) => ({ ...p, isFollowing: followSet.has(p.shopId) })),
        total: filtered.length,
        limit, offset,
      };
    }

    return { items: page, total: filtered.length, limit, offset };
  }

  // ═══════════════════════════════════════════════════════════
  // SHOP DETAIL
  // ═══════════════════════════════════════════════════════════

  async getShopBySlug(slug: string, customerId?: string, lat?: number, lng?: number) {
    const shop = await this.prisma.shopMarketplaceProfile.findFirst({
      where: { slug, isListedOnMarketplace: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');
    return this.enrichShopDetail(shop, customerId, lat, lng);
  }

  async getShopById(shopId: string, customerId?: string, lat?: number, lng?: number) {
    const shop = await this.prisma.shopMarketplaceProfile.findUnique({
      where: { shopId },
    });
    if (!shop || !shop.isListedOnMarketplace) throw new NotFoundException('Shop not found');
    return this.enrichShopDetail(shop, customerId, lat, lng);
  }

  private async enrichShopDetail(
    shop: any,
    customerId?: string,
    lat?: number,
    lng?: number,
  ) {
    const [productCount, isFollowing, recentReviews, tenant] = await Promise.all([
      this.prisma.productMarketplaceProfile.count({
        where: { shopId: shop.shopId, isListedOnMarketplace: true, isAvailable: true },
      }),
      customerId
        ? this.prisma.customerFollowsShop.findUnique({
            where: { customerId_shopId: { customerId, shopId: shop.shopId } },
          })
        : null,
      this.prisma.marketplaceReview.findMany({
        where: { shopId: shop.shopId, isApproved: true, isHidden: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, rating: true, title: true, comment: true, imageUrls: true, videoUrl: true,
          isVerifiedPurchase: true, helpfulCount: true, replyFromShop: true, replyAt: true,
          createdAt: true,
          customer: { select: { fullName: true, avatarUrl: true } },
        },
      }),
      this.prisma.tenant.findUnique({ where: { id: shop.tenantId }, select: { businessType: true } }),
    ]);

    const distanceKm =
      lat != null && lng != null && shop.lat != null && shop.lng != null
        ? haversineKm(lat, lng, shop.lat, shop.lng)
        : null;

    const currentlyOpen = shop.isOpen && !shop.isPaused && isShopOpenNow(shop.workingHours, shop.holidayDates);

    // Private and legacy fields stay out of the public response.
    const {
      cnicNumber: _c, businessRegNumber: _b, taxNumber: _t, documents: _d, integrationId: _i,
      bargainEnabled: _be, bargainMinPercent: _bm, groupBuyEnabled: _ge, auctionEnabled: _ae, liveShopEnabled: _le,
      ...pub
    } = shop;
    return {
      ...pub,
      ...this.settings.shopGate({ gate: shop.gate, flowSettings: shop.flowSettings, tenant }),
      distanceKm,
      currentlyOpen,
      productCount,
      isFollowing: !!isFollowing,
      recentReviews,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // SHOP PRODUCTS
  // ═══════════════════════════════════════════════════════════

  async getShopProducts(shopId: string, dto: ShopProductsDto) {
    // Hidden products never show; stock is read live below.
    const where: Prisma.ProductMarketplaceProfileWhereInput = {
      shopId, isListedOnMarketplace: true, isAvailable: true, product: { isActive: true },
    };
    if (dto.category) where.marketplaceCategory = dto.category;
    if (dto.search) {
      where.OR = [
        { publicName: { contains: dto.search, mode: 'insensitive' } },
        { tags: { has: dto.search.toLowerCase() } },
      ];
    }
    if (dto.minPrice !== undefined) where.publicPrice = { gte: dto.minPrice };
    if (dto.maxPrice !== undefined) {
      where.publicPrice = { ...(where.publicPrice as any), lte: dto.maxPrice };
    }

    const orderBy: Prisma.ProductMarketplaceProfileOrderByWithRelationInput[] = (() => {
      switch (dto.sortBy) {
        case 'newest':     return [{ listedAt: 'desc' }];
        case 'price_asc':  return [{ publicPrice: 'asc' }];
        case 'price_desc': return [{ publicPrice: 'desc' }];
        case 'rating':     return [{ ratingAverage: 'desc' }];
        default:           return [{ totalSold: 'desc' }, { ratingAverage: 'desc' }];
      }
    })();

    const [items, total, categories] = await Promise.all([
      this.prisma.productMarketplaceProfile.findMany({
        where, orderBy, take: dto.limit ?? 24, skip: dto.offset ?? 0,
        select: {
          id: true, productId: true, publicName: true, publicDescription: true,
          publicPrice: true, compareAtPrice: true, publicImages: true,
          marketplaceCategory: true, tags: true, isAvailable: true,
          totalSold: true, ratingAverage: true, ratingCount: true, viewCount: true,
        },
      }),
      this.prisma.productMarketplaceProfile.count({ where }),
      // Categories that this shop offers (for facet UI)
      this.prisma.productMarketplaceProfile.groupBy({
        by: ['marketplaceCategory'],
        where: { shopId, isListedOnMarketplace: true, marketplaceCategory: { not: null } },
        _count: { marketplaceCategory: true },
        orderBy: { _count: { marketplaceCategory: 'desc' } },
      }),
    ]);

    const offers = await this.catalog.offers(items.map((i) => i.productId));
    let cards = items.map((i) => {
      const o = offers.get(i.productId);
      return {
        ...i,
        price: o?.price ?? Number(i.publicPrice),
        priceMax: o?.priceMax ?? Number(i.publicPrice),
        availability: o?.availability ?? 'out_of_stock',
        inStock: !!o && o.availability !== 'out_of_stock',
        maxQty: o?.maxQty ?? 0,
        leadTime: o?.leadTime ?? null,
      };
    });
    if (dto.inStockOnly === true) cards = cards.filter((c) => c.inStock);

    return {
      items: cards,
      total,
      limit: dto.limit ?? 24,
      offset: dto.offset ?? 0,
      facets: {
        categories: categories.map((c) => ({
          name: c.marketplaceCategory,
          count: c._count.marketplaceCategory,
        })),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════
  // SHOP REVIEWS
  // ═══════════════════════════════════════════════════════════

  async getShopReviews(shopId: string, dto: ShopReviewsQueryDto) {
    const where: Prisma.MarketplaceReviewWhereInput = {
      shopId, isApproved: true, isHidden: false, reviewType: 'SHOP',
    };
    if (dto.rating)      where.rating = dto.rating;
    if (dto.withPhotos)  where.imageUrls = { isEmpty: false };
    if (dto.withVideo)   where.videoUrl = { not: null };

    const orderBy: Prisma.MarketplaceReviewOrderByWithRelationInput[] = (() => {
      switch (dto.sortBy) {
        case 'helpful':      return [{ helpfulCount: 'desc' }];
        case 'rating_high':  return [{ rating: 'desc' }];
        case 'rating_low':   return [{ rating: 'asc' }];
        default:             return [{ createdAt: 'desc' }];
      }
    })();

    const [items, total, breakdown] = await Promise.all([
      this.prisma.marketplaceReview.findMany({
        where, orderBy, take: dto.limit ?? 20, skip: dto.offset ?? 0,
        select: {
          id: true, rating: true, title: true, comment: true,
          imageUrls: true, videoUrl: true,
          qualityRating: true, packagingRating: true, deliveryRating: true, valueRating: true,
          isVerifiedPurchase: true, helpfulCount: true, unhelpfulCount: true,
          replyFromShop: true, replyAt: true, createdAt: true,
          customer: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      }),
      this.prisma.marketplaceReview.count({ where }),
      this.prisma.marketplaceReview.groupBy({
        by: ['rating'],
        where: { shopId, isApproved: true, isHidden: false, reviewType: 'SHOP' },
        _count: { rating: true },
      }),
    ]);

    // Rating distribution 1-5
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    breakdown.forEach((b) => { distribution[b.rating] = b._count.rating; });

    return { items, total, limit: dto.limit ?? 20, offset: dto.offset ?? 0, distribution };
  }

  // ═══════════════════════════════════════════════════════════
  // FOLLOW / UNFOLLOW
  // ═══════════════════════════════════════════════════════════

  async followShop(customerId: string, shopId: string) {
    const shop = await this.prisma.shopMarketplaceProfile.findUnique({ where: { shopId } });
    if (!shop || !shop.isListedOnMarketplace) throw new NotFoundException('Shop not found');

    await this.prisma.$transaction([
      this.prisma.customerFollowsShop.upsert({
        where: { customerId_shopId: { customerId, shopId } },
        update: {},
        create: { customerId, shopId },
      }),
      this.prisma.shopMarketplaceProfile.update({
        where: { shopId },
        data: { followerCount: { increment: 1 } },
      }),
    ]);

    return { success: true, isFollowing: true };
  }

  async unfollowShop(customerId: string, shopId: string) {
    const existing = await this.prisma.customerFollowsShop.findUnique({
      where: { customerId_shopId: { customerId, shopId } },
    });
    if (!existing) return { success: true, isFollowing: false };

    await this.prisma.$transaction([
      this.prisma.customerFollowsShop.delete({
        where: { customerId_shopId: { customerId, shopId } },
      }),
      this.prisma.shopMarketplaceProfile.update({
        where: { shopId },
        data: { followerCount: { decrement: 1 } },
      }),
    ]);

    return { success: true, isFollowing: false };
  }

  async getFollowedShops(customerId: string, limit = 20, offset = 0) {
    const follows = await this.prisma.customerFollowsShop.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit, skip: offset,
      select: { shopId: true, createdAt: true },
    });
    const shopIds = follows.map((f) => f.shopId);
    if (shopIds.length === 0) return { items: [], total: 0 };
    const [shops, total] = await Promise.all([
      this.prisma.shopMarketplaceProfile.findMany({
        where: { shopId: { in: shopIds }, isListedOnMarketplace: true },
        select: {
          shopId: true, slug: true, publicName: true, tagline: true,
          logoUrl: true, coverUrl: true, city: true, industry: true,
          verificationLevel: true, ratingAverage: true, ratingCount: true,
        },
      }),
      this.prisma.customerFollowsShop.count({ where: { customerId } }),
    ]);
    return {
      items: shops.map((s) => ({
        ...s,
        followedAt: follows.find((f) => f.shopId === s.shopId)?.createdAt,
      })),
      total, limit, offset,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // WORKING HOURS QUICK CHECK
  // ═══════════════════════════════════════════════════════════

  async getShopHours(shopId: string) {
    const shop = await this.prisma.shopMarketplaceProfile.findUnique({
      where: { shopId },
      select: { workingHours: true, holidayDates: true, isOpen: true, isPaused: true, pausedReason: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');
    return {
      workingHours: shop.workingHours,
      holidayDates: shop.holidayDates,
      isOpen: shop.isOpen,
      isPaused: shop.isPaused,
      pausedReason: shop.pausedReason,
      currentlyOpen: shop.isOpen && !shop.isPaused && isShopOpenNow(shop.workingHours, shop.holidayDates),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // SIMILAR SHOPS (same industry + nearby city)
  // ═══════════════════════════════════════════════════════════

  async getSimilarShops(shopId: string, limit = 10) {
    const base = await this.prisma.shopMarketplaceProfile.findUnique({
      where: { shopId },
      select: { industry: true, city: true, shopId: true },
    });
    if (!base) throw new NotFoundException('Shop not found');
    return this.prisma.shopMarketplaceProfile.findMany({
      where: {
        isListedOnMarketplace: true, isOpen: true,
        industry: base.industry,
        shopId: { not: shopId },
        ...(base.city ? { city: base.city } : {}),
      },
      orderBy: [{ ratingAverage: 'desc' }, { totalOrders: 'desc' }],
      take: limit,
      select: {
        shopId: true, slug: true, publicName: true, tagline: true, logoUrl: true, coverUrl: true,
        city: true, industry: true, verificationLevel: true,
        ratingAverage: true, ratingCount: true,
      },
    });
  }
}
