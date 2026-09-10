import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

/**
 * ElectronicsPosService — POS screen ka poora catalog ek call me.
 *
 * Kyun: pehle POS `products.list()` se saara maal uthata tha — us me
 * shop ka stock nahi hota (global stock hota hai), is liye counter par
 * stock kuch aur dikhta tha aur checkout par "shop me available nahi"
 * ka error aata tha. Ab har cheez usi shop ki hoti hai jahan bikri
 * ho rahi hai, aur serial wale units apni asli ginti ke saath aate hain.
 */
@Injectable()
export class ElectronicsPosService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly TAKE = 1000;

  async catalog(
    user: AuthenticatedUser,
    params: { shopId?: string; search?: string; categoryType?: string },
  ) {
    const tenantId = user.tenantId;
    const search = params.search?.trim() || undefined;
    const shopId = params.shopId || undefined;

    const [products, serials, bundles] = await Promise.all([
      this.findProducts(tenantId, shopId, search, params.categoryType),
      this.findSerials(tenantId, shopId, search),
      this.findBundles(tenantId, search),
    ]);

    // Har product ke saath uske IN_STOCK serials
    const serialsByProduct = new Map<string, typeof serials>();
    for (const sr of serials) {
      const list = serialsByProduct.get(sr.productId) ?? [];
      list.push(sr);
      serialsByProduct.set(sr.productId, list);
    }

    const items = products.map((p) => {
      const units = serialsByProduct.get(p.id) ?? [];
      return {
        ...p,
        serials: units,
        serialCount: units.length,
        // Serial wale product ki asli ginti serials se aati hai
        availableStock: p.requiresSerial ? units.length : p.stock,
      };
    });

    return {
      items,
      bundles,
      counts: {
        products: items.length,
        serialTracked: items.filter((i) => i.requiresSerial).length,
        bundles: bundles.length,
      },
    };
  }

  // ══════════════════════════════════════════════════════════
  // PRODUCTS — shop ke stock ke saath + electronics profile
  // ══════════════════════════════════════════════════════════
  private async findProducts(
    tenantId: string,
    shopId?: string,
    search?: string,
    categoryType?: string,
  ) {
    // Electronics profile ka Product se Prisma relation nahi hai (sirf
    // productId rakha hai), is liye pehle profiles laate hain aur phir
    // JS me jorte hain. Isi se model/part number par search bhi chalti hai.
    const profiles = await this.prisma.electronicsProductProfile.findMany({
      where: {
        tenantId,
        ...(categoryType && { categoryType: categoryType as any }),
      },
      select: {
        productId: true,
        categoryType: true,
        conditionType: true,
        modelNumber: true,
        partNumber: true,
        colorName: true,
        colorHex: true,
        warrantyMonths: true,
        warrantyType: true,
        requiresSerial: true,
        hasImei: true,
        mrp: true,
        retailPrice: true,
        screenSize: true,
        connectivity: true,
        isFeatured: true,
        isBestSeller: true,
        isNewArrival: true,
      },
    });
    const profileByProduct = new Map(profiles.map((pr) => [pr.productId, pr]));

    // Search model/part number par bhi lagni chahiye
    const profileMatchIds = search
      ? profiles
          .filter((pr) =>
            (pr.modelNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (pr.partNumber ?? '').toLowerCase().includes(search.toLowerCase()),
          )
          .map((pr) => pr.productId)
      : [];

    const where: Prisma.ProductWhereInput = {
      tenantId,
      isActive: true,
      // categoryType diya ho to sirf usi kism ke products
      ...(categoryType && { id: { in: profiles.map((pr) => pr.productId) } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { sku: { contains: search, mode: 'insensitive' as const } },
          { barcode: { contains: search, mode: 'insensitive' as const } },
          ...(profileMatchIds.length ? [{ id: { in: profileMatchIds } }] : []),
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
        wholesalePrice: true,
        stock: true,
        lowStockAlert: true,
        hasVariants: true,
        categoryId: true,
        images: {
          select: { url: true },
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
        },
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        ...(shopId && {
          shopStocks: {
            where: { shopId, variantId: null },
            select: { id: true, stock: true, shopPrice: true, lowStockAlert: true },
            take: 1,
          },
        }),
      },
      orderBy: { name: 'asc' },
      take: this.TAKE,
    });

    return rows.map((p: any) => {
      const shopStock = shopId ? p.shopStocks?.[0] : undefined;

      // Shop chuni hai lekin is product ki stock row hi nahi — checkout
      // par backend reject karega, is liye POS ko pehle hi bata do.
      const notInShop = Boolean(shopId) && !shopStock;
      const profile = profileByProduct.get(p.id);

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        unit: p.unit,
        // Shop ka apna rate ho to wohi, warna product ka
        price: Number(shopStock?.shopPrice ?? p.price) || 0,
        costPrice: Number(p.costPrice) || 0,
        wholesalePrice: p.wholesalePrice != null ? Number(p.wholesalePrice) : null,
        mrp: profile?.mrp != null ? Number(profile.mrp) : null,
        stock: shopId ? Number(shopStock?.stock ?? 0) : Number(p.stock) || 0,
        lowStockAlert: Number(shopStock?.lowStockAlert ?? p.lowStockAlert) || 0,
        hasVariants: p.hasVariants,
        notInShop,
        imageUrl: p.images?.[0]?.url ?? null,
        brandId: p.brand?.id ?? null,
        brandName: p.brand?.name ?? null,
        categoryId: p.category?.id ?? null,
        categoryName: p.category?.name ?? null,
        // Electronics ki apni cheezein
        categoryType: profile?.categoryType ?? null,
        conditionType: profile?.conditionType ?? null,
        modelNumber: profile?.modelNumber ?? null,
        colorName: profile?.colorName ?? null,
        colorHex: profile?.colorHex ?? null,
        warrantyMonths: profile?.warrantyMonths ?? 0,
        warrantyType: profile?.warrantyType ?? null,
        requiresSerial: profile?.requiresSerial ?? false,
        hasImei: profile?.hasImei ?? false,
        screenSize: profile?.screenSize ?? null,
        connectivity: profile?.connectivity ?? [],
        isFeatured: profile?.isFeatured ?? false,
        isBestSeller: profile?.isBestSeller ?? false,
        isNewArrival: profile?.isNewArrival ?? false,
      };
    });
  }

  // ══════════════════════════════════════════════════════════
  // SERIALS — sirf isi shop ke, sirf IN_STOCK
  // ══════════════════════════════════════════════════════════
  private async findSerials(tenantId: string, shopId?: string, search?: string) {
    return this.prisma.electronicsSerialTracking.findMany({
      where: {
        tenantId,
        status: 'IN_STOCK',
        // shopId null wale (purana data) har shop par dikh jate hain
        ...(shopId && { OR: [{ shopId }, { shopId: null }] }),
        ...(search && {
          AND: [{
            OR: [
              { serialNumber: { contains: search, mode: 'insensitive' as const } },
              { imei: { contains: search } },
              { imei2: { contains: search } },
              { macAddress: { contains: search, mode: 'insensitive' as const } },
            ],
          }],
        }),
      },
      select: {
        id: true,
        productId: true,
        serialNumber: true,
        imei: true,
        macAddress: true,
        status: true,
        purchasePrice: true,
        warrantyEndDate: true,
        warrantyStatus: true,
        batteryHealthPct: true,
        physicalCondition: true,
      },
      orderBy: { createdAt: 'asc' },
      take: this.TAKE,
    });
  }

  // ══════════════════════════════════════════════════════════
  // BUNDLES — deal packs (TV + soundbar waghera)
  // ══════════════════════════════════════════════════════════
  private async findBundles(tenantId: string, search?: string) {
    const rows = await this.prisma.electronicsBundle.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
      },
      orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
      take: 200,
    });

    return rows.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      imageUrl: b.imageUrl,
      // Bundle ke items JSON me rakhe hote hain (relation nahi)
      items: Array.isArray(b.items) ? (b.items as any[]) : [],
      originalPrice: Number(b.originalPrice) || 0,
      bundlePrice: Number(b.bundlePrice) || 0,
      savings: Number(b.savings) || 0,
      savingsPct: Number(b.savingsPct) || 0,
      isFeatured: b.isFeatured,
      totalSold: b.totalSold,
      validUntil: b.validUntil,
    }));
  }
}
