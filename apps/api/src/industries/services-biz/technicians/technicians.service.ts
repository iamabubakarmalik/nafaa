/**
 * Technician profiles on top of HR staff: skills, level, working hours,
 * areas, live status and pay terms (commission per job), plus their open
 * jobs and performance from billed jobs.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ServiceBusinessType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { hourInTz, tzParts, weekdayInTz } from '../../../common/helpers/business-time.helper';
import { OPEN, dayRange, r2 } from '../jobs/job-rules';
import { TechnicianSkillDto, UpsertTechnicianDto } from './dto/technician.dto';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class TechniciansService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertTechnicianDto) {
    const staff = await this.prisma.staff.findFirst({ where: { id: dto.staffId, tenantId: user.tenantId }, select: { id: true } });
    if (!staff) throw new NotFoundException('Staff nahi mila — pehle HR → Staff me banda jorein');
    if (dto.workStartTime && dto.workEndTime && dto.workEndTime <= dto.workStartTime) throw new BadRequestException('Chhutti ka waqt aane ke waqt ke baad rakhein');
    const { staffId, licenseExpiryDate, ...rest } = dto;
    const data = {
      ...rest,
      ...(licenseExpiryDate !== undefined && { licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate) : null }),
    };
    const existing = await this.prisma.serviceTechnicianProfile.findUnique({ where: { staffId } });
    if (existing && existing.tenantId !== user.tenantId) throw new NotFoundException('Staff nahi mila');
    if (existing) return this.prisma.serviceTechnicianProfile.update({ where: { staffId }, data: { ...data, isActive: dto.isActive ?? true } });
    return this.prisma.serviceTechnicianProfile.create({ data: { ...data, staffId, tenantId: user.tenantId } });
  }

  /** Active technicians with their staff record, open jobs and this month's billed work. */
  async list(user: AuthenticatedUser, params: { status?: string; primarySkill?: string; level?: string; search?: string }) {
    const profiles = await this.prisma.serviceTechnicianProfile.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.status && { status: params.status as Prisma.ServiceTechnicianProfileWhereInput['status'] }),
        ...(params.primarySkill && { primarySkill: params.primarySkill as Prisma.ServiceTechnicianProfileWhereInput['primarySkill'] }),
        ...(params.level && { level: params.level as Prisma.ServiceTechnicianProfileWhereInput['level'] }),
      },
      include: { services: true },
      orderBy: { updatedAt: 'desc' },
    });
    const staffIds = profiles.map((p) => p.staffId);
    const s = params.search?.trim();
    const [staffs, open] = await Promise.all([
      this.prisma.staff.findMany({
        where: {
          tenantId: user.tenantId,
          id: { in: staffIds },
          ...(s && {
            OR: [
              { fullName: { contains: s, mode: 'insensitive' as const } },
              { staffNumber: { contains: s, mode: 'insensitive' as const } },
              { phone: { contains: s } },
            ],
          }),
        },
        select: { id: true, fullName: true, phone: true, staffNumber: true, email: true, status: true },
      }),
      staffIds.length
        ? this.prisma.serviceJob.groupBy({ by: ['primaryTechnicianId'], where: { tenantId: user.tenantId, primaryTechnicianId: { in: staffIds }, status: { in: OPEN } }, _count: { _all: true } })
        : [],
    ]);
    const staffMap = new Map(staffs.map((x) => [x.id, x]));
    const openOf = new Map(open.map((o) => [o.primaryTechnicianId, o._count._all]));
    return profiles
      .filter((p) => staffMap.has(p.staffId))
      .map((p) => ({ ...p, staff: staffMap.get(p.staffId), openJobs: openOf.get(p.staffId) ?? 0 }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.serviceTechnicianProfile.findFirst({ where: { id, tenantId: user.tenantId }, include: { services: true } });
    if (!p) throw new NotFoundException('Technician nahi mila');
    const [staff, services, openJobs] = await Promise.all([
      this.prisma.staff.findFirst({ where: { id: p.staffId, tenantId: user.tenantId } }),
      this.prisma.serviceCatalog.findMany({ where: { tenantId: user.tenantId, id: { in: p.services.map((x) => x.serviceId) } } }),
      this.prisma.serviceJob.findMany({
        where: { tenantId: user.tenantId, primaryTechnicianId: p.staffId, status: { in: OPEN } },
        orderBy: { scheduledStart: { sort: 'asc', nulls: 'last' } },
        take: 20,
        select: { id: true, jobNumber: true, serviceName: true, customerName: true, status: true, priority: true, scheduledStart: true, area: true },
      }),
    ]);
    const svcMap = new Map(services.map((x) => [x.id, x]));
    return { ...p, staff, openJobs, services: p.services.map((sv) => ({ ...sv, service: svcMap.get(sv.serviceId) })) };
  }

  async byStaffId(user: AuthenticatedUser, staffId: string) {
    const profile = await this.prisma.serviceTechnicianProfile.findFirst({ where: { staffId, tenantId: user.tenantId }, include: { services: true } });
    if (!profile) return null;
    const staff = await this.prisma.staff.findFirst({ where: { id: staffId, tenantId: user.tenantId } });
    return { ...profile, staff };
  }

  async assignSkills(user: AuthenticatedUser, technicianId: string, skills: TechnicianSkillDto[]) {
    const p = await this.prisma.serviceTechnicianProfile.findFirst({ where: { id: technicianId, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Technician nahi mila');
    const ids = [...new Set(skills.map((s) => s.serviceId))];
    if (ids.length && (await this.prisma.serviceCatalog.count({ where: { tenantId: user.tenantId, id: { in: ids } } })) !== ids.length) {
      throw new NotFoundException('Kuch services nahi milin');
    }
    // The skill list is replaced as a whole; it is setup data, not a business record.
    await this.prisma.$transaction(async (tx) => {
      await tx.serviceTechnicianSkill.deleteMany({ where: { technicianId } });
      if (skills.length) {
        await tx.serviceTechnicianSkill.createMany({
          data: skills.map((s) => ({
            technicianId, serviceId: s.serviceId, skillLevel: s.skillLevel ?? 'JUNIOR', isPrimary: s.isPrimary ?? false,
            customRate: s.customRate, customDuration: s.customDuration,
          })),
          skipDuplicates: true,
        });
      }
    });
    return this.prisma.serviceTechnicianSkill.findMany({ where: { technicianId } });
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: Prisma.ServiceTechnicianProfileUpdateInput['status']) {
    const p = await this.prisma.serviceTechnicianProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Technician nahi mila');
    return this.prisma.serviceTechnicianProfile.update({ where: { id }, data: { status } });
  }

  async updateLocation(user: AuthenticatedUser, id: string, lat: number, lng: number) {
    const p = await this.prisma.serviceTechnicianProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Technician nahi mila');
    return this.prisma.serviceTechnicianProfile.update({ where: { id }, data: { currentLat: lat, currentLng: lng, lastLocationAt: new Date() } });
  }

  /** Free technicians on duty right now (shop time). */
  async availableNow(user: AuthenticatedUser, businessType?: string, city?: string) {
    const now = new Date();
    const p = tzParts(now);
    const currentTime = `${String(hourInTz(now)).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
    const profiles = await this.prisma.serviceTechnicianProfile.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        status: 'AVAILABLE',
        workingDays: { has: weekdayInTz(now) },
        workStartTime: { lte: currentTime },
        workEndTime: { gte: currentTime },
        ...(businessType && {
          OR: [
            { primarySkill: businessType as ServiceBusinessType },
            { secondarySkills: { has: businessType as ServiceBusinessType } },
          ],
        }),
        ...(city && { serviceAreas: { has: city } }),
      },
      include: { services: true },
      orderBy: { updatedAt: 'desc' },
    });
    const staffs = await this.prisma.staff.findMany({ where: { tenantId: user.tenantId, id: { in: profiles.map((x) => x.staffId) } } });
    const staffMap = new Map(staffs.map((x) => [x.id, x]));
    return profiles.map((x) => ({ ...x, staff: staffMap.get(x.staffId) }));
  }

  /** A technician's day (YYYY-MM-DD, shop time): working hours and booked jobs. */
  async availability(user: AuthenticatedUser, id: string, date: string) {
    if (!DAY.test(date ?? '')) throw new BadRequestException('Date YYYY-MM-DD likhein');
    const profile = await this.prisma.serviceTechnicianProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!profile) throw new NotFoundException('Technician nahi mila');
    const range = dayRange(date, date);
    const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (!profile.workingDays.includes(dayOfWeek)) return { available: false, reason: 'Chhutti ka din', jobs: [] };
    const jobs = await this.prisma.serviceJob.findMany({
      where: { tenantId: user.tenantId, primaryTechnicianId: profile.staffId, scheduledStart: range, status: { in: OPEN } },
      orderBy: { scheduledStart: 'asc' },
    });
    return {
      available: true,
      workingHours: { start: profile.workStartTime, end: profile.workEndTime },
      breakHours: profile.breakStartTime ? { start: profile.breakStartTime, end: profile.breakEndTime } : null,
      currentStatus: profile.status,
      jobs: jobs.map((j) => ({ jobId: j.id, jobNumber: j.jobNumber, serviceName: j.serviceName, start: j.scheduledStart, end: j.scheduledEnd, status: j.status, priority: j.priority })),
    };
  }

  /** Switches the technician off; their jobs and history stay. */
  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.serviceTechnicianProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Technician nahi mila');
    return this.prisma.serviceTechnicianProfile.update({ where: { id }, data: { isActive: false, status: 'UNAVAILABLE' } });
  }

  /** Billed, cancelled and rated jobs of one technician in a period of shop days. */
  async performance(user: AuthenticatedUser, id: string, from?: string, to?: string) {
    const p = await this.prisma.serviceTechnicianProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Technician nahi mila');
    const where: Prisma.ServiceJobWhereInput = { tenantId: user.tenantId, primaryTechnicianId: p.staffId };
    const range = from && to && DAY.test(from) && DAY.test(to) ? dayRange(from, to) : undefined;
    const done = { ...where, status: 'COMPLETED' as const, ...(range && { completedAt: range }) };
    const [completed, cancelled, revenue, avgRating] = await Promise.all([
      this.prisma.serviceJob.count({ where: done }),
      this.prisma.serviceJob.count({ where: { ...where, status: 'CANCELLED', ...(range && { cancelledAt: range }) } }),
      this.prisma.serviceJob.aggregate({ where: done, _sum: { totalCharge: true, paidAmount: true } }),
      this.prisma.serviceJob.aggregate({ where: { ...done, customerRating: { not: null } }, _avg: { customerRating: true } }),
    ]);
    return {
      completed,
      cancelled,
      completionRate: completed + cancelled > 0 ? Math.round((completed / (completed + cancelled)) * 100) : 0,
      totalRevenue: r2(revenue._sum.totalCharge ?? 0),
      totalCollected: r2(revenue._sum.paidAmount ?? 0),
      avgRating: avgRating._avg.customerRating ?? 0,
    };
  }
}
