/**
 * Technician commission from billed jobs, and paying it out.
 *
 * A job earns its technician's terms on the work part of the bill (visit,
 * labour, emergency; not parts, travel or tax), after its share of the
 * discount and less what was refunded on the bill. Voided bills earn
 * nothing. A payout is one PAID expense through the shared expenses service
 * (cash from the drawer by default), so the drawer, day book and profit see
 * it; each paid job gets a COMMISSION_PAID entry in its time log carrying the
 * expense number, which is also the slip number.
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PERMISSIONS, hasPermission, type PermissionKey } from '../../../common/constants/permissions.constants';
import { ShopScope } from '../../../common/shop-scope';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { dayRange, jobBillPrefix, jobNumberOfBill, r2, workCharge } from '../jobs/job-rules';
import { CommissionQuery, PayCommissionDto } from './dto/technician.dto';

const PAID = 'COMMISSION_PAID';
const CATEGORY = { name: 'Technician commission', icon: '🛠️', color: '#0ea5e9' };

function assertCan(user: AuthenticatedUser, perms: PermissionKey[], action: string) {
  if (!perms.some((p) => hasPermission(user.role, user.permissions, p))) {
    throw new ForbiddenException(`${action} ki permission nahi — dukaan ke malik se kehein`);
  }
}

export interface CommissionLine {
  jobId: string;
  jobNumber: string;
  saleNumber: string;
  billedAt: Date;
  customerName: string | null;
  serviceName: string;
  technicianId: string;
  bill: number;
  work: number;
  refunded: number;
  commission: number;
  paidRef: string | null;
}

@Injectable()
export class CommissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expenses: ExpensesService,
  ) {}

  /** Commission lines of jobs billed in the period (shop days). */
  private async lines(tenantId: string, from: string, to: string, technicianId?: string): Promise<CommissionLine[]> {
    if (to < from) throw new BadRequestException('Period sahi chunein');
    const range = dayRange(from, to);
    const sales = await this.prisma.sale.findMany({
      where: { tenantId, saleNumber: { startsWith: 'SVC-JOB-' }, status: { not: 'VOIDED' }, createdAt: range },
      select: { id: true, saleNumber: true, subtotal: true, total: true, createdAt: true, returns: { select: { refundAmount: true } } },
    });
    const byJob = new Map(sales.map((s) => [jobNumberOfBill(s.saleNumber), s]));
    const numbers = [...byJob.keys()].filter((x): x is string => !!x);
    if (!numbers.length) return [];
    const jobs = await this.prisma.serviceJob.findMany({
      where: { tenantId, jobNumber: { in: numbers }, primaryTechnicianId: technicianId ?? { not: null } },
      select: {
        id: true, jobNumber: true, customerName: true, serviceName: true, primaryTechnicianId: true,
        visitCharge: true, labourCharge: true, emergencyCharge: true,
      },
    });
    const staffIds = [...new Set(jobs.map((j) => j.primaryTechnicianId!))];
    const [profiles, paidLogs] = await Promise.all([
      this.prisma.serviceTechnicianProfile.findMany({ where: { tenantId, staffId: { in: staffIds } }, select: { staffId: true, commissionType: true, commissionPct: true, fixedPerJob: true } }),
      this.prisma.serviceJobTimeLog.findMany({ where: { jobId: { in: jobs.map((j) => j.id) }, action: PAID }, select: { jobId: true, notes: true } }),
    ]);
    const termsOf = new Map(profiles.map((p) => [p.staffId, p]));
    const paidOf = new Map(paidLogs.map((l) => [l.jobId, l.notes]));
    return jobs.map((j) => {
      const sale = byJob.get(j.jobNumber)!;
      const total = Number(sale.total) || 0;
      const refunded = r2(sale.returns.reduce((s, r) => s + (Number(r.refundAmount) || 0), 0));
      const kept = total > 0 ? Math.max(0, 1 - refunded / total) : 0;
      // The work's share of the bill discount, from the bill itself.
      const subtotal = Number(sale.subtotal) || 0;
      const work = r2(workCharge(j) * (subtotal > 0 ? total / subtotal : 0) * kept);
      const t = termsOf.get(j.primaryTechnicianId!);
      const type = (t?.commissionType ?? 'PERCENTAGE').toUpperCase();
      const pct = ['PERCENTAGE', 'BOTH'].includes(type) ? work * (t?.commissionPct ?? 0) / 100 : 0;
      const fixed = ['FIXED', 'BOTH'].includes(type) && kept > 0 ? t?.fixedPerJob ?? 0 : 0;
      return {
        jobId: j.id, jobNumber: j.jobNumber, saleNumber: sale.saleNumber, billedAt: sale.createdAt, customerName: j.customerName, serviceName: j.serviceName,
        technicianId: j.primaryTechnicianId!, bill: total, work, refunded, commission: r2(pct + fixed), paidRef: paidOf.get(j.id) ?? null,
      };
    }).sort((a, b) => a.billedAt.getTime() - b.billedAt.getTime());
  }

  async statement(user: AuthenticatedUser, q: CommissionQuery) {
    assertCan(user, [PERMISSIONS.COMMISSION_VIEW, PERMISSIONS.COMMISSION_MANAGE], 'Commission dekhne');
    const lines = await this.lines(user.tenantId, q.from, q.to, q.technicianId);
    const staff = await this.prisma.staff.findMany({ where: { tenantId: user.tenantId, id: { in: [...new Set(lines.map((l) => l.technicianId))] } }, select: { id: true, fullName: true } });
    const nameOf = new Map(staff.map((s) => [s.id, s.fullName.trim()]));
    const per = new Map<string, { technicianId: string; name: string; jobs: number; bill: number; work: number; commission: number; paid: number; unpaid: number }>();
    for (const l of lines) {
      const row = per.get(l.technicianId) ?? { technicianId: l.technicianId, name: nameOf.get(l.technicianId) ?? 'Technician', jobs: 0, bill: 0, work: 0, commission: 0, paid: 0, unpaid: 0 };
      row.jobs += 1;
      row.bill = r2(row.bill + l.bill);
      row.work = r2(row.work + l.work);
      row.commission = r2(row.commission + l.commission);
      if (l.paidRef && !l.paidRef.startsWith('HOLD-')) row.paid = r2(row.paid + l.commission);
      else row.unpaid = r2(row.unpaid + l.commission);
      per.set(l.technicianId, row);
    }
    const technicians = [...per.values()].sort((a, b) => b.commission - a.commission);
    return {
      from: q.from, to: q.to,
      technicians,
      totals: technicians.reduce((s, t) => ({ jobs: s.jobs + t.jobs, commission: r2(s.commission + t.commission), paid: r2(s.paid + t.paid), unpaid: r2(s.unpaid + t.unpaid) }), { jobs: 0, commission: 0, paid: 0, unpaid: 0 }),
      lines: lines.map((l) => ({ ...l, technicianName: nameOf.get(l.technicianId) ?? 'Technician' })),
    };
  }

  async pay(user: AuthenticatedUser, scope: ShopScope, dto: PayCommissionDto) {
    assertCan(user, [PERMISSIONS.COMMISSION_MANAGE], 'Commission dene');
    assertCan(user, [PERMISSIONS.EXPENSES_CREATE], 'Drawer se kharcha likhne');
    const tenantId = user.tenantId;
    const person = await this.prisma.staff.findFirst({ where: { id: dto.technicianId, tenantId }, select: { fullName: true } });
    if (!person) throw new NotFoundException('Technician nahi mila');
    const wanted = dto.jobIds ? new Set(dto.jobIds) : null;
    const lines = await this.lines(tenantId, dto.from, dto.to, dto.technicianId);
    const due = lines.filter((l) => !l.paidRef && l.commission > 0 && (!wanted || wanted.has(l.jobId)));
    if (wanted && due.length !== wanted.size) throw new BadRequestException('Kuch jobs ki commission di ja chuki — page refresh karein');
    const amount = r2(due.reduce((s, l) => s + l.commission, 0));
    if (amount <= 0) throw new BadRequestException('Is period me koi baqi commission nahi');

    // Claim the jobs first, under a lock, so two payouts at once cannot pay the same job.
    const hold = `HOLD-${randomUUID()}`;
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`svc-commission:${tenantId}`}))::text`;
      const taken = await tx.serviceJobTimeLog.count({ where: { jobId: { in: due.map((l) => l.jobId) }, action: PAID } });
      if (taken) throw new BadRequestException('Ye commission abhi kisi aur ne di hai — page refresh karein');
      await tx.serviceJobTimeLog.createMany({ data: due.map((l) => ({ jobId: l.jobId, technicianId: dto.technicianId, action: PAID, notes: hold })) });
    });
    const undo = () => this.prisma.serviceJobTimeLog.deleteMany({ where: { action: PAID, notes: hold } });

    let expenseNumber: string;
    try {
      const expense = await this.expenses.create(user, scope, {
        title: `Commission: ${person.fullName.trim()} (${dto.from} – ${dto.to})`.slice(0, 120),
        description: [`${due.length} jobs: ${due.map((l) => l.jobNumber).join(', ')}`, dto.note?.trim()].filter(Boolean).join(' · ').slice(0, 500),
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
    await this.prisma.serviceJobTimeLog.updateMany({ where: { action: PAID, notes: hold }, data: { notes: expenseNumber } });
    await this.prisma.serviceTechnicianProfile.updateMany({ where: { tenantId, staffId: dto.technicianId }, data: { totalCommission: { increment: amount } } });
    return this.slip(user, expenseNumber);
  }

  /** Past payouts, newest first. */
  async payouts(user: AuthenticatedUser, technicianId?: string) {
    assertCan(user, [PERMISSIONS.COMMISSION_VIEW, PERMISSIONS.COMMISSION_MANAGE], 'Commission dekhne');
    const logs = await this.prisma.serviceJobTimeLog.findMany({
      where: { action: PAID, NOT: { notes: { startsWith: 'HOLD-' } }, job: { tenantId: user.tenantId }, ...(technicianId && { technicianId }) },
      select: { notes: true, technicianId: true, timestamp: true },
      orderBy: { timestamp: 'desc' },
      take: 5000,
    });
    const refs = [...new Set(logs.map((l) => l.notes!).filter(Boolean))].slice(0, 200);
    const [expenses, staff] = await Promise.all([
      this.prisma.expense.findMany({ where: { tenantId: user.tenantId, expenseNumber: { in: refs } }, select: { expenseNumber: true, amount: true, paymentMethod: true, status: true, title: true } }),
      this.prisma.staff.findMany({ where: { tenantId: user.tenantId, id: { in: [...new Set(logs.map((l) => l.technicianId!).filter(Boolean))] } }, select: { id: true, fullName: true } }),
    ]);
    const expOf = new Map(expenses.map((e) => [e.expenseNumber, e]));
    const nameOf = new Map(staff.map((s) => [s.id, s.fullName.trim()]));
    return refs.map((ref) => {
      const rows = logs.filter((l) => l.notes === ref);
      const e = expOf.get(ref);
      return { ref, technicianId: rows[0].technicianId, technicianName: nameOf.get(rows[0].technicianId ?? '') ?? 'Technician', paidAt: rows[0].timestamp, jobs: rows.length, amount: e ? Number(e.amount) : 0, expense: e ?? null };
    });
  }

  /** One payout as a printable slip. */
  async slip(user: AuthenticatedUser, ref: string) {
    assertCan(user, [PERMISSIONS.COMMISSION_VIEW, PERMISSIONS.COMMISSION_MANAGE], 'Commission dekhne');
    const logs = await this.prisma.serviceJobTimeLog.findMany({
      where: { action: PAID, notes: ref, job: { tenantId: user.tenantId } },
      select: { technicianId: true, timestamp: true, job: { select: { id: true, jobNumber: true, customerName: true, serviceName: true, totalCharge: true } } },
    });
    if (!logs.length) throw new NotFoundException('Payout nahi mili');
    const [expense, person, sales] = await Promise.all([
      this.prisma.expense.findFirst({ where: { tenantId: user.tenantId, expenseNumber: ref }, select: { expenseNumber: true, title: true, amount: true, paymentMethod: true, status: true, expenseDate: true } }),
      this.prisma.staff.findFirst({ where: { tenantId: user.tenantId, id: logs[0].technicianId ?? '' }, select: { fullName: true } }),
      this.prisma.sale.findMany({
        where: { tenantId: user.tenantId, status: { not: 'VOIDED' }, OR: logs.map((l) => ({ saleNumber: { startsWith: jobBillPrefix(l.job.jobNumber) } })) },
        select: { saleNumber: true },
      }),
    ]);
    const saleOf = new Map(sales.map((s) => [jobNumberOfBill(s.saleNumber), s.saleNumber]));
    return {
      ref,
      technicianId: logs[0].technicianId,
      technicianName: person?.fullName ?? 'Technician',
      paidAt: logs[0].timestamp,
      amount: expense ? Number(expense.amount) : 0,
      expense,
      jobs: logs.map((l) => ({ ...l.job, saleNumber: saleOf.get(l.job.jobNumber) ?? null })),
    };
  }

  /** The shop's own commission category, else a "Technician commission" one. */
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
