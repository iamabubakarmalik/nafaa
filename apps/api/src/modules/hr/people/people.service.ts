/**
 * The staff directory: one row per person, joining the app login (User) and
 * the HR record (Staff). Either side can be missing: an owner may have no HR
 * record, a helper may have no login.
 *
 * What a viewer sees follows their own permissions, block by block:
 *   staff.view       the directory, HR record, attendance, salary
 *   team.view        login details, permissions, login history, devices
 *   sales.view       sales figures per person
 *   commission.*     commission enrolment and payouts
 *   activity.view    the activity log
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SaleStatus, StaffStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey, startOfBusinessDayTz, zonedToUtc, safeDayStart } from '../../../common/helpers/business-time.helper';
import { hasPermission, PERMISSIONS, type PermissionKey } from '../../../common/constants/permissions.constants';
import { periodRange } from '../../inventory/taxonomy/taxonomy.helper';
import type { ShopScope } from '../../../common/shop-scope';
import type { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

const COUNTED: SaleStatus[] = [SaleStatus.COMPLETED, SaleStatus.PARTIALLY_RETURNED];
const DAY = 86_400_000;

type PersonStatus = 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE' | 'LEFT';

const USER_SELECT = {
  id: true, fullName: true, email: true, phone: true, role: true, isActive: true, avatarUrl: true,
  permissions: true, shopId: true, lastLoginAt: true, createdAt: true,
  assignedShop: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

const STAFF_SELECT = {
  id: true, userId: true, staffNumber: true, fullName: true, phone: true, email: true, avatarUrl: true,
  designation: true, department: true, status: true, joinDate: true, endDate: true, shopId: true,
  salaryType: true, baseSalary: true,
  shop: { select: { id: true, name: true } },
} satisfies Prisma.StaffSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;
type StaffRow = Prisma.StaffGetPayload<{ select: typeof STAFF_SELECT }>;

const num = (v: unknown) => Number(v ?? 0) || 0;
const round = (v: number) => Math.round(v * 100) / 100;

@Injectable()
export class PeopleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: TenantTimezoneService,
  ) {}

  private can(user: AuthenticatedUser, p: PermissionKey) {
    return hasPermission(user.role, user.permissions, p);
  }

  /** Who sees what on these pages; the web shows a note where a block is hidden. */
  private viewer(user: AuthenticatedUser) {
    return {
      team: this.can(user, PERMISSIONS.TEAM_VIEW),
      sales: this.can(user, PERMISSIONS.SALES_VIEW),
      activity: this.can(user, PERMISSIONS.ACTIVITY_VIEW),
      commission: this.can(user, PERMISSIONS.COMMISSION_VIEW) || this.can(user, PERMISSIONS.COMMISSION_MANAGE),
      owner: user.role === UserRole.OWNER || user.role === UserRole.SUPER_ADMIN,
    };
  }

  private status(u: UserRow | null, s: StaffRow | null): PersonStatus {
    if (s && (s.status === StaffStatus.TERMINATED || s.status === StaffStatus.RESIGNED)) return 'LEFT';
    if (s?.status === StaffStatus.ON_LEAVE) return 'ON_LEAVE';
    if (s?.status === StaffStatus.SUSPENDED || (u && !u.isActive)) return 'INACTIVE';
    return 'ACTIVE';
  }

  private base(u: UserRow | null, s: StaffRow | null, showLogin: boolean) {
    const shop = u?.assignedShop ?? s?.shop ?? null;
    return {
      id: s?.id ?? u!.id,
      userId: u?.id ?? null,
      staffId: s?.id ?? null,
      fullName: u?.fullName ?? s!.fullName,
      phone: u?.phone ?? s?.phone ?? null,
      email: u?.email ?? s?.email ?? null,
      avatarUrl: s?.avatarUrl ?? u?.avatarUrl ?? null,
      role: u?.role ?? null,
      designation: s?.designation ?? null,
      department: s?.department ?? null,
      staffNumber: s?.staffNumber ?? null,
      staffStatus: s?.status ?? null,
      joinDate: s?.joinDate ?? u?.createdAt ?? null,
      endDate: s?.endDate ?? null,
      shop,
      status: this.status(u, s),
      hasLogin: !!u,
      login: u && showLogin
        ? { isActive: u.isActive, lastLoginAt: u.lastLoginAt, permissionsCount: u.permissions.length, neverLoggedIn: !u.lastLoginAt }
        : null,
    };
  }

  /** Users and HR records of the tenant, paired by `Staff.userId`. */
  private async pairs(tenantId: string) {
    const [users, staff] = await Promise.all([
      this.prisma.user.findMany({ where: { tenantId, role: { not: UserRole.SUPER_ADMIN } }, select: USER_SELECT, orderBy: { createdAt: 'asc' } }),
      this.prisma.staff.findMany({ where: { tenantId }, select: STAFF_SELECT, orderBy: { joinDate: 'asc' } }),
    ]);
    const userIds = new Set(users.map((u) => u.id));
    const staffByUser = new Map(staff.filter((s) => s.userId).map((s) => [s.userId as string, s]));
    const out: Array<{ u: UserRow | null; s: StaffRow | null }> = users.map((u) => ({ u, s: staffByUser.get(u.id) ?? null }));
    for (const s of staff) if (!s.userId || !userIds.has(s.userId)) out.push({ u: null, s });
    return out;
  }

  private inScope(p: { u: UserRow | null; s: StaffRow | null }, shopId: string | null) {
    if (!shopId) return true;
    const own = p.u?.shopId ?? p.s?.shopId ?? null;
    return own === null || own === shopId;
  }

  /** Today's business day as stored in `Attendance.date` (a plain date). */
  private async today(tenantId: string) {
    const { tz, dayStartHour } = await this.clock.clock(tenantId);
    const key = businessDayKey(new Date(), tz, dayStartHour);
    return { key, date: new Date(`${key}T00:00:00.000Z`), start: startOfBusinessDayTz(new Date(), tz, dayStartHour), tz, dayStartHour };
  }

  /** Net sale per seller: the person picked at the counter, else the cashier who rang it up. */
  private bySeller(rows: Array<{ soldById: string | null; createdById: string | null; total: number; refundedAmount: number }>) {
    const map = new Map<string, { sales: number; bills: number }>();
    for (const r of rows) {
      const id = r.soldById ?? r.createdById;
      if (!id) continue;
      const m = map.get(id) ?? { sales: 0, bills: 0 };
      m.sales += Math.max(num(r.total) - num(r.refundedAmount), 0);
      m.bills += 1;
      map.set(id, m);
    }
    return map;
  }

  // ───────────────────────── Directory ─────────────────────────

  async list(user: AuthenticatedUser, scope: ShopScope) {
    const v = this.viewer(user);
    const t = await this.today(user.tenantId);
    const all = (await this.pairs(user.tenantId)).filter((p) => this.inScope(p, scope.shopId));
    const staffIds = all.map((p) => p.s?.id).filter(Boolean) as string[];

    const [attendance, shifts, sales] = await Promise.all([
      staffIds.length
        ? this.prisma.attendance.findMany({
          where: { tenantId: user.tenantId, date: t.date, staffId: { in: staffIds } },
          select: { staffId: true, status: true, checkIn: true, checkOut: true },
        })
        : [],
      this.prisma.cashRegister.findMany({
        where: { tenantId: user.tenantId, status: 'OPEN', ...scope.where },
        select: { openedById: true, openedAt: true, registerNumber: true },
      }),
      v.sales
        ? this.prisma.sale.findMany({
          where: { tenantId: user.tenantId, soldAt: { gte: t.start }, status: { in: COUNTED }, ...scope.where },
          select: { soldById: true, createdById: true, total: true, refundedAmount: true },
        })
        : [],
    ]);

    const att = new Map(attendance.map((a) => [a.staffId, a]));
    const shiftBy = new Map(shifts.map((s) => [s.openedById, s]));
    const sold = this.bySeller(sales);

    return all.map(({ u, s }) => {
      const a = s ? att.get(s.id) : undefined;
      const shift = u ? shiftBy.get(u.id) : undefined;
      const onDuty = shift
        ? { via: 'SHIFT' as const, since: shift.openedAt, label: shift.registerNumber }
        : a?.checkIn && !a.checkOut ? { via: 'ATTENDANCE' as const, since: a.checkIn, label: null } : null;
      const today = v.sales && u ? sold.get(u.id) ?? { sales: 0, bills: 0 } : null;
      return {
        ...this.base(u, s, v.team),
        onDuty,
        todayAttendance: a?.status ?? null,
        today: today ? { sales: round(today.sales), bills: today.bills } : null,
      };
    });
  }

  // ───────────────────────── Profile ─────────────────────────

  async profile(user: AuthenticatedUser, id: string) {
    const v = this.viewer(user);
    const [staffHit, userHit] = await Promise.all([
      this.prisma.staff.findFirst({ where: { id, tenantId: user.tenantId }, select: STAFF_SELECT }),
      this.prisma.user.findFirst({ where: { id, tenantId: user.tenantId, role: { not: UserRole.SUPER_ADMIN } }, select: USER_SELECT }),
    ]);
    if (!staffHit && !userHit) throw new NotFoundException('Yeh banda nahi mila');
    const s: StaffRow | null = staffHit
      ?? await this.prisma.staff.findFirst({ where: { tenantId: user.tenantId, userId: userHit!.id }, select: STAFF_SELECT });
    const u: UserRow | null = userHit
      ?? (staffHit!.userId
        ? await this.prisma.user.findFirst({ where: { id: staffHit!.userId, tenantId: user.tenantId, role: { not: UserRole.SUPER_ADMIN } }, select: USER_SELECT })
        : null);

    /* Branch-locked viewers see only their own branch's people (and those with no branch). */
    const own = u?.shopId ?? s?.shopId ?? null;
    if (!v.owner && user.shopId && own && own !== user.shopId) {
      throw new ForbiddenException('Doosri branch ka banda — sirf apni branch ke log dekh sakte hain');
    }

    const t = await this.today(user.tenantId);
    const monthStartKey = `${t.key.slice(0, 7)}-01`;
    const [y, m] = t.key.split('-').map(Number);
    const monthStart = zonedToUtc(y, m, 1, safeDayStart(t.dayStartHour), 0, 0, t.tz);
    const since30 = new Date(t.start.getTime() - 29 * DAY);
    const isSelf = user.id === u?.id;
    const seesCommission = v.commission || (isSelf && this.can(user, PERMISSIONS.COMMISSION_OWN));

    const [hr, attendance, leaves, salaries, sessions, logins, sales, shift, enrollment, payouts, activity, history] = await Promise.all([
      s ? this.prisma.staff.findUnique({ where: { id: s.id }, include: { documents: { orderBy: { uploadedAt: 'desc' } } } }) : null,
      s ? this.prisma.attendance.findMany({
        where: { staffId: s.id, date: { gte: new Date(`${monthStartKey}T00:00:00.000Z`), lte: t.date } },
        select: { date: true, status: true, checkIn: true, checkOut: true, workedHours: true, overtimeHours: true, isLate: true, lateMinutes: true },
        orderBy: { date: 'asc' },
      }) : [],
      s ? this.prisma.staffLeave.findMany({
        where: { staffId: s.id }, orderBy: { startDate: 'desc' }, take: 8,
        select: { id: true, type: true, startDate: true, endDate: true, days: true, status: true, reason: true },
      }) : [],
      s ? this.prisma.salaryPayment.findMany({
        where: { staffId: s.id }, orderBy: { periodStart: 'desc' }, take: 6,
        select: { id: true, paymentNumber: true, periodStart: true, periodEnd: true, netAmount: true, paidAmount: true, balanceAmount: true, status: true, paidAt: true },
      }) : [],
      u && v.team ? this.prisma.session.findMany({
        where: { userId: u.id, expiresAt: { gt: new Date() } }, orderBy: { lastUsedAt: 'desc' }, take: 20,
        select: { id: true, deviceName: true, userAgent: true, ipAddress: true, location: true, lastUsedAt: true, createdAt: true },
      }) : [],
      u && v.team ? this.prisma.loginHistory.findMany({
        where: { userId: u.id }, orderBy: { createdAt: 'desc' }, take: 30,
        select: { id: true, success: true, failureReason: true, deviceName: true, ipAddress: true, location: true, isNewDevice: true, createdAt: true },
      }) : [],
      u && v.sales ? this.prisma.sale.findMany({
        where: { tenantId: user.tenantId, soldAt: { gte: since30 < monthStart ? since30 : monthStart }, status: { in: COUNTED }, OR: [{ soldById: u.id }, { soldById: null, createdById: u.id }] },
        select: { soldAt: true, total: true, refundedAmount: true, shopId: true, shop: { select: { name: true } } },
      }) : [],
      u ? this.prisma.cashRegister.findFirst({
        where: { tenantId: user.tenantId, openedById: u.id, status: 'OPEN' },
        select: { registerNumber: true, openedAt: true, shop: { select: { name: true } } },
      }) : null,
      u && seesCommission ? this.prisma.commissionEnrollment.findFirst({ where: { tenantId: user.tenantId, userId: u.id }, select: { isActive: true, since: true } }) : null,
      u && seesCommission ? this.prisma.commissionPayout.findMany({
        where: { tenantId: user.tenantId, userId: u.id }, orderBy: { period: 'desc' }, take: 6,
        select: { period: true, amount: true, paidAt: true, note: true },
      }) : [],
      u && v.activity ? this.prisma.activityLog.findMany({
        where: { tenantId: user.tenantId, userId: u.id }, orderBy: { createdAt: 'desc' }, take: 40,
        select: { id: true, action: true, entityType: true, description: true, createdAt: true },
      }) : [],
      u ? this.historyOf(u.id) : null,
    ]);

    const todayAtt = attendance.find((a) => a.date.getTime() === t.date.getTime());
    const login = u && v.team ? {
      id: u.id, email: u.email, phone: u.phone, role: u.role, isActive: u.isActive,
      permissions: u.permissions, lastLoginAt: u.lastLoginAt, createdAt: u.createdAt, shop: u.assignedShop,
    } : null;

    const att = s ? {
      month: t.key.slice(0, 7),
      present: attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length,
      late: attendance.filter((a) => a.isLate || a.status === 'LATE').length,
      halfDay: attendance.filter((a) => a.status === 'HALF_DAY').length,
      absent: attendance.filter((a) => a.status === 'ABSENT').length,
      leave: attendance.filter((a) => a.status === 'ON_LEAVE').length,
      hours: round(attendance.reduce((x, a) => x + num(a.workedHours), 0)),
      overtime: round(attendance.reduce((x, a) => x + num(a.overtimeHours), 0)),
      lateMinutes: attendance.reduce((x, a) => x + num(a.lateMinutes), 0),
      days: attendance.map((a) => ({
        date: a.date.toISOString().slice(0, 10), status: a.status, checkIn: a.checkIn, checkOut: a.checkOut, workedHours: round(num(a.workedHours)),
      })),
      leaves,
    } : null;

    const salary = hr ? {
      salaryType: hr.salaryType, baseSalary: hr.baseSalary,
      workingHoursPerDay: hr.workingHoursPerDay, workingDaysPerMonth: hr.workingDaysPerMonth,
      unpaid: round(salaries.filter((p) => p.status === 'PENDING' || p.status === 'PARTIAL').reduce((x, p) => x + num(p.balanceAmount), 0)),
      lastPaidAt: salaries.find((p) => p.paidAt)?.paidAt ?? null,
      payments: salaries,
    } : null;

    let salesBlock = null;
    if (u && v.sales) {
      const net = (r: { total: number; refundedAmount: number }) => Math.max(num(r.total) - num(r.refundedAmount), 0);
      const sum = (rows: typeof sales) => ({ sales: round(rows.reduce((x, r) => x + net(r), 0)), bills: rows.length });
      const days = new Map<string, number>();
      for (let i = 0; i < 30; i++) days.set(businessDayKey(new Date(since30.getTime() + i * DAY + 12 * 3600_000), t.tz, t.dayStartHour), 0);
      const branches = new Map<string, { name: string; sales: number; bills: number }>();
      for (const r of sales) {
        if (r.soldAt < since30) continue;
        const k = businessDayKey(r.soldAt, t.tz, t.dayStartHour);
        if (days.has(k)) days.set(k, (days.get(k) ?? 0) + net(r));
        const b = branches.get(r.shopId ?? '') ?? { name: r.shop?.name ?? 'Bina branch', sales: 0, bills: 0 };
        b.sales += net(r); b.bills += 1;
        branches.set(r.shopId ?? '', b);
      }
      const today = sum(sales.filter((r) => r.soldAt >= t.start));
      const month = sum(sales.filter((r) => r.soldAt >= monthStart));
      salesBlock = {
        today, month,
        avgBill: month.bills ? round(month.sales / month.bills) : 0,
        daily: [...days.entries()].map(([day, amount]) => ({ day, sales: round(amount) })),
        branches: [...branches.entries()].map(([shopId, b]) => ({ shopId: shopId || null, ...b, sales: round(b.sales) })).sort((a, b) => b.sales - a.sales),
      };
    }

    return {
      person: this.base(u, s, v.team),
      viewer: { ...v, self: isSelf, manage: this.can(user, PERMISSIONS.STAFF_MANAGE) },
      onDuty: shift
        ? { via: 'SHIFT' as const, since: shift.openedAt, label: `${shift.registerNumber}${shift.shop?.name ? ` · ${shift.shop.name}` : ''}` }
        : todayAtt?.checkIn && !todayAtt.checkOut ? { via: 'ATTENDANCE' as const, since: todayAtt.checkIn, label: 'Haazri' } : null,
      staff: hr,
      login,
      sessions,
      logins,
      attendance: att,
      salary,
      commission: seesCommission && u ? { enrolled: !!enrollment?.isActive, since: enrollment?.since ?? null, payouts } : null,
      sales: salesBlock,
      activity,
      history,
    };
  }

  /** Records that tie a login to the books; a login with any of these is never hard-deleted. */
  private async historyOf(userId: string) {
    const [sales, returns, expenses, shifts, purchases] = await Promise.all([
      this.prisma.sale.count({ where: { OR: [{ createdById: userId }, { soldById: userId }] } }),
      this.prisma.saleReturn.count({ where: { createdById: userId } }),
      this.prisma.expense.count({ where: { createdById: userId } }),
      this.prisma.cashRegister.count({ where: { OR: [{ openedById: userId }, { closedById: userId }] } }),
      this.prisma.purchase.count({ where: { createdById: userId } }),
    ]);
    return { sales, returns, expenses, shifts, purchases, any: sales + returns + expenses + shifts + purchases > 0 };
  }

  // ───────────────────────── Analytics ─────────────────────────

  async analytics(user: AuthenticatedUser, scope: ShopScope, from?: string, to?: string) {
    const v = this.viewer(user);
    const range = await periodRange(this.clock, user.tenantId, from, to);
    const { tz, dayStartHour } = await this.clock.clock(user.tenantId);
    const all = (await this.pairs(user.tenantId)).filter((p) => this.inScope(p, scope.shopId));
    const people = all.map((p) => ({ ...this.base(p.u, p.s, v.team), u: p.u, s: p.s }));
    const nameByUser = new Map(people.filter((p) => p.userId).map((p) => [p.userId as string, p.fullName]));
    const staffIds = people.map((p) => p.staffId).filter(Boolean) as string[];
    const fromKey = businessDayKey(range.gte, tz, dayStartHour);
    const toKey = businessDayKey(new Date(range.lt.getTime() - 1), tz, dayStartHour);

    const [sales, attendance, logins] = await Promise.all([
      v.sales ? this.prisma.sale.findMany({
        where: { tenantId: user.tenantId, soldAt: { gte: range.gte, lt: range.lt }, status: { in: COUNTED }, ...scope.where },
        select: { soldById: true, createdById: true, total: true, refundedAmount: true },
      }) : [],
      staffIds.length ? this.prisma.attendance.groupBy({
        by: ['staffId', 'status'],
        where: { tenantId: user.tenantId, staffId: { in: staffIds }, date: { gte: new Date(`${fromKey}T00:00:00.000Z`), lte: new Date(`${toKey}T00:00:00.000Z`) } },
        _count: { _all: true },
        _sum: { workedHours: true, lateMinutes: true },
      }) : [],
      v.team ? this.prisma.loginHistory.findMany({
        where: { tenantId: user.tenantId, createdAt: { gte: range.gte, lt: range.lt }, ...(scope.shopId ? { userId: { in: [...nameByUser.keys()] } } : {}) },
        select: { userId: true, success: true, createdAt: true },
      }) : [],
    ]);

    const sold = this.bySeller(sales);
    const sellers = v.sales
      ? [...sold.entries()].map(([id, x]) => ({ userId: id, name: nameByUser.get(id) ?? 'Purana login', sales: round(x.sales), bills: x.bills, avgBill: x.bills ? round(x.sales / x.bills) : 0 }))
        .sort((a, b) => b.sales - a.sales)
      : null;

    const attBy = new Map<string, { name: string; present: number; late: number; absent: number; leave: number; hours: number; lateMinutes: number }>();
    for (const g of attendance) {
      const p = people.find((x) => x.staffId === g.staffId);
      const row = attBy.get(g.staffId) ?? { name: p?.fullName ?? 'Staff', present: 0, late: 0, absent: 0, leave: 0, hours: 0, lateMinutes: 0 };
      const n = g._count._all;
      if (g.status === 'PRESENT' || g.status === 'HALF_DAY') row.present += n;
      if (g.status === 'LATE') { row.present += n; row.late += n; }
      if (g.status === 'ABSENT') row.absent += n;
      if (g.status === 'ON_LEAVE') row.leave += n;
      row.hours += num(g._sum.workedHours);
      row.lateMinutes += num(g._sum.lateMinutes);
      attBy.set(g.staffId, row);
    }

    const count = <K extends string>(keys: K[]) => {
      const m = new Map<K, number>();
      keys.forEach((k) => m.set(k, (m.get(k) ?? 0) + 1));
      return [...m.entries()].map(([key, n]) => ({ key, count: n })).sort((a, b) => b.count - a.count);
    };
    const current = people.filter((p) => p.status !== 'LEFT');

    /* Joined and left per month for the last 12 months (business calendar). */
    const nowKey = businessDayKey(new Date(), tz, dayStartHour);
    const months: Array<{ key: string; joined: number; left: number }> = [];
    let [yy, mm] = nowKey.split('-').map(Number);
    for (let i = 0; i < 12; i++) {
      months.unshift({ key: `${yy}-${String(mm).padStart(2, '0')}`, joined: 0, left: 0 });
      mm -= 1; if (mm === 0) { mm = 12; yy -= 1; }
    }
    const monthOf = (d: Date | null) => (d ? businessDayKey(d, tz, dayStartHour).slice(0, 7) : null);
    for (const p of people) {
      const j = months.find((x) => x.key === monthOf(p.s?.joinDate ?? p.u?.createdAt ?? null));
      if (j) j.joined += 1;
      const l = months.find((x) => x.key === monthOf(p.s?.endDate ?? null));
      if (l && p.status === 'LEFT') l.left += 1;
    }

    const tenure = { under3m: 0, under1y: 0, under3y: 0, over3y: 0 };
    for (const p of current) {
      const start = p.s?.joinDate ?? p.u?.createdAt;
      if (!start) continue;
      const days = (Date.now() - start.getTime()) / DAY;
      if (days < 91) tenure.under3m += 1; else if (days < 365) tenure.under1y += 1; else if (days < 1095) tenure.under3y += 1; else tenure.over3y += 1;
    }

    const loginDays = new Map<string, { ok: number; failed: number }>();
    const loginPeople = new Map<string, number>();
    for (const l of logins) {
      const k = businessDayKey(l.createdAt, tz, dayStartHour);
      const d = loginDays.get(k) ?? { ok: 0, failed: 0 };
      if (l.success) d.ok += 1; else d.failed += 1;
      loginDays.set(k, d);
      if (l.success) loginPeople.set(l.userId, (loginPeople.get(l.userId) ?? 0) + 1);
    }

    return {
      period: { from: fromKey, to: toKey },
      headcount: {
        total: current.length,
        byRole: count(current.map((p) => (p.role ?? 'NO_LOGIN') as string)),
        byBranch: count(current.map((p) => p.shop?.name ?? 'Sab branches')),
        byStatus: count(people.map((p) => p.status as string)),
        tenure,
      },
      months,
      sellers,
      attendance: [...attBy.values()].map((r) => ({ ...r, hours: round(r.hours) })).sort((a, b) => b.present - a.present),
      logins: v.team ? {
        daily: [...loginDays.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, x]) => ({ day, ...x })),
        failed: logins.filter((l) => !l.success).length,
        people: [...loginPeople.entries()].map(([id, n]) => ({ userId: id, name: nameByUser.get(id) ?? 'Login', count: n })).sort((a, b) => b.count - a.count),
        neverLoggedIn: people.filter((p) => p.u && p.u.isActive && !p.u.lastLoginAt).map((p) => ({ id: p.id, name: p.fullName })),
      } : null,
    };
  }

  // ───────────────────────── HR status ─────────────────────────

  /**
   * Mark an HR record working, on leave, suspended or gone. Leaving sets the
   * last day; coming back clears it. The login is not touched here: the
   * screen asks about it separately.
   */
  async setStatus(user: AuthenticatedUser, staffId: string, status: StaffStatus, endDate?: string) {
    const st = await this.prisma.staff.findFirst({ where: { id: staffId, tenantId: user.tenantId }, select: { id: true, fullName: true, shopId: true, status: true } });
    if (!st) throw new NotFoundException('HR record nahi mila');
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN && user.shopId && st.shopId && st.shopId !== user.shopId) {
      throw new ForbiddenException('Sirf apni branch ke staff ka haal badal sakte hain');
    }
    const leaving = status === StaffStatus.TERMINATED || status === StaffStatus.RESIGNED;
    let end: Date | null = null;
    if (leaving) {
      end = endDate ? new Date(endDate) : new Date();
      if (Number.isNaN(end.getTime())) throw new BadRequestException('Aakhri din ki tareekh theek nahi');
    }
    const updated = await this.prisma.staff.update({
      where: { id: st.id },
      data: { status, endDate: end },
      select: { id: true, status: true, endDate: true },
    });
    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId, userId: user.id, action: 'UPDATE', entityType: 'Staff', entityId: st.id,
        description: `${st.fullName}: ${st.status} → ${status}`,
        metadata: { from: st.status, to: status, endDate: end },
      },
    });
    return updated;
  }
}
