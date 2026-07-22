import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class BulkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.items || (Array.isArray(dto.items) && dto.items.length === 0)) throw new BadRequestException('At least one item required');

    const count = await this.prisma.bakeryBulkOrder.count({ where: { tenantId: user.tenantId } });
    const orderNumber = 'BULK-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');

    const totalItems = Array.isArray(dto.items)
      ? dto.items.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0)
      : 0;

    return this.prisma.bakeryBulkOrder.create({
      data: {
        tenantId: user.tenantId,
        orderNumber,
        customerId: dto.customerId,
        organizationName: dto.organizationName,
        contactPerson: dto.contactPerson,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        orderType: dto.orderType,
        eventDate: new Date(dto.eventDate),
        eventTime: dto.eventTime,
        venue: dto.venue,
        totalGuests: dto.totalGuests,
        totalItems,
        items: dto.items,
        quotedPrice: Number(dto.quotedPrice) || 0,
        finalPrice: dto.finalPrice ? Number(dto.finalPrice) : null,
        advancePaid: Number(dto.advancePaid) || 0,
        paidAmount: Number(dto.advancePaid) || 0,
        requiresDelivery: dto.requiresDelivery ?? true,
        deliveryAddress: dto.deliveryAddress,
        requiresSetup: dto.requiresSetup ?? false,
        setupTime: dto.setupTime,
        specialInstructions: dto.specialInstructions,
        createdById: user.id,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.bakeryBulkOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.from || params.to ? {
          eventDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { orderNumber: { contains: params.search, mode: 'insensitive' } },
            { organizationName: { contains: params.search, mode: 'insensitive' } },
            { contactPerson: { contains: params.search, mode: 'insensitive' } },
            { contactPhone: { contains: params.search } },
          ],
        }),
      },
      orderBy: { eventDate: 'asc' },
      take: 100,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.bakeryBulkOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const o = await this.prisma.bakeryBulkOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    return this.prisma.bakeryBulkOrder.update({
      where: { id },
      data: {
        ...dto,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
      },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string) {
    return this.prisma.bakeryBulkOrder.update({ where: { id }, data: { status: status as any } });
  }

  async addPayment(user: AuthenticatedUser, id: string, amount: number) {
    const o = await this.prisma.bakeryBulkOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    const newPaid = o.paidAmount + amount;
    const total = o.finalPrice ?? o.quotedPrice;
    let paymentStatus = 'PARTIALLY_PAID';
    if (newPaid >= total) paymentStatus = 'PAID';
    if (newPaid <= 0) paymentStatus = 'UNPAID';
    return this.prisma.bakeryBulkOrder.update({
      where: { id },
      data: { paidAmount: newPaid, paymentStatus },
    });
  }
}
