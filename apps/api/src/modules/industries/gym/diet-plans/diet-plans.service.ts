import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class DietPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    return this.prisma.gymDietPlan.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { memberId?: string; trainerId?: string; active?: boolean }) {
    return this.prisma.gymDietPlan.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.memberId && { memberId: params.memberId }),
        ...(params.trainerId && { trainerId: params.trainerId }),
        ...(params.active !== undefined && { isActive: params.active }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.gymDietPlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Plan not found');
    return p;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    return this.prisma.gymDietPlan.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.gymDietPlan.update({ where: { id }, data: { isActive: false } });
  }
}
