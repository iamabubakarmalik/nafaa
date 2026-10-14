import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { endOfDayTz, startOfDayTz } from '../../../common/helpers/business-time.helper';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
/** Bookings that hold their rooms for the stay dates. */
const HOLDING = ['TENTATIVE', 'CONFIRMED', 'CHECKED_IN', 'EXTENDED'] as const;
/** Bookings whose guests are in the hotel now (EXTENDED is kept for older rows). */
const IN_HOUSE = ['CHECKED_IN', 'EXTENDED'] as const;

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.rooms?.length) throw new BadRequestException('At least one room required');

    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);
    if (checkOut <= checkIn) throw new BadRequestException('Invalid dates');

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    const yearPrefix = 'BK-' + new Date().getFullYear() + '-';
    const lastBooking = await this.prisma.hotelBooking.findFirst({
      where: { tenantId: user.tenantId, bookingNumber: { startsWith: yearPrefix } },
      orderBy: { bookingNumber: 'desc' },
      select: { bookingNumber: true },
    });
    const bookingNumber = yearPrefix + String((lastBooking ? Number(lastBooking.bookingNumber.slice(yearPrefix.length)) || 0 : 0) + 1).padStart(5, '0');
    const confirmationCode = 'HTL' + Date.now().toString(36).toUpperCase();

    // Enrich rooms
    const roomTypeIds = dto.rooms.map((r: any) => r.roomTypeId).filter(Boolean);
    const roomTypes = await this.prisma.hotelRoomType.findMany({ where: { id: { in: roomTypeIds }, tenantId: user.tenantId } });
    const pickedRoomIds = dto.rooms.map((r: any) => r.roomId).filter(Boolean) as string[];
    if (new Set(pickedRoomIds).size !== pickedRoomIds.length) throw new BadRequestException('Ek room do dafa chuna gaya hai');
    const pickedRooms = await this.prisma.hotelRoom.findMany({ where: { id: { in: pickedRoomIds }, tenantId: user.tenantId } });
    if (pickedRooms.length !== pickedRoomIds.length) throw new BadRequestException('Room nahi mila');
    await this.assertRoomsFree(user.tenantId, pickedRoomIds, checkIn, checkOut);
    const roomTypeMap = new Map(roomTypes.map((rt) => [rt.id, rt]));
    const pickedById = new Map(pickedRooms.map((r) => [r.id, r]));
    for (const r of dto.rooms) {
      const room = r.roomId ? pickedById.get(r.roomId) : null;
      if (room) {
        if (r.roomTypeId && room.roomTypeId !== r.roomTypeId) throw new BadRequestException(`Room ${room.roomNumber} is type ka nahi`);
        r.roomTypeId = room.roomTypeId;
        r.roomNumber = room.roomNumber;
      }
    }

    // "Any room of this type": give it a free room now, so check-in marks it
    // occupied and nobody else can book it for the same nights.
    const taken = new Set(pickedRoomIds);
    const unassigned = dto.rooms.filter((x: any) => !x.roomId);
    if (unassigned.length) {
      const held = await this.prisma.hotelBookedRoom.findMany({
        where: {
          roomId: { not: null },
          booking: { tenantId: user.tenantId, status: { in: [...HOLDING] }, checkInDate: { lt: checkOut }, checkOutDate: { gt: checkIn } },
        },
        select: { roomId: true },
      });
      held.forEach((h) => h.roomId && taken.add(h.roomId));
    }
    for (const r of unassigned) {
      const free = await this.prisma.hotelRoom.findFirst({
        where: {
          tenantId: user.tenantId, roomTypeId: r.roomTypeId, isActive: true,
          status: { notIn: ['MAINTENANCE', 'OUT_OF_ORDER'] }, id: { notIn: [...taken] },
        },
        orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
      });
      if (!free) throw new BadRequestException(`${roomTypeMap.get(r.roomTypeId)?.name ?? 'Is type'} ka koi room in dates me khali nahi`);
      r.roomId = free.id;
      r.roomNumber = free.roomNumber;
      taken.add(free.id);
    }

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
    const advancePaid = r2(Math.max(Number(dto.advancePaid) || 0, 0));
    if (advancePaid > grandTotal + 0.01) throw new BadRequestException(`Advance kul bill (Rs ${r2(grandTotal)}) se zyada hai`);
    const balanceAmount = Math.max(grandTotal - advancePaid, 0);

    return this.prisma.$transaction(async (tx) => {
     const shopId = await resolveIndustryShopId(tx, user, dto.shopId);
     const customerId = advancePaid > 0
       ? await this.guestCustomer(tx, user, { primaryGuestId: dto.primaryGuestId, guestName: dto.guestName, guestPhone: dto.guestPhone, shopId })
       : null;
     const created = await tx.hotelBooking.create({
      data: {
        tenantId: user.tenantId,
        shopId,
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
     // Advance is the guest's money until checkout, so it is held on khata.
     if (advancePaid > 0 && customerId) {
       await recordKhataPayment(tx, user, {
         customerId, shopId, amount: advancePaid, reference: bookingNumber, method: dto.paymentMethod,
         note: `Hotel advance: ${bookingNumber}`,
       });
     }
     return created;
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
    const roomTypes = await this.prisma.hotelRoomType.findMany({ where: { id: { in: roomTypeIds }, tenantId: user.tenantId } });
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
    if (['CHECKED_IN', 'CHECKED_OUT', 'EXTENDED'].includes(status)) {
      throw new BadRequestException('Check-in / check-out ke button istemal karein');
    }
    if (['CHECKED_IN', 'EXTENDED', 'CHECKED_OUT'].includes(b.status)) {
      throw new BadRequestException('Guest andar aa chuka hai — ab status yahan se nahi badalta');
    }
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
    if (!['CONFIRMED', 'TENTATIVE', 'INQUIRY', 'QUOTED'].includes(booking.status)) {
      throw new BadRequestException(`Ye booking ${booking.status} hai — check-in nahi ho sakta`);
    }
    const roomIds = booking.bookedRooms.map((r) => r.roomId).filter(Boolean) as string[];
    const busy = await this.prisma.hotelRoom.findFirst({
      where: { id: { in: roomIds }, tenantId: user.tenantId, status: { in: ['OCCUPIED', 'MAINTENANCE', 'OUT_OF_ORDER'] } },
      select: { roomNumber: true, status: true },
    });
    if (busy) throw new BadRequestException(`Room ${busy.roomNumber} abhi ${busy.status} hai`);

    return this.prisma.$transaction(async (tx) => {
      // Mark rooms as OCCUPIED
      for (const br of booking.bookedRooms) {
        if (br.roomId) {
          await tx.hotelRoom.updateMany({
            where: { id: br.roomId, tenantId: user.tenantId },
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

  /**
   * Checkout posts the final bill as one sale: room nights, folio charges,
   * tax and service charge, less the discount. Advances are already on the
   * guest's khata and are used first; money taken now is `paidAmount`.
   * Anything still owed needs a guest khata (company / regular guest).
   */
  async checkOut(user: AuthenticatedUser, id: string, dto: { paidAmount?: number; paymentMethod?: string } = {}) {
    const booking = await this.prisma.hotelBooking.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { bookedRooms: true, folioCharges: { where: { isVoid: false } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (!(IN_HOUSE as readonly string[]).includes(booking.status)) throw new BadRequestException('Guest ka check-in nahi hua');

    const due = r2(Math.max(booking.grandTotal - booking.paidAmount, 0));
    const paidNow = r2(Math.max(Number(dto.paidAmount) || 0, 0));
    const kept = r2(Math.min(paidNow, due));
    const stillOwed = r2(due - kept);

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, booking.shopId);
      // Bookings paid before advances went to khata: that money is counted with this bill.
      const legacyPaid = r2(Math.max(booking.paidAmount - (await paidOnKhata(tx, user.tenantId, booking.bookingNumber)), 0));
      let customerId: string | null = null;
      if (booking.paidAmount - legacyPaid > 0 || stillOwed > 0) {
        customerId = await this.guestCustomer(tx, user, {
          primaryGuestId: booking.primaryGuestId, guestName: booking.guestName, guestPhone: booking.guestPhone, shopId,
          requireExisting: stillOwed > 0 && booking.paidAmount - legacyPaid <= 0,
        });
      }
      if (stillOwed > 0 && !customerId) {
        throw new BadRequestException(`Baqi Rs ${stillOwed} hai — pehle payment lein`);
      }

      const roomLines = booking.bookedRooms.map((r) => ({
        label: `Room ${r.roomNumber ?? ''} × ${r.totalNights} raat @ ${r.ratePerNight}`.replace('Room  ×', 'Room ×'),
        amount: r2(r.totalAmount - (r.discount || 0)),
      }));
      // Room totals on older bookings may differ from the per-room rows; the booking total wins.
      const roomSum = r2(roomLines.reduce((a, l) => a + l.amount, 0));
      if (Math.abs(roomSum - booking.roomTotal) > 0.01) {
        roomLines.push({ label: 'Room adjustment', amount: r2(booking.roomTotal - roomSum) });
      }
      const folioSum = r2(booking.folioCharges.reduce((a, c) => a + c.totalAmount, 0));
      const lines = [
        ...roomLines.filter((l) => l.amount > 0),
        ...booking.folioCharges.map((c) => ({ label: `${c.description || c.chargeType} (${c.chargeNumber})`, amount: c.totalAmount })),
        // Extra charges entered on the booking itself (not as folio lines).
        { label: 'Extra charges', amount: r2(booking.extraCharges - folioSum) },
        { label: 'Service charge', amount: booking.serviceCharge },
        { label: 'Tax', amount: booking.taxAmount },
      ];
      const linesTotal = r2(lines.reduce((a, l) => a + Math.max(l.amount, 0), 0));

      const sale = await postIndustrySale(tx, user, {
        saleNumber: `HTL-${booking.bookingNumber}`,
        sourceRef: booking.bookingNumber,
        shopId,
        customerId,
        lines: lines.map((l) => ({ ...l, amount: Math.max(l.amount, 0) })),
        // Whatever separates the line sum from the bill total is the booking discount.
        discount: r2(Math.max(linesTotal - booking.grandTotal, 0)),
        paidAmount: r2(paidNow + legacyPaid),
        paymentMethod: dto.paymentMethod,
      });

      for (const br of booking.bookedRooms) {
        if (br.roomId) {
          await tx.hotelRoom.updateMany({
            where: { id: br.roomId, tenantId: user.tenantId },
            data: { status: 'CLEANING', housekeepingStatus: 'DIRTY' },
          });
        }
      }

      if (booking.primaryGuestId) {
        await tx.hotelGuest.updateMany({
          where: { id: booking.primaryGuestId, tenantId: user.tenantId },
          data: {
            totalStays: { increment: 1 },
            totalNights: { increment: booking.nights },
            totalSpent: { increment: booking.grandTotal },
            lastStayAt: new Date(),
          },
        });
      }

      const paidTotal = r2(booking.paidAmount + kept);
      const updated = await tx.hotelBooking.update({
        where: { id },
        data: {
          status: 'CHECKED_OUT',
          actualCheckOut: new Date(),
          checkedOutBy: user.id,
          paidAmount: paidTotal,
          balanceAmount: r2(Math.max(booking.grandTotal - paidTotal, 0)),
          paymentStatus: paidTotal >= booking.grandTotal - 0.01 ? 'PAID' : paidTotal > 0 ? 'PARTIAL' : 'UNPAID',
        },
        include: { bookedRooms: true },
      });
      return { ...updated, sale: { id: sale.id, saleNumber: sale.saleNumber }, change: r2(paidNow - kept) };
    });
  }

  /** Customer khata that holds a guest's advance or udhaar; links the guest profile to it. */
  private async guestCustomer(
    tx: any,
    user: AuthenticatedUser,
    g: { primaryGuestId?: string | null; guestName?: string | null; guestPhone?: string | null; shopId: string; requireExisting?: boolean },
  ): Promise<string | null> {
    const guest = g.primaryGuestId
      ? await tx.hotelGuest.findFirst({ where: { id: g.primaryGuestId, tenantId: user.tenantId } })
      : null;
    if (guest?.customerId) return guest.customerId;
    if (g.requireExisting) return null;
    const customerId = await ensureCustomer(tx, user, {
      name: guest?.fullName || g.guestName, phone: guest?.phone || g.guestPhone, shopId: g.shopId,
    });
    if (guest) await tx.hotelGuest.update({ where: { id: guest.id }, data: { customerId } });
    return customerId;
  }

  /** A room cannot hold two bookings for overlapping nights. */
  private async assertRoomsFree(tenantId: string, roomIds: string[], from: Date, to: Date, exceptBookingId?: string) {
    if (!roomIds.length) return;
    const clash = await this.prisma.hotelBookedRoom.findFirst({
      where: {
        roomId: { in: roomIds },
        booking: {
          tenantId,
          ...(exceptBookingId && { id: { not: exceptBookingId } }),
          status: { in: [...HOLDING] },
          checkInDate: { lt: to },
          checkOutDate: { gt: from },
        },
      },
      include: { booking: { select: { bookingNumber: true } } },
    });
    if (clash) {
      throw new BadRequestException(`Room ${clash.roomNumber ?? ''} in dates me ${clash.booking.bookingNumber} ke paas hai`);
    }
  }

  /** Payment against a booking: held on the guest's khata (advance before checkout, udhaar after). Method left out is cash. */
  async addPayment(user: AuthenticatedUser, id: string, amount: number, paymentMethod?: string) {
    const b = await this.prisma.hotelBooking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status === 'CANCELLED' || b.status === 'NO_SHOW') throw new BadRequestException('Cancel booking par payment nahi li ja sakti');
    const value = r2(Number(amount));
    if (!(value > 0)) throw new BadRequestException('Amount sahi likhein');
    const due = r2(b.grandTotal - b.paidAmount);
    if (due <= 0) throw new BadRequestException('Is booking ka koi baqi nahi');
    if (value > due + 0.01) throw new BadRequestException(`Baqi sirf Rs ${due} hai`);

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, b.shopId);
      const customerId = await this.guestCustomer(tx, user, {
        primaryGuestId: b.primaryGuestId, guestName: b.guestName, guestPhone: b.guestPhone, shopId,
      });
      await recordKhataPayment(tx, user, {
        customerId: customerId!, shopId, amount: value, reference: b.bookingNumber,
        note: `${b.status === 'CHECKED_OUT' ? 'Hotel baqi wasool' : 'Hotel payment'}: ${b.bookingNumber}`,
        method: paymentMethod,
      });
      const newPaid = r2(b.paidAmount + value);
      const balance = r2(Math.max(b.grandTotal - newPaid, 0));
      return tx.hotelBooking.update({
        where: { id },
        data: { paidAmount: newPaid, balanceAmount: balance, paymentStatus: balance <= 0.01 ? 'PAID' : 'PARTIAL' },
        include: { bookedRooms: true },
      });
    });
  }

  async extendStay(user: AuthenticatedUser, id: string, newCheckOutDate: string) {
    const b = await this.prisma.hotelBooking.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { bookedRooms: true },
    });
    if (!b) throw new NotFoundException('Booking not found');

    if (!['CONFIRMED', 'TENTATIVE', ...IN_HOUSE].includes(b.status)) {
      throw new BadRequestException(`${b.status} booking extend nahi hoti`);
    }
    const newCheckOut = new Date(newCheckOutDate);
    if (Number.isNaN(newCheckOut.getTime()) || newCheckOut <= b.checkOutDate) throw new BadRequestException('Nayi date pehli check-out ke baad honi chahiye');
    await this.assertRoomsFree(user.tenantId, b.bookedRooms.map((r) => r.roomId).filter(Boolean) as string[], b.checkOutDate, newCheckOut, b.id);

    const extraNights = Math.ceil((newCheckOut.getTime() - b.checkOutDate.getTime()) / (1000 * 60 * 60 * 24));
    const extraRoomCost = b.bookedRooms.reduce((s, r) => s + (r.ratePerNight * extraNights), 0);
    for (const r of b.bookedRooms) {
      await this.prisma.hotelBookedRoom.update({
        where: { id: r.id },
        data: { totalNights: r.totalNights + extraNights, totalAmount: r.totalAmount + r.ratePerNight * extraNights },
      });
    }

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
        // An extended guest is still checked in; the old EXTENDED status hid them from checkout.
        status: b.status === 'EXTENDED' ? 'CHECKED_IN' : b.status,
      },
      include: { bookedRooms: true },
    });
  }

  async arrivalsToday(user: AuthenticatedUser) {
    const start = startOfDayTz();
    const end = endOfDayTz();
    return this.prisma.hotelBooking.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['CONFIRMED', 'TENTATIVE'] },
        checkInDate: { gte: start, lte: end },
      },
      include: { bookedRooms: true },
      orderBy: { arrivalTime: 'asc' },
    });
  }

  async departuresToday(user: AuthenticatedUser) {
    const end = endOfDayTz();
    return this.prisma.hotelBooking.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: [...IN_HOUSE] },
        // Overdue departures stay on the list until they are checked out.
        checkOutDate: { lte: end },
      },
      include: { bookedRooms: true },
      orderBy: { checkOutDate: 'asc' },
    });
  }

  async inHouseGuests(user: AuthenticatedUser) {
    return this.prisma.hotelBooking.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: [...IN_HOUSE] },
      },
      include: { bookedRooms: true },
      orderBy: { checkInDate: 'desc' },
    });
  }
}
