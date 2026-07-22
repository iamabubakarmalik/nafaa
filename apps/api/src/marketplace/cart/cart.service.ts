import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateLineDto } from './dto/update-line.dto';

@Injectable()
export class MarketplaceCartService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // GET CART — grouped by shop with totals
  // ═══════════════════════════════════════════════════════════

  async getCart(customerId: string) {
    let cart = await this.prisma.marketplaceCart.findUnique({
      where: { customerId },
      include: { lines: { orderBy: { createdAt: 'asc' } } },
    });

    if (!cart) {
      cart = await this.prisma.marketplaceCart.create({
        data: { customerId },
        include: { lines: true },
      });
    }

    if (cart.lines.length === 0) {
      return {
        id: cart.id,
        shopGroups: [],
        totalItems: 0,
        subtotal: 0,
        totalDeliveryFee: 0,
        grandTotal: 0,
      };
    }

    const shopIds = Array.from(new Set(cart.lines.map((l) => l.shopId)));
    const shops = await this.prisma.shopMarketplaceProfile.findMany({
      where: { shopId: { in: shopIds } },
      select: {
        shopId: true, slug: true, publicName: true, logoUrl: true,
        deliveryFee: true, freeDeliveryAbove: true, minOrderAmount: true,
        estimatedDeliveryMinutes: true, isOpen: true, isPaused: true,
      },
    });
    const shopMap = new Map(shops.map((s) => [s.shopId, s]));

    // Validate lines against current listings (price + availability drift check)
    const productIds = Array.from(new Set(cart.lines.map((l) => l.productId)));
    const products = await this.prisma.productMarketplaceProfile.findMany({
      where: { productId: { in: productIds } },
      select: {
        productId: true, publicName: true, publicPrice: true, compareAtPrice: true,
        publicImages: true, isAvailable: true, isListedOnMarketplace: true,
      },
    });
    const productMap = new Map(products.map((p) => [p.productId, p]));

    // Build shop-grouped structure
    const groups = shopIds.map((shopId) => {
      const shop = shopMap.get(shopId);
      const lines = cart.lines
        .filter((l) => l.shopId === shopId)
        .map((l) => {
          const p = productMap.get(l.productId);
          const currentPrice = p ? Number(p.publicPrice) : Number(l.unitPrice);
          const priceChanged = p && Number(p.publicPrice) !== Number(l.unitPrice);
          const stillAvailable = !!(p?.isAvailable && p?.isListedOnMarketplace);
          return {
            id: l.id,
            productId: l.productId,
            variantId: l.variantId,
            productName: l.productName,
            variantName: l.variantName,
            imageUrl: l.imageUrl ?? p?.publicImages?.[0] ?? null,
            unitPrice: Number(l.unitPrice),
            currentPrice,
            priceChanged,
            stillAvailable,
            quantity: l.quantity,
            notes: l.notes,
            modifiers: l.modifiers,
            bargainId: l.bargainId,
            groupBuyId: l.groupBuyId,
            lineTotal: Number(l.unitPrice) * l.quantity,
            compareAtPrice: p?.compareAtPrice ? Number(p.compareAtPrice) : null,
          };
        });

      const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
      const deliveryFee = shop
        ? shop.freeDeliveryAbove && subtotal >= Number(shop.freeDeliveryAbove)
          ? 0
          : Number(shop.deliveryFee)
        : 0;
      const minOrderAmount = shop ? Number(shop.minOrderAmount) : 0;
      const meetsMinOrder = subtotal >= minOrderAmount;

      return {
        shopId,
        shop: shop
          ? {
              slug: shop.slug, publicName: shop.publicName, logoUrl: shop.logoUrl,
              estimatedDeliveryMinutes: shop.estimatedDeliveryMinutes,
              isOpen: shop.isOpen && !shop.isPaused,
            }
          : null,
        lines,
        subtotal,
        deliveryFee,
        minOrderAmount,
        meetsMinOrder,
        shopTotal: subtotal + deliveryFee,
        itemCount: lines.reduce((s, l) => s + l.quantity, 0),
      };
    });

    const totalItems = groups.reduce((s, g) => s + g.itemCount, 0);
    const subtotal = groups.reduce((s, g) => s + g.subtotal, 0);
    const totalDeliveryFee = groups.reduce((s, g) => s + g.deliveryFee, 0);
    const grandTotal = subtotal + totalDeliveryFee;

    return {
      id: cart.id,
      shopGroups: groups,
      totalItems, subtotal, totalDeliveryFee, grandTotal,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // ADD TO CART (merge if same product+variant exists)
  // ═══════════════════════════════════════════════════════════

  async addToCart(customerId: string, dto: AddToCartDto) {
    const product = await this.prisma.productMarketplaceProfile.findUnique({
      where: { productId: dto.productId },
      select: {
        productId: true, shopId: true, publicName: true,
        publicPrice: true, publicImages: true,
        isAvailable: true, isListedOnMarketplace: true,
        bargainEnabled: true, groupBuyEnabled: true,
      },
    });
    if (!product || !product.isListedOnMarketplace) {
      throw new NotFoundException('Product not available on marketplace');
    }
    if (!product.isAvailable) throw new BadRequestException('Product currently out of stock');

    // Variant snapshot
    let variantName: string | null = null;
    let unitPrice = Number(product.publicPrice);
    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: dto.variantId },
      });
      if (!variant) throw new NotFoundException('Variant not found');
      variantName = variant.name;
      unitPrice = Number(variant.price);
    }

    // Bargain — use final agreed price
    if (dto.bargainId) {
      const bargain = await this.prisma.bargain.findUnique({
        where: { id: dto.bargainId },
      });
      if (!bargain || bargain.customerId !== customerId) {
        throw new BadRequestException('Bargain not found');
      }
      if (bargain.status !== 'ACCEPTED') {
        throw new BadRequestException('Bargain must be ACCEPTED before adding to cart');
      }
      if (bargain.orderId) {
        throw new BadRequestException('Bargain already used for another order');
      }
      unitPrice = Number(bargain.finalPrice ?? bargain.currentOffer);
    }

    // Group buy — use group price
    if (dto.groupBuyId) {
      const gb = await this.prisma.groupBuy.findUnique({ where: { id: dto.groupBuyId } });
      if (!gb) throw new NotFoundException('Group buy not found');
      if (gb.status !== 'ACTIVE') throw new BadRequestException('Group buy not active');
      if (gb.expiresAt < new Date()) throw new BadRequestException('Group buy expired');
      unitPrice = Number(gb.groupPrice);
    }

    // Get / create cart
    const cart = await this.prisma.marketplaceCart.upsert({
      where: { customerId },
      update: {},
      create: { customerId },
    });

    // Merge with existing line if same product+variant AND no bargain/groupBuy
    if (!dto.bargainId && !dto.groupBuyId) {
      const existing = await this.prisma.marketplaceCartLine.findFirst({
        where: {
          cartId: cart.id, productId: dto.productId, variantId: dto.variantId ?? null,
          bargainId: null, groupBuyId: null,
        },
      });
      if (existing) {
        const updated = await this.prisma.marketplaceCartLine.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + dto.quantity,
            notes: dto.notes ?? existing.notes,
            modifiers: dto.modifiers ?? (existing.modifiers as any),
          },
        });
        return this.getCart(customerId);
      }
    }

    // Otherwise create new line
    await this.prisma.marketplaceCartLine.create({
      data: {
        cartId: cart.id,
        shopId: product.shopId,
        productId: dto.productId,
        variantId: dto.variantId,
        productName: product.publicName,
        variantName,
        imageUrl: product.publicImages?.[0] ?? null,
        unitPrice: new Prisma.Decimal(unitPrice),
        quantity: dto.quantity,
        notes: dto.notes,
        modifiers: dto.modifiers,
        bargainId: dto.bargainId,
        groupBuyId: dto.groupBuyId,
      },
    });

    return this.getCart(customerId);
  }

  // ═══════════════════════════════════════════════════════════
  // UPDATE LINE
  // ═══════════════════════════════════════════════════════════

  async updateLine(customerId: string, lineId: string, dto: UpdateLineDto) {
    const line = await this.prisma.marketplaceCartLine.findUnique({
      where: { id: lineId }, include: { cart: true },
    });
    if (!line || line.cart.customerId !== customerId) {
      throw new NotFoundException('Cart line not found');
    }
    if (dto.quantity !== undefined && dto.quantity <= 0) {
      await this.prisma.marketplaceCartLine.delete({ where: { id: lineId } });
      return this.getCart(customerId);
    }
    await this.prisma.marketplaceCartLine.update({
      where: { id: lineId },
      data: {
        quantity: dto.quantity ?? line.quantity,
        notes: dto.notes ?? line.notes,
        modifiers: dto.modifiers ?? (line.modifiers as any),
      },
    });
    return this.getCart(customerId);
  }

  // ═══════════════════════════════════════════════════════════
  // REMOVE LINE
  // ═══════════════════════════════════════════════════════════

  async removeLine(customerId: string, lineId: string) {
    const line = await this.prisma.marketplaceCartLine.findUnique({
      where: { id: lineId }, include: { cart: true },
    });
    if (!line || line.cart.customerId !== customerId) {
      throw new NotFoundException('Cart line not found');
    }
    await this.prisma.marketplaceCartLine.delete({ where: { id: lineId } });
    return this.getCart(customerId);
  }

  // ═══════════════════════════════════════════════════════════
  // CLEAR CART / CLEAR SHOP GROUP
  // ═══════════════════════════════════════════════════════════

  async clearCart(customerId: string) {
    const cart = await this.prisma.marketplaceCart.findUnique({ where: { customerId } });
    if (cart) {
      await this.prisma.marketplaceCartLine.deleteMany({ where: { cartId: cart.id } });
    }
    return this.getCart(customerId);
  }

  async clearShopGroup(customerId: string, shopId: string) {
    const cart = await this.prisma.marketplaceCart.findUnique({ where: { customerId } });
    if (cart) {
      await this.prisma.marketplaceCartLine.deleteMany({
        where: { cartId: cart.id, shopId },
      });
    }
    return this.getCart(customerId);
  }

  // ═══════════════════════════════════════════════════════════
  // MOVE TO WISHLIST
  // ═══════════════════════════════════════════════════════════

  async moveLineToWishlist(customerId: string, lineId: string) {
    const line = await this.prisma.marketplaceCartLine.findUnique({
      where: { id: lineId }, include: { cart: true },
    });
    if (!line || line.cart.customerId !== customerId) {
      throw new NotFoundException('Cart line not found');
    }
    await this.prisma.$transaction([
      this.prisma.wishlistItem.upsert({
        where: { customerId_productId: { customerId, productId: line.productId } },
        update: {},
        create: { customerId, productId: line.productId, shopId: line.shopId },
      }),
      this.prisma.marketplaceCartLine.delete({ where: { id: lineId } }),
    ]);
    return this.getCart(customerId);
  }

  // ═══════════════════════════════════════════════════════════
  // COUNT (for badge)
  // ═══════════════════════════════════════════════════════════

  async getCartCount(customerId: string) {
    const cart = await this.prisma.marketplaceCart.findUnique({
      where: { customerId },
      include: { lines: { select: { quantity: true } } },
    });
    const count = cart?.lines.reduce((s, l) => s + l.quantity, 0) ?? 0;
    return { count };
  }
}
