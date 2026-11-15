import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketCatalogService } from '../_shared/market-catalog.service';
import { MarketSettingsService } from '../_shared/market-settings.service';
import { visibleShopWhere } from '../_shared/market-visibility';
import { liveBanners } from '../_shared/market-home';
import { MarketGate, isMarketGate } from '../_shared/market-config';
import { isOpenAt } from '../_shared/market-hours';
import { DiscoverQueryDto } from './dto/discover-query.dto';
import { NearbyShopsDto } from './dto/nearby-shops.dto';
import { TrendingProductsDto } from './dto/trending-products.dto';

/** Shop fields needed to work out the gate, flow and open-now state. */
const GATE_SELECT = {
  gate: true, flowSettings: true, isOpen: true, isPaused: true, workingHours: true, holidayDates: true,
  tenant: { select: { businessType: true } },
} as const;

/** Prefilter for a gate: shops with that gate saved, or none saved yet (resolved from the business type). */
const gateWhere = (gate: MarketGate | null): Prisma.ShopMarketplaceProfileWhereInput => (gate ? { OR: [{ gate }, { gate: null }] } : {});

/**
 * Haversine distance between two lat/lng points in km.
 */
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

@Injectable()
export class MarketplaceHomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: MarketSettingsService,
    private readonly catalog: MarketCatalogService,
  ) {}

  /** Adds gate, gateFilter, flow and currentlyOpen; drops shops outside the asked gate. */
  private decorate<T extends { gate: string | null; flowSettings: unknown; isOpen: boolean; isPaused: boolean; workingHours: unknown; holidayDates: Date[]; tenant: { businessType: string | null } }>(
    rows: T[], gate: MarketGate | null, limit?: number,
  ) {
    const out = rows
      .map(({ tenant, workingHours, holidayDates, ...r }) => ({
        ...r,
        ...this.settings.shopGate({ gate: r.gate, flowSettings: r.flowSettings, tenant }),
        currentlyOpen: r.isOpen && !r.isPaused && isOpenAt(workingHours, holidayDates),
      }))
      .filter((r) => !gate || r.gate === gate);
    return limit ? out.slice(0, limit) : out;
  }

  // ═══════════════════════════════════════════════════════════
  // MAIN DISCOVER FEED — one call gives everything the home screen needs
  // ═══════════════════════════════════════════════════════════

  async discover(dto: DiscoverQueryDto, customerId?: string) {
    const gate = isMarketGate(dto.gate) ? dto.gate : null;
    const [
      banners,
      categories,
      featuredShops,
      nearbyShops,
      trendingProducts,
      flashSales,
      recommendedForYou,
      sections,
    ] = await Promise.all([
      this.getActiveBanners(dto.city, gate),
      this.getTopCategories(),
      this.getFeaturedShops(dto),
      dto.lat && dto.lng
        ? this.getNearbyShopsRaw({
            lat: dto.lat, lng: dto.lng, radiusKm: dto.radiusKm ?? 5, limit: 10, gate: gate ?? undefined,
          } as NearbyShopsDto & { gate?: string })
        : this.getPopularShops(dto.city, 10, gate),
      this.getTrendingProducts({ lat: dto.lat, lng: dto.lng, limit: 12 } as TrendingProductsDto),
      this.getActiveFlashSales(),
      customerId ? this.getRecommendedForCustomer(customerId, 12) : [],
      this.getCuratedSections(gate),
    ]);

    return {
      banners,
      sections,
      categories,
      featuredShops,
      nearbyShops,
      trendingProducts,
      flashSales,
      // Group buys and live shopping are switched off; empty lists keep older apps working.
      activeGroupBuys: [],
      liveShops: [],
      recommendedForYou,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // NEARBY SHOPS
  // ═══════════════════════════════════════════════════════════

  async getNearbyShops(dto: NearbyShopsDto) {
    const shops = await this.getNearbyShopsRaw(dto);
    return {
      items: shops,
      total: shops.length,
      limit: dto.limit ?? 20,
      offset: dto.offset ?? 0,
    };
  }

  private async getNearbyShopsRaw(dto: NearbyShopsDto & { gate?: string }) {
    const gate = isMarketGate(dto.gate) ? dto.gate : null;
    const radiusKm = dto.radiusKm ?? 5;
    // Rough bbox for prefilter (0.009 deg ≈ 1 km)
    const deltaLat = radiusKm / 111;
    const deltaLng = radiusKm / (111 * Math.cos((dto.lat * Math.PI) / 180));

    const where: Prisma.ShopMarketplaceProfileWhereInput = {
      ...visibleShopWhere(await this.settings.platform()),
      isOpen: true,
      isPaused: false,
      lat: { gte: dto.lat - deltaLat, lte: dto.lat + deltaLat },
      lng: { gte: dto.lng - deltaLng, lte: dto.lng + deltaLng },
      ...(gate ? { AND: [gateWhere(gate)] } : {}),
    };
    if (dto.industry) where.industry = dto.industry;
    if (dto.search) {
      where.OR = [
        { publicName: { contains: dto.search, mode: 'insensitive' } },
        { tagline: { contains: dto.search, mode: 'insensitive' } },
        { keywords: { has: dto.search.toLowerCase() } },
      ];
    }

    const raw = await this.prisma.shopMarketplaceProfile.findMany({
      where,
      take: 200, // over-fetch then filter/sort in-memory
      select: {
        id: true, shopId: true, slug: true, publicName: true, tagline: true,
        logoUrl: true, coverUrl: true, city: true, area: true,
        lat: true, lng: true, industry: true, verificationLevel: true,
        ratingAverage: true, ratingCount: true, totalOrders: true,
        offersDelivery: true, offersPickup: true,
        deliveryFee: true, minOrderAmount: true,
        estimatedDeliveryMinutes: true,
        ...GATE_SELECT,
      },
    });

    // Compute exact distance + filter to radius
    const withDistance = this.decorate(raw, gate)
      .map((s) => ({
        ...s,
        distanceKm: s.lat && s.lng ? haversineKm(dto.lat, dto.lng, s.lat, s.lng) : null,
      }))
      .filter((s) => s.distanceKm !== null && s.distanceKm <= radiusKm);

    // Sort
    const sortBy = dto.sortBy ?? 'distance';
    withDistance.sort((a, b) => {
      switch (sortBy) {
        case 'rating':  return b.ratingAverage - a.ratingAverage;
        case 'popular': return b.totalOrders - a.totalOrders;
        case 'newest':  return 0; // requires listedAt in select — skipped for perf
        default:        return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
      }
    });

    const offset = dto.offset ?? 0;
    const limit = dto.limit ?? 20;
    return withDistance.slice(offset, offset + limit);
  }

  // ═══════════════════════════════════════════════════════════
  // FEATURED / POPULAR SHOPS
  // ═══════════════════════════════════════════════════════════

  private async getFeaturedShops(dto: DiscoverQueryDto) {
    const gate = isMarketGate(dto.gate) ? dto.gate : null;
    const picked = await this.getPickedShops((await this.settings.home()).featuredShopIds, gate, dto.city);
    const rows = await this.prisma.shopMarketplaceProfile.findMany({
      where: {
        ...gateWhere(gate),
        ...visibleShopWhere(await this.settings.platform()),
        isOpen: true,
        verificationLevel: { in: ['GOLD', 'PLATINUM'] },
        ...(dto.city ? { city: { equals: dto.city, mode: 'insensitive' } } : {}),
        ...(dto.industry ? { industry: dto.industry } : {}),
      },
      orderBy: [{ ratingAverage: 'desc' }, { totalOrders: 'desc' }],
      take: gate ? 60 : 10,
      select: {
        id: true, shopId: true, slug: true, publicName: true, tagline: true,
        logoUrl: true, coverUrl: true, city: true, area: true,
        industry: true, verificationLevel: true,
        ratingAverage: true, ratingCount: true, totalOrders: true,
        ...GATE_SELECT,
      },
    });
    // Shops picked in the admin panel come first, in their saved order.
    const pickedIds = new Set(picked.map((r) => r.shopId));
    return [...picked, ...this.decorate(rows.filter((r) => !pickedIds.has(r.shopId)), gate)].slice(0, 10);
  }

  /** Visible shops by id, in the given order, for the featured row and curated sections. */
  private async getPickedShops(shopIds: string[], gate: MarketGate | null, city?: string) {
    if (!shopIds.length) return [];
    const rows = await this.prisma.shopMarketplaceProfile.findMany({
      where: {
        shopId: { in: shopIds },
        ...visibleShopWhere(await this.settings.platform()),
        ...(city ? { city: { equals: city, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true, shopId: true, slug: true, publicName: true, tagline: true,
        logoUrl: true, coverUrl: true, city: true, area: true,
        industry: true, verificationLevel: true,
        ratingAverage: true, ratingCount: true, totalOrders: true,
        ...GATE_SELECT,
      },
    });
    rows.sort((a, b) => shopIds.indexOf(a.shopId) - shopIds.indexOf(b.shopId));
    return this.decorate(rows, gate);
  }

  /** Home sections curated in the admin panel, with their shops or products loaded. */
  private async getCuratedSections(gate: MarketGate | null) {
    const home = await this.settings.home();
    const list = home.sections.filter((s) => !s.gate || s.gate === gate);
    const out = await Promise.all(list.map(async (s) => {
      if (s.type === 'shops') {
        const shops = await this.getPickedShops(s.shopIds ?? [], s.gate ?? gate);
        return shops.length ? { id: s.id, title: s.title, type: s.type, shops, products: [] } : null;
      }
      const ids = s.productIds ?? [];
      if (!ids.length) return null;
      const rows = await this.prisma.productMarketplaceProfile.findMany({
        where: {
          productId: { in: ids }, isListedOnMarketplace: true, isAvailable: true, product: { isActive: true },
          shop: { is: { marketplaceProfile: { is: { ...visibleShopWhere(await this.settings.platform()), isPaused: false } } } },
        },
        select: {
          id: true, productId: true, shopId: true, publicName: true, publicPrice: true, compareAtPrice: true,
          publicImages: true, marketplaceCategory: true, ratingAverage: true, ratingCount: true, totalSold: true,
        },
      });
      rows.sort((a, b) => ids.indexOf(a.productId) - ids.indexOf(b.productId));
      const offers = await this.catalog.offers(rows.map((r) => r.productId));
      const products = rows.map((r) => {
        const o = offers.get(r.productId);
        return { ...r, price: o?.price ?? Number(r.publicPrice), availability: o?.availability ?? 'out_of_stock', inStock: !!o && o.availability !== 'out_of_stock' };
      });
      return products.length ? { id: s.id, title: s.title, type: s.type, shops: [], products } : null;
    }));
    return out.filter((s) => s !== null);
  }

  private async getPopularShops(city: string | undefined, limit: number, gate: MarketGate | null = null) {
    const rows = await this.prisma.shopMarketplaceProfile.findMany({
      where: {
        ...gateWhere(gate),
        ...visibleShopWhere(await this.settings.platform()),
        isOpen: true,
        ...(city ? { city: { equals: city, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ totalOrders: 'desc' }, { ratingAverage: 'desc' }],
      take: gate ? limit * 6 : limit,
      select: {
        id: true, shopId: true, slug: true, publicName: true, tagline: true,
        logoUrl: true, coverUrl: true, city: true, area: true,
        industry: true, verificationLevel: true,
        ratingAverage: true, ratingCount: true,
        ...GATE_SELECT,
      },
    });
    return this.decorate(rows, gate, limit);
  }

  // ═══════════════════════════════════════════════════════════
  // CATEGORIES — auto-derived from listed products
  // ═══════════════════════════════════════════════════════════

  private async getTopCategories() {
    const rows = await this.prisma.productMarketplaceProfile.groupBy({
      by: ['marketplaceCategory'],
      where: { isListedOnMarketplace: true, isAvailable: true, marketplaceCategory: { not: null } },
      _count: { marketplaceCategory: true },
      orderBy: { _count: { marketplaceCategory: 'desc' } },
      take: 12,
    });
    return rows.map((r) => ({
      name: r.marketplaceCategory,
      productCount: r._count.marketplaceCategory,
    }));
  }

  // ═══════════════════════════════════════════════════════════
  // TRENDING PRODUCTS
  // ═══════════════════════════════════════════════════════════

  async getTrendingProducts(dto: TrendingProductsDto) {
    const where: Prisma.ProductMarketplaceProfileWhereInput = {
      isListedOnMarketplace: true,
      isAvailable: true,
      product: { isActive: true },
      shop: { is: { marketplaceProfile: { is: { ...visibleShopWhere(await this.settings.platform()), isPaused: false } } } },
      ...(dto.category ? { marketplaceCategory: dto.category } : {}),
    };

    const rows = await this.prisma.productMarketplaceProfile.findMany({
      where,
      orderBy: [{ totalSold: 'desc' }, { viewCount: 'desc' }, { ratingAverage: 'desc' }],
      take: dto.limit ?? 20,
      select: {
        id: true, productId: true, shopId: true,
        publicName: true, publicDescription: true,
        publicPrice: true, compareAtPrice: true,
        publicImages: true, marketplaceCategory: true,
        totalSold: true, ratingAverage: true, ratingCount: true,
      },
    });
    const offers = await this.catalog.offers(rows.map((r) => r.productId));
    return rows.map((r) => {
      const o = offers.get(r.productId);
      return { ...r, price: o?.price ?? Number(r.publicPrice), availability: o?.availability ?? 'out_of_stock', inStock: !!o && o.availability !== 'out_of_stock', maxQty: o?.maxQty ?? 0 };
    });
  }

  // ═══════════════════════════════════════════════════════════
  // BANNERS  (admin panel: Marketplace > Home & banners)
  // ═══════════════════════════════════════════════════════════

  private async getActiveBanners(city: string | undefined, gate: MarketGate | null) {
    const home = await this.settings.home();
    return liveBanners(home, { city, gate }).map(({ id, image, title, link, gate: g }) => ({ id, image, title, link, gate: g ?? null }));
  }

  // ═══════════════════════════════════════════════════════════
  // FLASH SALES  (placeholder — promotions module)
  // ═══════════════════════════════════════════════════════════

  private async getActiveFlashSales() {
    return [];
  }

  // ═══════════════════════════════════════════════════════════
  // PERSONALIZED RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════

  private async getRecommendedForCustomer(customerId: string, limit: number) {
    // Naive v1: recommend products from categories the customer viewed recently.
    // Later: swap with proper recommendation engine.
    const recentViews = await this.prisma.productView.findMany({
      where: { customerId },
      orderBy: { viewedAt: 'desc' },
      take: 30,
      select: { productId: true },
    });
    const viewedIds = recentViews.map((v) => v.productId);
    if (viewedIds.length === 0) {
      return this.getTrendingProducts({ limit } as TrendingProductsDto);
    }

    const viewedProfiles = await this.prisma.productMarketplaceProfile.findMany({
      where: { productId: { in: viewedIds } },
      select: { marketplaceCategory: true },
    });
    const cats = Array.from(
      new Set(viewedProfiles.map((p) => p.marketplaceCategory).filter(Boolean) as string[]),
    );

    if (cats.length === 0) {
      return this.getTrendingProducts({ limit } as TrendingProductsDto);
    }

    return this.prisma.productMarketplaceProfile.findMany({
      where: {
        isListedOnMarketplace: true,
        isAvailable: true,
        marketplaceCategory: { in: cats },
        productId: { notIn: viewedIds }, // don't repeat items they've already seen
      },
      orderBy: [{ ratingAverage: 'desc' }, { totalSold: 'desc' }],
      take: limit,
      select: {
        id: true, productId: true, shopId: true,
        publicName: true, publicPrice: true, compareAtPrice: true,
        publicImages: true, marketplaceCategory: true,
        ratingAverage: true, ratingCount: true, totalSold: true,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // SEARCH SUGGESTIONS (autocomplete)
  // ═══════════════════════════════════════════════════════════

  async getSearchSuggestions(query: string, customerId?: string) {
    if (!query || query.trim().length < 2) {
      // Show recent searches
      if (customerId) {
        const recent = await this.prisma.customerSearchHistory.findMany({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          distinct: ['query'],
        });
        return { recent: recent.map((r) => r.query), suggestions: [] };
      }
      return { recent: [], suggestions: [] };
    }

    const q = query.trim();
    const [shops, products, categories] = await Promise.all([
      this.prisma.shopMarketplaceProfile.findMany({
        where: {
          ...visibleShopWhere(await this.settings.platform()),
          publicName: { contains: q, mode: 'insensitive' },
        },
        take: 5,
        select: { shopId: true, slug: true, publicName: true, logoUrl: true, city: true },
      }),
      this.prisma.productMarketplaceProfile.findMany({
        where: {
          isListedOnMarketplace: true,
          isAvailable: true,
          publicName: { contains: q, mode: 'insensitive' },
        },
        take: 5,
        select: {
          productId: true, publicName: true, publicPrice: true, publicImages: true,
        },
      }),
      this.prisma.productMarketplaceProfile.findMany({
        where: {
          isListedOnMarketplace: true,
          marketplaceCategory: { contains: q, mode: 'insensitive' },
        },
        select: { marketplaceCategory: true },
        distinct: ['marketplaceCategory'],
        take: 5,
      }),
    ]);

    return {
      suggestions: {
        shops,
        products,
        categories: categories.map((c) => c.marketplaceCategory).filter(Boolean),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════
  // RECORD SEARCH — for history + trending queries
  // ═══════════════════════════════════════════════════════════

  async recordSearch(customerId: string | undefined, query: string, resultCount: number) {
    if (!query.trim()) return;
    try {
      await this.prisma.customerSearchHistory.create({
        data: {
          customerId,
          query: query.trim(),
          resultCount,
        },
      });
    } catch {}
  }
}
