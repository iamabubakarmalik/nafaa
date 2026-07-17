import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class RatePlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const dup = await this.prisma.hotelRatePlan.findFirst({ where: { tenantId: user.tenantId, code: dto.code } });
    if (dup) throw new BadRequestException(`Rate plan code "${dto.code}" exists`);
    return this.prisma.hotelRatePlan.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  async list(user: AuthenticatedUser, params: { active?: boolean; planType?: string }) {
    return this.prisma.hotelRatePlan.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.planType && { planType: params.planType }),
      },
      orderBy: [{ displayOrder: 'asc' }, { startDate: 'desc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const rp = await this.prisma.hotelRatePlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rp) throw new NotFoundException('Rate plan not found');
    return rp;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    return this.prisma.hotelRatePlan.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.hotelRatePlan.update({ where: { id }, data: { isActive: false } });
  }

  async applicableFor(user: AuthenticatedUser, params: { date: string; roomTypeId?: string; source?: string }) {
    const date = new Date(params.date);
    return this.prisma.hotelRatePlan.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });
  }
}
