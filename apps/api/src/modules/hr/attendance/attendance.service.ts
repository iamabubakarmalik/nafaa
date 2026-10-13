/**
 * Staff attendance for every industry: today's board, check-in and
 * check-out, owner/manager corrections with a logged reason, the monthly
 * sheet that payroll reads, and leave requests.
 *
 * Days are business days in the shop's own timezone. Late minutes count from
 * the shop's opening time (Settings → Business hours) and overtime from each
 * person's daily hours, so both are measured again on every read and old
 * rows written with the server's UTC clock show the right numbers.
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Attendance, AttendanceStatus, LeaveType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope, assertShopAccess } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey, zonedToUtc } from '../../../common/helpers/business-time.helper';
import {
  CorrectAttendanceDto, CreateLeaveRequestDto, DecideLeaveDto, LeaveQueryDto, PunchDto, SheetQueryDto,
} from './dto/attendance.dto';

/** Minutes after opening time that still count as on time. */
const GRACE_MINUTES = 10;
/** Used when the shop has not set an opening time. */
const DEFAULT_OPEN = '09:00';
/** Longest sheet in one request. */
const MAX_DAYS = 62;
/** A check-out this long after check-in closes the previous day's record. */
const OVERNIGHT_HOURS = 20;
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MANAGERS = ['OWNER', 'MANAGER', 'SUPER_ADMIN'];

/**
 * One day of one person.
 * P present · L late · H half day · A absent · LV leave · HO holiday ·
 * OFF weekly off · NONE nothing marked · NA before joining or after leaving · FUT future.
 */
export type DayCode = 'P' | 'L' | 'H' | 'A' | 'LV' | 'HO' | 'OFF' | 'NONE' | 'NA' | 'FUT';

export interface DayCell {
  code: DayCode;
  id?: string;
  in?: string | null;
  out?: string | null;
  late: number;
  worked: number;
  ot: number;
  leaveType?: LeaveType;
  unpaid?: boolean;
  note?: string | null;
}

export interface ShopClock {
  tz: string;
  dayStartHour: number;
  openTime: string;
  openTimeSet: boolean;
  closeTime: string | null;
  workingDays: string[];
  graceMinutes: number;
}

export interface Totals {
  present: number; late: number; halfDay: number; absent: number; missing: number;
  leave: number; unpaidLeave: number; holiday: number; off: number;
  daysWorked: number; workingDays: number; workedHours: number; overtimeHours: number; lateMinutes: number;
}

type StaffRow = Prisma.StaffGetPayload<{ select: typeof STAFF_SELECT }>;
type LeaveRow = { id: string; staffId: string; type: LeaveType; startDate: Date; endDate: Date; status: string };

const STAFF_SELECT = {
  id: true, staffNumber: true, fullName: true, designation: true, avatarUrl: true, status: true,
  joinDate: true, endDate: true, workingHoursPerDay: true, userId: true,
  shop: { select: { id: true, name: true } },
} satisfies Prisma.StaffSelect;

const round2 = (n: number) => Math.round(n * 100) / 100;
const dateOf = (key: string) => new Date(`${key}T00:00:00.000Z`);
const keyOf = (d: Date) => d.toISOString().slice(0, 10);
const addKey = (key: string, days: number) => keyOf(new Date(dateOf(key).getTime() + days * 86_400_000));
const weekdayOf = (key: string) => WEEKDAYS[new Date(`${key}T12:00:00Z`).getUTCDay()];

function keysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = from; k <= to && out.length <= MAX_DAYS; k = addKey(k, 1)) out.push(k);
  return out;
}

function emptyTotals(): Totals {
  return {
    present: 0, late: 0, halfDay: 0, absent: 0, missing: 0, leave: 0, unpaidLeave: 0, holiday: 0, off: 0,
    daysWorked: 0, workingDays: 0, workedHours: 0, overtimeHours: 0, lateMinutes: 0,
  };
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /* ───── clock ───── */

  async shopClock(tenantId: string): Promise<ShopClock> {
    const [clock, s] = await Promise.all([
      this.tz.clock(tenantId),
      this.prisma.tenantSettings.findUnique({ where: { tenantId }, select: { openTime: true, closeTime: true, workingDays: true } }),
    ]);
    const valid = (t?: string | null) => !!t && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
    return {
      tz: clock.tz,
      dayStartHour: clock.dayStartHour,
      openTime: valid(s?.openTime) ? s!.openTime! : DEFAULT_OPEN,
      openTimeSet: valid(s?.openTime),
      closeTime: valid(s?.closeTime) ? s!.closeTime! : null,
      workingDays: s?.workingDays?.length ? s.workingDays.map((d) => d.toLowerCase().slice(0, 3)) : WEEKDAYS.slice(1),
      graceMinutes: GRACE_MINUTES,
    };
  }

  /** A local HH:mm on a business day, as a UTC instant. */
  private at(key: string, hhmm: string, clock: ShopClock): Date {
    const [y, m, d] = key.split('-').map(Number);
    const [h, mi] = hhmm.split(':').map(Number);
    return zonedToUtc(y, m, d, h, mi, 0, clock.tz);
  }

  /** Late minutes, hours worked and overtime of one record. */
  private measure(key: string, checkIn: Date | null, checkOut: Date | null, clock: ShopClock, hoursPerDay: number) {
    let late = 0;
    if (checkIn) {
      const mins = Math.floor((checkIn.getTime() - this.at(key, clock.openTime, clock).getTime()) / 60_000);
      late = mins > clock.graceMinutes ? mins : 0;
    }
    const worked = checkIn && checkOut ? Math.max(0, (checkOut.getTime() - checkIn.getTime()) / 3_600_000) : 0;
    const ot = worked > hoursPerDay ? worked - hoursPerDay : 0;
    return { late, worked: round2(worked), ot: round2(ot) };
  }

  private today(clock: ShopClock) {
    return businessDayKey(new Date(), clock.tz, clock.dayStartHour);
  }

  /* ───── who is in view ───── */

  /** Branch narrowing: the branch in view (with unassigned staff), or the owner's pick on the all-branches view. */
  private branchFilter(scope: ShopScope, shopId?: string): Prisma.StaffWhereInput {
    if (scope.shopId) return scope.whereLoose as Prisma.StaffWhereInput;
    return shopId ? { shopId } : {};
  }

  private staffInView(user: AuthenticatedUser, scope: ShopScope, q: SheetQueryDto, from: string, to: string) {
    return this.prisma.staff.findMany({
      where: {
        tenantId: user.tenantId,
        ...(q.staffId ? { id: q.staffId } : {}),
        AND: [
          this.branchFilter(scope, q.shopId),
          { OR: [{ status: { in: ['ACTIVE', 'ON_LEAVE'] } }, { attendances: { some: { date: { gte: dateOf(from), lte: dateOf(to) } } } }] },
        ],
      },
      select: STAFF_SELECT,
      orderBy: [{ fullName: 'asc' }],
    });
  }

  private async loadStaff(user: AuthenticatedUser, staffId: string) {
    const staff = await this.prisma.staff.findFirst({ where: { id: staffId, tenantId: user.tenantId }, select: STAFF_SELECT });
    if (!staff) throw new NotFoundException('Staff nahi mila');
    if (staff.shop) assertShopAccess(user, staff.shop.id, 'Hazri lagana');
    return staff;
  }

  /* ───── one day's cell ───── */

  private cell(
    key: string, today: string, staff: StaffRow, rec: Attendance | undefined, leave: LeaveRow | undefined, clock: ShopClock,
  ): DayCell {
    const blank = { late: 0, worked: 0, ot: 0 };
    if (key > today) return { code: 'FUT', ...blank };
    if (!rec) {
      if (key < keyOf(staff.joinDate) || (staff.endDate && key > keyOf(staff.endDate))) return { code: 'NA', ...blank };
      if (leave) return { code: 'LV', ...blank, leaveType: leave.type, unpaid: leave.type === 'UNPAID' };
      if (!clock.workingDays.includes(weekdayOf(key))) return { code: 'OFF', ...blank };
      return { code: 'NONE', ...blank };
    }
    const base = { id: rec.id, in: rec.checkIn?.toISOString() ?? null, out: rec.checkOut?.toISOString() ?? null, note: rec.notes };
    switch (rec.status) {
      case 'ABSENT': return { code: 'A', ...blank, ...base };
      case 'HOLIDAY': return { code: 'HO', ...blank, ...base };
      case 'ON_LEAVE': return { code: 'LV', ...blank, ...base, leaveType: leave?.type, unpaid: leave?.type === 'UNPAID' };
      default: {
        // Rows marked without a check-in time keep the numbers they were saved with.
        const m = rec.checkIn
          ? this.measure(key, rec.checkIn, rec.checkOut, clock, staff.workingHoursPerDay)
          : { late: rec.lateMinutes, worked: round2(rec.workedHours), ot: round2(rec.overtimeHours) };
        if (rec.status === 'HALF_DAY') return { code: 'H', ...base, ...m };
        const late = rec.checkIn ? m.late > 0 : rec.status === 'LATE' || rec.isLate;
        return { code: late ? 'L' : 'P', ...base, ...m };
      }
    }
  }

  private add(t: Totals, c: DayCell, key: string, today: string, clock: ShopClock) {
    if (c.code === 'FUT' || c.code === 'NA') return;
    if (clock.workingDays.includes(weekdayOf(key))) t.workingDays += 1;
    switch (c.code) {
      case 'P': t.present += 1; break;
      case 'L': t.present += 1; t.late += 1; break;
      case 'H': t.halfDay += 1; break;
      case 'A': t.absent += 1; break;
      case 'LV': if (c.unpaid) t.unpaidLeave += 1; else t.leave += 1; break;
      case 'HO': t.holiday += 1; break;
      case 'OFF': t.off += 1; break;
      // Today is still open: nobody is missing until the day is over.
      case 'NONE': if (key < today) t.missing += 1; break;
    }
    t.daysWorked = t.present + t.halfDay;
    t.workedHours = round2(t.workedHours + c.worked);
    t.overtimeHours = round2(t.overtimeHours + c.ot);
    t.lateMinutes += c.late;
  }

  private async leavesFor(tenantId: string, staffIds: string[], from: string, to: string, statuses: Array<'APPROVED' | 'PENDING'> = ['APPROVED']) {
    if (!staffIds.length) return [];
    return this.prisma.staffLeave.findMany({
      where: { tenantId, staffId: { in: staffIds }, status: { in: statuses }, startDate: { lte: dateOf(to) }, endDate: { gte: dateOf(from) } },
      select: { id: true, staffId: true, type: true, startDate: true, endDate: true, status: true },
    });
  }

  private leaveOn(leaves: LeaveRow[], staffId: string, key: string) {
    return leaves.find((l) => l.staffId === staffId && l.status === 'APPROVED' && keyOf(l.startDate) <= key && keyOf(l.endDate) >= key);
  }

  /* ───── today's board ───── */

  async board(user: AuthenticatedUser, scope: ShopScope, q: SheetQueryDto) {
    const clock = await this.shopClock(user.tenantId);
    const day = this.today(clock);
    const staff = await this.staffInView(user, scope, q, day, day);
    const ids = staff.map((s) => s.id);
    const [records, leaves, pendingLeaves] = await Promise.all([
      ids.length ? this.prisma.attendance.findMany({ where: { tenantId: user.tenantId, date: dateOf(day), staffId: { in: ids } } }) : [],
      this.leavesFor(user.tenantId, ids, day, day),
      ids.length ? this.prisma.staffLeave.count({ where: { tenantId: user.tenantId, staffId: { in: ids }, status: 'PENDING' } }) : 0,
    ]);
    const byStaff = new Map(records.map((r) => [r.staffId, r]));

    const rows = staff
      .map((s) => ({ staff: s, day: this.cell(day, day, s, byStaff.get(s.id), this.leaveOn(leaves, s.id, day), clock) }))
      .filter((r) => r.day.code !== 'NA');
    const count = (...codes: DayCode[]) => rows.filter((r) => codes.includes(r.day.code)).length;
    const inside = rows.filter((r) => r.day.in && !r.day.out).length;

    return {
      day,
      clock,
      workingDay: clock.workingDays.includes(weekdayOf(day)),
      rows,
      counts: {
        staff: rows.length,
        present: count('P', 'L', 'H'),
        inside,
        out: rows.filter((r) => r.day.in && r.day.out).length,
        late: count('L'),
        notIn: count('NONE'),
        absent: count('A'),
        leave: count('LV'),
        off: count('OFF', 'HO'),
        lateMinutes: rows.reduce((s, r) => s + r.day.late, 0),
        pendingLeaves,
      },
    };
  }

  /* ───── monthly sheet ───── */

  async sheet(user: AuthenticatedUser, scope: ShopScope, q: SheetQueryDto) {
    const clock = await this.shopClock(user.tenantId);
    const today = this.today(clock);
    const from = q.from ?? `${today.slice(0, 7)}-01`;
    const to = q.to ?? today;
    if (to < from) throw new BadRequestException('"Tak" ki date "Se" se pehle hai');
    const keys = keysBetween(from, to);
    if (keys.length > MAX_DAYS) throw new BadRequestException(`Ek dafa me ${MAX_DAYS} din tak ka hisaab dekh sakte hain`);

    const staff = await this.staffInView(user, scope, q, from, to);
    const ids = staff.map((s) => s.id);
    const [records, leaves] = await Promise.all([
      ids.length ? this.prisma.attendance.findMany({ where: { tenantId: user.tenantId, staffId: { in: ids }, date: { gte: dateOf(from), lte: dateOf(to) } } }) : [],
      this.leavesFor(user.tenantId, ids, from, to),
    ]);
    const recs = new Map(records.map((r) => [`${r.staffId}|${keyOf(r.date)}`, r]));

    const all = emptyTotals();
    const byDay = keys.map((key) => ({ key, workingDay: clock.workingDays.includes(weekdayOf(key)), present: 0, late: 0, absent: 0, leave: 0, lateMinutes: 0, overtimeHours: 0, workedHours: 0 }));
    const rows = staff.map((s) => {
      const totals = emptyTotals();
      const days: Record<string, DayCell> = {};
      keys.forEach((key, i) => {
        const c = this.cell(key, today, s, recs.get(`${s.id}|${key}`), this.leaveOn(leaves, s.id, key), clock);
        days[key] = c;
        this.add(totals, c, key, today, clock);
        this.add(all, c, key, today, clock);
        const d = byDay[i];
        if (c.code === 'P' || c.code === 'L' || c.code === 'H') d.present += 1;
        if (c.code === 'L') d.late += 1;
        if (c.code === 'A' || (c.code === 'NONE' && key < today)) d.absent += 1;
        if (c.code === 'LV') d.leave += 1;
        d.lateMinutes += c.late;
        d.overtimeHours = round2(d.overtimeHours + c.ot);
        d.workedHours = round2(d.workedHours + c.worked);
      });
      return { staff: s, days, totals };
    });

    return { from, to, today, clock, keys, rows, totals: all, byDay };
  }

  /* ───── check-in / check-out ───── */

  async checkIn(user: AuthenticatedUser, dto: PunchDto) {
    const staff = await this.loadStaff(user, dto.staffId);
    if (staff.status !== 'ACTIVE' && staff.status !== 'ON_LEAVE') throw new BadRequestException(`${staff.fullName} ab kaam par nahi (${staff.status})`);
    const clock = await this.shopClock(user.tenantId);
    const day = this.today(clock);
    const now = new Date();
    const m = this.measure(day, now, null, clock, staff.workingHoursPerDay);
    const existing = await this.prisma.attendance.findUnique({ where: { staffId_date: { staffId: staff.id, date: dateOf(day) } } });
    // A second click returns the same record instead of moving the time.
    if (existing?.checkIn) return { record: existing, already: true };

    const data = {
      checkIn: now,
      status: (m.late > 0 ? 'LATE' : 'PRESENT') as AttendanceStatus,
      isLate: m.late > 0,
      lateMinutes: m.late,
      markedById: user.id,
      ...(dto.note ? { notes: dto.note } : {}),
    };
    try {
      if (existing) {
        // Guarded update: of two clicks on a day marked earlier, only the first sets the time.
        const res = await this.prisma.attendance.updateMany({ where: { id: existing.id, checkIn: null }, data });
        const record = await this.prisma.attendance.findUnique({ where: { id: existing.id } });
        return { record, already: res.count === 0 };
      }
      const record = await this.prisma.attendance.create({ data: { ...data, tenantId: user.tenantId, staffId: staff.id, date: dateOf(day) } });
      return { record, already: false };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const record = await this.prisma.attendance.findUnique({ where: { staffId_date: { staffId: staff.id, date: dateOf(day) } } });
        return { record, already: true };
      }
      throw e;
    }
  }

  async checkOut(user: AuthenticatedUser, dto: PunchDto) {
    const staff = await this.loadStaff(user, dto.staffId);
    const clock = await this.shopClock(user.tenantId);
    const day = this.today(clock);
    const now = new Date();
    // The open record is today's, or yesterday's for a shift that ran past the day change.
    const open = await this.prisma.attendance.findFirst({
      where: {
        tenantId: user.tenantId, staffId: staff.id, date: { in: [dateOf(day), dateOf(addKey(day, -1))] },
        checkIn: { not: null, gte: new Date(now.getTime() - OVERNIGHT_HOURS * 3_600_000) },
      },
      orderBy: { date: 'desc' },
    });
    if (!open) throw new BadRequestException(`${staff.fullName} ka aaj check-in nahi hua`);
    if (open.checkOut) return { record: open, already: true };

    const key = keyOf(open.date);
    const m = this.measure(key, open.checkIn, now, clock, staff.workingHoursPerDay);
    // Guarded update: two clicks write the time once.
    const res = await this.prisma.attendance.updateMany({
      where: { id: open.id, checkOut: null },
      data: { checkOut: now, workedHours: m.worked, overtimeHours: m.ot, ...(dto.note ? { notes: [open.notes, dto.note].filter(Boolean).join(' · ') } : {}) },
    });
    const record = await this.prisma.attendance.findUnique({ where: { id: open.id } });
    return { record, already: res.count === 0 };
  }

  /* ───── correction ───── */

  async correct(user: AuthenticatedUser, dto: CorrectAttendanceDto) {
    if (!MANAGERS.includes(user.role)) throw new ForbiddenException('Hazri sirf malik ya manager theek kar sakta hai');
    const staff = await this.loadStaff(user, dto.staffId);
    const clock = await this.shopClock(user.tenantId);
    if (dto.date > this.today(clock)) throw new BadRequestException('Aane wale din ki hazri nahi lag sakti');
    const where = { staffId_date: { staffId: staff.id, date: dateOf(dto.date) } };
    const before = await this.prisma.attendance.findUnique({ where });
    const snap = (r: Attendance | null) => r && ({
      status: r.status, checkIn: r.checkIn?.toISOString() ?? null, checkOut: r.checkOut?.toISOString() ?? null, notes: r.notes,
    });
    const logData = (action: string, description: string, after: Attendance | null) => ({
      tenantId: user.tenantId, userId: user.id, action, entityType: 'Attendance', entityId: after?.id ?? before?.id ?? staff.id, description,
      metadata: { staffId: staff.id, date: dto.date, reason: dto.reason, before: snap(before), after: snap(after) } as Prisma.InputJsonValue,
    });

    if (dto.remove) {
      if (!before) return { record: null, payrollMade: false };
      await this.prisma.$transaction([
        this.prisma.attendance.delete({ where: { id: before.id } }),
        this.prisma.activityLog.create({ data: logData('ATTENDANCE_REMOVED', `Hazri hatayi: ${staff.fullName} · ${dto.date} · ${dto.reason}`, null) }),
      ]);
      return { record: null, payrollMade: await this.payrollMade(user.tenantId, staff.id, dto.date) };
    }

    const status = dto.status ?? before?.status ?? (dto.checkIn ? 'PRESENT' : undefined);
    if (!status) throw new BadRequestException('Haal (status) ya check-in ka waqt chunein');
    const timed = status === 'PRESENT' || status === 'LATE' || status === 'HALF_DAY';
    const checkIn = timed && dto.checkIn ? this.at(dto.date, dto.checkIn, clock) : null;
    let checkOut = timed && dto.checkOut ? this.at(dto.date, dto.checkOut, clock) : null;
    if (checkOut && !checkIn) throw new BadRequestException('Check-out ke saath check-in ka waqt bhi likhein');
    // A check-out earlier than the check-in is after midnight.
    if (checkIn && checkOut && checkOut <= checkIn) checkOut = new Date(checkOut.getTime() + 86_400_000);

    const m = this.measure(dto.date, checkIn, checkOut, clock, staff.workingHoursPerDay);
    const finalStatus: AttendanceStatus = timed && status !== 'HALF_DAY' && checkIn ? (m.late > 0 ? 'LATE' : 'PRESENT') : status;
    const data = {
      status: finalStatus, checkIn, checkOut,
      isLate: m.late > 0, lateMinutes: m.late, workedHours: m.worked, overtimeHours: m.ot,
      notes: `Theek kiya: ${dto.reason}`, markedById: user.id,
    };
    const record = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.attendance.upsert({
        where,
        update: data,
        create: { ...data, tenantId: user.tenantId, staffId: staff.id, date: dateOf(dto.date) },
      });
      await tx.activityLog.create({
        data: logData(before ? 'ATTENDANCE_CORRECTED' : 'ATTENDANCE_MARKED', `Hazri ${before ? 'theek ki' : 'lagayi'}: ${staff.fullName} · ${dto.date} · ${finalStatus} · ${dto.reason}`, saved),
      });
      return saved;
    });
    return { record, payrollMade: await this.payrollMade(user.tenantId, staff.id, dto.date) };
  }

  /** True when a salary record (not cancelled) already covers the day, so the owner knows to recheck it. */
  private async payrollMade(tenantId: string, staffId: string, key: string) {
    const n = await this.prisma.salaryPayment.count({
      where: { tenantId, staffId, status: { not: 'CANCELLED' }, periodStart: { lte: dateOf(key) }, periodEnd: { gte: dateOf(key) } },
    });
    return n > 0;
  }

  /* ───── leaves ───── */

  async leaves(user: AuthenticatedUser, scope: ShopScope, q: LeaveQueryDto) {
    return this.prisma.staffLeave.findMany({
      where: {
        tenantId: user.tenantId,
        ...(q.status ? { status: q.status } : {}),
        ...(q.to ? { startDate: { lte: dateOf(q.to) } } : {}),
        ...(q.from ? { endDate: { gte: dateOf(q.from) } } : {}),
        staff: this.branchFilter(scope, q.shopId),
      },
      include: { staff: { select: { id: true, fullName: true, staffNumber: true, designation: true, avatarUrl: true, shop: { select: { id: true, name: true } } } } },
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
      take: 300,
    });
  }

  async createLeave(user: AuthenticatedUser, dto: CreateLeaveRequestDto) {
    const staff = await this.loadStaff(user, dto.staffId);
    if (dto.endDate < dto.startDate) throw new BadRequestException('Aakhri din pehle din se pehle hai');
    const days = keysBetween(dto.startDate, dto.endDate).length;
    if (days > MAX_DAYS) throw new BadRequestException(`Ek chhutti ${MAX_DAYS} din se lambi nahi ho sakti`);
    const overlap = await this.leavesFor(user.tenantId, [staff.id], dto.startDate, dto.endDate, ['APPROVED', 'PENDING']);
    if (overlap.length) {
      const o = overlap[0];
      throw new BadRequestException(`In dinon ki chhutti pehle se hai (${keyOf(o.startDate)} se ${keyOf(o.endDate)}, ${o.status === 'PENDING' ? 'approval baqi' : 'manzoor'})`);
    }
    const approve = !!dto.approve;
    return this.prisma.$transaction(async (tx) => {
      const leave = await tx.staffLeave.create({
        data: {
          tenantId: user.tenantId, staffId: staff.id, type: dto.type, startDate: dateOf(dto.startDate), endDate: dateOf(dto.endDate), days,
          reason: dto.reason, status: approve ? 'APPROVED' : 'PENDING', ...(approve ? { approvedById: user.id, approvedAt: new Date() } : {}),
        },
      });
      await tx.activityLog.create({
        data: {
          tenantId: user.tenantId, userId: user.id, action: approve ? 'LEAVE_APPROVED' : 'LEAVE_REQUESTED', entityType: 'StaffLeave', entityId: leave.id,
          description: `Chhutti ${approve ? 'manzoor' : 'ki darkhwast'}: ${staff.fullName} · ${dto.startDate} se ${dto.endDate} (${days} din)`,
          metadata: { staffId: staff.id, type: dto.type, days },
        },
      });
      return leave;
    });
  }

  async decideLeave(user: AuthenticatedUser, id: string, dto: DecideLeaveDto) {
    const leave = await this.prisma.staffLeave.findFirst({ where: { id, tenantId: user.tenantId }, include: { staff: { select: { fullName: true, shopId: true } } } });
    if (!leave) throw new NotFoundException('Chhutti nahi mili');
    if (leave.staff.shopId) assertShopAccess(user, leave.staff.shopId, 'Chhutti ka faisla');
    if (dto.decision === 'REJECT' && !dto.reason?.trim()) throw new BadRequestException('Na-approval ki wajah likhein');

    const target = { APPROVE: 'APPROVED', REJECT: 'REJECTED', CANCEL: 'CANCELLED' } as const;
    const from = dto.decision === 'CANCEL' ? ['PENDING', 'APPROVED'] : ['PENDING'];
    if (leave.status === target[dto.decision]) return leave;
    if (!from.includes(leave.status)) throw new BadRequestException('Is chhutti ka faisla pehle ho chuka');

    return this.prisma.$transaction(async (tx) => {
      // The status guard makes a double click write once.
      const res = await tx.staffLeave.updateMany({
        where: { id, tenantId: user.tenantId, status: { in: from as Array<'PENDING' | 'APPROVED'> } },
        data: {
          status: target[dto.decision],
          ...(dto.decision === 'APPROVE' ? { approvedById: user.id, approvedAt: new Date() } : {}),
          ...(dto.decision !== 'APPROVE' && dto.reason ? { rejectedReason: dto.reason.trim() } : {}),
        },
      });
      if (res.count) {
        await tx.activityLog.create({
          data: {
            tenantId: user.tenantId, userId: user.id, action: `LEAVE_${target[dto.decision]}`, entityType: 'StaffLeave', entityId: id,
            description: `Chhutti ${{ APPROVE: 'manzoor', REJECT: 'na-manzoor', CANCEL: 'cancel' }[dto.decision]}: ${leave.staff.fullName} · ${keyOf(leave.startDate)} se ${keyOf(leave.endDate)}${dto.reason ? ` · ${dto.reason}` : ''}`,
            metadata: { from: leave.status, to: target[dto.decision], reason: dto.reason ?? null },
          },
        });
      }
      return tx.staffLeave.findUnique({ where: { id } });
    });
  }
}
