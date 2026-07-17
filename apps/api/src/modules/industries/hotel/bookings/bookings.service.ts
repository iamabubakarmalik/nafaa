import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.rooms?.length) throw new BadRequestException('At least one room required');

    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);
    if (checkOut <= checkIn) throw new BadRequestException('Invalid dates');

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    const count = await this.prisma.hotelBooking.count({ where: { tenantId: user.tenantId } });
    const bookingNumber = 'BK-' + new Date().getFullYear() + '-' + String(count + 1).padStart(5, '0');
    const confirmationCode = 'HTL' + Date.now().toString(36).toUpperCase();

    // Enrich rooms
    const roomTypeIds = dto.rooms.map((r: any) => r.roomTypeId).filter(Boolean);
    const roomTypes = await this.prisma.hotelRoomType.findMany({ where: { id: { in: roomTypeIds } } });
    const roomTypeMap = new Map(roomTypes.map((rt) => [rt.id, rt]));

    let roomTotal = 0;
    const bookedRooms = dto.rooms.map((r: any) => {
      const rt = roomTypeMap.get(r.roomTypeId);
      if (!rt) throw new BadRequestException(`Room type ${r.roomTypeId} not found`);
      const rate = r.ratePerNight ?? rt.basePrice;
      const total = rate * nights;
      roomTotal += total - (r.discount ?? 0);
      return {
        roomId: r.roomId,
        roomTypeId: r.roomTypeId,
        roomNumber: r.roomNumber,
        ratePerNight: rate,
        totalNights: nights,
        totalAmount: total,
        adults: r.adults ?? 1,
        children: r.children ?? 0,
        extraBeds: r.extraBeds ?? 0,
        isComplimentary: r.isComplimentary ?? false,
        discount: r.discount ?? 0,
        notes: r.notes,
      };
    });

    const taxAmount = Number(dto.taxAmount) || 0;
    const serviceCharge = Number(dto.serviceCharge) || 0;
    const discount = Number(dto.discount) || 0;
    const extraCharges = Number(dto.extraCharges) || 0;
    const grandTotal = Math.max(roomTotal + taxAmount + serviceCharge + extraCharges - discount, 0);
    const advancePaid = Number(dto.advancePaid) || 0;
    const balanceAmount = Math.max(grandTotal - advancePaid, 0);

    return this.prisma.hotelBooking.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        bookingNumber,
        confirmationCode,
        primaryGuestId: dto.primaryGuestId,
        guestName: dto.guestName,
        guestPhone: dto.guestPhone,
        guestEmail: dto.guestEmail,
        totalAdults: dto.totalAdults ?? 1,
        totalChildren: dto.totalChildren ?? 0,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        nights,
        earlyCheckIn: dto.earlyCheckIn ?? false,
        lateCheckOut: dto.lateCheckOut ?? false,
        source: dto.source ?? 'DIRECT',
        sourceRef: dto.sourceRef,
        bookedBy: dto.bookedBy,
        agentName: dto.agentName,
        agentCommission: Number(dto.agentCommission) || 0,
        mealPlan: dto.mealPlan ?? 'ROOM_ONLY',
        roomTotal,
        taxAmount,
        serviceCharge,
        discount,
        extraCharges,
        grandTotal,
        advancePaid,
        paidAmount: advancePaid,
        balanceAmount,
        paymentStatus: balanceAmount <= 0 ? 'PAID' : advancePaid > 0 ? 'PARTIAL' : 'UNPAID',
        specialRequests: dto.specialRequests,
        arrivalTime: dto.arrivalTime,
        purposeOfVisit: dto.purposeOfVisit,
        notes: dto.notes,
        status: dto.status ?? 'CONFIRMED',
        createdById: user.id,
        bookedRooms: { create: bookedRooms },
      },
      include: { bookedRooms: true },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; source?: string; guestId?: string; from?: string; to?: string; search?: string; upcomingOnly?: boolean }) {
    const now = new Date();
    return this.prisma.hotelBooking.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.source && { source: params.source as any }),
        ...(params.guestId && { primaryGuestId: params.guestId }),
        ...(params.upcomingOnly && { checkInDate: { gte: now } }),
        ...(params.from || params.to ? {
          checkInDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { bookingNumber: { contains: params.search, mode: 'insensitive' } },
            { confirmationCode: { contains: params.search, mode: 'insensitive' } },
            { guestName: { contains: params.search, mode: 'insensitive' } },
            { guestPhone: { contains: params.search } },
          ],
        }),
      },
      include: { bookedRooms: true },
      orderBy: { checkInDate: 'desc' },
      take: 300,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.hotelBooking.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        bookedRooms: true,
        folioCharges: { orderBy: { chargeDate: 'desc' } },
      },
    });
    if (!b) throw new NotFoundException('Booking not found');

    // Fetch room types
    const roomTypeIds = [...new Set(b.bookedRooms.map((r) => r.roomTypeId))];
    const roomTypes = await this.prisma.hotelRoomType.findMany({ where: { id: { in: roomTypeIds } } });
    const rtMap = new Map(roomTypes.map((rt) => [rt.id, rt]));

    // Fetch rooms
    const roomIds = b.bookedRooms.map((r) => r.roomId).filter(Boolean) as string[];
    const rooms = await this.prisma.hotelRoom.findMany({ where: { id: { in: roomIds } } });
    const roomMap = new Map(rooms.map((r) => [r.id, r]));

    return {
      ...b,
      bookedRooms: b.bookedRooms.map((r) => ({
        ...r,
        roomType: rtMap.get(r.roomTypeId),
        room: r.roomId ? roomMap.get(r.roomId) : null,
      })),
    };
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string, reason?: string) {
    const b = await this.prisma.hotelBooking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Booking not found');
    const patch: any = { status };
    if (status === 'CANCELLED') {
      patch.cancelledAt = new Date();
      patch.cancellationReason = reason;
      patch.cancelledBy = user.id;
    }
    return this.prisma.hotelBooking.update({ where: { id }, data: patch, include: { bookedRooms: true } });
  }

  async checkIn(user: AuthenticatedUser, id: string) {
    const booking = await this.prisma.hotelBooking.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { bookedRooms: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === 'CHECKED_IN') throw new BadRequestException('Already checked in');

    return this.prisma.$transaction(async (tx) => {
      // Mark rooms as OCCUPIED
      for (const br of booking.bookedRooms) {
        if (br.roomId) {
          await tx.hotelRoom.update({
            where: { id: br.roomId },
            data: { status: 'OCCUPIED' },
          });
        }
      }
      return tx.hotelBooking.update({
        where: { id },
        data: {
          status: 'CHECKED_IN',
          actualCheckIn: new Date(),
          checkedInBy: user.id,
        },
        include: { bookedRooms: true },
      });
    });
  }

  async checkOut(user: AuthenticatedUser, id: string) {
    const booking = await this.prisma.hotelBooking.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { bookedRooms: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'CHECKED_IN') throw new BadRequestException('Not checked in');

    if (booking.balanceAmount > 0) {
      throw new BadRequestException(`Outstanding balance: ${booking.balanceAmount}. Please collect payment before checkout.`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Mark rooms as CLEANING
      for (const br of booking.bookedRooms) {
        if (br.roomId) {
          await tx.hotelRoom.update({
            where: { id: br.roomId },
            data: { status: 'CLEANING', housekeepingStatus: 'DIRTY' },
          });
        }
      }

      // Update guest stats
      if (booking.primaryGuestId) {
        await tx.hotelGuest.update({
          where: { id: booking.primaryGuestId },
          data: {
            totalStays: { increment: 1 },
            totalNights: { increment: booking.nights },
            totalSpent: { increment: booking.grandTotal },
            lastStayAt: new Date(),
          },
        });
      }

      return tx.hotelBooking.update({
        where: { id },
        data: {
          status: 'CHECKED_OUT',
          actualCheckOut: new Date(),
          checkedOutBy: user.id,
        },
        include: { bookedRooms: true },
      });
    });
  }

  async addPayment(user: AuthenticatedUser, id: string, amount: number) {
    const b = await this.prisma.hotelBooking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Booking not found');
    const newPaid = b.paidAmount + amount;
    const balance = Math.max(b.grandTotal - newPaid, 0);
    let paymentStatus = 'PARTIAL';
    if (balance <= 0.01) paymentStatus = 'PAID';
    if (newPaid <= 0) paymentStatus = 'UNPAID';
    return this.prisma.hotelBooking.update({
      where: { id },
      data: { paidAmount: newPaid, balanceAmount: balance, paymentStatus },
      include: { bookedRooms: true },
    });
  }

  async extendStay(user: AuthenticatedUser, id: string, newCheckOutDate: string) {
    const b = await this.prisma.hotelBooking.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { bookedRooms: true },
    });
    if (!b) throw new NotFoundException('Booking not found');

    const newCheckOut = new Date(newCheckOutDate);
    if (newCheckOut <= b.checkOutDate) throw new BadRequestException('New date must be after current checkout');

    const extraNights = Math.ceil((newCheckOut.getTime() - b.checkOutDate.getTime()) / (1000 * 60 * 60 * 24));
    const extraRoomCost = b.bookedRooms.reduce((s, r) => s + (r.ratePerNight * extraNights), 0);

    const newGrandTotal = b.grandTotal + extraRoomCost;
    const newBalance = Math.max(newGrandTotal - b.paidAmount, 0);

    return this.prisma.hotelBooking.update({
      where: { id },
      data: {
        checkOutDate: newCheckOut,
        nights: b.nights + extraNights,
        roomTotal: b.roomTotal + extraRoomCost,
        grandTotal: newGrandTotal,
        balanceAmount: newBalance,
        paymentStatus: newBalance <= 0 ? 'PAID' : b.paidAmount > 0 ? 'PARTIAL' : 'UNPAID',
        status: 'EXTENDED',
      },
      include: { bookedRooms: true },
    });
  }

  async arrivalsToday(user: AuthenticatedUser) {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));
    return this.prisma.hotelBooking.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'CONFIRMED',
        checkInDate: { gte: start, lte: end },
      },
      include: { bookedRooms: true },
      orderBy: { arrivalTime: 'asc' },
    });
  }

  async departuresToday(user: AuthenticatedUser) {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));
    return this.prisma.hotelBooking.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'CHECKED_IN',
        checkOutDate: { gte: start, lte: end },
      },
      include: { bookedRooms: true },
      orderBy: { checkOutDate: 'asc' },
    });
  }

  async inHouseGuests(user: AuthenticatedUser) {
    return this.prisma.hotelBooking.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'CHECKED_IN',
      },
      include: { bookedRooms: true },
      orderBy: { checkInDate: 'desc' },
    });
  }
}
