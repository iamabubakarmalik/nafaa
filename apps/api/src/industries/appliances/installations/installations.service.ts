import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApplianceInstallationStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { billJob, receiveJobMoney } from '../common/books';
import { activeTechnician, checkLinks, dayRange, nextInSequence, optDate, r2, stamp, yearPrefix } from '../common/appliance-common';
import { endOfDayTz, startOfDayTz, startOfMonthTz } from '../../../common/helpers/business-time.helper';
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

/** Money still owed on a job; a warranty job owes only what the customer agreed to pay, already billed. */
const dueOf = (r: { totalCharge: unknown; paidByCustomer: unknown; covered_underWarranty?: boolean | null; status?: string }) =>
  r.covered_underWarranty && r.status === 'COMPLETED' ? 0 : Math.max(r2(Number(r.totalCharge) - Number(r.paidByCustomer)), 0);

@Injectable()
export class InstallationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Next installation number after the highest used this year (a count would repeat numbers). */
  private async nextNumber(tenantId: string) {
    const prefix = yearPrefix('INST');
    const last = await this.prisma.applianceInstallation.findFirst({
      where: { tenantId, installationNumber: { startsWith: prefix } },
      orderBy: { installationNumber: 'desc' },
      select: { installationNumber: true },
    });
    return nextInSequence(prefix, last?.installationNumber);
  }

  async create(user: AuthenticatedUser, dto: CreateInstallationDto) {
    await checkLinks(this.prisma, user.tenantId, dto);
    const tech = dto.technicianId ? await activeTechnician(this.prisma, user.tenantId, dto.technicianId) : null;
    const technicianName = tech?.name;
    const technicianPhone = tech?.phone;
    const scheduledDate = optDate(dto.scheduledDate);

    const installationNumber = await this.nextNumber(user.tenantId);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.applianceInstallation.create({
        data: {
          tenantId: user.tenantId,
          installationNumber,
          ...dto,
          serviceType: dto.serviceType ?? 'INSTALLATION',
          scheduledDate,
          totalCharge: r2((dto.laborCharge ?? 0) + (dto.visitCharge ?? 0) + (dto.materialsCharge ?? 0)),
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
      ...(dayRange(params.from, params.to) && { scheduledDate: dayRange(params.from, params.to) }),
      // Unpaid is filtered in the query, so paging and the total count agree.
      ...(params.unpaidOnly && {
        AND: [{ status: { not: 'CANCELLED' } }, { covered_underWarranty: false }, { paidByCustomer: { lt: this.prisma.applianceInstallation.fields.totalCharge } }],
      }),
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
        dueAmount: dueOf(r),
        isOverdue: (OPEN_STATES).includes(r.status)
          && !!r.scheduledDate && new Date(r.scheduledDate).getTime() < now,
      }));

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
      dueAmount: dueOf(i),
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
    if (!OPEN_STATES.includes(i.status)) throw new BadRequestException('Band kaam par technician nahi badalta');
    const tech = await activeTechnician(this.prisma, user.tenantId, dto.technicianId);

    return this.prisma.applianceInstallation.update({
      where: { id },
      data: {
        technicianId: tech.id,
        technicianName: tech.name,
        technicianPhone: tech.phone,
        scheduledDate: optDate(dto.scheduledDate) ?? undefined,
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
    if (i.status === 'COMPLETED') throw new BadRequestException('Mukammal kaam ki halat nahi badalti — bill galat ho to Sales se void karein');
    if ((dto.status === 'CANCELLED' || dto.status === 'FAILED') && !dto.cancellationReason?.trim()) {
      throw new BadRequestException('Cancel ki wajah likhein');
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
      patch.internalNotes = stamp(i.internalNotes, dto.notes);
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
    // The payment method goes on the bill, not on the installation.
    const { paymentMethod, ...fields } = dto;
    const i = await this.prisma.applianceInstallation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Installation nahi mili');

    // Dobara complete karne par technician ke totals do bar barh jate thay
    if (i.status === 'COMPLETED') throw new BadRequestException('Ye installation pehle hi mukammal ho chuki hai');
    if (i.status === 'CANCELLED' || i.status === 'FAILED') throw new BadRequestException('Cancel hui installation mukammal nahi hoti — pehle dobara kholein');

    const materialsCharge = dto.materialsCharge ?? Number(i.materialsCharge) ?? 0;
    const laborCharge = dto.laborCharge ?? Number(i.laborCharge) ?? 0;
    const visitCharge = dto.visitCharge ?? Number(i.visitCharge) ?? 0;
    const totalCharge = materialsCharge + laborCharge + visitCharge;

    const coveredUnderWarranty = dto.covered_underWarranty ?? i.covered_underWarranty;
    const paidByCustomer = coveredUnderWarranty
      ? (dto.paidByCustomer ?? 0)
      : (dto.paidByCustomer ?? totalCharge);

    if (paidByCustomer > totalCharge + 0.005) {
      throw new BadRequestException('Receive shuda amount kul bill se ziyada nahi ho sakti');
    }
    // `paidByCustomer` is everything paid on the job, so it cannot be below the advance already taken.
    if (paidByCustomer + 0.005 < r2(i.paidByCustomer)) {
      throw new BadRequestException(`Is kaam par Rs ${r2(i.paidByCustomer)} advance pehle mil chuka hai — kul mila is se kam nahi ho sakta`);
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.applianceInstallation.update({
        where: { id },
        data: {
          ...fields,
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
        const tech = await tx.applianceTechnician.findFirst({
          where: { id: i.technicianId, tenantId: user.tenantId },
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

      // Installation charges are a bill, unless the POS bill already carried them.
      const billedAtPos = i.saleId
        ? JSON.stringify((await tx.sale.findFirst({ where: { id: i.saleId, tenantId: user.tenantId }, select: { serviceChargesBreakdown: true } }))?.serviceChargesBreakdown ?? '').includes('INSTALLATION')
        : false;
      if (billedAtPos) {
        // The POS bill took this money; nothing is owed on the installation itself.
        await tx.applianceInstallation.update({ where: { id }, data: { paidByCustomer: totalCharge } });
      } else {
        const what = `${i.productName}${i.serialNumber ? ` (${i.serialNumber})` : ''}`;
        const lines = coveredUnderWarranty
          ? [{ label: `Installation ${i.installationNumber} — ${what}: customer ka hissa`, amount: paidByCustomer, cost: materialsCharge }]
          : [
              // Material is bought for the job; its price is taken as its cost.
              { label: `Installation ${i.installationNumber} — ${what}: saman`, amount: materialsCharge, cost: materialsCharge },
              { label: `Installation ${i.installationNumber} — ${what}: mazdoori`, amount: laborCharge },
              { label: `Installation ${i.installationNumber} — ${what}: visit`, amount: visitCharge },
            ];
        const bill = await billJob(
          tx, user,
          { number: i.installationNumber, customerId: i.customerId, customerName: i.customerName, customerPhone: i.customerPhone },
          lines, paidByCustomer, paymentMethod,
        );
        if (bill?.customerId && bill.customerId !== i.customerId) {
          await tx.applianceInstallation.update({ where: { id }, data: { customerId: bill.customerId } });
        }
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

    const due = dueOf(i);
    if (due <= 0) throw new BadRequestException('Is kaam ka poora paisa mil chuka hai');
    if (dto.amount <= 0) throw new BadRequestException('Amount 0 se ziyada honi chahiye');
    if (dto.amount > due + 0.005) throw new BadRequestException(`Sirf ${r2(due)} baqi hai`);
    if (i.status === 'CANCELLED' || i.status === 'FAILED') throw new BadRequestException('Cancel hui installation par paisa nahi liya ja sakta');
    return this.prisma.$transaction(async (tx) => {
      // Before the bill this is an advance; after it, it pays the bill's udhaar on khata.
      const customerId = await receiveJobMoney(
        tx, user,
        { number: i.installationNumber, customerId: i.customerId, customerName: i.customerName, customerPhone: i.customerPhone },
        dto.amount, `Installation ${i.installationNumber} wusooli`, dto.paymentMethod,
      );
      return tx.applianceInstallation.update({
        where: { id },
        data: {
          customerId,
          paidByCustomer: { increment: dto.amount },
          internalNotes: stamp(i.internalNotes, `Wusooli: ${dto.amount}${dto.note ? ` — ${dto.note}` : ''}`),
        },
      });
    });
  }

  async reschedule(user: AuthenticatedUser, id: string, newDate: string, reason?: string) {
    const i = await this.prisma.applianceInstallation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Installation nahi mili');
    if (!OPEN_STATES.includes(i.status)) throw new BadRequestException('Band kaam reschedule nahi hota');

    const when = optDate(newDate);
    if (!when) throw new BadRequestException('Nayi tareekh chunein');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.applianceInstallation.update({
        where: { id },
        data: {
          scheduledDate: when,
          status: 'RESCHEDULED',
          internalNotes: stamp(i.internalNotes, `Reschedule ${when.toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi' })}: ${reason || 'wajah nahi likhi'}`),
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

  /** Old delete route: the record is kept and cancelled, money on khata stays as the customer's advance. */
  async remove(user: AuthenticatedUser, id: string) {
    const i = await this.prisma.applianceInstallation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Installation nahi mili');
    if (i.status === 'COMPLETED') {
      throw new BadRequestException('Mukammal installation ka record nahi hatta — warranty isi par chalti hai');
    }
    if (i.status !== 'CANCELLED') {
      await this.updateStatus(user, id, { status: 'CANCELLED', cancellationReason: 'Record hataya gaya' } as UpdateInstallationStatusDto);
    }
    return { message: 'Installation cancel ho gayi' };
  }

  async todaySchedule(user: AuthenticatedUser) {
    const start = startOfDayTz();
    const end = endOfDayTz();

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
    const todayStart = startOfDayTz();
    const todayEnd = endOfDayTz();
    const monthStart = startOfMonthTz();

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
