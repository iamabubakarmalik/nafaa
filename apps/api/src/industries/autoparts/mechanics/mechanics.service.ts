import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { startOfMonthTz } from '../../../common/helpers/business-time.helper';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class MechanicsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: any) {
    const staffId = typeof dto?.staffId === 'string' ? dto.staffId : '';
    const staff = staffId ? await this.prisma.staff.findFirst({ where: { id: staffId, tenantId: user.tenantId } }) : null;
    if (!staff) throw new NotFoundException('Staff nahi mila');

    // The body is untyped: only the profile fields the form edits may reach the row.
    const num = (v: unknown) => (v === '' || v === null || v === undefined || !Number.isFinite(Number(v)) ? undefined : Number(v));
    const list = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : undefined);
    const text = (v: unknown) => (typeof v === 'string' ? v : undefined);
    const yearsOfExperience = num(dto.yearsOfExperience);
    const data = {
      specialization: list(dto.specialization),
      certifications: list(dto.certifications),
      yearsOfExperience: yearsOfExperience === undefined ? undefined : Math.round(yearsOfExperience),
      bio: text(dto.bio),
      photoUrl: text(dto.photoUrl),
      hourlyRate: num(dto.hourlyRate),
      commissionPct: num(dto.commissionPct),
      workStartTime: text(dto.workStartTime),
      workEndTime: text(dto.workEndTime),
      isAvailable: typeof dto.isAvailable === 'boolean' ? dto.isAvailable : undefined,
    };
    if ((data.hourlyRate ?? 0) < 0 || (data.commissionPct ?? 0) < 0 || (data.commissionPct ?? 0) > 100) {
      throw new BadRequestException('Rate ya commission sahi likhein');
    }

    const existing = await this.prisma.mechanicProfile.findUnique({ where: { staffId } });
    if (existing) {
      if (existing.tenantId !== user.tenantId) throw new NotFoundException('Staff nahi mila');
      return this.prisma.mechanicProfile.update({ where: { staffId }, data: { ...data, isActive: true } });
    }
    return this.prisma.mechanicProfile.create({ data: { ...data, staffId, tenantId: user.tenantId } });
  }

  async list(user: AuthenticatedUser, params: { available?: boolean; search?: string }) {
    const profiles = await this.prisma.mechanicProfile.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.available !== undefined && { isAvailable: params.available }),
      },
      orderBy: { updatedAt: 'desc' },
    });

    const staffIds = profiles.map((p) => p.staffId);
    const staffs = await this.prisma.staff.findMany({
      where: {
        tenantId: user.tenantId,
        id: { in: staffIds },
        ...(params.search && { OR: [{ fullName: { contains: params.search, mode: 'insensitive' } }, { phone: { contains: params.search } }] }),
      },
    });
    const staffMap = new Map(staffs.map((s) => [s.id, s]));
    const kept = profiles.filter((p) => staffMap.has(p.staffId));
    const ids = kept.map((p) => p.id);
    const month = startOfMonthTz();
    const [open, labour, done] = ids.length ? await Promise.all([
      this.prisma.workshopJob.groupBy({ by: ['primaryMechanicId'], where: { tenantId: user.tenantId, primaryMechanicId: { in: ids }, status: { notIn: ['DELIVERED', 'CANCELLED'] } }, _count: { _all: true } }),
      this.prisma.workshopJobLabor.groupBy({ by: ['mechanicId'], where: { mechanicId: { in: ids }, job: { tenantId: user.tenantId, status: 'DELIVERED', deliveredAt: { gte: month } } }, _sum: { total: true, hours: true } }),
      this.prisma.workshopJob.groupBy({ by: ['primaryMechanicId'], where: { tenantId: user.tenantId, primaryMechanicId: { in: ids }, status: 'DELIVERED', deliveredAt: { gte: month } }, _count: { _all: true } }),
    ]) : [[], [], []];
    const openOf = new Map(open.map((o) => [o.primaryMechanicId, o._count._all]));
    const doneOf = new Map(done.map((o) => [o.primaryMechanicId, o._count._all]));
    const labourOf = new Map(labour.map((l) => [l.mechanicId, l._sum]));
    return kept.map((p) => {
      const l = labourOf.get(p.id);
      const monthLabour = Math.round(Number(l?.total ?? 0) * 100) / 100;
      return {
        ...p, staff: staffMap.get(p.staffId),
        openJobs: openOf.get(p.id) ?? 0, monthJobs: doneOf.get(p.id) ?? 0, monthLabour, monthHours: Number(l?.hours ?? 0),
        monthCommission: Math.round(monthLabour * (p.commissionPct || 0)) / 100,
      };
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.mechanicProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Mechanic not found');
    const staff = await this.prisma.staff.findFirst({ where: { id: p.staffId, tenantId: user.tenantId } });

    // Current active jobs
    const activeJobs = await this.prisma.workshopJob.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [{ primaryMechanicId: p.id }, { assistantMechanicIds: { has: p.id } }],
        status: { in: ['APPROVED', 'IN_PROGRESS', 'WAITING_PARTS'] },
      },
      take: 10,
      orderBy: { promisedAt: 'asc' },
    });

    return { ...p, staff, activeJobs };
  }

  async byStaff(user: AuthenticatedUser, staffId: string) {
    return this.prisma.mechanicProfile.findFirst({ where: { staffId, tenantId: user.tenantId } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.mechanicProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Mechanic not found');
    return this.prisma.mechanicProfile.update({ where: { id }, data: { isActive: false } });
  }

  async toggleAvailability(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.mechanicProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Mechanic not found');
    return this.prisma.mechanicProfile.update({ where: { id }, data: { isAvailable: !p.isAvailable } });
  }
}
