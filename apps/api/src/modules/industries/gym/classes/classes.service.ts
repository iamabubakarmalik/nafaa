import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    return this.prisma.gymClass.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        scheduledStart: new Date(dto.scheduledStart),
        scheduledEnd: new Date(dto.scheduledEnd),
        recurrenceEndDate: dto.recurrenceEndDate ? new Date(dto.recurrenceEndDate) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { classType?: string; status?: string; trainerId?: string; from?: string; to?: string }) {
    return this.prisma.gymClass.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.classType && { classType: params.classType as any }),
        ...(params.status && { status: params.status as any }),
        ...(params.trainerId && { trainerId: params.trainerId }),
        ...(params.from || params.to ? {
          scheduledStart: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
      },
      include: { trainer: true, bookings: true },
      orderBy: { scheduledStart: 'asc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.gymClass.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { trainer: true, bookings: true },
    });
    if (!c) throw new NotFoundException('Class not found');
    return c;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    return this.prisma.gymClass.update({
      where: { id },
      data: {
        ...dto,
        scheduledStart: dto.scheduledStart ? new Date(dto.scheduledStart) : undefined,
        scheduledEnd: dto.scheduledEnd ? new Date(dto.scheduledEnd) : undefined,
      },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string, cancelledReason?: string) {
    const patch: any = { status };
    if (status === 'IN_PROGRESS') patch.actualStart = new Date();
    if (status === 'COMPLETED') patch.actualEnd = new Date();
    if (status === 'CANCELLED') patch.cancelledReason = cancelledReason;
    return this.prisma.gymClass.update({ where: { id }, data: patch });
  }

  async book(user: AuthenticatedUser, classId: string, memberId: string) {
    const cls = await this.prisma.gymClass.findFirst({ where: { id: classId, tenantId: user.tenantId } });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.currentEnrolled >= cls.maxParticipants) throw new BadRequestException('Class is full');

    const dup = await this.prisma.gymClassBooking.findFirst({ where: { classId, memberId } });
    if (dup) throw new BadRequestException('Already booked');

    const count = await this.prisma.gymClassBooking.count({ where: { tenantId: user.tenantId } });
    const bookingNumber = 'CB-' + new Date().getFullYear() + '-' + String(count + 1).padStart(5, '0');

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.gymClassBooking.create({
        data: {
          tenantId: user.tenantId,
          classId,
          memberId,
          bookingNumber,
          price: cls.memberPrice,
        },
      });
      await tx.gymClass.update({
        where: { id: classId },
        data: { currentEnrolled: { increment: 1 } },
      });
      return booking;
    });
  }

  async cancelBooking(user: AuthenticatedUser, bookingId: string, reason?: string) {
    const b = await this.prisma.gymClassBooking.findFirst({ where: { id: bookingId, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Booking not found');
    return this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.gymClassBooking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason },
      });
      await tx.gymClass.update({
        where: { id: b.classId },
        data: { currentEnrolled: { decrement: 1 } },
      });
      return cancelled;
    });
  }

  async checkIn(user: AuthenticatedUser, bookingId: string) {
    return this.prisma.gymClassBooking.update({
      where: { id: bookingId },
      data: { status: 'ATTENDED', checkedInAt: new Date(), attended: true },
    });
  }

  async calendar(user: AuthenticatedUser, from: string, to: string) {
    return this.prisma.gymClass.findMany({
      where: {
        tenantId: user.tenantId,
        scheduledStart: { gte: new Date(from), lte: new Date(to) },
        status: { notIn: ['CANCELLED'] },
      },
      include: { trainer: true },
      orderBy: { scheduledStart: 'asc' },
    });
  }
}
