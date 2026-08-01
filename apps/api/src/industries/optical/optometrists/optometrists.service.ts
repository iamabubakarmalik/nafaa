import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertOptometristDto } from './dto/upsert-optometrist.dto';

@Injectable()
export class OptometristsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertOptometristDto) {
    const dup = await this.prisma.opticalOptometrist.findFirst({
      where: { tenantId: user.tenantId, employeeCode: dto.employeeCode },
    });
    if (dup) throw new BadRequestException(`Employee code "${dto.employeeCode}" already exists`);
    return this.prisma.opticalOptometrist.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { active?: boolean; availableToday?: boolean; search?: string }) {
    const dayOfWeek = new Date().getDay();
    return this.prisma.opticalOptometrist.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.availableToday && { isActive: true, workingDays: { has: dayOfWeek } }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search } },
            { employeeCode: { contains: params.search, mode: 'insensitive' } },
            { registrationNumber: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.opticalOptometrist.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Optometrist not found');

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [todayAppointments, upcoming, recentCompleted] = await Promise.all([
      this.prisma.opticalEyeTest.findMany({
        where: { optometristId: id, appointmentDate: { gte: todayStart, lte: todayEnd } },
        orderBy: { appointmentDate: 'asc' },
      }),
      this.prisma.opticalEyeTest.findMany({
        where: { optometristId: id, appointmentDate: { gt: todayEnd }, status: { in: ['SCHEDULED', 'CONFIRMED'] } },
        orderBy: { appointmentDate: 'asc' },
        take: 20,
      }),
      this.prisma.opticalEyeTest.findMany({
        where: { optometristId: id, status: 'COMPLETED' },
        orderBy: { testCompletedAt: 'desc' },
        take: 15,
      }),
    ]);

    return { ...o, todayAppointments, upcoming, recentCompleted };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertOptometristDto) {
    const o = await this.prisma.opticalOptometrist.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Optometrist not found');
    return this.prisma.opticalOptometrist.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.opticalOptometrist.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Optometrist not found');
    return this.prisma.opticalOptometrist.update({ where: { id }, data: { isActive: false } });
  }

  async workload(user: AuthenticatedUser, id: string, from: string, to: string) {
    const o = await this.prisma.opticalOptometrist.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Optometrist not found');

    const tests = await this.prisma.opticalEyeTest.findMany({
      where: { optometristId: id, appointmentDate: { gte: new Date(from), lte: new Date(to) } },
      orderBy: { appointmentDate: 'asc' },
    });

    const completed = tests.filter((t) => t.status === 'COMPLETED');
    const revenue = completed.reduce((s, t) => s + t.paidAmount, 0);
    const avgDuration = completed.length
      ? completed.reduce((s, t) => s + (t.testDurationMinutes ?? 0), 0) / completed.length
      : 0;

    return {
      optometrist: o,
      tests,
      totals: {
        total: tests.length,
        completed: completed.length,
        cancelled: tests.filter((t) => t.status === 'CANCELLED').length,
        noShow: tests.filter((t) => t.status === 'NO_SHOW').length,
        prescriptionsIssued: completed.filter((t) => t.prescriptionIssued).length,
        revenue,
        avgDurationMinutes: Math.round(avgDuration),
      },
    };
  }

  async topPerformers(user: AuthenticatedUser, limit = 10) {
    return this.prisma.opticalOptometrist.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalRevenue: 'desc' },
      take: limit,
    });
  }
}
