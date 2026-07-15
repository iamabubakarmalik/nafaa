import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpsertServiceDto } from './dto/upsert-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertServiceDto) {
    const dup = await this.prisma.salonService.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`Service "${dto.name}" already exists`);
    return this.prisma.salonService.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { category?: string; forGender?: string; search?: string; active?: boolean; featured?: boolean; popular?: boolean }) {
    return this.prisma.salonService.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.category && { category: params.category as any }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.popular !== undefined && { isPopular: params.popular }),
        ...(params.forGender === 'MEN' && { forMen: true }),
        ...(params.forGender === 'WOMEN' && { forWomen: true }),
        ...(params.forGender === 'KIDS' && { forKids: true }),
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
    const s = await this.prisma.salonService.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Service not found');
    return s;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertServiceDto) {
    const s = await this.prisma.salonService.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Service not found');
    return this.prisma.salonService.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.salonService.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Service not found');
    return this.prisma.salonService.update({ where: { id }, data: { isActive: false } });
  }

  async byCategory(user: AuthenticatedUser) {
    const all = await this.prisma.salonService.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    const grouped: Record<string, any[]> = {};
    all.forEach((s) => {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    });
    return grouped;
  }
}
