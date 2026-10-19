import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { opt } from '../common/gym-common';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';

@Injectable()
export class MembershipPlansService {
  constructor(private readonly prisma: PrismaService) {}

  /** Keeps the plan rules consistent: a visit limit means not unlimited, freeze needs days. */
  private clean<T extends UpdatePlanDto>(dto: T): T {
    const out = { ...dto, name: dto.name?.trim(), code: dto.code === undefined ? undefined : opt(dto.code) ?? null } as T;
    if (dto.visitLimit != null && dto.visitLimit > 0) out.isUnlimited = false;
    if (dto.isUnlimited) out.visitLimit = null;
    if (dto.allowFreeze === false) out.maxFreezeDays = 0;
    if (dto.allowFreeze && !(dto.maxFreezeDays && dto.maxFreezeDays > 0)) throw new BadRequestException('Freeze ke din likhein');
    if (dto.includesPersonalTraining && !(dto.personalTrainingSessions && dto.personalTrainingSessions > 0)) throw new BadRequestException('PT sessions ki tadaad likhein');
    if (dto.includesPersonalTraining === false) out.personalTrainingSessions = 0;
    return out;
  }

  async create(user: AuthenticatedUser, dto: CreatePlanDto) {
    const data = this.clean(dto);
    const dup = await this.prisma.gymMembershipPlan.findFirst({ where: { tenantId: user.tenantId, name: { equals: data.name, mode: 'insensitive' } } });
    if (dup) throw new BadRequestException(`Plan "${data.name}" pehle se hai`);
    return this.prisma.gymMembershipPlan.create({ data: { ...(data as Prisma.GymMembershipPlanUncheckedCreateInput), tenantId: user.tenantId } });
  }

  async list(user: AuthenticatedUser, params: { planType?: string; active?: boolean; featured?: boolean }) {
    return this.prisma.gymMembershipPlan.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.planType && { planType: params.planType as Prisma.GymMembershipPlanWhereInput['planType'] }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
      },
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { price: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.gymMembershipPlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Plan nahi mila');
    return p;
  }

  /** Price changes apply to the next sale; memberships already sold keep their price. */
  async update(user: AuthenticatedUser, id: string, dto: UpdatePlanDto) {
    const p = await this.prisma.gymMembershipPlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Plan nahi mila');
    const data = this.clean({ ...dto, ...(dto.allowFreeze === undefined && dto.maxFreezeDays !== undefined && { allowFreeze: p.allowFreeze }) });
    if (data.name && data.name.toLowerCase() !== p.name.toLowerCase()) {
      const dup = await this.prisma.gymMembershipPlan.findFirst({ where: { tenantId: user.tenantId, name: { equals: data.name, mode: 'insensitive' }, NOT: { id } } });
      if (dup) throw new BadRequestException(`Plan "${data.name}" pehle se hai`);
    }
    return this.prisma.gymMembershipPlan.update({ where: { id }, data: data as Prisma.GymMembershipPlanUpdateInput });
  }

  /** Stops selling the plan; members on it keep running. */
  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.gymMembershipPlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Plan nahi mila');
    return this.prisma.gymMembershipPlan.update({ where: { id }, data: { isActive: false } });
  }
}
