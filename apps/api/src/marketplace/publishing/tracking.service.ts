import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveContext(tenantId: string, shopId?: string | null) {
    if (!shopId) {
      const shop = await this.prisma.shop.findFirst({
        where: { tenantId }, orderBy: { createdAt: 'asc' }, select: { id: true },
      });
      if (!shop) throw new NotFoundException('No shop found');
      shopId = shop.id;
    }
    const profile = await this.prisma.shopMarketplaceProfile.findUnique({
      where: { shopId }, select: { lat: true, lng: true },
    });
    return {
      shopId,
      centerLat: profile?.lat || 31.5204,  // Lahore default
      centerLng: profile?.lng || 74.3587,
    };
  }

  async liveRiders(tenantId: string, shopId: string | null | undefined) {
    const { centerLat, centerLng } = await this.resolveContext(tenantId, shopId);

    const riders = await this.prisma.mktRider.findMany({
      where: {
        tenantId,
        isActive: true,
        status: { in: ['AVAILABLE', 'ON_DELIVERY', 'BREAK'] },
        currentLat: { not: null },
        currentLng: { not: null },
      },
      select: {
        id: true, fullName: true, avatarUrl: true, phone: true,
        vehicleType: true, vehicleNumber: true, status: true,
        currentLat: true, currentLng: true, lastLocationAt: true,
      },
    });

    // Get active assignments
    const riderIds = riders.map((r) => r.id);
    const activeAssignments = await this.prisma.mktDeliveryAssignment.findMany({
      where: {
        riderId: { in: riderIds },
        status: { in: ['ACCEPTED', 'PICKED_UP'] },
      },
      select: {
        riderId: true, orderId: true,
        dropoffLat: true, dropoffLng: true,
        distanceKm: true, estimatedMinutes: true,
      },
    });
    const assignMap = new Map(activeAssignments.map((a) => [a.riderId, a]));

    const orderIds = activeAssignments.map((a) => a.orderId);
    const orders = await this.prisma.marketplaceOrder.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, orderNumber: true, addressSnapshot: true },
    });
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    return {
      riders: riders.map((r) => {
        const assign = assignMap.get(r.id);
        const order = assign ? orderMap.get(assign.orderId) : null;
        return {
          riderId: r.id,
          fullName: r.fullName,
          avatarUrl: r.avatarUrl,
          phone: r.phone,
          vehicleType: r.vehicleType,
          vehicleNumber: r.vehicleNumber,
          status: r.status,
          currentLat: r.currentLat,
          currentLng: r.currentLng,
          lastLocationAt: r.lastLocationAt?.toISOString(),
          activeOrderId: assign?.orderId,
          activeOrderNumber: order?.orderNumber,
          customerLat: assign?.dropoffLat,
          customerLng: assign?.dropoffLng,
          customerAddress: (order?.addressSnapshot as any)?.addressLine1,
          distanceKm: assign?.distanceKm,
          estimatedMinutes: assign?.estimatedMinutes,
        };
      }),
      centerLat,
      centerLng,
    };
  }

  async riderTrail(tenantId: string, shopId: string | null | undefined, riderId: string, hours: number = 4) {
    const fromDate = new Date(Date.now() - hours * 3600000);
    const trail = await this.prisma.mktRiderLocationHistory.findMany({
      where: {
        riderId,
        recordedAt: { gte: fromDate },
      },
      orderBy: { recordedAt: 'asc' },
      select: { lat: true, lng: true, speed: true, recordedAt: true },
      take: 500,
    });

    return {
      riderId,
      points: trail.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        speed: p.speed,
        recordedAt: p.recordedAt.toISOString(),
      })),
    };
  }

  async activeDeliveries(tenantId: string, shopId: string | null | undefined) {
    const { shopId: resolvedShopId } = await this.resolveContext(tenantId, shopId);

    const assignments = await this.prisma.mktDeliveryAssignment.findMany({
      where: {
        tenantId,
        shopId: resolvedShopId,
        status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP'] },
      },
      orderBy: { assignedAt: 'desc' },
      include: {
        rider: {
          select: {
            id: true, fullName: true, avatarUrl: true, phone: true,
            vehicleType: true, vehicleNumber: true, status: true,
            currentLat: true, currentLng: true, lastLocationAt: true,
          },
        },
      },
    });

    const orderIds = assignments.map((a) => a.orderId);
    const orders = await this.prisma.marketplaceOrder.findMany({
      where: { id: { in: orderIds } },
      select: {
        id: true, orderNumber: true, total: true, addressSnapshot: true,
        customer: { select: { fullName: true, phone: true } },
      },
    });
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    return assignments.map((a) => {
      const order = orderMap.get(a.orderId);
      const addr = order?.addressSnapshot as any;
      return {
        id: a.id,
        orderId: a.orderId,
        orderNumber: order?.orderNumber || '',
        status: a.status,
        rider: {
          riderId: a.rider.id,
          fullName: a.rider.fullName,
          avatarUrl: a.rider.avatarUrl,
          phone: a.rider.phone,
          vehicleType: a.rider.vehicleType,
          vehicleNumber: a.rider.vehicleNumber,
          status: a.rider.status,
          currentLat: a.rider.currentLat,
          currentLng: a.rider.currentLng,
          lastLocationAt: a.rider.lastLocationAt?.toISOString(),
        },
        customerName: order?.customer?.fullName || '',
        customerPhone: order?.customer?.phone || '',
        customerAddress: addr?.addressLine1 || '',
        total: Number(order?.total || 0),
        assignedAt: a.assignedAt.toISOString(),
        pickedUpAt: a.pickedUpAt?.toISOString(),
        distanceKm: a.distanceKm,
        estimatedMinutes: a.estimatedMinutes,
      };
    });
  }
}
