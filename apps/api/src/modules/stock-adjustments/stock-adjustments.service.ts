import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';

@Injectable()
export class StockAdjustmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateAdjustmentDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const isIncrement = dto.type === 'ADJUSTMENT_IN';
    const change = isIncrement ? dto.quantity : -dto.quantity;

    if (!isIncrement && product.stock < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: product.id },
        data: { stock: { increment: change } },
      });

      const adjustment = await tx.stockAdjustment.create({
        data: {
          tenantId: user.tenantId,
          productId: product.id,
          createdById: user.id,
          type: dto.type,
          quantity: dto.quantity,
          reason: dto.reason,
          note: dto.note,
        },
        include: {
          product: { select: { id: true, name: true, unit: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      await tx.stockMovement.create({
        data: {
          tenantId: user.tenantId,
          productId: product.id,
          type: dto.type,
          quantity: change,
          balanceAfter: updated.stock,
          reference: `ADJ-${adjustment.id.slice(0, 8)}`,
          note: dto.reason,
        },
      });

      return adjustment;
    });
  }

  list(user: AuthenticatedUser) {
    return this.prisma.stockAdjustment.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
      take: 100,
    });
  }
}
