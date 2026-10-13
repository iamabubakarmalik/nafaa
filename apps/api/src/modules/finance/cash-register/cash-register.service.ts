import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope, assertShopAccess, resolveWriteShopId } from '../../../common/shop-scope';
import { OpenRegisterDto } from './dto/open-register.dto';
import { CloseRegisterDto } from './dto/close-register.dto';
import { CashTransactionDto } from './dto/cash-transaction.dto';
import { checkDenominations, type Denominations } from './dto/denominations';
import { computeLiveCash, type CashWindow } from '../../../common/helpers/live-cash.helper';

type Db = Prisma.TransactionClient;

/** What went into and out of the drawer during one shift. */
export type CashBreakdown = Awaited<ReturnType<CashRegisterService['computeCash']>>;

/** Stored with the CLOSING entry so a shift report prints what was seen at close. */
export interface ClosingSnapshot {
  v: 1;
  cash: Omit<CashBreakdown, 'openedAt' | 'openHours'>;
  denominations?: Denominations;
}

/** Window in which an identical cash in/out without a request key is treated as a repeat. */
const DUPLICATE_MS = 10_000;
const round2 = (v: number) => Math.round(v * 100) / 100;
const n = (v: unknown) => Number(v ?? 0);

/** Parses the JSON kept in a cash entry's `reference`; anything else is ignored. */
export function readReference<T>(reference: string | null | undefined): T | null {
  if (!reference || reference[0] !== '{') return null;
  try {
    return JSON.parse(reference) as T;
  } catch {
    return null;
  }
}

/** The breakdown without the clock fields, for storing. */
function snapshotOf(cash: CashBreakdown): ClosingSnapshot['cash'] {
  const copy: Partial<CashBreakdown> = { ...cash };
  delete copy.openedAt;
  delete copy.openHours;
  return copy as ClosingSnapshot['cash'];
}

const PEOPLE = {
  openedBy: { select: { id: true, fullName: true } },
  closedBy: { select: { id: true, fullName: true } },
  shop: { select: { id: true, name: true } },
} as const;

@Injectable()
export class CashRegisterService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Drawer cash for one shift from `openedAt` up to `until` (now when left
   * out), plus the non-cash takings shown beside it. The live card, closing
   * and the shift report all use this one calculation.
   */
  async computeCash(tenantId: string, register: CashWindow, until?: Date, db: Db = this.prisma) {
    const window = { gte: register.openedAt, ...(until && { lte: until }) };
    const saleWhere: Prisma.SaleWhereInput = {
      tenantId, ...(register.shopId ? { shopId: register.shopId } : {}), status: { not: 'VOIDED' }, soldAt: window,
    };

    const [drawer, allSales, byMethod, paidBy, cashRefunds] = await Promise.all([
      computeLiveCash(db, tenantId, register, until),
      db.sale.aggregate({
        where: saleWhere,
        _sum: { total: true, creditAmount: true },
        _count: { _all: true },
      }),
      db.sale.groupBy({
        by: ['paymentMethod'],
        where: saleWhere,
        _sum: { total: true },
        _count: { _all: true },
      }),
      // Money by method from the payment rows, cash net of change. Trade-in is goods, not money.
      db.salePayment.groupBy({
        by: ['method'],
        where: { tenantId, method: { not: 'TRADE_IN' }, sale: saleWhere },
        _sum: { amount: true },
      }),
      this.cashRefundCounts(db, tenantId, register, window),
    ]);

    const collected = paidBy.reduce((x, m) => x + n(m._sum.amount), 0);
    const cashTaken = n(paidBy.find((m) => m.method === 'CASH')?._sum.amount);
    const methodKeys = [...new Set([...byMethod.map((m) => m.paymentMethod as string), ...paidBy.map((m) => m.method as string)])];

    return {
      ...drawer,
      /** Returns that paid cash out of the drawer; ones that only cleared udhaar are counted apart. */
      returnCount: cashRefunds.drawer,
      khataReturnCount: cashRefunds.khataOnly,
      /** Expected cash below zero: more was written as paid from the drawer than it held. */
      negative: drawer.expected < -0.005,

      /** Money that did not come into the drawer: card, wallet, credit. */
      allSalesTotal: n(allSales._sum.total),
      allSalesPaid: round2(collected),
      creditGiven: n(allSales._sum.creditAmount),
      billCount: allSales._count._all ?? 0,
      nonCashCollected: round2(collected - cashTaken),
      // Bills and their total by the bill's main method; paid by payment rows.
      byMethod: methodKeys
        .map((method) => {
          const b = byMethod.find((m) => m.paymentMethod === method);
          return {
            method,
            total: n(b?._sum.total),
            paid: round2(n(paidBy.find((m) => m.method === method)?._sum.amount)),
            count: b?._count._all ?? 0,
          };
        })
        .sort((a, b) => b.total - a.total),

      openedAt: register.openedAt,
      /** Hours the register has been (or was) open. */
      openHours: ((until ?? new Date()).getTime() - new Date(register.openedAt).getTime()) / 3_600_000,
    };
  }

  /**
   * Cash refunds of the shift split by where the money went: some or all of
   * it out of the drawer, or only off the customer's udhaar. Same rows as the
   * drawer's `returns` figure in live-cash.helper.
   */
  private async cashRefundCounts(db: Db, tenantId: string, register: CashWindow, window: Prisma.DateTimeFilter) {
    const rows = await db.saleReturn.findMany({
      where: {
        tenantId, refundMethod: 'CASH', refundAmount: { gt: 0 }, returnedAt: window,
        ...(register.shopId && { OR: [{ shopId: register.shopId }, { shopId: null, sale: { shopId: register.shopId } }] }),
      },
      select: { returnNumber: true, refundAmount: true },
    });
    if (!rows.length) return { drawer: 0, khataOnly: 0 };
    const khata = await db.customerLedger.groupBy({
      by: ['reference'],
      where: { tenantId, type: 'REFUND', reference: { in: rows.map((r) => r.returnNumber) } },
      _sum: { amount: true },
    });
    // Khata refunds are negative amounts (udhaar taken off).
    const offKhata = new Map(khata.map((k) => [k.reference ?? '', -n(k._sum.amount)]));
    const drawer = rows.filter((r) => n(r.refundAmount) - (offKhata.get(r.returnNumber) ?? 0) > 0.005).length;
    return { drawer, khataOnly: rows.length - drawer };
  }

  /**
   * Whether paying `amount` in cash now would take the drawer below zero.
   * Screens that pay cash out (purchase, expense, cash out) call it to warn
   * before saving; nothing is blocked.
   */
  async payoutCheck(user: AuthenticatedUser, scope: ShopScope, amount: number, registerId?: string) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { tenantId: user.tenantId, status: 'OPEN', ...scope.where, ...(registerId && { id: registerId }) },
      orderBy: { openedAt: 'desc' },
    });
    if (!register) return { registerOpen: false, expected: null, after: null, short: false, message: null };
    const live = await computeLiveCash(this.prisma, user.tenantId, register);
    const pay = Math.max(0, n(amount));
    const after = round2(live.expected - pay);
    const short = after < -0.005;
    return {
      registerOpen: true,
      registerId: register.id,
      expected: live.expected,
      after,
      short,
      message: !short
        ? null
        : live.expected > 0
          ? `Drawer me hisaab se sirf Rs ${live.expected.toLocaleString('en-PK')} hain — Rs ${pay.toLocaleString('en-PK')} dene ke baad Rs ${Math.abs(after).toLocaleString('en-PK')} minus ho jayega. Cash kahin aur se diya hai to payment method badlein.`
          : `Drawer ka hisaab pehle hi Rs ${Math.abs(live.expected).toLocaleString('en-PK')} minus hai — yeh payment bhi drawer se likhi to Rs ${Math.abs(after).toLocaleString('en-PK')} minus ho jayega. Cash kahin aur se diya hai to payment method badlein.`,
    };
  }

  /** The open till: the given one, or the newest open one in scope. */
  private async findOpen(user: AuthenticatedUser, scope: ShopScope, registerId?: string) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { tenantId: user.tenantId, status: 'OPEN', ...scope.where, ...(registerId && { id: registerId }) },
      orderBy: { openedAt: 'desc' },
    });
    if (!register) {
      if (!registerId) throw new BadRequestException('Koi register open nahi hai');
      const found = await this.prisma.cashRegister.findFirst({
        where: { id: registerId, tenantId: user.tenantId },
        select: { status: true },
      });
      if (!found) throw new NotFoundException('Register nahi mila');
      if (found.status !== 'OPEN') throw new BadRequestException('Ye register band ho chuka hai');
      throw new BadRequestException('Ye register is branch ka nahi hai — upar se sahi branch chunein');
    }
    if (register.shopId) assertShopAccess(user, register.shopId, 'Register ka kaam');
    return register;
  }

  /** Locks the register row for this transaction and confirms it is still open. */
  private async lockOpen(tx: Prisma.TransactionClient, id: string) {
    const rows = await tx.$queryRaw<Array<{ status: string }>>`SELECT status::text AS status FROM "CashRegister" WHERE id = ${id} FOR UPDATE`;
    if (rows[0]?.status !== 'OPEN') throw new BadRequestException('Ye register band ho chuka hai');
  }

  /** An open register with its live count and recent entries. */
  private async withLive<T extends CashWindow & { transactions: Array<{ type: string; reference: string | null }> }>(tenantId: string, register: T) {
    const live = await this.computeCash(tenantId, register);
    const opening = register.transactions.find((t) => t.type === 'OPENING');
    return {
      ...register,
      /** Live figure; the stored column only moves on manual cash in/out. */
      expectedBalance: live.expected,
      live,
      openingDenominations: readReference<{ denominations?: Denominations }>(opening?.reference)?.denominations ?? null,
    };
  }

  private openInclude() {
    return {
      ...PEOPLE,
      transactions: {
        orderBy: { createdAt: 'desc' as const },
        take: 50,
        include: { createdBy: { select: { id: true, fullName: true } } },
      },
    };
  }

  /** The open register of the branch in view, with the live count. */
  async getCurrent(user: AuthenticatedUser, scope: ShopScope) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { tenantId: user.tenantId, status: 'OPEN', ...scope.where },
      orderBy: { openedAt: 'desc' },
      include: this.openInclude(),
    });
    if (!register) return null;
    return this.withLive(user.tenantId, register);
  }

  /** Every open register in scope (one per branch), each with its live count. */
  async listOpen(user: AuthenticatedUser, scope: ShopScope) {
    const registers = await this.prisma.cashRegister.findMany({
      where: { tenantId: user.tenantId, status: 'OPEN', ...scope.where },
      orderBy: { openedAt: 'asc' },
      include: this.openInclude(),
    });
    return Promise.all(registers.map((r) => this.withLive(user.tenantId, r)));
  }

  async open(user: AuthenticatedUser, scope: ShopScope, dto: OpenRegisterDto) {
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope, dto.shopId);
    assertShopAccess(user, shopId, 'Register kholna');

    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId: user.tenantId, isActive: true },
    });
    if (!shop) throw new NotFoundException('Shop not found or inactive');
    const denominations = checkDenominations(dto.denominations, dto.openingBalance);

    return this.prisma.$transaction(async (tx) => {
      // Two openings at once wait on the branch row, so only one passes the check below.
      await tx.$queryRaw`SELECT id FROM "Shop" WHERE id = ${shopId} FOR UPDATE`;
      const existing = await tx.cashRegister.findFirst({
        where: { tenantId: user.tenantId, shopId, status: 'OPEN' },
        select: { id: true },
      });
      if (existing) {
        throw new BadRequestException(`${shop.name} ka register pehle se open hai. Pehle close karein.`);
      }

      const registerNumber = `CR-${shop.name.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'REG'}-${Date.now().toString().slice(-7)}`;
      const register = await tx.cashRegister.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          openedById: user.id,
          registerNumber,
          openingBalance: dto.openingBalance,
          expectedBalance: dto.openingBalance,
          notes: dto.notes,
          status: 'OPEN',
        },
      });

      await tx.cashTransaction.create({
        data: {
          tenantId: user.tenantId,
          cashRegisterId: register.id,
          createdById: user.id,
          type: 'OPENING',
          amount: dto.openingBalance,
          reason: `${shop.name} register opened`,
          note: dto.notes,
          reference: denominations ? JSON.stringify({ v: 1, denominations }) : undefined,
        },
      });

      return register;
    });
  }

  async addTransaction(user: AuthenticatedUser, scope: ShopScope, dto: CashTransactionDto) {
    const register = await this.findOpen(user, scope, dto.registerId);
    const requestRef = dto.requestId ? `req:${dto.requestId}` : undefined;

    return this.prisma.$transaction(async (tx) => {
      await this.lockOpen(tx, register.id);
      // A repeat of the same request (double click, retry) returns the first entry.
      if (requestRef) {
        const done = await tx.cashTransaction.findFirst({
          where: { tenantId: user.tenantId, cashRegisterId: register.id, reference: requestRef },
        });
        if (done) return done;
      } else {
        // Without a key, the same entry by the same person within a few seconds is a double post.
        const twin = await tx.cashTransaction.findFirst({
          where: {
            tenantId: user.tenantId, cashRegisterId: register.id, createdById: user.id,
            type: dto.type, amount: dto.amount, reason: dto.reason.trim(),
            createdAt: { gte: new Date(Date.now() - DUPLICATE_MS) },
          },
        });
        if (twin) return twin;
      }

      const isIn = dto.type === 'CASH_IN';
      await tx.cashRegister.update({
        where: { id: register.id },
        data: {
          expectedBalance: { increment: isIn ? dto.amount : -dto.amount },
          totalCashIn: { increment: isIn ? dto.amount : 0 },
          totalCashOut: { increment: isIn ? 0 : dto.amount },
        },
      });

      return tx.cashTransaction.create({
        data: {
          tenantId: user.tenantId,
          cashRegisterId: register.id,
          createdById: user.id,
          type: dto.type,
          amount: dto.amount,
          reason: dto.reason.trim(),
          note: dto.note?.trim() || undefined,
          reference: requestRef,
        },
      });
    });
  }

  async close(user: AuthenticatedUser, scope: ShopScope, dto: CloseRegisterDto) {
    const register = await this.findOpen(user, scope, dto.registerId);
    const denominations = checkDenominations(dto.denominations, dto.closingBalance);

    return this.prisma.$transaction(async (tx) => {
      // Holding the row lock keeps cash in/out out until the count is saved.
      await this.lockOpen(tx, register.id);
      const closedAt = new Date();
      const cash = await this.computeCash(user.tenantId, register, closedAt, tx);
      const difference = round2(dto.closingBalance - cash.expected);

      await tx.cashRegister.update({
        where: { id: register.id },
        data: {
          status: 'CLOSED',
          closedById: user.id,
          closingBalance: dto.closingBalance,
          expectedBalance: cash.expected,
          difference,
          totalSales: cash.cashSales,
          totalExpenses: cash.expenses,
          totalCashIn: cash.cashIn,
          totalCashOut: cash.cashOut,
          closedAt,
          notes: dto.notes ?? register.notes,
        },
      });

      const snapshot: ClosingSnapshot = { v: 1, cash: snapshotOf(cash), ...(denominations && { denominations }) };
      await tx.cashTransaction.create({
        data: {
          tenantId: user.tenantId,
          cashRegisterId: register.id,
          createdById: user.id,
          type: 'CLOSING',
          amount: dto.closingBalance,
          reason: 'Register closed',
          note:
            `Difference: ${difference} | opening ${cash.openingBalance}` +
            ` + sale ${cash.cashSales} + booking ${cash.bookingReceived} + khata ${cash.khataReceived}` +
            ` + daala ${cash.cashIn}` +
            ` − nikala ${cash.cashOut} − expense ${cash.expenses}` +
            ` − return ${cash.returns} − booking return ${cash.bookingRefunds} − purchase ${cash.purchases}` +
            ` − supplier ${cash.supplierPaid}`,
          reference: JSON.stringify(snapshot),
        },
      });

      return tx.cashRegister.findUniqueOrThrow({ where: { id: register.id }, include: PEOPLE });
    }, { timeout: 20_000 });
  }

  /** Last 30 shifts in scope (kept for the mobile app). */
  async history(user: AuthenticatedUser, scope: ShopScope) {
    return this.prisma.cashRegister.findMany({
      where: { tenantId: user.tenantId, ...scope.where, NOT: { status: 'CLOSED', closedAt: null } },
      orderBy: { openedAt: 'desc' },
      take: 30,
      include: { ...PEOPLE, shop: true },
    });
  }
}
