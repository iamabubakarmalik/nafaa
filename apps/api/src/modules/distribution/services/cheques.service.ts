/**
 * Cheque register (PDC). A cheque comes in as a field collection with method
 * CHEQUE (collections.service writes the DistCheque row with it). When the
 * office verifies that collection the khata is credited like bank money.
 * From then on the cheque moves through the register:
 *
 *   RECEIVED → DEPOSITED → CLEARED
 *              ↘ BOUNCED: the khata payment is taken back (ADJUSTMENT with
 *                a note) or, if the collection was never verified, the
 *                collection is rejected instead.
 *
 * A post-dated cheque (chequeDate after receipt) shows as "due" on its date.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { refreshSettlements } from '../../../common/helpers/sale-settlement.helper';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { tidyCustomerBalance } from '../../sales/returns/returns.helpers';
import { CHEQUE_STATUSES } from '../distribution.constants';
import { ChequeActionDto, ListChequesDto } from '../dto/phase2.dto';
import { customerCards, dayRange, dayStart, parseWhen, r2, shiftKey, todayKey, userNames } from '../distribution.support';

@Injectable()
export class ChequesService {
  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  /** The register with totals by status and what falls due today, this week and is already past due. */
  async list(user: AuthenticatedUser, q: ListChequesDto) {
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    const today = todayKey(clock);
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const statuses = (q.status ?? '').split(',').map((s) => s.trim().toUpperCase()).filter((s) => (CHEQUE_STATUSES as readonly string[]).includes(s));
    const where: Prisma.DistChequeWhereInput = {
      tenantId,
      ...(statuses.length && { status: { in: statuses } }),
      ...(q.customerId && { customerId: q.customerId }),
    };
    const open = { in: ['RECEIVED', 'DEPOSITED'] };
    if (q.due === 'today') Object.assign(where, { status: open, chequeDate: { lt: dayStart(shiftKey(today, 1), clock) } });
    if (q.due === 'week') Object.assign(where, { status: open, chequeDate: { lt: dayStart(shiftKey(today, 7), clock) } });
    if (q.due === 'later') Object.assign(where, { status: open, chequeDate: { gte: dayStart(shiftKey(today, 7), clock) } });
    if (q.from || q.to) {
      const r = dayRange(clock, q.from ?? q.to, q.to ?? q.from);
      where.chequeDate = { gte: r.gte, lt: r.lt };
    }
    const search = q.search?.trim();
    if (search) where.OR = [{ chequeNo: { contains: search, mode: 'insensitive' } }, { bankName: { contains: search, mode: 'insensitive' } }];

    const [total, rows, byStatus, dueToday, dueWeek] = await Promise.all([
      this.prisma.distCheque.count({ where }),
      this.prisma.distCheque.findMany({ where, orderBy: [{ chequeDate: 'asc' }, { createdAt: 'asc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.distCheque.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true }, _sum: { amount: true } }),
      this.prisma.distCheque.aggregate({ where: { tenantId, status: open, chequeDate: { lt: dayStart(shiftKey(today, 1), clock) } }, _count: { _all: true }, _sum: { amount: true } }),
      this.prisma.distCheque.aggregate({ where: { tenantId, status: open, chequeDate: { lt: dayStart(shiftKey(today, 7), clock) } }, _count: { _all: true }, _sum: { amount: true } }),
    ]);
    const collections = await this.prisma.distCollection.findMany({
      where: { tenantId, id: { in: rows.map((r) => r.collectionId).filter((x): x is string => !!x) } },
      select: { id: true, status: true, kind: true, saleId: true },
    });
    const cMap = new Map(collections.map((c) => [c.id, c]));
    const [customers, users] = await Promise.all([
      customerCards(this.prisma, tenantId, rows.map((r) => r.customerId)),
      userNames(this.prisma, tenantId, rows.map((r) => r.receivedById)),
    ]);
    const startToday = dayStart(today, clock);
    return {
      today,
      total, page, limit,
      totals: Object.fromEntries(byStatus.map((s) => [s.status, { count: s._count._all, amount: r2(s._sum.amount ?? 0) }])),
      due: {
        today: { count: dueToday._count._all, amount: r2(dueToday._sum.amount ?? 0) },
        week: { count: dueWeek._count._all, amount: r2(dueWeek._sum.amount ?? 0) },
      },
      cheques: rows.map((r) => {
        const col = r.collectionId ? cMap.get(r.collectionId) : null;
        return {
          ...r,
          customer: customers.get(r.customerId) ?? null,
          receivedByName: users.get(r.receivedById) ?? null,
          collectionStatus: col?.status ?? null,
          postDated: r.chequeDate.getTime() > r.receivedAt.getTime() + 86_400_000,
          overdue: (r.status === 'RECEIVED') && r.chequeDate < startToday,
        };
      }),
    };
  }

  private async cheque(tenantId: string, id: string) {
    const c = await this.prisma.distCheque.findFirst({ where: { id, tenantId } });
    if (!c) throw new NotFoundException('Cheque nahi mila');
    return c;
  }

  /** Marks the cheque as given to the bank. */
  async deposit(user: AuthenticatedUser, id: string, dto: ChequeActionDto) {
    const c = await this.cheque(user.tenantId, id);
    if (c.status !== 'RECEIVED') throw new BadRequestException(`Cheque ${c.status} hai — sirf RECEIVED cheque deposit hota hai`);
    if (dto.moneyAccountId) {
      const a = await this.prisma.moneyAccount.findFirst({ where: { id: dto.moneyAccountId, tenantId: user.tenantId }, select: { id: true } });
      if (!a) throw new BadRequestException('Account nahi mila');
    }
    const clock = await this.tz.clock(user.tenantId);
    const at = parseWhen(dto.date, clock) ?? new Date();
    const done = await this.prisma.distCheque.updateMany({
      where: { id, status: 'RECEIVED' },
      data: { status: 'DEPOSITED', depositedAt: at, moneyAccountId: dto.moneyAccountId || null, ...(dto.note && { note: dto.note.trim() }) },
    });
    if (!done.count) throw new BadRequestException('Cheque abhi kisi aur ne badla — dobara dekhein');
    return this.cheque(user.tenantId, id);
  }

  /** The bank paid. */
  async clear(user: AuthenticatedUser, id: string, dto: ChequeActionDto) {
    const c = await this.cheque(user.tenantId, id);
    if (c.status !== 'RECEIVED' && c.status !== 'DEPOSITED') throw new BadRequestException(`Cheque ${c.status} hai`);
    const col = c.collectionId ? await this.prisma.distCollection.findUnique({ where: { id: c.collectionId }, select: { status: true } }) : null;
    if (col && col.status !== 'VERIFIED') throw new BadRequestException('Pehle is cheque ki collection verify karein (Recoveries) — phir clear');
    const clock = await this.tz.clock(user.tenantId);
    const done = await this.prisma.distCheque.updateMany({
      where: { id, status: c.status },
      data: { status: 'CLEARED', clearedAt: parseWhen(dto.date, clock) ?? new Date(), depositedAt: c.depositedAt ?? new Date(), ...(dto.note && { note: dto.note.trim() }) },
    });
    if (!done.count) throw new BadRequestException('Cheque abhi kisi aur ne badla — dobara dekhein');
    return this.cheque(user.tenantId, id);
  }

  /**
   * The cheque bounced. A verified collection's khata payment is taken back
   * with an ADJUSTMENT that names the cheque; an unverified one is rejected.
   */
  async bounce(user: AuthenticatedUser, id: string, dto: ChequeActionDto) {
    const tenantId = user.tenantId;
    const c = await this.cheque(tenantId, id);
    if (c.status !== 'RECEIVED' && c.status !== 'DEPOSITED') throw new BadRequestException(`Cheque ${c.status} hai — bounce nahi ho sakta`);
    const reason = dto.reason?.trim() || 'Bank ne wapas kiya';
    const text = `Cheque bounce: #${c.chequeNo} (${c.bankName}) — ${reason}`;
    await this.prisma.$transaction(async (tx) => {
      const claim = await tx.distCheque.updateMany({ where: { id, status: c.status }, data: { status: 'BOUNCED', bouncedAt: new Date(), bounceReason: reason } });
      if (!claim.count) throw new BadRequestException('Cheque abhi kisi aur ne badla — dobara dekhein');
      const col = c.collectionId ? await tx.distCollection.findUnique({ where: { id: c.collectionId } }) : null;
      if (col?.status === 'PENDING') {
        await tx.distCollection.update({ where: { id: col.id }, data: { status: 'REJECTED', rejectReason: text, verifiedById: user.id, verifiedAt: new Date() } });
        return;
      }
      if (col && col.status !== 'VERIFIED') return;
      const { balance: raw } = await tx.customer.update({ where: { id: c.customerId }, data: { balance: { increment: c.amount } }, select: { balance: true } });
      const balance = await tidyCustomerBalance(tx, c.customerId, raw);
      const ledger = await tx.customerLedger.create({
        data: {
          tenantId, customerId: c.customerId, shopId: col?.shopId ?? null, createdById: user.id,
          type: 'ADJUSTMENT', amount: c.amount, balanceAfter: balance, reference: `Cheque #${c.chequeNo}`, note: text,
        },
        select: { id: true },
      });
      await tx.distCheque.update({ where: { id }, data: { bounceLedgerId: ledger.id } });
    });
    refreshSettlements(this.prisma, tenantId, c.customerId);
    return this.cheque(tenantId, id);
  }

  /** Takes a cheque that was never verified out of the register (written by mistake). */
  async cancel(user: AuthenticatedUser, id: string, dto: ChequeActionDto) {
    const c = await this.cheque(user.tenantId, id);
    if (c.status !== 'RECEIVED') throw new BadRequestException('Sirf RECEIVED cheque cancel hota hai');
    const col = c.collectionId ? await this.prisma.distCollection.findUnique({ where: { id: c.collectionId }, select: { status: true } }) : null;
    if (col?.status === 'VERIFIED') throw new BadRequestException('Is cheque ki payment khate me lag chuki — cancel ki jagah bounce karein');
    await this.prisma.$transaction(async (tx) => {
      await tx.distCheque.update({ where: { id }, data: { status: 'CANCELLED', note: dto.reason?.trim() || dto.note?.trim() || 'Cancel' } });
      if (c.collectionId) {
        await tx.distCollection.updateMany({
          where: { id: c.collectionId, status: 'PENDING' },
          data: { status: 'REJECTED', rejectReason: 'Cheque cancel', verifiedById: user.id, verifiedAt: new Date() },
        });
      }
    });
    return this.cheque(user.tenantId, id);
  }

  /** Open cheques for the dashboard and the AI. */
  async summary(tenantId: string) {
    const clock = await this.tz.clock(tenantId);
    const today = todayKey(clock);
    const [open, due, bounced] = await Promise.all([
      this.prisma.distCheque.aggregate({ where: { tenantId, status: { in: ['RECEIVED', 'DEPOSITED'] } }, _count: { _all: true }, _sum: { amount: true } }),
      this.prisma.distCheque.aggregate({ where: { tenantId, status: 'RECEIVED', chequeDate: { lt: dayStart(shiftKey(today, 1), clock) } }, _count: { _all: true }, _sum: { amount: true } }),
      this.prisma.distCheque.aggregate({ where: { tenantId, status: 'BOUNCED', bouncedAt: { gte: dayStart(`${today.slice(0, 8)}01`, clock) } }, _count: { _all: true }, _sum: { amount: true } }),
    ]);
    const pack = (a: { _count: { _all: number }; _sum: { amount: number | null } }) => ({ count: a._count._all, amount: r2(a._sum.amount ?? 0) });
    return { open: pack(open), dueToDeposit: pack(due), bouncedThisMonth: pack(bounced) };
  }
}
