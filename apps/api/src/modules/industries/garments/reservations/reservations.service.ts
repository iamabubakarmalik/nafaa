import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.garmentReservation.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const reservationNumber = `RES-${year}-${String(count + 1).padStart(4, '0')}`;

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return this.prisma.garmentReservation.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        reservationNumber,
        customerId: dto.customerId,
        productId: dto.productId,
        variantId: dto.variantId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        quantity: dto.quantity ?? 1,
        unitPrice: dto.unitPrice ?? 0,
        depositAmount: dto.depositAmount ?? 0,
        expiresAt,
        notes: dto.notes,
        createdById: user.id,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; productId?: string }) {
    return this.prisma.garmentReservation.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.productId && { productId: params.productId }),
      },
      orderBy: { expiresAt: 'asc' },
      take: 200,
    });
  }

  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const r = await this.prisma.garmentReservation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Reservation not found');
    return this.prisma.garmentReservation.update({
      where: { id },
      data: { status: 'CANCELLED', notes: reason },
    });
  }

  async convert(user: AuthenticatedUser, id: string, saleId: string) {
    const r = await this.prisma.garmentReservation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Reservation not found');
    return this.prisma.garmentReservation.update({
      where: { id },
      data: { status: 'CONVERTED_TO_SALE', convertedSaleId: saleId },
    });
  }

  async expireOldOnes(user: AuthenticatedUser) {
    return this.prisma.garmentReservation.updateMany({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
  }
}
