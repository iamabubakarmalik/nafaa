/**
 * Doctor share payouts. The share for a period comes from the same fee-bill
 * numbers as the day close; paying it takes the money out as a PAID expense
 * through the shared expenses service (so the drawer and P&L show it), and
 * the payout row keeps the expense id. Payouts already made for an
 * overlapping period are taken off what is still due, so a share is never
 * paid twice.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { dateKeyTz, endOfDayTz, startOfDayTz } from '../../../common/helpers/business-time.helper';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { doctorShares } from '../appointments/doctor-share';

const METHODS: PaymentMethod[] = ['CASH', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'];
const CATEGORY = { name: 'Doctor share', icon: '🩺', color: '#0891b2' };
const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

function period(from?: string, to?: string) {
  const f = new Date(String(from ?? ''));
  const t = new Date(String(to ?? ''));
  if (!from || !to || Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) throw new BadRequestException('Muddat (kab se, kab tak) likhein');
  const start = startOfDayTz(f);
  const end = endOfDayTz(t);
  if (end < start) throw new BadRequestException('"Kab tak" pehle ki tareekh hai');
  if (start > new Date()) throw new BadRequestException('Aane wale dinon ka share nahi banta');
  return { start, end };
}

@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expenses: ExpensesService,
  ) {}

  private async doctor(tenantId: string, id?: string) {
    if (!id) throw new BadRequestException('Doctor chunein');
    const d = await this.prisma.clinicDoctorProfile.findFirst({ where: { id, tenantId }, select: { id: true, fullName: true, title: true, commissionPct: true, commissionType: true } });
    if (!d) throw new NotFoundException('Doctor nahi mila');
    return d;
  }

  /** Share earned in the period, payouts already made for overlapping periods, and what is still due. */
  async due(user: AuthenticatedUser, doctorId?: string, from?: string, to?: string) {
    const doctor = await this.doctor(user.tenantId, doctorId);
    const { start, end } = period(from, to);
    const [shares, paidRows] = await Promise.all([
      doctorShares(this.prisma, user.tenantId, start, end, doctor.id),
      this.prisma.clinicDoctorPayout.findMany({
        where: { tenantId: user.tenantId, doctorId: doctor.id, periodFrom: { lte: end }, periodTo: { gte: start } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const row = shares.rows.find((r) => r.doctorId === doctor.id);
    const share = row?.share ?? 0;
    const paid = r2(paidRows.reduce((s, p) => s + p.amount, 0));
    return {
      doctor, from: start, to: end,
      seen: row?.seen ?? 0, fees: row?.fees ?? 0, labFees: row?.labFees ?? 0, bills: row?.bills ?? 0,
      commissionType: row?.commissionType ?? (doctor.commissionType === 'FIXED' ? 'FIXED' : 'PERCENTAGE'), commissionPct: doctor.commissionPct,
      share, paid, due: r2(Math.max(share - paid, 0)), payouts: paidRows,
    };
  }

  async create(user: AuthenticatedUser, scope: ShopScope, dto: any) {
    const d = await this.due(user, dto?.doctorId, dto?.from, dto?.to);
    const amount = r2(dto?.amount ?? d.due);
    if (!(amount > 0)) throw new BadRequestException(d.due > 0 ? 'Amount likhein' : 'Is muddat ka koi share baqi nahi');
    if (amount > d.due + 0.009) throw new BadRequestException(`Is muddat ka sirf Rs ${d.due} share baqi hai`);
    const method = (dto?.paymentMethod ?? 'CASH') as PaymentMethod;
    if (!METHODS.includes(method)) throw new BadRequestException('Payment ka tareeqa ghalat hai');
    const note = dto?.note ? String(dto.note).trim().slice(0, 300) : null;
    const name = [d.doctor.title, d.doctor.fullName].filter(Boolean).join(' ');
    const label = `${dateKeyTz(d.from)} – ${dateKeyTz(d.to)}`;

    const expense = await this.expenses.create(user, scope, {
      title: `Doctor share: ${name} (${label})`.slice(0, 120),
      description: [`${d.seen} mareez, fees Rs ${d.fees}, share Rs ${d.share}`, note].filter(Boolean).join(' · ').slice(0, 500),
      amount,
      paymentMethod: method,
      status: 'PAID',
      categoryId: await this.category(user.tenantId),
      ...(dto?.shopId && { shopId: String(dto.shopId) }),
    });
    // A repeated click returns the same expense; keep one payout for it.
    const existing = await this.prisma.clinicDoctorPayout.findFirst({ where: { tenantId: user.tenantId, expenseId: expense.id } });
    if (existing) return { ...existing, expenseNumber: expense.expenseNumber, doctor: d.doctor };
    const row = await this.prisma.clinicDoctorPayout.create({
      data: {
        tenantId: user.tenantId, shopId: expense.shopId, doctorId: d.doctor.id, amount,
        periodFrom: d.from, periodTo: d.to, expenseId: expense.id, note, createdById: user.id,
      },
    });
    return { ...row, expenseNumber: expense.expenseNumber, doctor: d.doctor };
  }

  /** Payout history, newest first, with the doctor, the expense and who paid. */
  async list(user: AuthenticatedUser, params: { doctorId?: string; page?: string; limit?: string }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 25, 1), 200);
    const where = { tenantId: user.tenantId, ...(params.doctorId && { doctorId: params.doctorId }) };
    const [rows, total, sum] = await Promise.all([
      this.prisma.clinicDoctorPayout.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.clinicDoctorPayout.count({ where }),
      this.prisma.clinicDoctorPayout.aggregate({ where, _sum: { amount: true } }),
    ]);
    const [doctors, expenses, users] = await Promise.all([
      this.prisma.clinicDoctorProfile.findMany({ where: { tenantId: user.tenantId, id: { in: [...new Set(rows.map((r) => r.doctorId))] } }, select: { id: true, fullName: true, title: true } }),
      this.prisma.expense.findMany({ where: { tenantId: user.tenantId, id: { in: rows.map((r) => r.expenseId).filter((x): x is string => !!x) } }, select: { id: true, expenseNumber: true, paymentMethod: true } }),
      this.prisma.user.findMany({ where: { id: { in: rows.map((r) => r.createdById).filter((x): x is string => !!x) } }, select: { id: true, fullName: true } }),
    ]);
    return {
      items: rows.map((r) => ({
        ...r,
        doctor: doctors.find((d) => d.id === r.doctorId) ?? null,
        expense: expenses.find((e) => e.id === r.expenseId) ?? null,
        createdBy: users.find((u) => u.id === r.createdById) ?? null,
      })),
      total, page, limit, summary: { paid: r2(sum._sum.amount ?? 0) },
    };
  }

  /** The clinic's own "Doctor share" expense category, made once. */
  private async category(tenantId: string) {
    const made = await this.prisma.expenseCategory.upsert({
      where: { tenantId_name: { tenantId, name: CATEGORY.name } },
      update: {},
      create: { tenantId, ...CATEGORY },
      select: { id: true },
    });
    return made.id;
  }
}
