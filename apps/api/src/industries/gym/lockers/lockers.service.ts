/**
 * Gym lockers. A locker is given to a member for whole months; each rent
 * payment is a bill (GYM-LKR-…) through the shared sale path, so it shows in
 * the day book, drawer and profit. Rent not paid goes on the member's khata.
 * `endDate` is "paid until": a locker past it is due for rent.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GymLocker, Prisma } from '@prisma/client';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { postIndustrySale, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { DAY_MS, LOCKER_SALE, assertCan, gymClock, lockerRef, nextNumber, opt, r2, type GymClock } from '../common/gym-common';
import { AssignLockerDto, CreateLockerDto, LockerRentDto, ReleaseLockerDto, UpdateLockerDto } from './dto/locker.dto';

const P = PERMISSIONS;
type Db = Prisma.TransactionClient;
export type LockerView = 'all' | 'free' | 'occupied' | 'due' | 'maintenance';
const VIEWS: LockerView[] = ['all', 'free', 'occupied', 'due', 'maintenance'];

@Injectable()
export class LockersService {
  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  private viewWhere(view: LockerView, now: Date): Prisma.GymLockerWhereInput {
    switch (view) {
      case 'free': return { status: 'FREE' };
      case 'occupied': return { status: 'OCCUPIED' };
      case 'due': return { status: 'OCCUPIED', OR: [{ endDate: null }, { endDate: { lt: now } }] };
      case 'maintenance': return { status: 'MAINTENANCE' };
      default: return {};
    }
  }

  async list(user: AuthenticatedUser, params: { view?: string; search?: string; memberId?: string }) {
    const tenantId = user.tenantId;
    const now = new Date();
    const q = params.search?.trim();
    const matched = q
      ? await this.prisma.customer.findMany({ where: { tenantId, OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] }, select: { id: true }, take: 500 })
      : [];
    const memberIds = q ? (await this.prisma.gymMember.findMany({ where: { tenantId, customerId: { in: matched.map((c) => c.id) } }, select: { id: true } })).map((m) => m.id) : [];
    const base: Prisma.GymLockerWhereInput = {
      tenantId,
      ...(params.memberId && { memberId: params.memberId }),
      ...(q && { OR: [{ number: { contains: q, mode: 'insensitive' } }, { memberId: { in: memberIds } }] }),
    };
    const view: LockerView = VIEWS.includes(params.view as LockerView) ? (params.view as LockerView) : 'all';
    const rows = await this.prisma.gymLocker.findMany({ where: { AND: [base, this.viewWhere(view, now)] }, take: 500 });
    rows.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
    const counts = Object.fromEntries(await Promise.all(VIEWS.map(async (v) => [v, await this.prisma.gymLocker.count({ where: { AND: [base, this.viewWhere(v, now)] } })] as const)));
    const occupied = await this.prisma.gymLocker.aggregate({ where: { AND: [base, { status: 'OCCUPIED' }] }, _sum: { monthlyRent: true } });
    return { items: await this.decorate(tenantId, rows, now), counts, totals: { monthlyRent: r2(occupied._sum.monthlyRent ?? 0) } };
  }

  private async decorate(tenantId: string, rows: GymLocker[], now: Date) {
    const members = await this.prisma.gymMember.findMany({ where: { tenantId, id: { in: rows.map((r) => r.memberId).filter((x): x is string => !!x) } }, select: { id: true, memberNumber: true, customerId: true } });
    const people = await this.prisma.customer.findMany({ where: { tenantId, id: { in: members.map((m) => m.customerId) } }, select: { id: true, name: true, phone: true, balance: true } });
    const personOf = new Map(people.map((c) => [c.id, c]));
    const memberOf = new Map(members.map((m) => [m.id, { id: m.id, memberNumber: m.memberNumber, customerId: m.customerId, customer: personOf.get(m.customerId) ?? null }]));
    return rows.map((r) => {
      const due = r.status === 'OCCUPIED' && (!r.endDate || r.endDate < now);
      const daysLeft = r.status === 'OCCUPIED' && r.endDate ? Math.ceil((r.endDate.getTime() - now.getTime()) / DAY_MS) : null;
      return { ...r, member: r.memberId ? memberOf.get(r.memberId) ?? null : null, due, daysLeft };
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const row = await this.find(this.prisma, user.tenantId, id);
    const [item] = await this.decorate(user.tenantId, [row], new Date());
    const bills = await this.prisma.sale.findMany({
      where: { tenantId: user.tenantId, saleNumber: { startsWith: LOCKER_SALE }, sourceRef: lockerRef(row.number) },
      select: { id: true, saleNumber: true, total: true, paidAmount: true, creditAmount: true, status: true, paymentMethod: true, customerId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { ...item, bills };
  }

  private async find(db: Db | PrismaService, tenantId: string, id: string) {
    const row = await db.gymLocker.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Locker nahi mila');
    return row;
  }

  /** One locker, or `count` lockers numbered on from a numeric start. */
  async create(user: AuthenticatedUser, dto: CreateLockerDto) {
    const tenantId = user.tenantId;
    const first = dto.number.trim();
    const count = dto.count ?? 1;
    if (count > 1 && !/^\d+$/.test(first)) throw new BadRequestException('Kai lockers ek saath banane ke liye number sirf hindsa ho (jaise 1)');
    const numbers = count > 1 ? Array.from({ length: count }, (_, i) => String(Number(first) + i)) : [first];
    const taken = await this.prisma.gymLocker.findMany({ where: { tenantId, number: { in: numbers } }, select: { number: true } });
    if (taken.length) throw new BadRequestException(`Locker ${taken.map((t) => t.number).join(', ')} pehle se hai`);
    const shopId = await resolveIndustryShopId(this.prisma as unknown as Db, user, null);
    await this.prisma.gymLocker.createMany({
      data: numbers.map((number) => ({ tenantId, shopId, number, monthlyRent: r2(dto.monthlyRent), notes: opt(dto.notes) })),
    });
    return { created: numbers.length, numbers };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateLockerDto) {
    const row = await this.find(this.prisma, user.tenantId, id);
    if (dto.status && row.status === 'OCCUPIED') throw new BadRequestException('Pehle locker khali karein');
    return this.prisma.gymLocker.update({
      where: { id },
      data: {
        ...(dto.monthlyRent !== undefined && { monthlyRent: r2(dto.monthlyRent) }),
        ...(dto.notes !== undefined && { notes: opt(dto.notes) ?? null }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  /** Gives a free locker to a member and bills the first months. */
  async assign(user: AuthenticatedUser, id: string, dto: AssignLockerDto) {
    assertCan(user, [P.POS_USE], 'Locker rent ka bill banane');
    const tenantId = user.tenantId;
    const member = await this.prisma.gymMember.findFirst({ where: { id: dto.memberId, tenantId, isActive: true } });
    if (!member) throw new NotFoundException('Member nahi mila');
    if (member.status === 'BANNED') throw new BadRequestException('Ye member banned hai');
    const clock = await gymClock(this.tz, tenantId);
    const start = clock.dayStart(dto.startDate);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "GymLocker" WHERE id = ${id} FOR UPDATE`;
      const row = await this.find(tx, tenantId, id);
      if (row.status === 'OCCUPIED') throw new BadRequestException(`Locker ${row.number} pehle se kisi ke paas hai`);
      if (row.status === 'MAINTENANCE') throw new BadRequestException(`Locker ${row.number} repair me hai`);
      const rent = dto.monthlyRent !== undefined ? r2(dto.monthlyRent) : row.monthlyRent;
      await this.bill(tx, user, clock, { ...row, monthlyRent: rent }, member, start, dto);
      return tx.gymLocker.update({
        where: { id },
        data: { memberId: member.id, status: 'OCCUPIED', monthlyRent: rent, startDate: start, endDate: clock.monthsEnd(start, dto.months) },
      });
    });
  }

  /** Rent for more months: the period runs on from "paid until", or from today if it lapsed long ago. */
  async rent(user: AuthenticatedUser, id: string, dto: LockerRentDto) {
    assertCan(user, [P.POS_USE], 'Locker rent ka bill banane');
    const clock = await gymClock(this.tz, user.tenantId);
    return this.prisma.$transaction((tx) => this.extend(tx, user, clock, id, dto));
  }

  private async extend(tx: Db, user: AuthenticatedUser, clock: GymClock, id: string, dto: LockerRentDto) {
    const tenantId = user.tenantId;
    await tx.$queryRaw`SELECT id FROM "GymLocker" WHERE id = ${id} FOR UPDATE`;
    const row = await this.find(tx, tenantId, id);
    if (row.status !== 'OCCUPIED' || !row.memberId) throw new BadRequestException(`Locker ${row.number} kisi member ke paas nahi`);
    const member = await tx.gymMember.findFirst({ where: { id: row.memberId, tenantId } });
    if (!member) throw new NotFoundException('Member nahi mila');
    // Unpaid months stay owed: the next period starts right after "paid until".
    const from = row.endDate ? new Date(row.endDate.getTime() + 1) : clock.dayStart();
    await this.bill(tx, user, clock, row, member, from, dto);
    return tx.gymLocker.update({ where: { id }, data: { endDate: clock.monthsEnd(from, dto.months) } });
  }

  /**
   * Month-end billing: every occupied locker whose rent period is over gets
   * one month's bill on the member's khata (no money taken). A locker
   * still behind after that month is billed again on the next run.
   */
  async billDue(user: AuthenticatedUser) {
    assertCan(user, [P.POS_USE], 'Locker rent ka bill banane');
    const clock = await gymClock(this.tz, user.tenantId);
    const due = await this.prisma.gymLocker.findMany({
      where: { tenantId: user.tenantId, status: 'OCCUPIED', memberId: { not: null }, endDate: { lt: new Date() } },
      select: { id: true, number: true },
    });
    const billed: string[] = [];
    for (const l of due) {
      await this.prisma.$transaction((tx) => this.extend(tx, user, clock, l.id, { months: 1, paidAmount: 0 }));
      billed.push(l.number);
    }
    return { billed: billed.length, lockers: billed };
  }

  /** Member gave the locker back. Rent already billed stays (unpaid rent stays on khata). */
  async release(user: AuthenticatedUser, id: string, dto: ReleaseLockerDto) {
    const row = await this.find(this.prisma, user.tenantId, id);
    if (row.status !== 'OCCUPIED') throw new BadRequestException('Locker pehle hi khali hai');
    const note = opt(dto.reason);
    return this.prisma.gymLocker.update({
      where: { id },
      data: { memberId: null, status: 'FREE', startDate: null, endDate: null, ...(note && { notes: note }) },
    });
  }

  private async bill(
    tx: Db, user: AuthenticatedUser, clock: GymClock,
    locker: Pick<GymLocker, 'number' | 'monthlyRent' | 'shopId'>,
    member: { id: string; customerId: string; shopId: string | null },
    from: Date, dto: LockerRentDto,
  ) {
    const amount = r2(locker.monthlyRent * dto.months);
    if (amount <= 0) return null;
    const paid = r2(Math.max(Number(dto.paidAmount) || 0, 0));
    if (paid > amount + 0.01) throw new BadRequestException(`Rent sirf Rs ${amount} hai`);
    const prefix = `${LOCKER_SALE}${clock.year()}-`;
    const saleNumber = await nextNumber(tx, user.tenantId, prefix, async () => (await tx.sale.findFirst({
      where: { tenantId: user.tenantId, saleNumber: { startsWith: prefix } }, orderBy: { saleNumber: 'desc' }, select: { saleNumber: true },
    }))?.saleNumber);
    const to = clock.monthsEnd(from, dto.months);
    const sale = await postIndustrySale(tx, user, {
      saleNumber,
      sourceRef: lockerRef(locker.number),
      shopId: locker.shopId ?? member.shopId,
      customerId: member.customerId,
      lines: [{ label: `Locker ${locker.number} rent ${clock.keyOf(from)} se ${clock.keyOf(to)}`, amount, quantity: dto.months }],
      paidAmount: paid,
      paymentMethod: dto.paymentMethod,
    });
    await tx.gymMember.update({ where: { id: member.id }, data: { totalSpent: { increment: amount } } });
    return sale;
  }

  /**
   * A rent bill was voided or returned in full: "paid until" moves back by
   * the months on it, if the locker is still with the same member.
   */
  async rentBack(tenantId: string, sale: { id: string; sourceRef: string | null; customerId: string | null }) {
    const number = sale.sourceRef?.startsWith('Locker ') ? sale.sourceRef.slice('Locker '.length) : null;
    if (!number) return null;
    const clock = await gymClock(this.tz, tenantId);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.gymLocker.findFirst({ where: { tenantId, number } });
      if (!row?.memberId || !row.endDate || row.status !== 'OCCUPIED') return null;
      const member = await tx.gymMember.findFirst({ where: { id: row.memberId, tenantId }, select: { customerId: true } });
      if (!member || member.customerId !== sale.customerId) return null;
      const items = await tx.saleItem.aggregate({ where: { saleId: sale.id }, _sum: { quantity: true } });
      const months = Math.round(Number(items._sum.quantity) || 0);
      if (months <= 0) return null;
      const back = clock.monthsEnd(new Date(row.endDate.getTime() + 1), -months);
      const floor = row.startDate ? new Date(row.startDate.getTime() - 1) : back;
      return tx.gymLocker.update({ where: { id: row.id }, data: { endDate: back < floor ? floor : back } });
    });
  }
}
