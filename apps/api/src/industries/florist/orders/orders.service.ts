import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateFloristOrderDto, DeliveryConfirmDto, UpdateOrderStatusDto } from './dto/create-order.dto';

@Injectable()
export class FloristOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateFloristOrderDto) {
    const count = await this.prisma.floristOrder.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const orderNumber = `FL-${year}-${String(count + 1).padStart(4, '0')}`;

    const subtotal = dto.items.reduce((s, it) => s + Number(it.total || 0), 0);
    const discountAmount = dto.discountAmount ?? 0;
    const deliveryCharge = dto.deliveryCharge ?? 0;
    const wrappingCharge = dto.wrappingCharge ?? 0;
    const totalAmount = subtotal - discountAmount + deliveryCharge + wrappingCharge;

    return this.prisma.floristOrder.create({
      data: {
        tenantId: user.tenantId,
        orderNumber,
        orderType: dto.orderType ?? 'WALK_IN',
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        senderName: dto.senderName,
        recipientName: dto.recipientName,
        recipientPhone: dto.recipientPhone,
        deliveryAddress: dto.deliveryAddress,
        city: dto.city,
        area: dto.area,
        landmark: dto.landmark,
        latitude: dto.latitude,
        longitude: dto.longitude,
        messageCard: dto.messageCard,
        isAnonymous: dto.isAnonymous ?? false,
        items: dto.items as any,
        subtotal,
        discountAmount,
        deliveryCharge,
        wrappingCharge,
        totalAmount,
        advancePaid: dto.advancePaid ?? 0,
        paymentMethod: dto.paymentMethod,
        deliveryTimeSlot: dto.deliveryTimeSlot,
        scheduledDeliveryDate: dto.scheduledDeliveryDate ? new Date(dto.scheduledDeliveryDate) : null,
        scheduledDeliveryTime: dto.scheduledDeliveryTime,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
        eventName: dto.eventName,
        eventVenue: dto.eventVenue,
        isRecurring: dto.isRecurring ?? false,
        recurringFrequency: dto.recurringFrequency,
        notes: dto.notes,
        specialInstructions: dto.specialInstructions,
        internalNotes: dto.internalNotes,
        handledById: user.id,
        status: 'DRAFT',
      },
    });
  }

  async list(user: AuthenticatedUser, params: {
    orderType?: string;
    status?: string;
    scheduledDate?: string;
    from?: string;
    to?: string;
    search?: string;
  }) {
    return this.prisma.floristOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.orderType && { orderType: params.orderType as any }),
        ...(params.status && { status: params.status as any }),
        ...(params.scheduledDate && {
          scheduledDeliveryDate: {
            gte: new Date(params.scheduledDate),
            lt: new Date(new Date(params.scheduledDate).getTime() + 86400000),
          },
        }),
        ...(params.from || params.to
          ? {
              createdAt: {
                ...(params.from && { gte: new Date(params.from) }),
                ...(params.to && { lte: new Date(params.to) }),
              },
            }
          : {}),
        ...(params.search && {
          OR: [
            { orderNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { recipientName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { scheduledDeliveryDate: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.floristOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateOrderStatusDto) {
    const o = await this.prisma.floristOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'IN_PREPARATION' && !o.preparedAt) patch.preparedAt = now;
    if (dto.notes) patch.internalNotes = ((o.internalNotes || '') + '\n' + dto.notes).trim();

    return this.prisma.floristOrder.update({ where: { id }, data: patch });
  }

  async confirmDelivery(user: AuthenticatedUser, id: string, dto: DeliveryConfirmDto) {
    const o = await this.prisma.floristOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');

    return this.prisma.floristOrder.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        actualDeliveryTime: new Date(),
        deliveredBy: dto.deliveredBy,
        deliveredToName: dto.deliveredToName,
        deliveryPhotoUrl: dto.deliveryPhotoUrl,
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: Partial<CreateFloristOrderDto>) {
    const o = await this.prisma.floristOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');

    const patch: any = { ...dto };
    if (dto.items) {
      const subtotal = dto.items.reduce((s, it) => s + Number(it.total || 0), 0);
      const discountAmount = dto.discountAmount ?? o.discountAmount;
      const deliveryCharge = dto.deliveryCharge ?? o.deliveryCharge;
      const wrappingCharge = dto.wrappingCharge ?? o.wrappingCharge;
      patch.subtotal = subtotal;
      patch.totalAmount = subtotal - discountAmount + deliveryCharge + wrappingCharge;
    }
    if (dto.scheduledDeliveryDate) patch.scheduledDeliveryDate = new Date(dto.scheduledDeliveryDate);
    if (dto.eventDate) patch.eventDate = new Date(dto.eventDate);

    return this.prisma.floristOrder.update({ where: { id }, data: patch });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.floristOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    if (o.status === 'DELIVERED') throw new BadRequestException('Cannot delete delivered order');
    return this.prisma.floristOrder.delete({ where: { id } });
  }

  async todayDeliveries(user: AuthenticatedUser) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return this.prisma.floristOrder.findMany({
      where: {
        tenantId: user.tenantId,
        scheduledDeliveryDate: { gte: start, lte: end },
        status: { in: ['CONFIRMED', 'IN_PREPARATION', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY'] },
      },
      orderBy: [{ deliveryTimeSlot: 'asc' }, { scheduledDeliveryTime: 'asc' }],
    });
  }

  async summary(user: AuthenticatedUser) {
    const [draft, confirmed, inPrep, ready, outForDelivery, delivered] = await Promise.all([
      this.prisma.floristOrder.count({ where: { tenantId: user.tenantId, status: 'DRAFT' } }),
      this.prisma.floristOrder.count({ where: { tenantId: user.tenantId, status: 'CONFIRMED' } }),
      this.prisma.floristOrder.count({ where: { tenantId: user.tenantId, status: 'IN_PREPARATION' } }),
      this.prisma.floristOrder.count({ where: { tenantId: user.tenantId, status: 'READY_FOR_DELIVERY' } }),
      this.prisma.floristOrder.count({ where: { tenantId: user.tenantId, status: 'OUT_FOR_DELIVERY' } }),
      this.prisma.floristOrder.count({ where: { tenantId: user.tenantId, status: 'DELIVERED' } }),
    ]);
    return { counts: { draft, confirmed, inPrep, ready, outForDelivery, delivered } };
  }

  async byTimeSlot(user: AuthenticatedUser, date: string) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);
    const orders = await this.prisma.floristOrder.findMany({
      where: {
        tenantId: user.tenantId,
        scheduledDeliveryDate: { gte: start, lte: end },
        status: { not: 'CANCELLED' },
      },
    });
    const grouped: Record<string, any[]> = {};
    orders.forEach((o) => {
      const slot = o.deliveryTimeSlot || 'SCHEDULED';
      if (!grouped[slot]) grouped[slot] = [];
      grouped[slot].push(o);
    });
    return grouped;
  }
}
