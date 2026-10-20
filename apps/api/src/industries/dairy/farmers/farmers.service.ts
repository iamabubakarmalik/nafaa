import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { cleanInput, dayKey, dayRange, nextNumbered, r2, shopYear } from '../dairy-common';
import { LIVE_SLIP } from '../farmer-supplies/farmer-supplies.service';
import { FarmerPaymentDto, FarmerStatementQuery, UpdateFarmerDto, UpsertFarmerDto } from './dto/upsert-farmer.dto';
import { payAccountsWhere, payFarmer, paymentRef } from './farmer-payment';

const METHOD_LABEL: Record<string, string> = { BANK_TRANSFER: 'Bank', JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa', CARD: 'Card' };

export interface FarmerPaymentLine {
  id: string;
  date: Date;
  amount: number;
  method: string;
  /** Account the money left from; null for drawer cash. */
  accountName: string | null;
  reference: string | null;
  note: string | null;
  /** Cash paid before payments were recorded on their own (read from the drawer). */
  legacy: boolean;
}


@Injectable()
export class FarmersService {
  constructor(private readonly prisma: PrismaService) {}

  private check(dto: UpdateFarmerDto) {
    if (dto.name !== undefined && !dto.name.trim()) throw new BadRequestException('Gawale ka naam likhein');
    if ((dto.ratePerLiter ?? 0) < 0 || (dto.fatBonusRate ?? 0) < 0) throw new BadRequestException('Rate manfi nahi ho sakta');
  }

  async create(user: AuthenticatedUser, dto: UpsertFarmerDto) {
    this.check(dto);
    const prefix = `FRM-${shopYear()}-`;
    return nextNumbered(
      () => this.prisma.dairyFarmer.count({ where: { tenantId: user.tenantId, farmerNumber: { startsWith: prefix } } }),
      prefix, 4,
      (farmerNumber) => this.prisma.dairyFarmer.create({ data: { ...cleanInput(dto), name: dto.name.trim(), tenantId: user.tenantId, farmerNumber } }),
    );
  }

  async list(user: AuthenticatedUser, params: { search?: string; village?: string; active?: boolean }) {
    return this.prisma.dairyFarmer.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.village && { village: { contains: params.village, mode: 'insensitive' } }),
        ...(params.search && {
          OR: [
            { farmerNumber: { contains: params.search, mode: 'insensitive' } },
            { name: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search } },
            { cnic: { contains: params.search } },
            { village: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const f = await this.prisma.dairyFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Gawala nahi mila');

    const recentSupplies = await this.prisma.dairyFarmerSupply.findMany({
      where: { farmerId: id, tenantId: user.tenantId },
      orderBy: { supplyDate: 'desc' },
      take: 60,
    });
    const payments = await this.payments(user.tenantId, f, undefined, 60);
    // Old shape, kept for older screens: cash payments only.
    const cashPayments = payments.filter((p) => p.method === 'CASH' && !p.accountName)
      .map((p) => ({ id: p.id, amount: p.amount, reason: p.note ?? p.reference ?? 'Gawale ko payment', createdAt: p.date }));

    return { ...f, recentSupplies, payments, cashPayments };
  }

  /**
   * Payments to a gawala, newest first: the recorded rows, plus cash paid
   * from the drawer before payments had their own rows (CASH_OUT with the
   * gawala number or a slip id as reference).
   */
  private async payments(tenantId: string, f: { id: string; farmerNumber: string }, range?: Prisma.DateTimeFilter, take = 2000): Promise<FarmerPaymentLine[]> {
    const slipIds = (await this.prisma.dairyFarmerSupply.findMany({ where: { tenantId, farmerId: f.id }, select: { id: true } })).map((s) => s.id);
    const [rows, legacy] = await Promise.all([
      this.prisma.dairyFarmerPayment.findMany({
        where: { tenantId, farmerId: f.id, ...(range && { createdAt: range }) }, orderBy: { createdAt: 'desc' }, take,
      }),
      this.prisma.cashTransaction.findMany({
        where: { tenantId, type: 'CASH_OUT', reference: { in: [f.farmerNumber, ...slipIds] }, ...(range && { createdAt: range }) },
        orderBy: { createdAt: 'desc' }, take, select: { id: true, amount: true, reason: true, createdAt: true },
      }),
    ]);
    const entries = rows.length
      ? await this.prisma.moneyAccountEntry.findMany({
        where: { tenantId, requestId: { in: rows.map((r) => paymentRef(r.id)) } }, select: { requestId: true, account: { select: { name: true } } },
      })
      : [];
    const accountOf = new Map(entries.map((e) => [e.requestId, e.account.name]));
    return [
      ...rows.map((r) => ({
        id: r.id, date: r.createdAt, amount: r.amount, method: r.method, accountName: accountOf.get(paymentRef(r.id)) ?? null,
        reference: r.reference, note: r.note, legacy: false,
      })),
      ...legacy.map((c) => ({
        id: c.id, date: c.createdAt, amount: Number(c.amount), method: 'CASH', accountName: null, reference: null, note: c.reason, legacy: true,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, take);
  }

  /**
   * Gawala statement for a period: opening balance, milk in (live slips) and
   * payments out, and the closing balance. Older balance moves with no
   * record (bank payments before payments were recorded) go into the
   * opening, so the closing on today's date equals what the shop owes.
   */
  async statement(user: AuthenticatedUser, id: string, q: FarmerStatementQuery) {
    const f = await this.prisma.dairyFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Gawala nahi mila');
    const to = q.to ?? dayKey();
    const from = q.from ?? `${to.slice(0, 8)}01`;
    if (from > to) throw new BadRequestException('Period sahi chunein');
    const range = dayRange(from, to)!;
    const before = { lt: range.gte! };
    const after = { gt: range.lte! };
    const slipWhere = { tenantId: user.tenantId, farmerId: f.id, totalAmount: { gt: 0 }, ...LIVE_SLIP };

    const [slips, inBefore, inAfter, paid, paidBefore, paidAfter] = await Promise.all([
      this.prisma.dairyFarmerSupply.findMany({ where: { ...slipWhere, supplyDate: range }, orderBy: [{ supplyDate: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.dairyFarmerSupply.aggregate({ where: { ...slipWhere, supplyDate: before }, _sum: { totalAmount: true } }),
      this.prisma.dairyFarmerSupply.aggregate({ where: { ...slipWhere, supplyDate: after }, _sum: { totalAmount: true } }),
      this.payments(user.tenantId, f, range),
      this.payments(user.tenantId, f, before),
      this.payments(user.tenantId, f, after),
    ]);
    const sum = (list: FarmerPaymentLine[]) => list.reduce((t, p) => t + p.amount, 0);
    const milkIn = r2(slips.reduce((t, s) => t + s.totalAmount, 0));
    const paidOut = r2(sum(paid));
    const recordedBefore = (inBefore._sum.totalAmount ?? 0) - sum(paidBefore);
    const recordedAll = recordedBefore + milkIn - paidOut + (inAfter._sum.totalAmount ?? 0) - sum(paidAfter);
    const unrecorded = r2(f.currentBalance - recordedAll);
    const opening = r2(recordedBefore + unrecorded);

    type Line = { date: Date; kind: 'MILK' | 'PAYMENT'; text: string; quantity: number | null; fat: number | null; rate: number | null; milk: number; paid: number; balance: number };
    const lines: Line[] = [
      ...slips.map((s) => ({
        date: s.supplyDate, kind: 'MILK' as const, text: s.slot === 'EVENING' ? 'Shaam ka doodh' : 'Subah ka doodh',
        quantity: s.quantity, fat: s.fatContent, rate: s.ratePerLiter, milk: s.totalAmount, paid: 0, balance: 0,
      })),
      ...paid.map((p) => ({
        date: p.date, kind: 'PAYMENT' as const,
        text: `Payment — ${p.accountName ?? (p.method === 'CASH' ? 'Galle se cash' : METHOD_LABEL[p.method] ?? p.method)}${p.reference ? ` · ${p.reference}` : ''}`,
        quantity: null, fat: null, rate: null, milk: 0, paid: p.amount, balance: 0,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
    let run = opening;
    for (const l of lines) { run = r2(run + l.milk - l.paid); l.balance = run; }

    return {
      farmer: { id: f.id, name: f.name, farmerNumber: f.farmerNumber, phone: f.phone, village: f.village, ratePerLiter: f.ratePerLiter },
      from, to, opening, unrecorded,
      liters: Math.round(slips.reduce((t, s) => t + s.quantity, 0) * 1000) / 1000,
      milkIn, paidOut, closing: r2(opening + milkIn - paidOut),
      currentBalance: f.currentBalance,
      lines,
    };
  }

  /** Money accounts a gawala can be paid from, for the payment form. */
  async payAccounts(user: AuthenticatedUser, scope: ShopScope) {
    const rows = await this.prisma.moneyAccount.findMany({
      where: payAccountsWhere(user, scope.shopId),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, kind: true, method: true, isDefault: true, shop: { select: { name: true } } },
    });
    return rows.map((a) => ({ id: a.id, name: a.name, kind: a.kind, method: a.method, isDefault: a.isDefault, shopName: a.shop?.name ?? null }));
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateFarmerDto) {
    const f = await this.prisma.dairyFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Gawala nahi mila');
    this.check(dto);
    return this.prisma.dairyFarmer.update({ where: { id }, data: { ...cleanInput(dto), ...(dto.name !== undefined && { name: dto.name.trim() }) } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const f = await this.prisma.dairyFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Gawala nahi mila');
    return this.prisma.dairyFarmer.update({ where: { id }, data: { isActive: false } });
  }

  async recordPayment(user: AuthenticatedUser, scope: ShopScope, id: string, dto: FarmerPaymentDto) {
    const f = await this.prisma.dairyFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Gawala nahi mila');

    const amount = r2(Number(dto?.amount));
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Amount sahi likhein');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dairyFarmer.update({
        where: { id },
        data: {
          currentBalance: { decrement: amount },
          totalPaid: { increment: amount },
          lastPaymentDate: new Date(),
        },
      });
      await payFarmer(tx, user, {
        farmer: f, amount, method: dto.paymentMethod, accountId: dto.accountId, shopId: scope.shopId,
        reference: dto.reference, note: dto.notes,
        reason: `Gawale ko doodh ka payment: ${f.name} (${f.farmerNumber})`,
      });

      /* Settle the oldest collection slips that all payments so far fully
         cover, so the supplies list shows the same picture as the balance.
         The balance already moved above; slips only change flags. */
      const [open, paidSlips] = await Promise.all([
        tx.dairyFarmerSupply.findMany({
          where: { tenantId: user.tenantId, farmerId: id, isPaid: false, totalAmount: { gt: 0 }, ...LIVE_SLIP },
          orderBy: { supplyDate: 'asc' },
          select: { id: true, totalAmount: true },
        }),
        tx.dairyFarmerSupply.aggregate({
          where: { tenantId: user.tenantId, farmerId: id, isPaid: true },
          _sum: { totalAmount: true },
        }),
      ]);
      let left = updated.totalPaid - (paidSlips._sum.totalAmount ?? 0) + 0.01;
      const settled: string[] = [];
      for (const slip of open) {
        if (slip.totalAmount > left) break;
        left -= slip.totalAmount;
        settled.push(slip.id);
      }
      if (settled.length) {
        await tx.dairyFarmerSupply.updateMany({ where: { id: { in: settled } }, data: { isPaid: true, paidAt: new Date() } });
      }
      return updated;
    });
  }

  async summary(user: AuthenticatedUser) {
    const [total, active, aggBalance, aggSupplied] = await Promise.all([
      this.prisma.dairyFarmer.count({ where: { tenantId: user.tenantId } }),
      this.prisma.dairyFarmer.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.dairyFarmer.aggregate({ where: { tenantId: user.tenantId, currentBalance: { gt: 0 } }, _sum: { currentBalance: true } }),
      this.prisma.dairyFarmer.aggregate({ where: { tenantId: user.tenantId }, _sum: { totalSupplied: true, totalPaid: true } }),
    ]);

    return {
      totalFarmers: total,
      activeFarmers: active,
      totalPayable: aggBalance._sum.currentBalance ?? 0,
      lifetimeSupplied: aggSupplied._sum.totalSupplied ?? 0,
      lifetimePaid: aggSupplied._sum.totalPaid ?? 0,
    };
  }
}
