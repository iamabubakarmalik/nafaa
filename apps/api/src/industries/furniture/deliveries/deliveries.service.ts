import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ConfirmDeliveryDto, CreateFurnitureDeliveryDto, UpdateDeliveryStatusDto } from './dto/create-delivery.dto';

@Injectable()
export class FurnitureDeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateFurnitureDeliveryDto) {
    const count = await this.prisma.furnitureDelivery.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const deliveryNumber = `FDL-${year}-${String(count + 1).padStart(4, '0')}`;

    let floorCharge = dto.floorCharge ?? 0;
    if (!dto.hasLift && dto.floorNumber && dto.floorNumber > 0 && floorCharge === 0) {
      floorCharge = dto.floorNumber * 500;
    }

    const totalCharge = (dto.deliveryCharge ?? 0) + (dto.loadingCharge ?? 0) + (dto.unloadingCharge ?? 0) + floorCharge + (dto.assemblyCharge ?? 0);

    return this.prisma.furnitureDelivery.create({
      data: {
        tenantId: user.tenantId,
        deliveryNumber,
        ...dto,
        productIds: dto.productIds ?? [],
        productNames: dto.productNames ?? [],
        itemsCount: dto.itemsCount ?? 1,
        floorCharge,
        totalCharge,
        helpersCount: dto.helpersCount ?? 2,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        requiresAssembly: dto.requiresAssembly ?? true,
        assemblyIncluded: dto.assemblyIncluded ?? true,
        status: 'PENDING',
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.furnitureDelivery.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
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
    const d = await this.prisma.furnitureDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');
    return d;
  }

  async assignVehicle(user: AuthenticatedUser, id: string, dto: { vehicleType?: string; vehicleNumber: string; driverName: string; driverPhone: string; helpersCount?: number }) {
    const d = await this.prisma.furnitureDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');
    return this.prisma.furnitureDelivery.update({
      where: { id },
      data: { ...dto, status: 'SCHEDULED' },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateDeliveryStatusDto) {
    const d = await this.prisma.furnitureDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'DISPATCHED') patch.dispatchedAt = now;
    if (dto.status === 'ARRIVED') patch.arrivedAt = now;
    if (dto.status === 'DELIVERED') patch.deliveredAt = now;
    if (dto.status === 'ASSEMBLED') patch.assembledAt = now;
    if (dto.notes) patch.notes = ((d.notes || '') + '\n' + dto.notes).trim();

    return this.prisma.furnitureDelivery.update({ where: { id }, data: patch });
  }

  async confirmDelivery(user: AuthenticatedUser, id: string, dto: ConfirmDeliveryDto) {
    const d = await this.prisma.furnitureDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');

    const now = new Date();
    const patch: any = {
      status: d.requiresAssembly ? 'DELIVERED' : 'DELIVERED',
      deliveredAt: now,
      receivedByName: dto.receivedByName,
      receivedByCnic: dto.receivedByCnic,
      signatureUrl: dto.signatureUrl,
      photoUrls: dto.photoUrls ?? [],
      customerRating: dto.customerRating,
      customerFeedback: dto.customerFeedback,
      assemblyTimeSpent: dto.assemblyTimeSpent,
      assemblyNotes: dto.assemblyNotes,
    };

    if (d.requiresAssembly && dto.assemblyTimeSpent) {
      patch.status = 'ASSEMBLED';
      patch.assembledAt = now;
    }

    return this.prisma.furnitureDelivery.update({ where: { id }, data: patch });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const d = await this.prisma.furnitureDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');
    if (['DELIVERED', 'ASSEMBLED'].includes(d.status)) {
      throw new BadRequestException('Cannot delete completed delivery');
    }
    return this.prisma.furnitureDelivery.delete({ where: { id } });
  }

  async summary(user: AuthenticatedUser) {
    const [pending, scheduled, inTransit, delivered, assembled, todayScheduled] = await Promise.all([
      this.prisma.furnitureDelivery.count({ where: { tenantId: user.tenantId, status: 'PENDING' } }),
      this.prisma.furnitureDelivery.count({ where: { tenantId: user.tenantId, status: 'SCHEDULED' } }),
      this.prisma.furnitureDelivery.count({ where: { tenantId: user.tenantId, status: { in: ['DISPATCHED', 'IN_TRANSIT', 'ARRIVED'] } } }),
      this.prisma.furnitureDelivery.count({ where: { tenantId: user.tenantId, status: 'DELIVERED' } }),
      this.prisma.furnitureDelivery.count({ where: { tenantId: user.tenantId, status: 'ASSEMBLED' } }),
      this.prisma.furnitureDelivery.count({
        where: {
          tenantId: user.tenantId,
          scheduledDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);
    return { pending, scheduled, inTransit, delivered, assembled, todayScheduled };
  }

  async todaySchedule(user: AuthenticatedUser) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return this.prisma.furnitureDelivery.findMany({
      where: {
        tenantId: user.tenantId,
        scheduledDate: { gte: start, lte: end },
        status: { in: ['SCHEDULED', 'DISPATCHED', 'IN_TRANSIT'] },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }
}
