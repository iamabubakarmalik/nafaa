import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertRoomTypeDto } from './dto/upsert-room-type.dto';

@Injectable()
export class RoomTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertRoomTypeDto) {
    const dup = await this.prisma.hotelRoomType.findFirst({ where: { tenantId: user.tenantId, code: dto.code } });
    if (dup) throw new BadRequestException(`Room type code "${dto.code}" exists`);
    return this.prisma.hotelRoomType.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { type?: string; active?: boolean; search?: string }) {
    return this.prisma.hotelRoomType.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.type && { type: params.type as any }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.search && {
          OR: [
            { code: { contains: params.search, mode: 'insensitive' } },
            { name: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        rooms: { select: { id: true, roomNumber: true, status: true } },
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const rt = await this.prisma.hotelRoomType.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { rooms: true },
    });
    if (!rt) throw new NotFoundException('Room type not found');
    return rt;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertRoomTypeDto) {
    const rt = await this.prisma.hotelRoomType.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rt) throw new NotFoundException('Room type not found');
    return this.prisma.hotelRoomType.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const rt = await this.prisma.hotelRoomType.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rt) throw new NotFoundException('Room type not found');
    return this.prisma.hotelRoomType.update({ where: { id }, data: { isActive: false } });
  }
}
