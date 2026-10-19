/**
 * Salon appointments: booking a slot with a stylist (no double booking),
 * walk-ins joining the waiting queue, the day's status flow (arrived, in
 * the chair, done, no-show), advances on the customer's khata, and the
 * page and summary the appointments screen reads. The bill itself is made
 * by SalonBillsService (the counter, or checkout from this screen).
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ensureCustomer, recordKhataPayment, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { DAY_MS, paging, r2, salonClock, withNextNumber } from '../common/salon-common';
import { SalonBillsService, lineCommission } from '../bills/salon-bills.service';
import {
  AddPaymentDto, AppointmentPageQuery, AppointmentView, CheckoutAppointmentDto, CreateAppointmentDto, RescheduleDto, UpdateAppointmentStatusDto,
} from './dto/create-appointment.dto';

/** Statuses that keep a stylist busy for the booked slot. */
const BUSY = ['CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'RESCHEDULED'] as const;
const OPEN = ['CONFIRMED', 'RESCHEDULED', 'ARRIVED', 'IN_PROGRESS', 'DRAFT'] as const;
/** A booking this many minutes past its start, with the customer not in, counts as late. */
const LATE_MIN = 15;
/** Moves the status flow allows from each status (billing completes; cancel and no-show end it). */
const NEXT: Record<string, string[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ARRIVED', 'IN_PROGRESS', 'NO_SHOW', 'CANCELLED', 'COMPLETED'],
  RESCHEDULED: ['CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'NO_SHOW', 'CANCELLED', 'COMPLETED'],
  ARRIVED: ['IN_PROGRESS', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
  IN_PROGRESS: ['ARRIVED', 'CANCELLED', 'COMPLETED'],
};

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly bills: SalonBillsService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateAppointmentDto, scopeShopId?: string | null) {
    const tenantId = user.tenantId;
    if (dto.customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId }, select: { id: true, name: true, phone: true } });
      if (!c) throw new NotFoundException('Customer nahi mila');
      dto.customerName = dto.customerName || c.name;
      dto.customerPhone = dto.customerPhone || c.phone || undefined;
    }
    if (!dto.customerId && !dto.customerName?.trim()) throw new BadRequestException('Customer ka naam likhein');

    const serviceIds = [...new Set(dto.services.map((s) => s.serviceId))];
    const serviceRecords = await this.prisma.salonService.findMany({ where: { id: { in: serviceIds }, tenantId } });
    if (serviceRecords.length !== serviceIds.length) throw new NotFoundException('Koi service nahi mili — page refresh karein');
    const serviceMap = new Map(serviceRecords.map((s) => [s.id, s]));

    const staffIds = [...new Set(dto.services.map((s) => s.staffProfileId).filter(Boolean) as string[])];
    const staffProfiles = await this.prisma.salonStaffProfile.findMany({ where: { id: { in: staffIds }, tenantId }, include: { services: true } });
    if (staffProfiles.length !== staffIds.length) throw new NotFoundException('Stylist nahi mila — page refresh karein');
    const staffProfileMap = new Map(staffProfiles.map((s) => [s.id, s]));
    const staffs = await this.prisma.staff.findMany({ where: { tenantId, id: { in: staffProfiles.map((sp) => sp.staffId) } }, select: { id: true, fullName: true } });
    const staffMap = new Map(staffs.map((s) => [s.id, s]));

    let subtotal = 0;
    let totalDuration = 0;
    const enrichedServices = dto.services.map((s, idx) => {
      const svc = serviceMap.get(s.serviceId)!;
      const staffProfile = s.staffProfileId ? staffProfileMap.get(s.staffProfileId)! : null;
      const custom = staffProfile?.services.find((x) => x.serviceId === svc.id);
      const price = r2(s.price ?? custom?.customPrice ?? svc.discountPrice ?? svc.price);
      const discount = Math.min(r2(s.discount ?? 0), price);
      const total = r2(price - discount);
      const duration = s.durationMinutes ?? custom?.customDuration ?? svc.durationMinutes;
      subtotal += total;
      totalDuration += duration + (svc.bufferBefore || 0) + (svc.bufferAfter || 0);
      return {
        serviceId: s.serviceId,
        serviceName: svc.name,
        staffProfileId: s.staffProfileId,
        staffName: staffProfile ? staffMap.get(staffProfile.staffId)?.fullName : undefined,
        price,
        discount,
        total,
        durationMinutes: duration,
        commissionAmount: lineCommission(svc, staffProfile, total),
        notes: s.notes?.trim() || undefined,
        displayOrder: idx,
      };
    });

    const now = new Date();
    const scheduledStart = dto.walkIn ? now : new Date(dto.scheduledStart);
    const scheduledEnd = !dto.walkIn && dto.scheduledEnd
      ? new Date(dto.scheduledEnd)
      : new Date(scheduledStart.getTime() + Math.max(totalDuration, 5) * 60 * 1000);
    if (Number.isNaN(scheduledStart.getTime()) || Number.isNaN(scheduledEnd.getTime()) || scheduledEnd <= scheduledStart) {
      throw new BadRequestException('Waqt sahi chunein');
    }
    if (!dto.walkIn && scheduledStart.getTime() < now.getTime() - 6 * 3600_000) {
      throw new BadRequestException('Guzra hua waqt book nahi hota — walk-in ke liye "Abhi aaye" chunein');
    }
    // A walk-in waits in the queue for a free chair, so only booked slots are checked.
    if (!dto.walkIn) await this.assertStaffFree(tenantId, staffIds, scheduledStart, scheduledEnd);

    const serviceCharge = r2(dto.serviceCharge ?? 0);
    const tax = r2(dto.taxAmount ?? 0);
    const discount = r2(dto.discount ?? 0);
    const total = r2(Math.max(subtotal + serviceCharge + tax - discount, 0));
    const notes = [
      dto.walkIn && 'Walk-in',
      dto.numberOfGuests && dto.numberOfGuests > 1 && `Guests: ${dto.numberOfGuests}`,
    ].filter(Boolean).join(' · ');

    const clock = await salonClock(this.tz, tenantId);
    return withNextNumber(
      (prefix) => this.prisma.salonAppointment.findFirst({
        where: { tenantId, appointmentNumber: { startsWith: prefix } }, orderBy: { appointmentNumber: 'desc' }, select: { appointmentNumber: true },
      }).then((r) => r?.appointmentNumber),
      `APT-${clock.year()}-`,
      (appointmentNumber) => this.prisma.salonAppointment.create({
        data: {
          tenantId,
          shopId: dto.shopId || scopeShopId || user.shopId || null,
          appointmentNumber,
          customerId: dto.customerId,
          customerName: dto.customerName?.trim(),
          customerPhone: dto.customerPhone?.trim() || null,
          customerEmail: dto.customerEmail?.trim() || null,
          customerNotes: dto.customerNotes?.trim() || null,
          status: dto.walkIn ? 'ARRIVED' : 'CONFIRMED',
          arrivedAt: dto.walkIn ? now : undefined,
          scheduledStart,
          scheduledEnd,
          subtotal: r2(subtotal),
          serviceCharge,
          taxAmount: tax,
          discount,
          total,
          internalNotes: notes || undefined,
          createdById: user.id,
          services: { create: enrichedServices },
        },
        include: { services: true },
      }),
    );
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; staffProfileId?: string; from?: string; to?: string; search?: string; saleId?: string; saleIds?: string }) {
    const saleIds = params.saleIds?.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 200);
    return this.prisma.salonAppointment.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as never }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.saleId && { saleId: params.saleId }),
        ...(saleIds?.length && { saleId: { in: saleIds } }),
        ...(params.staffProfileId && { services: { some: { staffProfileId: params.staffProfileId } } }),
        ...(params.from || params.to ? {
          scheduledStart: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { appointmentNumber: { contains: params.search, mode: 'insensitive' as const } },
            { customerName: { contains: params.search, mode: 'insensitive' as const } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      include: { services: { orderBy: { displayOrder: 'asc' } } },
      orderBy: { scheduledStart: params.customerId ? 'desc' : 'asc' },
      take: 200,
    });
  }

  /** One view of the appointment record, paged, with the count of every view. */
  async page(user: AuthenticatedUser, scope: ShopScope, q: AppointmentPageQuery) {
    const tenantId = user.tenantId;
    const clock = await salonClock(this.tz, tenantId);
    const view: AppointmentView = q.view ?? 'today';
    const { page, limit, skip } = paging(q, 100);
    const now = new Date();
    const today = clock.today(now);
    const period = clock.range(q.from, q.to);

    const base: Prisma.SalonAppointmentWhereInput = {
      tenantId,
      ...scope.whereLoose,
      ...(period && { scheduledStart: { gte: period.gte, lt: period.lt } }),
      ...(q.staffProfileId && { services: { some: { staffProfileId: q.staffProfileId } } }),
      ...(q.search?.trim() && {
        OR: [
          { appointmentNumber: { contains: q.search.trim(), mode: 'insensitive' } },
          { customerName: { contains: q.search.trim(), mode: 'insensitive' } },
          { customerPhone: { contains: q.search.trim() } },
          { services: { some: { serviceName: { contains: q.search.trim(), mode: 'insensitive' } } } },
        ],
      }),
    };
    const views: Record<AppointmentView, Prisma.SalonAppointmentWhereInput> = {
      today: { scheduledStart: { gte: today.gte, lt: today.lt }, status: { not: 'CANCELLED' } },
      queue: { status: { in: ['ARRIVED', 'IN_PROGRESS'] } },
      upcoming: { scheduledStart: { gte: now }, status: { in: ['CONFIRMED', 'RESCHEDULED', 'DRAFT'] } },
      done: { status: 'COMPLETED' },
      missed: {
        OR: [
          { status: { in: ['NO_SHOW', 'CANCELLED'] } },
          { status: { in: ['CONFIRMED', 'RESCHEDULED'] }, scheduledStart: { lt: new Date(now.getTime() - LATE_MIN * 60_000) } },
        ],
      },
      all: {},
    };
    const where: Prisma.SalonAppointmentWhereInput = { AND: [base, views[view]] };
    const asc = view === 'today' || view === 'queue' || view === 'upcoming';

    const [items, total, counts, totals] = await Promise.all([
      this.prisma.salonAppointment.findMany({
        where,
        include: { services: { orderBy: { displayOrder: 'asc' } } },
        orderBy: view === 'queue' ? [{ status: 'desc' }, { arrivedAt: 'asc' }] : { scheduledStart: asc ? 'asc' : 'desc' },
        skip, take: limit,
      }),
      this.prisma.salonAppointment.count({ where }),
      Promise.all((Object.keys(views) as AppointmentView[]).map(async (v) => [v, await this.prisma.salonAppointment.count({ where: { AND: [base, views[v]] } })] as const)),
      this.prisma.salonAppointment.aggregate({ where, _sum: { total: true, paidAmount: true } }),
    ]);
    return {
      items, total, page, limit, pages: Math.max(Math.ceil(total / limit), 1),
      counts: Object.fromEntries(counts) as Record<AppointmentView, number>,
      totals: { value: r2(totals._sum.total ?? 0), paid: r2(totals._sum.paidAmount ?? 0) },
    };
  }

  /**
   * Today's floor (waiting, in the chair, late, done) and the period's
   * numbers: bookings, no-shows, walk-ins, billed amount and the split by
   * stylist, service, hour and weekday. Billed amounts come from the bills
   * themselves, so a voided bill is never counted.
   */
  async summary(user: AuthenticatedUser, scope: ShopScope, params: { from?: string; to?: string }) {
    const tenantId = user.tenantId;
    const clock = await salonClock(this.tz, tenantId);
    const now = new Date();
    const today = clock.today(now);
    const todayKey = clock.keyOf(now);
    const period = clock.range(params.from, params.to) ?? clock.range(`${todayKey.slice(0, 8)}01`, todayKey)!;
    const scoped: Prisma.SalonAppointmentWhereInput = { tenantId, ...scope.whereLoose };

    const [todays, rows, held] = await Promise.all([
      this.prisma.salonAppointment.findMany({
        where: { ...scoped, scheduledStart: { gte: today.gte, lt: today.lt } },
        select: { status: true, scheduledStart: true, saleId: true },
      }),
      this.prisma.salonAppointment.findMany({
        where: { ...scoped, scheduledStart: { gte: period.gte, lt: period.lt } },
        select: {
          status: true, scheduledStart: true, saleId: true, internalNotes: true, customerId: true,
          services: { select: { serviceId: true, serviceName: true, staffProfileId: true, staffName: true, total: true, commissionAmount: true } },
        },
        take: 20_000,
      }),
      this.prisma.salonAppointment.aggregate({
        where: { ...scoped, saleId: null, status: { in: [...OPEN] }, paidAmount: { gt: 0 } },
        _sum: { paidAmount: true }, _count: true,
      }),
    ]);

    const late = (a: { status: string; scheduledStart: Date }) =>
      (a.status === 'CONFIRMED' || a.status === 'RESCHEDULED') && a.scheduledStart.getTime() < now.getTime() - LATE_MIN * 60_000;
    const by = (s: string) => todays.filter((a) => a.status === s).length;
    const todayStats = {
      total: todays.filter((a) => a.status !== 'CANCELLED').length,
      waiting: by('ARRIVED'),
      inChair: by('IN_PROGRESS'),
      done: by('COMPLETED'),
      noShow: by('NO_SHOW'),
      late: todays.filter(late).length,
      upcoming: todays.filter((a) => (a.status === 'CONFIRMED' || a.status === 'RESCHEDULED') && a.scheduledStart >= now).length,
    };

    const saleIds = rows.map((r) => r.saleId).filter((x): x is string => !!x);
    const sales = saleIds.length
      ? await this.prisma.sale.findMany({ where: { tenantId, id: { in: saleIds }, status: { not: 'VOIDED' } }, select: { id: true, total: true, refundedAmount: true } })
      : [];
    const billOf = new Map(sales.map((s) => [s.id, r2(Number(s.total) - Number(s.refundedAmount ?? 0))]));
    const billed = rows.filter((r) => r.saleId && billOf.has(r.saleId));

    const staff = new Map<string, { staffProfileId: string; name: string; services: number; revenue: number; commission: number }>();
    const services = new Map<string, { serviceId: string; name: string; count: number; revenue: number }>();
    for (const r of billed) {
      for (const l of r.services) {
        const sv = services.get(l.serviceId) ?? { serviceId: l.serviceId, name: l.serviceName, count: 0, revenue: 0 };
        sv.count += 1; sv.revenue = r2(sv.revenue + l.total);
        services.set(l.serviceId, sv);
        if (!l.staffProfileId) continue;
        const st = staff.get(l.staffProfileId) ?? { staffProfileId: l.staffProfileId, name: l.staffName ?? 'Staff', services: 0, revenue: 0, commission: 0 };
        st.services += 1; st.revenue = r2(st.revenue + l.total); st.commission = r2(st.commission + l.commissionAmount);
        staff.set(l.staffProfileId, st);
      }
    }
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, bookings: 0 }));
    const weekdays = Array.from({ length: 7 }, (_, d) => ({ day: d, bookings: 0 }));
    for (const r of rows) {
      if (r.status === 'CANCELLED') continue;
      hours[clock.hour(r.scheduledStart)].bookings += 1;
      weekdays[clock.weekday(r.scheduledStart)].bookings += 1;
    }
    const revenue = r2(billed.reduce((s, r) => s + (billOf.get(r.saleId!) ?? 0), 0));
    const booked = rows.filter((r) => r.status !== 'CANCELLED').length;
    const noShows = rows.filter((r) => r.status === 'NO_SHOW').length;

    return {
      today: todayStats,
      held: { amount: r2(held._sum.paidAmount ?? 0), count: held._count },
      period: {
        from: clock.keyOf(period.gte),
        to: clock.keyOf(new Date(period.lt.getTime() - 1)),
        bookings: booked,
        completed: billed.length,
        noShows,
        cancelled: rows.filter((r) => r.status === 'CANCELLED').length,
        noShowRate: booked ? r2((noShows / booked) * 100) : 0,
        walkIns: rows.filter((r) => (r.internalNotes ?? '').startsWith('Walk-in')).length,
        customers: new Set(rows.map((r) => r.customerId).filter(Boolean)).size,
        revenue,
        average: billed.length ? r2(revenue / billed.length) : 0,
        commission: r2([...staff.values()].reduce((s, x) => s + x.commission, 0)),
      },
      staff: [...staff.values()].sort((a, b) => b.revenue - a.revenue),
      services: [...services.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 15),
      hours,
      weekdays,
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const apt = await this.prisma.salonAppointment.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { services: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!apt) throw new NotFoundException('Appointment nahi mili');
    const [customer, sale] = await Promise.all([
      apt.customerId
        ? this.prisma.customer.findFirst({ where: { id: apt.customerId, tenantId: user.tenantId }, select: { id: true, name: true, phone: true, balance: true } })
        : null,
      apt.saleId
        ? this.prisma.sale.findFirst({ where: { id: apt.saleId, tenantId: user.tenantId }, select: { id: true, saleNumber: true, status: true, total: true, creditAmount: true, refundedAmount: true } })
        : null,
    ]);
    return { ...apt, customer, sale };
  }

  async updateStatus(user: AuthenticatedUser, scope: ShopScope, id: string, dto: UpdateAppointmentStatusDto) {
    const apt = await this.prisma.salonAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Appointment nahi mili');
    if (apt.status === dto.status) return this.getOne(user, id);
    if (apt.saleId) throw new BadRequestException('Is appointment ka bill ban chuka hai — tabdeeli ke liye bill return ya void karein');
    if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') {
      throw new BadRequestException('Cancel / no-show appointment dobara nahi khulti — nayi booking banayein');
    }
    if (!(NEXT[apt.status] ?? []).includes(dto.status)) throw new BadRequestException('Ye qadam is halat se nahi ho sakta');
    if (dto.status === 'NO_SHOW' && apt.scheduledStart > new Date()) throw new BadRequestException('Waqt abhi aaya nahi — no-show baad me lagayein');

    // Completing posts the bill; money already taken stays as advance on khata.
    if (dto.status === 'COMPLETED') return this.checkout(user, scope, id, { paidAmount: 0 });

    const patch: Prisma.SalonAppointmentUpdateInput = { status: dto.status };
    const now = new Date();
    if (dto.status === 'ARRIVED') patch.arrivedAt = apt.arrivedAt ?? now;
    if (dto.status === 'IN_PROGRESS') { patch.actualStart = apt.actualStart ?? now; patch.arrivedAt = apt.arrivedAt ?? now; }
    if (dto.status === 'CANCELLED') {
      patch.cancelledAt = now;
      patch.cancellationReason = dto.cancellationReason?.trim() || null;
    }
    return this.prisma.salonAppointment.update({ where: { id }, data: patch, include: { services: true } });
  }

  /**
   * Bill from the appointment screen: the booked services at their booked
   * price, one payment method. The counter (POS) is used for anything more
   * (products, split payment, packages).
   */
  async checkout(user: AuthenticatedUser, scope: ShopScope, id: string, dto: CheckoutAppointmentDto) {
    const apt = await this.prisma.salonAppointment.findFirst({ where: { id, tenantId: user.tenantId }, include: { services: { orderBy: { displayOrder: 'asc' } } } });
    if (!apt) throw new NotFoundException('Appointment nahi mili');
    if (!apt.services.length) throw new BadRequestException('Is appointment me koi service nahi');
    const sale = await this.bills.create(user, scope, {
      appointmentId: id,
      services: apt.services.map((s) => ({ serviceId: s.serviceId, staffProfileId: s.staffProfileId ?? undefined, price: s.total, notes: s.notes ?? undefined })),
      discount: r2((dto.discount ?? 0) + apt.discount),
      tip: dto.tip ?? (apt.tip || undefined),
      paymentMethod: dto.paymentMethod ?? 'CASH',
      paidAmount: dto.paidAmount,
      shopId: dto.shopId,
    });
    const updated = await this.getOne(user, id);
    return { ...updated, sale: { id: sale.id, saleNumber: sale.saleNumber }, change: r2(Number(sale.changeAmount ?? 0)) };
  }

  async reschedule(user: AuthenticatedUser, id: string, dto: RescheduleDto) {
    const apt = await this.prisma.salonAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Appointment nahi mili');
    if (apt.saleId || ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(apt.status)) {
      throw new BadRequestException('Mukammal ya cancel appointment ka waqt nahi badalta');
    }
    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new BadRequestException('Waqt sahi chunein');
    if (end.getTime() - start.getTime() > DAY_MS) throw new BadRequestException('Ek appointment 24 ghante se lambi nahi ho sakti');
    const staff = await this.prisma.salonAppointmentService.findMany({ where: { appointmentId: id }, select: { staffProfileId: true } });
    await this.assertStaffFree(user.tenantId, staff.map((x) => x.staffProfileId).filter(Boolean) as string[], start, end, id);
    return this.prisma.salonAppointment.update({
      where: { id },
      data: {
        scheduledStart: start,
        scheduledEnd: end,
        status: 'RESCHEDULED',
        internalNotes: `${apt.internalNotes || ''}\nWaqt badla: ${dto.reason?.trim() || 'wajah nahi likhi'}`.trim(),
      },
      include: { services: true },
    });
  }

  /**
   * Money taken outside the final bill. Before the bill it is an advance; after
   * it, it pays off udhaar. Both go through the customer's khata so the day
   * book and cash register see the cash on the day it came in.
   */
  async addPayment(user: AuthenticatedUser, id: string, dto: AddPaymentDto) {
    const apt = await this.prisma.salonAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Appointment nahi mili');
    if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') {
      throw new BadRequestException('Cancel appointment par payment nahi li ja sakti');
    }
    const remaining = r2(apt.total - apt.paidAmount);
    if (remaining <= 0) throw new BadRequestException('Is appointment ka koi baqi nahi');
    const amount = r2(dto.amount);
    if (amount > remaining + 0.01) throw new BadRequestException(`Baqi sirf Rs ${remaining} hai`);

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, apt.shopId);
      const customerId = await ensureCustomer(tx, user, {
        customerId: apt.customerId, name: apt.customerName, phone: apt.customerPhone, shopId,
      });
      await recordKhataPayment(tx, user, {
        customerId,
        shopId,
        amount,
        method: dto.paymentMethod,
        reference: apt.appointmentNumber,
        note: `${apt.saleId ? 'Salon baqi wasool' : 'Salon advance'}: ${apt.appointmentNumber}${dto.reference ? ` (${dto.reference})` : ''}`,
      });
      const newPaid = r2(apt.paidAmount + amount);
      return tx.salonAppointment.update({
        where: { id },
        data: {
          customerId,
          shopId,
          paidAmount: newPaid,
          paymentStatus: newPaid >= apt.total - 0.01 ? 'PAID' : 'PARTIALLY_PAID',
        },
        include: { services: true },
      });
    });
  }

  /** A stylist cannot be booked twice for overlapping time. */
  private async assertStaffFree(tenantId: string, staffProfileIds: string[], start: Date, end: Date, exceptId?: string) {
    if (!staffProfileIds.length) return;
    const clash = await this.prisma.salonAppointmentService.findFirst({
      where: {
        staffProfileId: { in: staffProfileIds },
        appointment: {
          tenantId,
          ...(exceptId && { id: { not: exceptId } }),
          status: { in: [...BUSY] },
          scheduledStart: { lt: end },
          scheduledEnd: { gt: start },
        },
      },
      include: { appointment: { select: { appointmentNumber: true } } },
    });
    if (clash) {
      throw new BadRequestException(
        `${clash.staffName || 'Ye staff'} is waqt ${clash.appointment.appointmentNumber} me busy hai — doosra waqt ya staff chunein`,
      );
    }
  }

  async calendar(user: AuthenticatedUser, params: { from: string; to: string; staffProfileId?: string }) {
    const from = new Date(params.from);
    const to = new Date(params.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new BadRequestException('Tareekh sahi chunein');
    if (to.getTime() - from.getTime() > 62 * DAY_MS) throw new BadRequestException('Calendar ek waqt me 2 mahine tak dikhata hai');
    return this.prisma.salonAppointment.findMany({
      where: {
        tenantId: user.tenantId,
        status: { notIn: ['CANCELLED'] },
        scheduledStart: { gte: from, lte: to },
        ...(params.staffProfileId && { services: { some: { staffProfileId: params.staffProfileId } } }),
      },
      include: { services: { orderBy: { displayOrder: 'asc' } } },
      orderBy: { scheduledStart: 'asc' },
    });
  }

  async submitRating(user: AuthenticatedUser, id: string, rating: number, feedback?: string) {
    const apt = await this.prisma.salonAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Appointment nahi mili');
    if (apt.status !== 'COMPLETED') throw new BadRequestException('Rating kaam mukammal hone ke baad');
    return this.prisma.salonAppointment.update({
      where: { id },
      data: { customerRating: rating, customerFeedback: feedback?.trim() || null },
    });
  }
}
