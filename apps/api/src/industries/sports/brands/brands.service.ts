import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertSportsBrandDto } from './dto/upsert-brand.dto';

@Injectable()
export class SportsBrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertSportsBrandDto) {
    const dup = await this.prisma.sportsBrand.findFirst({
      where: { tenantId: user.tenantId, name: dto.name },
    });
    if (dup) throw new BadRequestException(`Brand "${dto.name}" already exists`);
    return this.prisma.sportsBrand.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: {
    featured?: boolean;
    authorized?: boolean;
    tier?: string;
    active?: boolean;
    search?: string;
  }) {
    return this.prisma.sportsBrand.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.authorized !== undefined && { authorizedDealer: params.authorized }),
        ...(params.tier && { brandTier: params.tier as any }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { code: { contains: params.search, mode: 'insensitive' } },
            { countryOfOrigin: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.sportsBrand.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Brand not found');
    const productCount = await this.prisma.sportsProductProfile.count({
      where: { tenantId: user.tenantId, brandId: id },
    });
    return { ...b, productCount };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertSportsBrandDto) {
    const b = await this.prisma.sportsBrand.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Brand not found');
    return this.prisma.sportsBrand.update({ where: { id }, data: dto });
  }

  async toggleFeatured(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.sportsBrand.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Brand not found');
    return this.prisma.sportsBrand.update({
      where: { id },
      data: { isFeatured: !b.isFeatured },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.sportsBrand.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Brand not found');
    return this.prisma.sportsBrand.update({ where: { id }, data: { isActive: false } });
  }

  async topBrands(user: AuthenticatedUser, limit = 10) {
    return this.prisma.sportsBrand.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalRevenue: 'desc' },
      take: limit,
    });
  }

  async byTier(user: AuthenticatedUser) {
    const grouped = await this.prisma.sportsBrand.groupBy({
      by: ['brandTier'],
      where: { tenantId: user.tenantId, isActive: true },
      _count: { _all: true },
    });
    return grouped;
  }
}
