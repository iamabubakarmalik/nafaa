import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AddPaymentDto, CreateAppointmentDto, RescheduleDto, UpdateAppointmentStatusDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateAppointmentDto) {
    if (!dto.services?.length) throw new BadRequestException('At least one service required');

    const count = await this.prisma.salonAppointment.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const appointmentNumber = `APT-${year}-${String(count + 1).padStart(4, '0')}`;

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

    const serviceCharge = dto.serviceCharge ?? 0;
    const tax = dto.taxAmount ?? 0;
    const discount = dto.discount ?? 0;
    const total = Math.max(subtotal + serviceCharge + tax - discount, 0);

    return this.prisma.salonAppointment.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
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

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'ARRIVED') patch.arrivedAt = now;
    if (dto.status === 'IN_PROGRESS') patch.actualStart = now;
    if (dto.status === 'COMPLETED') patch.actualEnd = now;
    if (dto.status === 'CANCELLED') {
      patch.cancelledAt = now;
      patch.cancellationReason = dto.cancellationReason;
    }

    return this.prisma.salonAppointment.update({ where: { id }, data: patch, include: { services: true } });
  }

  async reschedule(user: AuthenticatedUser, id: string, dto: RescheduleDto) {
    const apt = await this.prisma.salonAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Appointment not found');
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

  async addPayment(user: AuthenticatedUser, id: string, dto: AddPaymentDto) {
    const apt = await this.prisma.salonAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Appointment not found');

    const newPaid = apt.paidAmount + dto.amount;
    let paymentStatus = 'PARTIALLY_PAID';
    if (newPaid >= apt.total) paymentStatus = 'PAID';
    if (newPaid <= 0) paymentStatus = 'UNPAID';

    return this.prisma.salonAppointment.update({
      where: { id },
      data: { paidAmount: newPaid, paymentStatus },
      include: { services: true },
    });
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
