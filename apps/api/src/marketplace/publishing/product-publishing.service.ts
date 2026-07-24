import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductPublishingService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveShopId(tenantId: string, shopId?: string | null): Promise<string> {
    if (shopId) return shopId;
    const shop = await this.prisma.shop.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('Koi shop nahi mili. Pehle ek shop banayein.');
    return shop.id;
  }

  // ═══════════════════════════════════════════════════════════════
  // LIST for marketplace management — DB-level filter
  // ═══════════════════════════════════════════════════════════════
  async listForManagement(tenantId: string, shopId: string | null | undefined, opts: {
  isListedOnMarketplace?: boolean;
  search?: string;
  category?: string;
  sortBy?: 'name' | 'listed' | 'price_asc' | 'price_desc' | 'sold' | 'rating';
  page?: number;
  limit?: number;
}) {
  const resolvedShopId = await this.resolveShopId(tenantId, shopId);
  const page = opts.page || 1;
  const limit = opts.limit || 24;
  const skip = (page - 1) * limit;

  // Build AND-based where — safer than OR
  const conditions: any[] = [
    { tenantId },
    { isActive: true },
  ];

  if (opts.search) {
    conditions.push({
      OR: [
        { name: { contains: opts.search, mode: 'insensitive' } },
        { sku: { contains: opts.search, mode: 'insensitive' } },
      ],
    });
  }

  // Marketplace filter — separate condition
  if (opts.isListedOnMarketplace === true) {
    conditions.push({
      marketplaceProfile: {
        is: {
          isListedOnMarketplace: true,
          shopId: resolvedShopId,
        },
      },
    });
  } else if (opts.isListedOnMarketplace === false) {
    conditions.push({
      OR: [
        { marketplaceProfile: { is: null } },
        {
          marketplaceProfile: {
            is: { isListedOnMarketplace: false },
          },
        },
      ],
    });
  }

  const productWhere: any = { AND: conditions };

  const [products, total] = await Promise.all([
    this.prisma.product.findMany({
      where: productWhere,
      include: {
        marketplaceProfile: true,
        images: { orderBy: { sortOrder: 'asc' }, take: 5 },
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
      orderBy: this.buildOrderBy(opts.sortBy),
      skip,
      take: limit,
    }),
    this.prisma.product.count({ where: productWhere }),
  ]);

  // Overall counts — NOT filtered by search/status
  const [listedCount, totalProductsCount] = await Promise.all([
    this.prisma.productMarketplaceProfile.count({
      where: { tenantId, shopId: resolvedShopId, isListedOnMarketplace: true },
    }),
    this.prisma.product.count({ where: { tenantId, isActive: true } }),
  ]);

  const items = products.map((p) => {
    const mp = p.marketplaceProfile;
    return {
      id: mp?.id || `unlisted-${p.id}`,
      productId: p.id,
      shopId: resolvedShopId,
      tenantId,
      isListedOnMarketplace: mp?.isListedOnMarketplace || false,
      listedAt: mp?.listedAt ?? null,
      publicName: mp?.publicName || p.name,
      publicDescription: mp?.publicDescription || p.description || '',
      publicPrice: Number(mp?.publicPrice ?? p.price),
      compareAtPrice: mp?.compareAtPrice ? Number(mp.compareAtPrice) : null,
      publicImages: mp?.publicImages?.length ? mp.publicImages : p.images?.map((i) => i.url) || [],
      marketplaceCategory: mp?.marketplaceCategory || p.category?.name || null,
      marketplaceSubCategory: mp?.marketplaceSubCategory || null,
      tags: mp?.tags || [],
      isAvailable: mp?.isAvailable ?? true,
      totalSold: mp?.totalSold || 0,
      ratingAverage: mp?.ratingAverage || 0,
      ratingCount: mp?.ratingCount || 0,
      viewCount: mp?.viewCount || 0,
      wishlistCount: mp?.wishlistCount || 0,
      bargainEnabled: mp?.bargainEnabled || false,
      bargainMinPrice: mp?.bargainMinPrice ? Number(mp.bargainMinPrice) : null,
      groupBuyEnabled: mp?.groupBuyEnabled || false,
      auctionEnabled: mp?.auctionEnabled || false,
      productName: p.name,
      productSku: p.sku,
      productUnit: p.unit,
      productPrice: Number(p.price),
      productStock: Number(p.stock),
    };
  });

  return {
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    counts: {
      listed: listedCount,
      unlisted: totalProductsCount - listedCount,
      total: totalProductsCount,
    },
  };
}


  private buildOrderBy(sortBy?: string): any {
    switch (sortBy) {
      case 'name': return { name: 'asc' };
      case 'price_asc': return { price: 'asc' };
      case 'price_desc': return { price: 'desc' };
      default: return { updatedAt: 'desc' };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // BULK OPERATIONS
  // ═══════════════════════════════════════════════════════════════
  async bulkPublish(tenantId: string, shopId: string | null | undefined, productIds: string[]) {
    if (!productIds.length) throw new BadRequestException('No products selected');
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const shop = await this.prisma.shop.findFirst({
      where: { id: resolvedShopId, tenantId },
      include: { marketplaceProfile: true },
    });
    if (!shop?.marketplaceProfile?.isListedOnMarketplace) {
      throw new BadRequestException('Pehle apni shop marketplace pe publish karein.');
    }

    let count = 0;
    for (const productId of productIds) {
      try {
        const product = await this.prisma.product.findFirst({
          where: { id: productId, tenantId },
          include: { marketplaceProfile: true, images: { orderBy: { sortOrder: 'asc' } }, category: true, variants: true },
        });
        if (!product) continue;

        if (product.marketplaceProfile) {
          await this.prisma.productMarketplaceProfile.update({
            where: { productId },
            data: { isListedOnMarketplace: true, listedAt: new Date() },
          });
        } else {
          await this.prisma.productMarketplaceProfile.create({
            data: {
              productId,
              shopId: resolvedShopId,
              tenantId,
              publicName: product.name,
              publicDescription: product.description || '',
              publicPrice: product.price,
              publicImages: product.images?.map((i) => i.url) || [],
              marketplaceCategory: product.category?.name || 'GROCERY',
              isAvailable: true,
              isListedOnMarketplace: true,
              listedAt: new Date(),
            },
          });
        }
        count++;
      } catch (e) {
        console.error(`Failed to publish ${productId}:`, e);
      }
    }
    return { count };
  }

  async bulkUnpublish(tenantId: string, _shopId: string | null | undefined, productIds: string[]) {
    if (!productIds.length) throw new BadRequestException('No products selected');

    const result = await this.prisma.productMarketplaceProfile.updateMany({
      where: {
        productId: { in: productIds },
        tenantId,
      },
      data: { isListedOnMarketplace: false },
    });
    return { count: result.count };
  }

  // ═══════════════════════════════════════════════════════════════
  // SINGLE
  // ═══════════════════════════════════════════════════════════════
  async getProfile(tenantId: string, shopId: string | null | undefined, productId: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      include: { marketplaceProfile: true, images: { orderBy: { sortOrder: 'asc' } }, category: true, variants: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (product.marketplaceProfile) {
      const mp = product.marketplaceProfile;
      const posImages = product.images?.map((i) => i.url) || [];
      const usingPosImages = !mp.publicImages || mp.publicImages.length === 0;
      const effectiveImages = usingPosImages ? posImages : mp.publicImages;
      return {
        ...mp,
        publicImages: effectiveImages,
        posImages,
        usingPosImages,
        publicPrice: Number(mp.publicPrice),
        compareAtPrice: mp.compareAtPrice ? Number(mp.compareAtPrice) : null,
        bargainMinPrice: mp.bargainMinPrice ? Number(mp.bargainMinPrice) : null,
        productName: product.name,
        productSku: product.sku,
        productUnit: product.unit,
        productPrice: Number(product.price),
        productStock: Number(product.stock),
        productVariants: ((product as any).variants || []).map((v: any) => ({
          id: v.id,
          name: v.name || v.title || 'Variant',
          sku: v.sku,
          price: v.price ? Number(v.price) : undefined,
          stock: v.stock !== undefined && v.stock !== null ? Number(v.stock) : undefined,
          attributes: v.attributes || v.options || {},
          imageUrl: v.imageUrl || v.image,
          isAvailable: v.isAvailable !== false,
        })),
      };
    }

    // Return default profile (not yet created) with product data pre-filled
    const posImages = product.images?.map((i) => i.url) || [];
    return {
      productId,
      shopId: resolvedShopId,
      tenantId,
      isListedOnMarketplace: false,
      publicName: product.name,
      publicDescription: product.description || '',
      publicPrice: Number(product.price) || 0,
      compareAtPrice: null,
      publicImages: posImages,
      posImages,
      usingPosImages: true,
      marketplaceCategory: product.category?.name || '',
      isAvailable: true,
      bargainEnabled: false,
      groupBuyEnabled: false,
      bargainMinPrice: null,
      totalSold: 0,
      ratingAverage: 0,
      ratingCount: 0,
      viewCount: 0,
      wishlistCount: 0,
      productName: product.name,
      productSku: product.sku,
      productUnit: product.unit,
      productPrice: Number(product.price),
      productStock: Number(product.stock),
      productVariants: ((product as any).variants || []).map((v: any) => ({
        id: v.id,
        name: v.name || v.title || 'Variant',
        sku: v.sku,
        price: v.price ? Number(v.price) : undefined,
        stock: v.stock !== undefined && v.stock !== null ? Number(v.stock) : undefined,
        attributes: v.attributes || v.options || {},
        imageUrl: v.imageUrl || v.image,
        isAvailable: v.isAvailable !== false,
      })),
    };
  }

  async updateProfile(tenantId: string, shopId: string | null | undefined, productId: string, dto: any) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      include: { marketplaceProfile: true, category: true, images: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const data: any = {};
    const fields = [
      'publicName', 'publicDescription', 'publicPrice', 'compareAtPrice',
      'publicImages', 'marketplaceCategory', 'marketplaceSubCategory',
      'tags', 'isAvailable', 'bargainEnabled', 'groupBuyEnabled',
      'bargainMinPrice', 'metaTitle', 'metaDescription',
    ];
    for (const f of fields) {
      if (dto[f] !== undefined) data[f] = dto[f];
    }
    if (dto.compareAtPrice !== undefined) data.compareAtPrice = dto.compareAtPrice || null;
    if (dto.bargainMinPrice !== undefined) data.bargainMinPrice = dto.bargainMinPrice || null;

    if (product.marketplaceProfile) {
      return this.prisma.productMarketplaceProfile.update({
        where: { productId },
        data,
      });
    }

    // Create fresh profile
    return this.prisma.productMarketplaceProfile.create({
      data: {
        productId,
        shopId: resolvedShopId,
        tenantId,
        publicName: dto.publicName || product.name,
        publicDescription: dto.publicDescription ?? product.description ?? '',
        publicPrice: dto.publicPrice ?? product.price,
        publicImages: dto.publicImages ?? (product.images?.map((i) => i.url) || []),
        marketplaceCategory: dto.marketplaceCategory ?? product.category?.name ?? 'GROCERY',
        isAvailable: dto.isAvailable ?? true,
        isListedOnMarketplace: false,
        bargainEnabled: dto.bargainEnabled ?? false,
        groupBuyEnabled: dto.groupBuyEnabled ?? false,
      },
    });
  }

  async publish(tenantId: string, shopId: string | null | undefined, productId: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const shop = await this.prisma.shop.findFirst({
      where: { id: resolvedShopId, tenantId },
      include: { marketplaceProfile: true },
    });
    if (!shop?.marketplaceProfile?.isListedOnMarketplace) {
      throw new BadRequestException('Pehle apni shop marketplace pe publish karein (Marketplace → Shop Profile).');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      include: { marketplaceProfile: true, images: { orderBy: { sortOrder: 'asc' } }, category: true, variants: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (!product.marketplaceProfile) {
      await this.prisma.productMarketplaceProfile.create({
        data: {
          productId,
          shopId: resolvedShopId,
          tenantId,
          publicName: product.name,
          publicDescription: product.description || '',
          publicPrice: product.price,
          publicImages: product.images?.map((i) => i.url) || [],
          marketplaceCategory: product.category?.name || 'GROCERY',
          isAvailable: true,
          isListedOnMarketplace: true,
          listedAt: new Date(),
        },
      });
    } else {
      if (!product.marketplaceProfile.publicName || Number(product.marketplaceProfile.publicPrice) <= 0) {
        throw new BadRequestException('Public name aur valid price zaroori hain');
      }
      // Auto-fill images from POS if marketplace has none
      const updateData: any = { isListedOnMarketplace: true, listedAt: new Date() };
      if (!product.marketplaceProfile.publicImages || product.marketplaceProfile.publicImages.length === 0) {
        const posImages = product.images?.map((i) => i.url) || [];
        if (posImages.length > 0) {
          updateData.publicImages = posImages;
        }
      }
      await this.prisma.productMarketplaceProfile.update({
        where: { productId },
        data: updateData,
      });
    }

    return { success: true, message: 'Product is now live on marketplace!' };
  }

  async unpublish(tenantId: string, _shopId: string | null | undefined, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      include: { marketplaceProfile: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (!product.marketplaceProfile) {
      return { success: true, message: 'Was not listed' };
    }

    await this.prisma.productMarketplaceProfile.update({
      where: { productId },
      data: { isListedOnMarketplace: false },
    });

    return { success: true };
  }
}
