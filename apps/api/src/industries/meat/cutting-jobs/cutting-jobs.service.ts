import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { cleanInput, parseDay } from '../meat-common';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class CuttingJobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!(Number(dto.inputWeightKg) > 0)) throw new BadRequestException('Wazan (kg) likhein');
    if (!dto.slaughterLogId) dto.slaughterLogId = undefined;
    if (dto.slaughterLogId) {
      const log = await this.prisma.meatSlaughterLog.findFirst({ where: { id: dto.slaughterLogId, tenantId: user.tenantId }, select: { id: true } });
      if (!log) throw new NotFoundException('Zibah ka record nahi mila');
    }
    const count = await this.prisma.meatCuttingJob.count({ where: { tenantId: user.tenantId } });
    const jobNumber = 'CUT-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');

    return this.prisma.meatCuttingJob.create({
      data: {
        ...cleanInput(dto),
        tenantId: user.tenantId,
        jobNumber,
        startedAt: parseDay(dto.startedAt) ?? new Date(),
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; butcherId?: string }) {
    return this.prisma.meatCuttingJob.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.butcherId && { butcherId: params.butcherId }),
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const j = await this.prisma.meatCuttingJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!j) throw new NotFoundException('Job not found');
    return j;
  }

  async complete(user: AuthenticatedUser, id: string, dto: { outputWeightKg: number; wasteWeightKg?: number; cutsProduced?: any; notes?: string }) {
    const j = await this.prisma.meatCuttingJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!j) throw new NotFoundException('Job not found');
    if (j.status === 'COMPLETED') throw new BadRequestException('Ye kaam pehle hi mukammal ho chuka hai');
    if (!(Number(dto?.outputWeightKg) >= 0) || Number(dto.outputWeightKg) > j.inputWeightKg) {
      throw new BadRequestException('Tayyar gosht ka wazan 0 se input wazan tak hona chahiye');
    }

    const yieldPct = (dto.outputWeightKg / j.inputWeightKg) * 100;
    const completedAt = new Date();
    const durationMin = Math.round((completedAt.getTime() - j.startedAt.getTime()) / 60000);

    return this.prisma.meatCuttingJob.update({
      where: { id },
      data: {
        outputWeightKg: dto.outputWeightKg,
        wasteWeightKg: dto.wasteWeightKg ?? j.inputWeightKg - dto.outputWeightKg,
        yieldPct,
        completedAt,
        durationMin,
        status: 'COMPLETED',
        cutsProduced: dto.cutsProduced,
        notes: dto.notes,
      },
    });
  }
}
