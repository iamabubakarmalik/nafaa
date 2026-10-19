import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { zonedToUtc } from '../../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { type DayRange, r2, salonClock, serviceProductIds } from '../common/salon-common';
import { AssignServiceDto, UpsertStaffProfileDto } from './dto/upsert-staff-profile.dto';

@Injectable()
export class StaffProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  async upsert(user: AuthenticatedUser, dto: UpsertStaffProfileDto) {
    const staff = await this.prisma.staff.findFirst({ where: { id: dto.staffId, tenantId: user.tenantId } });
    if (!staff) throw new NotFoundException('Staff nahi mila');
    if (dto.workStartTime && dto.workEndTime && dto.workEndTime <= dto.workStartTime) throw new BadRequestException('Chhutti ka waqt aane ke waqt ke baad rakhein');

    const existing = await this.prisma.salonStaffProfile.findUnique({ where: { staffId: dto.staffId } });
    if (existing) {
      return this.prisma.salonStaffProfile.update({
        where: { staffId: dto.staffId },
        data: { ...dto, isActive: dto.isActive ?? true, tenantId: user.tenantId },
      });
    }
    return this.prisma.salonStaffProfile.create({
      data: { ...dto, tenantId: user.tenantId },
    });
  }

  async list(user: AuthenticatedUser, params: { role?: string; bookable?: boolean; search?: string }) {
    const profiles = await this.prisma.salonStaffProfile.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.role && { role: params.role as any }),
        ...(params.bookable !== undefined && { isBookable: params.bookable }),
      },
      include: { services: true },
      orderBy: { updatedAt: 'desc' },
    });

    const staffIds = profiles.map((p) => p.staffId);
    const staffs = await this.prisma.staff.findMany({
      where: {
        id: { in: staffIds },
        tenantId: user.tenantId,
        ...(params.search && { fullName: { contains: params.search, mode: 'insensitive' } }),
      },
    });
    const staffMap = new Map(staffs.map((s) => [s.id, s]));

    return profiles
      .filter((p) => staffMap.has(p.staffId))
      .map((p) => ({ ...p, staff: staffMap.get(p.staffId) }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.salonStaffProfile.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { services: true },
    });
    if (!p) throw new NotFoundException('Staff profile not found');
    const staff = await this.prisma.staff.findUnique({ where: { id: p.staffId } });

    // Fetch service names
    const serviceIds = p.services.map((s) => s.serviceId);
    const services = await this.prisma.salonService.findMany({ where: { id: { in: serviceIds } } });
    const servicesMap = new Map(services.map((s) => [s.id, s]));

    return {
      ...p,
      staff,
      services: p.services.map((sv) => ({ ...sv, service: servicesMap.get(sv.serviceId) })),
    };
  }

  async byStaffId(user: AuthenticatedUser, staffId: string) {
    return this.prisma.salonStaffProfile.findFirst({
      where: { staffId, tenantId: user.tenantId },
      include: { services: true },
    });
  }

  async assignServices(user: AuthenticatedUser, staffProfileId: string, services: AssignServiceDto[]) {
    const profile = await this.prisma.salonStaffProfile.findFirst({ where: { id: staffProfileId, tenantId: user.tenantId } });
    if (!profile) throw new NotFoundException('Profile not found');
    const ids = [...new Set(services.map((s) => s.serviceId))];
    if (ids.length !== services.length) throw new BadRequestException('Ek service do dafa chuni gayi hai');
    const own = await this.prisma.salonService.count({ where: { tenantId: user.tenantId, id: { in: ids } } });
    if (own !== ids.length) throw new NotFoundException('Koi service nahi mili');

    await this.prisma.salonStaffService.deleteMany({ where: { staffProfileId } });
    if (services.length > 0) {
      await this.prisma.salonStaffService.createMany({
        data: services.map((s) => ({
          staffProfileId,
          serviceId: s.serviceId,
          customPrice: s.customPrice,
          customDuration: s.customDuration,
          customCommissionPct: s.customCommissionPct,
          isPrimary: s.isPrimary ?? false,
        })),
      });
    }
    return this.prisma.salonStaffService.findMany({ where: { staffProfileId } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.salonStaffProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.prisma.salonStaffProfile.update({ where: { id }, data: { isActive: false } });
  }

  async availability(user: AuthenticatedUser, staffProfileId: string, date: string) {
    const profile = await this.prisma.salonStaffProfile.findFirst({ where: { id: staffProfileId, tenantId: user.tenantId } });
    if (!profile) throw new NotFoundException('Profile not found');

    // `date` is a shop-local YYYY-MM-DD; the server runs in UTC.
    const [y, m, d] = String(date).slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) throw new BadRequestException('Date sahi likhein (YYYY-MM-DD)');
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const isWorkingDay = profile.workingDays.includes(dayOfWeek);
    if (!isWorkingDay) return { available: false, reason: 'Not a working day', bookings: [] };

    const dayStart = zonedToUtc(y, m, d, 0, 0, 0);
    const dayEnd = new Date(zonedToUtc(y, m, d + 1, 0, 0, 0).getTime() - 1);

    // Fetch appointments for staff on that date
    const appointments = await this.prisma.salonAppointmentService.findMany({
      where: {
        staffProfileId,
        appointment: {
          tenantId: user.tenantId,
          scheduledStart: { gte: dayStart, lte: dayEnd },
          status: { in: ['CONFIRMED', 'ARRIVED', 'IN_PROGRESS'] },
        },
      },
      include: { appointment: true },
    });

    return {
      available: true,
      workingHours: { start: profile.workStartTime, end: profile.workEndTime },
      breakHours: profile.breakStartTime ? { start: profile.breakStartTime, end: profile.breakEndTime } : null,
      bookings: appointments.map((a) => ({
        appointmentId: a.appointmentId,
        start: a.appointment.scheduledStart,
        end: a.appointment.scheduledEnd,
        serviceName: a.serviceName,
      })),
    };
  }

  /**
   * Billed service lines of a period (by bill date) with their commission:
   * voided bills left out, `returned` when the line's bill line came back.
   * A line linked to its bill line (`saleItemId`) is matched exactly; older
   * lines are matched by their service's product, one returned unit per line.
   */
  async commissionRows(tenantId: string, period: DayRange, staffProfileId?: string) {
    const lines = await this.prisma.salonAppointmentService.findMany({
      where: {
        staffProfileId: staffProfileId ? staffProfileId : { not: null },
        appointment: { tenantId, saleId: { not: null }, actualEnd: { gte: period.gte, lt: period.lt } },
      },
      select: {
        id: true, serviceId: true, serviceName: true, staffProfileId: true, staffName: true, price: true, total: true, commissionAmount: true, notes: true,
        saleItemId: true, commissionPaid: true, commissionPaidAt: true, payoutRef: true,
        appointment: { select: { id: true, appointmentNumber: true, customerName: true, actualEnd: true, saleId: true } },
      },
      orderBy: { appointment: { actualEnd: 'desc' } },
      take: 20_000,
    });
    const saleIds = [...new Set(lines.map((l) => l.appointment.saleId!))];
    const sales = saleIds.length
      ? await this.prisma.sale.findMany({
          where: { tenantId, id: { in: saleIds } },
          select: { id: true, saleNumber: true, status: true, items: { where: { returnedQty: { gt: 0 } }, select: { id: true, productId: true, returnedQty: true } } },
        })
      : [];
    const saleOf = new Map(sales.map((s) => [s.id, s]));
    const productOf = await serviceProductIds(this.prisma as unknown as Prisma.TransactionClient, tenantId, [...new Set(lines.map((l) => l.serviceId))]);
    const linked = new Set(lines.map((l) => l.saleItemId).filter(Boolean));
    const returnedItems = new Set<string>();
    // Older lines: returned units per bill and service product, used up line by line.
    const pool = new Map<string, number>();
    for (const s of sales) {
      for (const it of s.items) {
        returnedItems.add(it.id);
        if (linked.has(it.id)) continue;
        const key = `${s.id}:${it.productId}`;
        pool.set(key, (pool.get(key) ?? 0) + Math.round(it.returnedQty));
      }
    }
    const takeFromPool = (saleId: string, serviceId: string) => {
      const key = `${saleId}:${productOf.get(serviceId)}`;
      if (!productOf.has(serviceId) || !(pool.get(key)! > 0)) return false;
      pool.set(key, pool.get(key)! - 1);
      return true;
    };
    return lines.flatMap((l) => {
      const sale = saleOf.get(l.appointment.saleId!);
      if (!sale || sale.status === 'VOIDED') return [];
      const returned = l.saleItemId ? returnedItems.has(l.saleItemId) : takeFromPool(sale.id, l.serviceId);
      const paidAt = l.commissionPaidAt ?? (l.commissionPaid ? l.appointment.actualEnd : null);
      return [{ ...l, saleNumber: sale.saleNumber, returned, paidAt }];
    });
  }

  /**
   * Commission each stylist earned in a period, from billed service lines
   * (by bill date). Voided bills are left out; a service returned on its
   * bill takes its commission back. `paid` is what was paid out already,
   * `unpaid` what is still owed. With `staffProfileId`, the lines too.
   */
  async commission(user: AuthenticatedUser, params: { from?: string; to?: string; staffProfileId?: string }) {
    const tenantId = user.tenantId;
    const clock = await salonClock(this.tz, tenantId);
    const todayKey = clock.keyOf(new Date());
    const period = clock.range(params.from, params.to) ?? clock.range(`${todayKey.slice(0, 8)}01`, todayKey)!;
    const rows = await this.commissionRows(tenantId, period, params.staffProfileId);
    const people = new Map<string, { staffProfileId: string; name: string; services: number; revenue: number; commission: number; returned: number; net: number; paid: number; unpaid: number; paidThenReturned: number }>();
    for (const r of rows) {
      const p = people.get(r.staffProfileId!) ?? { staffProfileId: r.staffProfileId!, name: r.staffName ?? 'Staff', services: 0, revenue: 0, commission: 0, returned: 0, net: 0, paid: 0, unpaid: 0, paidThenReturned: 0 };
      p.services += 1;
      p.revenue = r2(p.revenue + r.total);
      p.commission = r2(p.commission + r.commissionAmount);
      if (r.returned) p.returned = r2(p.returned + r.commissionAmount);
      if (r.paidAt) p.paid = r2(p.paid + r.commissionAmount);
      if (r.paidAt && r.returned) p.paidThenReturned = r2(p.paidThenReturned + r.commissionAmount);
      if (!r.paidAt && !r.returned) p.unpaid = r2(p.unpaid + r.commissionAmount);
      p.net = r2(p.commission - p.returned);
      people.set(r.staffProfileId!, p);
    }
    const staff = [...people.values()].sort((a, b) => b.net - a.net);
    return {
      from: clock.keyOf(period.gte),
      to: clock.keyOf(new Date(period.lt.getTime() - 1)),
      staff,
      totals: {
        services: staff.reduce((s, p) => s + p.services, 0),
        revenue: r2(staff.reduce((s, p) => s + p.revenue, 0)),
        net: r2(staff.reduce((s, p) => s + p.net, 0)),
        paid: r2(staff.reduce((s, p) => s + p.paid, 0)),
        unpaid: r2(staff.reduce((s, p) => s + p.unpaid, 0)),
      },
      lines: params.staffProfileId
        ? rows.slice(0, 500).map((r) => ({
            id: r.id, at: r.appointment.actualEnd, appointmentId: r.appointment.id, appointmentNumber: r.appointment.appointmentNumber,
            customerName: r.appointment.customerName, saleNumber: r.saleNumber, serviceName: r.serviceName, total: r.total,
            commission: r.commissionAmount, returned: r.returned, notes: r.notes, paidAt: r.paidAt, payoutRef: r.payoutRef,
          }))
        : undefined,
    };
  }
}
