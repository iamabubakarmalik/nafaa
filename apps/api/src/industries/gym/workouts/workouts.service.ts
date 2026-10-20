import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateWorkoutDto, UpdateWorkoutDto } from './dto/workout.dto';

/** Sets, reps and lifted weight (weight x reps) across the exercises. */
function totals(exercises?: CreateWorkoutDto['exercises']) {
  let totalSets = 0;
  let totalReps = 0;
  let totalWeight = 0;
  for (const ex of exercises ?? []) {
    for (const set of ex?.sets ?? []) {
      totalSets += 1;
      totalReps += Number(set?.reps) || 0;
      totalWeight += (Number(set?.weight) || 0) * (Number(set?.reps) || 0);
    }
  }
  return { totalSets, totalReps, totalWeight };
}

@Injectable()
export class WorkoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateWorkoutDto) {
    const member = await this.prisma.gymMember.findFirst({ where: { id: dto.memberId, tenantId: user.tenantId }, select: { id: true } });
    if (!member) throw new NotFoundException('Member nahi mila');
    return this.prisma.gymWorkoutSession.create({
      data: {
        ...dto,
        ...totals(dto.exercises),
        exercises: (dto.exercises ?? undefined) as Prisma.InputJsonValue | undefined,
        tenantId: user.tenantId,
        sessionDate: dto.sessionDate ? new Date(dto.sessionDate) : new Date(),
      },
    });
  }

  async list(user: AuthenticatedUser, memberId: string) {
    return this.prisma.gymWorkoutSession.findMany({
      where: { memberId, tenantId: user.tenantId, isVoided: false },
      orderBy: { sessionDate: 'desc' },
      take: 100,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.gymWorkoutSession.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Workout nahi mila');
    return s;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateWorkoutDto) {
    const s = await this.getOne(user, id);
    if (s.isVoided) throw new BadRequestException('Void workout badla nahi jata');
    return this.prisma.gymWorkoutSession.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.exercises !== undefined && { ...totals(dto.exercises), exercises: dto.exercises as Prisma.InputJsonValue }),
        ...(dto.sessionDate !== undefined && { sessionDate: new Date(dto.sessionDate) }),
      },
    });
  }

  async summary(user: AuthenticatedUser, memberId: string) {
    const [total, thisMonth, byType] = await Promise.all([
      this.prisma.gymWorkoutSession.aggregate({
        where: { memberId, tenantId: user.tenantId, isVoided: false },
        _sum: { durationMinutes: true, caloriesBurned: true, totalWeight: true, totalReps: true, totalSets: true },
        _count: { _all: true },
      }),
      this.prisma.gymWorkoutSession.count({
        where: {
          memberId,
          tenantId: user.tenantId,
          isVoided: false,
          sessionDate: { gte: new Date(Date.now() - 30 * 86_400_000) },
        },
      }),
      this.prisma.gymWorkoutSession.groupBy({
        by: ['workoutType'],
        where: { memberId, tenantId: user.tenantId, isVoided: false },
        _count: { _all: true },
      }),
    ]);
    return { total, thisMonth, byType };
  }

  /** A wrong log is voided, not deleted: it stays in the database and drops out of lists and totals. */
  async remove(user: AuthenticatedUser, id: string) {
    const s = await this.getOne(user, id);
    if (s.isVoided) throw new BadRequestException('Ye workout pehle hi void hai');
    return this.prisma.gymWorkoutSession.update({ where: { id }, data: { isVoided: true } });
  }
}
