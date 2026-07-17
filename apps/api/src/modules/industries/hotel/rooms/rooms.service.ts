import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const dup = await this.prisma.hotelRoom.findFirst({ where: { tenantId: user.tenantId, roomNumber: dto.roomNumber } });
    if (dup) throw new BadRequestException(`Room ${dto.roomNumber} already exists`);
    const rt = await this.prisma.hotelRoomType.findFirst({ where: { id: dto.roomTypeId, tenantId: user.tenantId } });
    if (!rt) throw new NotFoundException('Room type not found');
    return this.prisma.hotelRoom.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { status?: string; roomTypeId?: string; housekeepingStatus?: string; floor?: string; search?: string }) {
    return this.prisma.hotelRoom.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
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

  async getOne(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.hotelRoom.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { roomType: true },
    });
    if (!r) throw new NotFoundException('Room not found');
    return r;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const r = await this.prisma.hotelRoom.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Room not found');
    return this.prisma.hotelRoom.update({ where: { id }, data: dto });
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string, notes?: string) {
    return this.prisma.hotelRoom.update({
      where: { id },
      data: { status: status as any, customNotes: notes },
    });
  }

  async updateHousekeeping(user: AuthenticatedUser, id: string, housekeepingStatus: string) {
    const patch: any = { housekeepingStatus };
    if (housekeepingStatus === 'CLEAN') patch.lastCleanedAt = new Date();
    if (housekeepingStatus === 'INSPECTED') patch.lastInspectedAt = new Date();
    return this.prisma.hotelRoom.update({ where: { id }, data: patch });
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.hotelRoom.update({ where: { id }, data: { isActive: false } });
  }

  async checkAvailability(user: AuthenticatedUser, params: { checkInDate: string; checkOutDate: string; roomTypeId?: string; adults?: number; children?: number }) {
    const checkIn = new Date(params.checkInDate);
    const checkOut = new Date(params.checkOutDate);
    if (checkOut <= checkIn) throw new BadRequestException('Invalid dates');

    // Find rooms occupied during this period
    const occupied = await this.prisma.hotelBookedRoom.findMany({
      where: {
        booking: {
          tenantId: user.tenantId,
          status: { in: ['CONFIRMED', 'CHECKED_IN', 'TENTATIVE'] },
          checkInDate: { lt: checkOut },
          checkOutDate: { gt: checkIn },
        },
      },
      select: { roomId: true },
    });
    const occupiedIds = occupied.map((o) => o.roomId).filter(Boolean) as string[];

    const available = await this.prisma.hotelRoom.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        id: { notIn: occupiedIds },
        status: { notIn: ['MAINTENANCE', 'OUT_OF_ORDER'] },
        ...(params.roomTypeId && { roomTypeId: params.roomTypeId }),
        ...(params.adults && { roomType: { maxAdults: { gte: params.adults } } }),
      },
      include: { roomType: true },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    // Group by room type
    const grouped: Record<string, any> = {};
    available.forEach((r) => {
      const tid = r.roomTypeId;
      if (!grouped[tid]) {
        grouped[tid] = {
          roomType: r.roomType,
          rooms: [],
          count: 0,
        };
      }
      grouped[tid].rooms.push(r);
      grouped[tid].count++;
    });

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return {
      checkIn,
      checkOut,
      nights,
      totalAvailable: available.length,
      byRoomType: Object.values(grouped),
    };
  }

  async summary(user: AuthenticatedUser) {
    const [total, available, occupied, cleaning, maintenance, dirty] = await Promise.all([
      this.prisma.hotelRoom.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.hotelRoom.count({ where: { tenantId: user.tenantId, isActive: true, status: 'AVAILABLE' } }),
      this.prisma.hotelRoom.count({ where: { tenantId: user.tenantId, isActive: true, status: 'OCCUPIED' } }),
      this.prisma.hotelRoom.count({ where: { tenantId: user.tenantId, isActive: true, status: 'CLEANING' } }),
      this.prisma.hotelRoom.count({ where: { tenantId: user.tenantId, isActive: true, status: 'MAINTENANCE' } }),
      this.prisma.hotelRoom.count({ where: { tenantId: user.tenantId, isActive: true, housekeepingStatus: 'DIRTY' } }),
    ]);
    return {
      total, available, occupied, cleaning, maintenance, dirty,
      occupancyPct: total > 0 ? (occupied / total) * 100 : 0,
    };
  }
}
