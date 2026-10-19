/**
 * Paying stylists their commission. The unpaid lines of a period (billed,
 * not voided, not returned) are paid as one expense through the shared
 * expenses service (cash from the drawer by default), so the drawer, the
 * day book and profit all show it. The lines are marked paid with the
 * expense number as their payout reference, which is also the slip number.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ShopScope } from '../../../common/shop-scope';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { assertCan, r2, salonClock } from '../common/salon-common';
import { PayCommissionDto } from './dto/commission-payout.dto';
import { StaffProfilesService } from './staff-profiles.service';

const P = PERMISSIONS;
const CATEGORY = { name: 'Staff commission', icon: '✂️', color: '#ca8a04' };

@Injectable()
export class CommissionPayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly staff: StaffProfilesService,
    private readonly expenses: ExpensesService,
  ) {}

  private async stylist(tenantId: string, staffProfileId: string) {
    const profile = await this.prisma.salonStaffProfile.findFirst({ where: { id: staffProfileId, tenantId }, select: { id: true, staffId: true } });
    if (!profile) throw new NotFoundException('Stylist nahi mila');
    const person = await this.prisma.staff.findFirst({ where: { id: profile.staffId, tenantId }, select: { fullName: true } });
    return { id: profile.id, name: person?.fullName ?? 'Stylist' };
  }

  async pay(user: AuthenticatedUser, scope: ShopScope, dto: PayCommissionDto) {
    assertCan(user, [P.COMMISSION_MANAGE], 'Commission dene');
    assertCan(user, [P.EXPENSES_CREATE], 'Drawer se kharcha likhne');
    const tenantId = user.tenantId;
    if (dto.to < dto.from) throw new BadRequestException('Period sahi chunein');
    const person = await this.stylist(tenantId, dto.staffProfileId);
    const clock = await salonClock(this.tz, tenantId);
    const rows = await this.staff.commissionRows(tenantId, clock.range(dto.from, dto.to)!, person.id);
    const wanted = dto.lineIds ? new Set(dto.lineIds) : null;
    const due = rows.filter((r) => !r.paidAt && !r.returned && r.commissionAmount > 0 && (!wanted || wanted.has(r.id)));
    if (wanted && due.length !== wanted.size) throw new BadRequestException('Kuch lines di ja chuki hain ya wapas hain — page refresh karein');
    const amount = r2(due.reduce((s, r) => s + r.commissionAmount, 0));
    if (amount <= 0) throw new BadRequestException('Is period me koi baqi commission nahi');

    // Claim the lines first, so two payouts at once cannot pay the same line.
    const hold = `HOLD-${randomUUID()}`;
    const ids = due.map((r) => r.id);
    const now = new Date();
    const undo = () => this.prisma.salonAppointmentService.updateMany({
      where: { payoutRef: hold }, data: { commissionPaid: false, commissionPaidAt: null, payoutRef: null },
    });
    const claimed = await this.prisma.salonAppointmentService.updateMany({
      where: { id: { in: ids }, commissionPaid: false, commissionPaidAt: null },
      data: { commissionPaid: true, commissionPaidAt: now, payoutRef: hold },
    });
    if (claimed.count !== ids.length) {
      await undo();
      throw new BadRequestException('Ye commission abhi kisi aur ne di hai — page refresh karein');
    }

    let expenseNumber: string;
    try {
      const expense = await this.expenses.create(user, scope, {
        title: `Commission: ${person.name} (${dto.from} – ${dto.to})`.slice(0, 120),
        description: [`${ids.length} services`, dto.note?.trim()].filter(Boolean).join(' · ').slice(0, 500),
        amount,
        paymentMethod: dto.paymentMethod ?? 'CASH',
        status: 'PAID',
        categoryId: await this.category(tenantId),
      });
      expenseNumber = expense.expenseNumber;
    } catch (e) {
      await undo();
      throw e;
    }
    await this.prisma.salonAppointmentService.updateMany({ where: { payoutRef: hold }, data: { payoutRef: expenseNumber } });
    return this.slip(user, expenseNumber);
  }

  /** Payouts made to stylists, newest first. */
  async list(user: AuthenticatedUser, params: { staffProfileId?: string }) {
    assertCan(user, [P.COMMISSION_VIEW, P.COMMISSION_MANAGE], 'Commission dekhne');
    const tenantId = user.tenantId;
    const lines = await this.prisma.salonAppointmentService.findMany({
      where: {
        payoutRef: { not: null },
        NOT: { payoutRef: { startsWith: 'HOLD-' } },
        ...(params.staffProfileId && { staffProfileId: params.staffProfileId }),
        appointment: { tenantId },
      },
      select: { payoutRef: true, staffProfileId: true, staffName: true, commissionAmount: true, commissionPaidAt: true },
      orderBy: { commissionPaidAt: 'desc' },
      take: 10_000,
    });
    const byRef = new Map<string, { ref: string; staffProfileId: string | null; staffName: string | null; paidAt: Date | null; services: number; amount: number }>();
    for (const l of lines) {
      const row = byRef.get(l.payoutRef!) ?? { ref: l.payoutRef!, staffProfileId: l.staffProfileId, staffName: l.staffName, paidAt: l.commissionPaidAt, services: 0, amount: 0 };
      row.services += 1;
      row.amount = r2(row.amount + l.commissionAmount);
      byRef.set(l.payoutRef!, row);
    }
    const payouts = [...byRef.values()].slice(0, 200);
    const expenses = await this.prisma.expense.findMany({
      where: { tenantId, expenseNumber: { in: payouts.map((p) => p.ref) } },
      select: { expenseNumber: true, status: true, paymentMethod: true, amount: true },
    });
    const expenseOf = new Map(expenses.map((e) => [e.expenseNumber, e]));
    return payouts.map((p) => ({ ...p, expense: expenseOf.get(p.ref) ?? null }));
  }

  /** One payout as a printable slip: the stylist, the lines paid and the expense behind it. */
  async slip(user: AuthenticatedUser, ref: string) {
    assertCan(user, [P.COMMISSION_VIEW, P.COMMISSION_MANAGE], 'Commission dekhne');
    const tenantId = user.tenantId;
    const lines = await this.prisma.salonAppointmentService.findMany({
      where: { payoutRef: ref, appointment: { tenantId } },
      select: {
        id: true, serviceName: true, staffProfileId: true, staffName: true, total: true, commissionAmount: true, commissionPaidAt: true,
        appointment: { select: { appointmentNumber: true, customerName: true, actualEnd: true, saleId: true } },
      },
      orderBy: { appointment: { actualEnd: 'asc' } },
    });
    if (!lines.length) throw new NotFoundException('Payout nahi mili');
    const [expense, sales] = await Promise.all([
      this.prisma.expense.findFirst({
        where: { tenantId, expenseNumber: ref },
        select: { expenseNumber: true, title: true, amount: true, paymentMethod: true, status: true, expenseDate: true, createdBy: { select: { fullName: true } } },
      }),
      this.prisma.sale.findMany({
        where: { tenantId, id: { in: [...new Set(lines.map((l) => l.appointment.saleId).filter((x): x is string => !!x))] } },
        select: { id: true, saleNumber: true },
      }),
    ]);
    const saleNumber = new Map(sales.map((s) => [s.id, s.saleNumber]));
    const { createdBy, ...paidExpense } = expense ?? { createdBy: null };
    return {
      ref,
      staffProfileId: lines[0].staffProfileId,
      staffName: lines[0].staffName,
      paidAt: lines[0].commissionPaidAt,
      amount: r2(lines.reduce((s, l) => s + l.commissionAmount, 0)),
      expense: expense ? { ...paidExpense, paidBy: createdBy?.fullName ?? null } : null,
      lines: lines.map((l) => ({
        id: l.id, at: l.appointment.actualEnd, appointmentNumber: l.appointment.appointmentNumber, customerName: l.appointment.customerName,
        saleNumber: l.appointment.saleId ? saleNumber.get(l.appointment.saleId) ?? null : null,
        serviceName: l.serviceName, total: l.total, commission: l.commissionAmount,
      })),
    };
  }

  /** The shop's own commission or salary category, else a "Staff commission" one. */
  private async category(tenantId: string) {
    const own = await this.prisma.expenseCategory.findFirst({
      where: { tenantId, isActive: true, name: { contains: 'commission', mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (own) return own.id;
    const made = await this.prisma.expenseCategory.upsert({
      where: { tenantId_name: { tenantId, name: CATEGORY.name } },
      update: {},
      create: { tenantId, ...CATEGORY },
      select: { id: true },
    });
    return made.id;
  }
}
