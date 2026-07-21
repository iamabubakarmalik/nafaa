import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class PersonalTrainingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.gymPersonalTraining.count({ where: { tenantId: user.tenantId } });
    const sessionNumber = 'PT-' + new Date().getFullYear() + '-' + String(count + 1).padStart(5, '0');

    const trainer = await this.prisma.gymTrainer.findFirst({ where: { id: dto.trainerId, tenantId: user.tenantId } });
    if (!trainer) throw new NotFoundException('Trainer not found');

    const price = dto.price ?? trainer.perSessionRate;
    const commissionAmount = (price * trainer.commissionPct) / 100 + trainer.commissionFixed;

    return this.prisma.gymPersonalTraining.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        sessionNumber,
        scheduledStart: new Date(dto.scheduledStart),
        scheduledEnd: new Date(dto.scheduledEnd),
        price,
        commissionAmount,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { memberId?: string; trainerId?: string; status?: string; from?: string; to?: string }) {
    return this.prisma.gymPersonalTraining.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.memberId && { memberId: params.memberId }),
        ...(params.trainerId && { trainerId: params.trainerId }),
        ...(params.status && { status: params.status }),
        ...(params.from || params.to ? {
          scheduledStart: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
      },
      include: { trainer: true },
      orderBy: { scheduledStart: 'asc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.gymPersonalTraining.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { trainer: true },
    });
    if (!s) throw new NotFoundException('Session not found');
    return s;
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string, cancellationReason?: string) {
    const patch: any = { status };
    if (status === 'IN_PROGRESS') patch.actualStart = new Date();
    if (status === 'COMPLETED') patch.actualEnd = new Date();
    if (status === 'CANCELLED') { patch.cancelledAt = new Date(); patch.cancellationReason = cancellationReason; }
    return this.prisma.gymPersonalTraining.update({ where: { id }, data: patch });
  }

  async rate(user: AuthenticatedUser, id: string, rating: number, feedback?: string) {
    return this.prisma.gymPersonalTraining.update({
      where: { id },
      data: { memberRating: rating, memberFeedback: feedback },
    });
  }

  async logWorkout(user: AuthenticatedUser, id: string, dto: { focusArea?: string; workoutPlan?: any; exercisesPerformed?: any; caloriesBurned?: number; trainerNotes?: string }) {
    return this.prisma.gymPersonalTraining.update({
      where: { id },
      data: dto,
    });
  }
}
