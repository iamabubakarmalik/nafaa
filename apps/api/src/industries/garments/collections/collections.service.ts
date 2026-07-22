import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertCollectionDto } from './dto/upsert-collection.dto';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertCollectionDto) {
    const dup = await this.prisma.garmentCollection.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`Collection "${dto.name}" already exists`);
    return this.prisma.garmentCollection.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        launchDate: dto.launchDate ? new Date(dto.launchDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { season?: string; active?: boolean; featured?: boolean; search?: string }) {
    return this.prisma.garmentCollection.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.season && { season: params.season as any }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { code: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.garmentCollection.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Collection not found');

    // Get products in this collection
    const profiles = await this.prisma.garmentProductProfile.findMany({
      where: { tenantId: user.tenantId, collectionId: id },
      take: 100,
    });
    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });

    return { ...c, products, productCount: profiles.length };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertCollectionDto) {
    const c = await this.prisma.garmentCollection.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Collection not found');
    return this.prisma.garmentCollection.update({
      where: { id },
      data: {
        ...dto,
        launchDate: dto.launchDate ? new Date(dto.launchDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async toggleFeatured(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.garmentCollection.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Collection not found');
    return this.prisma.garmentCollection.update({ where: { id }, data: { isFeatured: !c.isFeatured } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.garmentCollection.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Collection not found');
    return this.prisma.garmentCollection.update({ where: { id }, data: { isActive: false } });
  }
}
