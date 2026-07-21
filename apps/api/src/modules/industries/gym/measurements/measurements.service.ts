import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class MeasurementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    // Auto-calculate BMI
    let bmi = dto.bmi;
    if (!bmi && dto.weightKg && dto.heightCm) {
      const h = dto.heightCm / 100;
      bmi = dto.weightKg / (h * h);
    }

    const measurement = await this.prisma.gymBodyMeasurement.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        bmi,
        measurementDate: dto.measurementDate ? new Date(dto.measurementDate) : new Date(),
        measuredById: user.id,
      },
    });

    // Update member's latest stats
    if (dto.weightKg || bmi) {
      await this.prisma.gymMember.update({
        where: { id: dto.memberId },
        data: {
          currentWeightKg: dto.weightKg,
          bmi,
          bodyFatPct: dto.bodyFatPct,
          muscleMassPct: dto.muscleMassPct,
        },
      });
    }

    return measurement;
  }

  async list(user: AuthenticatedUser, memberId: string) {
    return this.prisma.gymBodyMeasurement.findMany({
      where: { memberId, tenantId: user.tenantId },
      orderBy: { measurementDate: 'desc' },
    });
  }

  async progress(user: AuthenticatedUser, memberId: string) {
    const measurements = await this.prisma.gymBodyMeasurement.findMany({
      where: { memberId, tenantId: user.tenantId },
      orderBy: { measurementDate: 'asc' },
    });

    if (measurements.length < 2) return { measurements, changes: null };

    const first = measurements[0];
    const latest = measurements[measurements.length - 1];

    const changes: any = {};
    ['weightKg', 'bmi', 'bodyFatPct', 'muscleMassPct', 'chestCm', 'waistCm', 'hipsCm', 'bicepsCm', 'thighsCm'].forEach((key) => {
      if ((first as any)[key] !== null && (latest as any)[key] !== null) {
        const from = (first as any)[key];
        const to = (latest as any)[key];
        changes[key] = { from, to, change: to - from, pctChange: from !== 0 ? ((to - from) / from) * 100 : 0 };
      }
    });

    return { measurements, changes };
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.gymBodyMeasurement.delete({ where: { id } });
  }
}
