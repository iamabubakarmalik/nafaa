/**
 * Rooms: setup, the live status board and availability. A room held by a
 * guest who is checked in only changes through check-in, room change and
 * check-out, so the board never says "free" for an occupied room.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { HOLDING, IN_HOUSE, OPEN_RESERVATION, dayOf, found, keyOf, nightsBetween, today } from '../common/hotel-common';
import { CreateRoomDto, UpdateRoomDto } from '../common/hotel.dto';

/** Statuses the desk may set by hand; OCCUPIED comes only from check-in. */
const MANUAL = ['AVAILABLE', 'CLEANING', 'MAINTENANCE', 'OUT_OF_ORDER', 'BLOCKED', 'RESERVED'];

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateRoomDto) {
    const roomNumber = dto.roomNumber.trim();
    if (!roomNumber) throw new BadRequestException('Room number likhein');
    const dup = await this.prisma.hotelRoom.findFirst({ where: { tenantId: user.tenantId, roomNumber } });
    if (dup) throw new BadRequestException(dup.isActive ? `Room ${roomNumber} pehle se hai` : `Room ${roomNumber} band para hai — use dobara chalu karein`);
    found(await this.prisma.hotelRoomType.findFirst({ where: { id: dto.roomTypeId, tenantId: user.tenantId } }), 'Room type');
    if (dto.status === 'OCCUPIED') throw new BadRequestException('Naya room bhara hua nahi ho sakta');
    return this.prisma.hotelRoom.create({ data: { ...dto, roomNumber, tenantId: user.tenantId } });
  }

  async list(user: AuthenticatedUser, params: { status?: string; roomTypeId?: string; housekeepingStatus?: string; floor?: string; search?: string; includeInactive?: boolean }) {
    return this.prisma.hotelRoom.findMany({
      where: {
        tenantId: user.tenantId,
        ...(!params.includeInactive && { isActive: true }),
        ...(params.status && { status: params.status as any }),
        ...(params.roomTypeId && { roomTypeId: params.roomTypeId }),
        ...(params.housekeepingStatus && { housekeepingStatus: params.housekeepingStatus as any }),
        ...(params.floor && { floor: params.floor }),
        ...(params.search && {
          OR: [
            { roomNumber: { contains: params.search, mode: 'insensitive' } },
            { floor: { contains: params.search, mode: 'insensitive' } },
            { building: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { roomType: true },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
      take: 500,
    });
  }

  /**
   * Status board for a day: each room with the guest in it, today's arrival
   * and the next booking. `live` is what the desk should see: occupied when
   * a guest is checked in, reserved when an arrival is due, else the room's
   * own status.
   */
  async board(user: AuthenticatedUser) {
    const t = today();
    const [rooms, held] = await Promise.all([
      this.list(user, {}),
      this.prisma.hotelBookedRoom.findMany({
        where: { roomId: { not: null }, booking: { tenantId: user.tenantId, status: { in: [...HOLDING] }, checkOutDate: { gte: t } } },
        select: {
          roomId: true,
          booking: { select: { id: true, bookingNumber: true, guestName: true, guestPhone: true, status: true, checkInDate: true, checkOutDate: true, balanceAmount: true, totalAdults: true, totalChildren: true } },
        },
        orderBy: { booking: { checkInDate: 'asc' } },
      }),
    ]);
    const byRoom = new Map<string, typeof held>();
    for (const h of held) byRoom.set(h.roomId!, [...(byRoom.get(h.roomId!) ?? []), h]);
    return {
      today: keyOf(t),
      rooms: rooms.map((r) => {
        const stays = (byRoom.get(r.id) ?? []).map((h) => h.booking);
        const current = stays.find((b) => (IN_HOUSE as readonly string[]).includes(b.status)) ?? null;
        const arrival = stays.find((b) => (OPEN_RESERVATION as readonly string[]).includes(b.status) && b.checkInDate <= t) ?? null;
        const next = stays.find((b) => (OPEN_RESERVATION as readonly string[]).includes(b.status) && b.checkInDate > t) ?? null;
        const live = current ? 'OCCUPIED' : r.status === 'OCCUPIED' ? 'CLEANING' : arrival && r.status === 'AVAILABLE' ? 'RESERVED' : r.status;
        return {
          ...r, live, current, arrival, next,
          departingToday: !!current && keyOf(current.checkOutDate) <= keyOf(t),
          overdue: !!current && current.checkOutDate < t,
          nightsLeft: current ? Math.max(nightsBetween(t, current.checkOutDate), 0) : null,
        };
      }),
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    return found(await this.prisma.hotelRoom.findFirst({ where: { id, tenantId: user.tenantId }, include: { roomType: true } }), 'Room');
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateRoomDto) {
    const r = await this.getOne(user, id);
    if (dto.roomNumber && dto.roomNumber.trim() !== r.roomNumber) {
      const dup = await this.prisma.hotelRoom.findFirst({ where: { tenantId: user.tenantId, roomNumber: dto.roomNumber.trim(), id: { not: id } } });
      if (dup) throw new BadRequestException(`Room ${dto.roomNumber.trim()} pehle se hai`);
      dto.roomNumber = dto.roomNumber.trim();
    }
    if (dto.roomTypeId) found(await this.prisma.hotelRoomType.findFirst({ where: { id: dto.roomTypeId, tenantId: user.tenantId } }), 'Room type');
    if (dto.isActive === false) await this.assertNotHeld(user.tenantId, id, 'band');
    return this.prisma.hotelRoom.update({ where: { id }, data: dto, include: { roomType: true } });
  }

  private async assertNotHeld(tenantId: string, roomId: string, what: string) {
    const held = await this.prisma.hotelBookedRoom.findFirst({
      where: { roomId, booking: { tenantId, status: { in: [...HOLDING] }, checkOutDate: { gte: today() } } },
      select: { booking: { select: { bookingNumber: true, status: true } } },
    });
    if (held) throw new BadRequestException(`Is room par booking ${held.booking.bookingNumber} hai — pehle room badlein, phir ${what} karein`);
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string, notes?: string) {
    const r = await this.getOne(user, id);
    if (!MANUAL.includes(status)) throw new BadRequestException('Bhara hua status sirf check-in se lagta hai');
    const inHouse = await this.prisma.hotelBookedRoom.findFirst({ where: { roomId: id, booking: { tenantId: user.tenantId, status: { in: [...IN_HOUSE] } } }, select: { id: true } });
    if (inHouse) throw new BadRequestException(`Room ${r.roomNumber} me guest hai — check-out ya room change se badlein`);
    return this.prisma.hotelRoom.update({
      where: { id },
      data: {
        status: status as any,
        ...(notes !== undefined && { maintenanceNotes: ['MAINTENANCE', 'OUT_OF_ORDER'].includes(status) ? notes || null : r.maintenanceNotes }),
        ...(status === 'AVAILABLE' && r.housekeepingStatus === 'DIRTY' && { housekeepingStatus: 'CLEAN', lastCleanedAt: new Date() }),
      },
      include: { roomType: true },
    });
  }

  async updateHousekeeping(user: AuthenticatedUser, id: string, housekeepingStatus: string) {
    const r = await this.getOne(user, id);
    const clean = housekeepingStatus === 'CLEAN' || housekeepingStatus === 'INSPECTED';
    return this.prisma.hotelRoom.update({
      where: { id },
      data: {
        housekeepingStatus: housekeepingStatus as any,
        ...(housekeepingStatus === 'CLEAN' && { lastCleanedAt: new Date() }),
        ...(housekeepingStatus === 'INSPECTED' && { lastInspectedAt: new Date() }),
        // A room cleaned after check-out is ready to sell again.
        ...(clean && r.status === 'CLEANING' && { status: 'AVAILABLE' }),
      },
      include: { roomType: true },
    });
  }

  /** Rooms are never deleted: the room is switched off and keeps its history. */
  async remove(user: AuthenticatedUser, id: string) {
    await this.getOne(user, id);
    await this.assertNotHeld(user.tenantId, id, 'band');
    return this.prisma.hotelRoom.update({ where: { id }, data: { isActive: false } });
  }

  async checkAvailability(user: AuthenticatedUser, params: { checkInDate: string; checkOutDate: string; roomTypeId?: string; adults?: number; children?: number; exceptBookingId?: string }) {
    const checkIn = dayOf(params.checkInDate, 'Check-in date');
    const checkOut = dayOf(params.checkOutDate, 'Check-out date');
    const nights = nightsBetween(checkIn, checkOut);
    if (nights < 1) throw new BadRequestException('Check-out, check-in ke baad ki date honi chahiye');
    const occupied = await this.prisma.hotelBookedRoom.findMany({
      where: {
        roomId: { not: null },
        booking: {
          tenantId: user.tenantId, status: { in: [...HOLDING] }, checkInDate: { lt: checkOut }, checkOutDate: { gt: checkIn },
          ...(params.exceptBookingId && { id: { not: params.exceptBookingId } }),
        },
      },
      select: { roomId: true },
    });
    const people = (params.adults ?? 0) + (params.children ?? 0);
    const available = await this.prisma.hotelRoom.findMany({
      where: {
        tenantId: user.tenantId, isActive: true, roomType: { isActive: true, ...(people > 0 && { maxOccupancy: { gte: people } }) },
        id: { notIn: occupied.map((o) => o.roomId!) },
        status: { notIn: ['MAINTENANCE', 'OUT_OF_ORDER', 'BLOCKED'] },
        ...(params.roomTypeId && { roomTypeId: params.roomTypeId }),
      },
      include: { roomType: true },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });
    const grouped = new Map<string, { roomType: (typeof available)[number]['roomType']; rooms: typeof available; count: number }>();
    for (const r of available) {
      const g = grouped.get(r.roomTypeId) ?? { roomType: r.roomType, rooms: [], count: 0 };
      g.rooms.push(r);
      g.count++;
      grouped.set(r.roomTypeId, g);
    }
    return { checkIn, checkOut, nights, totalAvailable: available.length, byRoomType: [...grouped.values()] };
  }

  async summary(user: AuthenticatedUser) {
    const board = await this.board(user);
    const count = (s: string) => board.rooms.filter((r) => r.live === s).length;
    const total = board.rooms.length;
    const occupied = count('OCCUPIED');
    return {
      total, available: count('AVAILABLE'), occupied, reserved: count('RESERVED'), cleaning: count('CLEANING'),
      maintenance: count('MAINTENANCE') + count('OUT_OF_ORDER') + count('BLOCKED'),
      dirty: board.rooms.filter((r) => r.housekeepingStatus === 'DIRTY').length,
      occupancyPct: total > 0 ? (occupied / total) * 100 : 0,
    };
  }
}
