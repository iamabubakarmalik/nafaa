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
}
