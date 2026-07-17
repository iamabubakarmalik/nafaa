import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpsertBrandDto } from './dto/upsert-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertBrandDto) {
    const dup = await this.prisma.hardwareBrand.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`Brand "${dto.name}" already exists`);
    return this.prisma.hardwareBrand.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { tier?: string; featured?: boolean; active?: boolean; search?: string }) {
    return this.prisma.hardwareBrand.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.tier && { tier: params.tier as any }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { code: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.hardwareBrand.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Brand not found');

    // Count products
    const productCount = await this.prisma.hardwareProductProfile.count({ where: { tenantId: user.tenantId, brandId: id } });
    return { ...b, productCount };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertBrandDto) {
    const b = await this.prisma.hardwareBrand.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Brand not found');
    return this.prisma.hardwareBrand.update({ where: { id }, data: dto });
  }

  async toggleFeatured(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.hardwareBrand.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Brand not found');
    return this.prisma.hardwareBrand.update({ where: { id }, data: { isFeatured: !b.isFeatured } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.hardwareBrand.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Brand not found');
    return this.prisma.hardwareBrand.update({ where: { id }, data: { isActive: false } });
  }
}
