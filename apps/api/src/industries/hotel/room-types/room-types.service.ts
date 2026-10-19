/**
 * Room types: the hotel's catalog (rate, weekend / season prices, capacity,
 * beds and amenities). A new type can bring its rooms in the same step, all
 * or nothing. Types are switched off, never deleted.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { HOLDING, found, today } from '../common/hotel-common';
import { CreateRoomTypeDto, UpdateRoomTypeDto } from './dto/upsert-room-type.dto';

@Injectable()
export class RoomTypesService {
  constructor(private readonly prisma: PrismaService) {}

  private check(dto: UpdateRoomTypeDto, base?: { maxAdults: number; maxChildren: number; maxOccupancy: number; basePrice: number }) {
    const adults = dto.maxAdults ?? base?.maxAdults ?? 2;
    const occupancy = dto.maxOccupancy ?? base?.maxOccupancy ?? adults;
    if (occupancy < adults) throw new BadRequestException('Kul log, bado se kam nahi ho sakte');
    const basePrice = dto.basePrice ?? base?.basePrice;
    if (!(Number(basePrice) > 0)) throw new BadRequestException('Ek raat ka rate likhein');
  }

  async create(user: AuthenticatedUser, dto: CreateRoomTypeDto) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Room type ka naam likhein');
    const code = (dto.code?.trim() || name.replace(/[^A-Za-z0-9]+/g, '').slice(0, 6) || 'RT').toUpperCase();
    this.check(dto);
    const dup = await this.prisma.hotelRoomType.findFirst({ where: { tenantId: user.tenantId, code } });
    if (dup) throw new BadRequestException(`Code "${code}" pehle se ${dup.name} ka hai`);
    const { rooms = [], ...fields } = dto;
    const numbers = rooms.map((r) => r.roomNumber.trim());
    if (numbers.some((n) => !n)) throw new BadRequestException('Har room ka number likhein');
    if (new Set(numbers).size !== numbers.length) throw new BadRequestException('Ek room number do dafa likha hai');
    if (numbers.length) {
      const taken = await this.prisma.hotelRoom.findMany({ where: { tenantId: user.tenantId, roomNumber: { in: numbers } }, select: { roomNumber: true } });
      if (taken.length) throw new BadRequestException(`Ye room number pehle se hain: ${taken.map((t) => t.roomNumber).join(', ')}`);
    }
    return this.prisma.$transaction(async (tx) => {
      const rt = await tx.hotelRoomType.create({
        data: { ...fields, name, code, type: dto.type ?? 'DOUBLE', basePrice: dto.basePrice!, maxOccupancy: dto.maxOccupancy ?? dto.maxAdults ?? 2, tenantId: user.tenantId } as Prisma.HotelRoomTypeUncheckedCreateInput,
      });
      if (rooms.length) {
        await tx.hotelRoom.createMany({
          data: rooms.map((r) => ({
            tenantId: user.tenantId, roomTypeId: rt.id, roomNumber: r.roomNumber.trim(),
            floor: r.floor?.trim() || null, building: r.building?.trim() || null, wing: r.wing?.trim() || null,
            viewType: r.viewType?.trim() || null, facing: r.facing?.trim() || null,
            customPrice: r.customPrice && r.customPrice > 0 ? r.customPrice : null, customNotes: r.customNotes?.trim() || null,
          })),
        });
      }
      return { ...rt, roomsCreated: rooms.length };
    });
  }

  async list(user: AuthenticatedUser, params: { type?: string; active?: boolean; search?: string }) {
    const search = params.search?.trim();
    return this.prisma.hotelRoomType.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.type && { type: params.type as Prisma.EnumRoomTypeFilter['equals'] }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(search && { OR: [{ code: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }] }),
      },
      include: { rooms: { where: { isActive: true }, select: { id: true, roomNumber: true, status: true, housekeepingStatus: true, floor: true } } },
      orderBy: [{ isActive: 'desc' }, { displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const rt = found(await this.prisma.hotelRoomType.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { rooms: { orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }] } },
    }), 'Room type');
    const since = new Date(Date.now() - 90 * 86_400_000);
    const stays = await this.prisma.hotelBookedRoom.findMany({
      where: { roomTypeId: id, booking: { tenantId: user.tenantId, status: { in: ['CHECKED_IN', 'EXTENDED', 'CHECKED_OUT'] }, checkOutDate: { gte: since } } },
      select: { totalNights: true, totalAmount: true, discount: true },
    });
    const nights = stays.reduce((s, r) => s + r.totalNights, 0);
    const revenue = stays.reduce((s, r) => s + r.totalAmount - (r.discount || 0), 0);
    return { ...rt, last90: { stays: stays.length, nights, revenue: Math.round(revenue), adr: nights ? Math.round(revenue / nights) : 0 } };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateRoomTypeDto) {
    const rt = found(await this.prisma.hotelRoomType.findFirst({ where: { id, tenantId: user.tenantId } }), 'Room type');
    this.check(dto, rt);
    const code = dto.code?.trim().toUpperCase();
    if (code && code !== rt.code) {
      const dup = await this.prisma.hotelRoomType.findFirst({ where: { tenantId: user.tenantId, code, id: { not: id } } });
      if (dup) throw new BadRequestException(`Code "${code}" pehle se ${dup.name} ka hai`);
    }
    if (dto.isActive === false) await this.assertNoBookings(user.tenantId, id);
    return this.prisma.hotelRoomType.update({
      where: { id },
      data: { ...dto, ...(code && { code }), ...(dto.name !== undefined && { name: dto.name.trim() || rt.name }) },
    });
  }

  private async assertNoBookings(tenantId: string, roomTypeId: string) {
    const held = await this.prisma.hotelBookedRoom.findFirst({
      where: { roomTypeId, booking: { tenantId, status: { in: [...HOLDING] }, checkOutDate: { gte: today() } } },
      select: { booking: { select: { bookingNumber: true } } },
    });
    if (held) throw new BadRequestException(`Is type par booking ${held.booking.bookingNumber} chal rahi hai — pehle use dusre room me badlein`);
  }

  /** Switches the type off; its rooms stop taking new bookings, history stays. */
  async remove(user: AuthenticatedUser, id: string) {
    found(await this.prisma.hotelRoomType.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } }), 'Room type');
    await this.assertNoBookings(user.tenantId, id);
    return this.prisma.hotelRoomType.update({ where: { id }, data: { isActive: false } });
  }
}
