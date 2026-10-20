/**
 * Reservations and stays: booking with an advance on the khata, check-in
 * with the guest's ID, extend, room change, check-out with the folio bill
 * (split payment or company khata), cancellation and no-show charges, and
 * refunds of advances. Money only moves through the shared khata and sale
 * helpers, so the day book, drawer, khata and reports see it once.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { ensureCustomer, postIndustrySale, recordKhataPayment, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import {
  HOLDING, IN_HOUSE, OPEN_RESERVATION, addDays, bookingMoney, checkRefundPin, cleanIdNumber, cleanPhone, dayOf, found, guestCustomer,
  folioStock, keyOf, khataHolder, nextGuestNumber, nextTaskNumber, nightsBetween, plansFor, postHotelBill, quoteNights, r2, readTender, refundAdvance, requireAny, today, type BillLine, type Db,
} from '../common/hotel-common';
import {
  BookingPaymentDto, CancelBookingDto, ChangeRoomDto, CheckInGuestDto, CheckOutDto, CreateBookingDto, RefundAdvanceDto, UpdateBookingDto,
} from '../common/hotel.dto';

const INCLUDE = { bookedRooms: true } as const;
type BookingRow = Prisma.HotelBookingGetPayload<{ include: { bookedRooms: true } }>;
type FolioRow = {
  chargeNumber: string; chargeType: string; description: string; quantity: number; totalAmount: number;
  reference: string | null; productId: string | null; unitCost: number | null; shopId: string | null;
};

/** Cost of a catalog item on a folio charge (0 for a plain charge). */
export function folioCost(c: Parameters<typeof folioStock>[0] & { quantity: number }) {
  const stock = folioStock(c);
  return stock ? r2(stock.unitCost * c.quantity) : 0;
}

const paymentStatus = (total: number, paid: number) => (paid >= total - 0.009 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID');

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as unknown as Db;
  }

  // ─── Create ──────────────────────────────────────────────────────

  async create(user: AuthenticatedUser, dto: CreateBookingDto) {
    if (!dto.rooms?.length) throw new BadRequestException('Kam az kam ek room chunein');
    const guestName = dto.guestName?.trim();
    if (!guestName) throw new BadRequestException('Guest ka naam likhein');
    const guestPhone = cleanPhone(dto.guestPhone, 'Guest ka phone');
    const checkIn = dayOf(dto.checkInDate, 'Check-in date');
    const checkOut = dayOf(dto.checkOutDate, 'Check-out date');
    const nights = nightsBetween(checkIn, checkOut);
    if (nights < 1) throw new BadRequestException('Check-out, check-in ke baad ki date honi chahiye');
    if (nights > 365) throw new BadRequestException('Ek booking zyada se zyada 365 raat ki');
    const now = today();
    if (checkIn < addDays(now, -1) && !dto.checkInNow) throw new BadRequestException('Guzri hui date par nayi booking nahi banti');
    if (dto.checkInNow && keyOf(checkIn) !== keyOf(now)) throw new BadRequestException('Walk-in check-in sirf aaj ki date se hota hai');
    const advancePaid = r2(dto.advancePaid ?? 0);
    const source = dto.source ?? (dto.checkInNow ? 'WALK_IN' : 'DIRECT');

    const rooms = await this.pickRooms(user.tenantId, dto, checkIn, checkOut, await resolveIndustryShopId(this.db, user, dto.shopId));
    const plans = await plansFor(this.db, user.tenantId, checkIn, checkOut);
    let roomTotal = 0;
    const bookedRooms = rooms.map(({ line, room, type }) => {
      const adults = line.adults ?? 1;
      const children = line.children ?? 0;
      const extraBeds = line.extraBeds ?? 0;
      if (extraBeds > 0 && !type.extraBedAllowed) throw new BadRequestException(`${type.name} me extra bed nahi lagta`);
      if (adults + children > type.maxOccupancy + extraBeds) {
        throw new BadRequestException(`Room ${room.roomNumber} (${type.name}) me zyada se zyada ${type.maxOccupancy + extraBeds} log`);
      }
      const nightly = quoteNights(type, room.customPrice, checkIn, nights, plans, source);
      const stay = line.ratePerNight != null ? r2(line.ratePerNight * nights) : r2(nightly.reduce((s, n) => s + n.rate, 0));
      const beds = r2(extraBeds * (type.extraBedPrice || 0) * nights);
      const totalAmount = r2(stay + beds);
      const discount = line.isComplimentary ? totalAmount : r2(Math.min(line.discount ?? 0, totalAmount));
      roomTotal += totalAmount - discount;
      return {
        roomId: room.id, roomTypeId: type.id, roomNumber: room.roomNumber,
        ratePerNight: r2(stay / nights), totalNights: nights, totalAmount,
        adults, children, extraBeds, isComplimentary: !!line.isComplimentary, discount, notes: line.notes?.trim() || null,
      };
    });
    roomTotal = r2(roomTotal);
    const taxAmount = r2(dto.taxAmount ?? 0);
    const serviceCharge = r2(dto.serviceCharge ?? 0);
    const discount = r2(dto.discount ?? 0);
    const grandTotal = r2(Math.max(roomTotal + taxAmount + serviceCharge - discount, 0));
    if (advancePaid > grandTotal + 0.009) throw new BadRequestException(`Advance kul bill (Rs ${grandTotal}) se zyada hai`);
    const balanceAmount = r2(Math.max(grandTotal - advancePaid, 0));

    const created = await this.withNumber(user.tenantId, async (bookingNumber) => this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, dto.shopId);
      if (dto.primaryGuestId) found(await tx.hotelGuest.findFirst({ where: { id: dto.primaryGuestId, tenantId: user.tenantId, isActive: true } }), 'Guest');
      // A company or regular khata picked at booking: the stay is billed to it at check-out.
      const billTo = dto.customerId ? await ensureCustomer(tx, user, { customerId: dto.customerId }) : null;
      const booking = await tx.hotelBooking.create({
        data: {
          tenantId: user.tenantId, shopId, bookingNumber, customerId: billTo,
          confirmationCode: 'HTL' + Date.now().toString(36).toUpperCase(),
          primaryGuestId: dto.primaryGuestId ?? null,
          guestName, guestPhone, guestEmail: dto.guestEmail?.trim() || null,
          totalAdults: dto.totalAdults ?? bookedRooms.reduce((s, r) => s + r.adults, 0),
          totalChildren: dto.totalChildren ?? bookedRooms.reduce((s, r) => s + r.children, 0),
          checkInDate: checkIn, checkOutDate: checkOut, nights,
          source, sourceRef: dto.sourceRef?.trim() || null, bookedBy: dto.bookedBy?.trim() || null,
          agentName: dto.agentName?.trim() || null, agentCommission: r2(dto.agentCommission ?? 0),
          mealPlan: dto.mealPlan ?? 'ROOM_ONLY',
          roomTotal, taxAmount, serviceCharge, discount, extraCharges: 0, grandTotal,
          advancePaid, paidAmount: advancePaid, balanceAmount, paymentStatus: paymentStatus(grandTotal, advancePaid),
          specialRequests: dto.specialRequests?.trim() || null, arrivalTime: dto.arrivalTime || null,
          purposeOfVisit: dto.purposeOfVisit?.trim() || null, notes: dto.notes?.trim() || null,
          status: dto.status ?? 'CONFIRMED', createdById: user.id,
          bookedRooms: { create: bookedRooms },
        },
        include: INCLUDE,
      });
      // The advance is the guest's money until the bill: it sits on the khata from the day it is paid.
      if (advancePaid > 0) {
        const customerId = billTo ?? await guestCustomer(tx, user, { primaryGuestId: dto.primaryGuestId, guestName, guestPhone, shopId });
        await recordKhataPayment(tx, user, {
          customerId, shopId, amount: advancePaid, reference: bookingNumber, method: dto.paymentMethod, note: `Hotel advance: ${bookingNumber}`,
        });
      }
      return booking;
    }));
    if (dto.checkInNow) return this.checkIn(user, created.id, dto);
    return created;
  }

  /** Booking numbers are BK-<year>-00001 per tenant; a clash with a parallel booking retries. */
  private async withNumber<T>(tenantId: string, run: (n: string) => Promise<T>): Promise<T> {
    const prefix = `BK-${keyOf(today()).slice(0, 4)}-`;
    for (let attempt = 0; ; attempt++) {
      const last = await this.prisma.hotelBooking.findFirst({
        where: { tenantId, bookingNumber: { startsWith: prefix } }, orderBy: { bookingNumber: 'desc' }, select: { bookingNumber: true },
      });
      const next = (last ? Number(last.bookingNumber.slice(prefix.length)) || 0 : 0) + 1 + attempt;
      try {
        return await run(prefix + String(next).padStart(5, '0'));
      } catch (e) {
        if (attempt < 3 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }
  }

  /** Rooms for a new booking: the picked room, or the first free room of the type. */
  private async pickRooms(tenantId: string, dto: CreateBookingDto, from: Date, to: Date, shopId: string) {
    const picked = dto.rooms.map((r) => r.roomId).filter(Boolean) as string[];
    if (new Set(picked).size !== picked.length) throw new BadRequestException('Ek room do dafa chuna gaya hai');
    await this.assertRoomsFree(tenantId, picked, from, to);
    const taken = new Set([...picked, ...(await this.heldRoomIds(tenantId, from, to))]);
    const out = [];
    for (const line of dto.rooms) {
      let room;
      if (line.roomId) {
        room = found(await this.prisma.hotelRoom.findFirst({ where: { id: line.roomId, tenantId, isActive: true }, include: { roomType: true } }), 'Room');
        if (room.shopId && room.shopId !== shopId) throw new BadRequestException(`Room ${room.roomNumber} doosri branch ka hai`);
        if (line.roomTypeId && room.roomTypeId !== line.roomTypeId) throw new BadRequestException(`Room ${room.roomNumber} is type ka nahi`);
      } else {
        if (!line.roomTypeId) throw new BadRequestException('Room ya room type chunein');
        room = await this.prisma.hotelRoom.findFirst({
          where: {
            tenantId, roomTypeId: line.roomTypeId, isActive: true, status: { notIn: ['MAINTENANCE', 'OUT_OF_ORDER', 'BLOCKED'] }, id: { notIn: [...taken] },
            // Rooms of this branch, or rooms not tied to any branch (older rows).
            OR: [{ shopId }, { shopId: null }],
          },
          include: { roomType: true }, orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
        });
        if (!room) throw new BadRequestException('Is type ka koi room in dates me khali nahi');
        taken.add(room.id);
      }
      if (!room.roomType.isActive) throw new BadRequestException(`${room.roomType.name} band hai`);
      out.push({ line, room, type: room.roomType });
    }
    return out;
  }

  private async heldRoomIds(tenantId: string, from: Date, to: Date, exceptBookingId?: string) {
    const held = await this.prisma.hotelBookedRoom.findMany({
      where: {
        roomId: { not: null },
        booking: { tenantId, ...(exceptBookingId && { id: { not: exceptBookingId } }), status: { in: [...HOLDING] }, checkInDate: { lt: to }, checkOutDate: { gt: from } },
      },
      select: { roomId: true },
    });
    return held.map((h) => h.roomId!).filter(Boolean);
  }

  /** A room cannot hold two bookings for overlapping nights. */
  private async assertRoomsFree(tenantId: string, roomIds: string[], from: Date, to: Date, exceptBookingId?: string) {
    if (!roomIds.length) return;
    const clash = await this.prisma.hotelBookedRoom.findFirst({
      where: {
        roomId: { in: roomIds },
        booking: { tenantId, ...(exceptBookingId && { id: { not: exceptBookingId } }), status: { in: [...HOLDING] }, checkInDate: { lt: to }, checkOutDate: { gt: from } },
      },
      include: { booking: { select: { bookingNumber: true } } },
    });
    if (clash) throw new BadRequestException(`Room ${clash.roomNumber ?? ''} in dates me ${clash.booking.bookingNumber} ke paas hai`);
  }

  /**
   * Price and free rooms for a stay, per room type: the nightly rates
   * (weekend and plans included), the stay total and the rooms still free
   * on every night. A room's own price replaces the type's base rate.
   */
  async quote(user: AuthenticatedUser, q: Record<string, string | undefined>) {
    const checkIn = dayOf(q.checkInDate, 'Check-in date');
    const checkOut = dayOf(q.checkOutDate, 'Check-out date');
    const nights = nightsBetween(checkIn, checkOut);
    if (nights < 1) throw new BadRequestException('Check-out, check-in ke baad ki date honi chahiye');
    if (nights > 365) throw new BadRequestException('Ek booking zyada se zyada 365 raat ki');
    const [types, held, plans] = await Promise.all([
      this.prisma.hotelRoomType.findMany({
        where: { tenantId: user.tenantId, isActive: true, ...(q.roomTypeId && { id: q.roomTypeId }) },
        include: { rooms: { where: { isActive: true, status: { notIn: ['MAINTENANCE', 'OUT_OF_ORDER', 'BLOCKED'] } }, orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }] } },
        orderBy: [{ displayOrder: 'asc' }, { basePrice: 'asc' }],
      }),
      this.heldRoomIds(user.tenantId, checkIn, checkOut, q.exceptBookingId),
      plansFor(this.db, user.tenantId, checkIn, checkOut),
    ]);
    const busy = new Set(held);
    return {
      checkInDate: keyOf(checkIn), checkOutDate: keyOf(checkOut), nights,
      types: types.map((t) => {
        const nightly = quoteNights(t, null, checkIn, nights, plans, q.source ?? null);
        const total = r2(nightly.reduce((sum, n) => sum + n.rate, 0));
        const free = t.rooms.filter((r) => !busy.has(r.id)).map((r) => {
          const own = r.customPrice && r.customPrice > 0 ? quoteNights(t, r.customPrice, checkIn, nights, plans, q.source ?? null) : null;
          return { id: r.id, roomNumber: r.roomNumber, floor: r.floor, status: r.status, housekeepingStatus: r.housekeepingStatus, total: own ? r2(own.reduce((sum, n) => sum + n.rate, 0)) : total };
        });
        return {
          roomTypeId: t.id, name: t.name, code: t.code, type: t.type, maxAdults: t.maxAdults, maxChildren: t.maxChildren, maxOccupancy: t.maxOccupancy,
          extraBedAllowed: t.extraBedAllowed, extraBedPrice: t.extraBedPrice, basePrice: t.basePrice, weekendPrice: t.weekendPrice,
          nightly, total, avgRate: r2(total / nights), roomsTotal: t.rooms.length, free,
        };
      }),
    };
  }

  // ─── Read ────────────────────────────────────────────────────────

  private scopeWhere(scope?: ShopScope): Prisma.HotelBookingWhereInput {
    return scope?.shopId ? { OR: [{ shopId: scope.shopId }, { shopId: null }] } : {};
  }

  private viewWhere(view?: string): Prisma.HotelBookingWhereInput {
    const t = today();
    switch (view) {
      case 'arrivals': return { status: { in: [...OPEN_RESERVATION] }, checkInDate: { lte: t } };
      case 'inhouse': return { status: { in: [...IN_HOUSE] } };
      case 'departures': return { status: { in: [...IN_HOUSE] }, checkOutDate: { lte: t } };
      case 'upcoming': return { status: { in: [...OPEN_RESERVATION] }, checkInDate: { gt: t } };
      case 'due': return { balanceAmount: { gt: 0.009 }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } };
      default: return {};
    }
  }

  /** Paged list with counts by status for the same filter. */
  async page(user: AuthenticatedUser, scope: ShopScope, q: Record<string, string | undefined>) {
    const page = Math.max(Number(q.page) || 1, 1);
    const limit = Math.min(Math.max(Number(q.limit) || 30, 1), 200);
    const search = q.search?.trim();
    const base: Prisma.HotelBookingWhereInput = {
      tenantId: user.tenantId,
      AND: [
        this.scopeWhere(scope),
        this.viewWhere(q.view),
        q.source ? { source: q.source as any } : {},
        q.guestId ? { primaryGuestId: q.guestId } : {},
        q.customerId ? { customerId: q.customerId } : {},
        q.from || q.to ? { checkInDate: { ...(q.from && { gte: dayOf(q.from) }), ...(q.to && { lte: dayOf(q.to) }) } } : {},
        search ? {
          OR: [
            { bookingNumber: { contains: search, mode: 'insensitive' } },
            { guestName: { contains: search, mode: 'insensitive' } },
            { guestPhone: { contains: search } },
            { bookedBy: { contains: search, mode: 'insensitive' } },
            { sourceRef: { contains: search, mode: 'insensitive' } },
            { bookedRooms: { some: { roomNumber: { equals: search, mode: 'insensitive' } } } },
          ],
        } : {},
      ],
    };
    const where: Prisma.HotelBookingWhereInput = q.status ? { ...base, status: q.status as any } : base;
    const viewBase = (v: string): Prisma.HotelBookingWhereInput => ({ tenantId: user.tenantId, AND: [this.scopeWhere(scope), this.viewWhere(v)] });
    const views = ['arrivals', 'inhouse', 'departures', 'upcoming', 'due'] as const;
    const [items, total, byStatus, sums, ...viewCounts] = await Promise.all([
      this.prisma.hotelBooking.findMany({ where, include: INCLUDE, orderBy: [{ checkInDate: q.view === 'upcoming' || q.view === 'arrivals' ? 'asc' : 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.hotelBooking.count({ where }),
      this.prisma.hotelBooking.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
      this.prisma.hotelBooking.aggregate({ where: { ...where, status: q.status ? (q.status as any) : { notIn: ['CANCELLED', 'NO_SHOW'] } }, _sum: { grandTotal: true, paidAmount: true, balanceAmount: true } }),
      ...views.map((v) => this.prisma.hotelBooking.count({ where: viewBase(v) })),
    ]);
    return {
      items: await this.withSaleIds(user.tenantId, items),
      total, page, limit,
      summary: {
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
        billed: r2(sums._sum.grandTotal ?? 0), paid: r2(sums._sum.paidAmount ?? 0), due: r2(sums._sum.balanceAmount ?? 0),
        views: Object.fromEntries(views.map((v, i) => [v, viewCounts[i] as number])),
      },
    };
  }

  /** Every booking (latest 300) — kept for the receipt and older screens. */
  async list(user: AuthenticatedUser, params: { status?: string; source?: string; guestId?: string; from?: string; to?: string; search?: string; upcomingOnly?: boolean; saleId?: string }) {
    let bookingNumber: string | undefined;
    if (params.saleId) {
      const sale = await this.prisma.sale.findFirst({ where: { id: params.saleId, tenantId: user.tenantId }, select: { sourceRef: true } });
      if (!sale?.sourceRef) return [];
      bookingNumber = sale.sourceRef;
    }
    const rows = await this.prisma.hotelBooking.findMany({
      where: {
        tenantId: user.tenantId,
        ...(bookingNumber && { bookingNumber }),
        ...(params.status && { status: params.status as any }),
        ...(params.source && { source: params.source as any }),
        ...(params.guestId && { primaryGuestId: params.guestId }),
        ...(params.upcomingOnly && { checkInDate: { gte: today() } }),
        ...(params.from || params.to ? { checkInDate: { ...(params.from && { gte: dayOf(params.from) }), ...(params.to && { lte: dayOf(params.to) }) } } : {}),
        ...(params.search && {
          OR: [
            { bookingNumber: { contains: params.search, mode: 'insensitive' } },
            { confirmationCode: { contains: params.search, mode: 'insensitive' } },
            { guestName: { contains: params.search, mode: 'insensitive' } },
            { guestPhone: { contains: params.search } },
          ],
        }),
      },
      include: INCLUDE,
      orderBy: { checkInDate: 'desc' },
      take: 300,
    });
    return this.withSaleIds(user.tenantId, rows);
  }

  /** Adds the latest live bill of each booking (`saleId`) and room type names to the rows. */
  private async withSaleIds(tenantId: string, rows: BookingRow[]) {
    if (!rows.length) return [];
    const [sales, types] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId, sourceRef: { in: rows.map((r) => r.bookingNumber) }, saleNumber: { startsWith: 'HTL-' }, status: { not: 'VOIDED' } },
        select: { id: true, saleNumber: true, sourceRef: true }, orderBy: { createdAt: 'asc' },
      }),
      this.prisma.hotelRoomType.findMany({ where: { tenantId, id: { in: [...new Set(rows.flatMap((r) => r.bookedRooms.map((b) => b.roomTypeId)))] } }, select: { id: true, name: true } }),
    ]);
    const bySource = new Map(sales.map((s) => [s.sourceRef!, s]));
    const typeName = new Map(types.map((t) => [t.id, t.name]));
    return rows.map((r) => ({
      ...r,
      saleId: bySource.get(r.bookingNumber)?.id ?? null,
      saleNumber: bySource.get(r.bookingNumber)?.saleNumber ?? null,
      bookedRooms: r.bookedRooms.map((b) => ({ ...b, roomTypeName: typeName.get(b.roomTypeId) ?? null })),
    }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const b = found(await this.prisma.hotelBooking.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { bookedRooms: true, folioCharges: { orderBy: { chargeDate: 'desc' } } },
    }), 'Booking');
    const [types, rooms, guest, sales, money, holder] = await Promise.all([
      this.prisma.hotelRoomType.findMany({ where: { id: { in: [...new Set(b.bookedRooms.map((r) => r.roomTypeId))] }, tenantId: user.tenantId } }),
      this.prisma.hotelRoom.findMany({ where: { id: { in: b.bookedRooms.map((r) => r.roomId).filter(Boolean) as string[] }, tenantId: user.tenantId } }),
      b.primaryGuestId ? this.prisma.hotelGuest.findFirst({ where: { id: b.primaryGuestId, tenantId: user.tenantId } }) : null,
      this.prisma.sale.findMany({
        where: { tenantId: user.tenantId, sourceRef: b.bookingNumber, saleNumber: { startsWith: 'HTL-' } },
        select: { id: true, saleNumber: true, total: true, paidAmount: true, creditAmount: true, status: true, createdAt: true }, orderBy: { createdAt: 'asc' },
      }),
      bookingMoney(this.db, user.tenantId, b.bookingNumber, b.paidAmount),
      khataHolder(this.db, user.tenantId, b.bookingNumber),
    ]);
    const customerId = holder ?? b.customerId ?? guest?.customerId ?? null;
    const khata = customerId ? await this.prisma.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true, name: true, phone: true, balance: true } }) : null;
    const billTo = !b.customerId ? null : b.customerId === khata?.id ? khata
      : await this.prisma.customer.findFirst({ where: { id: b.customerId, tenantId: user.tenantId }, select: { id: true, name: true, phone: true, balance: true } });
    const rtMap = new Map(types.map((t) => [t.id, t]));
    const roomMap = new Map(rooms.map((r) => [r.id, r]));
    const t = today();
    const leavingEarly = (IN_HOUSE as readonly string[]).includes(b.status) && t < b.checkOutDate;
    const live = b.folioCharges.filter((c) => !c.isVoid);
    const bill = this.billLines(b, live);
    return {
      ...b,
      bookedRooms: b.bookedRooms.map((r) => ({ ...r, roomType: rtMap.get(r.roomTypeId) ?? null, roomTypeName: rtMap.get(r.roomTypeId)?.name ?? null, room: r.roomId ? roomMap.get(r.roomId) ?? null : null })),
      guest,
      sales,
      saleId: sales.find((s) => s.status !== 'VOIDED')?.id ?? null,
      khata: khata ? { ...khata, balance: r2(Number(khata.balance)) } : null,
      billTo: billTo ? { ...billTo, balance: r2(Number(billTo.balance)) } : null,
      money: {
        ...money,
        due: r2(Math.max(b.grandTotal - money.khataPaid - money.legacyPaid, 0)),
        // Advance not used by a live bill; it can be refunded once the stay is closed.
        advanceLeft: ['CANCELLED', 'NO_SHOW', 'CHECKED_OUT'].includes(b.status)
          ? r2(Math.max(money.khataPaid - sales.filter((s) => s.status !== 'VOIDED').reduce((sum, x) => sum + x.total, 0), 0))
          : 0,
      },
      bill,
      today: keyOf(t),
      overdueNights: (IN_HOUSE as readonly string[]).includes(b.status) ? Math.max(nightsBetween(b.checkOutDate, t), 0) : 0,
      earlyNights: leavingEarly ? Math.max(nightsBetween(b.checkInDate, t), 1) : null,
    };
  }

  /** The folio bill: room nights, charges, service charge and tax; the booking discount closes the gap. */
  private billLines(b: BookingRow, folio: FolioRow[]) {
    const roomLines: BillLine[] = b.bookedRooms.map((r) => ({
      label: `Room ${r.roomNumber ?? ''} · ${r.totalNights} raat${r.isComplimentary ? ' (free)' : ''}`,
      amount: r2(r.totalAmount - (r.discount || 0)),
      quantity: r.totalNights,
    }));
    const roomSum = r2(roomLines.reduce((a, l) => a + l.amount, 0));
    if (Math.abs(roomSum - b.roomTotal) > 0.009) roomLines.push({ label: 'Room adjustment', amount: r2(b.roomTotal - roomSum) });
    const folioSum = r2(folio.reduce((a, c) => a + c.totalAmount, 0));
    const lines: BillLine[] = [
      ...roomLines,
      ...folio.map((c) => ({ label: `${c.description} (${c.chargeNumber})`, amount: c.totalAmount, quantity: c.quantity, cost: folioCost(c) })),
      // Extra charges typed on older bookings (not as folio lines).
      { label: 'Extra charges', amount: r2(b.extraCharges - folioSum) },
      { label: 'Service charge', amount: b.serviceCharge },
      { label: 'Tax', amount: b.taxAmount },
    ].filter((l) => l.amount > 0.009);
    const linesTotal = r2(lines.reduce((a, l) => a + l.amount, 0));
    if (linesTotal < b.grandTotal - 0.009) lines.push({ label: 'Adjustment', amount: r2(b.grandTotal - linesTotal) });
    const discount = r2(Math.max(linesTotal - b.grandTotal, 0));
    return { lines, discount, total: r2(lines.reduce((a, l) => a + l.amount, 0) - discount) };
  }

  // ─── Edit ────────────────────────────────────────────────────────

  async update(user: AuthenticatedUser, id: string, dto: UpdateBookingDto) {
    const b = found(await this.prisma.hotelBooking.findFirst({ where: { id, tenantId: user.tenantId }, include: INCLUDE }), 'Booking');
    const open = (OPEN_RESERVATION as readonly string[]).includes(b.status);
    const inHouse = (IN_HOUSE as readonly string[]).includes(b.status);
    if (!open && !inHouse) throw new BadRequestException('Band booking badli nahi ja sakti');
    if (inHouse && (dto.checkInDate || dto.checkOutDate || dto.status)) throw new BadRequestException('Guest andar hai — dates ke liye "Stay barhayein" istemal karein');

    const checkIn = dto.checkInDate ? dayOf(dto.checkInDate, 'Check-in date') : b.checkInDate;
    const checkOut = dto.checkOutDate ? dayOf(dto.checkOutDate, 'Check-out date') : b.checkOutDate;
    const nights = nightsBetween(checkIn, checkOut);
    if (nights < 1) throw new BadRequestException('Check-out, check-in ke baad ki date honi chahiye');
    const datesChanged = nights !== b.nights || keyOf(checkIn) !== keyOf(b.checkInDate);
    if (datesChanged) await this.assertRoomsFree(user.tenantId, b.bookedRooms.map((r) => r.roomId).filter(Boolean) as string[], checkIn, checkOut, b.id);

    return this.prisma.$transaction(async (tx) => {
      let billTo: string | null | undefined;
      if (dto.customerId !== undefined) {
        billTo = dto.customerId ? await ensureCustomer(tx, user, { customerId: dto.customerId }) : null;
        const holder = await khataHolder(tx, user.tenantId, b.bookingNumber);
        const { khataPaid } = await bookingMoney(tx, user.tenantId, b.bookingNumber, b.paidAmount);
        if (billTo && holder && holder !== billTo && khataPaid > 0) throw new BadRequestException('Advance guest ke khata me hai — company khata ke liye pehle advance wapas karein');
      }
      let roomTotal = b.roomTotal;
      if (datesChanged) {
        roomTotal = 0;
        for (const r of b.bookedRooms) {
          // The agreed nightly rate (with extra beds) stays; only the number of nights changes.
          const totalAmount = r2(r.totalAmount / Math.max(r.totalNights, 1) * nights);
          const discount = r.isComplimentary ? totalAmount : Math.min(r.discount, totalAmount);
          roomTotal += totalAmount - discount;
          await tx.hotelBookedRoom.update({ where: { id: r.id }, data: { totalNights: nights, totalAmount, discount } });
        }
        roomTotal = r2(roomTotal);
      }
      const taxAmount = r2(dto.taxAmount ?? b.taxAmount);
      const serviceCharge = r2(dto.serviceCharge ?? b.serviceCharge);
      const discount = r2(dto.discount ?? b.discount);
      const grandTotal = r2(Math.max(roomTotal + b.extraCharges + taxAmount + serviceCharge - discount, 0));
      return tx.hotelBooking.update({
        where: { id },
        data: {
          ...(dto.guestName !== undefined && { guestName: dto.guestName.trim() || b.guestName }),
          ...(dto.guestPhone !== undefined && { guestPhone: cleanPhone(dto.guestPhone, 'Guest ka phone') }),
          ...(dto.guestEmail !== undefined && { guestEmail: dto.guestEmail.trim() || null }),
          ...(dto.totalAdults !== undefined && { totalAdults: dto.totalAdults }),
          ...(dto.totalChildren !== undefined && { totalChildren: dto.totalChildren }),
          ...(dto.source && { source: dto.source }),
          ...(dto.sourceRef !== undefined && { sourceRef: dto.sourceRef.trim() || null }),
          ...(dto.bookedBy !== undefined && { bookedBy: dto.bookedBy.trim() || null }),
          ...(dto.mealPlan && { mealPlan: dto.mealPlan }),
          ...(dto.status && { status: dto.status }),
          ...(billTo !== undefined && { customerId: billTo }),
          ...(dto.specialRequests !== undefined && { specialRequests: dto.specialRequests.trim() || null }),
          ...(dto.arrivalTime !== undefined && { arrivalTime: dto.arrivalTime || null }),
          ...(dto.purposeOfVisit !== undefined && { purposeOfVisit: dto.purposeOfVisit.trim() || null }),
          ...(dto.notes !== undefined && { notes: dto.notes.trim() || null }),
          checkInDate: checkIn, checkOutDate: checkOut, nights,
          roomTotal, taxAmount, serviceCharge, discount, grandTotal,
          balanceAmount: r2(Math.max(grandTotal - b.paidAmount, 0)),
          paymentStatus: paymentStatus(grandTotal, b.paidAmount),
        },
        include: INCLUDE,
      });
    });
  }

  /** Older screens: switches between tentative and confirmed. Cancel and no-show have their own endpoint. */
  async updateStatus(user: AuthenticatedUser, id: string, status: string, reason?: string) {
    if (status === 'CANCELLED' || status === 'NO_SHOW') return this.cancel(user, id, { reason: reason?.trim() || 'Cancel', noShow: status === 'NO_SHOW' });
    if (!['TENTATIVE', 'CONFIRMED', 'INQUIRY', 'QUOTED'].includes(status)) throw new BadRequestException('Check-in / check-out ke button istemal karein');
    const b = found(await this.prisma.hotelBooking.findFirst({ where: { id, tenantId: user.tenantId } }), 'Booking');
    if (!(OPEN_RESERVATION as readonly string[]).includes(b.status)) throw new BadRequestException('Guest andar aa chuka hai — ab status yahan se nahi badalta');
    return this.prisma.hotelBooking.update({ where: { id }, data: { status: status as any }, include: INCLUDE });
  }

  // ─── Check-in ────────────────────────────────────────────────────

  /** Guest profile for the stay with the ID taken at the desk (police record). */
  private async ensureGuest(tx: Db, user: AuthenticatedUser, b: { primaryGuestId: string | null; guestName: string; guestPhone: string; guestEmail: string | null }, dto: CheckInGuestDto) {
    const idNumber = cleanIdNumber(dto.idType, dto.idNumber);
    let guest = b.primaryGuestId ? await tx.hotelGuest.findFirst({ where: { id: b.primaryGuestId, tenantId: user.tenantId } }) : null;
    if (!guest && idNumber) guest = await tx.hotelGuest.findFirst({ where: { tenantId: user.tenantId, idNumber, isActive: true } });
    if (!guest) guest = await tx.hotelGuest.findFirst({ where: { tenantId: user.tenantId, phone: b.guestPhone, isActive: true }, orderBy: { updatedAt: 'desc' } });
    if (guest?.isBlacklisted) throw new BadRequestException(`${guest.fullName} blacklist me hai${guest.blacklistReason ? `: ${guest.blacklistReason}` : ''}`);
    if (!idNumber && !guest?.idNumber) throw new BadRequestException('Guest ka CNIC ya passport number likhein (police record ke liye zaroori)');
    const patch = {
      ...(idNumber && { idType: dto.idType ?? 'CNIC', idNumber }),
      ...(dto.nationality && { nationality: dto.nationality.trim() }),
      ...(dto.address && { address: dto.address.trim() }),
      ...(dto.city && { city: dto.city.trim() }),
    };
    if (guest) return tx.hotelGuest.update({ where: { id: guest.id }, data: patch });
    const [firstName, ...rest] = b.guestName.trim().split(/\s+/);
    return tx.hotelGuest.create({
      data: {
        tenantId: user.tenantId, guestNumber: await nextGuestNumber(tx, user.tenantId),
        firstName, lastName: rest.join(' ') || null, fullName: b.guestName.trim(), phone: b.guestPhone, email: b.guestEmail, ...patch,
      },
    });
  }

  async checkIn(user: AuthenticatedUser, id: string, dto: CheckInGuestDto = {}) {
    const b = found(await this.prisma.hotelBooking.findFirst({ where: { id, tenantId: user.tenantId }, include: INCLUDE }), 'Booking');
    if (!(OPEN_RESERVATION as readonly string[]).includes(b.status)) throw new BadRequestException('Ye booking check-in ke liye khuli nahi');
    const t = today();
    if (b.checkInDate > t) throw new BadRequestException(`Booking ${keyOf(b.checkInDate)} ki hai — jaldi aaye hain to pehle dates badlein`);
    if (b.checkOutDate <= t) throw new BadRequestException('Check-out ki date guzar chuki — pehle dates badlein');
    const roomIds = b.bookedRooms.map((r) => r.roomId).filter(Boolean) as string[];
    if (roomIds.length !== b.bookedRooms.length) throw new BadRequestException('Har room ka number lagayein (Room badlein)');
    const busy = await this.prisma.hotelRoom.findFirst({
      where: { id: { in: roomIds }, tenantId: user.tenantId, status: { in: ['OCCUPIED', 'MAINTENANCE', 'OUT_OF_ORDER', 'BLOCKED'] } },
      select: { roomNumber: true, status: true },
    });
    if (busy) throw new BadRequestException(`Room ${busy.roomNumber} abhi ${busy.status === 'OCCUPIED' ? 'bhara hua' : 'marammat / band'} hai — room badlein`);

    return this.prisma.$transaction(async (tx) => {
      const guest = await this.ensureGuest(tx, user, b, dto);
      await tx.hotelRoom.updateMany({ where: { id: { in: roomIds }, tenantId: user.tenantId }, data: { status: 'OCCUPIED' } });
      const moved = await tx.hotelBooking.updateMany({
        where: { id, status: b.status },
        data: {
          status: 'CHECKED_IN', actualCheckIn: new Date(), checkedInBy: user.id, primaryGuestId: guest.id,
          ...(dto.adults && { totalAdults: dto.adults }), ...(dto.children !== undefined && { totalChildren: dto.children }),
          ...(dto.purposeOfVisit && { purposeOfVisit: dto.purposeOfVisit.trim() }),
          ...(dto.notes && { notes: [b.notes, dto.notes.trim()].filter(Boolean).join('\n') }),
        },
      });
      if (!moved.count) throw new BadRequestException('Booking abhi badli gayi — page dobara kholein');
      return tx.hotelBooking.findUniqueOrThrow({ where: { id }, include: INCLUDE });
    });
  }

  // ─── Stay changes ────────────────────────────────────────────────

  async extendStay(user: AuthenticatedUser, id: string, newCheckOutDate: string) {
    const b = found(await this.prisma.hotelBooking.findFirst({ where: { id, tenantId: user.tenantId }, include: INCLUDE }), 'Booking');
    if (![...OPEN_RESERVATION, ...IN_HOUSE].includes(b.status as any)) throw new BadRequestException('Ye booking extend nahi hoti');
    const newCheckOut = dayOf(newCheckOutDate, 'Nayi check-out date');
    if (newCheckOut <= b.checkOutDate) throw new BadRequestException('Nayi date pehli check-out ke baad honi chahiye');
    await this.assertRoomsFree(user.tenantId, b.bookedRooms.map((r) => r.roomId).filter(Boolean) as string[], b.checkOutDate, newCheckOut, b.id);
    const extra = nightsBetween(b.checkOutDate, newCheckOut);

    return this.prisma.$transaction(async (tx) => {
      let added = 0;
      for (const r of b.bookedRooms) {
        // Extra nights at the agreed nightly rate of this room, extra beds included.
        const cost = r2(r.totalAmount / Math.max(r.totalNights, 1) * extra);
        const discount = r.isComplimentary ? r.discount + cost : r.discount;
        added += r.isComplimentary ? 0 : cost;
        await tx.hotelBookedRoom.update({ where: { id: r.id }, data: { totalNights: r.totalNights + extra, totalAmount: r2(r.totalAmount + cost), discount: r2(discount) } });
      }
      return this.reprice(tx, b, r2(b.roomTotal + added), { checkOutDate: newCheckOut, nights: b.nights + extra, ...(b.status === 'EXTENDED' && { status: 'CHECKED_IN' }) });
    });
  }

  /** New room total: tax and service charge follow it in proportion; totals and payment state are worked out again. */
  private reprice(tx: Db, b: BookingRow, roomTotal: number, data: Prisma.HotelBookingUpdateInput) {
    const ratio = b.roomTotal > 0 ? roomTotal / b.roomTotal : 1;
    const taxAmount = r2(b.taxAmount * ratio);
    const serviceCharge = r2(b.serviceCharge * ratio);
    const grandTotal = r2(Math.max(roomTotal + b.extraCharges + taxAmount + serviceCharge - b.discount, 0));
    return tx.hotelBooking.update({
      where: { id: b.id },
      data: {
        ...data, roomTotal, taxAmount, serviceCharge, grandTotal,
        balanceAmount: r2(Math.max(grandTotal - b.paidAmount, 0)), paymentStatus: paymentStatus(grandTotal, b.paidAmount),
      },
      include: INCLUDE,
    });
  }

  /** Moves one booked room to another room, for the rest of the stay. */
  async changeRoom(user: AuthenticatedUser, id: string, dto: ChangeRoomDto) {
    const b = found(await this.prisma.hotelBooking.findFirst({ where: { id, tenantId: user.tenantId }, include: INCLUDE }), 'Booking');
    const inHouse = (IN_HOUSE as readonly string[]).includes(b.status);
    if (!inHouse && !(OPEN_RESERVATION as readonly string[]).includes(b.status)) throw new BadRequestException('Band booking ka room nahi badalta');
    const line = found(b.bookedRooms.find((r) => r.id === dto.bookedRoomId), 'Booking ka room');
    if (line.roomId === dto.roomId) throw new BadRequestException('Ye wohi room hai');
    const room = found(await this.prisma.hotelRoom.findFirst({ where: { id: dto.roomId, tenantId: user.tenantId, isActive: true }, include: { roomType: true } }), 'Room');
    const t = today();
    const from = inHouse && t > b.checkInDate ? t : b.checkInDate;
    await this.assertRoomsFree(user.tenantId, [room.id], from, b.checkOutDate, b.id);
    if (inHouse && ['OCCUPIED', 'MAINTENANCE', 'OUT_OF_ORDER', 'BLOCKED'].includes(room.status)) throw new BadRequestException(`Room ${room.roomNumber} abhi khali nahi`);
    const left = Math.max(nightsBetween(from, b.checkOutDate), 0);
    const rate = dto.ratePerNight != null ? r2(dto.ratePerNight) : line.ratePerNight;
    const delta = r2((rate - line.ratePerNight) * left);
    const note = `Room ${line.roomNumber ?? '-'} → ${room.roomNumber} (${keyOf(t)})${dto.reason ? `: ${dto.reason.trim()}` : ''}`;

    return this.prisma.$transaction(async (tx) => {
      await tx.hotelBookedRoom.update({
        where: { id: line.id },
        data: {
          roomId: room.id, roomNumber: room.roomNumber, roomTypeId: room.roomTypeId, ratePerNight: rate,
          totalAmount: r2(line.totalAmount + delta), ...(line.isComplimentary && { discount: r2(line.totalAmount + delta) }),
          notes: [line.notes, note].filter(Boolean).join('\n'),
        },
      });
      if (inHouse) {
        if (line.roomId) await this.freeRoom(tx, user, line.roomId, line.roomNumber ?? '', b.id, `Room change: ${b.bookingNumber}`);
        await tx.hotelRoom.update({ where: { id: room.id }, data: { status: 'OCCUPIED' } });
      }
      const roomDelta = line.isComplimentary ? 0 : delta;
      return this.reprice(tx, b, r2(b.roomTotal + roomDelta), { notes: [b.notes, note].filter(Boolean).join('\n') });
    });
  }

  /** A room the guest left: dirty and waiting for cleaning, unless another stay already holds it. */
  private async freeRoom(tx: Db, user: AuthenticatedUser, roomId: string, roomNumber: string, bookingId: string, why: string) {
    const other = await tx.hotelBookedRoom.findFirst({ where: { roomId, booking: { tenantId: user.tenantId, id: { not: bookingId }, status: { in: [...IN_HOUSE] } } }, select: { id: true } });
    if (other) return;
    await tx.hotelRoom.updateMany({ where: { id: roomId, tenantId: user.tenantId }, data: { status: 'CLEANING', housekeepingStatus: 'DIRTY' } });
    const open = await tx.hotelHousekeepingTask.findFirst({ where: { tenantId: user.tenantId, roomId, status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } }, select: { id: true } });
    if (!open) {
      await tx.hotelHousekeepingTask.create({
        data: { tenantId: user.tenantId, taskNumber: await nextTaskNumber(tx, user.tenantId), roomId, roomNumber, taskType: 'CHECKOUT_CLEAN', priority: 'HIGH', scheduledFor: new Date(), notes: why },
      });
    }
  }

  // ─── Money ───────────────────────────────────────────────────────

  /** Payment against a booking: held on the khata (advance before check-out, khata payment after). */
  async addPayment(user: AuthenticatedUser, id: string, dto: BookingPaymentDto) {
    const b = found(await this.prisma.hotelBooking.findFirst({ where: { id, tenantId: user.tenantId } }), 'Booking');
    if (b.status === 'CANCELLED' || b.status === 'NO_SHOW') throw new BadRequestException('Cancel booking par payment nahi li ja sakti');
    const value = r2(dto.amount);
    const due = r2(b.grandTotal - b.paidAmount);
    if (due <= 0.009) throw new BadRequestException('Is booking ka koi baqi nahi');
    if (value > due + 0.009) throw new BadRequestException(`Baqi sirf Rs ${due} hai`);

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, b.shopId);
      const holder = await khataHolder(tx, user.tenantId, b.bookingNumber);
      const bill = b.status === 'CHECKED_OUT'
        ? await tx.sale.findFirst({ where: { tenantId: user.tenantId, sourceRef: b.bookingNumber, saleNumber: { startsWith: 'HTL-BK' }, status: { not: 'VOIDED' } }, select: { customerId: true } })
        : null;
      if (b.status === 'CHECKED_OUT' && !bill?.customerId && !holder) throw new BadRequestException('Is bill ka baqi kisi khata me nahi');
      const customerId = holder ?? bill?.customerId ?? await guestCustomer(tx, user, {
        customerId: dto.customerId ?? b.customerId, primaryGuestId: b.primaryGuestId, guestName: b.guestName, guestPhone: b.guestPhone, shopId,
      });
      await recordKhataPayment(tx, user, {
        customerId, shopId, amount: value, reference: b.bookingNumber, method: dto.paymentMethod,
        note: `${b.status === 'CHECKED_OUT' ? 'Hotel baqi wasool' : 'Hotel advance'}: ${b.bookingNumber}`,
      });
      const paid = r2(b.paidAmount + value);
      return tx.hotelBooking.update({
        where: { id },
        data: { paidAmount: paid, ...(b.status !== 'CHECKED_OUT' && { advancePaid: r2(b.advancePaid + value) }), balanceAmount: r2(Math.max(b.grandTotal - paid, 0)), paymentStatus: paymentStatus(b.grandTotal, paid) },
        include: INCLUDE,
      });
    });
  }

  /**
   * Check-out: the folio bill becomes one sale. Advances on the khata are
   * used first; money taken now may be split across methods; anything still
   * owed goes on the khata (the guest's, or a company's). A guest leaving
   * early pays for the nights stayed unless `keepBookedNights`.
   */
  async checkOut(user: AuthenticatedUser, id: string, dto: CheckOutDto = {}) {
    const b = found(await this.prisma.hotelBooking.findFirst({
      where: { id, tenantId: user.tenantId }, include: { bookedRooms: true, folioCharges: { where: { isVoid: false } } },
    }), 'Booking');
    if (!(IN_HOUSE as readonly string[]).includes(b.status)) throw new BadRequestException('Guest ka check-in nahi hua');
    const t = today();
    const over = nightsBetween(b.checkOutDate, t);
    if (over > 0) throw new BadRequestException(`Guest ${over} raat zyada ruka — pehle stay ${keyOf(t)} tak barhayein`);

    return this.prisma.$transaction(async (tx) => {
      let booking: BookingRow = b;
      const stayed = Math.max(nightsBetween(b.checkInDate, t), 1);
      if (stayed < b.nights && !dto.keepBookedNights) {
        let roomTotal = 0;
        for (const r of b.bookedRooms) {
          const totalAmount = r2(r.totalAmount * stayed / Math.max(r.totalNights, 1));
          const discount = r.isComplimentary ? totalAmount : r2(r.discount * stayed / Math.max(r.totalNights, 1));
          roomTotal += totalAmount - discount;
          await tx.hotelBookedRoom.update({ where: { id: r.id }, data: { totalNights: stayed, totalAmount, discount } });
        }
        // A guest leaving on the arrival day still pays (and counts) one night.
        booking = await this.reprice(tx, b, r2(roomTotal), { checkOutDate: addDays(b.checkInDate, stayed), nights: stayed });
      }
      const shopId = await resolveIndustryShopId(tx, user, booking.shopId);
      const { khataPaid, legacyPaid } = await bookingMoney(tx, user.tenantId, booking.bookingNumber, booking.paidAmount);
      const due = r2(Math.max(booking.grandTotal - khataPaid - legacyPaid, 0));
      // A stay billed to a company goes on its khata unless money is entered.
      const noMoneyEntered = dto.paidAmount == null && !dto.payments?.length;
      const tender = readTender(due, booking.customerId && noMoneyEntered ? { ...dto, onCredit: true } : dto);
      const money = r2(tender.rows.reduce((s, p) => s + p.amount, 0));
      const stillOwed = r2(due - money);

      const holder = await khataHolder(tx, user.tenantId, booking.bookingNumber);
      const billTo = dto.customerId ?? booking.customerId ?? null;
      if (billTo && holder && billTo !== holder && khataPaid > 0) {
        throw new BadRequestException('Advance guest ke khata me hai — bill bhi usi khata me jayega');
      }
      const guest = booking.primaryGuestId ? await tx.hotelGuest.findFirst({ where: { id: booking.primaryGuestId, tenantId: user.tenantId }, select: { customerId: true } }) : null;
      let customerId = (khataPaid > 0 ? holder : null) ?? billTo;
      if (!customerId && stillOwed > 0) {
        customerId = await guestCustomer(tx, user, { primaryGuestId: booking.primaryGuestId, guestName: booking.guestName, guestPhone: booking.guestPhone, shopId });
      }
      customerId = customerId ?? guest?.customerId ?? null;

      const bill = this.billLines(booking, b.folioCharges);
      const sale = await postHotelBill(tx, user, {
        saleNumber: `HTL-${booking.bookingNumber}`, sourceRef: booking.bookingNumber, shopId, customerId,
        lines: bill.lines, discount: bill.discount, rows: tender.rows, mainMethod: tender.mainMethod, legacyPaid,
      });

      for (const r of booking.bookedRooms) if (r.roomId) await this.freeRoom(tx, user, r.roomId, r.roomNumber ?? '', booking.id, `Check-out: ${booking.bookingNumber}`);
      if (booking.primaryGuestId) {
        await tx.hotelGuest.updateMany({
          where: { id: booking.primaryGuestId, tenantId: user.tenantId },
          data: { totalStays: { increment: 1 }, totalNights: { increment: booking.nights }, totalSpent: { increment: booking.grandTotal }, lastStayAt: new Date() },
        });
      }
      const paid = r2(khataPaid + legacyPaid + money);
      const updated = await tx.hotelBooking.update({
        where: { id },
        data: {
          status: 'CHECKED_OUT', actualCheckOut: new Date(), checkedOutBy: user.id, lateCheckOut: false,
          paidAmount: paid, balanceAmount: stillOwed, paymentStatus: paymentStatus(booking.grandTotal, paid),
        },
        include: INCLUDE,
      });
      return { ...updated, sale: { id: sale.id, saleNumber: sale.saleNumber, total: sale.total }, change: tender.change, onKhata: stillOwed };
    });
  }

  /**
   * Cancel or no-show before check-in. A charge (cancellation or first
   * night) becomes a bill paid from the advance; what is left of the
   * advance stays on the khata until it is refunded.
   */
  async cancel(user: AuthenticatedUser, id: string, dto: CancelBookingDto) {
    const b = found(await this.prisma.hotelBooking.findFirst({ where: { id, tenantId: user.tenantId }, include: INCLUDE }), 'Booking');
    if (!(OPEN_RESERVATION as readonly string[]).includes(b.status)) throw new BadRequestException('Sirf check-in se pehle booking cancel hoti hai');
    const reason = dto.reason?.trim();
    if (!reason) throw new BadRequestException('Cancel ki wajah likhein');
    const charge = r2(dto.charge ?? 0);
    if (charge > 0) requireAny(user, [PERMISSIONS.POS_USE], 'Charge ka bill banane');
    if (charge > b.grandTotal + 0.009) throw new BadRequestException(`Charge booking ke bill (Rs ${b.grandTotal}) se zyada nahi ho sakta`);
    if (dto.noShow && b.checkInDate > today()) throw new BadRequestException('No-show sirf aane ki date ke baad lagta hai');

    return this.prisma.$transaction(async (tx) => {
      let sale: { id: string; saleNumber: string } | null = null;
      if (charge > 0) {
        const shopId = await resolveIndustryShopId(tx, user, b.shopId);
        const customerId = await khataHolder(tx, user.tenantId, b.bookingNumber) ?? b.customerId
          ?? await guestCustomer(tx, user, { primaryGuestId: b.primaryGuestId, guestName: b.guestName, guestPhone: b.guestPhone, shopId });
        const kind = dto.noShow ? 'No-show' : 'Cancellation';
        const s = await postIndustrySale(tx, user, {
          saleNumber: `HTL-${dto.noShow ? 'NS' : 'CXL'}-${b.bookingNumber}`, sourceRef: b.bookingNumber, shopId, customerId,
          lines: [{ label: `${kind} charge — ${b.bookingNumber}`, amount: charge }], paidAmount: 0,
        });
        sale = { id: s.id, saleNumber: s.saleNumber };
      }
      const moved = await tx.hotelBooking.updateMany({
        where: { id, status: b.status },
        data: {
          status: dto.noShow ? 'NO_SHOW' : 'CANCELLED', cancelledAt: new Date(), cancelledBy: user.id,
          cancellationReason: charge > 0 ? `${reason} (charge Rs ${charge})` : reason,
          balanceAmount: 0,
        },
      });
      if (!moved.count) throw new BadRequestException('Booking abhi badli gayi — page dobara kholein');
      const { khataPaid } = await bookingMoney(tx, user.tenantId, b.bookingNumber, b.paidAmount);
      const updated = await tx.hotelBooking.findUniqueOrThrow({ where: { id }, include: INCLUDE });
      return { ...updated, sale, advanceLeft: r2(Math.max(khataPaid - charge, 0)) };
    });
  }

  /** Cash refund of an advance still on the khata (cancelled booking, or more paid than the bill). */
  async refund(user: AuthenticatedUser, id: string, dto: RefundAdvanceDto) {
    const b = found(await this.prisma.hotelBooking.findFirst({ where: { id, tenantId: user.tenantId } }), 'Booking');
    if (!['CANCELLED', 'NO_SHOW', 'CHECKED_OUT'].includes(b.status)) throw new BadRequestException('Advance cancel ya check-out ke baad wapas hota hai');
    await checkRefundPin(this.db, user, dto.managerPin);
    return this.prisma.$transaction(async (tx) => {
      const amount = await refundAdvance(tx, user, {
        bookingNumber: b.bookingNumber, paidAmount: b.paidAmount, shopId: b.shopId, amount: dto.amount,
        note: `Hotel advance wapas: ${b.bookingNumber}`,
      });
      const updated = await tx.hotelBooking.update({
        where: { id },
        data: { refundAmount: r2(b.refundAmount + amount), paidAmount: r2(Math.max(b.paidAmount - amount, 0)) },
        include: INCLUDE,
      });
      return { ...updated, refunded: amount };
    });
  }

  // ─── Front desk lists ────────────────────────────────────────────

  async arrivalsToday(user: AuthenticatedUser) {
    return this.prisma.hotelBooking.findMany({
      where: { tenantId: user.tenantId, status: { in: ['CONFIRMED', 'TENTATIVE'] }, checkInDate: today() },
      include: INCLUDE, orderBy: { arrivalTime: 'asc' },
    });
  }

  async departuresToday(user: AuthenticatedUser) {
    return this.prisma.hotelBooking.findMany({
      // Overdue departures stay on the list until they are checked out.
      where: { tenantId: user.tenantId, status: { in: [...IN_HOUSE] }, checkOutDate: { lte: today() } },
      include: INCLUDE, orderBy: { checkOutDate: 'asc' },
    });
  }

  async inHouseGuests(user: AuthenticatedUser) {
    return this.prisma.hotelBooking.findMany({ where: { tenantId: user.tenantId, status: { in: [...IN_HOUSE] } }, include: INCLUDE, orderBy: { checkInDate: 'desc' } });
  }
}
