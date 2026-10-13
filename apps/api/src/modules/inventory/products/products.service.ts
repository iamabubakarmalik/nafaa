import {
  ConflictException, Injectable, NotFoundException, Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { NOT_SERVICE_PRODUCT, ShopScope, applyStockDelta, resolveWriteShopId, roundStock } from '../../../common/shop-scope';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PAKISTAN_CATALOG, CATEGORY_META, type SeedProduct } from './seed-catalog/pakistan-grocery-catalog';

function toSlug(name: string) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateProductDto, scope?: ShopScope) {
    const defaults = dto.lowStockAlert === undefined
      ? await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { defaultLowStockAlert: true } })
      : null;
    if (dto.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { tenantId: user.tenantId, sku: dto.sku },
      });
      if (existing) throw new ConflictException('SKU already exists');
    }

    if (dto.barcode) {
      const existing = await this.prisma.product.findFirst({
        where: { tenantId: user.tenantId, barcode: dto.barcode },
      });
      if (existing) throw new ConflictException('Barcode already exists');
    }

    if (dto.categoryId) {
      const cat = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, tenantId: user.tenantId },
      });
      if (!cat) throw new NotFoundException('Category not found');
    }

    if (dto.brandId) {
      const brand = await this.prisma.brand.findFirst({
        where: { id: dto.brandId, tenantId: user.tenantId },
      });
      if (!brand) throw new NotFoundException('Brand not found');
    }

    const slug = toSlug(dto.name) + '-' + Math.random().toString(36).slice(2, 6);

    const { tagIds, imageUrls } = dto;
    const opening = roundStock(Number(dto.stock ?? 0));
    // The branch that receives the opening stock: the one in the request,
    // else the branch being viewed, else the main shop.
    const stockShopId = opening > 0
      ? await resolveWriteShopId(this.prisma, user.tenantId, scope ?? new ShopScope(null, true), dto.shopId)
      : null;

    // Create product + ShopStock in single transaction
    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          tenantId: user.tenantId,
          categoryId: dto.categoryId,
          brandId: dto.brandId,
          name: dto.name,
          slug,
          description: dto.description,
          shortDescription: dto.shortDescription,
          sku: dto.sku,
          barcode: dto.barcode,
          unit: dto.unit ?? 'pcs',
          price: dto.price,
          costPrice: dto.costPrice ?? 0,
          wholesalePrice: dto.wholesalePrice,
          taxRate: dto.taxRate ?? 0,
          // Set by the opening-stock movement below.
          stock: 0,
          lowStockAlert: dto.lowStockAlert ?? defaults?.defaultLowStockAlert ?? 5,
          productType: dto.productType ?? undefined,
          weight: dto.weight,
          weightUnit: dto.weightUnit,
          dimensions: dto.dimensions,
          expiryTracked: dto.expiryTracked ?? false,
          isActive: dto.isActive ?? true,
          isFeatured: dto.isFeatured ?? false,
          isRawMaterial: dto.isRawMaterial ?? false,
        },
      });

      // Tags
      if (tagIds?.length) {
        await tx.productTag.createMany({
          data: tagIds.map((tagId) => ({ productId: created.id, tagId })),
          skipDuplicates: true,
        });
      }

      // Images
      if (imageUrls?.length) {
        await tx.productImage.createMany({
          data: imageUrls.map((url, i) => ({
            productId: created.id,
            url,
            isPrimary: i === 0,
            sortOrder: i,
          })),
        });
      }

      // A zero row in every active branch, then the opening stock as a
      // movement in one branch so the stock ledger starts from it.
      await this.ensureShopStockForAllShopsTx(tx, user.tenantId, created.id);
      if (stockShopId) {
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId: stockShopId, productId: created.id, delta: opening,
          movementType: 'OPENING_BALANCE', reference: 'OPENING', note: `Opening stock: ${created.name}`, userId: user.id,
        });
      }

      return created;
    });

    return this.findOne(user, product.id);
  }

  /**
   * What one branch is actually holding, per product.
   *
   * A variant product has one row per variant, so the branch total is their
   * sum. `alert` prefers the branch's own threshold when it keeps exactly one
   * row (the ordinary non-variant case) and falls back to the product's.
   */
  private async branchStockMap(
    tenantId: string,
    shopId: string,
  ): Promise<Map<string, { stock: number; alert: number | null }>> {
    const rows = await this.prisma.shopStock.findMany({
      where: { tenantId, shopId },
      select: { productId: true, stock: true, lowStockAlert: true },
    });

    const map = new Map<string, { stock: number; alert: number | null; rows: number }>();
    for (const r of rows) {
      const cur = map.get(r.productId);
      if (cur) {
        cur.stock += Number(r.stock);
        cur.rows += 1;
        cur.alert = null; // more than one row — no single meaningful override
      } else {
        map.set(r.productId, {
          stock: Number(r.stock),
          alert: Number(r.lowStockAlert),
          rows: 1,
        });
      }
    }

    return new Map(
      [...map].map(([id, v]) => [id, { stock: v.stock, alert: v.alert }]),
    );
  }

  async findAll(
    user: AuthenticatedUser,
    query: QueryProductsDto,
    shopId?: string,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      tenantId: user.tenantId,
    };

    // On a branch, "stock" means what sits on *that* shelf. Product.stock is
    // the tenant-wide total and would show every branch the same numbers.
    const branchStock = shopId
      ? await this.branchStockMap(user.tenantId, shopId)
      : null;

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.brandId) where.brandId = query.brandId;
    if (query.isActive === 'true') where.isActive = true;
    if (query.isActive === 'false') where.isActive = false;
    if (query.isFeatured === 'true') where.isFeatured = true;

    if (query.tagId) {
      where.tags = { some: { tagId: query.tagId } };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }

    if (query.stockStatus && query.stockStatus !== 'all') {
      // Services hold no stock, so they are never "out" or "low".
      if (query.stockStatus === 'out' || query.stockStatus === 'low') where.AND = [NOT_SERVICE_PRODUCT];
      if (branchStock) {
        // Filter on the branch's numbers, in the query, so pagination counts
        // stay honest. A product with no row here simply has no stock here.
        const withStock: string[] = [];
        const lowHere: string[] = [];
        for (const [productId, v] of branchStock) {
          if (v.stock > 0) withStock.push(productId);
        }

        if (query.stockStatus === 'in') where.id = { in: withStock };
        else if (query.stockStatus === 'out') where.id = { notIn: withStock };
        else if (query.stockStatus === 'low') {
          const products = await this.prisma.product.findMany({
            where: { tenantId: user.tenantId, id: { in: withStock } },
            select: { id: true, lowStockAlert: true },
          });
          for (const p of products) {
            const v = branchStock.get(p.id)!;
            const alert = v.alert ?? Number(p.lowStockAlert);
            if (v.stock <= alert) lowHere.push(p.id);
          }
          where.id = { in: lowHere };
        }
      } else {
        if (query.stockStatus === 'out') where.stock = 0;
        else if (query.stockStatus === 'in') where.stock = { gt: 0 };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          category: true,
          brand: true,
          tags: { include: { tag: true } },
          images: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            take: 1,
          },
          _count: { select: { variants: true, images: true, batches: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Swap the tenant-wide total for this branch's figure, keeping the total
    // available as `tenantStock` for anything that wants the big picture.
    let filtered: any[] = branchStock
      ? items.map((p) => {
          const v = branchStock.get(p.id);
          return {
            ...p,
            stock: v?.stock ?? 0,
            lowStockAlert: v?.alert ?? p.lowStockAlert,
            tenantStock: p.stock,
            shopId,
          };
        })
      : items;

    // The `low` case is already resolved in the query when scoped to a branch.
    if (query.stockStatus === 'low' && !branchStock) {
      filtered = filtered.filter((p) => p.stock > 0 && p.stock <= p.lowStockAlert);
    }

    return {
      items: filtered,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      /** null = sab shops ka mila hua */
      shopId: shopId ?? null,
    };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        category: true,
        brand: true,
        tags: { include: { tag: true } },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        variants: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        batches: {
          where: { isActive: true },
          orderBy: { expiryDate: 'asc' },
        },
        _count: {
          select: {
            saleItems: true,
            variants: true,
            images: true,
            batches: true,
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateProductDto, scope?: ShopScope) {
    const existing = await this.findOne(user, id);

    if (dto.sku && dto.sku !== existing.sku) {
      const skuExists = await this.prisma.product.findFirst({
        where: { tenantId: user.tenantId, sku: dto.sku, NOT: { id } },
      });
      if (skuExists) throw new ConflictException('SKU already exists');
    }

    if (dto.barcode && dto.barcode !== existing.barcode) {
      const barExists = await this.prisma.product.findFirst({
        where: { tenantId: user.tenantId, barcode: dto.barcode, NOT: { id } },
      });
      if (barExists) throw new ConflictException('Barcode already exists');
    }

    const { tagIds } = dto;
    const productData: any = { ...dto };
    delete productData.tagIds;
    delete productData.imageUrls;
    delete productData.shopId;
    // Stock changes only through movements (purchase, sale, adjustment). A
    // stock number on an edit form may be stale, so it is never written here.
    delete productData.stock;

    await this.prisma.product.update({
      where: { id },
      data: productData,
    });

    // The one exception: a product that has never held stock and has no stock
    // history may get its opening stock here (wizards that create first and
    // add the count after). Anything else is ignored.
    let stockIgnored = false;
    const wanted = dto.stock === undefined || dto.stock === null ? null : roundStock(Number(dto.stock));
    if (wanted !== null && wanted !== roundStock(Number(existing.stock ?? 0))) {
      const history = await this.prisma.stockMovement.count({ where: { tenantId: user.tenantId, productId: id } });
      const fresh = history === 0 && Number(existing.stock ?? 0) === 0 && !existing.hasVariants && wanted > 0;
      if (fresh) {
        const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope ?? new ShopScope(null, true), dto.shopId);
        await this.prisma.$transaction((tx) => applyStockDelta({
          tx, tenantId: user.tenantId, shopId, productId: id, delta: wanted,
          movementType: 'OPENING_BALANCE', reference: 'OPENING', note: `Opening stock: ${existing.name}`, userId: user.id,
        }));
      } else {
        stockIgnored = true;
        this.logger.log(`Stock on product update ignored: product=${id} sent=${wanted} current=${existing.stock}`);
      }
    }

    if (tagIds !== undefined) {
      await this.prisma.productTag.deleteMany({ where: { productId: id } });
      if (tagIds.length) {
        await this.prisma.productTag.createMany({
          data: tagIds.map((tagId) => ({ productId: id, tagId })),
          skipDuplicates: true,
        });
      }
    }

    const updated = await this.findOne(user, id);
    return stockIgnored
      ? { ...updated, stockIgnored: true, stockMessage: 'Stock yahan se nahi badalta — Stock Adjustment ya Purchase se badlein' }
      : updated;
  }

  /**
   * Cascade-wipe every record that references a product.
   * Unknown/optional models are skipped safely (.catch).
   */
  private async cascadeProductRefsTx(tx: any, ids: string | string[]) {
    const where = Array.isArray(ids) ? { productId: { in: ids } } : { productId: ids };
    const wipe = (model: string) => {
      const m = tx[model];
      if (!m || typeof m.deleteMany !== 'function') return Promise.resolve();
      return Promise.resolve(m.deleteMany({ where })).catch(() => {});
    };
    // Children first — order matters for FK safety
    await wipe('saleItem');
    await wipe('purchaseItem');
    await wipe('returnItem');
    await wipe('bookingItem');
    await wipe('stockMovement');
    await wipe('stockAdjustment');
    await wipe('productImage');
    await wipe('productTag');
    await wipe('productBatch');
    await wipe('shopStock');
    await wipe('productImei');
    await wipe('carpetCutPiece');
    await wipe('carpetRoll');
    await wipe('comboItem');
    await wipe('productUnit');
    await wipe('quickKey');
    await wipe('reorderRule');
    await wipe('marketplaceProduct');
    await wipe('productVariant'); // variants last among children
  }

  /**
   * Wipe EVERY record that references a sale — schema-driven.
   * Prisma DMMF se har model dhundta hai jisme saleId field hai
   * (payments, khata ledger, notifications, FBR invoices — sab),
   * taake FK block kabhi sale delete ko fail na kare.
   */
  private async wipeSaleRefsTx(tx: any, saleIds: string[]) {
    if (!saleIds.length) return;
    const dmmf = (Prisma as any).dmmf ?? (Prisma as any).dMMF;
    const models = dmmf?.datamodel?.models ?? [];
    for (const m of models) {
      if (m.name === 'Sale') continue;
      const hasSaleId = m.fields?.some((f: any) => f.name === 'saleId');
      if (!hasSaleId) continue;
      const delegateName = m.name.charAt(0).toLowerCase() + m.name.slice(1);
      const delegate = tx[delegateName];
      if (!delegate || typeof delegate.deleteMany !== 'function') continue;
      await Promise.resolve(
        delegate.deleteMany({ where: { saleId: { in: saleIds } } }),
      ).catch((e: any) =>
        this.logger.warn(`wipeSaleRefs: ${m.name} skip (${e?.message})`),
      );
    }
  }

  /**
   * Empty orphan sales delete karo (jinke items wipe ho chuke).
   * saleItem.saleId se detect karta hai — relation-name independent.
   */
  private async cleanupEmptySalesTx(tx: any, tenantId: string, saleIds: string[]) {
    if (!saleIds.length) return 0;
    try {
      const stillHaveItems = await tx.saleItem.findMany({
        where: { saleId: { in: saleIds } },
        select: { saleId: true },
        distinct: ['saleId'],
      });
      const withItems = new Set(stillHaveItems.map((r: any) => r.saleId));
      const emptyIds = saleIds.filter((sid) => !withItems.has(sid));
      if (!emptyIds.length) return 0;

      // Pehle sab sale references wipe, PHIR sale delete
      await this.wipeSaleRefsTx(tx, emptyIds);
      const res = await tx.sale.deleteMany({
        where: { id: { in: emptyIds }, tenantId },
      });
      this.logger.log(`Orphan sales deleted: ${res?.count ?? 0}`);
      return res?.count ?? 0;
    } catch (e: any) {
      this.logger.warn(`cleanupEmptySalesTx failed: ${e?.message}`);
      return 0;
    }
  }

  /**
   * Tenant ke saare orphan sales (0 items wale) saaf karo — one-time repair.
   * Dashboard pe "0 items • Rs X" wali ghost sales ke liye.
   */
  async cleanupOrphanSales(user: AuthenticatedUser) {
    const [allSales, withItemsRows] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, saleNumber: true },
      }),
      this.prisma.saleItem.findMany({
        where: { sale: { tenantId: user.tenantId } },
        select: { saleId: true },
        distinct: ['saleId'],
      }),
    ]);
    const withItems = new Set(withItemsRows.map((r) => r.saleId));
    const orphans = allSales.filter((s) => !withItems.has(s.id));
    if (!orphans.length) {
      return { message: 'Koi empty sale nahi mili — sab saaf hai ✓', deleted: 0 };
    }
    const ids = orphans.map((s) => s.id);
    let deleted = 0;
    await this.prisma.$transaction(async (tx) => {
      await this.wipeSaleRefsTx(tx, ids);
      const res = await tx.sale.deleteMany({
        where: { id: { in: ids }, tenantId: user.tenantId },
      });
      deleted = res?.count ?? 0;
    });
    this.logger.log(`Orphan sales cleaned: ${deleted} (${orphans.map((o) => o.saleNumber).join(', ')})`);
    return {
      message: `${deleted} empty sales permanently delete ho gayi`,
      deleted,
      saleNumbers: orphans.map((o) => o.saleNumber),
    };
  }

  async remove(user: AuthenticatedUser, id: string, force = false) {
    await this.findOne(user, id);

    const saleItemCount = await this.prisma.saleItem.count({
      where: { productId: id },
    });

    const purchaseItemCount = await this.prisma.purchaseItem.count({
      where: { productId: id },
    });

    // ═══ FORCE DELETE — cascade EVERYTHING (sales, stock, images, variants…) ═══
    if (force) {
      // Capture affected sale ids BEFORE wiping items (for orphan-sale cleanup)
      const affectedSaleIds = (
        await this.prisma.saleItem.findMany({
          where: { productId: id },
          select: { saleId: true },
          distinct: ['saleId'],
        })
      ).map((r) => r.saleId);

      let removedEmptySales = 0;
      await this.prisma.$transaction(async (tx) => {
        await this.cascadeProductRefsTx(tx, id);
        removedEmptySales = await this.cleanupEmptySalesTx(tx, user.tenantId, affectedSaleIds);
        await tx.product.delete({ where: { id } });
      });

      return {
        message: 'Product + sales + stock permanently delete ho gaya',
        forced: true,
        cascadedSaleItems: saleItemCount,
        cascadedPurchaseItems: purchaseItemCount,
        removedEmptySales,
      };
    }

    if (saleItemCount > 0 || purchaseItemCount > 0) {
      await this.prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      return {
        message: 'Product deactivated (cannot delete — has sales/purchase history). Use force=true to override.',
        softDeleted: true,
        saleCount: saleItemCount,
        purchaseCount: purchaseItemCount,
      };
    }

    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully', softDeleted: false };
  }

  async toggleFeatured(user: AuthenticatedUser, id: string) {
    const p = await this.findOne(user, id);
    return this.prisma.product.update({
      where: { id },
      data: { isFeatured: !p.isFeatured },
    });
  }

  async toggleActive(user: AuthenticatedUser, id: string) {
    const p = await this.findOne(user, id);
    return this.prisma.product.update({
      where: { id },
      data: { isActive: !p.isActive },
    });
  }

  async bulkAction(
    user: AuthenticatedUser,
    productIds: string[],
    action: 'activate' | 'deactivate' | 'delete' | 'feature' | 'unfeature',
  ) {
    const where = { id: { in: productIds }, tenantId: user.tenantId };

    switch (action) {
      case 'activate':
        await this.prisma.product.updateMany({ where, data: { isActive: true } });
        break;
      case 'deactivate':
        await this.prisma.product.updateMany({ where, data: { isActive: false } });
        break;
      case 'feature':
        await this.prisma.product.updateMany({ where, data: { isFeatured: true } });
        break;
      case 'unfeature':
        await this.prisma.product.updateMany({ where, data: { isFeatured: false } });
        break;
      case 'delete': {
        // Bulk force-delete — full cascade (demo/test data wipes cleanly)
        const affectedSaleIds = (
          await this.prisma.saleItem.findMany({
            where: { productId: { in: productIds } },
            select: { saleId: true },
            distinct: ['saleId'],
          })
        ).map((r) => r.saleId);

        let removedEmptySales = 0;
        await this.prisma.$transaction(async (tx) => {
          await this.cascadeProductRefsTx(tx, productIds);
          removedEmptySales = await this.cleanupEmptySalesTx(tx, user.tenantId, affectedSaleIds);
          await tx.product.deleteMany({
            where: { id: { in: productIds }, tenantId: user.tenantId },
          });
        });

        return {
          count: productIds.length,
          action,
          hardDeleted: productIds.length,
          softDeleted: 0,
          forced: true,
          removedEmptySales,
        };
      }
    }

    return { count: productIds.length, action };
  }

  // ═══════════════════════════════════════════════════════════
  // QUICK SETUP — Pakistan Grocery Catalog
  // ═══════════════════════════════════════════════════════════

  /**
   * Return the full seed catalog for the frontend picker.
   * Includes existing brand/category IDs if already created for this tenant.
   */

  /**
   * SELF-HEAL — jis bhi product ki ShopStock row kisi shop mein missing hai,
   * wo bana do (product.stock ki value ke saath).
   *
   * Manual create mein row creation ke waqt ban jati hai — lekin purane
   * quick-imported products ki kabhi bani hi nahi. Ye method catalog open
   * aur import — dono waqt chalti hai, taake POS pe "Available: 0" ka
   * masla kabhi na aaye. Sirf MISSING rows banati hai, existing rows
   * ko touch nahi karti.
   */
  private async healMissingShopStock(tenantId: string): Promise<number> {
    try {
      const [products, shops] = await Promise.all([
        this.prisma.product.findMany({
          where: { tenantId },
          select: { id: true, stock: true, lowStockAlert: true, hasVariants: true },
        }),
        this.prisma.shop.findMany({
          where: { tenantId, isActive: true },
          select: { id: true, isMain: true },
        }),
      ]);
      if (!products.length || !shops.length) return 0;

      const mainShop = shops.find((s) => s.isMain) ?? shops[0];

      const existing = await this.prisma.shopStock.findMany({
        where: { productId: { in: products.map((p) => p.id) } },
        select: { id: true, productId: true, shopId: true, variantId: true, stock: true },
      });
      const byKey = new Map(existing.filter((r) => r.variantId === null).map((r) => [`${r.productId}:${r.shopId}`, r]));
      const rowSum = new Map<string, { rows: number; sum: number }>();
      for (const r of existing) {
        const t = rowSum.get(r.productId) ?? { rows: 0, sum: 0 };
        t.rows += 1; t.sum += Number(r.stock) || 0;
        rowSum.set(r.productId, t);
      }
      // Products with any stock history are left as they are: their branch
      // rows, not the cached total, are the truth.
      const moved = new Set(
        (await this.prisma.stockMovement.groupBy({ by: ['productId'], where: { tenantId } })).map((m) => m.productId),
      );

      let healed = 0;
      const openings: Array<{ productId: string; qty: number }> = [];

      // (a) Missing rows. The cached stock goes to the main shop only for a
      // product that has no branch rows at all; otherwise it would be counted twice.
      const toCreate: any[] = [];
      for (const p of products) {
        const t = rowSum.get(p.id);
        const legacy = !t && !p.hasVariants && Number(p.stock) > 0 && !moved.has(p.id);
        for (const shop of shops) {
          if (!byKey.has(`${p.id}:${shop.id}`)) {
            const stock = legacy && shop.id === mainShop.id ? Number(p.stock) : 0;
            toCreate.push({
              tenantId,
              shopId: shop.id,
              productId: p.id,
              variantId: null,
              stock,
              lowStockAlert: Number(p.lowStockAlert ?? 5),
              isActive: true,
            });
            if (stock > 0) openings.push({ productId: p.id, qty: stock });
          }
        }
      }
      for (let i = 0; i < toCreate.length; i += 500) {
        try {
          const res = await this.prisma.shopStock.createMany({
            data: toCreate.slice(i, i + 500),
            skipDuplicates: true,
          });
          healed += res.count;
        } catch (e: any) {
          this.logger.warn(`heal create chunk failed: ${e?.message}`);
        }
      }

      // (b) Old imports: branch rows exist but all hold 0 while the cached
      // stock says otherwise, and nothing was ever bought, sold or adjusted.
      for (const p of products) {
        const t = rowSum.get(p.id);
        if (!t || t.sum !== 0 || p.hasVariants || moved.has(p.id) || !(Number(p.stock) > 0)) continue;
        const row = byKey.get(`${p.id}:${mainShop.id}`);
        if (!row) continue;
        try {
          const done = await this.prisma.shopStock.updateMany({
            where: { id: row.id, stock: 0 },
            data: { stock: Number(p.stock) },
          });
          if (done.count) {
            healed++;
            openings.push({ productId: p.id, qty: Number(p.stock) });
          }
        } catch (e: any) {
          this.logger.warn(`heal repair failed: ${e?.message}`);
        }
      }

      // Record what was placed so the stock ledger starts from it.
      if (openings.length) {
        await this.prisma.stockMovement.createMany({
          data: openings.map((o) => ({
            tenantId, shopId: mainShop.id, productId: o.productId, type: 'OPENING_BALANCE' as const,
            quantity: o.qty, balanceAfter: o.qty, reference: 'OPENING', note: 'Purana stock (branch row bani)',
          })),
        }).catch((e: any) => this.logger.warn(`heal opening movements failed: ${e?.message}`));
      }

      if (healed > 0) {
        this.logger.log(`ShopStock self-heal: ${healed} rows fixed`);
      }
      return healed;
    } catch (e: any) {
      this.logger.warn(`healMissingShopStock failed: ${e?.message}`);
      return 0;
    }
  }

  async getQuickSetupCatalog(user: AuthenticatedUser) {
    // ⭐ Self-heal: purane imported products ki missing ShopStock rows repair
    await this.healMissingShopStock(user.tenantId);

    const [existingBrands, existingCategories, existingProducts] = await Promise.all([
      this.prisma.brand.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, name: true },
      }),
      this.prisma.category.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, name: true },
      }),
      this.prisma.product.findMany({
        where: { tenantId: user.tenantId },
        select: { name: true },
      }),
    ]);

    const existingProductNames = new Set(
      existingProducts.map((p) => p.name.toLowerCase().trim()),
    );

    // Mark which catalog products already exist
    const catalog = PAKISTAN_CATALOG.map((p) => ({
      ...p,
      alreadyExists: existingProductNames.has(p.name.toLowerCase().trim()),
    }));

    const categories = Object.entries(CATEGORY_META).map(([name, meta]) => ({
      name,
      color: meta.color,
      description: meta.description,
      count: catalog.filter((p) => p.category === name).length,
    }));

    const brandCounts = new Map<string, number>();
    catalog.forEach((p) => {
      brandCounts.set(p.brand, (brandCounts.get(p.brand) ?? 0) + 1);
    });

    const brands = Array.from(brandCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      catalog,
      categories,
      brands,
      total: catalog.length,
      alreadyImported: catalog.filter((p) => p.alreadyExists).length,
    };
  }

  /**
   * Bulk-create products from catalog — with brands, categories, tags auto-created.
   * Frontend passes array of catalog IDs + optional price overrides.
   */
  async quickSetupImport(
    user: AuthenticatedUser,
    catalogIds: string[],
    priceOverrides: Record<string, { price?: number; costPrice?: number; stock?: number }> = {},
    targetShopId?: string,
  ) {
    const selected = PAKISTAN_CATALOG.filter((p) => catalogIds.includes(p.id));
    if (!selected.length) {
      return { message: 'Koi products select nahi hue', imported: 0 };
    }

    // ═══ Resolve target shop: agar user ne dropdown se koi shop select ki hai
    //    to us mein stock daalo; warna main shop; warna pehli active shop ═══
    let resolvedShopId: string | null = null;
    if (targetShopId) {
      const s = await this.prisma.shop.findFirst({
        where: { id: targetShopId, tenantId: user.tenantId, isActive: true },
        select: { id: true },
      });
      if (s) resolvedShopId = s.id;
    }
    if (!resolvedShopId) {
      const mainShop = await this.prisma.shop.findFirst({
        where: { tenantId: user.tenantId, isActive: true, isMain: true },
        select: { id: true },
      });
      resolvedShopId = mainShop?.id ?? null;
    }
    if (!resolvedShopId) {
      const anyShop = await this.prisma.shop.findFirst({
        where: { tenantId: user.tenantId, isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      resolvedShopId = anyShop?.id ?? null;
    }
    this.logger.log(`Quick-setup: stock will land in shopId=${resolvedShopId ?? 'NONE'}`);

    // Pre-load existing brands/categories/tags
    const [existingBrands, existingCats, existingTags, existingProducts] = await Promise.all([
      this.prisma.brand.findMany({ where: { tenantId: user.tenantId } }),
      this.prisma.category.findMany({ where: { tenantId: user.tenantId } }),
      this.prisma.tag.findMany({ where: { tenantId: user.tenantId } }),
      this.prisma.product.findMany({
        where: { tenantId: user.tenantId },
        select: { name: true },
      }),
    ]);

    const brandCache = new Map(existingBrands.map((b) => [b.name.toLowerCase().trim(), b.id]));
    const catCache = new Map(existingCats.map((c) => [c.name.toLowerCase().trim(), c.id]));
    const tagCache = new Map(existingTags.map((t) => [t.name.toLowerCase().trim(), t.id]));
    const existingNames = new Set(existingProducts.map((p) => p.name.toLowerCase().trim()));

    let brandsCreated = 0;
    let categoriesCreated = 0;
    let tagsCreated = 0;
    let productsCreated = 0;
    let productsSkipped = 0;
    const errors: Array<{ name: string; error: string }> = [];

    // ═══ Step 1: Create missing brands ═══
    const brandsToCreate = new Set<string>();
    for (const p of selected) {
      if (!brandCache.has(p.brand.toLowerCase().trim())) {
        brandsToCreate.add(p.brand);
      }
    }
    for (const brandName of brandsToCreate) {
      const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      try {
        const b = await this.prisma.brand.create({
          data: {
            tenantId: user.tenantId,
            name: brandName,
            slug: `${slug}-${Math.random().toString(36).slice(2, 5)}`,
          },
        });
        brandCache.set(brandName.toLowerCase().trim(), b.id);
        brandsCreated++;
      } catch (e: any) {
        this.logger.warn(`Brand ${brandName} failed: ${e.message}`);
      }
    }

    // ═══ Step 2: Create missing categories ═══
    const catsToCreate = new Set<string>();
    for (const p of selected) {
      if (!catCache.has(p.category.toLowerCase().trim())) {
        catsToCreate.add(p.category);
      }
    }
    for (const catName of catsToCreate) {
      try {
        const c = await this.prisma.category.create({
          data: {
            tenantId: user.tenantId,
            name: catName,
            color: CATEGORY_META[catName]?.color ?? '#64748b',
          },
        });
        catCache.set(catName.toLowerCase().trim(), c.id);
        categoriesCreated++;
      } catch (e: any) {
        this.logger.warn(`Category ${catName} failed: ${e.message}`);
      }
    }

    // ═══ Step 3: Create missing tags ═══
    const tagsToCreate = new Set<string>();
    for (const p of selected) {
      for (const tag of p.tags) {
        if (!tagCache.has(tag.toLowerCase().trim())) {
          tagsToCreate.add(tag);
        }
      }
    }
    for (const tagName of tagsToCreate) {
      try {
        const t = await this.prisma.tag.create({
          data: {
            tenantId: user.tenantId,
            name: tagName,
            color: '#16a34a',
          },
        });
        tagCache.set(tagName.toLowerCase().trim(), t.id);
        tagsCreated++;
      } catch {}
    }

    // ═══ Step 4: Create products (in transaction batches of 20) ═══
    const batches: SeedProduct[][] = [];
    for (let i = 0; i < selected.length; i += 20) {
      batches.push(selected.slice(i, i + 20));
    }

    for (const batch of batches) {
      await this.prisma.$transaction(async (tx) => {
        for (const p of batch) {
          // Skip if product name already exists
          if (existingNames.has(p.name.toLowerCase().trim())) {
            productsSkipped++;
            continue;
          }

          const override = priceOverrides[p.id] || {};
          const finalPrice = override.price ?? p.price;
          const finalCost = override.costPrice ?? p.costPrice;
          const finalStock = override.stock ?? 0;

          try {
            const brandId = brandCache.get(p.brand.toLowerCase().trim());
            const categoryId = catCache.get(p.category.toLowerCase().trim());
            const tagIds = p.tags
              .map((t) => tagCache.get(t.toLowerCase().trim()))
              .filter(Boolean) as string[];

            const slug =
              p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) +
              '-' + Math.random().toString(36).slice(2, 6);

            // Auto-generate barcode if not provided
            let barcode = p.barcode;
            if (!barcode) {
              const ts = Date.now().toString().slice(-10);
              const rnd = Math.floor(Math.random() * 100).toString().padStart(2, '0');
              barcode = `200${ts}${rnd}`.slice(0, 13);
            }

            const created = await tx.product.create({
              data: {
                tenantId: user.tenantId,
                name: p.name,
                slug,
                brandId,
                categoryId,
                unit: p.unit,
                price: finalPrice,
                costPrice: finalCost,
                wholesalePrice: p.wholesalePrice ?? null,
                stock: 0,
                lowStockAlert: 5,
                barcode,
                description: p.description,
                weight: p.weight,
                weightUnit: p.weightUnit,
                isActive: true,
                isFeatured: false,
              },
            });

            // Tags
            if (tagIds.length) {
              await tx.productTag.createMany({
                data: tagIds.map((tagId) => ({ productId: created.id, tagId })),
                skipDuplicates: true,
              });
            }

            // Image
            if (p.imageUrl) {
              await tx.productImage.create({
                data: {
                  productId: created.id,
                  url: p.imageUrl,
                  isPrimary: true,
                  sortOrder: 0,
                },
              });
            }

            // ShopStock — stock goes to the resolved target shop; other shops start at 0
            await this.ensureShopStockForShopsTx(
              tx,
              user.tenantId,
              created.id,
              finalStock,
              resolvedShopId,
              user.id,
            );

            existingNames.add(p.name.toLowerCase().trim());
            productsCreated++;
          } catch (e: any) {
            errors.push({ name: p.name, error: e.message });
            this.logger.warn(`Quick-setup product ${p.name} failed: ${e.message}`);
          }
        }
      }, { timeout: 30000 });
    }

    // ⭐ Self-heal: har product ki ShopStock har shop mein guarantee
    await this.healMissingShopStock(user.tenantId);

    return {
      message: `${productsCreated} products import ho gaye! 🎉`,
      imported: productsCreated,
      skipped: productsSkipped,
      brandsCreated,
      categoriesCreated,
      tagsCreated,
      errorCount: errors.length,
      errors: errors.slice(0, 10), // First 10 errors only
    };
  }

  // ═══════════════════════════════════════════════════════════
  // BULK IMPORT — Preview
  // ═══════════════════════════════════════════════════════════

  async bulkImportPreview(user: AuthenticatedUser, rows: any[]) {
    const [allCategories, allBrands, allTags, allProducts] = await Promise.all([
      this.prisma.category.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, name: true },
      }),
      this.prisma.brand.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, name: true },
      }),
      this.prisma.tag.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, name: true },
      }),
      this.prisma.product.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, name: true, sku: true, barcode: true },
      }),
    ]);

    const catMap = new Map<string, string>();
    allCategories.forEach((c) => catMap.set(c.name.toLowerCase().trim(), c.id));

    const brandMap = new Map<string, string>();
    allBrands.forEach((b) => brandMap.set(b.name.toLowerCase().trim(), b.id));

    const tagMap = new Map<string, string>();
    allTags.forEach((t) => tagMap.set(t.name.toLowerCase().trim(), t.id));

    const skuSet = new Set(allProducts.filter((p) => p.sku).map((p) => p.sku!.toLowerCase()));
    const barcodeSet = new Set(allProducts.filter((p) => p.barcode).map((p) => p.barcode!.toLowerCase()));
    const nameSet = new Set(allProducts.map((p) => p.name.toLowerCase().trim()));

    const newCategoriesToCreate = new Set<string>();
    const newBrandsToCreate = new Set<string>();
    const newTagsToCreate = new Set<string>();

    const previewRows = rows.map((row, idx) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      const name = (row.name || '').trim();
      if (!name) errors.push('Product name required');
      else if (nameSet.has(name.toLowerCase())) warnings.push('Product name already exists');

      const price = Number(row.price ?? 0);
      if (price < 0) errors.push('Price cannot be negative');

      const costPrice = Number(row.costPrice ?? 0);
      const stock = Number(row.stock ?? 0);
      const lowStockAlert = Number(row.lowStockAlert ?? 5);

      if (row.sku && skuSet.has(String(row.sku).toLowerCase())) {
        warnings.push(`SKU "${row.sku}" already exists`);
      }
      if (row.barcode && barcodeSet.has(String(row.barcode).toLowerCase())) {
        warnings.push(`Barcode "${row.barcode}" already exists`);
      }

      let categoryId: string | undefined;
      let willCreateCategory = false;
      if (row.categoryName) {
        const key = String(row.categoryName).toLowerCase().trim();
        categoryId = catMap.get(key);
        if (!categoryId) {
          willCreateCategory = true;
          newCategoriesToCreate.add(String(row.categoryName).trim());
        }
      }

      let brandId: string | undefined;
      let willCreateBrand = false;
      if (row.brandName) {
        const key = String(row.brandName).toLowerCase().trim();
        brandId = brandMap.get(key);
        if (!brandId) {
          willCreateBrand = true;
          newBrandsToCreate.add(String(row.brandName).trim());
        }
      }

      const tagNames = String(row.tagNames || '')
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean);
      const tagIds: string[] = [];
      const willCreateTags: string[] = [];
      for (const tn of tagNames) {
        const key = tn.toLowerCase();
        const existingId = tagMap.get(key);
        if (existingId) tagIds.push(existingId);
        else {
          willCreateTags.push(tn);
          newTagsToCreate.add(tn);
        }
      }

      const variantNames = String(row.variantNames || '')
        .split(',')
        .map((v: string) => v.trim())
        .filter(Boolean);

      const imageUrls = String(row.imageUrls || '')
        .split(',')
        .map((u: string) => u.trim())
        .filter(Boolean);

      return {
        index: idx + 1,
        name,
        description: row.description,
        shortDescription: row.shortDescription,
        sku: row.sku,
        barcode: row.barcode,
        unit: row.unit || 'pcs',
        price,
        costPrice,
        wholesalePrice: row.wholesalePrice ? Number(row.wholesalePrice) : undefined,
        taxRate: Number(row.taxRate ?? 0),
        stock,
        lowStockAlert,
        weight: row.weight ? Number(row.weight) : undefined,
        weightUnit: row.weightUnit,
        dimensions: row.dimensions,
        expiryTracked: row.expiryTracked === true || row.expiryTracked === 'true',
        isActive: row.isActive !== false && row.isActive !== 'false',
        isFeatured: row.isFeatured === true || row.isFeatured === 'true',
        categoryName: row.categoryName,
        categoryId,
        brandName: row.brandName,
        brandId,
        tagNames,
        tagIds,
        variantNames,
        imageUrls,
        valid: errors.length === 0,
        errors,
        warnings,
        willCreateCategory,
        willCreateBrand,
        willCreateTags,
      };
    });

    const validRows = previewRows.filter((r) => r.valid);
    const totalStockValue = validRows.reduce((sum, r) => sum + r.stock * r.price, 0);
    const totalCostValue = validRows.reduce((sum, r) => sum + r.stock * r.costPrice, 0);
    const totalVariants = validRows.reduce((sum, r) => sum + r.variantNames.length, 0);

    return {
      totalRows: rows.length,
      validCount: validRows.length,
      invalidCount: rows.length - validRows.length,
      rows: previewRows,
      totalProductsToCreate: validRows.length,
      totalVariantsToCreate: totalVariants,
      totalCategoriesToCreate: newCategoriesToCreate.size,
      totalBrandsToCreate: newBrandsToCreate.size,
      totalTagsToCreate: newTagsToCreate.size,
      totalStockValue,
      totalCostValue,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // BULK IMPORT — Apply
  // ═══════════════════════════════════════════════════════════

  async bulkImportApply(user: AuthenticatedUser, rows: any[], scope?: ShopScope) {
    const results: any[] = [];
    const stockShopId = rows.some((r) => Number(r?.stock) > 0)
      ? await resolveWriteShopId(this.prisma, user.tenantId, scope ?? new ShopScope(null, true))
      : null;
    let newCategoriesCreated = 0;
    let newBrandsCreated = 0;
    let newTagsCreated = 0;
    let newVariantsCreated = 0;

    const [existingCats, existingBrands, existingTags] = await Promise.all([
      this.prisma.category.findMany({ where: { tenantId: user.tenantId } }),
      this.prisma.brand.findMany({ where: { tenantId: user.tenantId } }),
      this.prisma.tag.findMany({ where: { tenantId: user.tenantId } }),
    ]);

    const catCache = new Map<string, string>();
    existingCats.forEach((c) => catCache.set(c.name.toLowerCase().trim(), c.id));

    const brandCache = new Map<string, string>();
    existingBrands.forEach((b) => brandCache.set(b.name.toLowerCase().trim(), b.id));

    const tagCache = new Map<string, string>();
    existingTags.forEach((t) => tagCache.set(t.name.toLowerCase().trim(), t.id));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        let categoryId: string | undefined = row.categoryId;
        if (!categoryId && row.newCategoryName) {
          const key = row.newCategoryName.toLowerCase().trim();
          categoryId = catCache.get(key);
          if (!categoryId) {
            const newCat = await this.prisma.category.create({
              data: {
                tenantId: user.tenantId,
                name: row.newCategoryName.trim(),
                color: '#2c9466',
              },
            });
            categoryId = newCat.id;
            catCache.set(key, newCat.id);
            newCategoriesCreated++;
          }
        }

        let brandId: string | undefined = row.brandId;
        if (!brandId && row.newBrandName) {
          const key = row.newBrandName.toLowerCase().trim();
          brandId = brandCache.get(key);
          if (!brandId) {
            const slug = row.newBrandName
              .toLowerCase().trim()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '');
            const newBrand = await this.prisma.brand.create({
              data: {
                tenantId: user.tenantId,
                name: row.newBrandName.trim(),
                slug: `${slug}-${Math.random().toString(36).slice(2, 5)}`,
              },
            });
            brandId = newBrand.id;
            brandCache.set(key, newBrand.id);
            newBrandsCreated++;
          }
        }

        const tagIds: string[] = [...(row.tagIds || [])];
        for (const newTagName of row.newTagNames || []) {
          const key = newTagName.toLowerCase().trim();
          let tagId = tagCache.get(key);
          if (!tagId) {
            const newTag = await this.prisma.tag.create({
              data: {
                tenantId: user.tenantId,
                name: newTagName.trim(),
                color: '#16a34a',
              },
            });
            tagId = newTag.id;
            tagCache.set(key, newTag.id);
            newTagsCreated++;
          }
          if (!tagIds.includes(tagId)) tagIds.push(tagId);
        }

        const slug =
          row.name
            .toLowerCase().trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 100) +
          '-' +
          Math.random().toString(36).slice(2, 6);

        // Create product + ShopStock in transaction
        const product = await this.prisma.$transaction(async (tx) => {
          const created = await tx.product.create({
            data: {
              tenantId: user.tenantId,
              categoryId,
              brandId,
              name: row.name,
              slug,
              description: row.description,
              shortDescription: row.shortDescription,
              sku: row.sku || null,
              barcode: row.barcode || null,
              unit: row.unit || 'pcs',
              price: Number(row.price ?? 0),
              costPrice: Number(row.costPrice ?? 0),
              wholesalePrice: row.wholesalePrice ? Number(row.wholesalePrice) : null,
              taxRate: Number(row.taxRate ?? 0),
              stock: 0,
              lowStockAlert: Number(row.lowStockAlert ?? 5),
              weight: row.weight ? Number(row.weight) : null,
              weightUnit: row.weightUnit || null,
              dimensions: row.dimensions || null,
              expiryTracked: row.expiryTracked ?? false,
              isActive: row.isActive ?? true,
              isFeatured: row.isFeatured ?? false,
              hasVariants: (row.variantNames?.length || 0) > 0,
            },
          });

          if (tagIds.length > 0) {
            await tx.productTag.createMany({
              data: tagIds.map((tagId: string) => ({
                productId: created.id,
                tagId,
              })),
              skipDuplicates: true,
            });
          }

          let variantCount = 0;
          if (row.variantNames && row.variantNames.length > 0) {
            await tx.productVariant.createMany({
              data: row.variantNames.map((vName: string, vIdx: number) => ({
                productId: created.id,
                name: vName.trim(),
                price: Number(row.price ?? 0),
                costPrice: Number(row.costPrice ?? 0),
                stock: 0,
                lowStockAlert: Number(row.lowStockAlert ?? 5),
                isActive: true,
                sortOrder: vIdx,
              })),
            });
            variantCount = row.variantNames.length;
          }

          if (row.imageUrls && row.imageUrls.length > 0) {
            await tx.productImage.createMany({
              data: row.imageUrls.map((url: string, idx: number) => ({
                productId: created.id,
                url: url.trim(),
                isPrimary: idx === 0,
                sortOrder: idx,
              })),
            });
          }

          // Zero rows in every branch, then the opening stock as a movement.
          await this.ensureShopStockForAllShopsTx(tx, user.tenantId, created.id);
          const opening = roundStock(Number(row.stock ?? 0));
          if (opening > 0 && stockShopId) {
            await applyStockDelta({
              tx, tenantId: user.tenantId, shopId: stockShopId, productId: created.id, delta: opening,
              movementType: 'OPENING_BALANCE', reference: 'OPENING', note: `Opening stock (import): ${created.name}`, userId: user.id,
            });
          }

          return { product: created, variantCount };
        });

        newVariantsCreated += product.variantCount;

        results.push({
          index: i + 1,
          productName: row.name,
          success: true,
          productId: product.product.id,
          variantsCreated: product.variantCount,
        });
      } catch (e: any) {
        this.logger.error(`Bulk import row ${i + 1} failed: ${e.message}`);
        results.push({
          index: i + 1,
          productName: row.name || `Row ${i + 1}`,
          success: false,
          error: e?.message || 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return {
      totalSubmitted: rows.length,
      successCount,
      failureCount,
      results,
      newCategoriesCreated,
      newBrandsCreated,
      newTagsCreated,
      newVariantsCreated,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // SHOPSTOCK AUTO-SYNC HELPERS
  // ═══════════════════════════════════════════════════════════

  /**
   * Quick Setup: a zero row in every active branch, then the opening stock as
   * an OPENING_BALANCE movement in `targetShopId` (main shop when null).
   */
  private async ensureShopStockForShopsTx(
    tx: any,
    tenantId: string,
    productId: string,
    initialStock: number,
    targetShopId: string | null,
    userId?: string,
  ): Promise<void> {
    const shops = await this.ensureShopStockForAllShopsTx(tx, tenantId, productId);
    if (!shops.length || !(initialStock > 0)) return;
    const stockShopId = targetShopId ?? (shops.find((s) => s.isMain) ?? shops[0]).id;
    await applyStockDelta({
      tx, tenantId, shopId: stockShopId, productId, delta: initialStock,
      movementType: 'OPENING_BALANCE', reference: 'OPENING', note: 'Quick Setup opening stock', userId: userId ?? null,
    });
  }

  /**
   * A zero ShopStock row (no variant) in every active branch that lacks one,
   * carrying the product's own low-stock alert. Existing rows are left alone.
   * Stock itself is added only through `applyStockDelta`.
   */
  private async ensureShopStockForAllShopsTx(
    tx: any,
    tenantId: string,
    productId: string,
  ): Promise<Array<{ id: string; isMain: boolean }>> {
    const [shops, product] = await Promise.all([
      tx.shop.findMany({ where: { tenantId, isActive: true }, select: { id: true, isMain: true } }),
      tx.product.findUnique({ where: { id: productId }, select: { lowStockAlert: true } }),
    ]);
    if (shops.length === 0) return shops;

    const have = await tx.shopStock.findMany({
      where: { productId, variantId: null, shopId: { in: shops.map((s: any) => s.id) } },
      select: { shopId: true },
    });
    const has = new Set(have.map((r: any) => r.shopId));
    const missing = shops.filter((s: any) => !has.has(s.id));
    if (missing.length) {
      await tx.shopStock.createMany({
        data: missing.map((shop: any) => ({
          tenantId, shopId: shop.id, productId, variantId: null, stock: 0, isActive: true,
          lowStockAlert: Number(product?.lowStockAlert ?? 5),
        })),
        skipDuplicates: true,
      });
    }
    return shops;
  }

  /**
   * Backfill for one product: a zero row in every active branch that lacks
   * one. A product with no branch rows at all (old bulk import) gets its
   * cached stock in the main shop, recorded as an OPENING_BALANCE movement.
   */
  private async ensureShopStockForAllShops(tenantId: string, productId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { stock: true, hasVariants: true },
      });
      const anyRow = await tx.shopStock.count({ where: { productId } });
      const shops = await this.ensureShopStockForAllShopsTx(tx, tenantId, productId);
      const qty = roundStock(Number(product?.stock ?? 0));
      if (anyRow === 0 && shops.length && !product?.hasVariants && qty > 0) {
        const main = shops.find((s) => s.isMain) ?? shops[0];
        await applyStockDelta({
          tx, tenantId, shopId: main.id, productId, delta: qty,
          movementType: 'OPENING_BALANCE', reference: 'OPENING', note: 'Purana stock (branch row bani)',
        });
      }
    });
  }

  /**
   * Backfill — safe to call anytime, uses upsert
   */
  async backfillShopStock(
    user: AuthenticatedUser,
  ): Promise<{ productsProcessed: number; shopsProcessed: number }> {
    const [products, shops] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, stock: true },
      }),
      this.prisma.shop.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        select: { id: true },
      }),
    ]);

    for (const product of products) {
      await this.ensureShopStockForAllShops(user.tenantId, product.id);
    }

    return {
      productsProcessed: products.length,
      shopsProcessed: shops.length,
    };
  }
}
