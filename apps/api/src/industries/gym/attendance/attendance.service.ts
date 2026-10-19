import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GymAttendanceMethod, Prisma } from '@prisma/client';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { DAY_MS, assertCan, gymClock, opt, paging, r2 } from '../common/gym-common';
import { MembershipsService } from '../memberships/memberships.service';
import { CheckInDto } from './dto/check-in.dto';

const P = PERMISSIONS;

/** A visit still open after this long is treated as forgotten, not "inside". */
const INSIDE_WINDOW_MS = 16 * 3_600_000;

/** Why the desk is stopped, so the screen can offer renew or let in anyway. */
export type CheckInBlock = 'NO_MEMBERSHIP' | 'EXPIRED' | 'VISITS_USED' | 'NOT_STARTED' | 'FROZEN' | 'MEMBER_INACTIVE';

const BLOCK_MESSAGES: Record<CheckInBlock, string> = {
  NO_MEMBERSHIP: 'Is member ki koi membership nahi — pehle plan bechein',
  EXPIRED: 'Membership khatam ho chuki hai — renew karein',
  VISITS_USED: 'Is membership ki visits khatam ho chuki hain — renew karein',
  NOT_STARTED: 'Membership abhi shuru nahi hui',
  FROZEN: 'Membership freeze hai — pehle unfreeze karein',
  MEMBER_INACTIVE: 'Ye member active nahi',
};

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly memberships: MembershipsService,
  ) {}

  /** Finds the member from a scan: member number, card, QR, biometric id or phone. */
  private async identify(tenantId: string, dto: CheckInDto) {
    if (dto.memberId) return this.prisma.gymMember.findFirst({ where: { id: dto.memberId, tenantId } });
    const code = opt(dto.code) ?? opt(dto.qrCode) ?? opt(dto.rfidCard) ?? opt(dto.biometricId);
    if (!code) return null;
    const direct = await this.prisma.gymMember.findFirst({
      where: { tenantId, OR: [{ qrCode: code }, { rfidCard: code }, { biometricId: code }, { memberNumber: { equals: code, mode: 'insensitive' } }] },
    });
    if (direct) return direct;
    const byPhone = await this.prisma.customer.findFirst({ where: { tenantId, phone: code }, select: { id: true } });
    return byPhone ? this.prisma.gymMember.findFirst({ where: { tenantId, customerId: byPhone.id } }) : null;
  }

  /**
   * Checks a member in. An expired, used-up or frozen card stops the desk
   * with a reason; the desk may still let the member in with a note
   * (`allowExpired`), which is kept on the visit. Dues and a card ending
   * soon come back as warnings.
   */
  async checkIn(user: AuthenticatedUser, dto: CheckInDto) {
    const tenantId = user.tenantId;
    const now = new Date();

    let member = dto.isGuest && !dto.memberId && !dto.code && !dto.qrCode && !dto.rfidCard ? null : await this.identify(tenantId, dto);
    if (dto.isGuest) {
      // A guest visit is logged against the member who brought the guest.
      if (!opt(dto.guestName)) throw new BadRequestException('Mehmaan ka naam likhein');
      const inviterId = dto.invitedByMemberId ?? member?.id;
      if (!inviterId) throw new BadRequestException('Guest ke liye bulane wala member chunein');
      member = await this.prisma.gymMember.findFirst({ where: { id: inviterId, tenantId } });
    }
    if (!member) throw new NotFoundException('Member nahi mila — number, card ya phone dobara check karein');
    const customer = await this.prisma.customer.findFirst({ where: { id: member.customerId, tenantId }, select: { id: true, name: true, phone: true, balance: true } });

    if (!dto.isGuest) {
      const inside = await this.prisma.gymAttendance.findFirst({
        where: { tenantId, memberId: member.id, isGuest: false, checkOutAt: null, checkInAt: { gte: new Date(now.getTime() - INSIDE_WINDOW_MS) } },
        select: { id: true, checkInAt: true },
      });
      if (inside) throw new BadRequestException(`${customer?.name ?? 'Member'} pehle se andar hai — pehle check-out karein`);
    }

    const { running, block, message, due } = await this.assess(tenantId, member, !!dto.isGuest, now);
    if (dto.isGuest && running) {
      const used = await this.prisma.gymAttendance.count({ where: { tenantId, membershipId: running.id, isGuest: true } });
      if (running.plan.includesGuestPasses > 0 && used >= running.plan.includesGuestPasses && !dto.allowExpired) {
        throw new BadRequestException(`Is plan ke ${running.plan.includesGuestPasses} mehmaan pass istemal ho chuke`);
      }
    }
    // A member who left or is banned is never let in from the desk; the profile is made active first.
    if (block && (block === 'MEMBER_INACTIVE' || !(dto.allowExpired && opt(dto.notes)))) {
      throw new BadRequestException({ message: message!, error: `GYM_${block}` });
    }
    if (block) assertCan(user, [P.CUSTOMERS_EDIT], 'Bina chalti membership andar jane dene');
    const clock = await gymClock(this.tz, tenantId);

    const attendance = await this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, member!.shopId);
      const visit = await tx.gymAttendance.create({
        data: {
          tenantId,
          shopId,
          memberId: member!.id,
          method: dto.method ?? 'MANUAL',
          entryPoint: opt(dto.entryPoint),
          isGuest: dto.isGuest ?? false,
          guestName: opt(dto.guestName),
          guestPhone: opt(dto.guestPhone),
          invitedByMemberId: dto.isGuest ? member!.id : null,
          membershipId: running?.id,
          checkedInById: user.id,
          notes: block ? `Bina membership andar: ${opt(dto.notes)}` : opt(dto.notes),
        },
      });
      if (!dto.isGuest) {
        // Streak counts business days in a row.
        const last = member!.lastVisitAt ? clock.keyOf(member!.lastVisitAt) : null;
        const today = clock.keyOf(now);
        const yesterday = clock.keyOf(new Date(now.getTime() - DAY_MS));
        const streak = last === today ? member!.currentStreak : last === yesterday ? member!.currentStreak + 1 : 1;
        await tx.gymMember.update({
          where: { id: member!.id },
          data: { totalVisits: { increment: 1 }, lastVisitAt: now, currentStreak: streak, longestStreak: Math.max(member!.longestStreak, streak) },
        });
        if (running) {
          await tx.gymMemberMembership.update({
            where: { id: running.id },
            data: { visitsUsed: { increment: 1 }, ...(running.visitsRemaining !== null && { visitsRemaining: Math.max(running.visitsRemaining - 1, 0) }) },
          });
        }
      }
      return visit;
    });

    const used = dto.isGuest ? 0 : 1;
    return {
      ...attendance,
      member: { ...member, customer },
      membership: running ? { id: running.id, membershipNumber: running.membershipNumber, planName: running.plan.name, endDate: running.endDate, visitsRemaining: running.visitsRemaining !== null ? Math.max(running.visitsRemaining - used, 0) : null } : null,
      due,
      warnings: this.warnings(running, due, block ? message : null, now, used),
    };
  }

  /** What the desk sees after a scan, before letting the member in. */
  async lookup(user: AuthenticatedUser, code: string) {
    const tenantId = user.tenantId;
    const member = await this.identify(tenantId, { code });
    if (!member) throw new NotFoundException('Member nahi mila — number, card ya phone dobara check karein');
    const now = new Date();
    const customer = await this.prisma.customer.findFirst({ where: { id: member.customerId, tenantId }, select: { id: true, name: true, phone: true, balance: true } });
    const { running, latest, block, message, due } = await this.assess(tenantId, member, false, now);
    const inside = await this.prisma.gymAttendance.findFirst({
      where: { tenantId, memberId: member.id, isGuest: false, checkOutAt: null, checkInAt: { gte: new Date(now.getTime() - INSIDE_WINDOW_MS) } },
      select: { id: true, checkInAt: true },
    });
    return {
      member: { ...member, customer },
      membership: running ?? latest,
      block,
      message,
      due,
      inside,
      warnings: this.warnings(running, due, null, now, 0),
    };
  }

  private warnings(running: { endDate: Date; visitsRemaining: number | null } | null, due: number, blocked: string | null, now: Date, used: number) {
    const out: string[] = [];
    if (blocked) out.push(blocked);
    if (due > 0) out.push(`Rs ${due} fee baqi hai`);
    if (running) {
      const daysLeft = Math.ceil((running.endDate.getTime() - now.getTime()) / DAY_MS);
      if (daysLeft <= 3) out.push(daysLeft <= 1 ? 'Membership aaj khatam ho rahi hai' : `Membership ${daysLeft} din me khatam`);
      if (running.visitsRemaining !== null && running.visitsRemaining - used <= 2) out.push(`Sirf ${Math.max(running.visitsRemaining - used, 0)} visits baqi`);
    }
    return out;
  }

  /** The member's running card (lifting finished freezes), why entry would be stopped, and fees due. */
  private async assess(tenantId: string, member: { id: string; isActive: boolean; status: string }, isGuest: boolean, now: Date) {
    const thaw = await this.prisma.gymMemberMembership.findMany({ where: { tenantId, memberId: member.id, status: 'FROZEN', frozenUntil: { lt: now } } });
    for (const t of thaw) await this.prisma.gymMemberMembership.update({ where: { id: t.id }, data: this.memberships.unfreezePatch(t, now) });

    const running = await this.prisma.gymMemberMembership.findFirst({
      where: {
        tenantId, memberId: member.id, status: 'ACTIVE', startDate: { lte: now }, endDate: { gte: now },
        ...(!isGuest && { OR: [{ visitsRemaining: null }, { visitsRemaining: { gt: 0 } }] }),
      },
      include: { plan: { select: { name: true, includesGuestPasses: true } } },
      orderBy: { endDate: 'asc' },
    });
    const latest = running ? null : await this.prisma.gymMemberMembership.findFirst({
      where: { tenantId, memberId: member.id, status: { not: 'CANCELLED' } },
      include: { plan: { select: { name: true, includesGuestPasses: true } } },
      orderBy: { endDate: 'desc' },
    });
    let block: CheckInBlock | null = null;
    if (!member.isActive || member.status !== 'ACTIVE') block = 'MEMBER_INACTIVE';
    else if (!running) {
      if (!latest) block = 'NO_MEMBERSHIP';
      else if (latest.status === 'FROZEN') block = 'FROZEN';
      else if (latest.startDate > now && latest.status === 'ACTIVE') block = 'NOT_STARTED';
      else if (latest.endDate >= now && latest.visitsRemaining !== null && latest.visitsRemaining <= 0) block = 'VISITS_USED';
      else block = 'EXPIRED';
    }
    const agg = await this.prisma.gymMemberMembership.aggregate({ where: { tenantId, memberId: member.id, status: { not: 'CANCELLED' }, balanceDue: { gt: 0 } }, _sum: { balanceDue: true } });
    return { running, latest, block, message: block ? BLOCK_MESSAGES[block] : null, due: r2(agg._sum.balanceDue ?? 0) };
  }

  async checkOut(user: AuthenticatedUser, attendanceId: string) {
    const a = await this.prisma.gymAttendance.findFirst({ where: { id: attendanceId, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Visit nahi mili');
    if (a.checkOutAt) throw new BadRequestException('Ye member pehle hi check-out ho chuka');
    const checkOutAt = new Date();
    return this.prisma.gymAttendance.update({
      where: { id: attendanceId },
      data: { checkOutAt, durationMinutes: Math.round((checkOutAt.getTime() - a.checkInAt.getTime()) / 60000) },
    });
  }

  /** Day close: everyone still marked inside is checked out now. */
  async checkOutAll(user: AuthenticatedUser) {
    const now = new Date();
    const open = await this.prisma.gymAttendance.findMany({ where: { tenantId: user.tenantId, checkOutAt: null }, select: { id: true, checkInAt: true } });
    for (const a of open) {
      // Visits left open from earlier days are closed two hours after check-in, not "now".
      const stale = now.getTime() - a.checkInAt.getTime() > INSIDE_WINDOW_MS;
      const out = stale ? new Date(a.checkInAt.getTime() + 2 * 3_600_000) : now;
      await this.prisma.gymAttendance.update({ where: { id: a.id }, data: { checkOutAt: out, durationMinutes: Math.round((out.getTime() - a.checkInAt.getTime()) / 60000) } });
    }
    return { count: open.length };
  }

  /**
   * Visits with the member's name. Accepts business-day keys (`yyyy-mm-dd`)
   * or ISO times for from/to. Without `page` the plain array.
   */
  async list(user: AuthenticatedUser, params: { memberId?: string; from?: string; to?: string; isGuest?: boolean; search?: string; method?: string; page?: string; limit?: string }) {
    const tenantId = user.tenantId;
    const clock = await gymClock(this.tz, tenantId);
    const keyRange = clock.range(params.from, params.to);
    const q = params.search?.trim();
    const matched = q
      ? await this.prisma.customer.findMany({ where: { tenantId, OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] }, select: { id: true }, take: 500 })
      : [];
    const where: Prisma.GymAttendanceWhereInput = {
      tenantId,
      ...(params.memberId && { memberId: params.memberId }),
      ...(params.isGuest !== undefined && { isGuest: params.isGuest }),
      ...(params.method && { method: params.method as GymAttendanceMethod }),
      ...(keyRange
        ? { checkInAt: { gte: keyRange.gte, lt: keyRange.lt } }
        : params.from || params.to
          ? { checkInAt: { ...(params.from && { gte: new Date(params.from) }), ...(params.to && { lte: new Date(params.to) }) } }
          : {}),
      ...(q && { OR: [{ member: { customerId: { in: matched.map((c) => c.id) } } }, { member: { memberNumber: { contains: q, mode: 'insensitive' } } }, { guestName: { contains: q, mode: 'insensitive' } }] }),
    };
    const paged = params.page !== undefined;
    const { page, limit, skip } = paging(params.page, params.limit, 200);
    const rows = await this.prisma.gymAttendance.findMany({
      where,
      include: { member: true },
      orderBy: { checkInAt: 'desc' },
      skip: paged ? skip : 0,
      take: paged ? limit : 500,
    });
    const items = await this.withCustomers(tenantId, rows);
    if (!paged) return items;
    const total = await this.prisma.gymAttendance.count({ where });
    return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  private async withCustomers<T extends { member: { customerId: string } }>(tenantId: string, rows: T[]) {
    const people = await this.prisma.customer.findMany({ where: { tenantId, id: { in: [...new Set(rows.map((r) => r.member.customerId))] } }, select: { id: true, name: true, phone: true } });
    const byId = new Map(people.map((c) => [c.id, c]));
    return rows.map((r) => ({ ...r, member: { ...r.member, customer: byId.get(r.member.customerId) ?? null } }));
  }

  async currentlyInside(user: AuthenticatedUser) {
    const rows = await this.prisma.gymAttendance.findMany({
      where: { tenantId: user.tenantId, checkOutAt: null, checkInAt: { gte: new Date(Date.now() - INSIDE_WINDOW_MS) } },
      include: { member: true },
      orderBy: { checkInAt: 'desc' },
    });
    return this.withCustomers(user.tenantId, rows);
  }

  /** Visits per business day (and per hour for a single day) for the attendance charts. */
  async dailyStats(user: AuthenticatedUser, from?: string, to?: string) {
    const clock = await gymClock(this.tz, user.tenantId);
    const range = clock.range(from, to) ?? clock.range(clock.todayKey(new Date(Date.now() - 29 * DAY_MS)), clock.todayKey())!;
    const rows = await this.prisma.gymAttendance.findMany({
      where: { tenantId: user.tenantId, checkInAt: { gte: range.gte, lt: range.lt } },
      select: { checkInAt: true, isGuest: true, method: true, memberId: true, durationMinutes: true },
      take: 50_000,
    });
    const byDay = new Map<string, number>();
    const byHour = Array.from({ length: 24 }, () => 0);
    const byMethod = new Map<string, number>();
    let guests = 0;
    let minutes = 0;
    let timed = 0;
    for (const r of rows) {
      const key = clock.keyOf(r.checkInAt);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
      byHour[clock.hour(r.checkInAt)] += 1;
      byMethod.set(r.method, (byMethod.get(r.method) ?? 0) + 1);
      if (r.isGuest) guests += 1;
      if (r.durationMinutes) { minutes += r.durationMinutes; timed += 1; }
    }
    return {
      total: rows.length,
      members: new Set(rows.filter((r) => !r.isGuest).map((r) => r.memberId)).size,
      guests,
      avgMinutes: timed ? Math.round(minutes / timed) : null,
      byDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count })),
      byHour: byHour.map((count, hour) => ({ hour, count })),
      byMethod: [...byMethod.entries()].map(([method, count]) => ({ method, count })),
    };
  }
}
