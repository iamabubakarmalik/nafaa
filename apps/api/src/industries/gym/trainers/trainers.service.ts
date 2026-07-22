import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class TrainersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const staff = await this.prisma.staff.findFirst({ where: { id: dto.staffId, tenantId: user.tenantId } });
    if (!staff) throw new NotFoundException('Staff not found');

    const existing = await this.prisma.gymTrainer.findUnique({ where: { staffId: dto.staffId } });
    if (existing) throw new BadRequestException('Trainer profile already exists');

    const count = await this.prisma.gymTrainer.count({ where: { tenantId: user.tenantId } });
    const trainerNumber = 'TR-' + String(count + 1).padStart(4, '0');

    return this.prisma.gymTrainer.create({
      data: { tenantId: user.tenantId, trainerNumber, ...dto },
    });
  }

  async list(user: AuthenticatedUser, params: { role?: string; available?: boolean; search?: string }) {
    const trainers = await this.prisma.gymTrainer.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.role && { role: params.role as any }),
        ...(params.available !== undefined && { isAvailable: params.available }),
      },
      orderBy: { updatedAt: 'desc' },
    });

    const staffIds = trainers.map((t) => t.staffId);
    const staffs = await this.prisma.staff.findMany({
      where: { id: { in: staffIds } },
    });
    const staffMap = new Map(staffs.map((s) => [s.id, s]));
    return trainers.map((t) => ({ ...t, staff: staffMap.get(t.staffId) }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.gymTrainer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Trainer not found');
    const staff = await this.prisma.staff.findUnique({ where: { id: t.staffId } });
    return { ...t, staff };
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const t = await this.prisma.gymTrainer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Trainer not found');
    return this.prisma.gymTrainer.update({ where: { id }, data: dto });
  }

  async availability(user: AuthenticatedUser, id: string, date: string) {
    const trainer = await this.prisma.gymTrainer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!trainer) throw new NotFoundException('Trainer not found');
    const dayOfWeek = new Date(date).getDay();
    if (!trainer.workingDays.includes(dayOfWeek)) return { available: false, reason: 'Not a working day' };

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const [classes, ptSessions] = await Promise.all([
      this.prisma.gymClass.findMany({
        where: { trainerId: id, scheduledStart: { gte: dayStart, lte: dayEnd }, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
      }),
      this.prisma.gymPersonalTraining.findMany({
        where: { trainerId: id, scheduledStart: { gte: dayStart, lte: dayEnd }, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
      }),
    ]);

    return {
      available: true,
      workingHours: { start: trainer.workStartTime, end: trainer.workEndTime },
      classes,
      ptSessions,
    };
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.gymTrainer.update({ where: { id }, data: { isActive: false } });
  }
}
