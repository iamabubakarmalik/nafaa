import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class WorkoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    let totalSets = 0, totalReps = 0, totalWeight = 0;
    if (dto.exercises && Array.isArray(dto.exercises)) {
      for (const ex of dto.exercises) {
        if (ex.sets) {
          totalSets += ex.sets.length;
          for (const s of ex.sets) {
            totalReps += Number(s.reps) || 0;
            totalWeight += (Number(s.weight) || 0) * (Number(s.reps) || 0);
          }
        }
      }
    }

    return this.prisma.gymWorkoutSession.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        totalSets,
        totalReps,
        totalWeight,
        sessionDate: dto.sessionDate ? new Date(dto.sessionDate) : new Date(),
      },
    });
  }

  async list(user: AuthenticatedUser, memberId: string) {
    return this.prisma.gymWorkoutSession.findMany({
      where: { memberId, tenantId: user.tenantId },
      orderBy: { sessionDate: 'desc' },
      take: 100,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.gymWorkoutSession.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Session not found');
    return s;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    return this.prisma.gymWorkoutSession.update({ where: { id }, data: dto });
  }

  async summary(user: AuthenticatedUser, memberId: string) {
    const [total, thisMonth, byType] = await Promise.all([
      this.prisma.gymWorkoutSession.aggregate({
        where: { memberId, tenantId: user.tenantId },
        _sum: { durationMinutes: true, caloriesBurned: true, totalWeight: true, totalReps: true, totalSets: true },
        _count: { _all: true },
      }),
      this.prisma.gymWorkoutSession.count({
        where: {
          memberId,
          tenantId: user.tenantId,
          sessionDate: { gte: new Date(new Date().setDate(1)) },
        },
      }),
      this.prisma.gymWorkoutSession.groupBy({
        by: ['workoutType'],
        where: { memberId, tenantId: user.tenantId },
        _count: { _all: true },
      }),
    ]);
    return { total, thisMonth, byType };
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.gymWorkoutSession.delete({ where: { id } });
  }
}
