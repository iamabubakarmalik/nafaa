import {
  ConflictException, Injectable, NotFoundException,
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

    const { tagIds, imageUrls, ...productData } = dto;

    const product = await this.prisma.product.create({
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
      include: {
        category: true,
        brand: true,
      },
    });

    if (tagIds?.length) {
      await this.prisma.productTag.createMany({
        data: tagIds.map((tagId) => ({ productId: product.id, tagId })),
        skipDuplicates: true,
      });
    }

    if (imageUrls?.length) {
      await this.prisma.productImage.createMany({
        data: imageUrls.map((url, i) => ({
          productId: product.id,
          url,
          isPrimary: i === 0,
          sortOrder: i,
        })),
      });
    }

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
      else if (query.stockStatus === 'low') {
        // Filter applied post-query for accuracy
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

    const { tagIds, imageUrls, ...productData } = dto;

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

  async remove(user: AuthenticatedUser, id: string) {
  await this.findOne(user, id);

  const saleItemCount = await this.prisma.saleItem.count({
    where: { productId: id },
  });

  const purchaseItemCount = await this.prisma.purchaseItem.count({
    where: { productId: id },
  });

  if (saleItemCount > 0 || purchaseItemCount > 0) {
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    return {
      message: 'Product deactivated (cannot delete — has sales/purchase history)',
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
      await this.prisma.product.updateMany({
        where,
        data: { isActive: true },
      });
      break;

    case 'deactivate':
      await this.prisma.product.updateMany({
        where,
        data: { isActive: false },
      });
      break;

    case 'feature':
      await this.prisma.product.updateMany({
        where,
        data: { isFeatured: true },
      });
      break;

    case 'unfeature':
      await this.prisma.product.updateMany({
        where,
        data: { isFeatured: false },
      });
      break;

    case 'delete': {
      // 🔍 Find products with sales/purchase history
      const productsWithHistory = await this.prisma.product.findMany({
        where: {
          id: { in: productIds },
          tenantId: user.tenantId,
          OR: [
            { saleItems: { some: {} } },
            { purchaseItems: { some: {} } },
          ],
        },
        select: { id: true },
      });

      const softIds = productsWithHistory.map((p) => p.id);
      const hardIds = productIds.filter((id) => !softIds.includes(id));

      // 🟡 Soft delete (deactivate)
      if (softIds.length > 0) {
        await this.prisma.product.updateMany({
          where: { id: { in: softIds }, tenantId: user.tenantId },
          data: { isActive: false },
        });
      }

      // 🔴 Hard delete
      if (hardIds.length > 0) {
        await this.prisma.product.deleteMany({
          where: { id: { in: hardIds }, tenantId: user.tenantId },
        });
      }

      return {
        count: productIds.length,
        action,
        hardDeleted: hardIds.length,
        softDeleted: softIds.length,
      };
    }
  }

  return { count: productIds.length, action };
}

  // ═══════════════════════════════════════════════════════════
  // BULK IMPORT — Preview (validate + match references)
  // ═══════════════════════════════════════════════════════════

  async bulkImportPreview(user: AuthenticatedUser, rows: any[]) {
    // Fetch all existing data for matching
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

      // SKU duplicate check
      if (row.sku && skuSet.has(String(row.sku).toLowerCase())) {
        warnings.push(`SKU "${row.sku}" already exists`);
      }
      // Barcode duplicate check
      if (row.barcode && barcodeSet.has(String(row.barcode).toLowerCase())) {
        warnings.push(`Barcode "${row.barcode}" already exists`);
      }

      // Category matching
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

      // Brand matching
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

      // Tags matching
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

      // Variants parsing
      const variantNames = String(row.variantNames || '')
        .split(',')
        .map((v: string) => v.trim())
        .filter(Boolean);

      // Images parsing
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
  // BULK IMPORT — Apply (create products + variants + refs)
  // ═══════════════════════════════════════════════════════════

  async bulkImportApply(user: AuthenticatedUser, rows: any[]) {
    const results: any[] = [];
    let newCategoriesCreated = 0;
    let newBrandsCreated = 0;
    let newTagsCreated = 0;
    let newVariantsCreated = 0;

    // Pre-fetch existing refs for cache
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
        // Resolve or create category
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

        // Resolve or create brand
        let brandId: string | undefined = row.brandId;
        if (!brandId && row.newBrandName) {
          const key = row.newBrandName.toLowerCase().trim();
          brandId = brandCache.get(key);
          if (!brandId) {
            const slug = row.newBrandName
              .toLowerCase()
              .trim()
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

        // Resolve or create tags
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

        // Generate slug
        const slug =
          row.name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 100) +
          '-' +
          Math.random().toString(36).slice(2, 6);

        // Create product
        const product = await this.prisma.product.create({
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

        // Create tag links
        if (tagIds.length > 0) {
          await this.prisma.productTag.createMany({
            data: tagIds.map((tagId: string) => ({
              productId: product.id,
              tagId,
            })),
            skipDuplicates: true,
          });
        }

        // Create variants
        let variantCount = 0;
        if (row.variantNames && row.variantNames.length > 0) {
          await this.prisma.productVariant.createMany({
            data: row.variantNames.map((vName: string, vIdx: number) => ({
              productId: product.id,
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
          newVariantsCreated += variantCount;
        }

        // Create images
        if (row.imageUrls && row.imageUrls.length > 0) {
          await this.prisma.productImage.createMany({
            data: row.imageUrls.map((url: string, idx: number) => ({
              productId: product.id,
              url: url.trim(),
              isPrimary: idx === 0,
              sortOrder: idx,
            })),
          });
        }

        results.push({
          index: i + 1,
          productName: row.name,
          success: true,
          productId: product.id,
          variantsCreated: variantCount,
        });
      } catch (e: any) {
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

}
