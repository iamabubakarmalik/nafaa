import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MktDeliveryAssignmentStatus, MktRiderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { QueueService } from '../../core/queue/queue.service';
import { hashPassword } from '../../common/utils/password.util';
import { normalizePkPhone } from '../../marketplace/_shared/helpers/phone.helper';
import { CreateRiderDto } from './dto/create-rider.dto';
import { UpdateRiderDto } from './dto/update-rider.dto';
import { AssignOrderDto } from './dto/assign-order.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CreateZoneDto } from './dto/create-zone.dto';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeService,
    private readonly queue: QueueService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // RIDER CRUD
  // ═══════════════════════════════════════════════════════════

  async createRider(tenantId: string, dto: CreateRiderDto) {
    const phone = normalizePkPhone(dto.phone);
    const existing = await this.prisma.mktRider.findUnique({ where: { phone } });
    if (existing) throw new BadRequestException('Phone already registered');

    return this.prisma.mktRider.create({
      data: {
        tenantId,
        shopId: dto.shopId,
        fullName: dto.fullName,
        phone,
        email: dto.email?.toLowerCase(),
        cnic: dto.cnic,
        passwordHash: await hashPassword(dto.password),
        vehicleType: dto.vehicleType,
        vehicleNumber: dto.vehicleNumber,
        licenseNumber: dto.licenseNumber,
      },
    });
  }

  async updateRider(tenantId: string, riderId: string, dto: UpdateRiderDto) {
    const rider = await this.prisma.mktRider.findFirst({
      where: { id: riderId, tenantId },
    });
    if (!rider) throw new NotFoundException('Rider not found');
    return this.prisma.mktRider.update({
      where: { id: riderId },
      data: {
        fullName: dto.fullName,
        cnic: dto.cnic,
        vehicleType: dto.vehicleType,
        vehicleNumber: dto.vehicleNumber,
        status: dto.status,
        shopId: dto.shopId,
        isActive: dto.isActive,
        isVerified: dto.isVerified,
        verifiedAt: dto.isVerified ? new Date() : undefined,
      },
    });
  }

  async listRiders(tenantId: string, opts?: {
    status?: MktRiderStatus; shopId?: string; search?: string;
    limit?: number; offset?: number;
  }) {
    const where: Prisma.MktRiderWhereInput = { tenantId };
    if (opts?.status) where.status = opts.status;
    if (opts?.shopId) where.shopId = opts.shopId;
    if (opts?.search) {
      where.OR = [
        { fullName: { contains: opts.search, mode: 'insensitive' } },
        { phone: { contains: opts.search } },
        { vehicleNumber: { contains: opts.search, mode: 'insensitive' } },
      ];
    }

    const [items, total, counts] = await Promise.all([
      this.prisma.mktRider.findMany({
        where,
        orderBy: [{ status: 'asc' }, { totalDeliveries: 'desc' }],
        take: opts?.limit ?? 20,
        skip: opts?.offset ?? 0,
        select: {
          id: true, fullName: true, phone: true, avatarUrl: true,
          vehicleType: true, vehicleNumber: true, status: true,
          isActive: true, isVerified: true,
          currentLat: true, currentLng: true, lastLocationAt: true,
          ratingAverage: true, ratingCount: true,
          totalDeliveries: true, completedDeliveries: true,
          createdAt: true,
        },
      }),
      this.prisma.mktRider.count({ where }),
      this.prisma.mktRider.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    counts.forEach((c) => { statusCounts[c.status] = c._count.status; });

    return { items, total, counts: statusCounts, limit: opts?.limit ?? 20, offset: opts?.offset ?? 0 };
  }

  async getRider(tenantId: string, riderId: string) {
    const rider = await this.prisma.mktRider.findFirst({
      where: { id: riderId, tenantId },
      include: {
        _count: {
          select: {
            assignments: { where: { status: { in: ['ACCEPTED', 'PICKED_UP'] } } },
          },
        },
      },
    });
    if (!rider) throw new NotFoundException('Rider not found');
    return rider;
  }

  async deleteRider(tenantId: string, riderId: string) {
    const rider = await this.prisma.mktRider.findFirst({
      where: { id: riderId, tenantId },
    });
    if (!rider) throw new NotFoundException('Rider not found');
    await this.prisma.mktRider.update({
      where: { id: riderId },
      data: { isActive: false },
    });
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // ASSIGN ORDER TO RIDER
  // ═══════════════════════════════════════════════════════════

  async assignOrder(tenantId: string, dto: AssignOrderDto) {
    const order = await this.prisma.marketplaceOrder.findFirst({
      where: { id: dto.orderId, tenantId },
      include: {
        address: true,
        shop: {
          select: {
            id: true,
            marketplaceProfile: { select: { lat: true, lng: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.deliveryType !== 'DELIVERY') {
      throw new BadRequestException('Only delivery orders can be assigned');
    }

    // Check existing assignment
    const existing = await this.prisma.mktDeliveryAssignment.findFirst({
      where: {
        orderId: dto.orderId,
        status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP'] },
      },
    });
    if (existing) throw new BadRequestException('Order already has active assignment');

    // Pick rider (given or nearest available)
    let riderId = dto.riderId;
    if (!riderId) {
      const shopLat = order.shop.marketplaceProfile?.lat;
      const shopLng = order.shop.marketplaceProfile?.lng;
      if (shopLat && shopLng) {
        const available = await this.prisma.mktRider.findMany({
          where: {
            tenantId, status: 'AVAILABLE', isActive: true, isVerified: true,
            currentLat: { not: null }, currentLng: { not: null },
          },
          select: {
            id: true, currentLat: true, currentLng: true,
            ratingAverage: true, totalDeliveries: true,
          },
          take: 20,
        });
        // Sort by distance
        const nearest = available
          .map((r) => ({
            id: r.id,
            distance: haversineKm(shopLat, shopLng, r.currentLat!, r.currentLng!),
          }))
          .sort((a, b) => a.distance - b.distance)[0];
        riderId = nearest?.id;
      }
      if (!riderId) throw new BadRequestException('No available rider found');
    }

    const rider = await this.prisma.mktRider.findFirst({
      where: { id: riderId, tenantId, isActive: true },
    });
    if (!rider) throw new NotFoundException('Rider not found');

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const shopLat = order.shop.marketplaceProfile?.lat;
    const shopLng = order.shop.marketplaceProfile?.lng;
    const distance = shopLat && shopLng && order.address?.lat && order.address?.lng
      ? haversineKm(shopLat, shopLng, order.address.lat, order.address.lng)
      : null;

    const assignment = await this.prisma.$transaction(async (tx) => {
      const a = await tx.mktDeliveryAssignment.create({
        data: {
          orderId: dto.orderId,
          riderId,
          tenantId,
          shopId: order.shopId,
          status: 'PENDING',
          pickupLat: shopLat, pickupLng: shopLng,
          dropoffLat: order.address?.lat, dropoffLng: order.address?.lng,
          distanceKm: distance,
          estimatedMinutes: distance ? Math.ceil(distance * 3) : null,
          deliveryFee: order.deliveryFee,
          riderCommission: order.deliveryFee, // simple: rider gets full delivery fee
          otpCode,
        },
      });
      await tx.marketplaceOrder.update({
        where: { id: dto.orderId },
        data: { riderId, riderName: rider.fullName, riderPhone: rider.phone },
      });
      return a;
    });

    // Notify rider
    this.rt.emitToTenant(tenantId, 'delivery:assigned', { riderId, orderId: dto.orderId });
    this.rt.emitOrderUpdate(dto.orderId, { assignedRider: rider.fullName });
    await this.queue.sendSms({
      toPhone: rider.phone,
      message: `Nafaa Bazaar: Nayi delivery mili — Order ${order.orderNumber}. App khol ke check karain.`,
    });

    return assignment;
  }

  async unassign(tenantId: string, assignmentId: string, reason?: string) {
    const a = await this.prisma.mktDeliveryAssignment.findFirst({
      where: { id: assignmentId, tenantId },
    });
    if (!a) throw new NotFoundException('Assignment not found');
    if (a.status === 'DELIVERED') {
      throw new BadRequestException('Cannot unassign delivered order');
    }
    await this.prisma.$transaction([
      this.prisma.mktDeliveryAssignment.update({
        where: { id: assignmentId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
      }),
      this.prisma.marketplaceOrder.update({
        where: { id: a.orderId },
        data: { riderId: null, riderName: null, riderPhone: null },
      }),
    ]);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // ACTIVE DELIVERIES
  // ═══════════════════════════════════════════════════════════

  async listActiveDeliveries(tenantId: string) {
    return this.prisma.mktDeliveryAssignment.findMany({
      where: {
        tenantId,
        status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP'] },
      },
      orderBy: { assignedAt: 'desc' },
      include: {
        rider: {
          select: {
            id: true, fullName: true, phone: true, avatarUrl: true,
            currentLat: true, currentLng: true, vehicleType: true, vehicleNumber: true,
          },
        },
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // TRACK RIDER (business + customer)
  // ═══════════════════════════════════════════════════════════

  async trackRider(riderId: string) {
    const rider = await this.prisma.mktRider.findUnique({
      where: { id: riderId },
      select: {
        id: true, fullName: true, avatarUrl: true, phone: true,
        currentLat: true, currentLng: true, lastLocationAt: true,
        vehicleType: true, vehicleNumber: true, status: true,
      },
    });
    if (!rider) throw new NotFoundException('Rider not found');
    return rider;
  }

  async updateRiderLocation(riderId: string, dto: UpdateLocationDto, orderId?: string) {
    const rider = await this.prisma.mktRider.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException();

    await this.prisma.$transaction([
      this.prisma.mktRider.update({
        where: { id: riderId },
        data: {
          currentLat: dto.lat,
          currentLng: dto.lng,
          lastLocationAt: new Date(),
        },
      }),
      this.prisma.mktRiderLocationHistory.create({
        data: {
          riderId, orderId,
          lat: dto.lat, lng: dto.lng,
          speed: dto.speed, heading: dto.heading, accuracy: dto.accuracy,
        },
      }),
    ]);

    // Emit to customer if delivering
    if (orderId) {
      this.rt.emitRiderLocation(orderId, { lat: dto.lat, lng: dto.lng });
    }
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // ZONES
  // ═══════════════════════════════════════════════════════════

  async createZone(tenantId: string, dto: CreateZoneDto) {
    return this.prisma.mktDeliveryZone.create({
      data: {
        tenantId,
        shopId: dto.shopId,
        name: dto.name,
        description: dto.description,
        polygonGeoJson: dto.polygonGeoJson,
        baseFee: dto.baseFee,
        perKmFee: dto.perKmFee,
        freeAbove: dto.freeAbove,
        minOrder: dto.minOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async listZones(tenantId: string, shopId?: string) {
    return this.prisma.mktDeliveryZone.findMany({
      where: { tenantId, ...(shopId ? { shopId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateZone(tenantId: string, zoneId: string, dto: Partial<CreateZoneDto>) {
    const zone = await this.prisma.mktDeliveryZone.findFirst({
      where: { id: zoneId, tenantId },
    });
    if (!zone) throw new NotFoundException();
    return this.prisma.mktDeliveryZone.update({
      where: { id: zoneId },
      data: dto as any,
    });
  }

  async deleteZone(tenantId: string, zoneId: string) {
    const zone = await this.prisma.mktDeliveryZone.findFirst({
      where: { id: zoneId, tenantId },
    });
    if (!zone) throw new NotFoundException();
    await this.prisma.mktDeliveryZone.delete({ where: { id: zoneId } });
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // STATS DASHBOARD
  // ═══════════════════════════════════════════════════════════

  async getDeliveryStats(tenantId: string) {
    const [activeRiders, availableRiders, activeDeliveries, todayDelivered, weekEarnings] = await Promise.all([
      this.prisma.mktRider.count({ where: { tenantId, isActive: true } }),
      this.prisma.mktRider.count({ where: { tenantId, status: 'AVAILABLE' } }),
      this.prisma.mktDeliveryAssignment.count({
        where: { tenantId, status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP'] } },
      }),
      this.prisma.mktDeliveryAssignment.count({
        where: {
          tenantId, status: 'DELIVERED',
          deliveredAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.mktDeliveryAssignment.aggregate({
        where: {
          tenantId, status: 'DELIVERED',
          deliveredAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        _sum: { deliveryFee: true, riderCommission: true },
      }),
    ]);

    return {
      activeRiders, availableRiders, activeDeliveries, todayDelivered,
      weekDeliveryRevenue: Number(weekEarnings._sum.deliveryFee ?? 0),
      weekRiderCommissions: Number(weekEarnings._sum.riderCommission ?? 0),
    };
  }
}
