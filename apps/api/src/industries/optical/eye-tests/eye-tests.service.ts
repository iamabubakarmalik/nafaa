import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addMonths } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { startOfDayTz, endOfDayTz, weekdayInTz, startOfMonthTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { billServiceFee, toPaymentMethod } from '../billing/service-line';
import { CreateEyeTestDto, RecordTestPaymentDto, RecordTestResultsDto, UpdateTestStatusDto } from './dto/create-eye-test.dto';

@Injectable()
export class EyeTestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateEyeTestDto) {
    const count = await this.prisma.opticalEyeTest.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const testNumber = `ET-${year}-${String(count + 1).padStart(5, '0')}`;

    let optometristName: string | undefined;
    let testFee = dto.testFee ?? 0;

    if (dto.optometristId) {
      const o = await this.prisma.opticalOptometrist.findFirst({ where: { id: dto.optometristId, tenantId: user.tenantId } });
      if (!o) throw new NotFoundException('Optometrist not found');
      if (!o.isActive) throw new BadRequestException('Optometrist is not active');
      optometristName = o.name;
      if (!dto.testFee) testFee = o.consultationFee;
    }

    const appointmentDate = new Date(dto.appointmentDate);

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
      if (clash) throw new BadRequestException(`Slot ${dto.scheduledSlot} already booked for this optometrist`);
    }

    return this.prisma.opticalEyeTest.create({
      data: {
        tenantId: user.tenantId,
        testNumber,
        ...dto,
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

  async getOne(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.opticalEyeTest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Eye test not found');

    let prescription = null;
    if (t.prescriptionId) {
      prescription = await this.prisma.opticalPrescription.findUnique({ where: { id: t.prescriptionId } });
    }
    return { ...t, prescription };
  }

  async assignOptometrist(user: AuthenticatedUser, id: string, optometristId: string) {
    const t = await this.prisma.opticalEyeTest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Eye test not found');

    const o = await this.prisma.opticalOptometrist.findFirst({ where: { id: optometristId, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Optometrist not found');

    return this.prisma.opticalEyeTest.update({
      where: { id },
      data: { optometristId, optometristName: o.name, status: 'CONFIRMED' },
    });
  }

  async startTest(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.opticalEyeTest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Eye test not found');
    if (t.status === 'COMPLETED') throw new BadRequestException('Test already completed');

    return this.prisma.opticalEyeTest.update({
      where: { id },
      data: { status: 'IN_PROGRESS', testStartedAt: new Date() },
    });
  }

  async recordResults(user: AuthenticatedUser, id: string, dto: RecordTestResultsDto) {
    const t = await this.prisma.opticalEyeTest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Eye test not found');

    const now = new Date();
    const startedAt = t.testStartedAt ?? now;
    const durationMinutes = Math.max(1, Math.round((now.getTime() - new Date(startedAt).getTime()) / 60000));

    return this.prisma.$transaction(async (tx) => {
      let prescriptionId = t.prescriptionId;

      // Auto-issue prescription from test results
      if (dto.issuePrescription && !prescriptionId) {
        const count = await tx.opticalPrescription.count({ where: { tenantId: user.tenantId } });
        const year = now.getFullYear();
        const prescriptionNumber = `RX-${year}-${String(count + 1).padStart(5, '0')}`;

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
          followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
          testCompletedAt: now,
          testDurationMinutes: durationMinutes,
          status: 'COMPLETED',
          prescriptionIssued: !!prescriptionId,
          prescriptionId,
        },
      });

      if (t.optometristId) {
        await tx.opticalOptometrist.update({
          where: { id: t.optometristId },
          data: {
            totalTests: { increment: 1 },
            totalRevenue: { increment: t.paidAmount },
          },
        });
      }

      return updated;
    });
  }

  /** Takes the test fee and bills it as a sale, so the drawer and reports carry it. */
  async recordPayment(user: AuthenticatedUser, scope: ShopScope, id: string, dto: RecordTestPaymentDto) {
    const t = await this.prisma.opticalEyeTest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Eye test not found');

    if (dto.waiveOff) {
      if (t.paidAmount > 0) throw new BadRequestException('Fees pehle li ja chuki hai, ab maaf nahi ho sakti');
      return this.prisma.opticalEyeTest.update({
        where: { id },
        data: { isWaivedOff: true, paidAmount: 0 },
      });
    }

    const amount = Math.round(Number(dto.amount) * 100) / 100;
    if (!(amount > 0)) throw new BadRequestException('Raqam 0 se zyada honi chahiye');
    const remaining = Math.round((t.testFee - t.paidAmount) * 100) / 100;
    if (t.isWaivedOff || amount > remaining + 0.009) {
      throw new BadRequestException(remaining > 0 && !t.isWaivedOff ? `Sirf Rs ${remaining} baqi hain` : 'Is test ki fees baqi nahi');
    }

    const sale = await billServiceFee(this.prisma, this.sales, user, scope, {
      line: 'EYE_TEST',
      amount,
      paymentMethod: dto.paymentMethod,
      customerId: t.customerId,
      lineNote: [t.testNumber, t.customerName].filter(Boolean).join(' · '),
      note: `Eye test ${t.testNumber}`,
    });

    const updated = await this.prisma.opticalEyeTest.update({
      where: { id },
      data: {
        paidAmount: Math.round((t.paidAmount + amount) * 100) / 100,
        paymentMethod: toPaymentMethod(dto.paymentMethod),
        notes: [t.notes, `Bill ${sale.saleNumber}: Rs ${amount}`].filter(Boolean).join('\n'),
      },
    });
    return { ...updated, sale };
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateTestStatusDto) {
    const t = await this.prisma.opticalEyeTest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Eye test not found');

    const patch: any = { status: dto.status };
    if (dto.status === 'RESCHEDULED' && dto.rescheduledDate) {
      patch.appointmentDate = new Date(dto.rescheduledDate);
      patch.status = 'SCHEDULED';
    }
    if (dto.reason) patch.notes = ((t.notes || '') + '\n' + dto.reason).trim();

    return this.prisma.opticalEyeTest.update({ where: { id }, data: patch });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.opticalEyeTest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Eye test not found');
    if (t.status === 'COMPLETED') throw new BadRequestException('Cannot delete a completed test');
    return this.prisma.opticalEyeTest.delete({ where: { id } });
  }

  /** Available slots for an optometrist on a given date */
  async availableSlots(user: AuthenticatedUser, optometristId: string, date: string) {
    const o = await this.prisma.opticalOptometrist.findFirst({ where: { id: optometristId, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Optometrist not found');

    const day = new Date(date);
    const dayOfWeek = weekdayInTz(day);
    if (!o.workingDays.includes(dayOfWeek)) {
      return { available: [], booked: [], reason: 'Optometrist not working on this day' };
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

    return {
      scheduled, inProgress, completedToday, monthCount, pendingFollowUps: followUps,
      monthlyRevenue: revenue._sum.paidAmount ?? 0,
      monthlyBilled: revenue._sum.testFee ?? 0,
    };
  }
}
