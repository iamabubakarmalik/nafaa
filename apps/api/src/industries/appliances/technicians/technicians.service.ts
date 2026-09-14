import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertTechnicianDto } from './dto/upsert-technician.dto';

const OPEN_SERVICE = ['REQUESTED', 'SCHEDULED', 'TECHNICIAN_ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'PENDING_PARTS'];
const OPEN_INSTALL = ['PENDING', 'SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'RESCHEDULED'];

@Injectable()
export class TechniciansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertTechnicianDto) {
    const dup = await this.prisma.applianceTechnician.findFirst({
      where: { tenantId: user.tenantId, employeeCode: dto.employeeCode },
    });
    if (dup) throw new BadRequestException(`Employee code "${dto.employeeCode}" pehle se mojood hai`);
    return this.prisma.applianceTechnician.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: {
    active?: boolean;
    zone?: string;
    category?: string;
    brand?: string;
    search?: string;
  }) {
    const techs = await this.prisma.applianceTechnician.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.zone && { currentZone: { contains: params.zone, mode: 'insensitive' } }),
        ...(params.category && { categoriesExpertise: { has: params.category as any } }),
        ...(params.brand && { brandsExpertise: { has: params.brand } }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search } },
            { employeeCode: { contains: params.search, mode: 'insensitive' } },
            { cnic: { contains: params.search } },
          ],
        }),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    if (!techs.length) return [];

    // Har technician ke sar par abhi kitna kaam hai — list me yehi sab se
    // zaroori cheez hai, warna kaam kis ko dena hai pata hi nahi chalta
    const ids = techs.map((t) => t.id);
    const [openServices, openInstalls] = await Promise.all([
      this.prisma.applianceServiceRequest.groupBy({
        by: ['technicianId'],
        where: { tenantId: user.tenantId, technicianId: { in: ids }, status: { in: OPEN_SERVICE as any } },
        _count: { _all: true },
      }),
      this.prisma.applianceInstallation.groupBy({
        by: ['technicianId'],
        where: { tenantId: user.tenantId, technicianId: { in: ids }, status: { in: OPEN_INSTALL as any } },
        _count: { _all: true },
      }),
    ]);

    const svc = new Map(openServices.map((r) => [r.technicianId, r._count._all]));
    const ins = new Map(openInstalls.map((r) => [r.technicianId, r._count._all]));

    return techs.map((t) => ({
      ...t,
      openServices: svc.get(t.id) ?? 0,
      openInstallations: ins.get(t.id) ?? 0,
      openJobs: (svc.get(t.id) ?? 0) + (ins.get(t.id) ?? 0),
      completionRate: t.totalJobs > 0 ? (t.completedJobs / t.totalJobs) * 100 : 0,
    }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.applianceTechnician.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Technician nahi mila');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [recentJobs, activeServiceRequests, recentServices, monthServices, monthInstalls] = await Promise.all([
      this.prisma.applianceInstallation.findMany({
        // tenantId ka filter zaroori hai — warna dusre tenant ka technicianId
        // dene par uska kaam bhi nazar aa sakta tha
        where: { tenantId: user.tenantId, technicianId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.applianceServiceRequest.findMany({
        where: {
          tenantId: user.tenantId,
          technicianId: id,
          status: { in: ['TECHNICIAN_ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'PENDING_PARTS'] },
        },
        orderBy: { scheduledDate: 'asc' },
      }),
      this.prisma.applianceServiceRequest.findMany({
        where: { tenantId: user.tenantId, technicianId: id },
        orderBy: { requestedAt: 'desc' },
        take: 20,
      }),
      this.prisma.applianceServiceRequest.findMany({
        where: { tenantId: user.tenantId, technicianId: id, status: 'COMPLETED', completedAt: { gte: monthStart } },
        select: { totalCharge: true, partsCharge: true, customerRating: true, completedAt: true, requestedAt: true },
      }),
      this.prisma.applianceInstallation.findMany({
        where: { tenantId: user.tenantId, technicianId: id, status: 'COMPLETED', completedAt: { gte: monthStart } },
        select: { totalCharge: true, materialsCharge: true, customerRating: true },
      }),
    ]);

    const monthRevenue =
      monthServices.reduce((s, r) => s + Number(r.totalCharge), 0) +
      monthInstalls.reduce((s, r) => s + Number(r.totalCharge), 0);
    const monthCost =
      monthServices.reduce((s, r) => s + Number(r.partsCharge), 0) +
      monthInstalls.reduce((s, r) => s + Number(r.materialsCharge), 0);
    const ratings = [...monthServices, ...monthInstalls]
      .map((r) => r.customerRating)
      .filter((x): x is number => !!x);
    const hours = monthServices
      .filter((r) => r.completedAt)
      .map((r) => (new Date(r.completedAt!).getTime() - new Date(r.requestedAt).getTime()) / 3_600_000);

    return {
      ...t,
      recentJobs,
      recentServices,
      activeServiceRequests,
      openJobs: activeServiceRequests.length + recentJobs.filter((j) => OPEN_INSTALL.includes(j.status)).length,
      completionRate: t.totalJobs > 0 ? (t.completedJobs / t.totalJobs) * 100 : 0,
      month: {
        jobs: monthServices.length + monthInstalls.length,
        revenue: monthRevenue,
        cost: monthCost,
        profit: monthRevenue - monthCost,
        commission: monthRevenue * ((Number(t.commissionPct) || 0) / 100),
        avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
        avgResolutionHours: hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : 0,
      },
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertTechnicianDto) {
    const t = await this.prisma.applianceTechnician.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Technician nahi mila');

    if (dto.employeeCode && dto.employeeCode !== t.employeeCode) {
      const dup = await this.prisma.applianceTechnician.findFirst({
        where: { tenantId: user.tenantId, employeeCode: dto.employeeCode, id: { not: id } },
      });
      if (dup) throw new BadRequestException(`Employee code "${dto.employeeCode}" pehle se mojood hai`);
    }

    return this.prisma.applianceTechnician.update({ where: { id }, data: dto });
  }

  /**
   * Technician ko band karna — record delete nahi hota kyunke purane
   * kaam, commission aur rating ka hisab isi se juda hota hai.
   */
  async remove(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.applianceTechnician.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Technician nahi mila');

    const [openSvc, openInst] = await Promise.all([
      this.prisma.applianceServiceRequest.count({
        where: { tenantId: user.tenantId, technicianId: id, status: { in: OPEN_SERVICE as any } },
      }),
      this.prisma.applianceInstallation.count({
        where: { tenantId: user.tenantId, technicianId: id, status: { in: OPEN_INSTALL as any } },
      }),
    ]);
    if (openSvc + openInst > 0) {
      throw new BadRequestException(
        `${t.name} ke paas abhi ${openSvc + openInst} kaam khula hai — pehle kisi aur ko dein`,
      );
    }

    const updated = await this.prisma.applianceTechnician.update({ where: { id }, data: { isActive: false } });
    return { ...updated, message: `${t.name} ko band kar diya gaya — purana record mehfooz hai` };
  }

  async workload(user: AuthenticatedUser, id: string, from: string, to: string) {
    const t = await this.prisma.applianceTechnician.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Technician nahi mila');

    const start = new Date(from);
    const end = new Date(to);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Tareekh sahi nahi hai');
    }
    end.setHours(23, 59, 59, 999);

    const [installations, serviceRequests] = await Promise.all([
      this.prisma.applianceInstallation.findMany({
        where: { tenantId: user.tenantId, technicianId: id, scheduledDate: { gte: start, lte: end } },
        orderBy: { scheduledDate: 'asc' },
      }),
      this.prisma.applianceServiceRequest.findMany({
        where: { tenantId: user.tenantId, technicianId: id, scheduledDate: { gte: start, lte: end } },
        orderBy: { scheduledDate: 'asc' },
      }),
    ]);

    // Din ke hisab se kaam — kaunse din bojh ziyada hai
    const byDay = new Map<string, { date: string; installations: number; services: number; revenue: number }>();
    const touch = (d: Date | null) => {
      if (!d) return null;
      const key = new Date(d).toISOString().slice(0, 10);
      const row = byDay.get(key) ?? { date: key, installations: 0, services: 0, revenue: 0 };
      byDay.set(key, row);
      return row;
    };
    for (const i of installations) {
      const row = touch(i.scheduledDate);
      if (row) { row.installations += 1; row.revenue += Number(i.totalCharge) || 0; }
    }
    for (const s of serviceRequests) {
      const row = touch(s.scheduledDate);
      if (row) { row.services += 1; row.revenue += Number(s.totalCharge) || 0; }
    }

    const revenue =
      installations.reduce((s, i) => s + Number(i.totalCharge), 0) +
      serviceRequests.reduce((s, r) => s + Number(r.totalCharge), 0);

    return {
      technician: t,
      installations,
      serviceRequests,
      byDay: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
      totals: {
        installations: installations.length,
        serviceRequests: serviceRequests.length,
        totalJobs: installations.length + serviceRequests.length,
        completed:
          installations.filter((i) => i.status === 'COMPLETED').length +
          serviceRequests.filter((r) => r.status === 'COMPLETED').length,
        revenue,
        commission: revenue * ((Number(t.commissionPct) || 0) / 100),
      },
    };
  }

  async topPerformers(user: AuthenticatedUser, limit = 10) {
    return this.prisma.applianceTechnician.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalRevenue: 'desc' },
      take: limit,
    });
  }

  /** Team ki ek nazar me haalat — page ke KPI cards ke liye. */
  async summary(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [techs, openSvc, openInst, monthSvc, monthInst] = await Promise.all([
      this.prisma.applianceTechnician.findMany({
        where: { tenantId },
        select: {
          id: true, name: true, isActive: true, avgRating: true, totalReviews: true,
          totalJobs: true, completedJobs: true, totalRevenue: true, totalCommission: true,
          commissionPct: true, currentZone: true, specializations: true,
        },
      }),
      this.prisma.applianceServiceRequest.groupBy({
        by: ['technicianId'],
        where: { tenantId, status: { in: OPEN_SERVICE as any } },
        _count: { _all: true },
      }),
      this.prisma.applianceInstallation.groupBy({
        by: ['technicianId'],
        where: { tenantId, status: { in: OPEN_INSTALL as any } },
        _count: { _all: true },
      }),
      this.prisma.applianceServiceRequest.findMany({
        where: { tenantId, status: 'COMPLETED', completedAt: { gte: monthStart } },
        select: { technicianId: true, totalCharge: true, customerRating: true },
      }),
      this.prisma.applianceInstallation.findMany({
        where: { tenantId, status: 'COMPLETED', completedAt: { gte: monthStart } },
        select: { technicianId: true, totalCharge: true, customerRating: true },
      }),
    ]);

    const svcOpen = new Map(openSvc.map((r) => [r.technicianId, r._count._all]));
    const instOpen = new Map(openInst.map((r) => [r.technicianId, r._count._all]));

    const monthByTech = new Map<string, { jobs: number; revenue: number }>();
    for (const r of [...monthSvc, ...monthInst]) {
      if (!r.technicianId) continue;
      const row = monthByTech.get(r.technicianId) ?? { jobs: 0, revenue: 0 };
      row.jobs += 1; row.revenue += Number(r.totalCharge) || 0;
      monthByTech.set(r.technicianId, row);
    }

    const rows = techs.map((t) => {
      const m = monthByTech.get(t.id) ?? { jobs: 0, revenue: 0 };
      return {
        id: t.id,
        name: t.name,
        isActive: t.isActive,
        zone: t.currentZone,
        avgRating: t.avgRating,
        totalReviews: t.totalReviews,
        openJobs: (svcOpen.get(t.id) ?? 0) + (instOpen.get(t.id) ?? 0),
        monthJobs: m.jobs,
        monthRevenue: m.revenue,
        monthCommission: m.revenue * ((Number(t.commissionPct) || 0) / 100),
        lifetimeRevenue: Number(t.totalRevenue) || 0,
        completionRate: t.totalJobs > 0 ? (t.completedJobs / t.totalJobs) * 100 : 0,
      };
    });

    const ratings = techs.map((t) => t.avgRating).filter((x): x is number => typeof x === 'number' && x > 0);
    const monthRevenue = [...monthByTech.values()].reduce((s, r) => s + r.revenue, 0);

    return {
      total: techs.length,
      active: techs.filter((t) => t.isActive).length,
      inactive: techs.filter((t) => !t.isActive).length,
      /** Jo abhi khali hai — naya kaam inhe do */
      free: rows.filter((r) => r.isActive && r.openJobs === 0).length,
      /** 5 se ziyada khula kaam = bojh ziyada */
      overloaded: rows.filter((r) => r.openJobs > 5).length,
      openJobs: rows.reduce((s, r) => s + r.openJobs, 0),
      avgTeamRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
      month: {
        jobs: [...monthByTech.values()].reduce((s, r) => s + r.jobs, 0),
        revenue: monthRevenue,
        commission: rows.reduce((s, r) => s + r.monthCommission, 0),
      },
      leaderboard: rows.sort((a, b) => b.monthRevenue - a.monthRevenue),
    };
  }
}
