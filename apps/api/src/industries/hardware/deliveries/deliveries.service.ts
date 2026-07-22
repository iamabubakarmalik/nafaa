import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ConfirmDeliveryDto, CreateDeliveryDto, UpdateDeliveryStatusDto } from './dto/create-delivery.dto';

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateDeliveryDto) {
    if (!dto.items?.length) throw new BadRequestException('At least one item required');

    const count = await this.prisma.hardwareDelivery.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const deliveryNumber = `DEL-${year}-${String(count + 1).padStart(4, '0')}`;

    const totalCharges = (dto.deliveryCharge ?? 0) + (dto.loadingCharge ?? 0) + (dto.unloadingCharge ?? 0) + (dto.laborCharge ?? 0) + (dto.tollCharge ?? 0);

    const enrichedItems = dto.items.map((it, idx) => ({
      productId: it.productId,
      variantId: it.variantId,
      itemName: it.itemName,
      brand: it.brand,
      orderedQty: it.orderedQty,
      unit: it.unit ?? 'PIECE',
      unitPrice: it.unitPrice ?? 0,
      total: (it.unitPrice ?? 0) * it.orderedQty,
      notes: it.notes,
      displayOrder: idx,
    }));

    return this.prisma.hardwareDelivery.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        deliveryNumber,
        saleId: dto.saleId,
        projectId: dto.projectId,
        quotationId: dto.quotationId,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        deliveryAddress: dto.deliveryAddress,
        city: dto.city,
        area: dto.area,
        latitude: dto.latitude,
        longitude: dto.longitude,
        landmark: dto.landmark,
        siteContactName: dto.siteContactName,
        siteContactPhone: dto.siteContactPhone,
        vehicleType: dto.vehicleType ?? 'TRUCK',
        vehicleNumber: dto.vehicleNumber,
        driverName: dto.driverName,
        driverPhone: dto.driverPhone,
        driverCnic: dto.driverCnic,
        helperName: dto.helperName,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        scheduledTime: dto.scheduledTime,
        distanceKm: dto.distanceKm,
        deliveryCharge: dto.deliveryCharge ?? 0,
        loadingCharge: dto.loadingCharge ?? 0,
        unloadingCharge: dto.unloadingCharge ?? 0,
        laborCharge: dto.laborCharge ?? 0,
        tollCharge: dto.tollCharge ?? 0,
        totalCharges,
        loadingInstructions: dto.loadingInstructions,
        driverInstructions: dto.driverInstructions,
        customerNotes: dto.customerNotes,
        internalNotes: dto.internalNotes,
        createdById: user.id,
        items: { create: enrichedItems },
      },
      include: { items: true },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; projectId?: string; customerId?: string; vehicleType?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.hardwareDelivery.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.projectId && { projectId: params.projectId }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.vehicleType && { vehicleType: params.vehicleType as any }),
        ...(params.from || params.to ? {
          scheduledDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { deliveryNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { vehicleNumber: { contains: params.search, mode: 'insensitive' } },
            { driverName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { items: { take: 3 }, project: true },
      orderBy: [{ status: 'asc' }, { scheduledDate: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const d = await this.prisma.hardwareDelivery.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: { orderBy: { displayOrder: 'asc' } }, project: true },
    });
    if (!d) throw new NotFoundException('Delivery not found');
    return d;
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateDeliveryStatusDto) {
    const d = await this.prisma.hardwareDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'LOADED') patch.loadedAt = now;
    if (dto.status === 'DISPATCHED' || dto.status === 'IN_TRANSIT') patch.dispatchedAt = patch.dispatchedAt ?? now;
    if (dto.status === 'DELIVERED') patch.deliveredAt = now;
    if (dto.status === 'CANCELLED') {
      patch.cancelledAt = now;
      patch.cancellationReason = dto.cancellationReason;
    }
    if (dto.issueReported) patch.issueReported = dto.issueReported;

    return this.prisma.hardwareDelivery.update({ where: { id }, data: patch, include: { items: true } });
  }

  async confirmDelivery(user: AuthenticatedUser, id: string, dto: ConfirmDeliveryDto) {
    const d = await this.prisma.hardwareDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');

    return this.prisma.$transaction(async (tx) => {
      // Update item quantities if provided
      if (dto.deliveredItems?.length) {
        for (const item of dto.deliveredItems) {
          await tx.hardwareDeliveryItem.update({
            where: { id: item.itemId },
            data: {
              deliveredQty: item.deliveredQty,
              damagedQty: item.damagedQty ?? 0,
              returnedQty: item.returnedQty ?? 0,
            },
          });
        }
      }

      const items = await tx.hardwareDeliveryItem.findMany({ where: { deliveryId: id } });
      const allDelivered = items.every((it) => it.deliveredQty >= it.orderedQty);
      const partial = items.some((it) => it.deliveredQty > 0 && it.deliveredQty < it.orderedQty);
      const status: any = allDelivered ? 'DELIVERED' : partial ? 'PARTIALLY_DELIVERED' : 'DELIVERED';

      return tx.hardwareDelivery.update({
        where: { id },
        data: {
          status,
          deliveredAt: new Date(),
          receivedByName: dto.receivedByName,
          receivedByPhone: dto.receivedByPhone,
          receivedByCnic: dto.receivedByCnic,
          receiverSignatureUrl: dto.receiverSignatureUrl,
          deliveryProofUrls: dto.deliveryProofUrls ?? [],
          gateEntryNumber: dto.gateEntryNumber,
        },
        include: { items: true },
      });
    });
  }

  async assignVehicle(user: AuthenticatedUser, id: string, dto: { vehicleNumber?: string; driverName?: string; driverPhone?: string; driverCnic?: string; helperName?: string }) {
    const d = await this.prisma.hardwareDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');
    return this.prisma.hardwareDelivery.update({
      where: { id },
      data: { ...dto, status: 'SCHEDULED' },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const d = await this.prisma.hardwareDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');
    return this.prisma.hardwareDelivery.delete({ where: { id } });
  }

  async summary(user: AuthenticatedUser) {
    const [pending, inTransit, delivered, todayScheduled] = await Promise.all([
      this.prisma.hardwareDelivery.count({ where: { tenantId: user.tenantId, status: 'PENDING' } }),
      this.prisma.hardwareDelivery.count({ where: { tenantId: user.tenantId, status: { in: ['LOADED', 'DISPATCHED', 'IN_TRANSIT'] } } }),
      this.prisma.hardwareDelivery.aggregate({ where: { tenantId: user.tenantId, status: 'DELIVERED' }, _count: { _all: true }, _sum: { totalCharges: true } }),
      this.prisma.hardwareDelivery.count({
        where: {
          tenantId: user.tenantId,
          scheduledDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)), lte: new Date(new Date().setHours(23, 59, 59, 999)) },
        },
      }),
    ]);

    return {
      pending,
      inTransit,
      deliveredCount: delivered._count._all,
      deliveredRevenue: delivered._sum.totalCharges ?? 0,
      todayScheduled,
    };
  }
}
