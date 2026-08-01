import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertGroomerDto } from './dto/upsert-groomer.dto';

@Injectable()
export class GroomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertGroomerDto) {
    const dup = await this.prisma.petGroomer.findFirst({
      where: { tenantId: user.tenantId, employeeCode: dto.employeeCode },
    });
    if (dup) throw new BadRequestException(`Employee code "${dto.employeeCode}" already exists`);
    return this.prisma.petGroomer.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { active?: boolean; availableToday?: boolean; species?: string; search?: string }) {
    const dayOfWeek = new Date().getDay();
    return this.prisma.petGroomer.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.availableToday && { isActive: true, workingDays: { has: dayOfWeek } }),
        ...(params.species && { specializations: { has: params.species as any } }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search } },
            { employeeCode: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const g = await this.prisma.petGroomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!g) throw new NotFoundException('Groomer not found');

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [todayAppointments, upcoming, recent] = await Promise.all([
      this.prisma.petGroomingAppointment.findMany({
        where: { groomerId: id, scheduledDate: { gte: todayStart, lte: todayEnd } },
        orderBy: { scheduledDate: 'asc' },
      }),
      this.prisma.petGroomingAppointment.findMany({
        where: { groomerId: id, scheduledDate: { gt: todayEnd }, status: { in: ['SCHEDULED', 'CONFIRMED'] } },
        orderBy: { scheduledDate: 'asc' },
        take: 20,
      }),
      this.prisma.petGroomingAppointment.findMany({
        where: { groomerId: id, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 15,
      }),
    ]);

    return { ...g, todayAppointments, upcoming, recentCompleted: recent };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertGroomerDto) {
    const g = await this.prisma.petGroomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!g) throw new NotFoundException('Groomer not found');
    return this.prisma.petGroomer.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const g = await this.prisma.petGroomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!g) throw new NotFoundException('Groomer not found');
    return this.prisma.petGroomer.update({ where: { id }, data: { isActive: false } });
  }

  async workload(user: AuthenticatedUser, id: string, from: string, to: string) {
    const g = await this.prisma.petGroomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!g) throw new NotFoundException('Groomer not found');

    const appointments = await this.prisma.petGroomingAppointment.findMany({
      where: { groomerId: id, scheduledDate: { gte: new Date(from), lte: new Date(to) } },
      orderBy: { scheduledDate: 'asc' },
    });

    const completed = appointments.filter((a) => ['COMPLETED', 'READY_FOR_PICKUP'].includes(a.status));
    const revenue = completed.reduce((s, a) => s + a.totalFee, 0);
    const commission = (revenue * g.commissionPct) / 100;

    return {
      groomer: g,
      appointments,
      totals: {
        total: appointments.length,
        completed: completed.length,
        cancelled: appointments.filter((a) => a.status === 'CANCELLED').length,
        noShow: appointments.filter((a) => a.status === 'NO_SHOW').length,
        revenue,
        commission,
      },
    };
  }

  async topPerformers(user: AuthenticatedUser, limit = 10) {
    return this.prisma.petGroomer.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalRevenue: 'desc' },
      take: limit,
    });
  }
}
