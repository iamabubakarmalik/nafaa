import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertShoeBrandDto } from './dto/upsert-brand.dto';

@Injectable()
export class ShoeBrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertShoeBrandDto) {
    const dup = await this.prisma.shoeBrand.findFirst({
      where: { tenantId: user.tenantId, name: dto.name },
    });
    if (dup) throw new BadRequestException(`Brand "${dto.name}" already exists`);
    return this.prisma.shoeBrand.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: {
    featured?: boolean;
    premium?: boolean;
    sports?: boolean;
    local?: boolean;
    authorized?: boolean;
    active?: boolean;
    search?: string;
  }) {
    return this.prisma.shoeBrand.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.premium !== undefined && { isPremium: params.premium }),
        ...(params.sports !== undefined && { isSportsBrand: params.sports }),
        ...(params.local !== undefined && { isLocal: params.local }),
        ...(params.authorized !== undefined && { authorizedDealer: params.authorized }),
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
    const b = await this.prisma.shoeBrand.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Brand not found');
    const productCount = await this.prisma.shoeProductProfile.count({ where: { tenantId: user.tenantId, brandId: id } });
    return { ...b, productCount };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertShoeBrandDto) {
    const b = await this.prisma.shoeBrand.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Brand not found');
    return this.prisma.shoeBrand.update({ where: { id }, data: dto });
  }

  async toggleFeatured(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.shoeBrand.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Brand not found');
    return this.prisma.shoeBrand.update({ where: { id }, data: { isFeatured: !b.isFeatured } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.shoeBrand.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Brand not found');
    return this.prisma.shoeBrand.update({ where: { id }, data: { isActive: false } });
  }

  async topBrands(user: AuthenticatedUser, limit = 10) {
    return this.prisma.shoeBrand.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalRevenue: 'desc' },
      take: limit,
    });
  }
}
