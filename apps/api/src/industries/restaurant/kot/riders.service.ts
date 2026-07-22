import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertRiderDto } from './dto/upsert-rider.dto';

@Injectable()
export class RidersService {
  constructor(private readonly prisma: PrismaService) {}

  create(user: AuthenticatedUser, dto: UpsertRiderDto) {
    return this.prisma.rider.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  list(user: AuthenticatedUser, params: { status?: string; active?: boolean }) {
    return this.prisma.rider.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.active !== undefined && { isActive: params.active }),
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.rider.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        deliveries: {
          include: { order: { select: { orderNumber: true, total: true, createdAt: true } } },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
      },
    });
    if (!r) throw new NotFoundException('Rider not found');
    return r;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertRiderDto) {
    const r = await this.prisma.rider.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Rider not found');
    return this.prisma.rider.update({ where: { id }, data: dto });
  }

  async updateLocation(user: AuthenticatedUser, id: string, lat: number, lng: number) {
    const r = await this.prisma.rider.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Rider not found');
    return this.prisma.rider.update({
      where: { id },
      data: { currentLat: lat, currentLng: lng, lastLocationUpdate: new Date() },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.rider.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Rider not found');
    return this.prisma.rider.update({ where: { id }, data: { isActive: false } });
  }
}
