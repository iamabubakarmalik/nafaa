import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
        id: { in: staffIds },
        ...(params.search && { OR: [{ firstName: { contains: params.search, mode: 'insensitive' } }, { lastName: { contains: params.search, mode: 'insensitive' } }] } as any),
      } as any,
    });
    const staffMap = new Map(staffs.map((s) => [s.id, s]));
    return profiles.filter((p) => staffMap.has(p.staffId)).map((p) => ({ ...p, staff: staffMap.get(p.staffId) }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.mechanicProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Mechanic not found');
    const staff = await this.prisma.staff.findUnique({ where: { id: p.staffId } });

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
