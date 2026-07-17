import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class AdvisoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.agriCropAdvisory.count({ where: { tenantId: user.tenantId } });
    const advisoryNumber = 'ADV-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');

    return this.prisma.agriCropAdvisory.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        advisoryNumber,
        sowingDate: dto.sowingDate ? new Date(dto.sowingDate) : null,
        expectedHarvest: dto.expectedHarvest ? new Date(dto.expectedHarvest) : null,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
        landAreaAcres: dto.landAreaAcres ? Number(dto.landAreaAcres) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { farmerId?: string; cropName?: string; completed?: boolean; season?: string }) {
    return this.prisma.agriCropAdvisory.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.farmerId && { farmerId: params.farmerId }),
        ...(params.cropName && { cropName: { contains: params.cropName, mode: 'insensitive' } }),
        ...(params.completed !== undefined && { completed: params.completed }),
        ...(params.season && { season: params.season as any }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.agriCropAdvisory.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Advisory not found');
    return a;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    return this.prisma.agriCropAdvisory.update({
      where: { id },
      data: {
        ...dto,
        sowingDate: dto.sowingDate ? new Date(dto.sowingDate) : undefined,
        expectedHarvest: dto.expectedHarvest ? new Date(dto.expectedHarvest) : undefined,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
      },
    });
  }

  async markComplete(user: AuthenticatedUser, id: string) {
    return this.prisma.agriCropAdvisory.update({ where: { id }, data: { completed: true } });
  }
}
