import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketCatalogService, ProductOffer } from '../_shared/market-catalog.service';
import { modifierGroupsFor } from '../_shared/market-modifiers';
import { MarketSettingsService } from '../_shared/market-settings.service';
import { isShopVisible, visibleShopWhere } from '../_shared/market-visibility';

/** Live price and stock fields added to every product card. */
function offerFields(o: ProductOffer | undefined, fallbackPrice: unknown) {
  return {
    price: o?.price ?? Number(fallbackPrice ?? 0),
    priceMax: o?.priceMax ?? Number(fallbackPrice ?? 0),
    availability: o?.availability ?? 'out_of_stock',
    inStock: !!o && o.availability !== 'out_of_stock',
    maxQty: o?.maxQty ?? 0,
    leadTime: o?.leadTime ?? null,
    requiresPrescription: o?.requiresPrescription ?? false,
  };
}
import { SearchProductsDto } from './dto/search-products.dto';
import { ProductReviewsQueryDto } from './dto/product-reviews.dto';

@Injectable()
export class MarketplaceProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: MarketCatalogService,
    private readonly settings: MarketSettingsService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // SEARCH / LIST
  // ═══════════════════════════════════════════════════════════

  async search(dto: SearchProductsDto, customerId?: string) {
    // Hidden products (isAvailable = false) never show; stock is checked live below.
    const where: Prisma.ProductMarketplaceProfileWhereInput = {
      isListedOnMarketplace: true,
      isAvailable: true,
      product: { isActive: true },
    };
    if (dto.shopId) where.shopId = dto.shopId;
    if (dto.category) where.marketplaceCategory = dto.category;
    if (dto.subCategory) where.marketplaceSubCategory = dto.subCategory;
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

    // Only shops that are live on the Market (plus city / free delivery filters).
    where.shop = {
      is: {
        marketplaceProfile: {
          is: {
            ...visibleShopWhere(await this.settings.platform()),
            isPaused: false,
            ...(dto.city ? { city: { equals: dto.city, mode: 'insensitive' } } : {}),
            ...(dto.freeDelivery ? { freeDeliveryAbove: { not: null } } : {}),
          },
        },
      },
    };

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

    const offers = await this.catalog.offers(items.map((i) => i.productId));
    let cards = items.map((i) => ({ ...i, ...offerFields(offers.get(i.productId), i.publicPrice), isInWishlist: inWishlist.has(i.productId) }));
    if (dto.inStockOnly === true) cards = cards.filter((c) => c.inStock);

    return {
      items: cards,
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
        // Public page: only what a customer may see (never cost, wholesale price or stock rows).
        product: {
          select: {
            id: true, name: true, description: true, sku: true, barcode: true, unit: true,
            weight: true, weightUnit: true, hasVariants: true, isActive: true,
            category: { select: { id: true, name: true } },
            variants: {
              where: { isActive: true },
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
              select: {
                id: true, name: true, sku: true, barcode: true,
                size: true, color: true, colorHex: true, imageUrl: true,
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
                industry: true, verificationLevel: true, gate: true, flowSettings: true, isListedOnMarketplace: true, verifiedAt: true,
                isOpen: true, isPaused: true, offersDineIn: true,
                ratingAverage: true, ratingCount: true, totalOrders: true, followerCount: true,
                offersDelivery: true, offersPickup: true, deliveryFee: true,
                freeDeliveryAbove: true, minOrderAmount: true,
                estimatedDeliveryMinutes: true,
                acceptsCod: true, acceptsCard: true, acceptsJazzcash: true,
                acceptsEasypaisa: true, acceptsRaast: true, acceptsWallet: true,
                tenant: { select: { businessType: true } },
              },
            },
          },
        },
      },
    });

    if (!profile || !profile.isListedOnMarketplace || !profile.isAvailable || !isShopVisible(profile.shop.marketplaceProfile, await this.settings.platform())) {
      throw new NotFoundException('Ye product Market par nahi mila');
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
    const [reviews, related, offers, inWishlist, isFollowingShop] =
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
        this.catalog.offers([productId]),
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

    const offer = offers.get(productId);
    const [relatedOffers, addonGroups] = await Promise.all([
      this.catalog.offers(related.map((r) => r.productId)),
      modifierGroupsFor(this.prisma, [productId]),
    ]);
    const { tenant: shopTenant, ...shopProfile } = profile.shop.marketplaceProfile!;
    return {
      ...profile,
      shop: { ...profile.shop, marketplaceProfile: { ...shopProfile, ...this.settings.shopGate({ ...shopProfile, tenant: shopTenant }) } },
      ...offerFields(offer, profile.publicPrice),
      // Restaurant add-ons; the customer sends back [{ groupId, optionIds }].
      modifierGroups: addonGroups.get(productId) ?? [],
      // One entry per size/colour with its own live price and stock.
      lines: (offer?.variants ?? []).map((l) => ({
        variantId: l.variantId, variantName: l.variantName, price: l.price, compareAtPrice: l.compareAtPrice,
        availability: l.availability, maxQty: l.maxQty, leadTime: l.leadTime, image: l.image,
      })),
      reviews,
      related: related.map((r) => ({ ...r, ...offerFields(relatedOffers.get(r.productId), r.publicPrice) })),
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
    if (!base) throw new NotFoundException('Ye product Market par nahi mila');

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
