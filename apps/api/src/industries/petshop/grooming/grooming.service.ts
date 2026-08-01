import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import {
  CheckInDto, CompleteGroomingDto, CreateGroomingAppointmentDto,
  GroomingPaymentDto, RateGroomingDto, UpdateGroomingStatusDto,
} from './dto/create-appointment.dto';

@Injectable()
export class GroomingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateGroomingAppointmentDto) {
    const count = await this.prisma.petGroomingAppointment.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const appointmentNumber = `GRM-${year}-${String(count + 1).padStart(5, '0')}`;

    let groomerName: string | undefined;
    if (dto.groomerId) {
      const g = await this.prisma.petGroomer.findFirst({ where: { id: dto.groomerId, tenantId: user.tenantId } });
      if (!g) throw new NotFoundException('Groomer not found');
      if (!g.isActive) throw new BadRequestException('Groomer is not active');
      groomerName = g.name;
    }

    const scheduledDate = new Date(dto.scheduledDate);

    // Prevent double booking
    if (dto.groomerId && dto.scheduledSlot) {
      const dayStart = new Date(scheduledDate); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(scheduledDate); dayEnd.setHours(23, 59, 59, 999);
      const clash = await this.prisma.petGroomingAppointment.findFirst({
        where: {
          tenantId: user.tenantId,
          groomerId: dto.groomerId,
          scheduledSlot: dto.scheduledSlot,
          scheduledDate: { gte: dayStart, lte: dayEnd },
          status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
        },
      });
      if (clash) throw new BadRequestException(`Slot ${dto.scheduledSlot} already booked for this groomer`);
    }

    const additionalCharges = dto.additionalCharges ?? 0;
    const discount = dto.discount ?? 0;
    const totalFee = Math.max(dto.serviceFee + additionalCharges - discount, 0);

    return this.prisma.petGroomingAppointment.create({
      data: {
        tenantId: user.tenantId,
        appointmentNumber,
        ...dto,
        additionalServices: dto.additionalServices ?? [],
        scheduledDate,
        groomerName,
        additionalCharges,
        discount,
        totalFee,
        status: 'SCHEDULED',
      },
    });
  }

  async list(user: AuthenticatedUser, params: {
    status?: string; customerId?: string; groomerId?: string; species?: string;
    today?: boolean; from?: string; to?: string; search?: string;
  }) {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    return this.prisma.petGroomingAppointment.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.groomerId && { groomerId: params.groomerId }),
        ...(params.species && { petSpecies: params.species as any }),
        ...(params.today ? { scheduledDate: { gte: todayStart, lte: todayEnd } } : {}),
        ...(!params.today && (params.from || params.to) ? {
          scheduledDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { appointmentNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { petName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ scheduledDate: 'asc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');

    let history: any[] = [];
    if (a.customerId) {
      history = await this.prisma.petGroomingAppointment.findMany({
        where: { tenantId: user.tenantId, customerId: a.customerId, id: { not: id }, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 10,
      });
    }

    const durationMinutes = a.startedAt && a.completedAt
      ? Math.round((new Date(a.completedAt).getTime() - new Date(a.startedAt).getTime()) / 60000)
      : null;

    return { ...a, previousVisits: history, computed: { durationMinutes, balance: Math.max(a.totalFee - a.paidAmount, 0) } };
  }

  async assignGroomer(user: AuthenticatedUser, id: string, groomerId: string) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');

    const g = await this.prisma.petGroomer.findFirst({ where: { id: groomerId, tenantId: user.tenantId } });
    if (!g) throw new NotFoundException('Groomer not found');

    return this.prisma.petGroomingAppointment.update({
      where: { id },
      data: { groomerId, groomerName: g.name, status: 'CONFIRMED' },
    });
  }

  async checkIn(user: AuthenticatedUser, id: string, dto: CheckInDto) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');

    return this.prisma.petGroomingAppointment.update({
      where: { id },
      data: {
        checkedInAt: new Date(),
        photosBeforeUrls: dto.photosBeforeUrls ?? a.photosBeforeUrls,
        groomerNotes: dto.notes ? ((a.groomerNotes || '') + '\n' + dto.notes).trim() : a.groomerNotes,
        status: 'CONFIRMED',
      },
    });
  }

  async start(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');
    if (a.status === 'COMPLETED') throw new BadRequestException('Already completed');

    return this.prisma.petGroomingAppointment.update({
      where: { id },
      data: { status: 'IN_PROGRESS', startedAt: new Date(), checkedInAt: a.checkedInAt ?? new Date() },
    });
  }

  async complete(user: AuthenticatedUser, id: string, dto: CompleteGroomingDto) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');

    const additionalCharges = dto.additionalCharges ?? a.additionalCharges;
    const discount = dto.discount ?? a.discount;
    const totalFee = Math.max(a.serviceFee + additionalCharges - discount, 0);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.petGroomingAppointment.update({
        where: { id },
        data: {
          status: 'READY_FOR_PICKUP',
          completedAt: new Date(),
          photosAfterUrls: dto.photosAfterUrls ?? a.photosAfterUrls,
          additionalCharges,
          discount,
          totalFee,
          groomerNotes: dto.groomerNotes ? ((a.groomerNotes || '') + '\n' + dto.groomerNotes).trim() : a.groomerNotes,
        },
      });

      if (a.groomerId) {
        await tx.petGroomer.update({
          where: { id: a.groomerId },
          data: {
            completedAppointments: { increment: 1 },
            totalRevenue: { increment: totalFee },
          },
        });
      }
      return updated;
    });
  }

  async pickup(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');
    if (a.paidAmount < a.totalFee) {
      throw new BadRequestException(`Outstanding balance of ${a.totalFee - a.paidAmount} must be cleared`);
    }

    return this.prisma.petGroomingAppointment.update({
      where: { id },
      data: { status: 'COMPLETED', pickedUpAt: new Date() },
    });
  }

  async recordPayment(user: AuthenticatedUser, id: string, dto: GroomingPaymentDto) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');

    const newPaid = a.paidAmount + dto.amount;
    if (newPaid > a.totalFee) throw new BadRequestException('Payment exceeds total fee');

    return this.prisma.petGroomingAppointment.update({
      where: { id },
      data: { paidAmount: newPaid, paymentMethod: dto.paymentMethod ?? a.paymentMethod },
    });
  }

  async rate(user: AuthenticatedUser, id: string, dto: RateGroomingDto) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');
    if (dto.rating < 1 || dto.rating > 5) throw new BadRequestException('Rating must be 1-5');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.petGroomingAppointment.update({
        where: { id },
        data: { customerRating: dto.rating, customerFeedback: dto.feedback },
      });

      if (a.groomerId) {
        const rated = await tx.petGroomingAppointment.findMany({
          where: { groomerId: a.groomerId, customerRating: { not: null } },
          select: { customerRating: true },
        });
        const avg = rated.reduce((s, r) => s + (r.customerRating ?? 0), 0) / (rated.length || 1);
        await tx.petGroomer.update({ where: { id: a.groomerId }, data: { avgRating: Number(avg.toFixed(2)) } });
      }
      return updated;
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateGroomingStatusDto) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');

    const patch: any = { status: dto.status };
    if (dto.rescheduledDate) {
      patch.scheduledDate = new Date(dto.rescheduledDate);
      patch.status = 'SCHEDULED';
    }
    if (dto.reason) patch.groomerNotes = ((a.groomerNotes || '') + `\n[${dto.status}] ${dto.reason}`).trim();

    return this.prisma.petGroomingAppointment.update({ where: { id }, data: patch });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.petGroomingAppointment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Appointment not found');
    if (['IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED'].includes(a.status)) {
      throw new BadRequestException(`Cannot delete an appointment in ${a.status}`);
    }
    return this.prisma.petGroomingAppointment.delete({ where: { id } });
  }

  async availableSlots(user: AuthenticatedUser, groomerId: string, date: string) {
    const g = await this.prisma.petGroomer.findFirst({ where: { id: groomerId, tenantId: user.tenantId } });
    if (!g) throw new NotFoundException('Groomer not found');

    const day = new Date(date);
    if (!g.workingDays.includes(day.getDay())) {
      return { available: [], booked: [], reason: 'Groomer not working on this day' };
    }

    const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);

    const booked = await this.prisma.petGroomingAppointment.findMany({
      where: {
        tenantId: user.tenantId,
        groomerId,
        scheduledDate: { gte: dayStart, lte: dayEnd },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      },
      select: { scheduledSlot: true, petName: true, serviceType: true },
    });
    const bookedSlots = booked.map((b) => b.scheduledSlot).filter(Boolean) as string[];

    const [sh, sm] = g.workStartTime.split(':').map(Number);
    const [eh, em] = g.workEndTime.split(':').map(Number);
    const slots: string[] = [];
    let cur = sh * 60 + sm;
    const end = eh * 60 + em;
    while (cur + 60 <= end) {
      slots.push(`${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`);
      cur += 60;
    }

    return {
      groomer: { id: g.id, name: g.name, perServiceRate: g.perServiceRate },
      available: slots.filter((s) => !bookedSlots.includes(s)),
      booked,
      workHours: { start: g.workStartTime, end: g.workEndTime },
    };
  }

  async todaySchedule(user: AuthenticatedUser) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return this.prisma.petGroomingAppointment.findMany({
      where: { tenantId: user.tenantId, scheduledDate: { gte: start, lte: end } },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async summary(user: AuthenticatedUser) {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [scheduled, inProgress, readyForPickup, todayCount, monthRevenue, unpaid] = await Promise.all([
      this.prisma.petGroomingAppointment.count({ where: { tenantId: user.tenantId, status: { in: ['SCHEDULED', 'CONFIRMED'] } } }),
      this.prisma.petGroomingAppointment.count({ where: { tenantId: user.tenantId, status: 'IN_PROGRESS' } }),
      this.prisma.petGroomingAppointment.count({ where: { tenantId: user.tenantId, status: 'READY_FOR_PICKUP' } }),
      this.prisma.petGroomingAppointment.count({ where: { tenantId: user.tenantId, scheduledDate: { gte: todayStart, lte: todayEnd } } }),
      this.prisma.petGroomingAppointment.aggregate({
        where: { tenantId: user.tenantId, completedAt: { gte: monthStart } },
        _sum: { totalFee: true, paidAmount: true }, _count: { _all: true },
      }),
      this.prisma.petGroomingAppointment.count({
        where: { tenantId: user.tenantId, status: { in: ['READY_FOR_PICKUP', 'COMPLETED'] }, paidAmount: { lt: this.prisma.petGroomingAppointment.fields.totalFee } as any },
      }).catch(() => 0),
    ]);

    return {
      scheduled, inProgress, readyForPickup, todayCount, unpaidCount: unpaid,
      monthly: {
        count: monthRevenue._count._all,
        billed: monthRevenue._sum.totalFee ?? 0,
        collected: monthRevenue._sum.paidAmount ?? 0,
      },
    };
  }
}
