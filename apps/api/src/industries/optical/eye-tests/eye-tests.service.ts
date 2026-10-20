import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { addMonths } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { startOfDayTz, endOfDayTz, weekdayInTz, startOfMonthTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { ensureCustomer } from '../../_shared/industry-sale.helper';
import { billServiceFee, toPaymentMethod } from '../billing/service-line';
import { checkEyePower, nextNumber, pageArgs, r2, type PageArgs } from '../common/optical-common';

import { CreateEyeTestDto, RecordTestPaymentDto, RecordTestResultsDto, UpdateTestStatusDto } from './dto/create-eye-test.dto';

const OPEN = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] as const;
export type EyeTestView = 'today' | 'upcoming' | 'waiting' | 'done' | 'unpaid' | 'followup' | 'closed' | 'all';

@Injectable()
export class EyeTestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateEyeTestDto) {
    if (!dto.customerName?.trim()) throw new BadRequestException('Customer ka naam likhein');
    if ((dto.customerPhone ?? '').replace(/\D/g, '').length < 10) throw new BadRequestException('Sahi mobile number likhein (03xx-xxxxxxx)');
    if (dto.testFee != null && dto.testFee < 0) throw new BadRequestException('Fees manfi nahi ho sakti');
    const count = await this.prisma.opticalEyeTest.count({ where: { tenantId: user.tenantId } });
    const testNumber = await nextNumber('ET', count, async (n) =>
      !!(await this.prisma.opticalEyeTest.findFirst({ where: { tenantId: user.tenantId, testNumber: n }, select: { id: true } })));

    let optometristName: string | undefined;
    let testFee = dto.testFee ?? 0;

    if (dto.optometristId) {
      const o = await this.prisma.opticalOptometrist.findFirst({ where: { id: dto.optometristId, tenantId: user.tenantId } });
      if (!o) throw new NotFoundException('Optometrist nahi mila');
      if (!o.isActive) throw new BadRequestException('Ye optometrist band hai');
      optometristName = o.name;
      if (dto.testFee == null) testFee = o.consultationFee;
    }

    const appointmentDate = new Date(dto.appointmentDate);
    if (Number.isNaN(appointmentDate.getTime())) throw new BadRequestException('Appointment ki date sahi nahi');
    const customerId = await ensureCustomer(this.prisma, user, { customerId: dto.customerId, name: dto.customerName, phone: dto.customerPhone });

    // Prevent double-booking same optometrist on same slot
    if (dto.optometristId && dto.scheduledSlot) {
      const dayStart = startOfDayTz(new Date(appointmentDate));
      const dayEnd = endOfDayTz(new Date(appointmentDate));
      const clash = await this.prisma.opticalEyeTest.findFirst({
        where: {
          tenantId: user.tenantId,
          optometristId: dto.optometristId,
          scheduledSlot: dto.scheduledSlot,
          appointmentDate: { gte: dayStart, lte: dayEnd },
          status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
        },
      });
      if (clash) throw new BadRequestException(`${dto.scheduledSlot} ka waqt is optometrist ke paas pehle se booked hai`);
    }

    return this.prisma.opticalEyeTest.create({
      data: {
        tenantId: user.tenantId,
        testNumber,
        ...dto,
        customerId,
        customerName: dto.customerName.trim(),
        customerPhone: dto.customerPhone.trim(),
        appointmentDate,
        optometristName,
        testFee,
        status: 'SCHEDULED',
      },
    });
  }

  async list(user: AuthenticatedUser, params: {
    status?: string; customerId?: string; optometristId?: string;
    from?: string; to?: string; today?: boolean; search?: string;
  }) {
    const todayStart = startOfDayTz();
    const todayEnd = endOfDayTz();

    return this.prisma.opticalEyeTest.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.optometristId && { optometristId: params.optometristId }),
        ...(params.today ? { appointmentDate: { gte: todayStart, lte: todayEnd } } : {}),
        ...(!params.today && (params.from || params.to) ? {
          appointmentDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { testNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      orderBy: [{ appointmentDate: 'asc' }],
      take: 200,
    });
  }

  private viewWhere(view: EyeTestView): Prisma.OpticalEyeTestWhereInput {
    const day = { gte: startOfDayTz(), lte: endOfDayTz() };
    switch (view) {
      case 'today': return { appointmentDate: day };
      case 'upcoming': return { status: { in: [...OPEN] }, appointmentDate: { gt: endOfDayTz() } };
      case 'waiting': return { status: { in: [...OPEN] }, appointmentDate: { lte: endOfDayTz() } };
      case 'done': return { status: 'COMPLETED' };
      case 'unpaid': return { status: { in: ['COMPLETED', 'IN_PROGRESS'] }, isWaivedOff: false, testFee: { gt: 0 } };
      case 'followup': return { requiresFollowUp: true, followUpDate: { gte: startOfDayTz() } };
      case 'closed': return { status: { in: ['CANCELLED', 'NO_SHOW'] } };
      default: return {};
    }
  }

  /** One page of tests for a desk view. "unpaid" is narrowed after reading (fee above what was paid). */
  async page(user: AuthenticatedUser, q: PageArgs & { view?: string; search?: string; from?: string; to?: string; optometristId?: string; customerId?: string }) {
    const { page, limit, skip } = pageArgs(q);
    const view = (q.view ?? 'today') as EyeTestView;
    const term = q.search?.trim();
    const where: Prisma.OpticalEyeTestWhereInput = {
      tenantId: user.tenantId,
      ...this.viewWhere(view),
      ...(q.optometristId && { optometristId: q.optometristId }),
      ...(q.customerId && { customerId: q.customerId }),
      ...(view !== 'today' && (q.from || q.to) ? { appointmentDate: { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lte: new Date(q.to) }) } } : {}),
      ...(term && { OR: [
        { testNumber: { contains: term, mode: 'insensitive' } },
        { customerName: { contains: term, mode: 'insensitive' } },
        { customerPhone: { contains: term } },
      ] }),
    };
    const order: Prisma.OpticalEyeTestOrderByWithRelationInput[] = ['today', 'upcoming', 'waiting'].includes(view) ? [{ appointmentDate: 'asc' }] : [{ appointmentDate: 'desc' }];
    if (view === 'unpaid') {
      const rows = (await this.prisma.opticalEyeTest.findMany({ where, orderBy: order, take: 500 })).filter((t) => t.paidAmount < t.testFee - 0.009);
      const due = r2(rows.reduce((a, t) => a + t.testFee - t.paidAmount, 0));
      return { items: rows.slice(skip, skip + limit), total: rows.length, page, limit, totalPages: Math.max(1, Math.ceil(rows.length / limit)), totals: { fees: r2(rows.reduce((a, t) => a + t.testFee, 0)), paid: r2(rows.reduce((a, t) => a + t.paidAmount, 0)), due } };
    }
    const [items, total, sums] = await Promise.all([
      this.prisma.opticalEyeTest.findMany({ where, orderBy: order, skip, take: limit }),
      this.prisma.opticalEyeTest.count({ where }),
      this.prisma.opticalEyeTest.aggregate({ where, _sum: { testFee: true, paidAmount: true } }),
    ]);
    const fees = r2(sums._sum.testFee ?? 0);
    const paid = r2(sums._sum.paidAmount ?? 0);
    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)), totals: { fees, paid, due: Math.max(r2(fees - paid), 0) } };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.opticalEyeTest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Eye test nahi mila');

    const prescription = t.prescriptionId
      ? await this.prisma.opticalPrescription.findFirst({ where: { id: t.prescriptionId, tenantId: user.tenantId } })
      : null;
    return { ...t, prescription };
  }

  async assignOptometrist(user: AuthenticatedUser, id: string, optometristId: string) {
    const t = await this.prisma.opticalEyeTest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Eye test nahi mila');

    const o = await this.prisma.opticalOptometrist.findFirst({ where: { id: optometristId, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Optometrist nahi mila');

    return this.prisma.opticalEyeTest.update({
      where: { id },
      data: { optometristId, optometristName: o.name, status: 'CONFIRMED' },
    });
  }

  async startTest(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.opticalEyeTest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Eye test nahi mila');
    if (t.status === 'COMPLETED') throw new BadRequestException('Test pehle hi mukammal hai');
    if (t.status === 'CANCELLED' || t.status === 'NO_SHOW') throw new BadRequestException('Cancel / no-show test shuru nahi ho sakta');

    return this.prisma.opticalEyeTest.update({
      where: { id },
      data: { status: 'IN_PROGRESS', testStartedAt: new Date() },
    });
  }

  async recordResults(user: AuthenticatedUser, id: string, dto: RecordTestResultsDto) {
    const t = await this.prisma.opticalEyeTest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Eye test nahi mila');
    if (t.status === 'CANCELLED' || t.status === 'NO_SHOW') throw new BadRequestException('Cancel / no-show test ka result nahi likha ja sakta');
    checkEyePower(dto);
    const followUpDate = dto.followUpDate ? new Date(dto.followUpDate) : undefined;
    if (followUpDate && Number.isNaN(followUpDate.getTime())) throw new BadRequestException('Follow-up ki date sahi nahi');
    const again = t.status === 'COMPLETED';

    const now = new Date();
    const startedAt = t.testStartedAt ?? now;
    const durationMinutes = Math.max(1, Math.round((now.getTime() - new Date(startedAt).getTime()) / 60000));

    return this.prisma.$transaction(async (tx) => {
      let prescriptionId = t.prescriptionId;

      // Auto-issue prescription from test results
      if (dto.issuePrescription && !prescriptionId) {
        const count = await tx.opticalPrescription.count({ where: { tenantId: user.tenantId } });
        const prescriptionNumber = await nextNumber('RX', count, async (n) =>
          !!(await tx.opticalPrescription.findFirst({ where: { tenantId: user.tenantId, prescriptionNumber: n }, select: { id: true } })));

        const rx = await tx.opticalPrescription.create({
          data: {
            tenantId: user.tenantId,
            prescriptionNumber,
            customerId: t.customerId,
            customerName: t.customerName,
            customerPhone: t.customerPhone,
            customerAge: t.customerAge,
            prescribedBy: t.optometristName,
            doctorName: t.optometristName,
            prescriptionDate: now,
            expiryDate: addMonths(now, 12),
            rightSph: dto.rightSph, rightCyl: dto.rightCyl, rightAxis: dto.rightAxis, rightAdd: dto.rightAdd, rightVa: dto.rightVa,
            leftSph: dto.leftSph, leftCyl: dto.leftCyl, leftAxis: dto.leftAxis, leftAdd: dto.leftAdd, leftVa: dto.leftVa,
            pupilDistance: dto.pupilDistance,
            notes: `Issued from eye test ${t.testNumber}`,
            isActive: true,
          },
        });
        prescriptionId = rx.id;
      }

      // Strip DTO-only flags — they are not Prisma columns
      const { issuePrescription: _issuePrescription, ...prismaData } = dto;

      const updated = await tx.opticalEyeTest.update({
        where: { id },
        data: {
          ...prismaData,
          imageUrls: dto.imageUrls ?? t.imageUrls,
          followUpDate,
          testCompletedAt: again ? t.testCompletedAt : now,
          testDurationMinutes: again ? t.testDurationMinutes : durationMinutes,
          status: 'COMPLETED',
          prescriptionIssued: !!prescriptionId,
          prescriptionId,
        },
      });

      if (t.optometristId && !again) {
        await tx.opticalOptometrist.update({ where: { id: t.optometristId }, data: { totalTests: { increment: 1 } } });
      }

      return updated;
    });
  }

  /**
   * Takes the test fee and bills it as a sale, so the drawer and reports
   * carry it. With `onKhata` the fee goes on the customer's khata instead.
   */
  async recordPayment(user: AuthenticatedUser, scope: ShopScope, id: string, dto: RecordTestPaymentDto) {
    const t = await this.prisma.opticalEyeTest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Eye test nahi mila');
    if (t.status === 'CANCELLED' || t.status === 'NO_SHOW') throw new BadRequestException('Cancel / no-show test ki fees nahi li ja sakti');

    if (dto.waiveOff) {
      if (t.paidAmount > 0) throw new BadRequestException('Fees pehle li ja chuki hai, ab maaf nahi ho sakti');
      return this.prisma.opticalEyeTest.update({
        where: { id },
        data: { isWaivedOff: true, paidAmount: 0, notes: [t.notes, 'Fees maaf'].filter(Boolean).join('\n') },
      });
    }

    const remaining = r2(t.testFee - t.paidAmount);
    const amount = dto.onKhata ? remaining : r2(Number(dto.amount));
    if (!(amount > 0)) throw new BadRequestException(t.isWaivedOff || remaining <= 0 ? 'Is test ki fees baqi nahi' : 'Amount 0 se zyada honi chahiye');
    if (t.isWaivedOff || amount > remaining + 0.009) {
      throw new BadRequestException(remaining > 0 && !t.isWaivedOff ? `Sirf Rs ${remaining} baqi hain` : 'Is test ki fees baqi nahi');
    }

    const sale = await billServiceFee(this.prisma, this.sales, user, scope, {
      line: 'EYE_TEST',
      amount,
      paymentMethod: dto.paymentMethod,
      customerId: t.customerId,
      onKhata: dto.onKhata,
      lineNote: [t.testNumber, t.customerName].filter(Boolean).join(' · '),
      note: `Eye test ${t.testNumber}`,
    });

    if (t.optometristId) {
      await this.prisma.opticalOptometrist.update({ where: { id: t.optometristId }, data: { totalRevenue: { increment: amount } } }).catch(() => undefined);
    }
    const updated = await this.prisma.opticalEyeTest.update({
      where: { id },
      data: {
        paidAmount: r2(t.paidAmount + amount),
        paymentMethod: dto.onKhata ? 'KHATA' : toPaymentMethod(dto.paymentMethod),
        notes: [t.notes, `Bill ${sale.saleNumber}: Rs ${amount}${dto.onKhata ? ' (khata)' : ''}`].filter(Boolean).join('\n'),
      },
    });
    return { ...updated, sale };
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateTestStatusDto) {
    const t = await this.prisma.opticalEyeTest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Eye test nahi mila');
    if (dto.status === 'COMPLETED') throw new BadRequestException('Test mukammal karne ke liye result likhein');
    if (t.status === 'COMPLETED') throw new BadRequestException('Mukammal test ki halat badli nahi ja sakti');
    if (dto.status === 'IN_PROGRESS') return this.startTest(user, id);

    const patch: Prisma.OpticalEyeTestUpdateInput = { status: dto.status };
    if (dto.status === 'RESCHEDULED') {
      const when = dto.rescheduledDate ? new Date(dto.rescheduledDate) : null;
      if (!when || Number.isNaN(when.getTime())) throw new BadRequestException('Nayi date likhein');
      patch.appointmentDate = when;
      patch.status = 'SCHEDULED';
      if (dto.scheduledSlot !== undefined) patch.scheduledSlot = dto.scheduledSlot || null;
    }
    if (dto.reason) patch.notes = [t.notes, dto.reason].filter(Boolean).join('\n');

    return this.prisma.opticalEyeTest.update({ where: { id }, data: patch });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.opticalEyeTest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Eye test nahi mila');
    if (t.status === 'COMPLETED') throw new BadRequestException('Mukammal test cancel nahi ho sakta');
    // Tests are kept for history: removing one cancels it.
    return this.prisma.opticalEyeTest.update({ where: { id }, data: { status: 'CANCELLED', notes: [t.notes, 'Cancel kiya'].filter(Boolean).join('\n') } });
  }

  /** A voided or returned fee bill takes its amount back off the test. */
  async onFeeBillUndone(tenantId: string, saleId: string, why: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, select: { saleNumber: true } });
    if (!sale) return;
    const tag = `Bill ${sale.saleNumber}: Rs `;
    const t = await this.prisma.opticalEyeTest.findFirst({ where: { tenantId, notes: { contains: tag } } });
    if (!t) return;
    const line = (t.notes ?? '').split('\n').find((l) => l.startsWith(tag));
    const amount = parseFloat(line?.slice(tag.length) ?? '') || 0;
    if (!(amount > 0)) return;
    await this.prisma.opticalEyeTest.update({
      where: { id: t.id },
      data: { paidAmount: Math.max(r2(t.paidAmount - amount), 0), notes: [t.notes, `Bill ${sale.saleNumber} ${why} — Rs ${amount} wapas`].filter(Boolean).join('\n') },
    });
    if (t.optometristId) {
      await this.prisma.opticalOptometrist.update({ where: { id: t.optometristId }, data: { totalRevenue: { decrement: amount } } }).catch(() => undefined);
    }
  }

  /** Tests whose fee was billed on these sales: sale number → test. */
  async forSaleNumbers(user: AuthenticatedUser, saleNumbers: string[]) {
    if (!saleNumbers.length) return [];
    return this.prisma.opticalEyeTest.findMany({
      where: { tenantId: user.tenantId, OR: saleNumbers.slice(0, 200).map((n) => ({ notes: { contains: `Bill ${n}: Rs ` } })) },
      select: { id: true, testNumber: true, notes: true },
    });
  }

  /** Available slots for an optometrist on a given date */
  async availableSlots(user: AuthenticatedUser, optometristId: string, date: string) {
    const o = await this.prisma.opticalOptometrist.findFirst({ where: { id: optometristId, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Optometrist nahi mila');

    const day = new Date(date);
    const dayOfWeek = weekdayInTz(day);
    if (!o.workingDays.includes(dayOfWeek)) {
      return { available: [], booked: [], reason: 'Is din doctor nahi aate' };
    }

    const dayStart = startOfDayTz(new Date(day));
    const dayEnd = endOfDayTz(new Date(day));

    const booked = await this.prisma.opticalEyeTest.findMany({
      where: {
        tenantId: user.tenantId,
        optometristId,
        appointmentDate: { gte: dayStart, lte: dayEnd },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      },
      select: { scheduledSlot: true, customerName: true },
    });

    const bookedSlots = booked.map((b) => b.scheduledSlot).filter(Boolean) as string[];

    // Generate 30-min slots between work hours
    const [sh, sm] = o.workStartTime.split(':').map(Number);
    const [eh, em] = o.workEndTime.split(':').map(Number);
    const slots: string[] = [];
    let cur = sh * 60 + sm;
    const end = eh * 60 + em;
    while (cur + 30 <= end) {
      const h = Math.floor(cur / 60);
      const m = cur % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      cur += 30;
    }

    return {
      optometrist: { id: o.id, name: o.name, consultationFee: o.consultationFee },
      available: slots.filter((s) => !bookedSlots.includes(s)),
      booked,
      workHours: { start: o.workStartTime, end: o.workEndTime },
    };
  }

  async todaySchedule(user: AuthenticatedUser) {
    const start = startOfDayTz();
    const end = endOfDayTz();
    return this.prisma.opticalEyeTest.findMany({
      where: { tenantId: user.tenantId, appointmentDate: { gte: start, lte: end } },
      orderBy: { appointmentDate: 'asc' },
    });
  }

  async summary(user: AuthenticatedUser) {
    const todayStart = startOfDayTz();
    const todayEnd = endOfDayTz();
    const monthStart = startOfMonthTz();

    const [scheduled, inProgress, completedToday, monthCount, revenue, followUps] = await Promise.all([
      this.prisma.opticalEyeTest.count({ where: { tenantId: user.tenantId, status: { in: ['SCHEDULED', 'CONFIRMED'] } } }),
      this.prisma.opticalEyeTest.count({ where: { tenantId: user.tenantId, status: 'IN_PROGRESS' } }),
      this.prisma.opticalEyeTest.count({
        where: { tenantId: user.tenantId, status: 'COMPLETED', testCompletedAt: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.opticalEyeTest.count({ where: { tenantId: user.tenantId, appointmentDate: { gte: monthStart } } }),
      this.prisma.opticalEyeTest.aggregate({
        where: { tenantId: user.tenantId, testCompletedAt: { gte: monthStart } },
        _sum: { paidAmount: true, testFee: true },
      }),
      this.prisma.opticalEyeTest.count({
        where: { tenantId: user.tenantId, requiresFollowUp: true, followUpDate: { gte: new Date() } },
      }),
    ]);

    const owing = (await this.prisma.opticalEyeTest.findMany({
      where: { tenantId: user.tenantId, ...this.viewWhere('unpaid') },
      select: { testFee: true, paidAmount: true },
      take: 2000,
    })).filter((t) => t.paidAmount < t.testFee - 0.009);

    return {
      scheduled, inProgress, completedToday, monthCount, pendingFollowUps: followUps,
      monthlyRevenue: revenue._sum.paidAmount ?? 0,
      monthlyBilled: revenue._sum.testFee ?? 0,
      unpaidCount: owing.length,
      unpaidAmount: r2(owing.reduce((a, t) => a + t.testFee - t.paidAmount, 0)),
    };
  }
}
