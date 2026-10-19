/**
 * Installment plans on a credit bill. The bill's udhaar is already on the
 * customer's khata; the plan only splits it into dated installments. Every
 * installment received is a khata payment (drawer or account by method), so
 * the khata, cash register and day book always agree with the plan.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmiInstallmentStatus, EmiPlanStatus, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import { addDaysTz, startOfDayTz, startOfMonthTz } from '../../../common/helpers/business-time.helper';
import { recordKhataPayment, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { CreateEmiPlanDto } from './dto/create-emi-plan.dto';
import { UpdateEmiPlanDto } from './dto/update-emi-plan.dto';
import { CollectEmiPaymentDto, RecordInstallmentPaymentDto } from './dto/record-installment-payment.dto';
import { QueryEmiPlansDto } from './dto/query-emi.dto';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const OPEN: EmiInstallmentStatus[] = [EmiInstallmentStatus.PENDING, EmiInstallmentStatus.OVERDUE];

/** Shop-time midnight of a yyyy-MM-dd date, `months` later (31st → last day of a short month). */
function dueDate(start: string, months: number): Date {
  const [y, m, d] = start.slice(0, 10).split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1, 12));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return startOfDayTz(first);
}

type PlanRow = Prisma.EmiPlanGetPayload<{ include: { installments: true } }>;

@Injectable()
export class EmiService {
  constructor(private readonly prisma: PrismaService) {}

  /** PENDING installments whose day has passed (shop time) become OVERDUE. */
  private async autoMarkOverdue(user: AuthenticatedUser): Promise<void> {
    await this.prisma.emiInstallment.updateMany({
      where: {
        plan: { tenantId: user.tenantId, status: EmiPlanStatus.ACTIVE },
        status: EmiInstallmentStatus.PENDING,
        dueDate: { lt: startOfDayTz(new Date()) },
      },
      data: { status: EmiInstallmentStatus.OVERDUE },
    }).catch(() => undefined);
  }

  /** Overdue, next due and paid counts of one plan. */
  private enrich<P extends { installments: Array<{ amount: number; paidAmount: number; dueDate: Date; status: EmiInstallmentStatus }> }>(plan: P) {
    const today = startOfDayTz(new Date());
    const open = plan.installments.filter((i) => OPEN.includes(i.status));
    const overdue = open.filter((i) => i.dueDate < today);
    const next = [...open].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
    return {
      ...plan,
      overdueCount: overdue.length,
      overdueAmount: r2(overdue.reduce((s, i) => s + (Number(i.amount) - Number(i.paidAmount)), 0)),
      nextDueDate: next?.dueDate ?? null,
      nextDueAmount: next ? r2(Number(next.amount) - Number(next.paidAmount)) : 0,
      paidInstallmentCount: plan.installments.filter((i) => i.status === EmiInstallmentStatus.PAID).length,
    };
  }

  // ════════════════════════════════════════════════════════
  // CREATE — on a credit bill whose udhaar equals the financed amount
  // ════════════════════════════════════════════════════════

  async create(user: AuthenticatedUser, dto: CreateEmiPlanDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId } });
    if (!customer) throw new NotFoundException('Customer nahi mila');

    if (!dto.saleId) throw new BadRequestException('EMI sirf kisi udhaar bill par banti hai — pehle bill banayein');
    const sale = await this.prisma.sale.findFirst({ where: { id: dto.saleId, tenantId: user.tenantId } });
    if (!sale) throw new NotFoundException('Bill nahi mila');
    if (sale.status === 'VOIDED') throw new BadRequestException('Cancel hue bill par EMI nahi ban sakti');
    if (sale.customerId !== dto.customerId) throw new BadRequestException('EMI ka customer wohi ho jis ke naam bill hai');
    if (await this.prisma.emiPlan.findUnique({ where: { saleId: dto.saleId } })) {
      throw new BadRequestException('Is bill par EMI pehle se bani hui hai');
    }

    const downPayment = r2(dto.downPayment ?? 0);
    const financedAmount = r2(dto.totalAmount - downPayment);
    const billCredit = r2(Number(sale.creditAmount) || 0);
    if (financedAmount <= 0) throw new BadRequestException('Down payment kul qeemat se kam honi chahiye');
    if (Math.abs(financedAmount - billCredit) > 1) {
      throw new BadRequestException(
        `Is bill ka udhaar Rs ${billCredit} hai — EMI me bhi Rs ${billCredit} hi qiston me jaye (down payment Rs ${r2(Math.max(dto.totalAmount - billCredit, 0))} rakhein)`,
      );
    }
    const start = dto.startDate.slice(0, 10);
    if (dueDate(start, 0) < startOfDayTz(sale.soldAt)) {
      throw new BadRequestException('Pehli qist bill ki tareekh se pehle nahi ho sakti');
    }

    const installmentAmount = r2(financedAmount / dto.installmentCount);
    const prefix = `EMI-${new Date().getFullYear()}-`;
    const last = await this.prisma.emiPlan.findFirst({
      where: { tenantId: user.tenantId, planNumber: { startsWith: prefix } },
      orderBy: { planNumber: 'desc' },
      select: { planNumber: true },
    });
    const n = last ? parseInt(last.planNumber.split('-').pop() ?? '', 10) : 0;
    const planNumber = `${prefix}${String((Number.isNaN(n) ? 0 : n) + 1).padStart(4, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.emiPlan.create({
        data: {
          tenantId: user.tenantId,
          saleId: dto.saleId,
          customerId: dto.customerId,
          customerName: dto.customerName.trim() || customer.name,
          customerPhone: dto.customerPhone?.trim() || customer.phone,
          planNumber,
          totalAmount: r2(dto.totalAmount),
          downPayment,
          financedAmount,
          installmentCount: dto.installmentCount,
          installmentAmount,
          startDate: dueDate(start, 0),
          paidAmount: downPayment,
          remainingAmount: financedAmount,
          status: EmiPlanStatus.ACTIVE,
          notes: dto.notes?.trim() || null,
        },
      });
      let running = 0;
      await tx.emiInstallment.createMany({
        data: Array.from({ length: dto.installmentCount }, (_, k) => {
          const amount = k === dto.installmentCount - 1 ? r2(financedAmount - running) : installmentAmount;
          running = r2(running + amount);
          return { planId: plan.id, installmentNumber: k + 1, amount, dueDate: dueDate(start, k), status: EmiInstallmentStatus.PENDING };
        }),
      });
      return tx.emiPlan.findUnique({ where: { id: plan.id }, include: { installments: { orderBy: { installmentNumber: 'asc' } } } });
    });
  }

  // ════════════════════════════════════════════════════════
  // LIST + DETAIL + STATS
  // ════════════════════════════════════════════════════════

  private listWhere(user: AuthenticatedUser, query: QueryEmiPlansDto, withView = true): Prisma.EmiPlanWhereInput {
    const today = startOfDayTz(new Date());
    const q = query.search?.trim();
    const where: Prisma.EmiPlanWhereInput = {
      tenantId: user.tenantId,
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.status && { status: query.status }),
      ...(q && {
        OR: [
          { planNumber: { contains: q, mode: 'insensitive' as const } },
          { customerName: { contains: q, mode: 'insensitive' as const } },
          { customerPhone: { contains: q } },
        ],
      }),
    };
    const overdue: Prisma.EmiPlanWhereInput = { status: EmiPlanStatus.ACTIVE, installments: { some: { status: { in: OPEN }, dueDate: { lt: today } } } };
    const upcoming: Prisma.EmiPlanWhereInput = {
      status: EmiPlanStatus.ACTIVE,
      installments: { some: { status: { in: OPEN }, dueDate: { gte: today, lt: addDaysTz(today, 8) } } },
    };
    const and: Prisma.EmiPlanWhereInput[] = [];
    if (query.filter === 'ONLY_OVERDUE') and.push(overdue);
    if (query.filter === 'ONLY_UPCOMING') and.push(upcoming);
    if (withView && query.view === 'active') and.push({ status: EmiPlanStatus.ACTIVE });
    if (withView && query.view === 'overdue') and.push(overdue);
    if (withView && query.view === 'upcoming') and.push(upcoming);
    if (withView && query.view === 'done') and.push({ status: { not: EmiPlanStatus.ACTIVE } });
    return and.length ? { ...where, AND: and } : where;
  }

  async findAll(user: AuthenticatedUser, query: QueryEmiPlansDto) {
    await this.autoMarkOverdue(user);
    const where = this.listWhere(user, query);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);
    const orderBy: Prisma.EmiPlanOrderByWithRelationInput[] =
      query.sort === 'old' ? [{ createdAt: 'asc' }]
        : query.sort === 'remaining' ? [{ remainingAmount: 'desc' }]
          : query.sort === 'due' ? [{ status: 'asc' }, { startDate: 'asc' }]
            : [{ createdAt: 'desc' }];

    const base = this.listWhere(user, { ...query, view: undefined }, false);
    const [items, total, sums, views] = await Promise.all([
      this.prisma.emiPlan.findMany({
        where,
        include: {
          installments: {
            orderBy: { installmentNumber: 'asc' },
            select: { id: true, installmentNumber: true, amount: true, dueDate: true, paidDate: true, paidAmount: true, status: true },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.emiPlan.count({ where }),
      this.prisma.emiPlan.aggregate({ where, _sum: { financedAmount: true, paidAmount: true, remainingAmount: true, downPayment: true } }),
      Promise.all((['active', 'overdue', 'upcoming', 'done'] as const).map((v) =>
        this.prisma.emiPlan.count({ where: this.listWhere(user, { ...query, view: v }) }))),
    ]);

    let rows = items.map((p) => this.enrich(p));
    // "Next due first" needs the installment dates, so it sorts the page in memory.
    if (query.sort === 'due') rows = rows.sort((a, b) => (a.nextDueDate?.getTime() ?? Infinity) - (b.nextDueDate?.getTime() ?? Infinity));
    const all = await this.prisma.emiPlan.count({ where: base });
    return {
      items: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      counts: { active: views[0], overdue: views[1], upcoming: views[2], done: views[3], all },
      totals: {
        financed: r2(Number(sums._sum.financedAmount ?? 0)),
        // Paid toward the installments; the down payment was paid with the bill.
        collected: r2(Number(sums._sum.paidAmount ?? 0) - Number(sums._sum.downPayment ?? 0)),
        remaining: r2(Number(sums._sum.remainingAmount ?? 0)),
      },
    };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    await this.autoMarkOverdue(user);
    const plan = await this.prisma.emiPlan.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { installments: { orderBy: { installmentNumber: 'asc' } } },
    });
    if (!plan) throw new NotFoundException('EMI plan nahi mila');

    const [customer, sale, payments] = await Promise.all([
      this.prisma.customer.findFirst({
        where: { id: plan.customerId, tenantId: user.tenantId },
        select: { id: true, name: true, phone: true, email: true, cnic: true, address: true, balance: true },
      }),
      plan.saleId
        ? this.prisma.sale.findFirst({
            where: { id: plan.saleId, tenantId: user.tenantId },
            select: {
              id: true, saleNumber: true, status: true, soldAt: true, total: true, paidAmount: true, creditAmount: true,
              items: { select: { id: true, quantity: true, price: true, total: true, note: true, product: { select: { id: true, name: true } } } },
            },
          })
        : null,
      // Money received against this plan, as it stands on the khata.
      this.prisma.customerLedger.findMany({
        where: { tenantId: user.tenantId, customerId: plan.customerId, reference: plan.planNumber },
        select: { id: true, type: true, amount: true, note: true, paymentMethod: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { ...this.enrich(plan), customer, sale, payments };
  }

  async stats(user: AuthenticatedUser) {
    await this.autoMarkOverdue(user);
    const today = startOfDayTz(new Date());
    const week = addDaysTz(today, 8);
    const active = { tenantId: user.tenantId, status: EmiPlanStatus.ACTIVE };

    const [byStatus, totals, overdueAgg, upcomingAgg, collected] = await Promise.all([
      this.prisma.emiPlan.groupBy({ by: ['status'], where: { tenantId: user.tenantId }, _count: { _all: true } }),
      this.prisma.emiPlan.aggregate({ where: active, _sum: { financedAmount: true, paidAmount: true, remainingAmount: true, downPayment: true } }),
      this.prisma.emiInstallment.aggregate({
        where: { plan: active, status: { in: OPEN }, dueDate: { lt: today } },
        _sum: { amount: true, paidAmount: true },
        _count: { _all: true },
      }),
      this.prisma.emiInstallment.aggregate({
        where: { plan: active, status: { in: OPEN }, dueDate: { gte: today, lt: week } },
        _sum: { amount: true, paidAmount: true },
        _count: { _all: true },
      }),
      // Installment money that reached the khata this month (cash or account).
      this.prisma.customerLedger.aggregate({
        where: {
          tenantId: user.tenantId, type: 'PAYMENT_RECEIVED', reference: { startsWith: 'EMI-' },
          createdAt: { gte: startOfMonthTz(new Date()) },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    return {
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      activeFinanced: r2(Number(totals._sum.financedAmount ?? 0)),
      activePaid: r2(Number(totals._sum.paidAmount ?? 0)),
      activeRemaining: r2(Number(totals._sum.remainingAmount ?? 0)),
      overdueCount: overdueAgg._count._all,
      overdueAmount: r2(Number(overdueAgg._sum.amount ?? 0) - Number(overdueAgg._sum.paidAmount ?? 0)),
      upcomingCount: upcomingAgg._count._all,
      upcomingAmount: r2(Number(upcomingAgg._sum.amount ?? 0) - Number(upcomingAgg._sum.paidAmount ?? 0)),
      collectedThisMonth: r2(-Number(collected._sum.amount ?? 0)),
      collectedCountThisMonth: collected._count._all,
    };
  }

  // ════════════════════════════════════════════════════════
  // UPDATE — notes, contact and (before any payment) the first due date
  // ════════════════════════════════════════════════════════

  async update(user: AuthenticatedUser, id: string, dto: UpdateEmiPlanDto) {
    const plan = await this.findOne(user, id);
    if (plan.status !== EmiPlanStatus.ACTIVE) throw new BadRequestException('Sirf chalta hua plan badla ja sakta hai');
    const paid = plan.installments.some((i) => Number(i.paidAmount) > 0 || i.status === EmiInstallmentStatus.WAIVED);
    if (dto.totalAmount !== undefined || dto.downPayment !== undefined || dto.installmentCount !== undefined || dto.saleId !== undefined || dto.customerId !== undefined) {
      throw new BadRequestException('Amount, qiston ki tadaad ya bill yahan se nahi badalte — plan cancel kar ke naya banayein');
    }
    if (dto.startDate && paid) throw new BadRequestException('Qist mil chuki — tareekhen ab nahi badalti');

    return this.prisma.$transaction(async (tx) => {
      if (dto.startDate) {
        const start = dto.startDate.slice(0, 10);
        for (const i of plan.installments) {
          await tx.emiInstallment.update({
            where: { id: i.id },
            data: { dueDate: dueDate(start, i.installmentNumber - 1), status: EmiInstallmentStatus.PENDING },
          });
        }
      }
      return tx.emiPlan.update({
        where: { id },
        data: {
          customerName: dto.customerName?.trim() || undefined,
          customerPhone: dto.customerPhone?.trim() || undefined,
          notes: dto.notes !== undefined ? dto.notes.trim() || null : undefined,
          startDate: dto.startDate ? dueDate(dto.startDate.slice(0, 10), 0) : undefined,
        },
      });
    });
  }

  // ════════════════════════════════════════════════════════
  // PAYMENTS — every rupee goes through the khata
  // ════════════════════════════════════════════════════════

  private async payShop(user: AuthenticatedUser, plan: { saleId: string | null }, scope?: ShopScope) {
    let shopId: string | null = null;
    if (scope) shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope).catch(() => null);
    if (!shopId && plan.saleId) {
      shopId = (await this.prisma.sale.findFirst({ where: { id: plan.saleId, tenantId: user.tenantId }, select: { shopId: true } }))?.shopId ?? null;
    }
    return shopId;
  }

  private async loadActive(user: AuthenticatedUser, planId: string): Promise<PlanRow> {
    const plan = await this.prisma.emiPlan.findFirst({
      where: { id: planId, tenantId: user.tenantId },
      include: { installments: { orderBy: { installmentNumber: 'asc' } } },
    });
    if (!plan) throw new NotFoundException('EMI plan nahi mila');
    if (plan.status !== EmiPlanStatus.ACTIVE) throw new BadRequestException(`Ye plan ${plan.status} hai — is par qist nahi li ja sakti`);
    return plan;
  }

  /**
   * Puts `amount` on the given installments in order, writes one khata
   * payment and moves the plan's totals. Returns the touched installments.
   */
  private async applyPayment(
    user: AuthenticatedUser,
    plan: PlanRow,
    targets: PlanRow['installments'],
    amount: number,
    opts: { method?: PaymentMethod; notes?: string; paidDate?: Date; shopId: string | null },
  ) {
    const paidAt = opts.paidDate ?? new Date();
    return this.prisma.$transaction(async (tx) => {
      let left = r2(amount);
      const touched: number[] = [];
      for (const i of targets) {
        if (left <= 0.005) break;
        const due = r2(Number(i.amount) - Number(i.paidAmount));
        if (due <= 0.005) continue;
        const take = Math.min(due, left);
        const paid = r2(Number(i.paidAmount) + take);
        const full = paid >= Number(i.amount) - 0.005;
        await tx.emiInstallment.update({
          where: { id: i.id },
          data: {
            paidAmount: paid,
            paidDate: full ? paidAt : i.paidDate,
            status: full ? EmiInstallmentStatus.PAID : i.status,
            ...(opts.notes && { notes: opts.notes }),
          },
        });
        touched.push(i.installmentNumber);
        left = r2(left - take);
      }

      const rest = await tx.emiInstallment.findMany({ where: { planId: plan.id }, select: { status: true } });
      const done = rest.every((i) => i.status === EmiInstallmentStatus.PAID || i.status === EmiInstallmentStatus.WAIVED);
      const updated = await tx.emiPlan.update({
        where: { id: plan.id },
        data: {
          paidAmount: r2(Number(plan.paidAmount) + amount),
          remainingAmount: Math.max(r2(Number(plan.remainingAmount) - amount), 0),
          ...(done && { status: EmiPlanStatus.COMPLETED }),
        },
      });

      const shopId = await resolveIndustryShopId(tx, user, opts.shopId);
      const label = `qist ${touched.join(', ')} (${plan.installmentCount} me se)`;
      await recordKhataPayment(tx, user, {
        customerId: plan.customerId, shopId, amount, reference: plan.planNumber,
        note: `EMI ${plan.planNumber} — ${label}${opts.notes ? ` · ${opts.notes}` : ''}`, method: opts.method ?? 'CASH',
      });
      return { plan: updated, installments: touched };
    });
  }

  /** Payment against one installment (older screens and the mobile app). */
  async recordInstallmentPayment(
    user: AuthenticatedUser,
    planId: string,
    installmentId: string,
    dto: RecordInstallmentPaymentDto,
    scope?: ShopScope,
  ) {
    const plan = await this.loadActive(user, planId);
    const installment = plan.installments.find((i) => i.id === installmentId);
    if (!installment) throw new NotFoundException('Qist nahi mili');
    if (installment.status === EmiInstallmentStatus.PAID) throw new BadRequestException('Ye qist poori mil chuki');
    if (installment.status === EmiInstallmentStatus.WAIVED) throw new BadRequestException('Ye qist maaf ho chuki');
    const due = r2(Number(installment.amount) - Number(installment.paidAmount));
    if (dto.amount > due + 0.01) throw new BadRequestException(`Is qist me sirf Rs ${due} baqi hai`);

    const shopId = await this.payShop(user, plan, scope);
    const res = await this.applyPayment(user, plan, [installment], r2(dto.amount), {
      method: dto.paymentMethod, notes: dto.notes?.trim(), paidDate: dto.paidDate ? new Date(dto.paidDate) : undefined, shopId,
    });
    const updatedInstallment = await this.prisma.emiInstallment.findUnique({ where: { id: installmentId } });
    return { installment: updatedInstallment, plan: res.plan };
  }

  /** Any amount: settles the oldest open installments first. */
  async collect(user: AuthenticatedUser, planId: string, dto: CollectEmiPaymentDto, scope?: ShopScope) {
    const plan = await this.loadActive(user, planId);
    const open = plan.installments.filter((i) => OPEN.includes(i.status));
    const due = r2(open.reduce((s, i) => s + Number(i.amount) - Number(i.paidAmount), 0));
    if (due <= 0) throw new BadRequestException('Is plan me koi qist baqi nahi');
    if (dto.amount > due + 0.01) throw new BadRequestException(`Kul baqi sirf Rs ${due} hai`);
    const shopId = await this.payShop(user, plan, scope);
    return this.applyPayment(user, plan, open, r2(dto.amount), { method: dto.paymentMethod, notes: dto.notes?.trim(), shopId });
  }

  /** Forgives what is left of one installment; the khata drops by the same amount. */
  async waiveInstallment(user: AuthenticatedUser, planId: string, installmentId: string, reason?: string) {
    const plan = await this.loadActive(user, planId);
    const installment = plan.installments.find((i) => i.id === installmentId);
    if (!installment) throw new NotFoundException('Qist nahi mili');
    if (installment.status === EmiInstallmentStatus.PAID) throw new BadRequestException('Mili hui qist maaf nahi hoti');
    if (installment.status === EmiInstallmentStatus.WAIVED) throw new BadRequestException('Ye qist pehle hi maaf hai');
    const why = reason?.trim();
    if (!why) throw new BadRequestException('Maaf karne ki wajah likhein');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.emiInstallment.update({
        where: { id: installmentId },
        data: { status: EmiInstallmentStatus.WAIVED, notes: why },
      });
      const left = r2(Number(installment.amount) - Number(installment.paidAmount));
      const rest = await tx.emiInstallment.findMany({ where: { planId }, select: { status: true } });
      const done = rest.every((i) => i.status === EmiInstallmentStatus.PAID || i.status === EmiInstallmentStatus.WAIVED);
      await tx.emiPlan.update({
        where: { id: planId },
        data: { remainingAmount: Math.max(r2(Number(plan.remainingAmount) - left), 0), ...(done && { status: EmiPlanStatus.COMPLETED }) },
      });

      // The forgiven money leaves the khata too, or it keeps asking for it.
      if (left > 0.005) {
        const shopId = plan.saleId
          ? (await tx.sale.findFirst({ where: { id: plan.saleId }, select: { shopId: true } }))?.shopId ?? null
          : null;
        const { balance } = await tx.customer.update({
          where: { id: plan.customerId }, data: { balance: { decrement: left } }, select: { balance: true },
        });
        await tx.customerLedger.create({
          data: {
            tenantId: user.tenantId, shopId, customerId: plan.customerId, createdById: user.id,
            type: 'ADJUSTMENT', amount: -left, balanceAfter: balance, reference: plan.planNumber,
            note: `EMI qist ${installment.installmentNumber}/${plan.installmentCount} maaf: ${why}`,
          },
        });
      }
      return updated;
    });
  }

  // ════════════════════════════════════════════════════════
  // CLOSE — the udhaar stays on the khata; only the schedule stops
  // ════════════════════════════════════════════════════════

  async markDefaulted(user: AuthenticatedUser, id: string, reason?: string) {
    const plan = await this.findOne(user, id);
    if (plan.status !== EmiPlanStatus.ACTIVE) throw new BadRequestException('Sirf chalta hua plan default ho sakta hai');
    return this.prisma.emiPlan.update({
      where: { id },
      data: { status: EmiPlanStatus.DEFAULTED, notes: [plan.notes, `[DEFAULT] ${reason?.trim() || 'Qistein band'}`].filter(Boolean).join('\n') },
    });
  }

  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const plan = await this.findOne(user, id);
    if (plan.status === EmiPlanStatus.COMPLETED) throw new BadRequestException('Mukammal plan cancel nahi hota');
    if (plan.status === EmiPlanStatus.CANCELLED) return plan;
    return this.prisma.emiPlan.update({
      where: { id },
      data: { status: EmiPlanStatus.CANCELLED, notes: [plan.notes, `[CANCEL] ${reason?.trim() || 'Plan band kiya'}`].filter(Boolean).join('\n') },
    });
  }

  /** Kept for cron and older clients. */
  async updateOverdueFlags(user: AuthenticatedUser) {
    await this.autoMarkOverdue(user);
    return { updatedAt: new Date().toISOString() };
  }

  /** A plan is never erased: removing one cancels it and keeps its history. */
  async remove(user: AuthenticatedUser, id: string) {
    const plan = await this.cancel(user, id, 'Hataya gaya');
    return { message: 'EMI plan cancel ho gaya', planNumber: plan.planNumber };
  }
}
