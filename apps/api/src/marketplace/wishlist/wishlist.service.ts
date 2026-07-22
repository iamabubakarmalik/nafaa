import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AddWishlistDto } from './dto/add-wishlist.dto';
import { ListWishlistDto } from './dto/list-wishlist.dto';

@Injectable()
export class MarketplaceWishlistService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // ADD
  // ═══════════════════════════════════════════════════════════

  async add(customerId: string, dto: AddWishlistDto) {
    const product = await this.prisma.productMarketplaceProfile.findUnique({
      where: { productId: dto.productId },
      select: { productId: true, shopId: true, isListedOnMarketplace: true },
    });
    if (!product || !product.isListedOnMarketplace) {
      throw new NotFoundException('Product not available');
    }

    await this.prisma.$transaction([
      this.prisma.wishlistItem.upsert({
        where: { customerId_productId: { customerId, productId: dto.productId } },
        update: { notes: dto.notes ?? undefined },
        create: { customerId, productId: dto.productId, shopId: product.shopId, notes: dto.notes },
      }),
      this.prisma.productMarketplaceProfile.update({
        where: { productId: dto.productId },
        data: { wishlistCount: { increment: 1 } },
      }),
    ]);
    return { success: true, isInWishlist: true };
  }

  // ═══════════════════════════════════════════════════════════
  // REMOVE
  // ═══════════════════════════════════════════════════════════

  async remove(customerId: string, productId: string) {
    const existing = await this.prisma.wishlistItem.findUnique({
      where: { customerId_productId: { customerId, productId } },
    });
    if (!existing) return { success: true, isInWishlist: false };

    await this.prisma.$transaction([
      this.prisma.wishlistItem.delete({
        where: { customerId_productId: { customerId, productId } },
      }),
      this.prisma.productMarketplaceProfile.update({
        where: { productId },
        data: { wishlistCount: { decrement: 1 } },
      }),
    ]);
    return { success: true, isInWishlist: false };
  }

  // ═══════════════════════════════════════════════════════════
  // TOGGLE (one-tap)
  // ═══════════════════════════════════════════════════════════

  async toggle(customerId: string, productId: string) {
    const existing = await this.prisma.wishlistItem.findUnique({
      where: { customerId_productId: { customerId, productId } },
    });
    if (existing) return this.remove(customerId, productId);
    return this.add(customerId, { productId });
  }

  // ═══════════════════════════════════════════════════════════
  // LIST
  // ═══════════════════════════════════════════════════════════

  async list(customerId: string, dto: ListWishlistDto) {
    const items = await this.prisma.wishlistItem.findMany({
      where: {
        customerId,
        ...(dto.shopId ? { shopId: dto.shopId } : {}),
      },
      orderBy: { addedAt: 'desc' },
      take: 500,
    });
    if (items.length === 0) {
      return { items: [], total: 0, limit: dto.limit ?? 24, offset: dto.offset ?? 0 };
    }

    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.productMarketplaceProfile.findMany({
      where: {
        productId: { in: productIds },
        ...(dto.category ? { marketplaceCategory: dto.category } : {}),
      },
      select: {
        productId: true, shopId: true, publicName: true, publicDescription: true,
        publicPrice: true, compareAtPrice: true, publicImages: true,
        marketplaceCategory: true, isAvailable: true, isListedOnMarketplace: true,
        ratingAverage: true, ratingCount: true, totalSold: true,
        bargainEnabled: true, groupBuyEnabled: true,
        shop: {
          select: {
            id: true,
            marketplaceProfile: {
              select: {
                shopId: true, slug: true, publicName: true, logoUrl: true,
                city: true, deliveryFee: true, freeDeliveryAbove: true,
                estimatedDeliveryMinutes: true,
              },
            },
          },
        },
      },
    });
    const productMap = new Map(products.map((p) => [p.productId, p]));

    let combined = items
      .map((i) => {
        const p = productMap.get(i.productId);
        if (!p) return null;
        return {
          wishlistId: i.id,
          notes: i.notes,
          addedAt: i.addedAt,
          product: {
            ...p,
            priceDropped: p.compareAtPrice && Number(p.publicPrice) < Number(p.compareAtPrice),
          },
        };
      })
      .filter(Boolean) as any[];

    // Sort
    combined.sort((a, b) => {
      switch (dto.sortBy) {
        case 'price_asc':  return Number(a.product.publicPrice) - Number(b.product.publicPrice);
        case 'price_desc': return Number(b.product.publicPrice) - Number(a.product.publicPrice);
        case 'name':       return a.product.publicName.localeCompare(b.product.publicName);
        default:           return b.addedAt.getTime() - a.addedAt.getTime();
      }
    });

    const total = combined.length;
    const offset = dto.offset ?? 0;
    const limit = dto.limit ?? 24;
    combined = combined.slice(offset, offset + limit);

    return { items: combined, total, limit, offset };
  }

  // ═══════════════════════════════════════════════════════════
  // BATCH CHECK — for product list "is in wishlist" badges
  // ═══════════════════════════════════════════════════════════

  async checkBatch(customerId: string, productIds: string[]) {
    if (!productIds.length) return { inWishlist: {} };
    const rows = await this.prisma.wishlistItem.findMany({
      where: { customerId, productId: { in: productIds } },
      select: { productId: true },
    });
    const set = new Set(rows.map((r) => r.productId));
    const map: Record<string, boolean> = {};
    productIds.forEach((id) => (map[id] = set.has(id)));
    return { inWishlist: map };
  }

  // ═══════════════════════════════════════════════════════════
  // MOVE TO CART
  // ═══════════════════════════════════════════════════════════

  async moveToCart(customerId: string, productId: string, quantity = 1) {
    const wishlistItem = await this.prisma.wishlistItem.findUnique({
      where: { customerId_productId: { customerId, productId } },
    });
    if (!wishlistItem) throw new NotFoundException('Not in wishlist');

    const product = await this.prisma.productMarketplaceProfile.findUnique({
      where: { productId },
      select: {
        productId: true, shopId: true, publicName: true, publicPrice: true,
        publicImages: true, isAvailable: true, isListedOnMarketplace: true,
      },
    });
    if (!product || !product.isListedOnMarketplace) {
      throw new BadRequestException('Product no longer available');
    }
    if (!product.isAvailable) throw new BadRequestException('Product out of stock');

    const cart = await this.prisma.marketplaceCart.upsert({
      where: { customerId }, update: {}, create: { customerId },
    });

    const existing = await this.prisma.marketplaceCartLine.findFirst({
      where: {
        cartId: cart.id, productId, variantId: null,
        bargainId: null, groupBuyId: null,
      },
    });

    await this.prisma.$transaction([
      existing
        ? this.prisma.marketplaceCartLine.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + quantity },
          })
        : this.prisma.marketplaceCartLine.create({
            data: {
              cartId: cart.id,
              shopId: product.shopId,
              productId,
              productName: product.publicName,
              imageUrl: product.publicImages?.[0] ?? null,
              unitPrice: product.publicPrice,
              quantity,
            },
          }),
      this.prisma.wishlistItem.delete({
        where: { customerId_productId: { customerId, productId } },
      }),
      this.prisma.productMarketplaceProfile.update({
        where: { productId },
        data: { wishlistCount: { decrement: 1 } },
      }),
    ]);

    return { success: true, message: 'Moved to cart' };
  }

  // ═══════════════════════════════════════════════════════════
  // CLEAR
  // ═══════════════════════════════════════════════════════════

  async clearAll(customerId: string) {
    const items = await this.prisma.wishlistItem.findMany({
      where: { customerId },
      select: { productId: true },
    });
    if (items.length === 0) return { success: true, cleared: 0 };

    await this.prisma.$transaction([
      this.prisma.wishlistItem.deleteMany({ where: { customerId } }),
      this.prisma.productMarketplaceProfile.updateMany({
        where: { productId: { in: items.map((i) => i.productId) } },
        data: { wishlistCount: { decrement: 1 } },
      }),
    ]);
    return { success: true, cleared: items.length };
  }

  // ═══════════════════════════════════════════════════════════
  // COUNT
  // ═══════════════════════════════════════════════════════════

  async getCount(customerId: string) {
    const count = await this.prisma.wishlistItem.count({ where: { customerId } });
    return { count };
  }
}
