import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

/**
 * MobilePosService — single source of truth for the Mobile POS screen.
 *
 * Ek hi call me POS ki teeno tabs ka data deta hai:
 *   • phones      → IN_STOCK ProductImei rows, **resolved sale price ke saath**
 *   • usedPhones  → IN_STOCK trade-in stock
 *   • accessories → jin products ka koi IMEI record nahi, **shop-scoped stock ke saath**
 *
 * Kyun: pehle POS 3 alag queries maarta tha (jinme ek 2000 IMEI rows fetch karke
 * accessories derive karti thi) aur IMEI search product.price select hi nahi karti
 * thi — is wajah se har phone Rs 0 par cart me jaata tha.
 */
@Injectable()
export class MobilePosService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly PHONE_TAKE = 1000;
  private readonly ACCESSORY_TAKE = 1000;
  private readonly USED_TAKE = 500;

  async catalog(
    user: AuthenticatedUser,
    params: { shopId?: string; search?: string },
  ) {
    const tenantId = user.tenantId;
    const search = params.search?.trim() || undefined;
    const shopId = params.shopId || undefined;

    const [phones, usedPhones, accessories, pendingInspection] = await Promise.all([
      this.findPhones(tenantId, shopId, search),
      this.findUsedPhones(tenantId, shopId, search),
      this.findAccessories(tenantId, shopId, search),
      // Trade-in ke baad phone PENDING_INSPECTION me atak jata hai aur
      // POS tak pahunchta hi nahi — shopkeeper ko ye batana zaroori hai.
      this.prisma.usedPhone.count({
        where: {
          tenantId,
          status: 'PENDING_INSPECTION',
          ...(shopId && { OR: [{ shopId }, { shopId: null }] }),
        },
      }),
    ]);

    return {
      phones,
      usedPhones,
      accessories,
      usedPhonesPendingInspection: pendingInspection,
      counts: {
        phones: phones.length,
        usedPhones: usedPhones.length,
        accessories: accessories.length,
      },
    };
  }

  // ══════════════════════════════════════════════════════════
  // NEW PHONES — IMEI tracked, IN_STOCK only
  // ══════════════════════════════════════════════════════════
  private async findPhones(tenantId: string, shopId?: string, search?: string) {
    const where: Prisma.ProductImeiWhereInput = {
      tenantId,
      status: 'IN_STOCK',
      // Sirf isi shop ke device — shopId null wale (purana data) har shop me
      ...(shopId && { OR: [{ shopId }, { shopId: null }] }),
      ...(search && {
        AND: [{ OR: [
          { imei1: { contains: search } },
          { imei2: { contains: search } },
          { serialNumber: { contains: search, mode: 'insensitive' as const } },
          { color: { contains: search, mode: 'insensitive' as const } },
          { product: { name: { contains: search, mode: 'insensitive' as const } } },
          { product: { sku: { contains: search, mode: 'insensitive' as const } } },
          { product: { barcode: { contains: search, mode: 'insensitive' as const } } },
          { variant: { name: { contains: search, mode: 'insensitive' as const } } },
        ] }],
      }),
    };

    const rows = await this.prisma.productImei.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            unit: true,
            price: true,
            costPrice: true,
            brand: { select: { name: true } },
            images: {
              select: { url: true },
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
              take: 1,
            },
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            color: true,
            colorHex: true,
            price: true,
            costPrice: true,
          },
        },
      },
      orderBy: [{ purchasedAt: 'asc' }, { createdAt: 'asc' }],
      take: this.PHONE_TAKE,
    });

    return rows.map((r) => {
      // Sale price: variant ka apna price > product ka price.
      // (Yehi wo hisaab hai jo sales.service checkout par lagata hai.)
      const salePrice = Number(r.variant?.price ?? r.product?.price ?? 0);
      const costPrice =
        Number(r.costPrice) ||
        Number(r.variant?.costPrice ?? r.product?.costPrice ?? 0);

      return {
        ...r,
        salePrice,
        resolvedCostPrice: costPrice,
        productName: r.product?.name ?? 'Mobile',
        brandName: r.product?.brand?.name ?? null,
        imageUrl: r.product?.images?.[0]?.url ?? null,
      };
    });
  }

  // ══════════════════════════════════════════════════════════
  // USED PHONES — trade-in stock ready to sell
  // ══════════════════════════════════════════════════════════
  private async findUsedPhones(tenantId: string, shopId?: string, search?: string) {
    const where: Prisma.UsedPhoneWhereInput = {
      tenantId,
      status: 'IN_STOCK',
      // shopId null wale phones har shop par bikte hain
      ...(shopId && { OR: [{ shopId }, { shopId: null }] }),
    };

    if (search) {
      const searchOr: Prisma.UsedPhoneWhereInput[] = [
        { imei1: { contains: search } },
        { imei2: { contains: search } },
        { usedPhoneCode: { contains: search, mode: 'insensitive' as const } },
        { brand: { contains: search, mode: 'insensitive' as const } },
        { model: { contains: search, mode: 'insensitive' as const } },
        { color: { contains: search, mode: 'insensitive' as const } },
      ];
      // shopId filter bhi OR use karta hai — dono ko AND me rakhna zaroori hai
      where.AND = [{ OR: searchOr }];
    }

    return this.prisma.usedPhone.findMany({
      where,
      include: {
        shop: { select: { id: true, name: true } },
        fromCustomer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { receivedAt: 'desc' },
      take: this.USED_TAKE,
    });
  }

  // ══════════════════════════════════════════════════════════
  // ACCESSORIES — non-IMEI products, shop-scoped stock
  // ══════════════════════════════════════════════════════════
  private async findAccessories(tenantId: string, shopId?: string, search?: string) {
    const where: Prisma.ProductWhereInput = {
      tenantId,
      isActive: true,
      // Accessory = jis product ka ek bhi IMEI record nahi.
      // Ye DB me hi filter hota hai — pehle 2000 rows client par aati thin.
      productImeis: { none: {} },
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { sku: { contains: search, mode: 'insensitive' as const } },
          { barcode: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const rows = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        unit: true,
        price: true,
        costPrice: true,
        stock: true,
        lowStockAlert: true,
        hasVariants: true,
        images: {
          select: { url: true },
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
        },
        ...(shopId && {
          shopStocks: {
            where: { shopId, variantId: null },
            select: { id: true, stock: true, shopPrice: true, lowStockAlert: true },
            take: 1,
          },
        }),
      },
      orderBy: { name: 'asc' },
      take: this.ACCESSORY_TAKE,
    });

    return rows.map((p: any) => {
      const shopStock = shopId ? p.shopStocks?.[0] : undefined;

      // Shop select hai lekin is product ki ShopStock row hi nahi:
      // checkout par sales.service ise reject karega, isliye POS ko
      // pehle hi bata dete hain — silently 0 dikhane se behtar hai.
      const notInShop = Boolean(shopId) && !shopStock;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        unit: p.unit,
        price: Number(shopStock?.shopPrice ?? p.price) || 0,
        costPrice: Number(p.costPrice) || 0,
        stock: shopId ? Number(shopStock?.stock ?? 0) : Number(p.stock) || 0,
        lowStockAlert: Number(shopStock?.lowStockAlert ?? p.lowStockAlert) || 0,
        hasVariants: p.hasVariants,
        imageUrl: p.images?.[0]?.url ?? null,
        notInShop,
      };
    });
  }
}
