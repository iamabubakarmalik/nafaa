import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApplianceInstallationStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import {
  AddInstallationPaymentDto,
  AssignTechnicianDto,
  CompleteInstallationDto,
  CreateInstallationDto,
  UpdateInstallationStatusDto,
} from './dto/create-installation.dto';

/** Jin halaton me installation abhi baqi hai */
const OPEN_STATES: ApplianceInstallationStatus[] = ['PENDING', 'SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'RESCHEDULED'];

const STATUS_RANK: Record<string, number> = {
  IN_PROGRESS: 0, ASSIGNED: 1, SCHEDULED: 2, RESCHEDULED: 3, PENDING: 4,
  COMPLETED: 5, FAILED: 6, CANCELLED: 7,
};

@Injectable()
export class InstallationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Agla installation number — `count() + 1` se nahi.
   * Purana record delete hone par wohi number dobara banta tha aur
   * `[tenantId, installationNumber]` unique constraint tut jata tha.
   */
  private async nextNumber(tenantId: string) {
    const year = new Date().getFullYear();
    const prefix = `INST-${year}-`;
    const last = await this.prisma.applianceInstallation.findFirst({
      where: { tenantId, installationNumber: { startsWith: prefix } },
      orderBy: { installationNumber: 'desc' },
      select: { installationNumber: true },
    });
    const seq = last ? Number(last.installationNumber.slice(prefix.length)) || 0 : 0;
    return `${prefix}${String(seq + 1).padStart(4, '0')}`;
  }

  async create(user: AuthenticatedUser, dto: CreateInstallationDto) {
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

    const installationNumber = await this.nextNumber(user.tenantId);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.applianceInstallation.create({
        data: {
          tenantId: user.tenantId,
          installationNumber,
          ...dto,
          serviceType: dto.serviceType ?? 'INSTALLATION',
          scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
          technicianName,
          technicianPhone,
          status: dto.technicianId ? 'ASSIGNED' : dto.scheduledDate ? 'SCHEDULED' : 'PENDING',
          createdById: user.id,
        },
      });

      // Serial register ko bhi bata dein warna stock report me unit
      // "lagana baqi" dikhata rahega jabke kaam schedule ho chuka hai
      if (dto.serialTrackingId) {
        await tx.applianceSerialTracking.updateMany({
          where: { id: dto.serialTrackingId, tenantId: user.tenantId },
          data: {
            installationStatus: created.status,
            installationScheduledFor: created.scheduledDate,
            installedByTechnicianId: dto.technicianId ?? null,
          },
        });
      }

      return created;
    });
  }

  async list(user: AuthenticatedUser, params: {
    status?: string;
    open?: boolean;
    serviceType?: string;
    technicianId?: string;
    customerId?: string;
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
      ...(params.from || params.to
        ? {
            scheduledDate: {
              ...(params.from && { gte: new Date(params.from) }),
              ...(params.to && { lte: (() => { const d = new Date(params.to!); d.setHours(23, 59, 59, 999); return d; })() }),
            },
          }
        : {}),
      ...(params.search && {
        OR: [
          { installationNumber: { contains: params.search, mode: 'insensitive' } },
          { customerName: { contains: params.search, mode: 'insensitive' } },
          { customerPhone: { contains: params.search } },
          { serialNumber: { contains: params.search, mode: 'insensitive' } },
          { productName: { contains: params.search, mode: 'insensitive' } },
          { customerAddress: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.applianceInstallation.findMany({
        where,
        orderBy: [{ scheduledDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.applianceInstallation.count({ where }),
    ]);

    const now = Date.now();
    const rows = items
      .map((r) => ({
        ...r,
        dueAmount: Math.max(Number(r.totalCharge) - Number(r.paidByCustomer), 0),
        isOverdue: (OPEN_STATES).includes(r.status)
          && !!r.scheduledDate && new Date(r.scheduledDate).getTime() < now,
      }))
      .filter((r) => (params.unpaidOnly ? r.dueAmount > 0 : true));

    return {
      items: rows,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const i = await this.prisma.applianceInstallation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Installation nahi mili');

    // Isi ghar/customer ka purana kaam — dobara wohi masla to nahi
    const history = i.customerPhone
      ? await this.prisma.applianceInstallation.findMany({
          where: { tenantId: user.tenantId, customerPhone: i.customerPhone, id: { not: i.id } },
          orderBy: { createdAt: 'desc' },
          take: 15,
          select: {
            id: true, installationNumber: true, productName: true, serviceType: true,
            status: true, scheduledDate: true, completedAt: true, totalCharge: true,
            technicianName: true,
          },
        })
      : [];

    const serial = i.serialTrackingId
      ? await this.prisma.applianceSerialTracking.findFirst({
          where: { id: i.serialTrackingId, tenantId: user.tenantId },
          select: {
            id: true, serialNumber: true, modelNumber: true, status: true,
            warrantyStartDate: true, warrantyEndDate: true,
            compressorWarrantyEndDate: true, motorWarrantyEndDate: true,
          },
        })
      : null;

    return {
      ...i,
      dueAmount: Math.max(Number(i.totalCharge) - Number(i.paidByCustomer), 0),
      history,
      serial,
    };
  }

  /** Khula hua kaam — late aur aaj wala sab se upar. */
  async queue(user: AuthenticatedUser) {
    const rows = await this.prisma.applianceInstallation.findMany({
      where: { tenantId: user.tenantId, status: { in: OPEN_STATES } },
      take: 300,
    });
    const now = Date.now();
    return rows
      .map((r) => ({
        ...r,
        isOverdue: !!r.scheduledDate && new Date(r.scheduledDate).getTime() < now,
        waitingDays: Math.floor((now - new Date(r.createdAt).getTime()) / 86_400_000),
      }))
      .sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        const s = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
        if (s !== 0) return s;
        const ad = a.scheduledDate ? new Date(a.scheduledDate).getTime() : Infinity;
        const bd = b.scheduledDate ? new Date(b.scheduledDate).getTime() : Infinity;
        return ad - bd;
      });
  }

  async assignTechnician(user: AuthenticatedUser, id: string, dto: AssignTechnicianDto) {
    const i = await this.prisma.applianceInstallation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Installation nahi mili');
    if (i.status === 'COMPLETED') throw new BadRequestException('Mukammal kaam par technician nahi badalta');

    const tech = await this.prisma.applianceTechnician.findFirst({
      where: { id: dto.technicianId, tenantId: user.tenantId },
    });
    if (!tech) throw new NotFoundException('Technician nahi mila');
    if (!tech.isActive) throw new BadRequestException(`${tech.name} abhi active nahi hai`);

    return this.prisma.applianceInstallation.update({
      where: { id },
      data: {
        technicianId: tech.id,
        technicianName: tech.name,
        technicianPhone: tech.phone,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
        scheduledTimeSlot: dto.scheduledTimeSlot,
        // Kaam shuru ho chuka ho to peeche na le jayein
        status: i.status === 'IN_PROGRESS' ? i.status : 'ASSIGNED',
      },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateInstallationStatusDto) {
    const i = await this.prisma.applianceInstallation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Installation nahi mili');

    if (dto.status === 'COMPLETED') {
      throw new BadRequestException(
        'Mukammal karne ke liye "complete" istemal karein — warna charges aur serial ka record adhoora reh jata hai',
      );
    }

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'IN_PROGRESS') {
      // Pehla waqt hi asli — `patch.arrivedAt ?? now` hamesha `now` deta tha
      patch.arrivedAt = i.arrivedAt ?? now;
      patch.startedAt = i.startedAt ?? now;
    }
    if (dto.status === 'CANCELLED' || dto.status === 'FAILED') {
      patch.cancelledAt = now;
      patch.cancellationReason = dto.cancellationReason;
    }
    if (dto.notes) {
      patch.internalNotes = `${i.internalNotes || ''}\n[${now.toLocaleString('en-PK')}] ${dto.notes}`.trim();
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.applianceInstallation.update({ where: { id }, data: patch });
      if (i.serialTrackingId) {
        await tx.applianceSerialTracking.updateMany({
          where: { id: i.serialTrackingId, tenantId: user.tenantId },
          data: { installationStatus: dto.status },
        });
      }
      return updated;
    });
  }

  async complete(user: AuthenticatedUser, id: string, dto: CompleteInstallationDto) {
    const i = await this.prisma.applianceInstallation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Installation nahi mili');

    // Dobara complete karne par technician ke totals do bar barh jate thay
    if (i.status === 'COMPLETED') throw new BadRequestException('Ye installation pehle hi mukammal ho chuki hai');

    const materialsCharge = dto.materialsCharge ?? Number(i.materialsCharge) ?? 0;
    const laborCharge = dto.laborCharge ?? Number(i.laborCharge) ?? 0;
    const visitCharge = dto.visitCharge ?? Number(i.visitCharge) ?? 0;
    const totalCharge = materialsCharge + laborCharge + visitCharge;

    const coveredUnderWarranty = dto.covered_underWarranty ?? i.covered_underWarranty;
    const paidByCustomer = coveredUnderWarranty
      ? (dto.paidByCustomer ?? 0)
      : (dto.paidByCustomer ?? totalCharge);

    if (paidByCustomer > totalCharge) {
      throw new BadRequestException('Wusool shuda raqam kul bill se ziyada nahi ho sakti');
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.applianceInstallation.update({
        where: { id },
        data: {
          ...dto,
          status: 'COMPLETED',
          completedAt: now,
          arrivedAt: i.arrivedAt ?? now,
          startedAt: i.startedAt ?? now,
          materialsCharge,
          laborCharge,
          visitCharge,
          totalCharge,
          paidByCustomer,
          covered_underWarranty: coveredUnderWarranty,
          installationCertificateNumber:
            dto.installationCertificateNumber ?? i.installationCertificateNumber ?? `IC-${i.installationNumber}`,
        },
      });

      if (i.technicianId) {
        const tech = await tx.applianceTechnician.findUnique({
          where: { id: i.technicianId },
          select: { commissionPct: true, totalReviews: true, avgRating: true },
        });
        const commission = totalCharge * ((Number(tech?.commissionPct) || 0) / 100);

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
          where: { id: i.technicianId },
          data: {
            totalJobs: { increment: 1 },
            completedJobs: { increment: 1 },
            totalRevenue: { increment: totalCharge },
            totalCommission: { increment: commission },
            ...ratingPatch,
          },
        });
      }

      if (i.serialTrackingId) {
        await tx.applianceSerialTracking.updateMany({
          where: { id: i.serialTrackingId, tenantId: user.tenantId },
          data: {
            installationStatus: 'COMPLETED',
            installedAt: now,
            installedByTechnicianId: i.technicianId,
          },
        });
      }

      return updated;
    });
  }

  /** Installation ka baqi paisa wusool hone par. */
  async addPayment(user: AuthenticatedUser, id: string, dto: AddInstallationPaymentDto) {
    const i = await this.prisma.applianceInstallation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Installation nahi mili');

    const due = Number(i.totalCharge) - Number(i.paidByCustomer);
    if (due <= 0) throw new BadRequestException('Is kaam ka poora paisa mil chuka hai');
    if (dto.amount <= 0) throw new BadRequestException('Raqam 0 se ziyada honi chahiye');
    if (dto.amount > due) throw new BadRequestException(`Sirf ${due} baqi hai`);

    return this.prisma.applianceInstallation.update({
      where: { id },
      data: {
        paidByCustomer: { increment: dto.amount },
        internalNotes: `${i.internalNotes || ''}\n[${new Date().toLocaleString('en-PK')}] Wusooli: ${dto.amount}${dto.note ? ` — ${dto.note}` : ''}`.trim(),
      },
    });
  }

  async reschedule(user: AuthenticatedUser, id: string, newDate: string, reason?: string) {
    const i = await this.prisma.applianceInstallation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Installation nahi mili');
    if (i.status === 'COMPLETED') throw new BadRequestException('Mukammal kaam reschedule nahi hota');

    const when = new Date(newDate);
    if (isNaN(when.getTime())) throw new BadRequestException('Tareekh sahi nahi hai');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.applianceInstallation.update({
        where: { id },
        data: {
          scheduledDate: when,
          status: 'RESCHEDULED',
          internalNotes: `${i.internalNotes || ''}\n[${new Date().toLocaleString('en-PK')}] Reschedule ${when.toLocaleDateString('en-PK')}: ${reason || 'wajah nahi likhi'}`.trim(),
        },
      });
      if (i.serialTrackingId) {
        await tx.applianceSerialTracking.updateMany({
          where: { id: i.serialTrackingId, tenantId: user.tenantId },
          data: { installationStatus: 'RESCHEDULED', installationScheduledFor: when },
        });
      }
      return updated;
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const i = await this.prisma.applianceInstallation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Installation nahi mili');
    if (i.status === 'COMPLETED') {
      throw new BadRequestException('Mukammal installation ka record delete nahi hota — warranty isi par chalti hai');
    }
    await this.prisma.applianceInstallation.delete({ where: { id } });
    return { message: 'Installation delete ho gayi' };
  }

  async todaySchedule(user: AuthenticatedUser) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);

    return this.prisma.applianceInstallation.findMany({
      where: {
        tenantId: user.tenantId,
        scheduledDate: { gte: start, lte: end },
        status: { in: ['SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'RESCHEDULED'] },
      },
      orderBy: [{ scheduledTimeSlot: 'asc' }, { scheduledDate: 'asc' }],
    });
  }

  /** Summary — ginti ke sath paisa bhi, warna page adha khali lagta hai. */
  async summary(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [counts, openRows, doneMonth, todayJobs] = await Promise.all([
      this.prisma.applianceInstallation.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true },
      }),
      this.prisma.applianceInstallation.findMany({
        where: { tenantId, status: { in: OPEN_STATES } },
        select: { id: true, scheduledDate: true, technicianId: true, createdAt: true },
      }),
      this.prisma.applianceInstallation.findMany({
        where: { tenantId, status: 'COMPLETED', completedAt: { gte: monthStart } },
        select: {
          totalCharge: true, paidByCustomer: true, materialsCharge: true,
          customerRating: true, demoGiven: true,
        },
      }),
      this.prisma.applianceInstallation.count({
        where: {
          tenantId,
          scheduledDate: { gte: todayStart, lte: todayEnd },
          status: { in: OPEN_STATES },
        },
      }),
    ]);

    const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
    const pick = (...keys: string[]) => keys.reduce((s, k) => s + (byStatus[k] ?? 0), 0);

    const revenue = doneMonth.reduce((s, r) => s + Number(r.totalCharge), 0);
    const collected = doneMonth.reduce((s, r) => s + Number(r.paidByCustomer), 0);
    const materials = doneMonth.reduce((s, r) => s + Number(r.materialsCharge), 0);
    const ratings = doneMonth.map((r) => r.customerRating).filter((x): x is number => !!x);

    return {
      // Purane naam waise hi — mojooda page na tute
      pending: byStatus['PENDING'] ?? 0,
      scheduled: pick('SCHEDULED', 'ASSIGNED', 'RESCHEDULED'),
      inProgress: byStatus['IN_PROGRESS'] ?? 0,
      completed: byStatus['COMPLETED'] ?? 0,
      cancelled: pick('CANCELLED', 'FAILED'),

      open: openRows.length,
      unassigned: openRows.filter((r) => !r.technicianId).length,
      overdue: openRows.filter((r) => r.scheduledDate && new Date(r.scheduledDate) < todayStart).length,
      todayJobs,

      month: {
        jobs: doneMonth.length,
        revenue,
        collected,
        outstanding: revenue - collected,
        materialCost: materials,
        profit: revenue - materials,
        avgTicket: doneMonth.length ? revenue / doneMonth.length : 0,
        demosGiven: doneMonth.filter((r) => r.demoGiven).length,
        avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
      },
    };
  }
}
