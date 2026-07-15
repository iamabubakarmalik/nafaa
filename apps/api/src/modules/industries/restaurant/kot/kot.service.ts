import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateKotDto } from './dto/create-kot.dto';

@Injectable()
export class KotService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateKotDto) {
    const order = await this.prisma.restaurantOrder.findFirst({
      where: { id: dto.orderId, tenantId: user.tenantId },
      include: { items: true, table: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const items = order.items.filter((it) => dto.itemIds.includes(it.id));
    const count = await this.prisma.kot.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const kotNumber = `KOT-${year}-${String(count + 1).padStart(4, '0')}`;

    const kot = await this.prisma.kot.create({
      data: {
        tenantId: user.tenantId,
        orderId: dto.orderId,
        kotNumber,
        station: dto.station,
        priority: dto.priority ?? 'NORMAL',
        notes: dto.notes,
        itemIds: dto.itemIds,
        itemsSnapshot: items as any,
        status: 'PENDING',
      },
    });

    await this.prisma.restaurantOrder.update({
      where: { id: dto.orderId },
      data: { kotPrintedAt: new Date(), kotPrintCount: { increment: 1 } },
    });

    return kot;
  }

  async list(user: AuthenticatedUser, params: { status?: string; station?: string; orderId?: string }) {
    return this.prisma.kot.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.station && { station: params.station }),
        ...(params.orderId && { orderId: params.orderId }),
      },
      include: { order: { include: { table: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string) {
    const kot = await this.prisma.kot.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!kot) throw new NotFoundException('KOT not found');
    const patch: any = { status };
    const now = new Date();
    if (status === 'PRINTED') patch.printedAt = now;
    if (status === 'ACKNOWLEDGED') patch.acknowledgedAt = now;
    if (status === 'COOKING') patch.cookingStartedAt = now;
    if (status === 'READY') patch.readyAt = now;
    if (status === 'SERVED') patch.servedAt = now;
    if (status === 'CANCELLED') patch.cancelledAt = now;
    return this.prisma.kot.update({ where: { id }, data: patch });
  }
}
