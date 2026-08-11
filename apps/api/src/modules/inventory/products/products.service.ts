import {
  ConflictException, Injectable, NotFoundException, Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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

  async create(user: AuthenticatedUser, dto: CreateProductDto) {
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
          stock: dto.stock ?? 0,
          lowStockAlert: dto.lowStockAlert ?? 5,
          weight: dto.weight,
          weightUnit: dto.weightUnit,
          dimensions: dto.dimensions,
          expiryTracked: dto.expiryTracked ?? false,
          isActive: dto.isActive ?? true,
          isFeatured: dto.isFeatured ?? false,
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

      // ⭐ AUTO-CREATE ShopStock for every active shop
      await this.ensureShopStockForAllShopsTx(
        tx,
        user.tenantId,
        created.id,
        dto.stock ?? 0,
      );

      return created;
    });

    return this.findOne(user, product.id);
  }

  async findAll(user: AuthenticatedUser, query: QueryProductsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      tenantId: user.tenantId,
    };

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

    if (query.stockStatus) {
      if (query.stockStatus === 'out') where.stock = 0;
      else if (query.stockStatus === 'in') where.stock = { gt: 0 };
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

    let filtered = items;
    if (query.stockStatus === 'low') {
      filtered = items.filter((p) => p.stock > 0 && p.stock <= p.lowStockAlert);
    }

    return {
      items: filtered,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
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

  async update(user: AuthenticatedUser, id: string, dto: UpdateProductDto) {
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

    await this.prisma.product.update({
      where: { id },
      data: productData,
    });

    if (tagIds !== undefined) {
      await this.prisma.productTag.deleteMany({ where: { productId: id } });
      if (tagIds.length) {
        await this.prisma.productTag.createMany({
          data: tagIds.map((tagId) => ({ productId: id, tagId })),
          skipDuplicates: true,
        });
      }
    }

    return this.findOne(user, id);
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
   * Delete sales that became empty after their items were wiped
   * (demo/test data cleanup). Sales with other items untouched.
   */
  private async cleanupEmptySalesTx(tx: any, tenantId: string, saleIds: string[]) {
    if (!saleIds.length) return 0;
    try {
      const empties = await tx.sale.findMany({
        where: { id: { in: saleIds }, tenantId, items: { none: {} } },
        select: { id: true },
      });
      const emptyIds = empties.map((s: any) => s.id);
      if (!emptyIds.length) return 0;
      await tx.salePayment.deleteMany({ where: { saleId: { in: emptyIds } } }).catch(() => {});
      await tx.sale.deleteMany({ where: { id: { in: emptyIds }, tenantId } }).catch(() => {});
      return emptyIds.length;
    } catch {
      return 0;
    }
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

  async bulkImportApply(user: AuthenticatedUser, rows: any[]) {
    const results: any[] = [];
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
              stock: Number(row.stock ?? 0),
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

          // Auto-create ShopStock
          await this.ensureShopStockForAllShopsTx(
            tx,
            user.tenantId,
            created.id,
            Number(row.stock ?? 0),
          );

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
   * TX version — used inside a transaction (create, bulk-import)
   */
  private async ensureShopStockForAllShopsTx(
    tx: any,
    tenantId: string,
    productId: string,
    initialStock = 0,
  ): Promise<void> {
    const shops = await tx.shop.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, isMain: true },
    });

    if (shops.length === 0) return;

    for (const shop of shops) {
      try {
        await tx.shopStock.upsert({
          where: {
            shopId_productId_variantId: {
              shopId: shop.id,
              productId,
              variantId: null as any,
            },
          },
          create: {
            tenantId,
            shopId: shop.id,
            productId,
            variantId: null,
            // Only main shop gets the initial stock
            stock: shop.isMain ? initialStock : 0,
            isActive: true,
          },
          update: {},
        });
      } catch (e) {
        // Fallback for schemas without compound unique
        try {
          const existing = await tx.shopStock.findFirst({
            where: {
              shopId: shop.id,
              productId,
              variantId: null,
            },
          });
          if (!existing) {
            await tx.shopStock.create({
              data: {
                tenantId,
                shopId: shop.id,
                productId,
                variantId: null,
                stock: shop.isMain ? initialStock : 0,
                isActive: true,
              },
            });
          }
        } catch (err) {
          this.logger.warn(`ShopStock upsert failed for shop=${shop.id} product=${productId}`);
        }
      }
    }
  }

  /**
   * Non-tx version — used from controllers/backfill
   */
  private async ensureShopStockForAllShops(
    tenantId: string,
    productId: string,
    initialStock = 0,
  ): Promise<void> {
    const shops = await this.prisma.shop.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, isMain: true },
    });

    if (shops.length === 0) return;

    for (const shop of shops) {
      try {
        await this.prisma.shopStock.upsert({
          where: {
            shopId_productId_variantId: {
              shopId: shop.id,
              productId,
              variantId: null as any,
            },
          },
          create: {
            tenantId,
            shopId: shop.id,
            productId,
            variantId: null,
            stock: shop.isMain ? initialStock : 0,
            isActive: true,
          },
          update: {},
        });
      } catch {
        try {
          const existing = await this.prisma.shopStock.findFirst({
            where: {
              shopId: shop.id,
              productId,
              variantId: null,
            },
          });
          if (!existing) {
            await this.prisma.shopStock.create({
              data: {
                tenantId,
                shopId: shop.id,
                productId,
                variantId: null,
                stock: shop.isMain ? initialStock : 0,
                isActive: true,
              },
            });
          }
        } catch {}
      }
    }
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
      await this.ensureShopStockForAllShops(
        user.tenantId,
        product.id,
        product.stock ?? 0,
      );
    }

    return {
      productsProcessed: products.length,
      shopsProcessed: shops.length,
    };
  }
}
