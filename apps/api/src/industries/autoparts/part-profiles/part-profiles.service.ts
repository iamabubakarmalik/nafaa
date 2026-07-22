import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertPartProfileDto } from './dto/upsert-part-profile.dto';

@Injectable()
export class PartProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertPartProfileDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.autoPartProfile.findUnique({ where: { productId: dto.productId } });
    if (existing) {
      return this.prisma.autoPartProfile.update({
        where: { productId: dto.productId },
        data: { ...dto, tenantId: user.tenantId },
      });
    }
    return this.prisma.autoPartProfile.create({
      data: { ...dto, tenantId: user.tenantId },
    });
  }

  async list(user: AuthenticatedUser, params: { category?: string; condition?: string; brand?: string; fastMoving?: boolean; critical?: boolean; search?: string; makeId?: string; modelId?: string }) {
    const profiles = await this.prisma.autoPartProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.category && { category: params.category as any }),
        ...(params.condition && { condition: params.condition as any }),
        ...(params.brand && { brand: { contains: params.brand, mode: 'insensitive' } }),
        ...(params.fastMoving !== undefined && { isFastMoving: params.fastMoving }),
        ...(params.critical !== undefined && { isCritical: params.critical }),
        ...(params.search && {
          OR: [
            { partNumber: { contains: params.search, mode: 'insensitive' } },
            { oemNumber: { contains: params.search, mode: 'insensitive' } },
            { brand: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 300,
    });

    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        ...(params.search && { name: { contains: params.search, mode: 'insensitive' } }),
      },
      include: { images: { where: { isPrimary: true }, take: 1 }, category: true, brand: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let results = profiles.filter((p) => productMap.has(p.productId)).map((p) => ({ ...p, product: productMap.get(p.productId) }));

    // Filter by compatibility if makeId/modelId provided
    if (params.makeId || params.modelId) {
      results = results.filter((r) => {
        if (!r.compatibility) return false;
        const compat = Array.isArray(r.compatibility) ? r.compatibility : [];
        return compat.some((c: any) => {
          if (params.makeId && c.makeId !== params.makeId) return false;
          if (params.modelId && c.modelId !== params.modelId) return false;
          return true;
        });
      });
    }

    return results;
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.autoPartProfile.findFirst({
      where: { productId, tenantId: user.tenantId },
    });
  }

  async findByPartNumber(user: AuthenticatedUser, partNumber: string) {
    const profiles = await this.prisma.autoPartProfile.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [
          { partNumber: { equals: partNumber, mode: 'insensitive' } },
          { oemNumber: { equals: partNumber, mode: 'insensitive' } },
          { alternateNumbers: { has: partNumber } },
        ],
      },
    });
    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    return profiles.map((p) => ({ ...p, product: productMap.get(p.productId) }));
  }

  async findCompatible(user: AuthenticatedUser, makeId: string, modelId: string, year?: number) {
    const profiles = await this.prisma.autoPartProfile.findMany({
      where: { tenantId: user.tenantId },
      take: 1000,
    });
    const filtered = profiles.filter((p) => {
      if (!p.compatibility) return false;
      const compat = Array.isArray(p.compatibility) ? p.compatibility : [];
      return compat.some((c: any) => {
        if (c.makeId !== makeId) return false;
        if (c.modelId && c.modelId !== modelId) return false;
        if (year && c.yearFrom && year < c.yearFrom) return false;
        if (year && c.yearTo && year > c.yearTo) return false;
        return true;
      });
    });

    const productIds = filtered.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    return filtered.map((p) => ({ ...p, product: productMap.get(p.productId) }));
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.autoPartProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Part profile not found');
    return this.prisma.autoPartProfile.delete({ where: { id } });
  }
}
