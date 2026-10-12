/**
 * Money accounts: the safe, bank accounts and mobile wallets next to the
 * drawer. Balances come from account-balance.helper. Movements (transfer,
 * drawer to account and back, deposit, withdraw, adjustment) are atomic,
 * idempotent by requestId and branch-checked.
 */

import { randomUUID } from 'crypto';
import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { MoneyAccount, MoneyAccountKind, MoneyEntryType, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope, assertShopAccess } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { startOfBusinessDayTz } from '../../../common/helpers/business-time.helper';
import { computeLiveCash } from '../../../common/helpers/live-cash.helper';
import {
  AUTO_DIRECTION, AutoScope, AutoSource, accountBalance, accountFlows, autoScopeOf, autoWhere, entryEffect, refundKhataParts,
} from '../../../common/helpers/account-balance.helper';
import { periodRange } from '../../inventory/taxonomy/taxonomy.helper';
import {
  AccountEntryDto, CreateMoneyAccountDto, DrawerMoveDto, ListMoneyAccountsDto, StatementDto, TransferDto, UpdateMoneyAccountDto,
} from './dto/money-account.dto';

type Db = Prisma.TransactionClient;

const DAY = 86_400_000;
/** Rows per source a statement may hold; past this the period must be shorter. */
const STATEMENT_LIMIT = 3000;
const TX = { timeout: 20_000 };

const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;
const rs = (v: number) => `Rs ${r2(v).toLocaleString('en-PK')}`;
const digits = (v?: string | null) => (v ?? '').replace(/\D/g, '');
const isOwner = (u: AuthenticatedUser) => u.role === 'OWNER' || u.role === 'SUPER_ADMIN';

export interface StatementLine {
  id: string;
  at: Date;
  kind: AutoSource | MoneyEntryType;
  direction: 'in' | 'out';
  amount: number;
  reference: string | null;
  party: string | null;
  note: string | null;
  by: string | null;
  balance: number;
}

@Injectable()
export class MoneyAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /* ═════════════════════════ access ═════════════════════════ */

  /** Accounts of the branch plus business-wide ones; every account on "all branches". */
  private visible(shop: ShopScope): Prisma.MoneyAccountWhereInput {
    return shop.shopId ? { OR: [{ shopId: shop.shopId }, { shopId: null }] } : {};
  }

  private async load(db: Db, user: AuthenticatedUser, id: string, action = 'Ye kaam') {
    const a = await db.moneyAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account nahi mila');
    this.assertAccess(user, a, action);
    return a;
  }

  private assertAccess(user: AuthenticatedUser, a: Pick<MoneyAccount, 'shopId'>, action: string) {
    if (a.shopId) assertShopAccess(user, a.shopId, action);
    else if (!isOwner(user) && user.shopId) throw new ForbiddenException('Poore karobar ka account sirf malik chala sakta hai');
  }

  private active(a: MoneyAccount) {
    if (!a.isActive) throw new BadRequestException(`${a.name} band hai — pehle chalu karein`);
  }

  /** Kind, method and default must fit together. */
  private checkShape(kind: MoneyAccountKind, method: PaymentMethod | null, isDefault: boolean) {
    if (method === 'CASH') throw new BadRequestException('Cash bikri golak me jati hai. Account ke liye bank, card, JazzCash ya Easypaisa chunein.');
    if (kind === 'CASH' && method) throw new BadRequestException('Tijori (cash) account par payment ka tareeqa nahi lagta');
    if (isDefault && !method) throw new BadRequestException('Default banane ke liye payment ka tareeqa chunein');
  }

  /** Serialises default changes for one method, so two requests cannot both win. */
  private async lockDefault(tx: Db, tenantId: string, method: PaymentMethod) {
    const key = `money-default:${tenantId}:${method}`;
    await tx.$queryRaw`SELECT 1 AS ok FROM (SELECT pg_advisory_xact_lock(hashtext(${key}))) l`;
  }

  private async clearDefault(tx: Db, tenantId: string, shopId: string | null, method: PaymentMethod, except?: string) {
    await this.lockDefault(tx, tenantId, method);
    await tx.moneyAccount.updateMany({
      where: { tenantId, shopId, method, isDefault: true, ...(except && { id: { not: except } }) },
      data: { isDefault: false },
    });
  }

  private async nameFree(tx: Db, tenantId: string, shopId: string | null, name: string, except?: string) {
    const twin = await tx.moneyAccount.findFirst({
      where: { tenantId, shopId, isActive: true, name: { equals: name, mode: 'insensitive' }, ...(except && { id: { not: except } }) },
      select: { id: true },
    });
    if (twin) throw new ConflictException('Is naam ka account pehle se maujood hai');
  }

  private async today(tenantId: string) {
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const gte = startOfBusinessDayTz(new Date(), tz, dayStartHour);
    return { gte, lt: new Date(gte.getTime() + DAY) };
  }

  /* ═════════════════════════ accounts ═════════════════════════ */

  /** Accounts with their live balance and today's in and out. */
  async list(user: AuthenticatedUser, shop: ShopScope, q: ListMoneyAccountsDto) {
    const tenantId = user.tenantId;
    const [accounts, today] = await Promise.all([
      this.prisma.moneyAccount.findMany({
        where: { tenantId, ...this.visible(shop), ...(q.inactive !== 'true' && { isActive: true }) },
        include: { shop: { select: { id: true, name: true } }, _count: { select: { entries: true } } },
        orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.today(tenantId),
    ]);
    const rows = await Promise.all(accounts.map(async (a) => {
      const scope = await autoScopeOf(this.prisma, a);
      const [balance, day] = await Promise.all([
        accountBalance(this.prisma, a, undefined, scope),
        accountFlows(this.prisma, a, today, scope),
      ]);
      const { _count, ...rest } = a;
      return { ...rest, balance, todayIn: day.in, todayOut: day.out, auto: !!scope, entryCount: _count.entries };
    }));
    return {
      accounts: rows,
      total: r2(rows.filter((r) => r.isActive).reduce((s, r) => s + r.balance, 0)),
    };
  }

  async create(user: AuthenticatedUser, shop: ShopScope, dto: CreateMoneyAccountDto) {
    const tenantId = user.tenantId;
    const business = dto.scope === 'BUSINESS';
    if (business && !isOwner(user)) throw new ForbiddenException('Poore karobar ka account sirf malik bana sakta hai');
    const shopId = business ? null : shop.require('Account banana');
    if (shopId) assertShopAccess(user, shopId, 'Account banana');
    const method = dto.method ?? null;
    const isDefault = !!dto.isDefault;
    this.checkShape(dto.kind, method, isDefault);
    const openingDate = dto.openingDate ? new Date(dto.openingDate) : new Date();
    if (openingDate.getTime() > Date.now() + 60_000) throw new BadRequestException('Shuru ki tareekh aage ki nahi ho sakti');
    const name = dto.name.trim().replace(/\s+/g, ' ');

    return this.prisma.$transaction(async (tx) => {
      await this.nameFree(tx, tenantId, shopId, name);
      if (isDefault && method) await this.clearDefault(tx, tenantId, shopId, method);
      return tx.moneyAccount.create({
        data: {
          tenantId, shopId, name, kind: dto.kind, method, isDefault,
          bankName: dto.bankName?.trim() || null,
          accountTitle: dto.accountTitle?.trim() || null,
          accountNumber: dto.accountNumber?.trim() || null,
          iban: dto.iban?.trim().toUpperCase() || null,
          openingBalance: r2(n(dto.openingBalance)),
          openingDate,
          sortOrder: dto.sortOrder ?? 0,
          createdById: user.id,
        },
      });
    }, TX);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateMoneyAccountDto) {
    const tenantId = user.tenantId;
    return this.prisma.$transaction(async (tx) => {
      const a = await this.load(tx, user, id, 'Account badalna');
      // Turning off goes through remove(), which checks the balance first.
      if (dto.isActive === false && a.isActive) throw new BadRequestException('Account band karne ke liye "Band karein" istemal karein');
      const kind = dto.kind ?? a.kind;
      const method = dto.method === undefined ? a.method : dto.method;
      const isActive = dto.isActive ?? a.isActive;
      const isDefault = isActive && (dto.isDefault ?? (a.isDefault && method === a.method));
      this.checkShape(kind, method, isDefault);

      const name = dto.name ? dto.name.trim().replace(/\s+/g, ' ') : a.name;
      if (isActive && (name !== a.name || !a.isActive)) await this.nameFree(tx, tenantId, a.shopId, name, a.id);

      let openingDate: Date | undefined;
      if (dto.openingDate) {
        openingDate = new Date(dto.openingDate);
        if (openingDate.getTime() > Date.now() + 60_000) throw new BadRequestException('Shuru ki tareekh aage ki nahi ho sakti');
        const first = await tx.moneyAccountEntry.findFirst({ where: { tenantId, accountId: a.id }, orderBy: { entryDate: 'asc' }, select: { entryDate: true } });
        if (first && openingDate > first.entryDate) throw new BadRequestException('Shuru ki tareekh pehli entry se pehle honi chahiye');
      }

      if (isDefault && method) await this.clearDefault(tx, tenantId, a.shopId, method, a.id);
      return tx.moneyAccount.update({
        where: { id: a.id },
        data: {
          name, kind, method, isDefault, isActive,
          ...(dto.bankName !== undefined && { bankName: dto.bankName.trim() || null }),
          ...(dto.accountTitle !== undefined && { accountTitle: dto.accountTitle.trim() || null }),
          ...(dto.accountNumber !== undefined && { accountNumber: dto.accountNumber.trim() || null }),
          ...(dto.iban !== undefined && { iban: dto.iban.trim().toUpperCase() || null }),
          ...(dto.openingBalance !== undefined && { openingBalance: r2(dto.openingBalance) }),
          ...(openingDate && { openingDate }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        },
      });
    }, TX);
  }

  /**
   * Removes an account with no entries; otherwise turns it off. An account
   * with entries must be empty first, so no money disappears from view.
   */
  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const a = await this.load(tx, user, id, 'Account band karna');
      const entries = await tx.moneyAccountEntry.count({ where: { tenantId: user.tenantId, accountId: a.id } });
      if (!entries) {
        await tx.moneyAccount.delete({ where: { id: a.id } });
        return { removed: true, deactivated: false };
      }
      const balance = await accountBalance(tx, a);
      if (Math.abs(balance) >= 0.01) {
        throw new BadRequestException(`${a.name} me abhi ${rs(balance)} hain. Pehle ye paisa doosre account ya golak me bhejein.`);
      }
      await tx.moneyAccount.update({ where: { id: a.id }, data: { isActive: false, isDefault: false } });
      return { removed: false, deactivated: true };
    }, TX);
  }

  /**
   * Creates accounts from the pay-to accounts typed in Settings → Receipt.
   * Numbers that already have an account are skipped. The first account of
   * a method in the branch becomes its default.
   */
  async importFromReceipt(user: AuthenticatedUser, shop: ShopScope) {
    const tenantId = user.tenantId;
    const shopId = shop.shopId;
    if (!shopId && !isOwner(user)) throw new ForbiddenException('Upar se apni branch chunein');
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId }, select: { receiptConfig: true } });
    const cfg = (settings?.receiptConfig ?? {}) as { payAccounts?: Array<{ kind?: string; title?: string; number?: string; bank?: string; iban?: string }> };
    const list = (Array.isArray(cfg.payAccounts) ? cfg.payAccounts : []).filter((p) => digits(p.number) || p.iban);
    if (!list.length) throw new BadRequestException('Settings → Raseed me koi account number nahi likha');

    const SHAPE: Record<string, { kind: MoneyAccountKind; method: PaymentMethod | null; label: string }> = {
      JAZZCASH: { kind: 'WALLET', method: 'JAZZCASH', label: 'JazzCash' },
      EASYPAISA: { kind: 'WALLET', method: 'EASYPAISA', label: 'Easypaisa' },
      BANK: { kind: 'BANK', method: 'BANK_TRANSFER', label: 'Bank' },
      RAAST: { kind: 'BANK', method: 'BANK_TRANSFER', label: 'Raast' },
      NAYAPAY: { kind: 'WALLET', method: null, label: 'NayaPay' },
      SADAPAY: { kind: 'WALLET', method: null, label: 'SadaPay' },
      OTHER: { kind: 'BANK', method: null, label: 'Account' },
    };

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.moneyAccount.findMany({ where: { tenantId }, select: { accountNumber: true, iban: true, shopId: true, method: true, isDefault: true, isActive: true } });
      const known = new Set(existing.flatMap((e) => [digits(e.accountNumber), (e.iban ?? '').toUpperCase()]).filter(Boolean));
      const defaults = new Set(existing.filter((e) => e.isDefault && e.isActive && e.shopId === shopId).map((e) => e.method));
      let created = 0; let skipped = 0;
      for (const p of list) {
        const num = digits(p.number);
        const iban = (p.iban ?? '').trim().toUpperCase();
        if ((num && known.has(num)) || (iban && known.has(iban))) { skipped++; continue; }
        const s = SHAPE[p.kind ?? 'OTHER'] ?? SHAPE.OTHER;
        const label = p.kind === 'BANK' && p.bank?.trim() ? p.bank.trim() : s.label;
        const isDefault = !!s.method && !defaults.has(s.method);
        if (isDefault && s.method) { await this.lockDefault(tx, tenantId, s.method); defaults.add(s.method); }
        await tx.moneyAccount.create({
          data: {
            tenantId, shopId, kind: s.kind, method: s.method, isDefault,
            name: num ? `${label} · ${num.slice(-4)}` : label,
            bankName: p.bank?.trim() || null,
            accountTitle: p.title?.trim() || null,
            accountNumber: p.number?.trim() || null,
            iban: iban || null,
            createdById: user.id,
          },
        });
        if (num) known.add(num);
        if (iban) known.add(iban);
        created++;
      }
      return { created, skipped };
    }, TX);
  }

  /* ═════════════════════════ statement ═════════════════════════ */

  /** Opening, every automatic and manual line with a running balance, and closing. */
  async statement(user: AuthenticatedUser, id: string, q: StatementDto) {
    const a = await this.load(this.prisma, user, id, 'Statement dekhna');
    const range = q.from && q.to
      ? await periodRange(this.tz, user.tenantId, q.from, q.to)
      : { gte: a.openingDate, lt: new Date(Date.now() + 60_000) };
    if (range.gte >= range.lt) throw new BadRequestException('"Se" ki tareekh "Tak" se pehle honi chahiye');
    const start = range.gte > a.openingDate ? range.gte : a.openingDate;
    const scope = await autoScopeOf(this.prisma, a);
    const opening = start > a.openingDate ? await accountBalance(this.prisma, a, start, scope) : r2(n(a.openingBalance));
    const raw = start < range.lt ? await this.lines(a, scope, { gte: start, lt: range.lt }) : [];

    raw.sort((x, y) => x.at.getTime() - y.at.getTime() || x.id.localeCompare(y.id));
    let running = opening; let moneyIn = 0; let moneyOut = 0;
    const lines: StatementLine[] = raw.map((l) => {
      running = r2(running + (l.direction === 'in' ? l.amount : -l.amount));
      if (l.direction === 'in') moneyIn += l.amount; else moneyOut += l.amount;
      return { ...l, balance: running };
    });
    const shopRow = a.shopId ? await this.prisma.shop.findFirst({ where: { id: a.shopId, tenantId: user.tenantId }, select: { name: true } }) : null;
    return {
      account: {
        id: a.id, name: a.name, kind: a.kind, method: a.method, bankName: a.bankName, accountTitle: a.accountTitle,
        accountNumber: a.accountNumber, iban: a.iban, shop: shopRow?.name ?? null, auto: !!scope,
      },
      from: start,
      to: new Date(range.lt.getTime() - 1),
      opening,
      in: r2(moneyIn),
      out: r2(moneyOut),
      closing: r2(running),
      lines,
    };
  }

  private async lines(a: MoneyAccount, scope: AutoScope | null, w: { gte: Date; lt: Date }): Promise<Array<Omit<StatementLine, 'balance'>>> {
    const take = STATEMENT_LIMIT + 1;
    const line = (kind: AutoSource, x: Omit<StatementLine, 'balance' | 'kind' | 'direction'>) =>
      ({ ...x, kind, direction: AUTO_DIRECTION[kind], amount: r2(x.amount) });

    const entries = await this.prisma.moneyAccountEntry.findMany({
      where: { tenantId: a.tenantId, accountId: a.id, entryDate: w },
      orderBy: { entryDate: 'asc' }, take,
      select: {
        id: true, type: true, amount: true, reason: true, note: true, entryDate: true, transferGroupId: true, cashRegisterId: true,
        createdBy: { select: { fullName: true } },
      },
    });
    const groups = entries.map((e) => e.transferGroupId).filter((g): g is string => !!g);
    const other = groups.length
      ? await this.prisma.moneyAccountEntry.findMany({
        where: { tenantId: a.tenantId, transferGroupId: { in: groups }, accountId: { not: a.id } },
        select: { transferGroupId: true, account: { select: { name: true } } },
      })
      : [];
    const otherName = new Map(other.map((o) => [o.transferGroupId, o.account.name]));
    const out: Array<Omit<StatementLine, 'balance'>> = entries.map((e) => {
      const effect = entryEffect(e.type, n(e.amount));
      return {
        id: `ENTRY:${e.id}`, at: e.entryDate, kind: e.type, direction: effect >= 0 ? 'in' : 'out', amount: r2(Math.abs(effect)),
        reference: null,
        party: (e.transferGroupId && otherName.get(e.transferGroupId)) || (e.cashRegisterId ? 'Golak' : null),
        note: [e.reason, e.note].filter(Boolean).join(' · ') || null,
        by: e.createdBy?.fullName ?? null,
      };
    });

    if (scope) {
      const q = autoWhere(scope, w);
      const [sales, bookingIn, bookingOut, refunds, purchases, suppliers, expenses] = await Promise.all([
        this.prisma.sale.findMany({
          where: q.sale, orderBy: { soldAt: 'asc' }, take,
          select: { id: true, saleNumber: true, paidAmount: true, changeAmount: true, soldAt: true, customer: { select: { name: true } }, soldBy: { select: { fullName: true } }, createdBy: { select: { fullName: true } } },
        }),
        this.prisma.bookingPayment.findMany({
          where: q.booking, orderBy: { paidAt: 'asc' }, take,
          select: { id: true, amount: true, paidAt: true, reference: true, notes: true, booking: { select: { bookingNumber: true, customer: { select: { name: true } } } } },
        }),
        this.prisma.bookingPayment.findMany({
          where: q.bookingRefund, orderBy: { paidAt: 'asc' }, take,
          select: { id: true, amount: true, paidAt: true, reference: true, notes: true, booking: { select: { bookingNumber: true, customer: { select: { name: true } } } } },
        }),
        this.prisma.saleReturn.findMany({
          where: q.refund, orderBy: { returnedAt: 'asc' }, take,
          select: { id: true, returnNumber: true, refundAmount: true, returnedAt: true, reason: true, sale: { select: { saleNumber: true, customer: { select: { name: true } } } }, createdBy: { select: { fullName: true } } },
        }),
        this.prisma.purchase.findMany({
          where: q.purchase, orderBy: { purchasedAt: 'asc' }, take,
          select: { id: true, purchaseNumber: true, paidAmount: true, purchasedAt: true, supplier: { select: { name: true } }, createdBy: { select: { fullName: true } } },
        }),
        this.prisma.supplierLedger.findMany({
          where: q.supplier, orderBy: { entryDate: 'asc' }, take,
          select: { id: true, amount: true, entryDate: true, reference: true, note: true, supplier: { select: { name: true } } },
        }),
        this.prisma.expense.findMany({
          where: q.expense, orderBy: { expenseDate: 'asc' }, take,
          select: { id: true, expenseNumber: true, title: true, amount: true, expenseDate: true, createdBy: { select: { fullName: true } } },
        }),
      ]);
      const khataPart = await refundKhataParts(this.prisma, a.tenantId, refunds.map((r) => r.returnNumber));
      const lists = [entries, sales, bookingIn, bookingOut, refunds, purchases, suppliers, expenses];
      if (lists.some((l) => l.length > STATEMENT_LIMIT)) {
        throw new BadRequestException('Is muddat me entries bahut zyada hain — muddat chhoti karein');
      }
      out.push(
        ...sales.map((r) => line('SALE', {
          id: `SALE:${r.id}`, at: r.soldAt, amount: n(r.paidAmount) - n(r.changeAmount), reference: r.saleNumber,
          party: r.customer?.name ?? null, note: null, by: r.soldBy?.fullName ?? r.createdBy?.fullName ?? null,
        })),
        ...bookingIn.map((r) => line('BOOKING', {
          id: `BOOKING:${r.id}`, at: r.paidAt, amount: n(r.amount), reference: r.booking.bookingNumber,
          party: r.booking.customer?.name ?? null, note: r.notes ?? r.reference, by: null,
        })),
        ...bookingOut.map((r) => line('BOOKING_REFUND', {
          id: `BOOKING_REFUND:${r.id}`, at: r.paidAt, amount: n(r.amount), reference: r.booking.bookingNumber,
          party: r.booking.customer?.name ?? null, note: r.notes ?? r.reference, by: null,
        })),
        ...refunds.filter((r) => n(r.refundAmount) + (khataPart.get(r.returnNumber) ?? 0) > 0.005).map((r) => line('REFUND', {
          id: `REFUND:${r.id}`, at: r.returnedAt, amount: n(r.refundAmount) + (khataPart.get(r.returnNumber) ?? 0), reference: `${r.returnNumber} · ${r.sale.saleNumber}`,
          party: r.sale.customer?.name ?? null, note: r.reason, by: r.createdBy?.fullName ?? null,
        })),
        ...purchases.map((r) => line('PURCHASE', {
          id: `PURCHASE:${r.id}`, at: r.purchasedAt, amount: n(r.paidAmount), reference: r.purchaseNumber,
          party: r.supplier.name, note: null, by: r.createdBy?.fullName ?? null,
        })),
        ...suppliers.map((r) => line('SUPPLIER', {
          id: `SUPPLIER:${r.id}`, at: r.entryDate, amount: n(r.amount), reference: r.reference,
          party: r.supplier.name, note: r.note, by: null,
        })),
        ...expenses.map((r) => line('EXPENSE', {
          id: `EXPENSE:${r.id}`, at: r.expenseDate, amount: n(r.amount), reference: r.expenseNumber,
          party: r.title, note: null, by: r.createdBy?.fullName ?? null,
        })),
      );
    } else if (entries.length > STATEMENT_LIMIT) {
      throw new BadRequestException('Is muddat me entries bahut zyada hain — muddat chhoti karein');
    }
    return out;
  }

  /* ═════════════════════════ movements ═════════════════════════ */

  /** Locks account rows in a fixed order so two movements cannot cross. */
  private async lockAccounts(tx: Db, ids: string[]) {
    for (const id of [...ids].sort()) await tx.$queryRaw`SELECT id FROM "MoneyAccount" WHERE id = ${id} FOR UPDATE`;
  }

  /** The first posting of a request, when this is a retry. */
  private async repeat(tx: Db, tenantId: string, requestId: string) {
    const done = await tx.moneyAccountEntry.findFirst({ where: { tenantId, requestId } });
    return done ? { duplicate: true, entryId: done.id, transferGroupId: done.transferGroupId } : null;
  }

  private async ensureFunds(tx: Db, a: MoneyAccount, amount: number, allowNegative?: boolean) {
    if (allowNegative) return;
    const balance = await accountBalance(tx, a);
    if (balance - amount < -0.005) {
      throw new BadRequestException(`${a.name} me sirf ${rs(balance)} hain. Raqam kam karein ya "minus me jane dein" chunein.`);
    }
  }

  /** The open till, locked for this transaction. */
  private async openRegister(tx: Db, user: AuthenticatedUser, shop: ShopScope, registerId?: string) {
    if (!registerId) shop.require('Golak ka kaam');
    const register = await tx.cashRegister.findFirst({
      where: { tenantId: user.tenantId, status: 'OPEN', ...shop.where, ...(registerId && { id: registerId }) },
      orderBy: { openedAt: 'desc' },
    });
    if (!register) throw new BadRequestException(registerId ? 'Ye register band ho chuka hai' : 'Is branch ka register band hai. Pehle Cash register kholein.');
    if (register.shopId) assertShopAccess(user, register.shopId, 'Register ka kaam');
    const rows = await tx.$queryRaw<Array<{ status: string }>>`SELECT status::text AS status FROM "CashRegister" WHERE id = ${register.id} FOR UPDATE`;
    if (rows[0]?.status !== 'OPEN') throw new BadRequestException('Ye register band ho chuka hai');
    return register;
  }

  /** Account to account: TRANSFER_OUT and TRANSFER_IN under one group id. */
  async transfer(user: AuthenticatedUser, dto: TransferDto) {
    if (dto.fromAccountId === dto.toAccountId) throw new BadRequestException('Dono taraf alag account chunein');
    const tenantId = user.tenantId;
    const amount = r2(dto.amount);
    return this.prisma.$transaction(async (tx) => {
      const from = await this.load(tx, user, dto.fromAccountId, 'Paisa bhejna');
      const to = await this.load(tx, user, dto.toAccountId, 'Paisa bhejna');
      this.active(from); this.active(to);
      await this.lockAccounts(tx, [from.id, to.id]);
      const again = await this.repeat(tx, tenantId, dto.requestId);
      if (again) return again;
      await this.ensureFunds(tx, from, amount, dto.allowNegative);

      const transferGroupId = randomUUID();
      const base = { tenantId, amount, reason: dto.reason.trim(), note: dto.note?.trim() || null, transferGroupId, createdById: user.id };
      const out = await tx.moneyAccountEntry.create({ data: { ...base, accountId: from.id, shopId: from.shopId, type: 'TRANSFER_OUT', requestId: dto.requestId } });
      await tx.moneyAccountEntry.create({ data: { ...base, accountId: to.id, shopId: to.shopId, type: 'TRANSFER_IN' } });
      return { duplicate: false, entryId: out.id, transferGroupId };
    }, TX);
  }

  /** Cash from the drawer into an account ("galle se bank me jama"). */
  drawerToAccount(user: AuthenticatedUser, shop: ShopScope, dto: DrawerMoveDto) {
    return this.drawerMove(user, shop, dto, 'CASH_OUT');
  }

  /** Cash from an account into the drawer. */
  accountToDrawer(user: AuthenticatedUser, shop: ShopScope, dto: DrawerMoveDto) {
    return this.drawerMove(user, shop, dto, 'CASH_IN');
  }

  /**
   * One cash register entry and one account entry in the same transaction.
   * The drawer side is a plain CASH_IN / CASH_OUT, so live-cash.helper and
   * the cash register count it like any manual cash movement.
   */
  private async drawerMove(user: AuthenticatedUser, shop: ShopScope, dto: DrawerMoveDto, drawer: 'CASH_IN' | 'CASH_OUT') {
    const tenantId = user.tenantId;
    const amount = r2(dto.amount);
    const toAccount = drawer === 'CASH_OUT';
    return this.prisma.$transaction(async (tx) => {
      const account = await this.load(tx, user, dto.accountId, 'Golak ka kaam');
      this.active(account);
      const register = await this.openRegister(tx, user, shop, dto.registerId);
      if (account.shopId && register.shopId && account.shopId !== register.shopId) {
        throw new BadRequestException('Ye account doosri branch ka hai');
      }
      await this.lockAccounts(tx, [account.id]);
      const again = await this.repeat(tx, tenantId, dto.requestId);
      if (again) return again;

      if (toAccount) {
        if (!dto.allowNegative) {
          const live = await computeLiveCash(tx, tenantId, register);
          if (live.expected - amount < -0.005) {
            throw new BadRequestException(`Golak me sirf ${rs(live.expected)} hone chahiye. Pehle gin lein ya raqam kam karein.`);
          }
        }
      } else {
        await this.ensureFunds(tx, account, amount, dto.allowNegative);
      }

      const reason = dto.reason.trim();
      const note = dto.note?.trim() || null;
      await tx.cashRegister.update({
        where: { id: register.id },
        data: {
          expectedBalance: { increment: toAccount ? -amount : amount },
          totalCashIn: { increment: toAccount ? 0 : amount },
          totalCashOut: { increment: toAccount ? amount : 0 },
        },
      });
      await tx.cashTransaction.create({
        data: {
          tenantId, cashRegisterId: register.id, createdById: user.id, type: drawer, amount,
          reason: `${reason} · ${account.name}`.slice(0, 200), note, reference: `req:${dto.requestId}`,
        },
      });
      const entry = await tx.moneyAccountEntry.create({
        data: {
          tenantId, accountId: account.id, shopId: account.shopId ?? register.shopId, type: toAccount ? 'DEPOSIT' : 'WITHDRAW',
          amount, reason, note, requestId: dto.requestId, cashRegisterId: register.id, createdById: user.id,
        },
      });
      return { duplicate: false, entryId: entry.id, transferGroupId: null };
    }, TX);
  }

  /** Owner capital in, drawings or bank charges out, or a correction. */
  async entry(user: AuthenticatedUser, dto: AccountEntryDto) {
    const tenantId = user.tenantId;
    if (dto.type !== 'ADJUSTMENT' && dto.amount <= 0) throw new BadRequestException('Raqam sifr se zyada honi chahiye');
    const amount = r2(dto.amount);
    return this.prisma.$transaction(async (tx) => {
      const a = await this.load(tx, user, dto.accountId, 'Account me entry');
      this.active(a);
      await this.lockAccounts(tx, [a.id]);
      const again = await this.repeat(tx, tenantId, dto.requestId);
      if (again) return again;

      const entryDate = dto.entryDate ? new Date(dto.entryDate) : new Date();
      if (entryDate.getTime() > Date.now() + 60_000) throw new BadRequestException('Aage ki tareekh nahi chalti');
      if (entryDate < a.openingDate) throw new BadRequestException('Tareekh account shuru hone se pehle ki hai');

      const effect = entryEffect(dto.type, amount);
      if (effect < 0) await this.ensureFunds(tx, a, -effect, dto.allowNegative);

      const entry = await tx.moneyAccountEntry.create({
        data: {
          tenantId, accountId: a.id, shopId: a.shopId, type: dto.type, amount, entryDate,
          reason: dto.reason.trim(), note: dto.note?.trim() || null, requestId: dto.requestId, createdById: user.id,
        },
      });
      return { duplicate: false, entryId: entry.id, transferGroupId: null };
    }, TX);
  }
}
