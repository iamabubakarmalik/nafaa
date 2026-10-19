import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RiderStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpdateRiderDto, UpsertRiderDto } from './dto/upsert-rider.dto';

@Injectable()
export class RidersService {
  constructor(private readonly prisma: PrismaService) {}

  create(user: AuthenticatedUser, dto: UpsertRiderDto) {
    return this.prisma.rider.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  /** Riders with their trips under way and the cash they still have to hand over. */
  async list(user: AuthenticatedUser, params: { status?: string; active?: boolean }) {
    if (params.status && !(Object.values(RiderStatus) as string[]).includes(params.status)) throw new BadRequestException('Rider ka status ghalat hai');
    const riders = await this.prisma.rider.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as RiderStatus }),
        ...(params.active !== undefined && { isActive: params.active }),
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
    if (!riders.length) return riders;
    const ids = riders.map((r) => r.id);
    const [trips, due] = await Promise.all([
      this.prisma.deliveryTracking.groupBy({ by: ['riderId'], where: { riderId: { in: ids }, status: { in: ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'ARRIVED'] } }, _count: { _all: true } }),
      this.prisma.restaurantOrder.findMany({
        where: { tenantId: user.tenantId, riderId: { in: ids }, mode: 'DELIVERY', saleId: null, status: { in: ['OUT_FOR_DELIVERY', 'DELIVERED'] } },
        select: { riderId: true, total: true, paidAmount: true },
      }),
    ]);
    return riders.map((r) => ({
      ...r,
      activeTrips: trips.find((t) => t.riderId === r.id)?._count._all ?? 0,
      cashDue: Math.round(due.filter((d) => d.riderId === r.id).reduce((n, d) => n + d.total - d.paidAmount, 0) * 100) / 100,
    }));
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
    if (!r) throw new NotFoundException('Rider nahi mila');
    return r;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateRiderDto) {
    const r = await this.prisma.rider.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Rider nahi mila');
    return this.prisma.rider.update({ where: { id }, data: dto });
  }

  async updateLocation(user: AuthenticatedUser, id: string, lat: number, lng: number) {
    const r = await this.prisma.rider.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Rider nahi mila');
    return this.prisma.rider.update({
      where: { id },
      data: { currentLat: lat, currentLng: lng, lastLocationUpdate: new Date() },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.rider.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Rider nahi mila');
    const busy = await this.prisma.deliveryTracking.count({ where: { riderId: id, status: { in: ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'ARRIVED'] } } });
    if (busy) throw new BadRequestException('Rider abhi delivery par hai — pehle wapas aane dein');
    const cash = await this.prisma.restaurantOrder.count({ where: { tenantId: user.tenantId, riderId: id, saleId: null, status: { in: ['OUT_FOR_DELIVERY', 'DELIVERED'] } } });
    if (cash) throw new BadRequestException('Rider ke paas abhi orders ka cash hai — pehle hisaab karein');
    // Kept with history; only taken off the active list.
    return this.prisma.rider.update({ where: { id }, data: { isActive: false, status: 'INACTIVE' } });
  }
}