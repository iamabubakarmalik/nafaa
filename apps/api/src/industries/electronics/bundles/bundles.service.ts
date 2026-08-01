import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertBundleDto } from './dto/upsert-bundle.dto';

@Injectable()
export class BundlesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertBundleDto) {
    const dup = await this.prisma.electronicsBundle.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`Bundle "${dto.name}" exists`);

    const savings = dto.originalPrice - dto.bundlePrice;
    const savingsPct = dto.originalPrice > 0 ? (savings / dto.originalPrice) * 100 : 0;

    return this.prisma.electronicsBundle.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        savings,
        savingsPct,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { active?: boolean; featured?: boolean; search?: string }) {
    return this.prisma.electronicsBundle.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.search && { name: { contains: params.search, mode: 'insensitive' } }),
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.electronicsBundle.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Bundle not found');
    return b;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertBundleDto) {
    const b = await this.prisma.electronicsBundle.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Bundle not found');
    const savings = dto.originalPrice - dto.bundlePrice;
    const savingsPct = dto.originalPrice > 0 ? (savings / dto.originalPrice) * 100 : 0;
    return this.prisma.electronicsBundle.update({
      where: { id },
      data: {
        ...dto,
        savings,
        savingsPct,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.electronicsBundle.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Bundle not found');
    return this.prisma.electronicsBundle.update({ where: { id }, data: { isActive: false } });
  }
}
