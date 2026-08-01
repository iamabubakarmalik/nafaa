import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertApplianceBrandDto } from './dto/upsert-brand.dto';

@Injectable()
export class ApplianceBrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertApplianceBrandDto) {
    const dup = await this.prisma.applianceBrand.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`Brand "${dto.name}" exists`);
    return this.prisma.applianceBrand.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { featured?: boolean; authorized?: boolean; active?: boolean; search?: string }) {
    return this.prisma.applianceBrand.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.authorized !== undefined && { authorizedDealer: params.authorized }),
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
    const b = await this.prisma.applianceBrand.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Brand not found');
    const productCount = await this.prisma.applianceProductProfile.count({ where: { tenantId: user.tenantId, brandId: id } });
    return { ...b, productCount };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertApplianceBrandDto) {
    const b = await this.prisma.applianceBrand.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Brand not found');
    return this.prisma.applianceBrand.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.applianceBrand.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Brand not found');
    return this.prisma.applianceBrand.update({ where: { id }, data: { isActive: false } });
  }
}
