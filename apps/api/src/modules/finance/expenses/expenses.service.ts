/**
 * Shop expenses: record, edit, pay a pending bill, cancel and delete; a paged
 * list with totals, the headline numbers for the page, analytics for a
 * period, and the bills that come back every month. Every read and write is
 * held to the tenant and the branch; days and months follow the shop's
 * business day, never the server clock.
 *
 * Only PAID expenses count as spent; PENDING bills are shown apart and
 * CANCELLED ones count nowhere. A cash expense taken from the drawer is
 * `paymentMethod = CASH`, `status = PAID`, with its `shopId` and an
 * `expenseDate` inside the open shift; today's expenses and paid bills are
 * therefore stamped with the current time.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope, assertShopAccess, resolveWriteShopId } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import {
  businessDayKey, safeDayStart, startOfBusinessDayTz, startOfBusinessMonthTz, zonedToUtc,
} from '../../../common/helpers/business-time.helper';
import { periodRange } from '../../inventory/taxonomy/taxonomy.helper';
import { CreateExpenseDto, PayExpenseDto, UpdateExpenseDto } from './dto/create-expense.dto';
import { ExpenseFilterDto, ListExpensesDto } from './dto/list-expenses.dto';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;
/** A second identical expense from the same person within this window is a double click. */
const DUPLICATE_WINDOW_MS = 15_000;
/** Not cancelled: still a bill of the shop, paid or not. */
const LIVE = { not: ExpenseStatus.CANCELLED };
/** Only paid expenses count as money spent. */
const PAID = ExpenseStatus.PAID;

const INCLUDE = {
  category: true,
  shop: { select: { id: true, name: true, isMain: true } },
  createdBy: { select: { id: true, fullName: true } },
} satisfies Prisma.ExpenseInclude;

const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => Number(v ?? 0);
const normTitle = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ');
const pct = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : null);

/** "2026-10" → the month before / after, as "YYYY-MM". */
function shiftMonth(key: string, by: number) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Every day key from `from` to `to`, both included. */
function dayKeys(from: string, to: string) {
  const out: string[] = [];
  const [y, m, d] = from.split('-').map(Number);
  for (let t = Date.UTC(y, m - 1, d); out.length < 400; t += DAY) {
    const k = new Date(t).toISOString().slice(0, 10);
    if (k > to) break;
    out.push(k);
  }
  return out;
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /* ───────────────────────── helpers ───────────────────────── */

  /** The branch filter: the open branch, or one branch picked on the all-branches view. */
  private branch(user: AuthenticatedUser, scope: ShopScope, shopId?: string): { shopId?: string } {
    if (shopId && (!scope.shopId || scope.shopId === shopId)) {
      assertShopAccess(user, shopId, 'Doosri branch ka kharcha dekhna');
      return { shopId };
    }
    return scope.where;
  }

  /**
   * The moment to save for a chosen day. Today means now (so a cash expense
   * falls inside the open shift); an earlier day is saved at mid-day of that
   * business day; a future day is refused.
   */
  private async when(tenantId: string, raw?: string): Promise<Date | undefined> {
    if (!raw) return undefined;
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const today = businessDayKey(new Date(), tz, dayStartHour);
    const key = DAY_KEY.test(raw) ? raw : businessDayKey(new Date(raw), tz, dayStartHour);
    if (key > today) throw new BadRequestException('Aane wale din ka kharcha abhi nahi likh sakte');
    if (!DAY_KEY.test(raw)) return new Date(raw);
    if (raw === today) return new Date();
    const [y, m, d] = raw.split('-').map(Number);
    return zonedToUtc(y, m, d, safeDayStart(dayStartHour) + 12, 0, 0, tz);
  }

  private async checkCategory(tenantId: string, categoryId?: string) {
    if (!categoryId) return;
    const cat = await this.prisma.expenseCategory.findFirst({ where: { id: categoryId, tenantId }, select: { id: true } });
    if (!cat) throw new NotFoundException('Category nahi mili');
  }

  private async where(user: AuthenticatedUser, scope: ShopScope, q: ExpenseFilterDto): Promise<Prisma.ExpenseWhereInput> {
    const range = q.from && q.to ? await periodRange(this.tz, user.tenantId, q.from, q.to) : undefined;
    const s = q.search?.trim();
    const contains = (v: string) => ({ contains: v, mode: 'insensitive' as const });
    return {
      tenantId: user.tenantId,
      ...this.branch(user, scope, q.shopId),
      ...(range && { expenseDate: range }),
      ...(q.categoryId && { categoryId: q.categoryId === 'none' ? null : q.categoryId }),
      ...(q.paymentMethod && { paymentMethod: q.paymentMethod }),
      ...(q.createdById && { createdById: q.createdById }),
      ...(s && {
        OR: [
          { title: contains(s) },
          { description: contains(s) },
          { expenseNumber: contains(s) },
          { category: { name: contains(s) } },
        ],
      }),
    };
  }

  /** The expense the user may change, or 404 / 403. */
  private async editable(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id, tenantId: user.tenantId, ...scope.where } });
    if (!expense) throw new NotFoundException('Kharcha nahi mila');
    if (expense.shopId) assertShopAccess(user, expense.shopId, 'Kharcha badalna');
    return expense;
  }

  /* ───────────────────────── writes ───────────────────────── */

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateExpenseDto) {
    // An expense always belongs to one branch: rent, bills and wages all have a place.
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope, dto.shopId);
    assertShopAccess(user, shopId, 'Kharcha likhna');
    await this.checkCategory(user.tenantId, dto.categoryId);
    const expenseDate = await this.when(user.tenantId, dto.expenseDate);
    const { tz, dayStartHour } = await this.tz.clock(user.tenantId);
    const prefix = `EXP-${businessDayKey(new Date(), tz, dayStartHour).slice(2).replace(/-/g, '')}-`;
    const title = dto.title.trim();

    return this.prisma.$transaction(async (tx) => {
      // One writer per tenant at a time: keeps numbers unique and catches double clicks.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`expense:${user.tenantId}`}))::text`;

      const twin = await tx.expense.findFirst({
        where: {
          tenantId: user.tenantId, shopId, createdById: user.id, title, amount: r2(dto.amount),
          categoryId: dto.categoryId || null, paymentMethod: dto.paymentMethod,
          createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
        },
        include: INCLUDE,
      });
      if (twin) return twin;

      const last = await tx.expense.findFirst({
        where: { tenantId: user.tenantId, expenseNumber: { startsWith: prefix } },
        orderBy: { expenseNumber: 'desc' },
        select: { expenseNumber: true },
      });
      const next = (Number(last?.expenseNumber.slice(prefix.length)) || 0) + 1;

      return tx.expense.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          createdById: user.id,
          categoryId: dto.categoryId || null,
          expenseNumber: `${prefix}${String(next).padStart(3, '0')}`,
          title,
          description: dto.description?.trim() || null,
          amount: r2(dto.amount),
          paymentMethod: dto.paymentMethod,
          ...(expenseDate && { expenseDate }),
          attachmentUrl: dto.attachmentUrl || null,
          status: dto.status ?? ExpenseStatus.PAID,
        },
        include: INCLUDE,
      });
    });
  }

  async update(user: AuthenticatedUser, scope: ShopScope, id: string, dto: UpdateExpenseDto) {
    const before = await this.editable(user, scope, id);
    if (dto.categoryId) await this.checkCategory(user.tenantId, dto.categoryId);
    // A bill marked paid here is paid now, like `pay`, unless a day was picked.
    const paidNow = before.status === ExpenseStatus.PENDING && dto.status === ExpenseStatus.PAID && !dto.expenseDate;
    const expenseDate = paidNow ? new Date() : await this.when(user.tenantId, dto.expenseDate);

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description.trim() || null }),
        ...(dto.amount !== undefined && { amount: r2(dto.amount) }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId || null }),
        ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod }),
        ...(expenseDate && { expenseDate }),
        ...(dto.attachmentUrl !== undefined && { attachmentUrl: dto.attachmentUrl || null }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: INCLUDE,
    });
  }

  /**
   * Pays a pending bill now. The date moves to the moment of payment, so a
   * cash payment is taken from the shift that is open now.
   */
  async pay(user: AuthenticatedUser, scope: ShopScope, id: string, dto: PayExpenseDto) {
    const expense = await this.editable(user, scope, id);
    const done = await this.prisma.expense.updateMany({
      where: { id, tenantId: user.tenantId, status: ExpenseStatus.PENDING },
      data: { status: ExpenseStatus.PAID, paymentMethod: dto.paymentMethod ?? expense.paymentMethod, expenseDate: new Date() },
    });
    if (!done.count) throw new BadRequestException('Yeh bill baqi nahi tha — shayad pehle hi ada ho chuka hai');
    return this.prisma.expense.findUniqueOrThrow({ where: { id }, include: INCLUDE });
  }

  async remove(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const expense = await this.editable(user, scope, id);
    await this.prisma.$transaction([
      this.prisma.expense.delete({ where: { id } }),
      this.prisma.activityLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'EXPENSE_DELETED',
          entityType: 'Expense',
          entityId: id,
          description: `Kharcha mitaya: ${expense.expenseNumber} · ${expense.title} · Rs ${expense.amount}`,
          metadata: { amount: expense.amount, paymentMethod: expense.paymentMethod, status: expense.status, expenseDate: expense.expenseDate.toISOString(), shopId: expense.shopId },
        },
      }),
    ]);
    return { message: 'Expense deleted successfully' };
  }

  /* ───────────────────────── reads ───────────────────────── */

  /** The latest 100, as an array. Kept for the mobile app and the offline cache. */
  findAll(user: AuthenticatedUser, scope: ShopScope) {
    return this.prisma.expense.findMany({
      where: { tenantId: user.tenantId, ...scope.where },
      include: INCLUDE,
      orderBy: { expenseDate: 'desc' },
      take: 100,
    });
  }

  /** One page of the record, with totals by status for the whole filter; `amount` is what was paid. */
  async page(user: AuthenticatedUser, scope: ShopScope, q: ListExpensesDto) {
    const base = await this.where(user, scope, q);
    const where = { ...base, ...(q.status && { status: q.status }) };
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const [items, total, byStatus] = await Promise.all([
      this.prisma.expense.findMany({
        where, include: INCLUDE, skip: (page - 1) * limit, take: limit,
        orderBy: q.sort === 'amount' ? [{ amount: 'desc' }, { expenseDate: 'desc' }] : [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.groupBy({ by: ['status'], where: base, _sum: { amount: true }, _count: { _all: true } }),
    ]);
    const st = (k: ExpenseStatus) => byStatus.find((b) => b.status === k);
    const paid = num(st('PAID')?._sum.amount);
    const pending = num(st('PENDING')?._sum.amount);
    return {
      items, total, page, pages: Math.max(1, Math.ceil(total / limit)),
      totals: {
        amount: r2(paid),
        paid: r2(paid),
        pending: r2(pending),
        cancelled: r2(num(st('CANCELLED')?._sum.amount)),
        paidCount: st('PAID')?._count._all ?? 0,
        pendingCount: st('PENDING')?._count._all ?? 0,
        cancelledCount: st('CANCELLED')?._count._all ?? 0,
      },
    };
  }

  /**
   * Headline numbers (paid only): today, this month against the same days of
   * last month, the biggest category this month; then unpaid bills, cash taken from the open
   * shift, and who has recorded expenses (for the staff filter).
   */
  async overview(user: AuthenticatedUser, scope: ShopScope, shopId?: string) {
    const tenantId = user.tenantId;
    const branch = this.branch(user, scope, shopId);
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const now = new Date();
    const [y, m] = businessDayKey(now, tz, dayStartHour).split('-').map(Number);
    const todayStart = startOfBusinessDayTz(now, tz, dayStartHour);
    const monthStart = startOfBusinessMonthTz(y, m, tz, dayStartHour);
    const lastStart = startOfBusinessMonthTz(y, m - 1, tz, dayStartHour);
    const lastSameDay = new Date(Math.min(lastStart.getTime() + (now.getTime() - monthStart.getTime()), monthStart.getTime()));
    const base = { tenantId, ...branch, status: PAID };
    const sum = (gte: Date, lt?: Date) => this.prisma.expense.aggregate({
      where: { ...base, expenseDate: { gte, ...(lt && { lt }) } }, _sum: { amount: true }, _count: { _all: true },
    });

    const register = branch.shopId
      ? await this.prisma.cashRegister.findFirst({
        where: { tenantId, shopId: branch.shopId, status: 'OPEN' },
        orderBy: { openedAt: 'desc' },
        select: { id: true, registerNumber: true, openedAt: true },
      })
      : null;

    const [today, month, lastToDate, lastFull, byCat, pending, oldest, creators, shiftCash] = await Promise.all([
      sum(todayStart),
      sum(monthStart),
      sum(lastStart, lastSameDay),
      sum(lastStart, monthStart),
      this.prisma.expense.groupBy({ by: ['categoryId'], where: { ...base, expenseDate: { gte: monthStart } }, _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.expense.aggregate({ where: { tenantId, ...branch, status: ExpenseStatus.PENDING }, _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.expense.findFirst({ where: { tenantId, ...branch, status: ExpenseStatus.PENDING }, orderBy: { expenseDate: 'asc' }, select: { expenseDate: true } }),
      this.prisma.expense.groupBy({ by: ['createdById'], where: { tenantId, ...branch } }),
      register
        ? this.prisma.expense.aggregate({
          where: { tenantId, shopId: branch.shopId, paymentMethod: 'CASH', status: PAID, expenseDate: { gte: register.openedAt } },
          _sum: { amount: true }, _count: { _all: true },
        })
        : null,
    ]);

    const top = [...byCat].sort((a, b) => num(b._sum.amount) - num(a._sum.amount))[0];
    const topCat = top?.categoryId
      ? await this.prisma.expenseCategory.findFirst({ where: { id: top.categoryId, tenantId }, select: { id: true, name: true, color: true, icon: true } })
      : null;
    const ids = creators.map((c) => c.createdById).filter((x): x is string => !!x);
    const people = ids.length
      ? await this.prisma.user.findMany({ where: { id: { in: ids }, tenantId }, select: { id: true, fullName: true }, orderBy: { fullName: 'asc' } })
      : [];

    const monthAmount = num(month._sum.amount);
    const topAmount = num(top?._sum.amount);
    return {
      today: { amount: r2(num(today._sum.amount)), count: today._count._all },
      month: { amount: r2(monthAmount), count: month._count._all },
      lastMonth: { toDate: r2(num(lastToDate._sum.amount)), full: r2(num(lastFull._sum.amount)) },
      change: pct(monthAmount, num(lastToDate._sum.amount)),
      topCategory: top && topAmount > 0
        ? {
          id: top.categoryId ?? 'none',
          name: topCat?.name ?? 'Bina category',
          color: topCat?.color ?? '#64748b',
          icon: topCat?.icon ?? null,
          amount: r2(topAmount),
          count: top._count._all,
          share: monthAmount > 0 ? Math.round((topAmount / monthAmount) * 100) : 0,
        }
        : null,
      pending: { count: pending._count._all, amount: r2(num(pending._sum.amount)), oldest: oldest?.expenseDate ?? null },
      register: branch.shopId
        ? register
          ? { open: true, registerNumber: register.registerNumber, openedAt: register.openedAt, cashExpenses: r2(num(shiftCash?._sum.amount)), count: shiftCash?._count._all ?? 0 }
          : { open: false }
        : null,
      people,
    };
  }

  /**
   * Where the money went in a period: totals against the period before, by
   * category, business day, branch, payment method, person and title (the
   * payee), plus twelve months by category. Only paid expenses count; unpaid
   * bills of the period are totalled apart.
   */
  async analytics(user: AuthenticatedUser, scope: ShopScope, q: ExpenseFilterDto) {
    const tenantId = user.tenantId;
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const today = businessDayKey(new Date(), tz, dayStartHour);
    const from = q.from && q.to ? q.from : businessDayKey(new Date(Date.now() - 29 * DAY), tz, dayStartHour);
    const to = q.from && q.to ? q.to : today;
    const range = await periodRange(this.tz, tenantId, from, to);
    const base = await this.where(user, scope, { ...q, from: undefined, to: undefined });
    const paid = { ...base, status: PAID };

    const endMonth = to.slice(0, 7);
    const firstMonth = shiftMonth(endMonth, -11);
    const [fy, fm] = firstMonth.split('-').map(Number);
    const monthsFrom = startOfBusinessMonthTz(fy, fm, tz, dayStartHour);
    const select = {
      amount: true, expenseDate: true, categoryId: true, shopId: true, createdById: true, paymentMethod: true, title: true,
      category: { select: { name: true, color: true, icon: true } },
    } satisfies Prisma.ExpenseSelect;

    const [rows, pending, previous, yearRows] = await Promise.all([
      this.prisma.expense.findMany({ where: { ...paid, expenseDate: range }, select, orderBy: { expenseDate: 'asc' } }),
      this.prisma.expense.aggregate({
        where: { ...base, status: ExpenseStatus.PENDING, expenseDate: range }, _sum: { amount: true }, _count: { _all: true },
      }),
      this.prisma.expense.aggregate({
        where: { ...paid, expenseDate: { gte: new Date(range.gte.getTime() - (range.lt.getTime() - range.gte.getTime())), lt: range.gte } },
        _sum: { amount: true },
      }),
      this.prisma.expense.findMany({
        where: { ...paid, expenseDate: { gte: monthsFrom, lt: range.lt } },
        select: { amount: true, expenseDate: true, categoryId: true, category: { select: { name: true, color: true, icon: true } } },
      }),
    ]);

    type Bucket = { key: string; label: string; amount: number; count: number; color?: string; icon?: string | null };
    const group = (list: typeof rows, key: (r: typeof rows[number]) => [string, string, string?, (string | null)?]) => {
      const map = new Map<string, Bucket>();
      for (const r of list) {
        const [k, label, color, icon] = key(r);
        const b = map.get(k) ?? { key: k, label, amount: 0, count: 0, ...(color ? { color } : {}), ...(icon !== undefined ? { icon } : {}) };
        b.amount += r.amount;
        b.count++;
        map.set(k, b);
      }
      return [...map.values()].map((b) => ({ ...b, amount: r2(b.amount) })).sort((a, b) => b.amount - a.amount);
    };
    const catKey = (r: { categoryId: string | null; category: { name: string; color: string; icon: string | null } | null }): [string, string, string, string | null] =>
      [r.categoryId ?? 'none', r.category?.name ?? 'Bina category', r.category?.color ?? '#64748b', r.category?.icon ?? null];

    const shopIds = [...new Set(rows.map((r) => r.shopId).filter((x): x is string => !!x))];
    const userIds = [...new Set(rows.map((r) => r.createdById).filter((x): x is string => !!x))];
    const [shops, users] = await Promise.all([
      shopIds.length ? this.prisma.shop.findMany({ where: { id: { in: shopIds }, tenantId }, select: { id: true, name: true } }) : [],
      userIds.length ? this.prisma.user.findMany({ where: { id: { in: userIds }, tenantId }, select: { id: true, fullName: true } }) : [],
    ]);
    const shopName = new Map(shops.map((s) => [s.id, s.name]));
    const userName = new Map(users.map((u) => [u.id, u.fullName]));

    // Business days of the period, empty ones included, so gaps show on the chart.
    const days = new Map(dayKeys(from, to).map((k) => [k, { key: k, amount: 0, count: 0 }]));
    for (const r of rows) {
      const k = businessDayKey(r.expenseDate, tz, dayStartHour);
      const d = days.get(k) ?? { key: k, amount: 0, count: 0 };
      d.amount += r.amount;
      d.count++;
      days.set(k, d);
    }

    // The payee is the title, matched without case and extra spaces; the latest spelling is shown.
    const payees = new Map<string, Bucket>();
    for (const r of rows) {
      const k = normTitle(r.title);
      const b = payees.get(k) ?? { key: k, label: r.title.trim(), amount: 0, count: 0 };
      b.label = r.title.trim();
      b.amount += r.amount;
      b.count++;
      payees.set(k, b);
    }

    // Twelve months by category: the eight biggest categories, the rest together.
    const months = Array.from({ length: 12 }, (_, i) => shiftMonth(firstMonth, i));
    const monthCats = group(yearRows as typeof rows, catKey);
    const shown = new Set(monthCats.slice(0, 8).map((c) => c.key));
    const matrix = new Map<string, { key: string; label: string; color: string; icon: string | null; values: number[]; total: number }>();
    const monthTotals = months.map(() => 0);
    for (const r of yearRows) {
      const mi = months.indexOf(businessDayKey(r.expenseDate, tz, dayStartHour).slice(0, 7));
      if (mi < 0) continue;
      const [k0, label0, color0, icon0] = catKey(r);
      const [k, label, color, icon]: [string, string, string, string | null] = shown.has(k0) ? [k0, label0, color0, icon0] : ['other', 'Baqi categories', '#94a3b8', null];
      const row = matrix.get(k) ?? { key: k, label, color, icon, values: months.map(() => 0), total: 0 };
      row.values[mi] += r.amount;
      row.total += r.amount;
      monthTotals[mi] += r.amount;
      matrix.set(k, row);
    }

    const amount = rows.reduce((s, r) => s + r.amount, 0);
    const biggest = rows.reduce<typeof rows[number] | null>((b, r) => (!b || r.amount > b.amount ? r : b), null);
    const dayCount = Math.max(1, dayKeys(from, to).length);
    const prev = num(previous._sum.amount);

    return {
      from, to,
      totals: {
        amount: r2(amount),
        count: rows.length,
        pending: r2(num(pending._sum.amount)),
        pendingCount: pending._count._all,
        perDay: r2(amount / dayCount),
        days: dayCount,
        previous: r2(prev),
        change: pct(amount, prev),
        biggest: biggest ? { title: biggest.title, amount: r2(biggest.amount), date: biggest.expenseDate } : null,
      },
      byCategory: group(rows, catKey),
      byDay: [...days.values()].sort((a, b) => a.key.localeCompare(b.key)).map((d) => ({ ...d, amount: r2(d.amount) })),
      byMonth: months.map((k, i) => ({ key: k, amount: r2(monthTotals[i]) })),
      byBranch: group(rows, (r) => [r.shopId ?? 'none', r.shopId ? shopName.get(r.shopId) ?? '—' : 'Bina branch']),
      byMethod: group(rows, (r) => [r.paymentMethod, r.paymentMethod]),
      byPerson: group(rows, (r) => [r.createdById ?? 'none', r.createdById ? userName.get(r.createdById) ?? '—' : '—']).slice(0, 10),
      topPayees: [...payees.values()].map((b) => ({ ...b, amount: r2(b.amount) })).sort((a, b) => b.amount - a.amount).slice(0, 10),
      matrix: {
        months,
        rows: [...matrix.values()].map((r) => ({ ...r, values: r.values.map(r2), total: r2(r.total) })).sort((a, b) => (a.key === 'other' ? 1 : b.key === 'other' ? -1 : b.total - a.total)),
        totals: monthTotals.map(r2),
      },
    };
  }

  /**
   * Bills that come back every month (rent, electricity, wages): the same
   * title in the same category in at least two of the last three months.
   * Shows whether each one is already recorded this month.
   */
  async repeating(user: AuthenticatedUser, scope: ShopScope, shopId?: string) {
    const tenantId = user.tenantId;
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const thisMonth = businessDayKey(new Date(), tz, dayStartHour).slice(0, 7);
    const [y, m] = shiftMonth(thisMonth, -3).split('-').map(Number);
    const rows = await this.prisma.expense.findMany({
      where: { tenantId, ...this.branch(user, scope, shopId), status: LIVE, expenseDate: { gte: startOfBusinessMonthTz(y, m, tz, dayStartHour) } },
      select: {
        id: true, title: true, amount: true, categoryId: true, paymentMethod: true, expenseDate: true, status: true,
        category: { select: { id: true, name: true, color: true, icon: true } },
      },
      orderBy: { expenseDate: 'asc' },
    });

    type Group = {
      key: string; title: string; category: typeof rows[number]['category']; paymentMethod: string;
      months: Set<string>; amounts: number[]; lastAmount: number; lastDate: Date; thisMonth: number; thisCount: number; pendingThisMonth: number;
    };
    const groups = new Map<string, Group>();
    for (const r of rows) {
      const key = `${r.categoryId ?? ''}|${normTitle(r.title)}`;
      const month = businessDayKey(r.expenseDate, tz, dayStartHour).slice(0, 7);
      const g = groups.get(key) ?? {
        key, title: r.title.trim(), category: r.category, paymentMethod: r.paymentMethod,
        months: new Set<string>(), amounts: [], lastAmount: 0, lastDate: r.expenseDate, thisMonth: 0, thisCount: 0, pendingThisMonth: 0,
      };
      if (month === thisMonth) {
        g.thisMonth += r.amount;
        g.thisCount++;
        if (r.status === ExpenseStatus.PENDING) g.pendingThisMonth++;
      } else {
        g.months.add(month);
        g.amounts.push(r.amount);
        g.lastAmount = r.amount;
        g.lastDate = r.expenseDate;
        g.title = r.title.trim();
        g.paymentMethod = r.paymentMethod;
      }
      groups.set(key, g);
    }

    const items = [...groups.values()]
      .filter((g) => g.months.size >= 2)
      .map((g) => ({
        key: g.key,
        title: g.title,
        category: g.category,
        paymentMethod: g.paymentMethod,
        months: g.months.size,
        lastAmount: r2(g.lastAmount),
        average: r2(g.amounts.reduce((s, a) => s + a, 0) / g.amounts.length),
        lastDate: g.lastDate,
        usualDay: Number(businessDayKey(g.lastDate, tz, dayStartHour).slice(8, 10)),
        thisMonth: { amount: r2(g.thisMonth), count: g.thisCount, pending: g.pendingThisMonth },
        due: g.thisCount === 0,
      }))
      .sort((a, b) => Number(b.due) - Number(a.due) || a.usualDay - b.usualDay || b.lastAmount - a.lastAmount);

    return {
      month: thisMonth,
      items,
      due: items.filter((i) => i.due).length,
      dueAmount: r2(items.filter((i) => i.due).reduce((s, i) => s + i.lastAmount, 0)),
    };
  }

  /** Older headline shape, kept for the mobile app; now on business days. */
  async summary(user: AuthenticatedUser, scope: ShopScope) {
    const shopWhere = scope.where;
    const { tz, dayStartHour } = await this.tz.clock(user.tenantId);
    const now = new Date();
    const [y, m] = businessDayKey(now, tz, dayStartHour).split('-').map(Number);
    const todayStart = startOfBusinessDayTz(now, tz, dayStartHour);
    const monthStart = startOfBusinessMonthTz(y, m, tz, dayStartHour);
    const paid = { tenantId: user.tenantId, ...shopWhere, status: ExpenseStatus.PAID };

    const [todayAgg, monthAgg, totalAgg, byCategory] = await Promise.all([
      this.prisma.expense.aggregate({ where: { ...paid, expenseDate: { gte: todayStart } }, _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.expense.aggregate({ where: { ...paid, expenseDate: { gte: monthStart } }, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ where: paid, _sum: { amount: true } }),
      this.prisma.expense.groupBy({ by: ['categoryId'], where: paid, _sum: { amount: true }, _count: { _all: true } }),
    ]);

    return {
      todayExpenses: todayAgg._sum.amount ?? 0,
      todayCount: todayAgg._count._all ?? 0,
      monthExpenses: monthAgg._sum.amount ?? 0,
      totalExpenses: totalAgg._sum.amount ?? 0,
      byCategory,
    };
  }
}
