import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class SeasonalPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const dup = await this.prisma.agriSeasonalPlan.findFirst({
      where: { tenantId: user.tenantId, season: dto.season, year: dto.year, cropName: dto.cropName },
    });
    if (dup) throw new BadRequestException('Plan already exists for this season/crop');

    return this.prisma.agriSeasonalPlan.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        sowingStart: new Date(dto.sowingStart),
        sowingEnd: new Date(dto.sowingEnd),
        harvestStart: new Date(dto.harvestStart),
        harvestEnd: new Date(dto.harvestEnd),
      },
    });
  }

  async list(user: AuthenticatedUser, params: { season?: string; year?: number; active?: boolean }) {
    return this.prisma.agriSeasonalPlan.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.season && { season: params.season as any }),
        ...(params.year && { year: params.year }),
        ...(params.active !== undefined && { isActive: params.active }),
      },
      orderBy: [{ year: 'desc' }, { sowingStart: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.agriSeasonalPlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Plan not found');
    return p;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    return this.prisma.agriSeasonalPlan.update({
      where: { id },
      data: {
        ...dto,
        sowingStart: dto.sowingStart ? new Date(dto.sowingStart) : undefined,
        sowingEnd: dto.sowingEnd ? new Date(dto.sowingEnd) : undefined,
        harvestStart: dto.harvestStart ? new Date(dto.harvestStart) : undefined,
        harvestEnd: dto.harvestEnd ? new Date(dto.harvestEnd) : undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.agriSeasonalPlan.update({ where: { id }, data: { isActive: false } });
  }
}
