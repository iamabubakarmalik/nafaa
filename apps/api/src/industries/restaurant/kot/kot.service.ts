import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { KotStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import { RecipesService } from '../recipes/recipes.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateKotDto } from './dto/create-kot.dto';

@Injectable()
export class KotService {
  constructor(private readonly prisma: PrismaService, private readonly recipes: RecipesService) {}

  async create(user: AuthenticatedUser, dto: CreateKotDto) {
    const order = await this.prisma.restaurantOrder.findFirst({
      where: { id: dto.orderId, tenantId: user.tenantId },
      include: {
        items: {
          include: {
            // The kitchen screen reads the dish name and add-ons from the snapshot.
            product: { select: { id: true, name: true, unit: true } },
            modifiers: { include: { modifierOption: { select: { name: true } } } },
          },
        },
        table: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const items = order.items.filter((it) => dto.itemIds.includes(it.id));
    if (!items.length) throw new BadRequestException('KOT ke liye koi item nahi chuna');

    let kot: any;
    for (let attempt = 0; ; attempt++) {
      const year = new Date().getFullYear();
      const prefix = `KOT-${year}-`;
      const last = await this.prisma.kot.findFirst({
        where: { tenantId: user.tenantId, kotNumber: { startsWith: prefix } },
        orderBy: { kotNumber: 'desc' }, select: { kotNumber: true },
      });
      const n = last ? parseInt(last.kotNumber.slice(prefix.length), 10) || 0 : 0;
      try {
        kot = await this.prisma.kot.create({
          data: {
            tenantId: user.tenantId,
            orderId: dto.orderId,
            kotNumber: `${prefix}${String(n + 1).padStart(4, '0')}`,
            station: dto.station,
            priority: dto.priority ?? 'NORMAL',
            notes: dto.notes,
            itemIds: items.map((it) => it.id),
            itemsSnapshot: items as any,
            status: 'PENDING',
          },
        });
        break;
      } catch (e: any) {
        if (attempt < 3 && e?.code === 'P2002') continue;
        throw e;
      }
    }

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

  async updateStatus(user: AuthenticatedUser, scope: ShopScope, id: string, status: string) {
    if (!(Object.values(KotStatus) as string[]).includes(status)) throw new BadRequestException('KOT ka status ghalat hai');
    const kot = await this.prisma.kot.findFirst({ where: { id, tenantId: user.tenantId }, include: { order: { include: { items: true } } } });
    if (!kot) throw new NotFoundException('KOT not found');

    // Kitchen starts on this ticket: its dishes' ingredients leave the store,
    // and an order still waiting moves to COOKING.
    if (status === 'COOKING' && kot.order) {
      const lines = kot.order.items.filter((it) => kot.itemIds.includes(it.id));
      const shopId = kot.order.shopId ?? await resolveWriteShopId(this.prisma, user.tenantId, scope);
      await this.recipes.consumeForLines(user, shopId, lines, kot.order.orderNumber);
      if (['PLACED', 'CONFIRMED'].includes(kot.order.status)) {
        await this.prisma.restaurantOrder.update({ where: { id: kot.orderId }, data: { status: 'COOKING', cookingStartedAt: new Date() } });
      }
    }
    if (status === 'READY' && kot.order && kot.order.status === 'COOKING') {
      const open = await this.prisma.kot.count({ where: { orderId: kot.orderId, id: { not: id }, status: { in: ['PENDING', 'PRINTED', 'ACKNOWLEDGED', 'COOKING'] } } });
      if (!open) await this.prisma.restaurantOrder.update({ where: { id: kot.orderId }, data: { status: 'READY', readyAt: new Date() } });
    }

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
