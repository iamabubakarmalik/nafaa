import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async assign(user: AuthenticatedUser, orderId: string, riderId: string, opts?: { estimatedMinutes?: number; distanceKm?: number; deliveryFee?: number; riderCommission?: number }) {
    const order = await this.prisma.restaurantOrder.findFirst({ where: { id: orderId, tenantId: user.tenantId } });
    if (!order) throw new NotFoundException('Order not found');

    const rider = await this.prisma.rider.findFirst({ where: { id: riderId, tenantId: user.tenantId } });
    if (!rider) throw new NotFoundException('Rider not found');

    const existing = await this.prisma.deliveryTracking.findUnique({ where: { orderId } });

    const data = {
      orderId,
      riderId,
      status: 'ASSIGNED' as const,
      assignedAt: new Date(),
      pickupLat: order.deliveryLat ?? null,
      pickupLng: order.deliveryLng ?? null,
      dropoffLat: order.deliveryLat ?? null,
      dropoffLng: order.deliveryLng ?? null,
      distanceKm: opts?.distanceKm,
      estimatedMinutes: opts?.estimatedMinutes,
      deliveryFee: opts?.deliveryFee ?? order.deliveryFee,
      riderCommission: opts?.riderCommission ?? 0,
    };

    const tracking = existing
      ? await this.prisma.deliveryTracking.update({ where: { orderId }, data })
      : await this.prisma.deliveryTracking.create({ data });

    await this.prisma.rider.update({ where: { id: riderId }, data: { status: 'BUSY' } });
    await this.prisma.restaurantOrder.update({ where: { id: orderId }, data: { riderId, deliveryStatus: 'ASSIGNED' } });

    return tracking;
  }

  async updateStatus(user: AuthenticatedUser, orderId: string, status: string, opts?: { customerRating?: number; feedback?: string; proofPhotoUrl?: string; failureReason?: string }) {
    const t = await this.prisma.deliveryTracking.findUnique({ where: { orderId } });
    if (!t) throw new NotFoundException('Delivery not found');

    const now = new Date();
    const patch: any = { status };
    if (status === 'PICKED_UP') patch.pickedUpAt = now;
    if (status === 'ON_THE_WAY') patch.onTheWayAt = now;
    if (status === 'ARRIVED') patch.arrivedAt = now;
    if (status === 'DELIVERED') {
      patch.deliveredAt = now;
      if (t.assignedAt) patch.actualMinutes = Math.round((now.getTime() - t.assignedAt.getTime()) / 60000);
      if (opts?.customerRating !== undefined) patch.customerRating = opts.customerRating;
      if (opts?.feedback) patch.customerFeedback = opts.feedback;
      if (opts?.proofPhotoUrl) patch.proofPhotoUrl = opts.proofPhotoUrl;
      if (t.riderId) await this.prisma.rider.update({ where: { id: t.riderId }, data: { status: 'ACTIVE', totalDeliveries: { increment: 1 } } });
    }
    if (status === 'FAILED') {
      patch.failureReason = opts?.failureReason;
      if (t.riderId) await this.prisma.rider.update({ where: { id: t.riderId }, data: { status: 'ACTIVE' } });
    }

    const updated = await this.prisma.deliveryTracking.update({ where: { orderId }, data: patch });

    // Sync order-level status
    const orderStatusMap: Record<string, string> = {
      PICKED_UP: 'OUT_FOR_DELIVERY',
      ON_THE_WAY: 'OUT_FOR_DELIVERY',
      DELIVERED: 'DELIVERED',
    };
    if (orderStatusMap[status]) {
      const patch2: any = { deliveryStatus: status };
      patch2.status = orderStatusMap[status];
      if (status === 'DELIVERED') patch2.deliveredAt = now;
      if (status === 'PICKED_UP' || status === 'ON_THE_WAY') patch2.outForDeliveryAt = now;
      await this.prisma.restaurantOrder.update({ where: { id: orderId }, data: patch2 });
    }

    return updated;
  }

  async listActive(user: AuthenticatedUser) {
    return this.prisma.deliveryTracking.findMany({
      where: {
        status: { notIn: ['DELIVERED', 'FAILED', 'RETURNED'] },
        order: { tenantId: user.tenantId },
      },
      include: {
        order: { include: { table: true } },
        rider: true,
      },
      orderBy: { assignedAt: 'desc' },
    });
  }
}