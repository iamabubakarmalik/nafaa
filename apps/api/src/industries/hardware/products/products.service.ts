import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { HardwareCategoryType } from '@prisma/client';
import { CATEGORY_KIND_VALUES, deriveProductKind } from '../../../modules/inventory/categories/category-kind';
import { UpsertHardwareProductDto } from './dto/upsert-hardware-product.dto';

@Injectable()
export class HardwareProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertHardwareProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    if (dto.brandId && !(await this.prisma.hardwareBrand.findFirst({ where: { id: dto.brandId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('Brand nahi mila');
    }
    const existing = await this.prisma.hardwareProductProfile.findUnique({ where: { productId: dto.productId } });
    // One category system: the item type comes from the shop category's kind (nearest parent); without one the product keeps its own type.
    const cats = await this.prisma.category.findMany({ where: { tenantId: user.tenantId }, select: { id: true, parentId: true, kind: true } });
    const categoryType = deriveProductKind(cats, product.categoryId, existing?.categoryType ?? dto.categoryType, 'OTHER', CATEGORY_KIND_VALUES.HARDWARE) as HardwareCategoryType;
    if (existing) {
      return this.prisma.hardwareProductProfile.update({
        where: { productId: dto.productId },
        data: { ...dto, categoryType, tenantId: user.tenantId },
      });
    }
    return this.prisma.hardwareProductProfile.create({
      data: { ...dto, categoryType, tenantId: user.tenantId },
    });
  }

  async list(user: AuthenticatedUser, params: {
    brandId?: string;
    categoryType?: string;
    featured?: boolean;
    bestSeller?: boolean;
    fastMoving?: boolean;
    requiresTruck?: boolean;
    search?: string;
  }) {
    const profiles = await this.prisma.hardwareProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.brandId && { brandId: params.brandId }),
        ...(params.categoryType && { categoryType: params.categoryType as any }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.bestSeller !== undefined && { isBestSeller: params.bestSeller }),
        ...(params.fastMoving !== undefined && { isFastMoving: params.fastMoving }),
        ...(params.requiresTruck !== undefined && { requiresTruck: params.requiresTruck }),
      },
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { updatedAt: 'desc' }],
      take: 300,
    });

    const productIds = profiles.map((p) => p.productId);
    const brandIds = profiles.map((p) => p.brandId).filter(Boolean) as string[];

    const [products, brands] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          id: { in: productIds },
          ...(params.search && { name: { contains: params.search, mode: 'insensitive' } }),
        },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          category: true,
        },
      }),
      this.prisma.hardwareBrand.findMany({ where: { id: { in: brandIds } } }),
    ]);

    const productsMap = new Map(products.map((p) => [p.id, p]));
    const brandsMap = new Map(brands.map((b) => [b.id, b]));

    return profiles
      .filter((p) => productsMap.has(p.productId))
      .map((p) => ({
        ...p,
        product: productsMap.get(p.productId),
        brand: p.brandId ? brandsMap.get(p.brandId) : null,
      }));
  }

  async facts(user: AuthenticatedUser) {
    return this.prisma.hardwareProductProfile.findMany({
      where: { tenantId: user.tenantId },
      select: {
        productId: true, categoryType: true, unit: true, grade: true, diameter: true, gradeStrength: true, bagWeight: true,
        tileSize: true, finishType: true, piecesPerBox: true, sqftPerBox: true, colorCode: true, colorName: true, finishSheen: true,
        coverage: true, litersPerCan: true, requiresTruck: true, isFastMoving: true, manufacturingLocation: true,
      },
    });
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    const profile = await this.prisma.hardwareProductProfile.findFirst({
      where: { productId, tenantId: user.tenantId },
    });
    if (!profile) return null;

    const brand = profile.brandId ? await this.prisma.hardwareBrand.findUnique({ where: { id: profile.brandId } }) : null;
    const bulkPricing = await this.prisma.hardwareBulkPricing.findMany({
      where: { tenantId: user.tenantId, productId, isActive: true },
      orderBy: { minQuantity: 'asc' },
    });

    return { ...profile, brand, bulkPricing };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.hardwareProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.byProduct(user, p.productId);
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.hardwareProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.prisma.hardwareProductProfile.delete({ where: { id } });
  }

  async byCategory(user: AuthenticatedUser) {
    const all = await this.prisma.hardwareProductProfile.findMany({
      where: { tenantId: user.tenantId },
      take: 500,
    });
    const grouped: Record<string, number> = {};
    all.forEach((p) => {
      const key = p.categoryType || 'OTHER';
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return grouped;
  }
}
