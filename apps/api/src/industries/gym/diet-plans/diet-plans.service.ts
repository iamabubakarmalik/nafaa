import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateDietPlanDto, UpdateDietPlanDto } from './dto/diet-plan.dto';

@Injectable()
export class DietPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateDietPlanDto) {
    const member = await this.prisma.gymMember.findFirst({ where: { id: dto.memberId, tenantId: user.tenantId }, select: { id: true } });
    if (!member) throw new NotFoundException('Member nahi mila');
    await this.checkTrainer(user.tenantId, dto.trainerId);
    return this.prisma.gymDietPlan.create({
      data: {
        ...dto,
        meals: dto.meals as Prisma.InputJsonValue | undefined,
        tenantId: user.tenantId,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  private async checkTrainer(tenantId: string, trainerId?: string) {
    if (!trainerId) return;
    const t = await this.prisma.gymTrainer.findFirst({ where: { id: trainerId, tenantId }, select: { id: true } });
    if (!t) throw new BadRequestException('Trainer nahi mila');
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
    if (!p) throw new NotFoundException('Diet plan nahi mila');
    return p;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateDietPlanDto) {
    await this.getOne(user, id);
    await this.checkTrainer(user.tenantId, dto.trainerId);
    return this.prisma.gymDietPlan.update({
      where: { id },
      data: {
        ...dto,
        meals: dto.meals as Prisma.InputJsonValue | undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  /** Stops the plan; it stays on the member's record. */
  async remove(user: AuthenticatedUser, id: string) {
    await this.getOne(user, id);
    return this.prisma.gymDietPlan.update({ where: { id }, data: { isActive: false } });
  }
}
