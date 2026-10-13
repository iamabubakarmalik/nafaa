import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AddPaymentDto, CheckoutAppointmentDto, CreateAppointmentDto, RescheduleDto, UpdateAppointmentStatusDto } from './dto/create-appointment.dto';
import { ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId } from '../../_shared/industry-sale.helper';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
/** Statuses that keep a stylist busy for the booked slot. */
const BUSY = ['CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'RESCHEDULED'] as const;

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateAppointmentDto) {
    if (!dto.services?.length) throw new BadRequestException('Kam az kam ek service chunein');
    if (dto.customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true, name: true, phone: true } });
      if (!c) throw new NotFoundException('Customer nahi mila');
      dto.customerName = dto.customerName || c.name;
      dto.customerPhone = dto.customerPhone || c.phone || undefined;
    }

    const appointmentNumber = await this.nextNumber(user.tenantId);

    // Enrich services
    const serviceIds = dto.services.map((s) => s.serviceId);
    const serviceRecords = await this.prisma.salonService.findMany({ where: { id: { in: serviceIds }, tenantId: user.tenantId } });
    const serviceMap = new Map(serviceRecords.map((s) => [s.id, s]));

    const staffIds = dto.services.map((s) => s.staffProfileId).filter(Boolean) as string[];
    const staffProfiles = await this.prisma.salonStaffProfile.findMany({ where: { id: { in: staffIds }, tenantId: user.tenantId } });
    const staffProfileMap = new Map(staffProfiles.map((s) => [s.id, s]));
    const staffs = await this.prisma.staff.findMany({ where: { id: { in: staffProfiles.map((sp) => sp.staffId) } } });
    const staffMap = new Map(staffs.map((s) => [s.id, s]));

    let subtotal = 0;
    let totalDuration = 0;
    const enrichedServices = dto.services.map((s, idx) => {
      const svc = serviceMap.get(s.serviceId);
      if (!svc) throw new BadRequestException(`Service ${s.serviceId} not found`);

      const price = s.price ?? svc.discountPrice ?? svc.price;
      const discount = s.discount ?? 0;
      const total = Math.max(price - discount, 0);
      const duration = s.durationMinutes ?? svc.durationMinutes;

      subtotal += total;
      totalDuration += duration;

      const staffProfile = s.staffProfileId ? staffProfileMap.get(s.staffProfileId) : null;
      const staff = staffProfile ? staffMap.get(staffProfile.staffId) : null;

      // Calculate commission
      let commissionAmount = 0;
      if (staffProfile) {
        const pct = svc.commissionPct || staffProfile.commissionPct || 0;
        const fixed = svc.commissionFixed || staffProfile.commissionFixed || 0;
        commissionAmount = (total * pct) / 100 + fixed;
      }

      return {
        serviceId: s.serviceId,
        serviceName: svc.name,
        staffProfileId: s.staffProfileId,
        staffName: staff?.fullName,
        price,
        discount,
        total,
        durationMinutes: duration,
        commissionAmount,
        notes: s.notes,
        displayOrder: idx,
      };
    });

    const scheduledStart = new Date(dto.scheduledStart);
    const scheduledEnd = dto.scheduledEnd
      ? new Date(dto.scheduledEnd)
      : new Date(scheduledStart.getTime() + totalDuration * 60 * 1000);
    if (Number.isNaN(scheduledStart.getTime()) || Number.isNaN(scheduledEnd.getTime()) || scheduledEnd <= scheduledStart) {
      throw new BadRequestException('Waqt sahi chunein');
    }
    await this.assertStaffFree(user.tenantId, staffIds, scheduledStart, scheduledEnd);

    const serviceCharge = dto.serviceCharge ?? 0;
    const tax = dto.taxAmount ?? 0;
    const discount = dto.discount ?? 0;
    const total = Math.max(subtotal + serviceCharge + tax - discount, 0);

    return this.prisma.salonAppointment.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId || user.shopId || null,
        appointmentNumber,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        customerNotes: dto.customerNotes,
        status: 'CONFIRMED',
        scheduledStart,
        scheduledEnd,
        subtotal,
        serviceCharge,
        taxAmount: tax,
        discount,
        total,
        internalNotes: dto.numberOfGuests && dto.numberOfGuests > 1 ? `Guests: ${dto.numberOfGuests}` : undefined,
        createdById: user.id,
        services: { create: enrichedServices },
      },
      include: { services: true },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; staffProfileId?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.salonAppointment.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.staffProfileId && { services: { some: { staffProfileId: params.staffProfileId } } }),
        ...(params.from || params.to ? {
          scheduledStart: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { appointmentNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      include: { services: true },
      orderBy: { scheduledStart: 'asc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const apt = await this.prisma.salonAppointment.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { services: true },
    });
    if (!apt) throw new NotFoundException('Appointment not found');

    let customer = null;
    if (apt.customerId) customer = await this.prisma.customer.findUnique({ where: { id: apt.customerId } });

    return { ...apt, customer };
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateAppointmentStatusDto) {
    const apt = await this.prisma.salonAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Appointment not found');
    if (apt.status === dto.status) return this.getOne(user, id);
    if (apt.saleId) {
      throw new BadRequestException('Is appointment ka bill ban chuka hai — tabdeeli ke liye bill return karein');
    }
    if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') {
      throw new BadRequestException('Cancel / no-show appointment dobara nahi khulti — nayi booking banayein');
    }

    // Completing posts the bill; money already taken stays as advance on khata.
    if (dto.status === 'COMPLETED') return this.checkout(user, id, { paidAmount: 0 });

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'ARRIVED') patch.arrivedAt = now;
    if (dto.status === 'IN_PROGRESS') patch.actualStart = now;
    if (dto.status === 'CANCELLED') {
      patch.cancelledAt = now;
      patch.cancellationReason = dto.cancellationReason;
    }

    return this.prisma.salonAppointment.update({ where: { id }, data: patch, include: { services: true } });
  }

  /**
   * Final bill: completes the appointment and posts one sale for services,
   * service charge, tax and tip. Advances taken earlier sit on the khata and
   * are used first; anything still owed becomes udhaar.
   */
  async checkout(user: AuthenticatedUser, id: string, dto: CheckoutAppointmentDto) {
    const apt = await this.prisma.salonAppointment.findFirst({ where: { id, tenantId: user.tenantId }, include: { services: true } });
    if (!apt) throw new NotFoundException('Appointment not found');
    if (apt.saleId) throw new BadRequestException(`${apt.appointmentNumber} ka bill pehle hi ban chuka hai`);
    if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') {
      throw new BadRequestException('Cancel / no-show appointment ka bill nahi banta');
    }

    const extraDiscount = r2(dto.discount ?? 0);
    const tip = r2(dto.tip ?? apt.tip ?? 0);
    const discount = r2(apt.discount + extraDiscount);
    const gross = r2(apt.subtotal + apt.serviceCharge + apt.taxAmount + tip);
    if (discount > gross) throw new BadRequestException('Discount bill se zyada hai');
    const total = r2(gross - discount);
    const advance = r2(apt.paidAmount);
    const due = r2(Math.max(total - advance, 0));
    const paidNow = r2(Math.max(dto.paidAmount, 0));
    const kept = r2(Math.min(paidNow, due));
    const stillOwed = r2(due - kept);

    const services = await this.prisma.salonService.findMany({
      where: { id: { in: apt.services.map((s) => s.serviceId) }, tenantId: user.tenantId },
      select: { id: true, costPrice: true },
    });
    const costOf = new Map(services.map((s) => [s.id, Number(s.costPrice) || 0]));

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, dto.shopId ?? apt.shopId);
      const customerId = apt.customerId;
      // Payments taken before advances went to khata are counted as paid with this bill.
      const legacyPaid = r2(Math.max(advance - (await paidOnKhata(tx, user.tenantId, apt.appointmentNumber)), 0));
      if (!customerId && stillOwed > 0) {
        throw new BadRequestException(`Rs ${stillOwed} baqi hai — walk-in ka poora bill lein, ya udhaar ke liye customer jorein`);
      }

      const lines = [
        ...apt.services.map((s) => ({
          label: `${s.serviceName}${s.staffName ? ` — ${s.staffName}` : ''}`,
          amount: s.total,
          cost: costOf.get(s.serviceId) ?? 0,
        })),
        { label: 'Service charge', amount: apt.serviceCharge },
        { label: 'Tax', amount: apt.taxAmount },
        // A tip is handed to the staff, so it is entered as its own cost.
        { label: 'Tip (staff)', amount: tip, cost: tip },
      ];

      const sale = await postIndustrySale(tx, user, {
        saleNumber: `SLN-${apt.appointmentNumber}`,
        sourceRef: apt.appointmentNumber,
        shopId,
        customerId,
        lines,
        discount,
        paidAmount: r2(paidNow + legacyPaid),
        paymentMethod: dto.paymentMethod,
      });

      const paidTotal = r2(advance + kept);
      const updated = await tx.salonAppointment.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          actualEnd: apt.actualEnd ?? new Date(),
          customerId,
          shopId,
          saleId: sale.id,
          tip,
          discount,
          total,
          paidAmount: paidTotal,
          paymentStatus: paidTotal >= total - 0.01 ? 'PAID' : paidTotal > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
        },
        include: { services: true },
      });

      // Running totals shown on the staff and service screens.
      for (const s of apt.services) {
        await tx.salonService.updateMany({
          where: { id: s.serviceId, tenantId: user.tenantId },
          data: { totalBookings: { increment: 1 }, totalRevenue: { increment: s.total } },
        });
        if (s.staffProfileId) {
          await tx.salonStaffProfile.updateMany({
            where: { id: s.staffProfileId, tenantId: user.tenantId },
            data: {
              totalAppointments: { increment: 1 },
              totalRevenue: { increment: s.total },
              totalCommission: { increment: s.commissionAmount },
            },
          });
        }
      }

      return { ...updated, sale: { id: sale.id, saleNumber: sale.saleNumber }, change: r2(paidNow - kept) };
    });
  }

  async reschedule(user: AuthenticatedUser, id: string, dto: RescheduleDto) {
    const apt = await this.prisma.salonAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Appointment not found');
    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(apt.status)) {
      throw new BadRequestException('Mukammal ya cancel appointment ka waqt nahi badalta');
    }
    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw new BadRequestException('Waqt sahi chunein');
    }
    const staff = await this.prisma.salonAppointmentService.findMany({ where: { appointmentId: id }, select: { staffProfileId: true } });
    await this.assertStaffFree(user.tenantId, staff.map((x) => x.staffProfileId).filter(Boolean) as string[], start, end, id);
    return this.prisma.salonAppointment.update({
      where: { id },
      data: {
        scheduledStart: new Date(dto.scheduledStart),
        scheduledEnd: new Date(dto.scheduledEnd),
        status: 'RESCHEDULED',
        internalNotes: `${apt.internalNotes || ''}\nRescheduled: ${dto.reason || 'No reason'}`.trim(),
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
    if (!apt) throw new NotFoundException('Appointment not found');
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

  /** Next APT-YYYY-NNNN number; follows the last one so gaps never repeat a number. */
  private async nextNumber(tenantId: string) {
    const year = new Date().getFullYear();
    const prefix = `APT-${year}-`;
    const last = await this.prisma.salonAppointment.findFirst({
      where: { tenantId, appointmentNumber: { startsWith: prefix } },
      orderBy: { appointmentNumber: 'desc' },
      select: { appointmentNumber: true },
    });
    const n = last ? Number(last.appointmentNumber.slice(prefix.length)) || 0 : 0;
    return `${prefix}${String(n + 1).padStart(4, '0')}`;
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
    return this.prisma.salonAppointment.findMany({
      where: {
        tenantId: user.tenantId,
        status: { notIn: ['CANCELLED'] },
        scheduledStart: {
          gte: new Date(params.from),
          lte: new Date(params.to),
        },
        ...(params.staffProfileId && { services: { some: { staffProfileId: params.staffProfileId } } }),
      },
      include: { services: true },
      orderBy: { scheduledStart: 'asc' },
    });
  }

  async submitRating(user: AuthenticatedUser, id: string, rating: number, feedback?: string) {
    const apt = await this.prisma.salonAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Appointment not found');
    return this.prisma.salonAppointment.update({
      where: { id },
      data: { customerRating: rating, customerFeedback: feedback },
    });
  }
}
