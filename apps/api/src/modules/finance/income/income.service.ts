/**
 * Other income ("Doosri aamdani"): money the business earns besides sales,
 * such as company incentives, scheme claims, commission, rent received and
 * bank interest. Each record adds to net profit on its incomeDate
 * (business-math.helper) and lands where it was received:
 *
 *   CASH_DRAWER      cash in the branch drawer; live-cash.helper counts it in
 *                    the cash the drawer should hold
 *   ACCOUNT          a DEPOSIT entry on the chosen money account
 *   SUPPLIER_KHATA   set off against what the business owes the supplier (an
 *                    ADJUSTMENT on the supplier khata that lowers the balance)
 *
 * Editing or deleting a record moves the money back the same way. Reads need
 * `income.view`, writes `income.manage` (permission-routes). Days follow the
 * shop's business day.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OtherIncome, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope, assertShopAccess, resolveWriteShopId } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import {
  businessDayKey, safeDayStart, startOfBusinessMonthTz, zonedToUtc,
} from '../../../common/helpers/business-time.helper';
import { periodRange } from '../../inventory/taxonomy/taxonomy.helper';
import { SupplierLedgerService } from '../../purchasing/supplier-ledger/supplier-ledger.service';
import { CreateIncomeDto, INCOME_CATEGORIES, IncomeCategoryDto, ListIncomeDto, UpdateIncomeDto } from './dto/income.dto';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const DUPLICATE_WINDOW_MS = 15_000;
const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => Number(v ?? 0) || 0;

/** Labels of the fixed categories, as shown in the app. */
export const INCOME_CATEGORY_LABELS: Record<string, string> = {
  COMPANY_INCENTIVE: 'Company incentive',
  SCHEME_CLAIM: 'Scheme claim',
  COMMISSION: 'Commission',
  RENT: 'Kiraya mila',
  INTEREST: 'Bank profit / interest',
  OTHER: 'Doosri',
};

const INCLUDE = {
  shop: { select: { id: true, name: true, isMain: true } },
  supplier: { select: { id: true, name: true } },
  customCategory: { select: { id: true, name: true, color: true } },
  createdBy: { select: { id: true, fullName: true } },
} satisfies Prisma.OtherIncomeInclude;

function shiftMonth(key: string, by: number) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class IncomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly supplierLedger: SupplierLedgerService,
  ) {}

  /* ───────────────────────── helpers ───────────────────────── */

  private branch(user: AuthenticatedUser, scope: ShopScope, shopId?: string): { shopId?: string } {
    if (shopId && (!scope.shopId || scope.shopId === shopId)) {
      assertShopAccess(user, shopId, 'Doosri branch ki aamdani dekhna');
      return { shopId };
    }
    return scope.where;
  }

  /** Today means now (so cash lands in the open shift); an earlier day is mid-day of that business day. */
  private async when(tenantId: string, raw?: string): Promise<Date> {
    if (!raw) return new Date();
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const today = businessDayKey(new Date(), tz, dayStartHour);
    const key = DAY_KEY.test(raw) ? raw : businessDayKey(new Date(raw), tz, dayStartHour);
    if (key > today) throw new BadRequestException('Aane wale din ki aamdani abhi nahi likh sakte');
    if (!DAY_KEY.test(raw)) return new Date(raw);
    if (raw === today) return new Date();
    const [y, m, d] = raw.split('-').map(Number);
    return zonedToUtc(y, m, d, safeDayStart(dayStartHour) + 12, 0, 0, tz);
  }

  private async check(tenantId: string, v: { category?: string; categoryId?: string | null; supplierId?: string | null; receivedVia?: string; moneyAccountId?: string | null }) {
    if (v.category === 'CUSTOM') {
      if (!v.categoryId) throw new BadRequestException('Apni category chunein');
      const c = await this.prisma.otherIncomeCategory.findFirst({ where: { id: v.categoryId, tenantId }, select: { id: true } });
      if (!c) throw new NotFoundException('Category nahi mili');
    }
    if (v.supplierId) {
      const s = await this.prisma.supplier.findFirst({ where: { id: v.supplierId, tenantId }, select: { id: true } });
      if (!s) throw new NotFoundException('Supplier/company nahi mili');
    }
    if (v.receivedVia === 'SUPPLIER_KHATA' && !v.supplierId) throw new BadRequestException('Supplier khate me adjust karne ke liye company/supplier chunein');
    if (v.receivedVia === 'ACCOUNT') {
      if (!v.moneyAccountId) throw new BadRequestException('Paisa kis account me aaya — account chunein');
      const a = await this.prisma.moneyAccount.findFirst({ where: { id: v.moneyAccountId, tenantId, isActive: true }, select: { id: true } });
      if (!a) throw new NotFoundException('Account nahi mila');
    }
  }

  /** Puts the money where it was received; returns the ids of what was written. */
  private async apply(tx: Prisma.TransactionClient, user: AuthenticatedUser, i: OtherIncome) {
    if (i.receivedVia === 'ACCOUNT' && i.moneyAccountId) {
      const e = await tx.moneyAccountEntry.create({
        data: {
          tenantId: i.tenantId, shopId: i.shopId, accountId: i.moneyAccountId, type: 'DEPOSIT', amount: i.amount,
          reason: 'Doosri aamdani', note: `${i.incomeNumber} · ${i.title}`, entryDate: i.incomeDate, createdById: user.id,
          requestId: `income:${i.id}:${Date.now()}`,
        },
        select: { id: true },
      });
      return { moneyEntryId: e.id, supplierLedgerId: null };
    }
    if (i.receivedVia === 'SUPPLIER_KHATA' && i.supplierId) {
      const l = await this.supplierLedger.post(user, i.supplierId, 'ADJUSTMENT', -i.amount, {
        reference: i.incomeNumber, note: `Doosri aamdani: ${i.title}`, entryDate: i.incomeDate.toISOString(), shopId: i.shopId ?? undefined,
      }, tx);
      return { moneyEntryId: null, supplierLedgerId: l.id };
    }
    return { moneyEntryId: null, supplierLedgerId: null };
  }

  /** Moves the money back (edit or delete). */
  private async unapply(tx: Prisma.TransactionClient, user: AuthenticatedUser, i: OtherIncome, why: string) {
    if (i.receivedVia === 'ACCOUNT' && i.moneyEntryId) {
      await tx.moneyAccountEntry.deleteMany({ where: { id: i.moneyEntryId, tenantId: i.tenantId } });
    }
    if (i.receivedVia === 'SUPPLIER_KHATA' && i.supplierId && i.supplierLedgerId) {
      await this.supplierLedger.post(user, i.supplierId, 'ADJUSTMENT', i.amount, {
        reference: i.incomeNumber, note: `Doosri aamdani ${why}: ${i.title}`, shopId: i.shopId ?? undefined,
      }, tx);
    }
  }

  private async editable(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const income = await this.prisma.otherIncome.findFirst({ where: { id, tenantId: user.tenantId, ...scope.where } });
    if (!income) throw new NotFoundException('Aamdani ka record nahi mila');
    if (income.shopId) assertShopAccess(user, income.shopId, 'Aamdani badalna');
    return income;
  }

  /* ───────────────────────── writes ───────────────────────── */

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateIncomeDto) {
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope, dto.shopId);
    assertShopAccess(user, shopId, 'Aamdani likhna');
    await this.check(user.tenantId, dto);
    const incomeDate = await this.when(user.tenantId, dto.incomeDate);
    const { tz, dayStartHour } = await this.tz.clock(user.tenantId);
    const prefix = `INC-${businessDayKey(new Date(), tz, dayStartHour).slice(2).replace(/-/g, '')}-`;
    const title = dto.title.trim();

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`income:${user.tenantId}`}))::text`;
      const twin = await tx.otherIncome.findFirst({
        where: {
          tenantId: user.tenantId, shopId, createdById: user.id, title, amount: r2(dto.amount), category: dto.category,
          createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
        },
        include: INCLUDE,
      });
      if (twin) return twin;
      const last = await tx.otherIncome.findFirst({
        where: { tenantId: user.tenantId, incomeNumber: { startsWith: prefix } },
        orderBy: { incomeNumber: 'desc' }, select: { incomeNumber: true },
      });
      const next = (Number(last?.incomeNumber.slice(prefix.length)) || 0) + 1;
      const row = await tx.otherIncome.create({
        data: {
          tenantId: user.tenantId, shopId, createdById: user.id,
          incomeNumber: `${prefix}${String(next).padStart(3, '0')}`,
          title, amount: r2(dto.amount), category: dto.category,
          categoryId: dto.category === 'CUSTOM' ? dto.categoryId ?? null : null,
          incomeDate, supplierId: dto.supplierId || null, receivedVia: dto.receivedVia,
          moneyAccountId: dto.receivedVia === 'ACCOUNT' ? dto.moneyAccountId ?? null : null,
          note: dto.note?.trim() || null, repeatMonthly: !!dto.repeatMonthly,
        },
      });
      const links = await this.apply(tx, user, row);
      return tx.otherIncome.update({ where: { id: row.id }, data: links, include: INCLUDE });
    });
  }

  async update(user: AuthenticatedUser, scope: ShopScope, id: string, dto: UpdateIncomeDto) {
    const before = await this.editable(user, scope, id);
    const category = dto.category ?? before.category;
    const next = {
      category,
      categoryId: category === 'CUSTOM' ? (dto.categoryId !== undefined ? dto.categoryId : before.categoryId) : null,
      supplierId: dto.supplierId !== undefined ? dto.supplierId || null : before.supplierId,
      receivedVia: dto.receivedVia ?? before.receivedVia,
      moneyAccountId: dto.moneyAccountId !== undefined ? dto.moneyAccountId || null : before.moneyAccountId,
    };
    await this.check(user.tenantId, next);
    const incomeDate = dto.incomeDate ? await this.when(user.tenantId, dto.incomeDate) : before.incomeDate;
    const amount = dto.amount !== undefined ? r2(dto.amount) : before.amount;
    // Money moves again only when where, how much or when it came changes.
    const moved = amount !== before.amount || next.receivedVia !== before.receivedVia || next.supplierId !== before.supplierId
      || next.moneyAccountId !== before.moneyAccountId || incomeDate.getTime() !== before.incomeDate.getTime();

    return this.prisma.$transaction(async (tx) => {
      if (moved) await this.unapply(tx, user, before, 'badli');
      const row = await tx.otherIncome.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title.trim() }),
          ...(dto.note !== undefined && { note: dto.note?.trim() || null }),
          ...(dto.repeatMonthly !== undefined && { repeatMonthly: dto.repeatMonthly }),
          amount, incomeDate, ...next,
          moneyAccountId: next.receivedVia === 'ACCOUNT' ? next.moneyAccountId : null,
          ...(moved && { moneyEntryId: null, supplierLedgerId: null }),
        },
      });
      if (moved) {
        const links = await this.apply(tx, user, row);
        return tx.otherIncome.update({ where: { id }, data: links, include: INCLUDE });
      }
      return tx.otherIncome.findUniqueOrThrow({ where: { id }, include: INCLUDE });
    });
  }

  async remove(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const income = await this.editable(user, scope, id);
    await this.prisma.$transaction(async (tx) => {
      await this.unapply(tx, user, income, 'mitayi');
      await tx.otherIncome.delete({ where: { id } });
      await tx.activityLog.create({
        data: {
          tenantId: user.tenantId, userId: user.id, action: 'INCOME_DELETED', entityType: 'OtherIncome', entityId: id,
          description: `Aamdani mitayi: ${income.incomeNumber} · ${income.title} · Rs ${income.amount}`,
          metadata: { amount: income.amount, category: income.category, receivedVia: income.receivedVia, incomeDate: income.incomeDate.toISOString(), shopId: income.shopId },
        },
      });
    });
    return { message: 'Aamdani ka record mita diya' };
  }

  /* ───────────────────────── reads ───────────────────────── */

  private async where(user: AuthenticatedUser, scope: ShopScope, q: ListIncomeDto): Promise<Prisma.OtherIncomeWhereInput> {
    const range = q.from && q.to ? await periodRange(this.tz, user.tenantId, q.from, q.to) : undefined;
    const s = q.search?.trim();
    const contains = (v: string) => ({ contains: v, mode: 'insensitive' as const });
    const fixed = (INCOME_CATEGORIES as readonly string[]).includes(q.category ?? '');
    return {
      tenantId: user.tenantId,
      ...this.branch(user, scope, q.shopId),
      ...(range && { incomeDate: range }),
      ...(q.category && (fixed ? { category: q.category } : { categoryId: q.category })),
      ...(q.supplierId && { supplierId: q.supplierId }),
      ...(q.receivedVia && { receivedVia: q.receivedVia }),
      ...(s && { OR: [{ title: contains(s) }, { note: contains(s) }, { incomeNumber: contains(s) }, { supplier: { name: contains(s) } }] }),
    };
  }

  /** One page with totals for the whole filter. */
  async page(user: AuthenticatedUser, scope: ShopScope, q: ListIncomeDto) {
    const where = await this.where(user, scope, q);
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const [items, agg, byCat] = await Promise.all([
      this.prisma.otherIncome.findMany({ where, include: INCLUDE, orderBy: [{ incomeDate: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.otherIncome.aggregate({ where, _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.otherIncome.groupBy({ by: ['category', 'categoryId'], where, _sum: { amount: true }, _count: { _all: true } }),
    ]);
    return {
      items, total: agg._count._all, page, pages: Math.max(1, Math.ceil(agg._count._all / limit)),
      totals: { amount: r2(num(agg._sum.amount)), count: agg._count._all },
      byCategory: await this.labelCategories(user.tenantId, byCat),
    };
  }

  private async labelCategories(tenantId: string, rows: Array<{ category: string; categoryId: string | null; _sum: { amount: number | null }; _count: { _all: number } }>) {
    const ids = rows.map((r) => r.categoryId).filter((x): x is string => !!x);
    const custom = ids.length ? await this.prisma.otherIncomeCategory.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, name: true, color: true } }) : [];
    const map = new Map(custom.map((c) => [c.id, c]));
    return rows.map((r) => ({
      key: r.categoryId ?? r.category,
      label: r.categoryId ? map.get(r.categoryId)?.name ?? 'Apni category' : INCOME_CATEGORY_LABELS[r.category] ?? r.category,
      color: r.categoryId ? map.get(r.categoryId)?.color ?? null : null,
      amount: r2(num(r._sum.amount)), count: r._count._all,
    })).sort((a, b) => b.amount - a.amount);
  }

  /**
   * Headline numbers: this month against last month, twelve months, and the
   * monthly incomes not yet recorded this month (from records marked to repeat).
   */
  async overview(user: AuthenticatedUser, scope: ShopScope, shopId?: string) {
    const tenantId = user.tenantId;
    const branch = this.branch(user, scope, shopId);
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const now = new Date();
    const thisMonth = businessDayKey(now, tz, dayStartHour).slice(0, 7);
    const [y, m] = thisMonth.split('-').map(Number);
    const monthStart = startOfBusinessMonthTz(y, m, tz, dayStartHour);
    const lastStart = startOfBusinessMonthTz(y, m - 1, tz, dayStartHour);
    const yearStart = startOfBusinessMonthTz(y, m - 11, tz, dayStartHour);
    const base = { tenantId, ...branch };

    const [rows, repeating] = await Promise.all([
      this.prisma.otherIncome.findMany({
        where: { ...base, incomeDate: { gte: yearStart } },
        select: { amount: true, incomeDate: true, category: true, categoryId: true },
      }),
      this.prisma.otherIncome.findMany({
        where: { ...base, repeatMonthly: true, incomeDate: { gte: startOfBusinessMonthTz(y, m - 3, tz, dayStartHour) } },
        orderBy: { incomeDate: 'desc' }, include: INCLUDE,
      }),
    ]);
    const monthOf = (d: Date) => businessDayKey(d, tz, dayStartHour).slice(0, 7);
    const months = Array.from({ length: 12 }, (_, i) => shiftMonth(thisMonth, i - 11)).map((key) => {
      const list = rows.filter((r) => monthOf(r.incomeDate) === key);
      return { key, amount: r2(list.reduce((s, r) => s + r.amount, 0)), count: list.length };
    });
    const sum = (from: Date, to?: Date) => r2(rows.filter((r) => r.incomeDate >= from && (!to || r.incomeDate < to)).reduce((s, r) => s + r.amount, 0));
    const month = sum(monthStart);
    const last = sum(lastStart, monthStart);

    // A repeating income is due when nothing with the same title and category is recorded this month.
    const seen = new Set<string>();
    const due = repeating.filter((r) => {
      const k = `${r.title.trim().toLowerCase()}|${r.category}|${r.categoryId ?? ''}|${r.supplierId ?? ''}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return monthOf(r.incomeDate) !== thisMonth;
    });

    return {
      month: { key: thisMonth, amount: month, count: rows.filter((r) => r.incomeDate >= monthStart).length },
      lastMonth: { amount: last },
      months,
      due,
      categories: Object.entries(INCOME_CATEGORY_LABELS).map(([key, label]) => ({ key, label })),
    };
  }

  /* ───────────────────────── categories ───────────────────────── */

  categories(user: AuthenticatedUser) {
    return this.prisma.otherIncomeCategory.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: 'asc' } });
  }

  async createCategory(user: AuthenticatedUser, dto: IncomeCategoryDto) {
    const name = dto.name.trim();
    const dupe = await this.prisma.otherIncomeCategory.findFirst({ where: { tenantId: user.tenantId, name: { equals: name, mode: 'insensitive' } } });
    if (dupe) throw new BadRequestException('Is naam ki category pehle se hai');
    return this.prisma.otherIncomeCategory.create({ data: { tenantId: user.tenantId, name, ...(dto.color && { color: dto.color }) } });
  }

  async updateCategory(user: AuthenticatedUser, id: string, dto: IncomeCategoryDto) {
    const c = await this.prisma.otherIncomeCategory.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Category nahi mili');
    return this.prisma.otherIncomeCategory.update({
      where: { id },
      data: { name: dto.name.trim(), ...(dto.color && { color: dto.color }), ...(dto.isActive !== undefined && { isActive: dto.isActive }) },
    });
  }

  async removeCategory(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.otherIncomeCategory.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Category nahi mili');
    // Records keep their amount; they move to "Doosri".
    await this.prisma.$transaction([
      this.prisma.otherIncome.updateMany({ where: { tenantId: user.tenantId, categoryId: id }, data: { category: 'OTHER', categoryId: null } }),
      this.prisma.otherIncomeCategory.delete({ where: { id } }),
    ]);
    return { message: 'Category mita di' };
  }
}
