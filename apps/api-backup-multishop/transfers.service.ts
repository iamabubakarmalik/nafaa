import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateTransferDto) {
    if (dto.fromShopId === dto.toShopId) {
      throw new BadRequestException('Source aur destination shop same nahi ho sakte');
    }

    const [fromShop, toShop] = await Promise.all([
      this.prisma.shop.findFirst({
        where: { id: dto.fromShopId, tenantId: user.tenantId },
      }),
      this.prisma.shop.findFirst({
        where: { id: dto.toShopId, tenantId: user.tenantId },
      }),
    ]);

    if (!fromShop || !toShop) {
      throw new NotFoundException('Shop not found');
    }

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        id: { in: productIds },
      },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product) throw new NotFoundException('Product not found');
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}. Available: ${product.stock}`,
        );
      }
    }

    const transferNumber = `TR-${Date.now().toString().slice(-8)}`;

    const transfer = await this.prisma.$transaction(async (tx) => {
      const created = await tx.stockTransfer.create({
        data: {
          tenantId: user.tenantId,
          fromShopId: dto.fromShopId,
          toShopId: dto.toShopId,
          createdById: user.id,
          transferNumber,
          status: 'IN_TRANSIT',
          notes: dto.notes,
          transferredAt: new Date(),
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          fromShop: true,
          toShop: true,
          items: { include: { product: true } },
        },
      });

      for (const item of dto.items) {
        const updated = await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            productId: item.productId,
            type: 'TRANSFER_OUT',
            quantity: -item.quantity,
            balanceAfter: updated.stock,
            reference: transferNumber,
            note: `Transfer to ${toShop.name}`,
          },
        });
      }

      return created;
    });

    await this.notifications.create({
      tenantId: user.tenantId,
      type: 'INFO',
      title: 'Stock Transfer Created',
      message: `${transferNumber}: ${fromShop.name} → ${toShop.name}`,
      link: '/transfers',
    });

    return transfer;
  }

  async receive(user: AuthenticatedUser, id: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        items: true,
        fromShop: true,
        toShop: true,
      },
    });

    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'IN_TRANSIT') {
      throw new BadRequestException('Transfer is not in transit');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.stockTransfer.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
        },
        include: {
          fromShop: true,
          toShop: true,
          items: { include: { product: true } },
        },
      });

      for (const item of transfer.items) {
        const product = await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            productId: item.productId,
            type: 'TRANSFER_IN',
            quantity: item.quantity,
            balanceAfter: product.stock,
            reference: transfer.transferNumber,
            note: `Received from ${transfer.fromShop.name}`,
          },
        });
      }

      return updated;
    });
  }

  async cancel(user: AuthenticatedUser, id: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true, fromShop: true },
    });

    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status === 'RECEIVED') {
      throw new BadRequestException('Received transfer cancel nahi kar sakte');
    }
    if (transfer.status === 'CANCELLED') {
      throw new BadRequestException('Already cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.stockTransfer.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      if (transfer.status === 'IN_TRANSIT') {
        for (const item of transfer.items) {
          const product = await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId,
              productId: item.productId,
              type: 'TRANSFER_IN',
              quantity: item.quantity,
              balanceAfter: product.stock,
              reference: transfer.transferNumber,
              note: 'Transfer cancelled - returned to source',
            },
          });
        }
      }

      return updated;
    });
  }

  list(user: AuthenticatedUser) {
    return this.prisma.stockTransfer.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        fromShop: true,
        toShop: true,
        createdBy: { select: { id: true, fullName: true } },
        items: { include: { product: true } },
      },
    });
  }
}
