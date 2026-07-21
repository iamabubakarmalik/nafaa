import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpsertCatalogDto } from './dto/upsert-catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertCatalogDto) {
    const dup = await this.prisma.serviceCatalog.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`Service "${dto.name}" already exists`);
    return this.prisma.serviceCatalog.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { category?: string; businessType?: string; search?: string; active?: boolean; featured?: boolean; popular?: boolean; emergency?: boolean }) {
    return this.prisma.serviceCatalog.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.category && { category: params.category as any }),
        ...(params.businessType && { businessType: params.businessType as any }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.popular !== undefined && { isPopular: params.popular }),
        ...(params.emergency !== undefined && { isEmergency: params.emergency }),
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

  async byCategory(user: AuthenticatedUser) {
    const all = await this.prisma.serviceCatalog.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    const grouped: Record<string, any[]> = {};
    all.forEach((s) => {
      const key = s.category;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });
    return grouped;
  }

  async byBusinessType(user: AuthenticatedUser) {
    const all = await this.prisma.serviceCatalog.findMany({
      where: { tenantId: user.tenantId, isActive: true, businessType: { not: null } },
      orderBy: { displayOrder: 'asc' },
    });
    const grouped: Record<string, any[]> = {};
    all.forEach((s) => {
      const key = s.businessType || 'OTHER';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });
    return grouped;
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.serviceCatalog.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Service not found');
    return s;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertCatalogDto) {
    const s = await this.prisma.serviceCatalog.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Service not found');
    return this.prisma.serviceCatalog.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.serviceCatalog.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Service not found');
    return this.prisma.serviceCatalog.update({ where: { id }, data: { isActive: false } });
  }
}
