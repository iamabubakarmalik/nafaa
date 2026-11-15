/**
 * Customer cart for Nafaa Market. One cart holds lines from many shops and is
 * shown grouped per shop. Prices and stock are always read live from the POS
 * (MarketCatalogService); the price saved on a line is only the price the
 * customer saw when adding it, used to flag changes.
 */
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketCatalogService, MarketLine, lineKey } from '../_shared/market-catalog.service';
import { MarketSettingsService } from '../_shared/market-settings.service';
import { isOpenAt } from '../_shared/market-hours';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateLineDto } from './dto/update-line.dto';

const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Plain JSON object from the client (options, modifiers), capped in size. */
export function cleanJson(v: unknown): Prisma.InputJsonValue | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'object') return undefined;
  const s = JSON.stringify(v);
  if (s.length > 4000) throw new BadRequestException('Options bohat lambi hain');
  return JSON.parse(s);
}

export const PROBLEM_TEXT: Record<string, string> = {
  NOT_LISTED: 'Ye item ab Market par nahi hai',
  HIDDEN: 'Ye item abhi available nahi hai',
  VARIANT_REQUIRED: 'Size ya rang chunein',
  OUT_OF_STOCK: 'Ye item abhi stock me nahi hai',
  QTY: 'Itni quantity stock me nahi hai',
};

@Injectable()
export class MarketplaceCartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: MarketCatalogService,
    private readonly settings: MarketSettingsService,
  ) {}

  // ═══ read ═══

  /** Cart grouped by shop, priced live, with stock problems marked per line. */
  async getCart(customerId: string) {
    const cart = await this.prisma.marketplaceCart.upsert({
      where: { customerId },
      update: {},
      create: { customerId },
      include: { lines: { orderBy: { createdAt: 'asc' } } },
    });
    if (!cart.lines.length) {
      return { id: cart.id, shopGroups: [] as ShopGroup[], totalItems: 0, subtotal: 0, totalDeliveryFee: 0, grandTotal: 0, hasProblems: false };
    }

    const shopIds = [...new Set(cart.lines.map((l) => l.shopId))];
    const [live, shops] = await Promise.all([
      this.catalog.lines(cart.lines.map((l) => ({ productId: l.productId, variantId: l.variantId }))),
      this.prisma.shopMarketplaceProfile.findMany({
        where: { shopId: { in: shopIds } },
        select: {
          shopId: true, tenantId: true, slug: true, publicName: true, logoUrl: true, city: true,
          deliveryFee: true, freeDeliveryAbove: true, minOrderAmount: true, maxOrderAmount: true,
          estimatedDeliveryMinutes: true, estimatedPickupMinutes: true,
          isOpen: true, isPaused: true, isListedOnMarketplace: true, workingHours: true, holidayDates: true,
          offersDelivery: true, offersPickup: true, offersDineIn: true,
          acceptsCod: true, acceptsCard: true, acceptsJazzcash: true, acceptsEasypaisa: true, acceptsWallet: true,
          gate: true, flowSettings: true, integrationId: true, tenant: { select: { businessType: true } },
        },
      }),
    ]);
    const shopMap = new Map(shops.map((s) => [s.shopId, s]));

    const groups: ShopGroup[] = shopIds.map((shopId) => {
      const shop = shopMap.get(shopId) ?? null;
      const lines = cart.lines.filter((l) => l.shopId === shopId).map((l) => {
        const info: MarketLine | undefined = live.get(lineKey(l.productId, l.variantId));
        const price = info ? info.price : n(l.unitPrice);
        const problem = !info ? 'NOT_LISTED' : info.problem ?? (l.quantity > info.maxQty ? 'QTY' : null);
        return {
          id: l.id,
          productId: l.productId,
          variantId: l.variantId,
          productName: info?.name ?? l.productName,
          variantName: info?.variantName ?? l.variantName,
          imageUrl: info?.image ?? l.imageUrl,
          unitPrice: price,
          savedPrice: n(l.unitPrice),
          priceChanged: !!info && Math.abs(info.price - n(l.unitPrice)) > 0.009,
          compareAtPrice: info?.compareAtPrice ?? null,
          availability: info?.availability ?? 'out_of_stock',
          maxQty: info?.maxQty ?? 0,
          leadTime: info?.leadTime ?? null,
          requiresPrescription: info?.requiresPrescription ?? false,
          problem,
          problemText: problem ? PROBLEM_TEXT[problem] : null,
          stillAvailable: !problem,
          quantity: l.quantity,
          notes: l.notes,
          options: l.options,
          modifiers: l.modifiers,
          lineTotal: r2(price * l.quantity),
        };
      });
      const subtotal = r2(lines.reduce((s, l) => s + l.lineTotal, 0));
      const g = shop ? this.settings.shopGate(shop) : null;
      const minOrderAmount = Math.max(shop ? n(shop.minOrderAmount) : 0, g?.flow.minOrderAmount ?? 0);
      const deliveryFee = shop ? (shop.freeDeliveryAbove && subtotal >= n(shop.freeDeliveryAbove) ? 0 : n(shop.deliveryFee)) : 0;
      const openNow = !!shop && shop.isListedOnMarketplace && shop.isOpen && !shop.isPaused && isOpenAt(shop.workingHours, shop.holidayDates);
      return {
        shopId,
        shop: shop
          ? {
              slug: shop.slug, publicName: shop.publicName, logoUrl: shop.logoUrl, city: shop.city,
              estimatedDeliveryMinutes: shop.estimatedDeliveryMinutes, estimatedPickupMinutes: shop.estimatedPickupMinutes,
              isOpen: openNow, isPaused: shop.isPaused || !shop.isListedOnMarketplace,
              offersDelivery: shop.offersDelivery, offersPickup: shop.offersPickup && g?.flow.pickup !== false, offersDineIn: shop.offersDineIn || g?.flow.dineIn === true,
              freeDeliveryAbove: shop.freeDeliveryAbove ? n(shop.freeDeliveryAbove) : null,
            }
          : null,
        gate: g?.gate ?? null,
        flow: g?.flow ?? null,
        lines,
        subtotal,
        deliveryFee,
        minOrderAmount,
        meetsMinOrder: subtotal >= minOrderAmount,
        hasProblems: !shop || lines.some((l) => l.problem),
        // The shop checks prescriptions and a line is prescription-only: checkout needs a photo.
        needsPrescription: !!g?.flow.prescription && lines.some((l) => l.requiresPrescription),
        shopTotal: r2(subtotal + deliveryFee),
        itemCount: lines.reduce((s, l) => s + l.quantity, 0),
        _profile: shop,
      };
    });

    const subtotal = r2(groups.reduce((s, g) => s + g.subtotal, 0));
    const totalDeliveryFee = r2(groups.reduce((s, g) => s + g.deliveryFee, 0));
    return {
      id: cart.id,
      shopGroups: groups,
      totalItems: groups.reduce((s, g) => s + g.itemCount, 0),
      subtotal,
      totalDeliveryFee,
      grandTotal: r2(subtotal + totalDeliveryFee),
      hasProblems: groups.some((g) => g.hasProblems),
    };
  }

  /** The cart without internal fields, for the API response. */
  async view(customerId: string) {
    const cart = await this.getCart(customerId);
    return { ...cart, shopGroups: cart.shopGroups.map(({ _profile, ...g }) => g) };
  }

  // ═══ write ═══

  async addToCart(customerId: string, dto: AddToCartDto) {
    const variantId = dto.variantId || null;
    const info = (await this.catalog.lines([{ productId: dto.productId, variantId }])).get(lineKey(dto.productId, variantId));
    if (!info || info.problem === 'NOT_LISTED') throw new NotFoundException(PROBLEM_TEXT.NOT_LISTED);
    if (info.problem === 'HIDDEN') throw new BadRequestException(PROBLEM_TEXT.HIDDEN);
    if (info.problem === 'VARIANT_REQUIRED') throw new BadRequestException(PROBLEM_TEXT.VARIANT_REQUIRED);
    if (info.problem === 'OUT_OF_STOCK') {
      throw new ConflictException({ statusCode: 409, code: 'OUT_OF_STOCK', message: PROBLEM_TEXT.OUT_OF_STOCK, lines: [{ productId: dto.productId, variantId, available: 0 }] });
    }

    const options = cleanJson(dto.options);
    const modifiers = cleanJson(dto.modifiers);
    const cart = await this.prisma.marketplaceCart.upsert({ where: { customerId }, update: {}, create: { customerId } });
    // Same product and size without extra choices adds up on one line.
    const existing = !options && !modifiers
      ? await this.prisma.marketplaceCartLine.findFirst({
          where: { cartId: cart.id, productId: dto.productId, variantId, options: { equals: Prisma.AnyNull }, modifiers: { equals: Prisma.AnyNull } },
        })
      : null;
    const qty = (existing?.quantity ?? 0) + dto.quantity;
    if (qty > info.maxQty) {
      throw new ConflictException({ statusCode: 409, code: 'OUT_OF_STOCK', message: `Sirf ${info.maxQty} available hain`, lines: [{ productId: dto.productId, variantId, available: info.maxQty }] });
    }

    if (existing) {
      await this.prisma.marketplaceCartLine.update({
        where: { id: existing.id },
        data: { quantity: qty, unitPrice: new Prisma.Decimal(info.price), notes: dto.notes ?? existing.notes },
      });
    } else {
      await this.prisma.marketplaceCartLine.create({
        data: {
          cartId: cart.id,
          shopId: info.shopId,
          productId: dto.productId,
          variantId,
          productName: info.name,
          variantName: info.variantName,
          imageUrl: info.image,
          unitPrice: new Prisma.Decimal(info.price),
          quantity: dto.quantity,
          notes: dto.notes,
          ...(options !== undefined && { options }),
          ...(modifiers !== undefined && { modifiers }),
        },
      });
    }
    return this.view(customerId);
  }

  async updateLine(customerId: string, lineId: string, dto: UpdateLineDto) {
    const line = await this.ownLine(customerId, lineId);
    if (dto.quantity !== undefined && dto.quantity > line.quantity) {
      const info = (await this.catalog.lines([{ productId: line.productId, variantId: line.variantId }])).get(lineKey(line.productId, line.variantId));
      const max = info && !info.problem ? info.maxQty : 0;
      if (dto.quantity > max) {
        throw new ConflictException({ statusCode: 409, code: 'OUT_OF_STOCK', message: max ? `Sirf ${max} available hain` : PROBLEM_TEXT.OUT_OF_STOCK, lines: [{ lineId, available: max }] });
      }
    }
    const options = cleanJson(dto.options);
    const modifiers = cleanJson(dto.modifiers);
    await this.prisma.marketplaceCartLine.update({
      where: { id: lineId },
      data: {
        quantity: dto.quantity ?? line.quantity,
        notes: dto.notes ?? line.notes,
        ...(options !== undefined && { options }),
        ...(modifiers !== undefined && { modifiers }),
      },
    });
    return this.view(customerId);
  }

  async removeLine(customerId: string, lineId: string) {
    await this.ownLine(customerId, lineId);
    await this.prisma.marketplaceCartLine.delete({ where: { id: lineId } });
    return this.view(customerId);
  }

  async clearCart(customerId: string) {
    const cart = await this.prisma.marketplaceCart.findUnique({ where: { customerId } });
    if (cart) await this.prisma.marketplaceCartLine.deleteMany({ where: { cartId: cart.id } });
    return this.view(customerId);
  }

  async clearShopGroup(customerId: string, shopId: string) {
    const cart = await this.prisma.marketplaceCart.findUnique({ where: { customerId } });
    if (cart) await this.prisma.marketplaceCartLine.deleteMany({ where: { cartId: cart.id, shopId } });
    return this.view(customerId);
  }

  async moveLineToWishlist(customerId: string, lineId: string) {
    const line = await this.ownLine(customerId, lineId);
    await this.prisma.$transaction([
      this.prisma.wishlistItem.upsert({
        where: { customerId_productId: { customerId, productId: line.productId } },
        update: {},
        create: { customerId, productId: line.productId, shopId: line.shopId },
      }),
      this.prisma.marketplaceCartLine.delete({ where: { id: lineId } }),
    ]);
    return this.view(customerId);
  }

  async getCartCount(customerId: string) {
    const cart = await this.prisma.marketplaceCart.findUnique({
      where: { customerId },
      include: { lines: { select: { quantity: true } } },
    });
    return { count: cart?.lines.reduce((s, l) => s + l.quantity, 0) ?? 0 };
  }

  private async ownLine(customerId: string, lineId: string) {
    const line = await this.prisma.marketplaceCartLine.findUnique({ where: { id: lineId }, include: { cart: true } });
    if (!line || line.cart.customerId !== customerId) throw new NotFoundException('Cart me ye item nahi mila');
    return line;
  }
}

export type CartView = Awaited<ReturnType<MarketplaceCartService['getCart']>>;
export interface ShopGroup {
  shopId: string;
  shop: {
    slug: string; publicName: string; logoUrl: string | null; city: string;
    estimatedDeliveryMinutes: number | null; estimatedPickupMinutes: number | null;
    isOpen: boolean; isPaused: boolean; offersDelivery: boolean; offersPickup: boolean; offersDineIn: boolean; freeDeliveryAbove: number | null;
  } | null;
  gate: string | null;
  flow: ReturnType<MarketSettingsService['shopGate']>['flow'] | null;
  lines: Array<{
    id: string; productId: string; variantId: string | null; productName: string; variantName: string | null; imageUrl: string | null;
    unitPrice: number; savedPrice: number; priceChanged: boolean; compareAtPrice: number | null; availability: string; maxQty: number;
    leadTime: string | null; requiresPrescription: boolean; problem: string | null; problemText: string | null; stillAvailable: boolean; quantity: number;
    notes: string | null; options: Prisma.JsonValue; modifiers: Prisma.JsonValue; lineTotal: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  minOrderAmount: number;
  meetsMinOrder: boolean;
  hasProblems: boolean;
  needsPrescription: boolean;
  shopTotal: number;
  itemCount: number;
  _profile: CartShopProfile | null;
}

export interface CartShopProfile {
  shopId: string; tenantId: string; slug: string; publicName: string; logoUrl: string | null; city: string;
  deliveryFee: Prisma.Decimal; freeDeliveryAbove: Prisma.Decimal | null; minOrderAmount: Prisma.Decimal; maxOrderAmount: Prisma.Decimal | null;
  estimatedDeliveryMinutes: number | null; estimatedPickupMinutes: number | null;
  isOpen: boolean; isPaused: boolean; isListedOnMarketplace: boolean; workingHours: Prisma.JsonValue; holidayDates: Date[];
  offersDelivery: boolean; offersPickup: boolean; offersDineIn: boolean;
  acceptsCod: boolean; acceptsCard: boolean; acceptsJazzcash: boolean; acceptsEasypaisa: boolean; acceptsWallet: boolean;
  gate: string | null; flowSettings: Prisma.JsonValue; integrationId: string | null; tenant: { businessType: string | null };
}
