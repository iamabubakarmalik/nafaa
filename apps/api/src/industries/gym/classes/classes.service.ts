import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GymClassStatus, GymClassType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { DAY_MS, gymClock, nextNumber, opt } from '../common/gym-common';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';

/** At most this many classes are made by one repeat schedule. */
const MAX_REPEATS = 120;

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  private async checkTrainer(tenantId: string, trainerId?: string | null) {
    if (!trainerId) return;
    const t = await this.prisma.gymTrainer.findFirst({ where: { id: trainerId, tenantId, isActive: true }, select: { id: true } });
    if (!t) throw new BadRequestException('Trainer nahi mila');
  }

  private fields(dto: UpdateClassDto) {
    return {
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.classType !== undefined && { classType: dto.classType }),
      ...(dto.trainerId !== undefined && { trainerId: dto.trainerId || null }),
      ...(dto.description !== undefined && { description: opt(dto.description) ?? null }),
      ...(dto.maxParticipants !== undefined && { maxParticipants: dto.maxParticipants }),
      ...(dto.minParticipants !== undefined && { minParticipants: dto.minParticipants }),
      ...(dto.isFree !== undefined && { isFree: dto.isFree }),
      ...(dto.dropInPrice !== undefined && { dropInPrice: dto.dropInPrice }),
      ...(dto.memberPrice !== undefined && { memberPrice: dto.memberPrice }),
      ...(dto.location !== undefined && { location: opt(dto.location) ?? null }),
      ...(dto.roomName !== undefined && { roomName: opt(dto.roomName) ?? null }),
      ...(dto.difficultyLevel !== undefined && { difficultyLevel: opt(dto.difficultyLevel) ?? null }),
      ...(dto.targetAudience !== undefined && { targetAudience: opt(dto.targetAudience) ?? null }),
      ...(dto.notes !== undefined && { notes: opt(dto.notes) ?? null }),
    };
  }

  /** One class, or the same slot on the chosen weekdays until the repeat end date. */
  async create(user: AuthenticatedUser, dto: CreateClassDto) {
    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    if (!(minutes >= 10 && minutes <= 480)) throw new BadRequestException('Class 10 minute se 8 ghante tak ki ho');
    if ((dto.minParticipants ?? 1) > (dto.maxParticipants ?? 20)) throw new BadRequestException('Kam se kam log, zyada se zyada se kam hon');
    await this.checkTrainer(user.tenantId, dto.trainerId);
    const clock = await gymClock(this.tz, user.tenantId);
    const days = [...new Set(dto.recurrenceDays ?? [])];
    const until = dto.recurrenceEndDate ? clock.periodEnd(clock.dayStart(dto.recurrenceEndDate), 1) : null;
    const starts: Date[] = [];
    if (days.length && until) {
      for (let t = start.getTime(); t <= until.getTime() && starts.length < MAX_REPEATS; t += DAY_MS) {
        const weekday = new Date(`${clock.keyOf(new Date(t))}T12:00:00Z`).getUTCDay();
        if (days.includes(weekday)) starts.push(new Date(t));
      }
      if (!starts.length) throw new BadRequestException('Chune hue dinon me koi class nahi banti — din ya end date check karein');
    } else {
      starts.push(start);
    }
    const shopId = await resolveIndustryShopId(this.prisma as unknown as Prisma.TransactionClient, user, null);
    const base = {
      tenantId: user.tenantId,
      shopId,
      ...this.fields(dto),
      name: dto.name.trim(),
      durationMinutes: minutes,
      isRecurring: starts.length > 1,
      recurrencePattern: starts.length > 1 ? 'WEEKLY' : null,
      recurrenceDays: starts.length > 1 ? days : [],
      recurrenceEndDate: starts.length > 1 ? until : null,
    };
    const made = await this.prisma.$transaction(starts.map((s) => this.prisma.gymClass.create({
      data: { ...base, scheduledStart: s, scheduledEnd: new Date(s.getTime() + minutes * 60000) },
    })));
    return starts.length === 1 ? made[0] : { classes: made, count: made.length };
  }

  async list(user: AuthenticatedUser, params: { classType?: string; status?: string; trainerId?: string; from?: string; to?: string }) {
    const clock = await gymClock(this.tz, user.tenantId);
    const keyRange = clock.range(params.from, params.to);
    const rows = await this.prisma.gymClass.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.classType && { classType: params.classType as GymClassType }),
        ...(params.status && { status: params.status as GymClassStatus }),
        ...(params.trainerId && { trainerId: params.trainerId }),
        ...(keyRange
          ? { scheduledStart: { gte: keyRange.gte, lt: keyRange.lt } }
          : params.from || params.to
            ? { scheduledStart: { ...(params.from && { gte: new Date(params.from) }), ...(params.to && { lte: new Date(params.to) }) } }
            : {}),
      },
      include: { trainer: true, bookings: { where: { status: { not: 'CANCELLED' } } } },
      orderBy: { scheduledStart: 'asc' },
      take: 300,
    });
    return this.withTrainerNames(user.tenantId, rows);
  }

  /** Adds the trainer's staff name and phone to each class. */
  private async withTrainerNames<T extends { trainer: { staffId: string } | null }>(tenantId: string, rows: T[]) {
    const ids = [...new Set(rows.map((r) => r.trainer?.staffId).filter((x): x is string => !!x))];
    const staff = ids.length ? await this.prisma.staff.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, fullName: true, phone: true } }) : [];
    const byId = new Map(staff.map((s) => [s.id, s]));
    return rows.map((r) => ({ ...r, trainer: r.trainer ? { ...r.trainer, staff: byId.get(r.trainer.staffId) ?? null } : null }));
  }

  /** The class with its bookings and each booked member's name. */
  async getOne(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.gymClass.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { trainer: true, bookings: { include: { member: { select: { id: true, memberNumber: true, customerId: true } } }, orderBy: { bookedAt: 'asc' } } },
    });
    if (!c) throw new NotFoundException('Class nahi mili');
    const people = await this.prisma.customer.findMany({ where: { tenantId: user.tenantId, id: { in: c.bookings.map((b) => b.member.customerId) } }, select: { id: true, name: true, phone: true } });
    const byId = new Map(people.map((p) => [p.id, p]));
    const [named] = await this.withTrainerNames(user.tenantId, [c]);
    return { ...named, bookings: c.bookings.map((b) => ({ ...b, member: { ...b.member, customer: byId.get(b.member.customerId) ?? null } })) };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateClassDto) {
    const c = await this.prisma.gymClass.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Class nahi mili');
    if (c.status === 'COMPLETED' || c.status === 'CANCELLED') throw new BadRequestException('Khatam ya cancel class nahi badalti');
    await this.checkTrainer(user.tenantId, dto.trainerId);
    const start = dto.scheduledStart ? new Date(dto.scheduledStart) : c.scheduledStart;
    const end = dto.scheduledEnd ? new Date(dto.scheduledEnd) : dto.scheduledStart ? new Date(start.getTime() + c.durationMinutes * 60000) : c.scheduledEnd;
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    if (!(minutes >= 10 && minutes <= 480)) throw new BadRequestException('Class 10 minute se 8 ghante tak ki ho');
    if (dto.maxParticipants !== undefined && dto.maxParticipants < c.currentEnrolled) {
      throw new BadRequestException(`${c.currentEnrolled} log pehle se booked hain — seats is se kam nahi ho sakti`);
    }
    return this.prisma.gymClass.update({
      where: { id },
      data: { ...this.fields(dto), scheduledStart: start, scheduledEnd: end, durationMinutes: minutes },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: GymClassStatus, cancelledReason?: string) {
    const c = await this.prisma.gymClass.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Class nahi mili');
    if (c.status === status) return c;
    if (c.status === 'COMPLETED' || c.status === 'CANCELLED') throw new BadRequestException('Khatam ya cancel class ka status nahi badalta');
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      if (status === 'CANCELLED') {
        // Everyone booked is told by the desk; their bookings close with the class.
        await tx.gymClassBooking.updateMany({
          where: { tenantId: user.tenantId, classId: id, status: 'BOOKED' },
          data: { status: 'CANCELLED', cancelledAt: now, cancellationReason: opt(cancelledReason) ?? 'Class cancel' },
        });
      }
      return tx.gymClass.update({
        where: { id },
        data: {
          status,
          ...(status === 'IN_PROGRESS' && { actualStart: now }),
          ...(status === 'COMPLETED' && { actualEnd: now, actualStart: c.actualStart ?? c.scheduledStart }),
          ...(status === 'CANCELLED' && { cancelledReason: opt(cancelledReason) ?? null, currentEnrolled: 0 }),
        },
      });
    });
  }

  async book(user: AuthenticatedUser, classId: string, memberId: string) {
    const tenantId = user.tenantId;
    const cls = await this.prisma.gymClass.findFirst({ where: { id: classId, tenantId } });
    if (!cls) throw new NotFoundException('Class nahi mili');
    if (!['SCHEDULED', 'IN_PROGRESS'].includes(cls.status)) throw new BadRequestException('Is class ki booking band hai');
    if (cls.scheduledEnd < new Date()) throw new BadRequestException('Ye class guzar chuki');
    const member = await this.prisma.gymMember.findFirst({ where: { id: memberId, tenantId, isActive: true }, select: { id: true } });
    if (!member) throw new NotFoundException('Member nahi mila');

    return this.prisma.$transaction(async (tx) => {
      // The seat count is re-read under the row lock so two desks never overbook.
      const [locked] = await tx.$queryRaw<Array<{ currentEnrolled: number; maxParticipants: number }>>`
        SELECT "currentEnrolled", "maxParticipants" FROM "GymClass" WHERE id = ${classId} FOR UPDATE`;
      if (locked && locked.currentEnrolled >= locked.maxParticipants) throw new BadRequestException('Class full hai');
      const existing = await tx.gymClassBooking.findUnique({ where: { classId_memberId: { classId, memberId } } });
      if (existing && existing.status !== 'CANCELLED') throw new BadRequestException('Ye member pehle se booked hai');
      const price = cls.isFree ? 0 : cls.memberPrice;
      let booking;
      if (existing) {
        // The unique pair allows one row: a cancelled booking is opened again.
        booking = await tx.gymClassBooking.update({
          where: { id: existing.id },
          data: { status: 'BOOKED', bookedAt: new Date(), cancelledAt: null, cancellationReason: null, price },
        });
      } else {
        const prefix = `CB-${(await gymClock(this.tz, tenantId)).year()}-`;
        const bookingNumber = await nextNumber(tx, tenantId, prefix, async () => (await tx.gymClassBooking.findFirst({
          where: { tenantId, bookingNumber: { startsWith: prefix } }, orderBy: { bookingNumber: 'desc' }, select: { bookingNumber: true },
        }))?.bookingNumber);
        booking = await tx.gymClassBooking.create({ data: { tenantId, classId, memberId, bookingNumber, price } });
      }
      await tx.gymClass.update({ where: { id: classId }, data: { currentEnrolled: { increment: 1 } } });
      return booking;
    });
  }

  async cancelBooking(user: AuthenticatedUser, bookingId: string, reason?: string) {
    const b = await this.prisma.gymClassBooking.findFirst({ where: { id: bookingId, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Booking nahi mili');
    if (b.status === 'CANCELLED') throw new BadRequestException('Booking pehle hi cancel hai');
    if (b.status === 'ATTENDED') throw new BadRequestException('Member class le chuka — booking cancel nahi hoti');
    return this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.gymClassBooking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: opt(reason) },
      });
      await tx.gymClass.updateMany({ where: { id: b.classId, currentEnrolled: { gt: 0 } }, data: { currentEnrolled: { decrement: 1 } } });
      return cancelled;
    });
  }

  async checkIn(user: AuthenticatedUser, bookingId: string) {
    const b = await this.prisma.gymClassBooking.findFirst({ where: { id: bookingId, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Booking nahi mili');
    if (b.status === 'CANCELLED') throw new BadRequestException('Cancel booking par haazri nahi lagti');
    return this.prisma.gymClassBooking.update({
      where: { id: bookingId },
      data: { status: 'ATTENDED', checkedInAt: b.checkedInAt ?? new Date(), attended: true },
    });
  }

  async calendar(user: AuthenticatedUser, from: string, to: string) {
    const gte = new Date(from);
    const lte = new Date(to);
    if (Number.isNaN(gte.getTime()) || Number.isNaN(lte.getTime())) throw new BadRequestException('Dates sahi bhejein');
    return this.prisma.gymClass.findMany({
      where: { tenantId: user.tenantId, scheduledStart: { gte, lte }, status: { notIn: ['CANCELLED'] } },
      include: { trainer: true },
      orderBy: { scheduledStart: 'asc' },
      take: 500,
    });
  }
}
