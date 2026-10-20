/**
 * Payroll: the month's run sheet per branch, paying one or all, paying a
 * balance later, salary advances and loans cut over months, cancelling with
 * the money given back, history and analytics.
 *
 * Records. A salary is one SalaryPayment numbered PAY-####; an advance is one
 * SalaryPayment per instalment numbered ADV-#### (or ADV-####-1, -2 … when
 * cut over several months), each dated to the salary month it is cut from.
 * A staff member has at most one live PAY row per month.
 *
 * Money. The SalaryPayment is the cost (the P&L reads paidAmount by paidAt).
 * The money leaves through the existing ledgers, never through an expense, so
 * it is counted once:
 *   drawer   CASH_OUT on the branch's open register (live-cash.helper)
 *   account  WITHDRAW on a money account (account-balance.helper)
 * Both carry note "payroll:<number>" so a record finds its own movements, and
 * a request key, so a retry does not post twice. Cancelling puts the money
 * back with CASH_IN / DEPOSIT and the record stops counting.
 *
 * Commission. A month's commission is paid with the salary only when nothing
 * of it was paid on the Commission page. The salary then writes the
 * CommissionPayout for that month (the earned amount, note "Tankhwah PAY-…"),
 * so the Commission page shows it paid. The money is inside the salary's
 * paidAmount; reports that add payouts must skip notes starting "Tankhwah PAY-".
 * Cancelling the salary removes that payout.
 *
 * Every write runs in one transaction under a per-tenant lock.
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MoneyAccount, PaymentMethod, Prisma, SalaryPaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { PERMISSIONS, hasPermission, type PermissionKey } from '../../../common/constants/permissions.constants';
import { ShopScope, assertShopAccess } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey, startOfBusinessMonthTz } from '../../../common/helpers/business-time.helper';
import { computeLiveCash } from '../../../common/helpers/live-cash.helper';
import { accountBalance } from '../../../common/helpers/account-balance.helper';
import { CommissionService } from '../commission/commission.service';
import {
  AnalyticsQueryDto, CancelDto, CreateAdvanceDto, HistoryQueryDto, MonthQueryDto, PayBalanceDto, PaySourceDto, RunPayrollDto,
} from './dto/payroll.dto';
import {
  AttendanceTally, PayResult, computePay, employedShare, emptyTally, monthDates, monthKeyOf, readNotes, shiftMonth, writeNotes,
} from './payroll.helper';

type Db = Prisma.TransactionClient;

const TX = { timeout: 60_000, maxWait: 10_000 };
const LIVE_STATUS = { not: SalaryPaymentStatus.CANCELLED };
const COUNTED_SALES = ['COMPLETED', 'PARTIALLY_RETURNED'] as const;
const PAY = 'PAY-';
const ADV = 'ADV-';

const n = (v: unknown) => Number(v ?? 0) || 0;
const r0 = (v: number) => Math.round(v);
const rs = (v: number) => `Rs ${Math.round(v).toLocaleString('en-PK')}`;
const isOwner = (u: AuthenticatedUser) => u.role === 'OWNER' || u.role === 'SUPER_ADMIN';
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
/** "ADV-0005-2" → "ADV-0005". */
const groupOf = (num: string) => num.split('-').slice(0, 2).join('-');
const moneyTag = (num: string) => `payroll:${num}`;

const STAFF_SELECT = {
  id: true, staffNumber: true, fullName: true, designation: true, department: true, avatarUrl: true, phone: true, cnic: true,
  status: true, userId: true, shopId: true, salaryType: true, baseSalary: true, workingDaysPerMonth: true, workingHoursPerDay: true,
  joinDate: true, endDate: true, bankName: true, accountNumber: true, iban: true,
  shop: { select: { id: true, name: true } },
} satisfies Prisma.StaffSelect;
type StaffRow = Prisma.StaffGetPayload<{ select: typeof STAFF_SELECT }>;

const RECORD_INCLUDE = {
  staff: { select: { id: true, staffNumber: true, fullName: true, designation: true, avatarUrl: true, shopId: true, salaryType: true, shop: { select: { id: true, name: true } } } },
} satisfies Prisma.SalaryPaymentInclude;
type RecordRow = Prisma.SalaryPaymentGetPayload<{ include: typeof RECORD_INCLUDE }>;

interface CommissionInfo { earned: number; paidSeparately: boolean; enrolled: boolean }

interface MonthContext {
  tally: Map<string, AttendanceTally>;
  unpaidLeave: Map<string, number>;
  advances: Map<string, Array<{ id: string; paymentNumber: string; amount: number }>>;
  salaries: Map<string, RecordRow[]>;
}

interface Payer {
  source: 'DRAWER' | 'ACCOUNT';
  register?: { id: string; shopId: string | null };
  account?: MoneyAccount;
  method: PaymentMethod;
  label: string;
}

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly commission: CommissionService,
  ) {}

  /* ═════════════════════════ access ═════════════════════════ */

  private can(user: AuthenticatedUser, p: PermissionKey) {
    return hasPermission(user.role, user.permissions, p);
  }

  /** The branch in view: the open branch, or one picked on the all-branches view. */
  private branch(user: AuthenticatedUser, scope: ShopScope, shopId?: string): string | null {
    if (shopId && (!scope.shopId || scope.shopId === shopId)) {
      assertShopAccess(user, shopId, 'Doosri branch ki tankhwah');
      return shopId;
    }
    return scope.shopId;
  }

  /** Staff of a branch; staff with no branch show in every branch. */
  private staffBranch(branch: string | null): Prisma.StaffWhereInput {
    return branch ? { OR: [{ shopId: branch }, { shopId: null }] } : {};
  }

  private checkStaffAccess(user: AuthenticatedUser, staff: { shopId: string | null }) {
    if (staff.shopId) assertShopAccess(user, staff.shopId, 'Tankhwah ka kaam');
  }

  private async lock(tx: Db, tenantId: string) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`payroll:${tenantId}`}))::text`;
  }

  /** Next PAY-#### or ADV-#### number. */
  private async nextNumber(tx: Db, tenantId: string, prefix: string) {
    const pattern = `^${prefix}([0-9]+)(-[0-9]+)?$`;
    const rows = await tx.$queryRaw<Array<{ max: number | null }>>`
      SELECT MAX(CAST(substring("paymentNumber" from ${pattern}) AS int)) AS max
      FROM "SalaryPayment" WHERE "tenantId" = ${tenantId} AND "paymentNumber" ~ ${pattern}`;
    return `${prefix}${String(n(rows[0]?.max) + 1).padStart(4, '0')}`;
  }

  /* ═════════════════════════ money ═════════════════════════ */

  /** Drawer of the branch (with its cash) and the accounts the user may pay from (with balances). */
  private async sources(user: AuthenticatedUser, branch: string | null) {
    const tenantId = user.tenantId;
    const register = branch
      ? await this.prisma.cashRegister.findFirst({
        where: { tenantId, shopId: branch, status: 'OPEN' }, orderBy: { openedAt: 'desc' },
        select: { id: true, registerNumber: true, shopId: true, openedAt: true, openingBalance: true },
      })
      : null;
    const own = !isOwner(user) && user.shopId;
    const accounts = await this.prisma.moneyAccount.findMany({
      where: {
        tenantId, isActive: true,
        ...(own ? { shopId: user.shopId } : branch ? { OR: [{ shopId: branch }, { shopId: null }] } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { shop: { select: { name: true } } },
    });
    const [cash, balances] = await Promise.all([
      register ? computeLiveCash(this.prisma, tenantId, register).then((l) => l.expected) : Promise.resolve(0),
      Promise.all(accounts.map((a) => accountBalance(this.prisma, a))),
    ]);
    return {
      canDrawer: this.can(user, PERMISSIONS.CASH_REGISTER_OPEN),
      canAccount: this.can(user, PERMISSIONS.EXPENSES_CREATE),
      drawer: register ? { registerId: register.id, registerNumber: register.registerNumber, openedAt: register.openedAt, cash } : null,
      accounts: accounts.map((a, i) => ({
        id: a.id, name: a.name, kind: a.kind, method: a.method, shopId: a.shopId, shopName: a.shop?.name ?? null, balance: balances[i],
      })),
    };
  }

  /** Checks the source, locks it and makes sure it holds `total`. */
  private async payer(tx: Db, user: AuthenticatedUser, dto: PaySourceDto, branch: string | null, total: number, back = false): Promise<Payer | null> {
    if (dto.source === 'NONE') return null;
    if (dto.source === 'DRAWER') {
      if (!this.can(user, PERMISSIONS.CASH_REGISTER_OPEN)) throw new ForbiddenException('Galle se paisa dene ki permission nahi (Cash register kholna)');
      if (!branch) throw new BadRequestException('Galle se dene ke liye upar se branch chunein');
      assertShopAccess(user, branch, 'Galle ka kaam');
      const reg = await tx.cashRegister.findFirst({
        where: { tenantId: user.tenantId, shopId: branch, status: 'OPEN' }, orderBy: { openedAt: 'desc' },
      });
      if (!reg) throw new BadRequestException('Is branch ka galla (cash register) band hai. Pehle register kholein ya account se dein.');
      const locked = await tx.$queryRaw<Array<{ status: string }>>`SELECT status::text AS status FROM "CashRegister" WHERE id = ${reg.id} FOR UPDATE`;
      if (locked[0]?.status !== 'OPEN') throw new BadRequestException('Galla abhi band ho gaya — dobara koshish karein');
      if (!back && !dto.allowNegative) {
        const live = await computeLiveCash(tx, user.tenantId, reg);
        if (live.expected - total < -0.005) {
          throw new BadRequestException(`Galle me sirf ${rs(live.expected)} hone chahiye, chahiye ${rs(total)}. Amount kam karein, account se dein ya "kam ho to bhi dein" chunein.`);
        }
      }
      return { source: 'DRAWER', register: { id: reg.id, shopId: reg.shopId }, method: 'CASH', label: `Galla ${reg.registerNumber}` };
    }

    if (!this.can(user, PERMISSIONS.EXPENSES_CREATE)) throw new ForbiddenException('Account se paisa dene ki permission nahi (Expenses likhna)');
    if (!dto.accountId) throw new BadRequestException('Account chunein');
    const a = await tx.moneyAccount.findFirst({ where: { id: dto.accountId, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account nahi mila');
    if (a.shopId) assertShopAccess(user, a.shopId, 'Account se dena');
    else if (!isOwner(user) && user.shopId) throw new ForbiddenException('Poore karobar ka account sirf malik chala sakta hai');
    if (!a.isActive) throw new BadRequestException(`${a.name} band hai — pehle chalu karein`);
    await tx.$queryRaw`SELECT id FROM "MoneyAccount" WHERE id = ${a.id} FOR UPDATE`;
    if (!back && !dto.allowNegative) {
      const balance = await accountBalance(tx, a);
      if (balance - total < -0.005) {
        throw new BadRequestException(`${a.name} me sirf ${rs(balance)} hain, chahiye ${rs(total)}. Amount kam karein ya "kam ho to bhi dein" chunein.`);
      }
    }
    const method: PaymentMethod = a.method ?? (a.kind === 'BANK' ? 'BANK_TRANSFER' : a.kind === 'WALLET' ? 'JAZZCASH' : 'CASH');
    return { source: 'ACCOUNT', account: a, method, label: a.name };
  }

  /** Posts one movement: out of the drawer / account, or back in when `back`. */
  private async move(tx: Db, user: AuthenticatedUser, p: Payer, o: { amount: number; number: string; reason: string; key: string; shopId: string | null; back?: boolean }) {
    const amount = r0(o.amount);
    if (amount <= 0) return;
    if (p.source === 'DRAWER' && p.register) {
      await tx.cashRegister.update({
        where: { id: p.register.id },
        data: o.back
          ? { expectedBalance: { increment: amount }, totalCashIn: { increment: amount } }
          : { expectedBalance: { decrement: amount }, totalCashOut: { increment: amount } },
      });
      await tx.cashTransaction.create({
        data: {
          tenantId: user.tenantId, cashRegisterId: p.register.id, createdById: user.id, type: o.back ? 'CASH_IN' : 'CASH_OUT',
          amount, reason: o.reason.slice(0, 200), note: moneyTag(o.number), reference: `req:${o.key}`,
        },
      });
      return;
    }
    if (p.account) {
      await tx.moneyAccountEntry.create({
        data: {
          tenantId: user.tenantId, accountId: p.account.id, shopId: p.account.shopId ?? o.shopId, type: o.back ? 'DEPOSIT' : 'WITHDRAW',
          amount, reason: o.reason.slice(0, 120), note: moneyTag(o.number), requestId: o.key, createdById: user.id,
        },
      });
    }
  }

  /** True when this request key was already posted (double click, retry). */
  private async posted(tx: Db, tenantId: string, key: string) {
    const [cash, entry] = await Promise.all([
      tx.cashTransaction.findFirst({ where: { tenantId, reference: { startsWith: `req:${key}#` } }, select: { id: true } }),
      tx.moneyAccountEntry.findFirst({ where: { tenantId, requestId: { startsWith: `${key}#` } }, select: { id: true } }),
    ]);
    return !!(cash || entry);
  }

  /** Every movement of a record (or advance group), paid and given back. */
  private async movements(tenantId: string, number: string) {
    const note = moneyTag(number);
    const [cash, entries] = await Promise.all([
      this.prisma.cashTransaction.findMany({
        where: { tenantId, note }, orderBy: { createdAt: 'asc' },
        select: { id: true, type: true, amount: true, reason: true, createdAt: true, cashRegister: { select: { registerNumber: true, shop: { select: { name: true } } } }, createdBy: { select: { fullName: true } } },
      }),
      this.prisma.moneyAccountEntry.findMany({
        where: { tenantId, note }, orderBy: { entryDate: 'asc' },
        select: { id: true, type: true, amount: true, reason: true, entryDate: true, account: { select: { name: true } }, createdBy: { select: { fullName: true } } },
      }),
    ]);
    return [
      ...cash.map((c) => ({
        id: c.id, at: c.createdAt, back: c.type === 'CASH_IN', amount: n(c.amount), reason: c.reason,
        from: `Galla ${c.cashRegister.registerNumber}${c.cashRegister.shop?.name ? ` · ${c.cashRegister.shop.name}` : ''}`, by: c.createdBy?.fullName ?? null,
      })),
      ...entries.map((e) => ({
        id: e.id, at: e.entryDate, back: e.type === 'DEPOSIT', amount: n(e.amount), reason: e.reason, from: e.account.name, by: e.createdBy?.fullName ?? null,
      })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());
  }

  /* ═════════════════════════ month context ═════════════════════════ */

  private async context(db: Db, tenantId: string, staffIds: string[], month: string): Promise<MonthContext> {
    const { first, last, next } = monthDates(month);
    const [att, leaves, rows] = await Promise.all([
      db.attendance.findMany({
        where: { tenantId, staffId: { in: staffIds }, date: { gte: first, lte: last } },
        select: { staffId: true, date: true, status: true, workedHours: true, overtimeHours: true, lateMinutes: true },
      }),
      db.staffLeave.findMany({
        where: { tenantId, staffId: { in: staffIds }, status: 'APPROVED', type: 'UNPAID', startDate: { lte: last }, endDate: { gte: first } },
        select: { staffId: true, startDate: true, endDate: true },
      }),
      db.salaryPayment.findMany({
        where: { tenantId, staffId: { in: staffIds }, periodStart: { gte: first, lt: next }, status: LIVE_STATUS },
        include: RECORD_INCLUDE,
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const tally = new Map<string, AttendanceTally>();
    const absentDays = new Map<string, Set<string>>();
    for (const a of att) {
      const t = tally.get(a.staffId) ?? emptyTally();
      t.marked += 1;
      if (a.status === 'PRESENT') t.present += 1;
      else if (a.status === 'LATE') t.late += 1;
      else if (a.status === 'HALF_DAY') t.half += 1;
      else if (a.status === 'ABSENT') t.absent += 1;
      else if (a.status === 'ON_LEAVE') t.leave += 1;
      else if (a.status === 'HOLIDAY') t.holiday += 1;
      t.hours += n(a.workedHours);
      t.overtimeHours += n(a.overtimeHours);
      t.lateMinutes += n(a.lateMinutes);
      tally.set(a.staffId, t);
      if (a.status === 'ABSENT' || a.status === 'HALF_DAY') {
        const s = absentDays.get(a.staffId) ?? new Set<string>();
        s.add(a.date.toISOString().slice(0, 10));
        absentDays.set(a.staffId, s);
      }
    }

    // Unpaid leave days inside the month that are not already counted as absent.
    const unpaidLeave = new Map<string, number>();
    for (const l of leaves) {
      const from = Math.max(l.startDate.getTime(), first.getTime());
      const to = Math.min(l.endDate.getTime(), last.getTime());
      const seen = absentDays.get(l.staffId);
      let days = 0;
      for (let t = from; t <= to; t += 86_400_000) if (!seen?.has(new Date(t).toISOString().slice(0, 10))) days += 1;
      unpaidLeave.set(l.staffId, (unpaidLeave.get(l.staffId) ?? 0) + days);
    }

    const advances = new Map<string, Array<{ id: string; paymentNumber: string; amount: number }>>();
    const salaries = new Map<string, RecordRow[]>();
    for (const r of rows) {
      if (r.paymentNumber.startsWith(ADV)) {
        const list = advances.get(r.staffId) ?? [];
        list.push({ id: r.id, paymentNumber: r.paymentNumber, amount: n(r.advances) || n(r.paidAmount) });
        advances.set(r.staffId, list);
      } else {
        const list = salaries.get(r.staffId) ?? [];
        list.push(r);
        salaries.set(r.staffId, list);
      }
    }
    return { tally, unpaidLeave, advances, salaries };
  }

  /** This month's commission by login, when the user may see everyone's. */
  private async commissionOf(user: AuthenticatedUser, month: string): Promise<{ state: 'ok' | 'hidden' | 'off'; byUser: Map<string, CommissionInfo> }> {
    const byUser = new Map<string, CommissionInfo>();
    if (!this.can(user, PERMISSIONS.COMMISSION_VIEW) && !this.can(user, PERMISSIONS.COMMISSION_MANAGE)) return { state: 'hidden', byUser };
    try {
      const s = await this.commission.summary(user, month) as { rows?: Array<Record<string, unknown>> };
      for (const r of s.rows ?? []) {
        const uid = String(r.userId ?? '');
        if (!uid) continue;
        byUser.set(uid, { earned: r0(n(r.earned)), paidSeparately: n(r.paidAmount) > 0 || !!r.paid, enrolled: !!r.enrolled });
      }
      return { state: 'ok', byUser };
    } catch {
      // Commission tables missing or the module failing must not stop payroll.
      return { state: 'off', byUser };
    }
  }

  /** Payouts written by a salary, so they are not mistaken for a payment made on the Commission page. */
  private async payrollMarkers(tenantId: string, month: string) {
    try {
      const rows = await this.prisma.commissionPayout.findMany({
        where: { tenantId, period: month, note: { startsWith: 'Tankhwah PAY-' } }, select: { userId: true },
      });
      return new Set(rows.map((r) => r.userId));
    } catch {
      return new Set<string>();
    }
  }

  private calc(staff: StaffRow, month: string, ctx: MonthContext, com: CommissionInfo | undefined, canPayCommission: boolean, row: Partial<RunRowLike> = {}): PayResult {
    const advanceDue = (ctx.advances.get(staff.id) ?? []).reduce((a, x) => a + x.amount, 0);
    const includeCommission = row.includeCommission ?? true;
    return computePay({
      staff,
      att: ctx.tally.get(staff.id) ?? emptyTally(),
      unpaidLeave: ctx.unpaidLeave.get(staff.id) ?? 0,
      employed: employedShare(month, staff.joinDate, staff.endDate),
      advanceDue,
      commission: com?.earned ?? 0,
      includeCommission: includeCommission && canPayCommission && !!com && com.earned > 0 && !com.paidSeparately,
      adds: row.adds, cuts: row.cuts, units: row.units, overtimePay: row.overtimePay, skipAbsentCut: row.skipAbsentCut,
    });
  }

  /* ═════════════════════════ run sheet ═════════════════════════ */

  async run(user: AuthenticatedUser, scope: ShopScope, q: MonthQueryDto) {
    const tenantId = user.tenantId;
    const branch = this.branch(user, scope, q.shopId);
    const { first, next, days } = monthDates(q.month);
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const thisMonth = businessDayKey(new Date(), tz, dayStartHour).slice(0, 7);

    const staff = await this.prisma.staff.findMany({
      where: {
        tenantId,
        AND: [
          this.staffBranch(branch),
          { joinDate: { lt: next } },
          {
            OR: [
              { status: { in: ['ACTIVE', 'ON_LEAVE', 'SUSPENDED'] } },
              { endDate: { gte: first } },
              { salaryPayments: { some: { periodStart: { gte: first, lt: next }, status: LIVE_STATUS } } },
            ],
          },
        ],
      },
      select: STAFF_SELECT,
      orderBy: [{ fullName: 'asc' }],
    });
    const ids = staff.map((s) => s.id);

    const { y, m } = { y: Number(q.month.slice(0, 4)), m: Number(q.month.slice(5, 7)) };
    const salesWindow = { gte: startOfBusinessMonthTz(y, m, tz, dayStartHour), lt: startOfBusinessMonthTz(y, m + 1, tz, dayStartHour) };
    const [ctx, com, markers, sources, sales, openAdvances] = await Promise.all([
      this.context(this.prisma, tenantId, ids, q.month),
      this.commissionOf(user, q.month),
      this.payrollMarkers(tenantId, q.month),
      this.sources(user, branch),
      this.prisma.sale.aggregate({
        where: { tenantId, status: { in: [...COUNTED_SALES] }, soldAt: salesWindow, ...(branch && { shopId: branch }) },
        _sum: { total: true },
      }),
      this.outstanding(tenantId, branch),
    ]);
    // A marker written by payroll means "paid inside a salary", not "paid on the Commission page".
    for (const [uid, c] of com.byUser) if (markers.has(uid)) c.paidSeparately = false;
    const canPayCommission = com.state === 'ok' && this.can(user, PERMISSIONS.COMMISSION_MANAGE);

    const rows = staff.map((s) => {
      const saved = ctx.salaries.get(s.id) ?? [];
      const c = s.userId ? com.byUser.get(s.userId) : undefined;
      const preview = this.calc(s, q.month, ctx, c, canPayCommission);
      const share = employedShare(q.month, s.joinDate, s.endDate);
      const att = ctx.tally.get(s.id) ?? emptyTally();
      const warnings: string[] = [];
      if (!saved.length) {
        if (n(s.baseSalary) <= 0 && s.salaryType !== 'COMMISSION') warnings.push('Tankhwah 0 likhi hai — Staff profile me amount daalein');
        if (!att.marked && (s.salaryType === 'DAILY' || s.salaryType === 'HOURLY')) warnings.push('Is mahine hazri nahi lagi — din / ghante khud likhein');
        if (s.salaryType === 'PER_TASK') warnings.push('Kitne kaam kiye — khud likhein');
        if (preview.advanceTooBig) warnings.push('Advance ki qist tankhwah se zyada hai');
        if (s.status === 'TERMINATED' || s.status === 'RESIGNED') warnings.push('Kaam chhor chuka hai — aakhri tankhwah');
        if (share < 1 && (s.salaryType === 'MONTHLY' || s.salaryType === 'HYBRID')) warnings.push(`Mahine ke beech aaya ya gaya — ${Math.round(share * days)} din ki tankhwah`);
        if (c && c.earned > 0 && c.paidSeparately) warnings.push('Commission ki adaigi Commission page par likhi hai — wahin poori karein');
      }
      if (saved.length > 1) warnings.push(`Is mahine ${saved.length} tankhwah records hain — purana record check karein`);
      return {
        staff: s,
        attendance: { ...att, unpaidLeave: ctx.unpaidLeave.get(s.id) ?? 0, days },
        advances: ctx.advances.get(s.id) ?? [],
        commission: c ? { ...c, included: !saved.length && preview.commission > 0 } : null,
        preview,
        record: saved.length ? this.shape(saved[saved.length - 1]) : null,
        warnings,
      };
    });

    const savedRows = rows.filter((r) => r.record);
    const open = rows.filter((r) => !r.record);
    const sum = (list: number[]) => r0(list.reduce((a, v) => a + v, 0));
    const gross = sum([...savedRows.map((r) => r.record!.grossAmount), ...open.map((r) => r.preview.gross)]);
    const saleTotal = n(sales._sum.total);
    return {
      month: q.month,
      label: monthLabel(q.month),
      isCurrent: q.month === thisMonth,
      isFuture: q.month > thisMonth,
      branchId: branch,
      rows,
      totals: {
        staff: rows.length,
        saved: savedRows.length,
        open: open.length,
        gross,
        net: sum([...savedRows.map((r) => r.record!.netAmount), ...open.map((r) => r.preview.net)]),
        paid: sum(savedRows.map((r) => r.record!.paidAmount)),
        due: sum([...savedRows.map((r) => r.record!.balanceAmount), ...open.map((r) => r.preview.net)]),
        advance: sum(rows.map((r) => r.preview.advance)),
        commission: sum([...savedRows.map((r) => r.record!.commissionEarned), ...open.map((r) => r.preview.commission)]),
        sales: r0(saleTotal),
        salesPct: pct(gross, saleTotal),
        advanceOutstanding: openAdvances,
      },
      commission: com.state,
      canPayCommission,
      canPay: this.can(user, PERMISSIONS.STAFF_MANAGE),
      sources,
    };
  }

  /** Advances given and not yet cut from a salary. */
  private async outstanding(tenantId: string, branch: string | null) {
    const rows = await this.prisma.$queryRaw<Array<{ amount: number; n: number }>>(Prisma.sql`
      SELECT COALESCE(SUM(a."paidAmount"), 0)::float8 AS amount, COUNT(DISTINCT a."staffId")::int AS n
      FROM "SalaryPayment" a
      JOIN "Staff" st ON st.id = a."staffId"
      WHERE a."tenantId" = ${tenantId} AND a."paymentNumber" LIKE 'ADV-%' AND a.status::text <> 'CANCELLED'
        ${branch ? Prisma.sql`AND (st."shopId" = ${branch} OR st."shopId" IS NULL)` : Prisma.empty}
        AND NOT EXISTS (
          SELECT 1 FROM "SalaryPayment" p
          WHERE p."staffId" = a."staffId" AND p."paymentNumber" LIKE 'PAY-%' AND p.status::text <> 'CANCELLED'
            AND date_trunc('month', p."periodStart") = date_trunc('month', a."periodStart")
        )`);
    return { amount: r0(n(rows[0]?.amount)), staff: n(rows[0]?.n) };
  }

  /* ═════════════════════════ run and pay ═════════════════════════ */

  async process(user: AuthenticatedUser, scope: ShopScope, dto: RunPayrollDto) {
    const tenantId = user.tenantId;
    const branch = this.branch(user, scope, dto.shopId);
    const ids = [...new Set(dto.rows.map((r) => r.staffId))];
    if (ids.length !== dto.rows.length) throw new BadRequestException('Ek bande ki do lines bheji hain');
    const { first, last } = monthDates(dto.month);
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    if (dto.month > businessDayKey(new Date(), tz, dayStartHour).slice(0, 7)) throw new BadRequestException('Aane wale mahine ki tankhwah abhi nahi bana sakte');

    const [com, markers] = await Promise.all([this.commissionOf(user, dto.month), this.payrollMarkers(tenantId, dto.month)]);
    for (const [uid, c] of com.byUser) if (markers.has(uid)) c.paidSeparately = false;
    const canPayCommission = com.state === 'ok' && this.can(user, PERMISSIONS.COMMISSION_MANAGE);
    const label = monthLabel(dto.month);

    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, tenantId);
      if (dto.source !== 'NONE' && await this.posted(tx, tenantId, dto.requestId)) return { duplicate: true, created: [], skipped: [], paid: 0 };

      const staff = await tx.staff.findMany({ where: { tenantId, id: { in: ids }, ...this.staffBranch(branch) }, select: STAFF_SELECT });
      if (staff.length !== ids.length) throw new NotFoundException('Kuch staff is branch me nahi mile — page taaza karein');
      staff.forEach((s) => this.checkStaffAccess(user, s));
      const byId = new Map(staff.map((s) => [s.id, s]));
      const ctx = await this.context(tx, tenantId, ids, dto.month);

      const plan: Array<{ s: StaffRow; pay: PayResult; payNow: number; row: RunRowLike }> = [];
      const skipped: Array<{ staffId: string; name: string; reason: string }> = [];
      for (const row of dto.rows) {
        const s = byId.get(row.staffId)!;
        if (ctx.salaries.get(s.id)?.length) { skipped.push({ staffId: s.id, name: s.fullName, reason: `${label} ki tankhwah pehle se bani hai` }); continue; }
        const c = s.userId ? com.byUser.get(s.userId) : undefined;
        const pay = this.calc(s, dto.month, ctx, c, canPayCommission, row);
        if (pay.advanceTooBig) throw new BadRequestException(`${s.fullName}: advance ki qist (${rs(pay.advance)}) baqi tankhwah se zyada hai. Bonus jorein ya advance cancel karke kam qist me dein.`);
        const payNow = dto.source === 'NONE' ? 0 : Math.min(r0(row.payAmount ?? pay.net), pay.net);
        plan.push({ s, pay, payNow, row });
      }
      if (!plan.length) return { duplicate: false, created: [], skipped, paid: 0 };

      const total = plan.reduce((a, p) => a + p.payNow, 0);
      const payer = total > 0 ? await this.payer(tx, user, dto, branch, total) : null;

      const created: RecordRow[] = [];
      let i = 0;
      for (const p of plan) {
        const number = await this.nextNumber(tx, tenantId, PAY);
        const paidNow = payer ? p.payNow : 0;
        const balance = p.pay.net - paidNow;
        const rec = await tx.salaryPayment.create({
          data: {
            tenantId, staffId: p.s.id, paymentNumber: number, periodStart: first, periodEnd: last,
            baseSalary: p.pay.basePay, daysWorked: p.pay.unitKind === 'days' ? p.pay.units : p.pay.daysWorked,
            hoursWorked: p.pay.unitKind === 'hours' ? p.pay.units : r0((ctx.tally.get(p.s.id)?.hours ?? 0) * 100) / 100,
            overtimePay: p.pay.overtimePay, commissionEarned: p.pay.commission, bonuses: p.pay.bonuses,
            advances: p.pay.advance, leaveDeduction: p.pay.absentCut, lateDeduction: 0, otherDeductions: p.pay.otherCuts,
            grossAmount: p.pay.gross, totalDeductions: p.pay.deductions, netAmount: p.pay.net,
            paidAmount: paidNow, balanceAmount: balance,
            paymentMethod: payer?.method ?? 'CASH',
            status: balance <= 0 ? 'PAID' : paidNow > 0 ? 'PARTIAL' : 'PENDING',
            paidAt: paidNow > 0 || balance <= 0 ? new Date() : null,
            paidById: paidNow > 0 ? user.id : null,
            notes: writeNotes(p.row.adds, p.row.cuts, p.row.note),
          },
          include: RECORD_INCLUDE,
        });
        if (payer && paidNow > 0) {
          await this.move(tx, user, payer, {
            amount: paidNow, number, key: `${dto.requestId}#${i}`, shopId: p.s.shopId ?? branch,
            reason: `Tankhwah · ${p.s.fullName} (${label})`,
          });
        }
        if (p.pay.commission > 0 && p.s.userId) await this.markCommission(tx, tenantId, p.s.userId, dto.month, number, p.pay.commission, user.id);
        created.push(rec);
        i += 1;
      }

      await tx.activityLog.create({
        data: {
          tenantId, userId: user.id, action: 'PAYROLL_RUN', entityType: 'SalaryPayment',
          description: `${label} tankhwah: ${created.length} staff · kul ${rs(created.reduce((a, r) => a + r.netAmount, 0))}${payer ? ` · ada ${rs(total)} (${payer.label})` : ' · abhi ada nahi'}`,
          metadata: { month: dto.month, branch, numbers: created.map((r) => r.paymentNumber), paid: total, source: dto.source },
        },
      });
      return { duplicate: false, created: created.map((r) => this.shape(r)), skipped, paid: payer ? total : 0, source: payer?.label ?? null };
    }, TX);
  }

  private async markCommission(tx: Db, tenantId: string, userId: string, month: string, number: string, amount: number, by: string) {
    const note = `Tankhwah ${number} me ada`;
    // A payment made on the Commission page after the sheet was read must not be overwritten.
    const current = await tx.commissionPayout.findUnique({
      where: { tenantId_userId_period: { tenantId, userId, period: month } }, select: { amount: true, note: true },
    });
    if (current && current.amount > 0 && !current.note?.startsWith('Tankhwah PAY-')) {
      throw new BadRequestException('Is mahine ki commission abhi Commission page par ada likhi gayi hai — safha taaza karein, phir tankhwah banayein');
    }
    await tx.commissionPayout.upsert({
      where: { tenantId_userId_period: { tenantId, userId, period: month } },
      create: { tenantId, userId, period: month, amount, note, paidBy: by },
      update: { amount, note, paidAt: new Date(), paidBy: by },
    });
  }

  /** Pays what is still due on a salary, all or part. */
  async payBalance(user: AuthenticatedUser, scope: ShopScope, id: string, dto: PayBalanceDto) {
    if (dto.source === 'NONE') throw new BadRequestException('Kahan se dena hai — galla ya account chunein');
    const tenantId = user.tenantId;
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, tenantId);
      const rec = await tx.salaryPayment.findFirst({ where: { id, tenantId }, include: RECORD_INCLUDE });
      if (!rec || !rec.paymentNumber.startsWith(PAY)) throw new NotFoundException('Tankhwah ka record nahi mila');
      this.checkStaffAccess(user, rec.staff);
      if (await this.posted(tx, tenantId, dto.requestId)) return { duplicate: true, record: this.shape(rec) };
      if (rec.status === 'CANCELLED') throw new BadRequestException('Ye tankhwah cancel ho chuki hai');
      const due = r0(rec.balanceAmount);
      if (due <= 0) throw new BadRequestException('Is tankhwah me kuch baqi nahi');
      const amount = Math.min(r0(dto.amount), due);
      const branch = rec.staff.shopId ?? this.branch(user, scope, dto.shopId);
      const payer = (await this.payer(tx, user, dto, branch, amount))!;
      const month = monthKeyOf(rec.periodStart);
      await this.move(tx, user, payer, {
        amount, number: rec.paymentNumber, key: `${dto.requestId}#0`, shopId: branch,
        reason: `Tankhwah baqi · ${rec.staff.fullName} (${monthLabel(month)})`,
      });
      const paid = r0(rec.paidAmount) + amount;
      const balance = r0(rec.netAmount) - paid;
      const updated = await tx.salaryPayment.update({
        where: { id: rec.id },
        data: { paidAmount: paid, balanceAmount: balance, status: balance <= 0 ? 'PAID' : 'PARTIAL', paidAt: new Date(), paidById: user.id, paymentMethod: payer.method },
        include: RECORD_INCLUDE,
      });
      return { duplicate: false, record: this.shape(updated) };
    }, TX);
  }

  /**
   * Cancels a salary (PAY-…) or a whole advance (ADV-…). Money paid comes
   * back to where it went out from; drawer money goes into the branch's open
   * register. An advance already cut from a salary cannot be cancelled.
   */
  async cancel(user: AuthenticatedUser, scope: ShopScope, id: string, dto: CancelDto) {
    const tenantId = user.tenantId;
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, tenantId);
      const rec = await tx.salaryPayment.findFirst({ where: { id, tenantId }, include: RECORD_INCLUDE });
      if (!rec) throw new NotFoundException('Record nahi mila');
      this.checkStaffAccess(user, rec.staff);
      if (rec.status === 'CANCELLED') throw new BadRequestException('Ye pehle hi cancel hai');

      const isAdvance = rec.paymentNumber.startsWith(ADV);
      const number = isAdvance ? groupOf(rec.paymentNumber) : rec.paymentNumber;
      const parts = isAdvance
        ? await tx.salaryPayment.findMany({
          where: { tenantId, staffId: rec.staffId, status: LIVE_STATUS, OR: [{ paymentNumber: number }, { paymentNumber: { startsWith: `${number}-` } }] },
        })
        : [rec];
      if (isAdvance) {
        for (const p of parts) {
          const { first, next } = monthDates(monthKeyOf(p.periodStart));
          const cut = await tx.salaryPayment.findFirst({
            where: { tenantId, staffId: rec.staffId, paymentNumber: { startsWith: PAY }, status: LIVE_STATUS, periodStart: { gte: first, lt: next } },
            select: { paymentNumber: true },
          });
          if (cut) throw new BadRequestException(`Is advance ki qist ${cut.paymentNumber} me kat chuki hai. Pehle woh tankhwah cancel karein.`);
        }
      }

      // What went out and has not come back yet, per drawer / account.
      const note = moneyTag(number);
      const [cash, entries] = await Promise.all([
        tx.cashTransaction.findMany({ where: { tenantId, note }, select: { type: true, amount: true } }),
        tx.moneyAccountEntry.findMany({ where: { tenantId, note }, select: { type: true, amount: true, accountId: true } }),
      ]);
      const cashOut = cash.reduce((a, c) => a + (c.type === 'CASH_OUT' ? n(c.amount) : -n(c.amount)), 0);
      const byAccount = new Map<string, number>();
      for (const e of entries) byAccount.set(e.accountId, (byAccount.get(e.accountId) ?? 0) + (e.type === 'WITHDRAW' ? n(e.amount) : -n(e.amount)));

      const reason = `${isAdvance ? 'Advance' : 'Tankhwah'} wapas · ${rec.staff.fullName} (${number})`;
      let k = 0;
      if (cashOut > 0.5) {
        const branch = rec.staff.shopId ?? this.branch(user, scope, dto.shopId);
        const payer = (await this.payer(tx, user, { source: 'DRAWER', requestId: dto.requestId }, branch, cashOut, true))!;
        await this.move(tx, user, payer, { amount: cashOut, number, key: `${dto.requestId}#${k++}`, shopId: branch, reason, back: true });
      }
      for (const [accountId, amount] of byAccount) {
        if (amount <= 0.5) continue;
        const payer = (await this.payer(tx, user, { source: 'ACCOUNT', accountId, requestId: dto.requestId }, null, amount, true))!;
        await this.move(tx, user, payer, { amount, number, key: `${dto.requestId}#${k++}`, shopId: rec.staff.shopId, reason, back: true });
      }

      const stamp = `Cancel: ${dto.reason.trim()}`;
      for (const p of parts) {
        await tx.salaryPayment.update({
          where: { id: p.id },
          data: { status: 'CANCELLED', notes: [p.notes, stamp].filter(Boolean).join('\n') },
        });
      }
      if (!isAdvance && rec.commissionEarned > 0) {
        const userId = (await tx.staff.findUnique({ where: { id: rec.staffId }, select: { userId: true } }))?.userId;
        if (userId) {
          await tx.commissionPayout.deleteMany({
            where: { tenantId, userId, period: monthKeyOf(rec.periodStart), note: `Tankhwah ${rec.paymentNumber} me ada` },
          });
        }
      }
      await tx.activityLog.create({
        data: {
          tenantId, userId: user.id, action: isAdvance ? 'SALARY_ADVANCE_CANCELLED' : 'SALARY_CANCELLED', entityType: 'SalaryPayment', entityId: rec.id,
          description: `${number} cancel · ${rec.staff.fullName} · wapas ${rs(cashOut + [...byAccount.values()].reduce((a, v) => a + Math.max(0, v), 0))} · ${dto.reason.trim()}`,
          metadata: { number, cashBack: cashOut, accountsBack: Object.fromEntries(byAccount) },
        },
      });
      return { ok: true, number };
    }, TX);
  }

  /* ═════════════════════════ advances ═════════════════════════ */

  async createAdvance(user: AuthenticatedUser, scope: ShopScope, dto: CreateAdvanceDto) {
    if (dto.source === 'NONE') throw new BadRequestException('Advance dene ke liye galla ya account chunein');
    const tenantId = user.tenantId;
    const count = dto.installments ?? 1;
    const amount = r0(dto.amount);
    if (amount < count) throw new BadRequestException('Amount qiston se kam hai');
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const thisMonth = businessDayKey(new Date(), tz, dayStartHour).slice(0, 7);
    if (dto.firstMonth < shiftMonth(thisMonth, -1)) throw new BadRequestException('Qist pichle mahine se pehle shuru nahi ho sakti');
    if (dto.firstMonth > shiftMonth(thisMonth, 12)) throw new BadRequestException('Qist ek saal ke andar shuru karein');

    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, tenantId);
      if (await this.posted(tx, tenantId, dto.requestId)) return { duplicate: true };
      const staff = await tx.staff.findFirst({ where: { id: dto.staffId, tenantId }, select: STAFF_SELECT });
      if (!staff) throw new NotFoundException('Staff nahi mila');
      this.checkStaffAccess(user, staff);
      if (staff.status === 'TERMINATED' || staff.status === 'RESIGNED') throw new BadRequestException(`${staff.fullName} kaam chhor chuka hai — advance nahi de sakte`);

      const months = Array.from({ length: count }, (_, i) => shiftMonth(dto.firstMonth, i));
      const done = await tx.salaryPayment.findFirst({
        where: {
          tenantId, staffId: staff.id, paymentNumber: { startsWith: PAY }, status: LIVE_STATUS,
          periodStart: { gte: monthDates(months[0]).first, lt: monthDates(months[months.length - 1]).next },
        },
        select: { periodStart: true },
      });
      if (done) throw new BadRequestException(`${monthLabel(monthKeyOf(done.periodStart))} ki tankhwah ban chuki hai — qist agle mahine se shuru karein`);

      const branch = staff.shopId ?? this.branch(user, scope, dto.shopId);
      const payer = (await this.payer(tx, user, dto, branch, amount))!;
      const base = await this.nextNumber(tx, tenantId, ADV);
      const each = Math.floor(amount / count);
      const reason = dto.reason.trim();
      const now = new Date();
      const rows = [];
      for (let i = 0; i < count; i += 1) {
        const part = i === count - 1 ? amount - each * (count - 1) : each;
        const { first, last } = monthDates(months[i]);
        rows.push(await tx.salaryPayment.create({
          data: {
            tenantId, staffId: staff.id, paymentNumber: count > 1 ? `${base}-${i + 1}` : base, periodStart: first, periodEnd: last,
            advances: part, netAmount: part, paidAmount: part, balanceAmount: 0,
            paymentMethod: payer.method, status: 'PAID', paidAt: now, paidById: user.id,
            notes: count > 1 ? `${reason}\nQist ${i + 1}/${count} · kul ${rs(amount)}` : reason,
          },
        }));
      }
      await this.move(tx, user, payer, {
        amount, number: base, key: `${dto.requestId}#0`, shopId: branch,
        reason: `Advance · ${staff.fullName}${count > 1 ? ` (${count} qist)` : ''}`,
      });
      await tx.activityLog.create({
        data: {
          tenantId, userId: user.id, action: 'SALARY_ADVANCE', entityType: 'SalaryPayment', entityId: rows[0].id,
          description: `${base} · ${staff.fullName} ko ${rs(amount)} advance (${payer.label})${count > 1 ? ` · ${count} qist` : ''} · ${reason}`,
          metadata: { number: base, amount, installments: count, firstMonth: dto.firstMonth },
        },
      });
      return { duplicate: false, number: base, amount, installments: count, from: payer.label };
    }, TX);
  }

  /** Advances by group, with what is still to be cut. */
  async advances(user: AuthenticatedUser, scope: ShopScope, q: { shopId?: string; staffId?: string }) {
    const tenantId = user.tenantId;
    const branch = this.branch(user, scope, q.shopId);
    const rows = await this.prisma.salaryPayment.findMany({
      where: {
        tenantId, paymentNumber: { startsWith: ADV }, ...(q.staffId && { staffId: q.staffId }),
        staff: this.staffBranch(branch),
      },
      include: RECORD_INCLUDE,
      orderBy: [{ paidAt: 'desc' }, { paymentNumber: 'asc' }],
      take: 600,
    });
    const staffIds = [...new Set(rows.map((r) => r.staffId))];
    const salaries = staffIds.length
      ? await this.prisma.salaryPayment.findMany({
        where: { tenantId, staffId: { in: staffIds }, paymentNumber: { startsWith: PAY }, status: LIVE_STATUS },
        select: { staffId: true, periodStart: true, paymentNumber: true },
      })
      : [];
    const cutIn = new Map(salaries.map((s) => [`${s.staffId}:${monthKeyOf(s.periodStart)}`, s.paymentNumber]));

    const groups = new Map<string, ReturnType<PayrollService['groupShape']>>();
    for (const r of rows) {
      const key = groupOf(r.paymentNumber);
      const g = groups.get(key) ?? this.groupShape(r, key);
      const month = monthKeyOf(r.periodStart);
      const salary = cutIn.get(`${r.staffId}:${month}`) ?? null;
      g.parts.push({ id: r.id, number: r.paymentNumber, month, label: monthLabel(month), amount: n(r.paidAmount), cutIn: r.status === 'CANCELLED' ? null : salary });
      groups.set(key, g);
    }
    const list = [...groups.values()].map((g) => {
      const live = g.status !== 'CANCELLED';
      const left = live ? g.parts.filter((p) => !p.cutIn).reduce((a, p) => a + p.amount, 0) : 0;
      return { ...g, total: g.parts.reduce((a, p) => a + p.amount, 0), remaining: left, canCancel: live && g.parts.every((p) => !p.cutIn) };
    });
    const open = list.filter((g) => g.remaining > 0);
    return {
      groups: list,
      totals: { open: open.length, remaining: open.reduce((a, g) => a + g.remaining, 0), staff: new Set(open.map((g) => g.staff.id)).size },
    };
  }

  private groupShape(r: RecordRow, number: string) {
    const { note } = readNotes(r.notes);
    return {
      id: r.id, number, staff: r.staff, givenAt: r.paidAt, method: r.paymentMethod, status: r.status,
      reason: (note ?? '').split('\n').filter((l) => !l.startsWith('Qist ') && !l.startsWith('Cancel: ')).join(' ') || null,
      parts: [] as Array<{ id: string; number: string; month: string; label: string; amount: number; cutIn: string | null }>,
    };
  }

  /* ═════════════════════════ history and one record ═════════════════════════ */

  private shape(r: RecordRow) {
    const parsed = readNotes(r.notes);
    const month = monthKeyOf(r.periodStart);
    return {
      ...r,
      kind: r.paymentNumber.startsWith(ADV) ? ('advance' as const) : ('salary' as const),
      month,
      monthLabel: monthLabel(month),
      adds: parsed.adds,
      cuts: parsed.cuts,
      note: parsed.note,
    };
  }

  async history(user: AuthenticatedUser, scope: ShopScope, q: HistoryQueryDto) {
    const tenantId = user.tenantId;
    const branch = this.branch(user, scope, q.shopId);
    const s = q.search?.trim();
    const where: Prisma.SalaryPaymentWhereInput = {
      tenantId,
      staff: this.staffBranch(branch),
      ...(q.staffId && { staffId: q.staffId }),
      ...(q.kind && { paymentNumber: { startsWith: q.kind === 'advance' ? ADV : PAY } }),
      ...((q.from || q.to) && {
        periodStart: { ...(q.from && { gte: monthDates(q.from).first }), ...(q.to && { lt: monthDates(q.to).next }) },
      }),
      ...(s && {
        OR: [
          { paymentNumber: { contains: s, mode: 'insensitive' } },
          { staff: { fullName: { contains: s, mode: 'insensitive' } } },
          { staff: { staffNumber: { contains: s, mode: 'insensitive' } } },
        ],
      }),
    };
    const listWhere = { ...where, ...(q.status && { status: q.status }) };
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const [items, total, byStatus] = await Promise.all([
      this.prisma.salaryPayment.findMany({
        where: listWhere, include: RECORD_INCLUDE, skip: (page - 1) * limit, take: limit,
        orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.salaryPayment.count({ where: listWhere }),
      this.prisma.salaryPayment.groupBy({
        by: ['status'], where, _sum: { netAmount: true, paidAmount: true, balanceAmount: true, grossAmount: true }, _count: { _all: true },
      }),
    ]);
    const live = byStatus.filter((b) => b.status !== 'CANCELLED');
    const add = (k: 'netAmount' | 'paidAmount' | 'balanceAmount' | 'grossAmount') => r0(live.reduce((a, b) => a + n(b._sum[k]), 0));
    return {
      items: items.map((r) => this.shape(r)),
      total, page, pages: Math.max(1, Math.ceil(total / limit)),
      totals: {
        gross: add('grossAmount'), net: add('netAmount'), paid: add('paidAmount'), due: add('balanceAmount'),
        count: live.reduce((a, b) => a + b._count._all, 0),
        cancelled: byStatus.find((b) => b.status === 'CANCELLED')?._count._all ?? 0,
      },
    };
  }

  async record(user: AuthenticatedUser, id: string) {
    const tenantId = user.tenantId;
    const r = await this.prisma.salaryPayment.findFirst({ where: { id, tenantId }, include: RECORD_INCLUDE });
    if (!r) throw new NotFoundException('Record nahi mila');
    this.checkStaffAccess(user, r.staff);
    const isAdvance = r.paymentNumber.startsWith(ADV);
    const number = isAdvance ? groupOf(r.paymentNumber) : r.paymentNumber;
    const { first, next } = monthDates(monthKeyOf(r.periodStart));
    const [staff, money, related, paidBy] = await Promise.all([
      this.prisma.staff.findUnique({ where: { id: r.staffId }, select: STAFF_SELECT }),
      this.movements(tenantId, number),
      // Salary: the advances cut from it. Advance: its other instalments.
      this.prisma.salaryPayment.findMany({
        where: isAdvance
          ? { tenantId, staffId: r.staffId, OR: [{ paymentNumber: number }, { paymentNumber: { startsWith: `${number}-` } }] }
          : { tenantId, staffId: r.staffId, paymentNumber: { startsWith: ADV }, status: LIVE_STATUS, periodStart: { gte: first, lt: next } },
        select: { id: true, paymentNumber: true, periodStart: true, paidAmount: true, status: true, paidAt: true },
        orderBy: { paymentNumber: 'asc' },
      }),
      r.paidById ? this.prisma.user.findFirst({ where: { id: r.paidById, tenantId }, select: { fullName: true } }) : null,
    ]);
    return {
      ...this.shape(r),
      staff,
      paidBy: paidBy?.fullName ?? null,
      money,
      related: related.map((x) => ({ ...x, month: monthKeyOf(x.periodStart), label: monthLabel(monthKeyOf(x.periodStart)) })),
    };
  }

  /* ═════════════════════════ analytics ═════════════════════════ */

  async analytics(user: AuthenticatedUser, scope: ShopScope, q: AnalyticsQueryDto) {
    const tenantId = user.tenantId;
    const branch = this.branch(user, scope, q.shopId);
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const end = q.month ?? businessDayKey(new Date(), tz, dayStartHour).slice(0, 7);
    const count = q.months ?? 12;
    const keys = Array.from({ length: count }, (_, i) => shiftMonth(end, i - count + 1));
    const from = monthDates(keys[0]).first;
    const to = monthDates(end).next;

    const rows = await this.prisma.salaryPayment.findMany({
      where: { tenantId, status: LIVE_STATUS, periodStart: { gte: from, lt: to }, staff: this.staffBranch(branch) },
      select: {
        paymentNumber: true, periodStart: true, staffId: true, grossAmount: true, netAmount: true, paidAmount: true, balanceAmount: true,
        baseSalary: true, overtimePay: true, commissionEarned: true, bonuses: true, leaveDeduction: true, otherDeductions: true, advances: true,
        staff: { select: { fullName: true, designation: true, shopId: true, shop: { select: { name: true } } } },
      },
    });

    const monthRange = (k: string) => {
      const [y, m] = k.split('-').map(Number);
      return { gte: startOfBusinessMonthTz(y, m, tz, dayStartHour), lt: startOfBusinessMonthTz(y, m + 1, tz, dayStartHour) };
    };
    const window = { gte: monthRange(keys[0]).gte, lt: monthRange(end).lt };
    const [salesByMonth, salesByShop, shops] = await Promise.all([
      Promise.all(keys.map((k) => this.prisma.sale.aggregate({
        where: { tenantId, status: { in: [...COUNTED_SALES] }, soldAt: monthRange(k), ...(branch && { shopId: branch }) },
        _sum: { total: true },
      }))),
      this.prisma.sale.groupBy({
        by: ['shopId'], where: { tenantId, status: { in: [...COUNTED_SALES] }, soldAt: window, ...(branch && { shopId: branch }) },
        _sum: { total: true },
      }),
      this.prisma.shop.findMany({ where: { tenantId }, select: { id: true, name: true } }),
    ]);

    const months = keys.map((k, i) => ({
      key: k, label: monthLabel(k), gross: 0, net: 0, paid: 0, due: 0, base: 0, overtime: 0, commission: 0, bonuses: 0,
      cuts: 0, advanceGiven: 0, staff: 0, sales: r0(n(salesByMonth[i]._sum.total)), pct: null as number | null,
    }));
    const idx = new Map(keys.map((k, i) => [k, i]));
    const people = new Map<string, { key: string; label: string; designation: string; gross: number; months: number }>();
    const branches = new Map<string, { key: string; label: string; gross: number; staff: Set<string> }>();
    const designations = new Map<string, number>();
    for (const r of rows) {
      const mo = months[idx.get(monthKeyOf(r.periodStart)) ?? -1];
      if (!mo) continue;
      if (r.paymentNumber.startsWith(ADV)) { mo.advanceGiven += n(r.paidAmount); continue; }
      mo.gross += n(r.grossAmount); mo.net += n(r.netAmount); mo.paid += n(r.paidAmount); mo.due += n(r.balanceAmount);
      mo.base += n(r.baseSalary); mo.overtime += n(r.overtimePay); mo.commission += n(r.commissionEarned); mo.bonuses += n(r.bonuses);
      mo.cuts += n(r.leaveDeduction) + n(r.otherDeductions); mo.staff += 1;
      const p = people.get(r.staffId) ?? { key: r.staffId, label: r.staff.fullName, designation: r.staff.designation, gross: 0, months: 0 };
      p.gross += n(r.grossAmount); p.months += 1; people.set(r.staffId, p);
      const bk = r.staff.shopId ?? '-';
      const b = branches.get(bk) ?? { key: bk, label: r.staff.shop?.name ?? 'Branch nahi lagi', gross: 0, staff: new Set<string>() };
      b.gross += n(r.grossAmount); b.staff.add(r.staffId); branches.set(bk, b);
      designations.set(r.staff.designation || 'Staff', (designations.get(r.staff.designation || 'Staff') ?? 0) + n(r.grossAmount));
    }
    for (const mo of months) {
      for (const k of ['gross', 'net', 'paid', 'due', 'base', 'overtime', 'commission', 'bonuses', 'cuts', 'advanceGiven'] as const) mo[k] = r0(mo[k]);
      mo.pct = pct(mo.gross, mo.sales);
    }
    const shopName = new Map(shops.map((s) => [s.id, s.name]));
    const saleOf = new Map(salesByShop.map((s) => [s.shopId ?? '-', n(s._sum.total)]));
    const totalGross = months.reduce((a, m) => a + m.gross, 0);
    const totalSales = months.reduce((a, m) => a + m.sales, 0);
    const cur = months[months.length - 1];
    const prev = months[months.length - 2];
    const ran = months.filter((m) => m.staff > 0);
    return {
      months,
      totals: {
        gross: totalGross, sales: totalSales, pct: pct(totalGross, totalSales),
        average: ran.length ? r0(totalGross / ran.length) : 0,
        perStaff: cur?.staff ? r0(cur.gross / cur.staff) : 0,
        current: cur?.gross ?? 0, previous: prev?.gross ?? 0,
        change: prev && prev.gross > 0 ? Math.round(((cur.gross - prev.gross) / prev.gross) * 1000) / 10 : null,
        advanceGiven: months.reduce((a, m) => a + m.advanceGiven, 0),
      },
      mix: [
        { key: 'base', label: 'Asal tankhwah', amount: months.reduce((a, m) => a + m.base, 0) },
        { key: 'overtime', label: 'Overtime', amount: months.reduce((a, m) => a + m.overtime, 0) },
        { key: 'commission', label: 'Commission', amount: months.reduce((a, m) => a + m.commission, 0) },
        { key: 'bonuses', label: 'Bonus', amount: months.reduce((a, m) => a + m.bonuses, 0) },
      ].filter((x) => x.amount > 0),
      byBranch: [...branches.values()].map((b) => {
        const sales = b.key === '-' ? 0 : r0(saleOf.get(b.key) ?? 0);
        return { key: b.key, label: b.key === '-' ? b.label : shopName.get(b.key) ?? b.label, gross: r0(b.gross), staff: b.staff.size, sales, pct: pct(b.gross, sales) };
      }).sort((a, b) => b.gross - a.gross),
      byStaff: [...people.values()].map((p) => ({ ...p, gross: r0(p.gross), average: r0(p.gross / Math.max(1, p.months)) }))
        .sort((a, b) => b.gross - a.gross).slice(0, 15),
      byDesignation: [...designations.entries()].map(([label, amount]) => ({ key: label, label, amount: r0(amount) })).sort((a, b) => b.amount - a.amount),
    };
  }
}

/** The editable parts of a run line, as the calculator takes them. */
interface RunRowLike {
  adds?: Array<{ label: string; amount: number }>;
  cuts?: Array<{ label: string; amount: number }>;
  units?: number;
  overtimePay?: number;
  skipAbsentCut?: boolean;
  includeCommission?: boolean;
  payAmount?: number;
  note?: string;
}
