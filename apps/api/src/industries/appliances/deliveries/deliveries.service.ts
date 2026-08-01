import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ConfirmApplianceDeliveryDto, CreateApplianceDeliveryDto, UpdateApplianceDeliveryStatusDto } from './dto/create-delivery.dto';

@Injectable()
export class ApplianceDeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateApplianceDeliveryDto) {
    const count = await this.prisma.applianceDelivery.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const deliveryNumber = `APDL-${year}-${String(count + 1).padStart(4, '0')}`;

    // Auto floor charge if no lift and floor > 0
    let floorCharge = dto.floorCharge ?? 0;
    if (!dto.hasLift && dto.floorNumber && dto.floorNumber > 0 && floorCharge === 0) {
      floorCharge = dto.floorNumber * 300; // Rs 300 per floor default
    }

    const totalCharge = (dto.deliveryCharge ?? 0) + (dto.loadingCharge ?? 0) + (dto.unloadingCharge ?? 0) + floorCharge;

    return this.prisma.applianceDelivery.create({
      data: {
        tenantId: user.tenantId,
        deliveryNumber,
        ...dto,
        serialTrackingIds: dto.serialTrackingIds ?? [],
        floorCharge,
        totalCharge,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        status: 'PENDING',
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.applianceDelivery.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.from || params.to
          ? {
              scheduledDate: {
                ...(params.from && { gte: new Date(params.from) }),
                ...(params.to && { lte: new Date(params.to) }),
              },
            }
          : {}),
        ...(params.search && {
          OR: [
            { deliveryNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { vehicleNumber: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { scheduledDate: 'asc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const d = await this.prisma.applianceDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');
    return d;
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateApplianceDeliveryStatusDto) {
    const d = await this.prisma.applianceDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'DISPATCHED') patch.dispatchedAt = now;
    if (dto.status === 'ARRIVED') patch.arrivedAt = now;
    if (dto.status === 'DELIVERED') patch.deliveredAt = now;
    if (dto.notes) patch.notes = ((d.notes || '') + '\n' + dto.notes).trim();

    return this.prisma.applianceDelivery.update({ where: { id }, data: patch });
  }

  async confirmDelivery(user: AuthenticatedUser, id: string, dto: ConfirmApplianceDeliveryDto) {
    const d = await this.prisma.applianceDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.applianceDelivery.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          receivedByName: dto.receivedByName,
          receivedByCnic: dto.receivedByCnic,
          signatureUrl: dto.signatureUrl,
          photoUrls: dto.photoUrls ?? [],
        },
      });

      // Update serial trackings
      if (d.serialTrackingIds.length > 0) {
        await tx.applianceSerialTracking.updateMany({
          where: { id: { in: d.serialTrackingIds } },
          data: { deliveredAt: new Date(), deliveredBy: d.driverName },
        });
      }

      return updated;
    });
  }

  async assignVehicle(user: AuthenticatedUser, id: string, dto: { vehicleNumber: string; driverName: string; driverPhone: string; helperCount?: number }) {
    const d = await this.prisma.applianceDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');
    return this.prisma.applianceDelivery.update({
      where: { id },
      data: { ...dto, status: 'SCHEDULED' },
    });
  }

  async summary(user: AuthenticatedUser) {
    const [pending, scheduled, dispatched, delivered, todayScheduled] = await Promise.all([
      this.prisma.applianceDelivery.count({ where: { tenantId: user.tenantId, status: 'PENDING' } }),
      this.prisma.applianceDelivery.count({ where: { tenantId: user.tenantId, status: 'SCHEDULED' } }),
      this.prisma.applianceDelivery.count({ where: { tenantId: user.tenantId, status: 'DISPATCHED' } }),
      this.prisma.applianceDelivery.count({ where: { tenantId: user.tenantId, status: 'DELIVERED' } }),
      this.prisma.applianceDelivery.count({
        where: {
          tenantId: user.tenantId,
          scheduledDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);
    return { pending, scheduled, dispatched, delivered, todayScheduled };
  }
}
