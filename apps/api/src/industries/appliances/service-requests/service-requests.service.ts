import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApplianceServiceStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import {
  AddServicePaymentDto,
  CompleteServiceDto,
  CreateServiceRequestDto,
  UpdateServiceRequestDto,
  UpdateServiceStatusDto,
} from './dto/create-service-request.dto';

/** Jin halaton me kaam abhi chal raha hai — band nahi hua */
const OPEN_STATES: ApplianceServiceStatus[] = [
  'REQUESTED', 'SCHEDULED', 'TECHNICIAN_ASSIGNED',
  'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'PENDING_PARTS',
];

/** Queue me pehle kaunsa kaam — urgent sab se upar */
const PRIORITY_RANK: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
const STATUS_RANK: Record<string, number> = {
  ON_SITE: 0, IN_PROGRESS: 1, EN_ROUTE: 2, TECHNICIAN_ASSIGNED: 3,
  SCHEDULED: 4, PENDING_PARTS: 5, REQUESTED: 6,
  UNRESOLVED: 7, COMPLETED: 8, CANCELLED: 9,
};

@Injectable()
export class ServiceRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Agla request number.
   *
   * Pehle `count() + 1` chalta tha — agar koi purana request delete ho jaye
   * to wohi number dobara ban jata tha aur `[tenantId, requestNumber]` ka
   * unique constraint tut kar 500 de deta tha. Ab sab se bara mojooda
   * number dekh kar uske aage barhte hain.
   */
  private async nextNumber(tenantId: string) {
    const year = new Date().getFullYear();
    const prefix = `SR-${year}-`;
    const last = await this.prisma.applianceServiceRequest.findFirst({
      where: { tenantId, requestNumber: { startsWith: prefix } },
      orderBy: { requestNumber: 'desc' },
      select: { requestNumber: true },
    });
    const seq = last ? Number(last.requestNumber.slice(prefix.length)) || 0 : 0;
    return `${prefix}${String(seq + 1).padStart(4, '0')}`;
  }

  async create(user: AuthenticatedUser, dto: CreateServiceRequestDto) {
    let technicianName: string | undefined;
    let technicianPhone: string | undefined;
    if (dto.technicianId) {
      const tech = await this.prisma.applianceTechnician.findFirst({
        where: { id: dto.technicianId, tenantId: user.tenantId },
      });
      if (!tech) throw new NotFoundException('Technician nahi mila');
      technicianName = tech.name;
      technicianPhone = tech.phone;
    }

    if (dto.amcContractNumber) {
      const amc = await this.prisma.applianceAmcContract.findFirst({
        where: { tenantId: user.tenantId, contractNumber: dto.amcContractNumber, status: 'ACTIVE' },
      });
      if (!amc) throw new BadRequestException('AMC contract nahi mila ya band hai');
      if (amc.freeVisitsUsed >= amc.freeVisitsAllowed) {
        throw new BadRequestException('Is AMC ki saari free visits istemal ho chuki hain');
      }
    }

    const requestNumber = await this.nextNumber(user.tenantId);

    return this.prisma.applianceServiceRequest.create({
      data: {
        tenantId: user.tenantId,
        requestNumber,
        ...dto,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        technicianName,
        technicianPhone,
        status: dto.technicianId ? 'TECHNICIAN_ASSIGNED' : dto.scheduledDate ? 'SCHEDULED' : 'REQUESTED',
        createdById: user.id,
      },
    });
  }

  async list(user: AuthenticatedUser, params: {
    status?: string;
    open?: boolean;
    serviceType?: string;
    technicianId?: string;
    customerId?: string;
    priority?: string;
    coveredUnderWarranty?: boolean;
    coveredUnderAmc?: boolean;
    unpaidOnly?: boolean;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(params.limit) || 50));

    const where: any = {
      tenantId: user.tenantId,
      ...(params.status && { status: params.status as any }),
      ...(params.open && { status: { in: OPEN_STATES } }),
      ...(params.serviceType && { serviceType: params.serviceType as any }),
      ...(params.technicianId && { technicianId: params.technicianId }),
      ...(params.customerId && { customerId: params.customerId }),
      ...(params.priority && { priority: params.priority }),
      ...(params.coveredUnderWarranty !== undefined && { coveredUnderWarranty: params.coveredUnderWarranty }),
      ...(params.coveredUnderAmc !== undefined && { coveredUnderAmc: params.coveredUnderAmc }),
      ...(params.from || params.to
        ? {
            requestedAt: {
              ...(params.from && { gte: new Date(params.from) }),
              ...(params.to && { lte: (() => { const d = new Date(params.to!); d.setHours(23, 59, 59, 999); return d; })() }),
            },
          }
        : {}),
      ...(params.search && {
        OR: [
          { requestNumber: { contains: params.search, mode: 'insensitive' } },
          { customerName: { contains: params.search, mode: 'insensitive' } },
          { customerPhone: { contains: params.search } },
          { serialNumber: { contains: params.search, mode: 'insensitive' } },
          { productName: { contains: params.search, mode: 'insensitive' } },
          { reportedIssue: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.applianceServiceRequest.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.applianceServiceRequest.count({ where }),
    ]);

    const rows = params.unpaidOnly
      ? items.filter((r) => Number(r.totalCharge) - Number(r.paidAmount) > 0)
      : items;

    return {
      items: rows.map((r) => ({
        ...r,
        /** Kaam ho gaya lekin paisa baqi */
        dueAmount: Math.max(Number(r.totalCharge) - Number(r.paidAmount), 0),
      })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  /** Aaj ka kaam — jo khula hai, sab se zaroori pehle. */
  async queue(user: AuthenticatedUser) {
    const rows = await this.prisma.applianceServiceRequest.findMany({
      where: { tenantId: user.tenantId, status: { in: OPEN_STATES } },
      take: 300,
    });
    const now = Date.now();
    return rows
      .map((r) => ({
        ...r,
        dueAmount: Math.max(Number(r.totalCharge) - Number(r.paidAmount), 0),
        isOverdue: !!r.scheduledDate && new Date(r.scheduledDate).getTime() < now,
        waitingHours: Math.floor((now - new Date(r.requestedAt).getTime()) / 3_600_000),
      }))
      .sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        const p = (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);
        if (p !== 0) return p;
        const s = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
        if (s !== 0) return s;
        return new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime();
      });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.applianceServiceRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Service request nahi mila');

    // Isi customer ki purani service history — "phir wohi kharabi?" ka jawab
    const history = r.customerPhone
      ? await this.prisma.applianceServiceRequest.findMany({
          where: { tenantId: user.tenantId, customerPhone: r.customerPhone, id: { not: r.id } },
          orderBy: { requestedAt: 'desc' },
          take: 20,
          select: {
            id: true, requestNumber: true, productName: true, serviceType: true, status: true,
            reportedIssue: true, issueCategory: true, workDone: true,
            requestedAt: true, completedAt: true, totalCharge: true, paidAmount: true,
            technicianName: true, coveredUnderWarranty: true, coveredUnderAmc: true,
          },
        })
      : [];

    const amc = r.amcContractNumber
      ? await this.prisma.applianceAmcContract.findFirst({
          where: { tenantId: user.tenantId, contractNumber: r.amcContractNumber },
          select: {
            id: true, contractNumber: true, amcType: true, status: true, expiryDate: true,
            freeVisitsAllowed: true, freeVisitsUsed: true, laborCovered: true,
            freePartsAllowed: true, gasRefillCovered: true,
          },
        })
      : null;

    return {
      ...r,
      dueAmount: Math.max(Number(r.totalCharge) - Number(r.paidAmount), 0),
      history,
      amc,
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateServiceRequestDto) {
    const r = await this.prisma.applianceServiceRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Service request nahi mila');
    if (r.status === 'COMPLETED') {
      throw new BadRequestException('Mukammal kaam edit nahi hota — nayi request banayein');
    }
    return this.prisma.applianceServiceRequest.update({
      where: { id },
      data: {
        ...dto,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
      },
    });
  }

  async assignTechnician(user: AuthenticatedUser, id: string, technicianId: string, scheduledDate?: string, timeSlot?: string) {
    const r = await this.prisma.applianceServiceRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Service request nahi mila');

    const tech = await this.prisma.applianceTechnician.findFirst({
      where: { id: technicianId, tenantId: user.tenantId },
    });
    if (!tech) throw new NotFoundException('Technician nahi mila');
    if (!tech.isActive) throw new BadRequestException(`${tech.name} abhi active nahi hai`);

    return this.prisma.applianceServiceRequest.update({
      where: { id },
      data: {
        technicianId: tech.id,
        technicianName: tech.name,
        technicianPhone: tech.phone,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        scheduledTimeSlot: timeSlot,
        // Agar technician pehle se raaste me ya site par hai to peeche na le jayein
        status: (['EN_ROUTE', 'ON_SITE', 'IN_PROGRESS'] as string[]).includes(r.status)
          ? r.status
          : 'TECHNICIAN_ASSIGNED',
      },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateServiceStatusDto) {
    const r = await this.prisma.applianceServiceRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Service request nahi mila');

    if (dto.status === 'COMPLETED') {
      throw new BadRequestException(
        'Mukammal karne ke liye "complete" istemal karein — warna charges aur technician ka record adhoora reh jata hai',
      );
    }

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'EN_ROUTE') patch.enRouteAt = r.enRouteAt ?? now;
    if (dto.status === 'ON_SITE') patch.arrivedAt = r.arrivedAt ?? now;
    // Pehla waqt hi asli hota hai — dobara IN_PROGRESS karne par reset nahi hona chahiye
    if (dto.status === 'IN_PROGRESS') patch.workStartedAt = r.workStartedAt ?? now;
    if (dto.notes) {
      patch.internalNotes = `${r.internalNotes || ''}\n[${now.toLocaleString('en-PK')}] ${dto.notes}`.trim();
    }

    return this.prisma.applianceServiceRequest.update({ where: { id }, data: patch });
  }

  async complete(user: AuthenticatedUser, id: string, dto: CompleteServiceDto) {
    const r = await this.prisma.applianceServiceRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Service request nahi mila');

    // Dobara complete karne par technician ke totals do bar barh jate the
    if (r.status === 'COMPLETED') {
      throw new BadRequestException('Ye kaam pehle hi mukammal ho chuka hai');
    }

    const visitCharge = dto.visitCharge ?? Number(r.visitCharge) ?? 0;
    const laborCharge = dto.laborCharge ?? Number(r.laborCharge) ?? 0;
    const partsCharge = dto.partsCharge ?? Number(r.partsCharge) ?? 0;
    const totalCharge = visitCharge + laborCharge + partsCharge;

    const coveredUnderAmc = dto.coveredUnderAmc ?? r.coveredUnderAmc;
    const coveredUnderWarranty = dto.coveredUnderWarranty ?? r.coveredUnderWarranty;

    // Warranty ya AMC ka kaam free hota hai — paisa 0 hi mana jayega
    const paidAmount = (coveredUnderAmc || coveredUnderWarranty)
      ? (dto.paidAmount ?? 0)
      : (dto.paidAmount ?? totalCharge);

    if (paidAmount > totalCharge) {
      throw new BadRequestException('Wusool shuda raqam kul bill se ziyada nahi ho sakti');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.applianceServiceRequest.update({
        where: { id },
        data: {
          ...dto,
          status: 'COMPLETED',
          completedAt: new Date(),
          workStartedAt: r.workStartedAt ?? new Date(),
          followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
          visitCharge,
          laborCharge,
          partsCharge,
          totalCharge,
          paidAmount,
          coveredUnderAmc,
          coveredUnderWarranty,
        },
      });

      if (r.technicianId) {
        const tech = await tx.applianceTechnician.findUnique({
          where: { id: r.technicianId },
          select: { commissionPct: true, totalReviews: true, avgRating: true },
        });
        const commission = totalCharge * ((Number(tech?.commissionPct) || 0) / 100);

        // Rating ka chalta hua ausat — har naye review par dobara hisab
        let ratingPatch = {};
        if (dto.customerRating && tech) {
          const prevCount = tech.totalReviews ?? 0;
          const prevAvg = Number(tech.avgRating) || 0;
          const nextCount = prevCount + 1;
          ratingPatch = {
            totalReviews: nextCount,
            avgRating: (prevAvg * prevCount + dto.customerRating) / nextCount,
          };
        }

        await tx.applianceTechnician.update({
          where: { id: r.technicianId },
          data: {
            totalJobs: { increment: 1 },
            completedJobs: { increment: 1 },
            totalRevenue: { increment: totalCharge },
            totalCommission: { increment: commission },
            ...ratingPatch,
          },
        });
      }

      if (r.amcContractNumber && coveredUnderAmc) {
        const amc = await tx.applianceAmcContract.findFirst({
          where: { tenantId: user.tenantId, contractNumber: r.amcContractNumber },
          select: { id: true, freeVisitsAllowed: true, freeVisitsUsed: true },
        });
        if (amc) {
          // Free visits allowed se upar nahi jani chahiye — warna contract
          // ka hisab ulta ho jata hai
          const canUseFree = amc.freeVisitsUsed < amc.freeVisitsAllowed;
          await tx.applianceAmcContract.update({
            where: { id: amc.id },
            data: {
              ...(canUseFree && { freeVisitsUsed: { increment: 1 } }),
              totalVisitsUsed: { increment: 1 },
              totalPartsClaimed: { increment: partsCharge },
              totalLaborSaved: { increment: laborCharge + visitCharge },
            },
          });
        }
      }

      return updated;
    });
  }

  /** Repair ka baqi paisa wusool hone par — udhaar band karne ke liye. */
  async addPayment(user: AuthenticatedUser, id: string, dto: AddServicePaymentDto) {
    const r = await this.prisma.applianceServiceRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Service request nahi mila');

    const due = Number(r.totalCharge) - Number(r.paidAmount);
    if (due <= 0) throw new BadRequestException('Is kaam ka poora paisa mil chuka hai');
    if (dto.amount <= 0) throw new BadRequestException('Raqam 0 se ziyada honi chahiye');
    if (dto.amount > due) throw new BadRequestException(`Sirf ${due} baqi hai`);

    const note = `[${new Date().toLocaleString('en-PK')}] Wusooli: ${dto.amount}${dto.note ? ` — ${dto.note}` : ''}`;
    return this.prisma.applianceServiceRequest.update({
      where: { id },
      data: {
        paidAmount: { increment: dto.amount },
        internalNotes: `${r.internalNotes || ''}\n${note}`.trim(),
      },
    });
  }

  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const r = await this.prisma.applianceServiceRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Service request nahi mila');
    if (r.status === 'COMPLETED') throw new BadRequestException('Mukammal kaam cancel nahi hota');
    return this.prisma.applianceServiceRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        internalNotes: `${r.internalNotes || ''}\n[${new Date().toLocaleString('en-PK')}] Cancel: ${reason || 'wajah nahi likhi'}`.trim(),
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.applianceServiceRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Service request nahi mila');
    if (r.status === 'COMPLETED') {
      throw new BadRequestException('Mukammal kaam ka record delete nahi hota — hisab kitab isi par chalta hai');
    }
    await this.prisma.applianceServiceRequest.delete({ where: { id } });
    return { message: 'Service request delete ho gaya' };
  }

  /**
   * Summary — sirf ginti nahi, paisa bhi.
   *
   * Pehle yahan sirf counts thay, is liye page par "aaj kitna kamaya"
   * kabhi nazar hi nahi aata tha.
   */
  async summary(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [counts, openRows, completedMonth, completedToday, followUps] = await Promise.all([
      this.prisma.applianceServiceRequest.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true },
      }),
      this.prisma.applianceServiceRequest.findMany({
        where: { tenantId, status: { in: OPEN_STATES } },
        select: { id: true, scheduledDate: true, priority: true, requestedAt: true, technicianId: true },
      }),
      this.prisma.applianceServiceRequest.findMany({
        where: { tenantId, status: 'COMPLETED', completedAt: { gte: monthStart } },
        select: { totalCharge: true, paidAmount: true, partsCharge: true, customerRating: true, completedAt: true, requestedAt: true },
      }),
      this.prisma.applianceServiceRequest.count({
        where: { tenantId, status: 'COMPLETED', completedAt: { gte: todayStart } },
      }),
      this.prisma.applianceServiceRequest.count({
        where: { tenantId, requiresFollowUp: true, followUpDate: { lte: now } },
      }),
    ]);

    const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
    const pick = (...keys: string[]) => keys.reduce((s, k) => s + (byStatus[k] ?? 0), 0);

    const revenue = completedMonth.reduce((s, r) => s + Number(r.totalCharge), 0);
    const collected = completedMonth.reduce((s, r) => s + Number(r.paidAmount), 0);
    const partsCost = completedMonth.reduce((s, r) => s + Number(r.partsCharge), 0);

    const ratings = completedMonth.map((r) => r.customerRating).filter((x): x is number => !!x);
    const hours = completedMonth
      .filter((r) => r.completedAt)
      .map((r) => (new Date(r.completedAt!).getTime() - new Date(r.requestedAt).getTime()) / 3_600_000);

    return {
      // Purane naam waise hi rakhe hain taake mojooda page na tute
      requested: byStatus['REQUESTED'] ?? 0,
      scheduled: pick('SCHEDULED', 'TECHNICIAN_ASSIGNED'),
      inProgress: pick('EN_ROUTE', 'ON_SITE', 'IN_PROGRESS'),
      completed: byStatus['COMPLETED'] ?? 0,
      unresolved: byStatus['UNRESOLVED'] ?? 0,
      pendingFollowUps: followUps,

      pendingParts: byStatus['PENDING_PARTS'] ?? 0,
      cancelled: byStatus['CANCELLED'] ?? 0,
      open: openRows.length,
      unassigned: openRows.filter((r) => !r.technicianId).length,
      overdue: openRows.filter((r) => r.scheduledDate && new Date(r.scheduledDate) < now).length,
      urgent: openRows.filter((r) => r.priority === 'URGENT' || r.priority === 'HIGH').length,
      completedToday,

      month: {
        jobs: completedMonth.length,
        revenue,
        collected,
        /** Kaam ho gaya, paisa abhi baqi */
        outstanding: revenue - collected,
        partsCost,
        profit: revenue - partsCost,
        avgTicket: completedMonth.length ? revenue / completedMonth.length : 0,
        avgResolutionHours: hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : 0,
        avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
      },
    };
  }
}
