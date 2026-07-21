import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class MembershipPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const dup = await this.prisma.gymMembershipPlan.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`Plan "${dto.name}" already exists`);
    return this.prisma.gymMembershipPlan.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { planType?: string; active?: boolean; featured?: boolean }) {
    return this.prisma.gymMembershipPlan.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.planType && { planType: params.planType as any }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
      },
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { price: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.gymMembershipPlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Plan not found');
    return p;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const p = await this.prisma.gymMembershipPlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Plan not found');
    return this.prisma.gymMembershipPlan.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.gymMembershipPlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Plan not found');
    return this.prisma.gymMembershipPlan.update({ where: { id }, data: { isActive: false } });
  }
}
