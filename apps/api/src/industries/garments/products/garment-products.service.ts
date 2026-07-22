import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertGarmentProductDto, UpsertVariantProfileDto } from './dto/upsert-garment-product.dto';

@Injectable()
export class GarmentProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertProfile(user: AuthenticatedUser, dto: UpsertGarmentProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.garmentProductProfile.findUnique({ where: { productId: dto.productId } });
    if (existing) {
      return this.prisma.garmentProductProfile.update({
        where: { productId: dto.productId },
        data: { ...dto, tenantId: user.tenantId },
      });
    }
    return this.prisma.garmentProductProfile.create({
      data: { ...dto, tenantId: user.tenantId },
    });
  }

  async list(user: AuthenticatedUser, params: { gender?: string; categoryType?: string; season?: string; collectionId?: string; featured?: boolean; newArrival?: boolean; bestSeller?: boolean; onSale?: boolean; search?: string }) {
    const profiles = await this.prisma.garmentProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.gender && { gender: params.gender as any }),
        ...(params.categoryType && { categoryType: params.categoryType as any }),
        ...(params.season && { season: params.season as any }),
        ...(params.collectionId && { collectionId: params.collectionId }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.newArrival !== undefined && { isNewArrival: params.newArrival }),
        ...(params.bestSeller !== undefined && { isBestSeller: params.bestSeller }),
        ...(params.onSale !== undefined && { isOnSale: params.onSale }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });

    // Fetch products
    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        ...(params.search && { name: { contains: params.search, mode: 'insensitive' } }),
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        category: true,
        brand: true,
      },
    });
    const productsMap = new Map(products.map((p) => [p.id, p]));

    return profiles
      .filter((p) => productsMap.has(p.productId))
      .map((p) => ({ ...p, product: productsMap.get(p.productId) }));
  }

  async getByProductId(user: AuthenticatedUser, productId: string) {
    const profile = await this.prisma.garmentProductProfile.findFirst({
      where: { productId, tenantId: user.tenantId },
    });
    return profile;
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.garmentProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    const product = await this.prisma.product.findUnique({
      where: { id: p.productId },
      include: { images: true, category: true, brand: true, variants: true },
    });
    const variantProfiles = await this.prisma.garmentVariantProfile.findMany({
      where: { productId: p.productId, tenantId: user.tenantId },
    });
    return { ...p, product, variantProfiles };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.garmentProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.prisma.garmentProductProfile.delete({ where: { id } });
  }

  // ─── Variant profile ───
  async upsertVariantProfile(user: AuthenticatedUser, dto: UpsertVariantProfileDto) {
    const existing = await this.prisma.garmentVariantProfile.findUnique({ where: { variantId: dto.variantId } });
    if (existing) {
      return this.prisma.garmentVariantProfile.update({
        where: { variantId: dto.variantId },
        data: { ...dto, tenantId: user.tenantId },
      });
    }
    return this.prisma.garmentVariantProfile.create({
      data: { ...dto, tenantId: user.tenantId },
    });
  }

  async variantProfilesByProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.garmentVariantProfile.findMany({
      where: { productId, tenantId: user.tenantId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async removeVariantProfile(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.garmentVariantProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Variant profile not found');
    return this.prisma.garmentVariantProfile.delete({ where: { id } });
  }
}
