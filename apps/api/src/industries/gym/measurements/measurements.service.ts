import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateMeasurementDto } from './dto/measurement.dto';

@Injectable()
export class MeasurementsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Records a measurement; the member card shows the latest weight, BMI and body fat. */
  async create(user: AuthenticatedUser, dto: CreateMeasurementDto) {
    const member = await this.prisma.gymMember.findFirst({ where: { id: dto.memberId, tenantId: user.tenantId }, select: { id: true, heightCm: true } });
    if (!member) throw new NotFoundException('Member nahi mila');
    const height = dto.heightCm ?? member.heightCm ?? undefined;
    const bmi = dto.bmi ?? (dto.weightKg && height ? Math.round((dto.weightKg / (height / 100) ** 2) * 10) / 10 : undefined);
    return this.prisma.$transaction(async (tx) => {
      const measurement = await tx.gymBodyMeasurement.create({
        data: {
          ...dto,
          tenantId: user.tenantId,
          heightCm: height,
          bmi,
          measurementDate: dto.measurementDate ? new Date(dto.measurementDate) : new Date(),
          measuredById: user.id,
        },
      });
      await tx.gymMember.update({
        where: { id: member.id },
        data: {
          ...(dto.weightKg !== undefined && { currentWeightKg: dto.weightKg }),
          ...(dto.heightCm !== undefined && { heightCm: dto.heightCm }),
          ...(bmi !== undefined && { bmi }),
          ...(dto.bodyFatPct !== undefined && { bodyFatPct: dto.bodyFatPct }),
          ...(dto.muscleMassPct !== undefined && { muscleMassPct: dto.muscleMassPct }),
        },
      });
      return measurement;
    });
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

    const changes: Record<string, { from: number; to: number; change: number; pctChange: number }> = {};
    ['weightKg', 'bmi', 'bodyFatPct', 'muscleMassPct', 'chestCm', 'waistCm', 'hipsCm', 'bicepsCm', 'thighsCm'].forEach((key) => {
      const from = (first as unknown as Record<string, number | null>)[key];
      const to = (latest as unknown as Record<string, number | null>)[key];
      if (from !== null && to !== null) {
        changes[key] = { from, to, change: to - from, pctChange: from !== 0 ? ((to - from) / from) * 100 : 0 };
      }
    });

    return { measurements, changes };
  }

  /** Measurements are the member's history and are kept; a wrong entry is corrected by recording a new one. */
  remove(): never {
    throw new BadRequestException('Naap record mitaya nahi jata — sahi naap dobara likhein, naya record upar aa jayega');
  }
}
