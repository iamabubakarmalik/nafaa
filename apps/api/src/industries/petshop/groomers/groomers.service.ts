/**
 * Groomers: the people who bathe and trim pets. Each has working days and
 * hours (for open slots) and a commission rate. Groomers are switched off,
 * never deleted, so their past visits keep their name.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PetSpeciesType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpdateGroomerDto, UpsertGroomerDto } from './dto/upsert-groomer.dto';
import { cleanInput, dayEnd, dayKey, dayRange, dayStart, weekdayInTz } from '../petshop-common';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

@Injectable()
export class GroomersService {
  constructor(private readonly prisma: PrismaService) {}

  private async codeFree(tenantId: string, code: string, notId?: string) {
    const dup = await this.prisma.petGroomer.findFirst({ where: { tenantId, employeeCode: code, ...(notId && { id: { not: notId } }) }, select: { id: true } });
    if (dup) throw new BadRequestException(`Code "${code}" pehle se kisi aur groomer ka hai`);
  }

  private checkHours(start?: string, end?: string) {
    if (start && end && start >= end) throw new BadRequestException('Chhutti ka waqt shuru se baad ho');
  }

  async create(user: AuthenticatedUser, dto: UpsertGroomerDto) {
    await this.codeFree(user.tenantId, dto.employeeCode.trim());
    this.checkHours(dto.workStartTime, dto.workEndTime);
    return this.prisma.petGroomer.create({ data: { ...cleanInput(dto), employeeCode: dto.employeeCode.trim(), tenantId: user.tenantId } });
  }

  async list(user: AuthenticatedUser, params: { active?: boolean; availableToday?: boolean; species?: string; search?: string }) {
    const species = params.species && (Object.values(PetSpeciesType) as string[]).includes(params.species) ? (params.species as PetSpeciesType) : undefined;
    return this.prisma.petGroomer.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.availableToday && { isActive: true, workingDays: { has: weekdayInTz(new Date()) } }),
        ...(species && { specializations: { has: species } }),
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
    const scope = { tenantId: user.tenantId, groomerId: id };
    const [todayAppointments, upcoming, recent] = await Promise.all([
      this.prisma.petGroomingAppointment.findMany({ where: { ...scope, scheduledDate: { gte: dayStart(), lte: dayEnd() } }, orderBy: [{ scheduledDate: 'asc' }, { scheduledSlot: 'asc' }] }),
      this.prisma.petGroomingAppointment.findMany({ where: { ...scope, scheduledDate: { gt: dayEnd() }, status: { in: ['SCHEDULED', 'CONFIRMED'] } }, orderBy: { scheduledDate: 'asc' }, take: 20 }),
      this.prisma.petGroomingAppointment.findMany({ where: { ...scope, status: 'COMPLETED' }, orderBy: { completedAt: 'desc' }, take: 15 }),
    ]);
    return { ...g, todayAppointments, upcoming, recentCompleted: recent };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateGroomerDto) {
    const g = await this.prisma.petGroomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!g) throw new NotFoundException('Groomer not found');
    if (dto.employeeCode !== undefined) await this.codeFree(user.tenantId, dto.employeeCode.trim(), id);
    this.checkHours(dto.workStartTime ?? g.workStartTime, dto.workEndTime ?? g.workEndTime);
    // Counters kept by visits are not form fields.
    const data = cleanInput(dto);
    for (const k of ['completedAppointments', 'totalRevenue', 'avgRating']) delete data[k];
    return this.prisma.petGroomer.update({ where: { id }, data });
  }

  /** DELETE keeps its route but switches the groomer off; past visits stay. */
  async remove(user: AuthenticatedUser, id: string) {
    const g = await this.prisma.petGroomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!g) throw new NotFoundException('Groomer not found');
    return this.prisma.petGroomer.update({ where: { id }, data: { isActive: false } });
  }

  /**
   * Visits, money and commission for a period on shop days (`yyyy-mm-dd`).
   * Money counts visits that are ready or picked up.
   */
  async workload(user: AuthenticatedUser, id: string, from?: string, to?: string) {
    const g = await this.prisma.petGroomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!g) throw new NotFoundException('Groomer not found');
    const range = dayRange(from, to) ?? { gte: dayStart(dayKey().slice(0, 8) + '01'), lte: dayEnd() };

    const appointments = await this.prisma.petGroomingAppointment.findMany({
      where: { tenantId: user.tenantId, groomerId: id, scheduledDate: range },
      orderBy: { scheduledDate: 'asc' },
      take: 1000,
    });
    const completed = appointments.filter((a) => ['COMPLETED', 'READY_FOR_PICKUP'].includes(a.status));
    const revenue = r2(completed.reduce((s, a) => s + a.totalFee, 0));
    return {
      groomer: g,
      appointments,
      totals: {
        total: appointments.length,
        completed: completed.length,
        cancelled: appointments.filter((a) => a.status === 'CANCELLED').length,
        noShow: appointments.filter((a) => a.status === 'NO_SHOW').length,
        revenue,
        commission: r2((revenue * g.commissionPct) / 100),
      },
    };
  }

  async topPerformers(user: AuthenticatedUser, limit = 10) {
    return this.prisma.petGroomer.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalRevenue: 'desc' },
      take: Math.min(Math.max(Number(limit) || 10, 1), 50),
    });
  }
}
