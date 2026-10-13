import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ConfirmDeliveryDto, CreateFurnitureDeliveryDto, UpdateDeliveryStatusDto } from './dto/create-delivery.dto';
import { createWithDocNumber, LATEST_NUMBERS } from '../common/doc-number';
import { endOfDayTz, startOfDayTz } from '../../../common/helpers/business-time.helper';
import { BILLED, billCustomOrder, orderSaleNumber } from '../custom-orders/order-billing';

@Injectable()
export class FurnitureDeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, input: CreateFurnitureDeliveryDto) {
    // Links must point at this shop's own records ("" means none).
    const dto = {
      ...input,
      saleId: input.saleId?.trim() || undefined,
      customOrderId: input.customOrderId?.trim() || undefined,
      customerId: input.customerId?.trim() || undefined,
    };
    const t = user.tenantId;
    if (dto.saleId && !(await this.prisma.sale.findFirst({ where: { id: dto.saleId, tenantId: t }, select: { id: true } }))) throw new NotFoundException('Bill nahi mila');
    if (dto.customOrderId && !(await this.prisma.furnitureCustomOrder.findFirst({ where: { id: dto.customOrderId, tenantId: t }, select: { id: true } }))) throw new NotFoundException('Order nahi mila');
    if (dto.customerId && !(await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: t }, select: { id: true } }))) throw new NotFoundException('Customer nahi mila');
    const prefix = `FDL-${new Date().getFullYear()}-`;

    let floorCharge = dto.floorCharge ?? 0;
    if (!dto.hasLift && dto.floorNumber && dto.floorNumber > 0 && floorCharge === 0) {
      floorCharge = dto.floorNumber * 500;
    }

    const totalCharge = (dto.deliveryCharge ?? 0) + (dto.loadingCharge ?? 0) + (dto.unloadingCharge ?? 0) + floorCharge + (dto.assemblyCharge ?? 0);

    return createWithDocNumber({
      prefix,
      width: 4,
      existing: async () => (await this.prisma.furnitureDelivery.findMany({
        where: { tenantId: user.tenantId, deliveryNumber: { startsWith: prefix } },
        select: { deliveryNumber: true }, orderBy: { createdAt: 'desc' }, take: LATEST_NUMBERS,
      })).map((d) => d.deliveryNumber),
      create: (deliveryNumber) => this.prisma.furnitureDelivery.create({
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
    }),
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
    if (['DELIVERED', 'ASSEMBLED', 'RETURNED', 'FAILED'].includes(d.status)) throw new BadRequestException('Ye delivery band ho chuki hai');
    // Only the vehicle fields; the body is untyped, so nothing else may reach the row.
    const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    const helpers = Number(dto?.helpersCount);
    return this.prisma.furnitureDelivery.update({
      where: { id },
      data: {
        vehicleType: text(dto?.vehicleType),
        vehicleNumber: text(dto?.vehicleNumber),
        driverName: text(dto?.driverName),
        driverPhone: text(dto?.driverPhone),
        helpersCount: Number.isFinite(helpers) && helpers >= 0 ? Math.round(helpers) : undefined,
        ...(d.status === 'PENDING' && { status: 'SCHEDULED' }),
      },
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

    return this.prisma.$transaction(async (tx) => {
      await this.billLinkedOrder(tx, user, d.customOrderId, dto.status);
      return tx.furnitureDelivery.update({ where: { id }, data: patch });
    });
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

    return this.prisma.$transaction(async (tx) => {
      await this.billLinkedOrder(tx, user, d.customOrderId, patch.status);
      return tx.furnitureDelivery.update({ where: { id }, data: patch });
    });
  }

  /** A custom order reaching the customer is its sale: bill it with the delivery. */
  private async billLinkedOrder(tx: any, user: AuthenticatedUser, customOrderId: string | null, status: string) {
    if (!customOrderId || !['DELIVERED', 'ASSEMBLED'].includes(status)) return;
    const o = await tx.furnitureCustomOrder.findFirst({ where: { id: customOrderId, tenantId: user.tenantId } });
    if (!o || BILLED.includes(o.status) || ['CANCELLED', 'REFUNDED'].includes(o.status)) return;
    const billed = await billCustomOrder(tx, user, o);
    await tx.furnitureCustomOrder.update({
      where: { id: o.id },
      data: {
        ...billed,
        status,
        actualDeliveryDate: o.actualDeliveryDate ?? new Date(),
        internalNotes: [o.internalNotes, `Bill ${orderSaleNumber(o.orderNumber)}`].filter(Boolean).join('\n'),
      },
    });
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
          scheduledDate: { gte: startOfDayTz(), lte: endOfDayTz() },
        },
      }),
    ]);
    return { pending, scheduled, inTransit, delivered, assembled, todayScheduled };
  }

  async todaySchedule(user: AuthenticatedUser) {
    // Business day (Pakistan time), not the server's UTC day.
    const start = startOfDayTz();
    const end = endOfDayTz();
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
