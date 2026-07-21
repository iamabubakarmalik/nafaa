import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class TechniciansService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: any) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: dto.staffId, tenantId: user.tenantId },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const existing = await this.prisma.serviceTechnicianProfile.findUnique({
      where: { staffId: dto.staffId },
    });

    if (existing) {
      return this.prisma.serviceTechnicianProfile.update({
        where: { staffId: dto.staffId },
        data: {
          ...dto,
          licenseExpiryDate: dto.licenseExpiryDate
            ? new Date(dto.licenseExpiryDate)
            : undefined,
        },
      });
    }

    return this.prisma.serviceTechnicianProfile.create({
      data: {
        ...dto,
        tenantId: user.tenantId,
        licenseExpiryDate: dto.licenseExpiryDate
          ? new Date(dto.licenseExpiryDate)
          : null,
      },
    });
  }

  async list(
    user: AuthenticatedUser,
    params: { status?: string; primarySkill?: string; level?: string; search?: string },
  ) {
    const profiles = await this.prisma.serviceTechnicianProfile.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.status && { status: params.status as any }),
        ...(params.primarySkill && { primarySkill: params.primarySkill as any }),
        ...(params.level && { level: params.level as any }),
      },
      include: { services: true },
      orderBy: { updatedAt: 'desc' },
    });

    const staffIds = profiles.map((p) => p.staffId);
    const staffs = await this.prisma.staff.findMany({
      where: {
        id: { in: staffIds },
        ...(params.search && {
          OR: [
            { fullName: { contains: params.search, mode: 'insensitive' as const } },
            { staffNumber: { contains: params.search, mode: 'insensitive' as const } },
            { phone: { contains: params.search } },
            { email: { contains: params.search, mode: 'insensitive' as const } },
          ],
        }),
      },
    });
    const staffMap = new Map(staffs.map((s) => [s.id, s]));

    return profiles
      .filter((p) => staffMap.has(p.staffId))
      .map((p) => ({ ...p, staff: staffMap.get(p.staffId) }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.serviceTechnicianProfile.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { services: true },
    });
    if (!p) throw new NotFoundException('Technician not found');

    const staff = await this.prisma.staff.findUnique({ where: { id: p.staffId } });

    const serviceIds = p.services.map((s) => s.serviceId);
    const services = await this.prisma.serviceCatalog.findMany({
      where: { id: { in: serviceIds } },
    });
    const svcMap = new Map(services.map((s) => [s.id, s]));

    return {
      ...p,
      staff,
      services: p.services.map((sv) => ({
        ...sv,
        service: svcMap.get(sv.serviceId),
      })),
    };
  }

  async byStaffId(user: AuthenticatedUser, staffId: string) {
    const profile = await this.prisma.serviceTechnicianProfile.findFirst({
      where: { staffId, tenantId: user.tenantId },
      include: { services: true },
    });
    if (!profile) return null;

    const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });
    return { ...profile, staff };
  }

  async assignSkills(user: AuthenticatedUser, technicianId: string, skills: any[]) {
    const p = await this.prisma.serviceTechnicianProfile.findFirst({
      where: { id: technicianId, tenantId: user.tenantId },
    });
    if (!p) throw new NotFoundException('Technician not found');

    await this.prisma.serviceTechnicianSkill.deleteMany({ where: { technicianId } });

    if (skills.length > 0) {
      await this.prisma.serviceTechnicianSkill.createMany({
        data: skills.map((s) => ({
          technicianId,
          serviceId: s.serviceId,
          skillLevel: s.skillLevel ?? 'JUNIOR',
          isPrimary: s.isPrimary ?? false,
          customRate: s.customRate,
          customDuration: s.customDuration,
          certifiedAt: s.certifiedAt ? new Date(s.certifiedAt) : null,
          certifiedBy: s.certifiedBy,
        })),
      });
    }

    return this.prisma.serviceTechnicianSkill.findMany({ where: { technicianId } });
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string) {
    const p = await this.prisma.serviceTechnicianProfile.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!p) throw new NotFoundException('Technician not found');

    return this.prisma.serviceTechnicianProfile.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async updateLocation(user: AuthenticatedUser, id: string, lat: number, lng: number) {
    const p = await this.prisma.serviceTechnicianProfile.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!p) throw new NotFoundException('Technician not found');

    return this.prisma.serviceTechnicianProfile.update({
      where: { id },
      data: { currentLat: lat, currentLng: lng, lastLocationAt: new Date() },
    });
  }

  async availableNow(user: AuthenticatedUser, businessType?: string, city?: string) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    const profiles = await this.prisma.serviceTechnicianProfile.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        status: 'AVAILABLE',
        workingDays: { has: dayOfWeek },
        workStartTime: { lte: currentTime },
        workEndTime: { gte: currentTime },
        ...(businessType && {
          OR: [
            { primarySkill: businessType as any },
            { secondarySkills: { has: businessType as any } },
          ],
        }),
        ...(city && { serviceAreas: { has: city } }),
      },
      include: { services: true },
      orderBy: { updatedAt: 'desc' },
    });

    const staffIds = profiles.map((p) => p.staffId);
    const staffs = await this.prisma.staff.findMany({ where: { id: { in: staffIds } } });
    const staffMap = new Map(staffs.map((s) => [s.id, s]));

    return profiles.map((p) => ({ ...p, staff: staffMap.get(p.staffId) }));
  }

  async availability(user: AuthenticatedUser, id: string, date: string) {
    const profile = await this.prisma.serviceTechnicianProfile.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!profile) throw new NotFoundException('Technician not found');

    const dayOfWeek = new Date(date).getDay();
    const isWorking = profile.workingDays.includes(dayOfWeek);
    if (!isWorking) {
      return { available: false, reason: 'Off day', jobs: [] };
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const jobs = await this.prisma.serviceJob.findMany({
      where: {
        tenantId: user.tenantId,
        primaryTechnicianId: profile.staffId,
        scheduledStart: { gte: dayStart, lte: dayEnd },
        status: {
          in: [
            'CONFIRMED',
            'SCHEDULED',
            'ASSIGNED',
            'DISPATCHED',
            'EN_ROUTE',
            'ARRIVED',
            'IN_PROGRESS',
          ],
        },
      },
      orderBy: { scheduledStart: 'asc' },
    });

    return {
      available: true,
      workingHours: { start: profile.workStartTime, end: profile.workEndTime },
      breakHours: profile.breakStartTime
        ? { start: profile.breakStartTime, end: profile.breakEndTime }
        : null,
      currentStatus: profile.status,
      jobs: jobs.map((j) => ({
        jobId: j.id,
        jobNumber: j.jobNumber,
        serviceName: j.serviceName,
        start: j.scheduledStart,
        end: j.scheduledEnd,
        status: j.status,
        priority: j.priority,
      })),
    };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.serviceTechnicianProfile.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!p) throw new NotFoundException('Technician not found');

    return this.prisma.serviceTechnicianProfile.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async performance(user: AuthenticatedUser, id: string, from?: string, to?: string) {
    const p = await this.prisma.serviceTechnicianProfile.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!p) throw new NotFoundException('Technician not found');

    const where: any = { tenantId: user.tenantId, primaryTechnicianId: p.staffId };
    if (from || to) {
      where.completedAt = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      };
    }

    const [completed, cancelled, revenue, avgRating] = await Promise.all([
      this.prisma.serviceJob.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.serviceJob.count({ where: { ...where, status: 'CANCELLED' } }),
      this.prisma.serviceJob.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { totalCharge: true, paidAmount: true },
      }),
      this.prisma.serviceJob.aggregate({
        where: { ...where, customerRating: { not: null } },
        _avg: { customerRating: true },
      }),
    ]);

    const completionRate =
      completed + cancelled > 0
        ? Math.round((completed / (completed + cancelled)) * 100)
        : 0;

    return {
      completed,
      cancelled,
      completionRate,
      totalRevenue: revenue._sum.totalCharge ?? 0,
      totalCollected: revenue._sum.paidAmount ?? 0,
      avgRating: avgRating._avg.customerRating ?? 0,
    };
  }
}
