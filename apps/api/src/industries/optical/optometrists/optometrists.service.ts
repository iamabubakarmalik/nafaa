import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { startOfDayTz, endOfDayTz, weekdayInTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpdateOptometristDto, UpsertOptometristDto } from './dto/upsert-optometrist.dto';

@Injectable()
export class OptometristsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertOptometristDto) {
    const dup = await this.prisma.opticalOptometrist.findFirst({
      where: { tenantId: user.tenantId, employeeCode: dto.employeeCode },
    });
    if (dup) throw new BadRequestException(`Code "${dto.employeeCode}" pehle se kisi aur ka hai`);
    this.checkHours(dto);
    return this.prisma.opticalOptometrist.create({ data: { tenantId: user.tenantId, ...dto, employeeCode: dto.employeeCode.trim(), name: dto.name.trim() } });
  }

  private checkHours(dto: { workStartTime?: string; workEndTime?: string }) {
    if (dto.workStartTime && dto.workEndTime && dto.workEndTime <= dto.workStartTime) {
      throw new BadRequestException('Chhutti ka waqt aane ke waqt ke baad hona chahiye');
    }
  }

  async list(user: AuthenticatedUser, params: { active?: boolean; availableToday?: boolean; search?: string }) {
    const dayOfWeek = weekdayInTz(new Date());
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
    if (!o) throw new NotFoundException('Optometrist nahi mila');

    const todayStart = startOfDayTz();
    const todayEnd = endOfDayTz();

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

  async update(user: AuthenticatedUser, id: string, dto: UpdateOptometristDto) {
    const o = await this.prisma.opticalOptometrist.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Optometrist nahi mila');
    if (dto.employeeCode && dto.employeeCode !== o.employeeCode) {
      const dup = await this.prisma.opticalOptometrist.findFirst({ where: { tenantId: user.tenantId, employeeCode: dto.employeeCode, id: { not: id } }, select: { id: true } });
      if (dup) throw new BadRequestException(`Code "${dto.employeeCode}" pehle se kisi aur ka hai`);
    }
    this.checkHours({ workStartTime: dto.workStartTime ?? o.workStartTime, workEndTime: dto.workEndTime ?? o.workEndTime });
    return this.prisma.opticalOptometrist.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.opticalOptometrist.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Optometrist nahi mila');
    return this.prisma.opticalOptometrist.update({ where: { id }, data: { isActive: false } });
  }

  async workload(user: AuthenticatedUser, id: string, from: string, to: string) {
    const o = await this.prisma.opticalOptometrist.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Optometrist nahi mila');

    const tests = await this.prisma.opticalEyeTest.findMany({
      where: { tenantId: user.tenantId, optometristId: id, appointmentDate: { gte: new Date(from), lte: new Date(to) } },
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
