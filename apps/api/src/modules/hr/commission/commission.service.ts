/**
 * Staff commission: rules, who is enrolled, the month's earnings worked out
 * from real sales, payouts, a statement per person and analytics.
 *
 * Nothing earned is stored. Every figure comes from the bills each time, so
 * a voided bill drops out by itself. Returns are taken off in the month the
 * goods came back (see commission.queries.ts), so a paid month stays as it
 * was paid. Payouts are stored per person per month ("2026-10") as the total
 * paid for that month.
 *
 * Months follow the shop's business day (time zone and day start hour).
 * Commission is per person across all branches; a branch view only narrows
 * which people are listed.
 *
 * Access: `commission.manage` writes rules, enrolment and payouts;
 * `commission.view` sees everyone; `commission.own` sees only their own
 * row. Cost and profit figures are removed for users without `cost.view`.
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CommissionRule, CommissionValueType, SaleStatus } from '@prisma/client';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { ShopScope } from '../../../common/shop-scope';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey, startOfBusinessMonthTz } from '../../../common/helpers/business-time.helper';
import { UpsertRuleDto } from './dto/upsert-rule.dto';
import { EnrollDto } from './dto/enroll.dto';
import { PayoutDto } from './dto/payout.dto';
import {
  billsBySeller, fullReturnsBySeller, returnsByCategory, salesByCategory, salesBySellerShop, type Window,
} from './commission.queries';
import { apply, emptyMonth, r2, ruleLabel, rulesFor, type PersonMonth, type Result } from './commission.engine';

const PERIOD = /^(\d{4})-(\d{2})$/;
/** Payroll writes this note on the payout when commission is paid inside a salary. */
const PAYROLL_NOTE = 'Tankhwah PAY-';
const num = (v: unknown) => Number(v ?? 0) || 0;

/** Month key arithmetic on "YYYY-MM". */
function shiftPeriod(period: string, by: number) {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function periodsBetween(from: string, to: string) {
  const out: string[] = [];
  for (let p = from; p <= to && out.length < 36; p = shiftPeriod(p, 1)) out.push(p);
  return out;
}

interface Computed {
  months: string[];
  per: Map<string, Map<string, PersonMonth>>;
  orphan: Map<string, { bills: number; sale: number }>;
}

type PayStatus = 'none' | 'partial' | 'full' | 'over';

/** Raised inside the payout transaction when another request created the same month's row first. */
class DuplicatePayout extends Error {}

@Injectable()
export class CommissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tzService: TenantTimezoneService,
  ) {}

  /* ─────────────── Access ─────────────── */

  private seesEveryone(user: AuthenticatedUser) {
    return hasPermission(user.role, user.permissions, PERMISSIONS.COMMISSION_VIEW)
      || hasPermission(user.role, user.permissions, PERMISSIONS.COMMISSION_MANAGE);
  }

  private seesCost(user: AuthenticatedUser) {
    return hasPermission(user.role, user.permissions, PERMISSIONS.COST_VIEW);
  }

  /* ─────────────── Rules ─────────────── */

  listRules(user: AuthenticatedUser) {
    const mine = !this.seesEveryone(user);
    return this.prisma.commissionRule.findMany({
      where: { tenantId: user.tenantId, ...(mine ? { OR: [{ userId: user.id }, { userId: null }] } : {}) },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async upsertRule(user: AuthenticatedUser, dto: UpsertRuleDto, id?: string) {
    const perBill = dto.basis === 'PER_BILL';
    const valueType = (perBill ? 'FIXED' : dto.valueType ?? 'PERCENT') as CommissionValueType;
    if (!(dto.value > 0)) throw new BadRequestException('Commission ki amount 0 se zyada honi chahiye');
    if (valueType === 'PERCENT' && dto.value > 100) throw new BadRequestException('Percent 100 se zyada nahi ho sakta');
    if (dto.targetAmount && !dto.targetBonus) throw new BadRequestException('Target likha hai to bonus bhi likhein');
    if (dto.targetBonus && !dto.targetAmount) throw new BadRequestException('Bonus ke liye target bhi likhein');

    if (dto.userId) {
      const person = await this.prisma.user.findFirst({ where: { id: dto.userId, tenantId: user.tenantId }, select: { id: true } });
      if (!person) throw new NotFoundException('Ye banda is dukaan me nahi mila');
    }
    const categoryIds = [...new Set(dto.categoryIds ?? [])];
    if (categoryIds.length) {
      const found = await this.prisma.category.count({ where: { id: { in: categoryIds }, tenantId: user.tenantId } });
      if (found !== categoryIds.length) throw new BadRequestException('Kuch categories is dukaan ki nahi');
    }

    const data = {
      name: dto.name?.trim() || null,
      userId: dto.userId || null,
      basis: dto.basis,
      valueType,
      value: dto.value,
      categoryIds: perBill ? [] : categoryIds,
      minMonthlySale: dto.minMonthlySale || null,
      targetAmount: dto.targetAmount || null,
      targetBonus: dto.targetAmount ? dto.targetBonus ?? null : null,
      isActive: dto.isActive ?? true,
      note: dto.note?.trim() || null,
    };

    if (id) {
      const existing = await this.prisma.commissionRule.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
      if (!existing) throw new NotFoundException('Rule nahi mila');
      return this.prisma.commissionRule.update({ where: { id }, data });
    }
    return this.prisma.commissionRule.create({ data: { tenantId: user.tenantId, ...data } });
  }

  async removeRule(user: AuthenticatedUser, id: string) {
    const { count } = await this.prisma.commissionRule.deleteMany({ where: { id, tenantId: user.tenantId } });
    if (!count) throw new NotFoundException('Rule nahi mila');
    return { ok: true };
  }

  /* ─────────────── People ─────────────── */

  /**
   * Everyone who can sell (a login) with their HR record, plus HR records
   * with no login. Sales are always recorded against a login, so a person
   * without one cannot earn commission; the page lists them so the owner
   * knows what to fix. Staff are matched to logins by link, email, then the
   * last ten digits of the phone.
   */
  async listPeople(user: AuthenticatedUser) {
    const [users, staff, enrollments] = await Promise.all([
      this.prisma.user.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        select: { id: true, fullName: true, email: true, phone: true, role: true, shopId: true },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.staff.findMany({
        where: { tenantId: user.tenantId, status: { not: 'TERMINATED' } },
        select: {
          id: true, userId: true, staffNumber: true, fullName: true, designation: true, salaryType: true,
          baseSalary: true, phone: true, email: true, status: true, avatarUrl: true, shopId: true,
        },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.commissionEnrollment.findMany({ where: { tenantId: user.tenantId } }),
    ]);

    const enrollByUser = new Map(enrollments.map((e) => [e.userId, e]));
    const digits = (v?: string | null) => (v ?? '').replace(/[^0-9]/g, '').slice(-10);
    type St = (typeof staff)[number];
    const byUser = new Map<string, St>();
    const byEmail = new Map<string, St>();
    const byPhone = new Map<string, St>();
    staff.forEach((st) => {
      if (st.userId) byUser.set(st.userId, st);
      if (st.email) byEmail.set(st.email.toLowerCase().trim(), st);
      const d = digits(st.phone);
      if (d.length >= 10) byPhone.set(d, st);
    });

    const staffCard = (st: St, guess: boolean) => ({
      id: st.id, staffNumber: st.staffNumber, designation: st.designation, salaryType: st.salaryType,
      baseSalary: st.baseSalary, status: st.status, avatarUrl: st.avatarUrl, linkedByGuess: guess,
    });

    const matched = new Set<string>();
    const people = users.map((u) => {
      const st = byUser.get(u.id) ?? byEmail.get((u.email ?? '').toLowerCase().trim()) ?? byPhone.get(digits(u.phone));
      if (st) matched.add(st.id);
      const en = enrollByUser.get(u.id);
      return {
        userId: u.id,
        name: st?.fullName ?? u.fullName,
        email: u.email,
        phone: u.phone ?? st?.phone ?? null,
        role: u.role,
        shopId: st?.shopId ?? u.shopId ?? null,
        canSell: true,
        staff: st ? staffCard(st, !st.userId) : null,
        enrolled: !!en?.isActive,
        since: en?.since ?? null,
      };
    });

    const withoutLogin = staff.filter((st) => !matched.has(st.id)).map((st) => ({
      userId: null, name: st.fullName, email: st.email, phone: st.phone, role: null, shopId: st.shopId,
      canSell: false, staff: staffCard(st, false), enrolled: false, since: null,
    }));

    return { people, withoutLogin };
  }

  /** Enrolled sellers for the POS "sold by" picker: names only. */
  async sellers(user: AuthenticatedUser) {
    const rows = await this.prisma.commissionEnrollment.findMany({
      where: { tenantId: user.tenantId, isActive: true, user: { isActive: true } },
      select: { userId: true, user: { select: { fullName: true } }, staff: { select: { fullName: true } } },
    });
    return rows
      .map((r) => ({ userId: r.userId, name: r.staff?.fullName ?? r.user.fullName }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async setEnrolled(user: AuthenticatedUser, dto: EnrollDto) {
    const target = await this.prisma.user.findFirst({ where: { id: dto.userId, tenantId: user.tenantId }, select: { id: true } });
    if (!target) throw new NotFoundException('Ye banda is dukaan me nahi mila');

    if (!dto.isActive) {
      await this.prisma.commissionEnrollment.deleteMany({ where: { tenantId: user.tenantId, userId: dto.userId } });
      return { ok: true, enrolled: false };
    }

    let staffId: string | null = null;
    if (dto.staffId) {
      const st = await this.prisma.staff.findFirst({ where: { id: dto.staffId, tenantId: user.tenantId }, select: { id: true, userId: true } });
      if (!st) throw new NotFoundException('HR record nahi mila');
      if (st.userId && st.userId !== dto.userId) throw new BadRequestException('Ye HR record kisi aur login se jura hai');
      staffId = st.id;
    }

    const row = await this.prisma.$transaction(async (tx) => {
      /* A staff record matched by email or phone is linked for good here. */
      if (staffId) await tx.staff.updateMany({ where: { id: staffId, tenantId: user.tenantId, userId: null }, data: { userId: dto.userId } });
      return tx.commissionEnrollment.upsert({
        where: { tenantId_userId: { tenantId: user.tenantId, userId: dto.userId } },
        create: { tenantId: user.tenantId, userId: dto.userId, staffId, isActive: true, note: dto.note ?? null },
        update: { isActive: true, staffId, note: dto.note ?? null },
      });
    });
    return { ok: true, enrolled: true, id: row.id };
  }

  /* ─────────────── Payouts ─────────────── */

  /**
   * Records the total paid to a person for a month. Sending the same total
   * twice changes nothing, so a double click cannot pay twice. `expectedPaid`
   * is what the screen showed as already paid; if someone else changed it in
   * between, the payment is refused.
   */
  async pay(user: AuthenticatedUser, dto: PayoutDto) {
    const target = await this.prisma.user.findFirst({ where: { id: dto.userId, tenantId: user.tenantId }, select: { id: true, fullName: true } });
    if (!target) throw new NotFoundException('Ye banda is dukaan me nahi mila');
    const clock = await this.tzService.clock(user.tenantId);
    if (dto.period > businessDayKey(new Date(), clock.tz, clock.dayStartHour).slice(0, 7)) {
      throw new BadRequestException('Aane wale mahine ki payment nahi likh sakte');
    }
    const amount = r2(dto.amount);
    if (!(amount > 0)) throw new BadRequestException('Amount 0 se zyada likhein — payment hatani ho to "Payment wapas" karein');
    const note = dto.note?.trim() || null;
    if (note?.startsWith(PAYROLL_NOTE)) throw new BadRequestException('Note "Tankhwah PAY-" se shuru nahi ho sakta');
    const changed = () => new ConflictException('Is mahine ki payment abhi kisi ne badli hai. Safha taaza kar ke dobara dekhein.');

    const key = { tenantId_userId_period: { tenantId: user.tenantId, userId: dto.userId, period: dto.period } };
    const write = () => this.prisma.$transaction(async (tx) => {
      const current = await tx.commissionPayout.findUnique({ where: key, select: { id: true, amount: true, note: true } });
      if (current?.note?.startsWith(PAYROLL_NOTE)) {
        throw new BadRequestException('Is mahine ki commission tankhwah ke saath ada hui hai — badalna ho to Payroll se karein');
      }
      /* The same total again (a double click or a retry) is a no-op. */
      if (current && Math.abs(current.amount - amount) <= 0.009) return tx.commissionPayout.findUniqueOrThrow({ where: key });
      if (dto.expectedPaid != null && Math.abs((current?.amount ?? 0) - dto.expectedPaid) > 0.009) throw changed();

      /* Conditional writes: a second screen paying at the same moment loses
         instead of silently overwriting the first payment. */
      let saved;
      if (current) {
        const { count } = await tx.commissionPayout.updateMany({
          where: { id: current.id, amount: current.amount },
          data: { amount, note, paidAt: new Date(), paidBy: user.id },
        });
        if (!count) throw changed();
        saved = await tx.commissionPayout.findUniqueOrThrow({ where: key });
      } else {
        try {
          saved = await tx.commissionPayout.create({
            data: { tenantId: user.tenantId, userId: dto.userId, period: dto.period, amount, note, paidBy: user.id },
          });
        } catch (e) {
          if ((e as { code?: string }).code === 'P2002') throw new DuplicatePayout();
          throw e;
        }
      }
      await tx.activityLog.create({
        data: {
          tenantId: user.tenantId, userId: user.id, action: 'COMMISSION_PAID', entityType: 'CommissionPayout', entityId: saved.id,
          description: `${target.fullName} ki ${dto.period} commission: ${amount} ada likha (pehle ${current?.amount ?? 0})`,
          metadata: { period: dto.period, userId: dto.userId, amount, before: current?.amount ?? 0 },
        },
      });
      return saved;
    });
    try {
      return await write();
    } catch (e) {
      if (!(e instanceof DuplicatePayout)) throw e;
      /* Two requests created the month's row at once: the same total is the
         double click and succeeds, a different one is a real clash. */
      const won = await this.prisma.commissionPayout.findUnique({ where: key });
      if (won && Math.abs(won.amount - amount) <= 0.009) return won;
      throw changed();
    }
  }

  async undoPay(user: AuthenticatedUser, userId: string, period: string) {
    if (!PERIOD.test(period ?? '')) throw new BadRequestException('Mahina "2026-10" ki shakal me dein');
    const row = await this.prisma.commissionPayout.findFirst({ where: { tenantId: user.tenantId, userId, period }, include: { user: { select: { fullName: true } } } });
    if (!row) throw new NotFoundException('Is mahine ki koi payment nahi likhi');
    if (row.note?.startsWith(PAYROLL_NOTE)) throw new BadRequestException('Ye payment tankhwah ke saath hui thi — Payroll se wapas karein');
    await this.prisma.$transaction(async (tx) => {
      /* Only the payment that was read; one changed meanwhile (here or by payroll) is left alone. */
      const { count } = await tx.commissionPayout.deleteMany({ where: { id: row.id, amount: row.amount, note: row.note } });
      if (!count) throw new ConflictException('Is mahine ki payment abhi kisi ne badli hai. Safha taaza kar ke dobara dekhein.');
      await tx.activityLog.create({
        data: {
          tenantId: user.tenantId, userId: user.id, action: 'COMMISSION_PAY_UNDONE', entityType: 'CommissionPayout', entityId: row.id,
          description: `${row.user.fullName} ki ${period} commission ki adaigi (${row.amount}) wapas li`,
          metadata: { period, userId, amount: row.amount },
        },
      });
    });
    return { ok: true };
  }

  /** Payout history between two months, newest first. */
  async payouts(user: AuthenticatedUser, from?: string, to?: string, opts: { shop?: ShopScope } = {}) {
    const own = !this.seesEveryone(user);
    const branch = own ? null : opts.shop?.shopId ?? null;
    const rows = await this.prisma.commissionPayout.findMany({
      where: {
        tenantId: user.tenantId,
        ...(own ? { userId: user.id } : {}),
        /* A branch view lists people based in that branch (HR record first, else the login). */
        ...(branch ? { user: { OR: [{ staffProfile: { shopId: branch } }, { staffProfile: null, shopId: branch }] } } : {}),
        ...(from || to ? { period: { ...(from && PERIOD.test(from) ? { gte: from } : {}), ...(to && PERIOD.test(to) ? { lte: to } : {}) } } : {}),
      },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: [{ paidAt: 'desc' }],
      take: 500,
    });
    const payers = [...new Set(rows.map((r) => r.paidBy).filter(Boolean))] as string[];
    const names = new Map((await this.prisma.user.findMany({ where: { id: { in: payers }, tenantId: user.tenantId }, select: { id: true, fullName: true } })).map((u) => [u.id, u.fullName]));
    return rows.map((r) => ({
      id: r.id, userId: r.userId, name: r.user.fullName, period: r.period, amount: r.amount,
      note: r.note, paidAt: r.paidAt, paidBy: r.paidBy ? names.get(r.paidBy) ?? null : null,
    }));
  }

  /* ─────────────── Computing ─────────────── */

  private async window(tenantId: string, from: string, to: string) {
    for (const p of [from, to]) {
      const m = PERIOD.exec(p ?? '');
      if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) throw new BadRequestException('Mahina "2026-10" ki shakal me dein');
    }
    const { tz, dayStartHour } = await this.tzService.clock(tenantId);
    const [fy, fm] = from.split('-').map(Number);
    const [ny, nm] = shiftPeriod(to, 1).split('-').map(Number);
    const w: Window = {
      tenantId, tz, h: dayStartHour,
      gte: startOfBusinessMonthTz(fy, fm, tz, dayStartHour),
      lt: startOfBusinessMonthTz(ny, nm, tz, dayStartHour),
    };
    return w;
  }

  /** Raw figures for every person and month between two months. */
  private async compute(w: Window, from: string, to: string): Promise<Computed> {
    const [sales, returns, bills, full] = await Promise.all([
      salesByCategory(this.prisma, w), returnsByCategory(this.prisma, w),
      billsBySeller(this.prisma, w), fullReturnsBySeller(this.prisma, w),
    ]);
    const per = new Map<string, Map<string, PersonMonth>>();
    const orphan = new Map<string, { bills: number; sale: number }>();
    const get = (m: string, uid: string) => {
      let month = per.get(m);
      if (!month) per.set(m, (month = new Map()));
      let pm = month.get(uid);
      if (!pm) month.set(uid, (pm = emptyMonth()));
      return pm;
    };
    const add = (target: PersonMonth['sales'], cat: string | null, row: { sale: number; cost: number; qty: number }) => {
      const k = cat ?? '';
      const b = target.get(k) ?? { sale: 0, cost: 0, qty: 0 };
      b.sale += num(row.sale); b.cost += num(row.cost); b.qty += num(row.qty);
      target.set(k, b);
    };
    for (const r of sales) {
      if (!r.uid) {
        const o = orphan.get(r.m) ?? { bills: 0, sale: 0 };
        o.sale += num(r.sale); orphan.set(r.m, o);
        continue;
      }
      const pm = get(r.m, r.uid);
      add(pm.sales, r.cat, r);
      pm.noCost += num(r.noCost);
    }
    for (const r of returns) if (r.uid) add(get(r.m, r.uid).returns, r.cat, r);
    for (const r of bills) {
      if (!r.uid) {
        const o = orphan.get(r.m) ?? { bills: 0, sale: 0 };
        o.bills += num(r.bills); orphan.set(r.m, o);
        continue;
      }
      const pm = get(r.m, r.uid);
      pm.bills += num(r.bills); pm.reassigned += num(r.reassigned);
    }
    for (const r of full) if (r.uid) get(r.m, r.uid).fullReturns += num(r.n);
    return { months: periodsBetween(from, to), per, orphan };
  }

  private async context(tenantId: string) {
    const [rules, enrollments, users, staff, shops] = await Promise.all([
      this.prisma.commissionRule.findMany({ where: { tenantId } }),
      this.prisma.commissionEnrollment.findMany({ where: { tenantId, isActive: true }, select: { userId: true } }),
      this.prisma.user.findMany({ where: { tenantId }, select: { id: true, fullName: true, shopId: true, isActive: true } }),
      this.prisma.staff.findMany({
        where: { tenantId, userId: { not: null } },
        select: { id: true, userId: true, fullName: true, staffNumber: true, designation: true, salaryType: true, baseSalary: true, status: true, shopId: true },
      }),
      this.prisma.shop.findMany({ where: { tenantId }, select: { id: true, name: true } }),
    ]);
    return {
      rules,
      enrolled: new Set(enrollments.map((e) => e.userId)),
      users: new Map(users.map((u) => [u.id, u])),
      staff: new Map(staff.map((s) => [s.userId as string, s])),
      shops: new Map(shops.map((s) => [s.id, s.name])),
    };
  }

  private payState(earned: number, paid: number | null): PayStatus {
    if (paid == null) return 'none';
    if (paid > earned + 0.5) return 'over';
    return paid >= earned - 0.5 ? 'full' : 'partial';
  }

  private row(uid: string, res: Result, pm: PersonMonth, ctx: Awaited<ReturnType<CommissionService['context']>>, payout?: { amount: number; paidAt: Date; note: string | null } | null) {
    const st = ctx.staff.get(uid);
    const u = ctx.users.get(uid);
    const enrolled = ctx.enrolled.has(uid);
    const baseSalary = st && st.salaryType !== 'COMMISSION' ? num(st.baseSalary) : 0;
    const paidAmount = payout ? payout.amount : null;
    const status = this.payState(res.earned, paidAmount);
    const firstTarget = res.targets[0];
    return {
      userId: uid,
      name: st?.fullName ?? u?.fullName ?? 'Banda',
      enrolled,
      active: u?.isActive ?? false,
      shopId: st?.shopId ?? u?.shopId ?? null,
      staff: st ? {
        id: st.id, staffNumber: st.staffNumber, designation: st.designation,
        salaryType: st.salaryType, baseSalary: num(st.baseSalary), status: st.status,
      } : null,
      baseSalary,
      totalPay: baseSalary + res.earned,
      bills: res.bills,
      fullReturns: pm.fullReturns,
      reassigned: pm.reassigned,
      grossSale: res.grossSale,
      returnSale: res.returnSale,
      sale: res.sale,
      profit: res.profit as number | null,
      qty: r2(res.qty),
      noCost: pm.noCost,
      earned: res.earned,
      bonus: res.bonus,
      blockedByMin: res.blockedByMin,
      targetPct: firstTarget?.pct,
      targets: res.targets,
      lines: res.lines,
      paid: status === 'full' || status === 'over',
      payStatus: status,
      paidAt: payout?.paidAt ?? null,
      paidAmount,
      /** Paid inside a salary by payroll; changed only from payroll. */
      paidInSalary: !!payout?.note?.startsWith(PAYROLL_NOTE),
      due: r2(Math.max(0, res.earned - (paidAmount ?? 0))),
    };
  }

  /**
   * One month for everyone the caller may see.
   *
   * Kept call-compatible for the staff report, which calls
   * `summary(user, period)` and reads `scope`, `total` and each row's
   * `userId`, `earned`, `enrolled`, `paid` and `targetPct`.
   */
  async summary(user: AuthenticatedUser, period: string, opts: { shop?: ShopScope } = {}) {
    const prev = PERIOD.test(period ?? '') ? shiftPeriod(period, -1) : period;
    const w = await this.window(user.tenantId, prev, period);
    const monthStart = (await this.window(user.tenantId, period, period)).gte;
    const today = businessDayKey(new Date(), w.tz, w.h).slice(0, 7);
    if (period > today) throw new BadRequestException('Aane wala mahina abhi shuru nahi hua');

    const [c, ctx, payouts, shopRows] = await Promise.all([
      this.compute(w, prev, period),
      this.context(user.tenantId),
      this.prisma.commissionPayout.findMany({ where: { tenantId: user.tenantId, period } }),
      salesBySellerShop(this.prisma, { ...w, gte: monthStart }),
    ]);
    const payoutBy = new Map(payouts.map((p) => [p.userId, p]));
    const month = c.per.get(period) ?? new Map<string, PersonMonth>();

    const ids = new Set<string>([...month.keys(), ...ctx.enrolled, ...payoutBy.keys()]);
    const shopSplit = new Map<string, Array<{ shopId: string | null; name: string; sale: number; bills: number }>>();
    for (const r of shopRows) {
      if (!r.uid) continue;
      const list = shopSplit.get(r.uid) ?? [];
      list.push({ shopId: r.shopId, name: r.shopId ? ctx.shops.get(r.shopId) ?? 'Branch' : 'Bina branch', sale: r2(r.sale), bills: r.bills });
      shopSplit.set(r.uid, list);
    }

    const rows = [...ids].map((uid) => {
      const pm = month.get(uid) ?? emptyMonth();
      const res = apply(pm, rulesFor(ctx.rules, uid), ctx.enrolled.has(uid));
      return { ...this.row(uid, res, pm, ctx, payoutBy.get(uid)), shops: (shopSplit.get(uid) ?? []).sort((a, b) => b.sale - a.sale) };
    }).filter((r) => r.enrolled || r.bills > 0 || r.fullReturns > 0 || r.paidAmount != null || r.returnSale > 0);

    rows.sort((a, b) => Number(b.enrolled) - Number(a.enrolled) || b.earned - a.earned || b.sale - a.sale);

    /* The filtering happens here, not on the page, so other people's figures never reach the browser. */
    const onlyMine = !this.seesEveryone(user);
    const branch = opts.shop?.shopId ?? null;
    let visible = onlyMine ? rows.filter((r) => r.userId === user.id) : rows;
    if (branch && !onlyMine) visible = visible.filter((r) => r.shopId === branch || r.shops.some((s) => s.shopId === branch));
    if (!this.seesCost(user)) visible.forEach((r) => { r.profit = null; });

    const live = visible.filter((r) => r.enrolled);
    const total = live.reduce((a, r) => a + r.earned, 0);
    const paidTotal = r2(visible.reduce((a, r) => a + (r.paidAmount ?? 0), 0));
    const pendingTotal = r2(visible.reduce((a, r) => a + r.due, 0));

    const prevMonth = c.per.get(prev) ?? new Map<string, PersonMonth>();
    const visibleIds = new Set(visible.map((r) => r.userId));
    const previousTotal = [...prevMonth.entries()]
      .filter(([uid]) => visibleIds.has(uid) && ctx.enrolled.has(uid))
      .reduce((a, [uid, pm]) => a + apply(pm, rulesFor(ctx.rules, uid), true).earned, 0);

    const orphan = c.orphan.get(period) ?? { bills: 0, sale: 0 };
    return {
      period,
      timezone: w.tz,
      dayStartHour: w.h,
      scope: onlyMine ? ('own' as const) : ('all' as const),
      from: monthStart.toISOString(),
      to: w.lt.toISOString(),
      isCurrent: period === today,
      rows: visible,
      total,
      previousTotal,
      paidTotal,
      pendingTotal,
      overpaidTotal: r2(visible.reduce((a, r) => a + Math.max(0, (r.paidAmount ?? 0) - r.earned), 0)),
      saleTotal: r2(live.reduce((a, r) => a + r.sale, 0)),
      returnTotal: r2(live.reduce((a, r) => a + r.returnSale, 0)),
      enabledCount: live.length,
      notEnrolled: onlyMine ? [] : visible.filter((r) => !r.enrolled && r.bills > 0)
        .map((r) => ({ userId: r.userId, name: r.name, bills: r.bills, sale: r.sale })),
      partialReturnCount: visible.reduce((a, r) => a + (r.returnSale > 0 ? 1 : 0), 0),
      orphanBills: onlyMine ? 0 : orphan.bills,
      orphanSale: onlyMine ? 0 : r2(orphan.sale),
      reassignedBills: onlyMine ? 0 : visible.reduce((a, r) => a + r.reassigned, 0),
      noCostLines: visible.reduce((a, r) => a + r.noCost, 0),
      baseTotal: live.reduce((a, r) => a + r.baseSalary, 0),
      payTotal: live.reduce((a, r) => a + r.totalPay, 0),
      ruleCount: ctx.rules.filter((r) => r.isActive).length,
    };
  }

  /**
   * One person's statement for a month: the summary row, the rules that
   * apply, goods by product and category, the bills, the returns taken off
   * and the last six months.
   */
  async detail(user: AuthenticatedUser, userId: string, period: string) {
    if (userId !== user.id && !this.seesEveryone(user)) throw new NotFoundException('Is mahine is bande ka koi hisab nahi');
    const from = PERIOD.test(period ?? '') ? shiftPeriod(period, -5) : period;
    const w = await this.window(user.tenantId, from, period);
    const mw = await this.window(user.tenantId, period, period);
    const [c, ctx, payouts] = await Promise.all([
      this.compute(w, from, period),
      this.context(user.tenantId),
      this.prisma.commissionPayout.findMany({ where: { tenantId: user.tenantId, userId, period: { gte: from, lte: period } } }),
    ]);
    if (!ctx.users.has(userId)) throw new NotFoundException('Ye banda is dukaan me nahi mila');
    const payoutBy = new Map(payouts.map((p) => [p.period, p]));
    const rules = rulesFor(ctx.rules, userId);
    const enrolled = ctx.enrolled.has(userId);

    const pm = c.per.get(period)?.get(userId) ?? emptyMonth();
    const res = apply(pm, rules, enrolled);
    const row = this.row(userId, res, pm, ctx, payoutBy.get(period));

    const history = c.months.map((m) => {
      const p = c.per.get(m)?.get(userId) ?? emptyMonth();
      const r = apply(p, rules, enrolled);
      const paid = payoutBy.get(m)?.amount ?? null;
      return { period: m, sale: r.sale, bills: r.bills, earned: r.earned, paid, payStatus: this.payState(r.earned, paid) };
    });

    const live = rules.filter((r) => !r.minMonthlySale || res.sale >= r.minMonthlySale);
    const goods = await this.goods(user.tenantId, userId, mw, live, enrolled);
    const canCost = this.seesCost(user);
    if (!canCost) {
      row.profit = null;
      goods.byProduct.forEach((p) => { p.cost = null; p.profit = null; });
      goods.billList.forEach((b) => { b.profit = null; });
    }

    return {
      period,
      timezone: w.tz,
      ...row,
      rules: rules.map((r) => ({
        id: r.id, label: ruleLabel(r), basis: r.basis, valueType: r.valueType, value: r.value,
        categoryIds: r.categoryIds, minMonthlySale: r.minMonthlySale, targetAmount: r.targetAmount, targetBonus: r.targetBonus,
        own: r.userId === userId,
      })),
      history,
      ...goods,
    };
  }

  /** Product, category, bill and return lists for one person's month. */
  private async goods(tenantId: string, userId: string, w: Window, live: CommissionRule[], enrolled: boolean) {
    const seller = { OR: [{ soldById: userId }, { soldById: null, createdById: userId }] };
    const product = { select: { id: true, name: true, unit: true, categoryId: true, costPrice: true, category: { select: { name: true } } } };
    const [sales, returns] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId, status: { not: SaleStatus.VOIDED }, soldAt: { gte: w.gte, lt: w.lt }, ...seller },
        select: {
          id: true, saleNumber: true, soldAt: true, status: true, subtotal: true, discount: true, total: true, serviceCharges: true,
          createdById: true, soldById: true,
          createdBy: { select: { fullName: true } },
          customer: { select: { name: true } },
          shop: { select: { name: true } },
          items: { select: { quantity: true, total: true, costPrice: true, product } },
        },
        orderBy: { soldAt: 'desc' },
      }),
      this.prisma.saleReturn.findMany({
        where: { tenantId, returnedAt: { gte: w.gte, lt: w.lt }, sale: { status: { not: SaleStatus.VOIDED }, ...seller } },
        select: {
          id: true, returnNumber: true, returnedAt: true, refundAmount: true,
          sale: { select: { saleNumber: true, soldAt: true } },
          items: { select: { quantity: true, total: true, saleItem: { select: { costPrice: true } }, product } },
        },
        orderBy: { returnedAt: 'desc' },
      }),
    ]);

    type P = { productId: string; name: string; unit: string; categoryId: string | null; categoryName: string | null; qty: number; sale: number; cost: number | null; profit: number | null; returnedQty: number; returnedSale: number; returnedCost: number; bills: number; commission: number };
    const products = new Map<string, P>();
    const entry = (p: { id: string; name: string; unit: string; categoryId: string | null; category: { name: string } | null } | null) => {
      const key = p?.id ?? 'none';
      let e = products.get(key);
      if (!e) {
        e = {
          productId: key, name: p?.name ?? 'Cheez', unit: p?.unit ?? '', categoryId: p?.categoryId ?? null, categoryName: p?.category?.name ?? null,
          qty: 0, sale: 0, cost: 0, profit: 0, returnedQty: 0, returnedSale: 0, returnedCost: 0, bills: 0, commission: 0,
        };
        products.set(key, e);
      }
      return e;
    };
    const unitCost = (line: number, p: { costPrice: number } | null) => (line > 0 ? line : num(p?.costPrice));

    const billList = sales.map((s) => {
      const lines = s.items.reduce((a, i) => a + num(i.total), 0);
      const k = lines > 0 ? Math.min(1, Math.max(0, (num(s.subtotal) - num(s.discount)) / lines)) : 1;
      let goods = 0, cost = 0;
      for (const i of s.items) {
        const e = entry(i.product);
        const v = num(i.total) * k;
        const c = num(i.quantity) * unitCost(num(i.costPrice), i.product);
        e.qty += num(i.quantity); e.sale += v; e.cost = (e.cost ?? 0) + c; e.bills += 1;
        goods += v; cost += c;
      }
      return {
        id: s.id, saleNumber: s.saleNumber, soldAt: s.soldAt, status: s.status, customer: s.customer?.name ?? null,
        shop: s.shop?.name ?? null, total: num(s.total), goods: r2(goods), profit: r2(goods - cost) as number | null,
        discount: num(s.discount), items: s.items.length,
        cashier: s.soldById && s.soldById !== s.createdById ? s.createdBy?.fullName ?? null : null,
      };
    });

    const returnList = returns.map((r) => {
      let value = 0;
      for (const i of r.items) {
        const e = entry(i.product);
        e.returnedQty += num(i.quantity); e.returnedSale += num(i.total);
        e.returnedCost += num(i.quantity) * unitCost(num(i.saleItem.costPrice), i.product);
        value += num(i.total);
      }
      return { id: r.id, returnNumber: r.returnNumber, returnedAt: r.returnedAt, saleNumber: r.sale.saleNumber, soldAt: r.sale.soldAt, value: r2(value), items: r.items.length };
    });

    /* Commission per product with the same rules as the month total (rules
       still below their minimum are left out), so the rows add up to the
       rule lines. Bill and target amounts are not per product. */
    const out = [...products.values()].map((p) => {
      let amount = 0;
      if (enrolled) {
        for (const rule of live) {
          if (rule.basis === 'PER_BILL') continue;
          if (rule.categoryIds.length && (!p.categoryId || !rule.categoryIds.includes(p.categoryId))) continue;
          if (rule.valueType === 'FIXED') amount += (p.qty - p.returnedQty) * rule.value;
          else if (rule.basis === 'PROFIT') amount += ((p.sale - (p.cost ?? 0)) - (p.returnedSale - p.returnedCost)) * rule.value / 100;
          else amount += (p.sale - p.returnedSale) * rule.value / 100;
        }
      }
      return {
        ...p, qty: r2(p.qty), sale: r2(p.sale), cost: r2(p.cost ?? 0) as number | null,
        profit: r2(p.sale - (p.cost ?? 0)) as number | null, returnedQty: r2(p.returnedQty), returnedSale: r2(p.returnedSale),
        returnedCost: r2(p.returnedCost), commission: r2(amount),
      };
    }).sort((a, b) => b.commission - a.commission || b.sale - a.sale);

    const cats = new Map<string, { categoryId: string | null; name: string; qty: number; sale: number; returnedSale: number; commission: number; items: number }>();
    for (const p of out) {
      const key = p.categoryId ?? 'none';
      const e = cats.get(key) ?? { categoryId: p.categoryId, name: p.categoryName ?? 'Bina category', qty: 0, sale: 0, returnedSale: 0, commission: 0, items: 0 };
      e.qty += p.qty; e.sale += p.sale; e.returnedSale += p.returnedSale; e.commission += p.commission; e.items += 1;
      cats.set(key, e);
    }

    return {
      byProduct: out.slice(0, 150),
      byCategory: [...cats.values()].map((c) => ({ ...c, qty: r2(c.qty), sale: r2(c.sale), returnedSale: r2(c.returnedSale), commission: r2(c.commission) }))
        .sort((a, b) => b.commission - a.commission || b.sale - a.sale),
      billList: billList.slice(0, 300),
      billCount: billList.length,
      returnList,
    };
  }

  /**
   * Month-by-month figures for the analytics tab: totals, each person's
   * line, how the commission splits by rule, and payouts against earnings.
   */
  async analytics(user: AuthenticatedUser, endPeriod: string, months = 12, opts: { shop?: ShopScope } = {}) {
    const n = Math.min(24, Math.max(3, Math.trunc(months) || 12));
    const to = endPeriod;
    const from = PERIOD.test(to ?? '') ? shiftPeriod(to, -(n - 1)) : to;
    const w = await this.window(user.tenantId, from, to);
    const onlyMine = !this.seesEveryone(user);
    const branch = onlyMine ? null : opts.shop?.shopId ?? null;
    const [c, ctx, payouts, shopRows] = await Promise.all([
      this.compute(w, from, to),
      this.context(user.tenantId),
      this.prisma.commissionPayout.findMany({ where: { tenantId: user.tenantId, period: { gte: from, lte: to } } }),
      branch ? salesBySellerShop(this.prisma, w) : Promise.resolve([]),
    ]);
    /* Same rule as the month view: people based in the branch or who sold there. */
    const soldHere = new Set(shopRows.filter((r) => r.uid && r.shopId === branch).map((r) => r.uid as string));
    const allowed = (uid: string) => {
      if (onlyMine) return uid === user.id;
      if (!branch) return true;
      const st = ctx.staff.get(uid);
      return (st?.shopId ?? ctx.users.get(uid)?.shopId ?? null) === branch || soldHere.has(uid);
    };

    const people = new Map<string, { userId: string; name: string; earned: number; sale: number; bills: number; paid: number }>();
    const byRule = new Map<string, { label: string; amount: number }>();
    const series = c.months.map((m) => {
      const month = c.per.get(m) ?? new Map<string, PersonMonth>();
      const point: { period: string; earned: number; sale: number; returns: number; bills: number; paid: number; people: Record<string, number> } =
        { period: m, earned: 0, sale: 0, returns: 0, bills: 0, paid: 0, people: {} };
      for (const [uid, pm] of month) {
        if (!allowed(uid) || !ctx.enrolled.has(uid)) continue;
        const r = apply(pm, rulesFor(ctx.rules, uid), true);
        point.earned += r.earned; point.sale += r.sale; point.returns += r.returnSale; point.bills += r.bills;
        point.people[uid] = r.earned;
        const p = people.get(uid) ?? { userId: uid, name: ctx.staff.get(uid)?.fullName ?? ctx.users.get(uid)?.fullName ?? 'Banda', earned: 0, sale: 0, bills: 0, paid: 0 };
        p.earned += r.earned; p.sale += r.sale; p.bills += r.bills;
        people.set(uid, p);
        for (const l of r.lines) {
          const key = l.basis === 'TARGET' ? 'target' : l.ruleId;
          const e = byRule.get(key) ?? { label: l.basis === 'TARGET' ? 'Target bonus' : l.label, amount: 0 };
          e.amount += l.amount; byRule.set(key, e);
        }
      }
      for (const p of payouts) {
        if (p.period !== m || !allowed(p.userId)) continue;
        point.paid += p.amount;
        const e = people.get(p.userId);
        if (e) e.paid += p.amount;
      }
      return { ...point, sale: r2(point.sale), returns: r2(point.returns), paid: r2(point.paid) };
    });

    const list = [...people.values()].map((p) => ({ ...p, sale: r2(p.sale), paid: r2(p.paid), rate: p.sale > 0 ? r2((p.earned / p.sale) * 100) : 0 }))
      .sort((a, b) => b.earned - a.earned);
    const earned = series.reduce((a, s) => a + s.earned, 0);
    const sale = series.reduce((a, s) => a + s.sale, 0);
    return {
      from, to, months: c.months,
      scope: onlyMine ? ('own' as const) : ('all' as const),
      series,
      people: list,
      byRule: [...byRule.values()].map((r) => ({ ...r, amount: r2(r.amount) })).sort((a, b) => b.amount - a.amount),
      totals: {
        earned, sale: r2(sale), paid: r2(series.reduce((a, s) => a + s.paid, 0)),
        rate: sale > 0 ? r2((earned / sale) * 100) : 0,
        best: series.reduce<{ period: string; earned: number } | null>((b, s) => (!b || s.earned > b.earned ? { period: s.period, earned: s.earned } : b), null),
      },
    };
  }
}
