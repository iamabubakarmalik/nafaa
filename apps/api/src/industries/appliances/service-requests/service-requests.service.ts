import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApplianceServiceStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { billJob, receiveJobMoney } from '../common/books';
import { activeTechnician, checkLinks, dayRange, nextInSequence, optDate, r2, stamp, yearPrefix } from '../common/appliance-common';
import { startOfDayTz, startOfMonthTz } from '../../../common/helpers/business-time.helper';
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

/** What the customer still owes; work covered by AMC or warranty owes only what was agreed as paid. */
const dueOf = (r: { totalCharge: unknown; paidAmount: unknown; coveredUnderAmc?: boolean | null; coveredUnderWarranty?: boolean | null }) =>
  r.coveredUnderAmc || r.coveredUnderWarranty ? 0 : Math.max(Number(r.totalCharge) - Number(r.paidAmount), 0);

@Injectable()
export class ServiceRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Next request number after the highest used this year (a count would repeat numbers). */
  private async nextNumber(tenantId: string) {
    const prefix = yearPrefix('SR');
    const last = await this.prisma.applianceServiceRequest.findFirst({
      where: { tenantId, requestNumber: { startsWith: prefix } },
      orderBy: { requestNumber: 'desc' },
      select: { requestNumber: true },
    });
    return nextInSequence(prefix, last?.requestNumber);
  }

  async create(user: AuthenticatedUser, dto: CreateServiceRequestDto) {
    await checkLinks(this.prisma, user.tenantId, dto);
    const tech = dto.technicianId ? await activeTechnician(this.prisma, user.tenantId, dto.technicianId) : null;
    const technicianName = tech?.name;
    const technicianPhone = tech?.phone;

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
        scheduledDate: optDate(dto.scheduledDate),
        totalCharge: r2(dto.visitCharge),
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
      ...(dayRange(params.from, params.to) && { requestedAt: dayRange(params.from, params.to) }),
      // Unpaid is filtered in the query, so paging and the total count agree.
      ...(params.unpaidOnly && {
        AND: [
          { status: { not: 'CANCELLED' } }, { coveredUnderAmc: false }, { coveredUnderWarranty: false },
          { paidAmount: { lt: this.prisma.applianceServiceRequest.fields.totalCharge } },
        ],
      }),
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

    return {
      items: items.map((r) => ({
        ...r,
        /** Kaam ho gaya lekin paisa baqi */
        dueAmount: dueOf(r),
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
        dueAmount: dueOf(r),
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
      dueAmount: dueOf(r),
      history,
      amc,
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateServiceRequestDto) {
    const r = await this.prisma.applianceServiceRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Service request nahi mila');
    if (r.status === 'COMPLETED' || r.status === 'CANCELLED') {
      throw new BadRequestException('Band kaam edit nahi hota — nayi request banayein');
    }
    return this.prisma.applianceServiceRequest.update({
      where: { id },
      data: {
        ...dto,
        scheduledDate: optDate(dto.scheduledDate) ?? undefined,
      },
    });
  }

  async assignTechnician(user: AuthenticatedUser, id: string, technicianId: string, scheduledDate?: string, timeSlot?: string) {
    const r = await this.prisma.applianceServiceRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Service request nahi mila');

    if (!OPEN_STATES.includes(r.status)) throw new BadRequestException('Band kaam par technician nahi badalta');
    const tech = await activeTechnician(this.prisma, user.tenantId, technicianId);

    return this.prisma.applianceServiceRequest.update({
      where: { id },
      data: {
        technicianId: tech.id,
        technicianName: tech.name,
        technicianPhone: tech.phone,
        scheduledDate: optDate(scheduledDate) ?? undefined,
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

    if (r.status === 'COMPLETED') throw new BadRequestException('Mukammal kaam ki halat nahi badalti — bill galat ho to Sales se void karein');
    if (dto.status === 'CANCELLED') return this.cancel(user, id, dto.notes);

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'EN_ROUTE') patch.enRouteAt = r.enRouteAt ?? now;
    if (dto.status === 'ON_SITE') patch.arrivedAt = r.arrivedAt ?? now;
    // Pehla waqt hi asli hota hai — dobara IN_PROGRESS karne par reset nahi hona chahiye
    if (dto.status === 'IN_PROGRESS') patch.workStartedAt = r.workStartedAt ?? now;
    if (dto.notes) {
      patch.internalNotes = stamp(r.internalNotes, dto.notes);
    }

    return this.prisma.applianceServiceRequest.update({ where: { id }, data: patch });
  }

  async complete(user: AuthenticatedUser, id: string, dto: CompleteServiceDto) {
    // The payment method goes on the bill, not on the request.
    const { paymentMethod, ...fields } = dto;
    const r = await this.prisma.applianceServiceRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Service request nahi mila');

    // Dobara complete karne par technician ke totals do bar barh jate the
    if (r.status === 'COMPLETED') {
      throw new BadRequestException('Ye kaam pehle hi mukammal ho chuka hai');
    }
    if (r.status === 'CANCELLED') throw new BadRequestException('Cancel hua kaam mukammal nahi hota');

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

    if (paidAmount > totalCharge + 0.005) {
      throw new BadRequestException('Receive shuda amount kul bill se ziyada nahi ho sakti');
    }
    // `paidAmount` is everything paid on the job, so it cannot be below the advance already taken.
    if (paidAmount + 0.005 < r2(r.paidAmount)) {
      throw new BadRequestException(`Is kaam par Rs ${r2(r.paidAmount)} advance pehle mil chuka hai — kul mila is se kam nahi ho sakta`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.applianceServiceRequest.update({
        where: { id },
        data: {
          ...fields,
          status: 'COMPLETED',
          completedAt: new Date(),
          workStartedAt: r.workStartedAt ?? new Date(),
          followUpDate: optDate(dto.followUpDate) ?? undefined,
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
        const tech = await tx.applianceTechnician.findFirst({
          where: { id: r.technicianId, tenantId: user.tenantId },
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

      // The finished job is a bill: visit, labour and parts. Covered work bills only what the customer paid.
      const covered = coveredUnderAmc || coveredUnderWarranty;
      const job = { number: r.requestNumber, customerId: r.customerId, customerName: r.customerName, customerPhone: r.customerPhone };
      const what = `${r.productName}${r.serialNumber ? ` (${r.serialNumber})` : ''}`;
      const lines = covered
        ? [{ label: `Service ${r.requestNumber} — ${what}: customer ka hissa`, amount: paidAmount, cost: partsCharge }]
        : [
            { label: `Service ${r.requestNumber} — ${what}: visit`, amount: visitCharge },
            { label: `Service ${r.requestNumber} — ${what}: mazdoori`, amount: laborCharge },
            // Parts are bought for the job; their price is taken as their cost.
            { label: `Service ${r.requestNumber} — ${what}: parts`, amount: partsCharge, cost: partsCharge },
          ];
      const bill = await billJob(tx, user, job, lines, paidAmount, paymentMethod);
      if (bill?.customerId && bill.customerId !== r.customerId) {
        await tx.applianceServiceRequest.update({ where: { id }, data: { customerId: bill.customerId } });
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

    if (r.status === 'CANCELLED') throw new BadRequestException('Cancel hue kaam par paisa nahi liya ja sakta');
    const due = dueOf(r);
    if (due <= 0) throw new BadRequestException('Is kaam ka poora paisa mil chuka hai');
    if (dto.amount <= 0) throw new BadRequestException('Amount 0 se ziyada honi chahiye');
    if (dto.amount > due + 0.005) throw new BadRequestException(`Sirf ${r2(due)} baqi hai`);

    const note = `Wusooli: ${dto.amount}${dto.note ? ` — ${dto.note}` : ''}`;
    return this.prisma.$transaction(async (tx) => {
      // Before the bill this is an advance; after it, it pays the bill's udhaar on khata.
      const customerId = await receiveJobMoney(
        tx, user,
        { number: r.requestNumber, customerId: r.customerId, customerName: r.customerName, customerPhone: r.customerPhone },
        dto.amount, `Service ${r.requestNumber} wusooli`, dto.paymentMethod,
      );
      return tx.applianceServiceRequest.update({
        where: { id },
        data: {
          customerId,
          paidAmount: { increment: dto.amount },
          internalNotes: stamp(r.internalNotes, note),
        },
      });
    });
  }

  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const r = await this.prisma.applianceServiceRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Service request nahi mila');
    if (r.status === 'COMPLETED') throw new BadRequestException('Mukammal kaam cancel nahi hota — bill galat ho to Sales se void karein');
    if (r.status === 'CANCELLED') return r;
    if (!reason?.trim()) throw new BadRequestException('Cancel ki wajah likhein');
    return this.prisma.applianceServiceRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        internalNotes: stamp(r.internalNotes, `Cancel: ${reason.trim()}${r2(r.paidAmount) > 0 ? ` — Rs ${r2(r.paidAmount)} advance customer ke khate me hai` : ''}`),
      },
    });
  }

  /** Old delete route: the request is kept and cancelled. */
  async remove(user: AuthenticatedUser, id: string) {
    await this.cancel(user, id, 'Record hataya gaya');
    return { message: 'Service request cancel ho gaya' };
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
    const todayStart = startOfDayTz();
    const monthStart = startOfMonthTz();

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
