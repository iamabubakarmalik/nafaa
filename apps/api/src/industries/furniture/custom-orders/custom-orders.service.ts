import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateCustomOrderDto, RecordPaymentDto, UpdateOrderStatusDto, UpdateProgressDto } from './dto/create-custom-order.dto';

@Injectable()
export class CustomOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateCustomOrderDto) {
    const count = await this.prisma.furnitureCustomOrder.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const orderNumber = `FCO-${year}-${String(count + 1).padStart(4, '0')}`;

    let carpenterName: string | undefined;
    if (dto.carpenterId) {
      const c = await this.prisma.furnitureCarpenter.findFirst({ where: { id: dto.carpenterId, tenantId: user.tenantId } });
      if (c) carpenterName = c.name;
    }

    const depositAmount = dto.depositAmount ?? 0;
    const balanceAmount = Math.max(dto.quotedPrice - depositAmount, 0);
    const expectedDeliveryDate = addDays(new Date(), dto.estimatedDays);

    return this.prisma.furnitureCustomOrder.create({
      data: {
        tenantId: user.tenantId,
        orderNumber,
        ...dto,
        sketchUrls: dto.sketchUrls ?? [],
        referenceImages: dto.referenceImages ?? [],
        carpenterName,
        depositAmount,
        balanceAmount,
        expectedDeliveryDate,
        status: 'QUOTATION',
        createdById: user.id,
      },
    });
  }

  async list(user: AuthenticatedUser, params: {
    status?: string; customerId?: string; carpenterId?: string;
    from?: string; to?: string; search?: string;
  }) {
    return this.prisma.furnitureCustomOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.carpenterId && { carpenterId: params.carpenterId }),
        ...(params.from || params.to ? {
          quotationDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { orderNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { productType: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Custom order not found');
    return o;
  }

  async approve(user: AuthenticatedUser, id: string, finalPrice?: number) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    if (o.status !== 'QUOTATION') throw new BadRequestException('Only quotations can be approved');

    const price = finalPrice ?? o.quotedPrice;
    return this.prisma.furnitureCustomOrder.update({
      where: { id },
      data: {
        finalPrice: price,
        balanceAmount: Math.max(price - o.totalPaid, 0),
        approvedDate: new Date(),
        status: o.depositPaid ? 'IN_PRODUCTION' : 'DEPOSIT_PAID',
      },
    });
  }

  async recordPayment(user: AuthenticatedUser, id: string, dto: RecordPaymentDto) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');

    const newTotalPaid = o.totalPaid + dto.amount;
    const price = o.finalPrice ?? o.quotedPrice;
    const newBalance = Math.max(price - newTotalPaid, 0);

    const patch: any = {
      totalPaid: newTotalPaid,
      balanceAmount: newBalance,
    };

    if (dto.isDeposit && !o.depositPaid) {
      patch.depositPaid = true;
      if (o.status === 'QUOTATION') patch.status = 'DEPOSIT_PAID';
    }

    return this.prisma.furnitureCustomOrder.update({ where: { id }, data: patch });
  }

  async assignCarpenter(user: AuthenticatedUser, id: string, carpenterId: string, workshopLocation?: string) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');

    const c = await this.prisma.furnitureCarpenter.findFirst({ where: { id: carpenterId, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Carpenter not found');
    if (!c.isActive) throw new BadRequestException('Carpenter not active');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.furnitureCustomOrder.update({
        where: { id },
        data: {
          carpenterId,
          carpenterName: c.name,
          workshopLocation: workshopLocation ?? o.workshopLocation,
          productionStartDate: o.productionStartDate ?? new Date(),
          status: o.status === 'DEPOSIT_PAID' ? 'IN_PRODUCTION' : o.status,
        },
      });
      await tx.furnitureCarpenter.update({
        where: { id: carpenterId },
        data: {
          totalProjects: { increment: 1 },
          activeProjects: { increment: 1 },
        },
      });
      return updated;
    });
  }

  async updateProgress(user: AuthenticatedUser, id: string, dto: UpdateProgressDto) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');

    const photos = [...(o.progressPhotos ?? []), ...(dto.progressPhotos ?? [])];
    const updates = (o.progressUpdates as any[]) ?? [];
    if (dto.updateNote) {
      updates.push({ at: new Date().toISOString(), pct: dto.progressPct, note: dto.updateNote });
    }

    const patch: any = {
      progressPct: Math.max(0, Math.min(100, dto.progressPct)),
      progressPhotos: photos,
      progressUpdates: updates,
    };

    if (dto.progressPct >= 100 && !o.productionEndDate) {
      patch.productionEndDate = new Date();
      patch.status = 'READY_FOR_DELIVERY';
    }

    return this.prisma.furnitureCustomOrder.update({ where: { id }, data: patch });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateOrderStatusDto) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');

    const patch: any = { status: dto.status };
    const now = new Date();

    if (dto.status === 'DELIVERED') patch.actualDeliveryDate = now;
    if (dto.status === 'CANCELLED') {
      patch.cancelledAt = now;
      patch.cancellationReason = dto.cancellationReason;
      patch.refundAmount = dto.refundAmount ?? 0;
    }
    if (dto.notes) patch.internalNotes = ((o.internalNotes || '') + '\n' + dto.notes).trim();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.furnitureCustomOrder.update({ where: { id }, data: patch });

      if (dto.status === 'COMPLETED' && o.carpenterId) {
        await tx.furnitureCarpenter.update({
          where: { id: o.carpenterId },
          data: {
            completedProjects: { increment: 1 },
            activeProjects: { decrement: 1 },
            totalRevenue: { increment: o.finalPrice ?? o.quotedPrice },
          },
        });
      }
      return updated;
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    if (['IN_PRODUCTION', 'READY_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(o.status)) {
      throw new BadRequestException(`Cannot delete order in status ${o.status}`);
    }
    return this.prisma.furnitureCustomOrder.delete({ where: { id } });
  }

  async summary(user: AuthenticatedUser) {
    const [quotation, deposit, production, ready, delivered, completed, cancelled] = await Promise.all([
      this.prisma.furnitureCustomOrder.count({ where: { tenantId: user.tenantId, status: 'QUOTATION' } }),
      this.prisma.furnitureCustomOrder.count({ where: { tenantId: user.tenantId, status: 'DEPOSIT_PAID' } }),
      this.prisma.furnitureCustomOrder.count({ where: { tenantId: user.tenantId, status: 'IN_PRODUCTION' } }),
      this.prisma.furnitureCustomOrder.count({ where: { tenantId: user.tenantId, status: 'READY_FOR_DELIVERY' } }),
      this.prisma.furnitureCustomOrder.count({ where: { tenantId: user.tenantId, status: 'DELIVERED' } }),
      this.prisma.furnitureCustomOrder.count({ where: { tenantId: user.tenantId, status: 'COMPLETED' } }),
      this.prisma.furnitureCustomOrder.count({ where: { tenantId: user.tenantId, status: 'CANCELLED' } }),
    ]);

    const receivables = await this.prisma.furnitureCustomOrder.aggregate({
      where: { tenantId: user.tenantId, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      _sum: { balanceAmount: true, totalPaid: true },
    });

    return {
      quotation, deposit, production, ready, delivered, completed, cancelled,
      totalReceivable: receivables._sum.balanceAmount ?? 0,
      totalCollected: receivables._sum.totalPaid ?? 0,
    };
  }

  async overdue(user: AuthenticatedUser) {
    return this.prisma.furnitureCustomOrder.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['IN_PRODUCTION', 'DEPOSIT_PAID'] },
        expectedDeliveryDate: { lt: new Date() },
      },
      orderBy: { expectedDeliveryDate: 'asc' },
    });
  }
}
