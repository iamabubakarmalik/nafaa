import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class CustomOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.customerName || !dto.customerPhone) throw new BadRequestException('Customer name and phone required');
    if (!dto.designDescription) throw new BadRequestException('Design description required');

    const count = await this.prisma.jewelryCustomOrder.count({ where: { tenantId: user.tenantId } });
    const orderNumber = 'JCO-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');

    return this.prisma.jewelryCustomOrder.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        orderNumber,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
        promisedDate: dto.promisedDate ? new Date(dto.promisedDate) : null,
        expectedGrossWeight: Number(dto.expectedGrossWeight) || 0,
        expectedNetWeight: dto.expectedNetWeight ? Number(dto.expectedNetWeight) : null,
        expectedMakingCharges: dto.expectedMakingCharges ? Number(dto.expectedMakingCharges) : null,
        advancePayment: Number(dto.advancePayment) || 0,
        estimatedPrice: Number(dto.estimatedPrice) || 0,
        paidAmount: Number(dto.advancePayment) || 0,
        createdById: user.id,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; karigarId?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.jewelryCustomOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.karigarId && { assignedKarigarId: params.karigarId }),
        ...(params.from || params.to ? {
          orderDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { orderNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      orderBy: { orderDate: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.jewelryCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    return this.prisma.jewelryCustomOrder.update({
      where: { id },
      data: {
        ...dto,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
        promisedDate: dto.promisedDate ? new Date(dto.promisedDate) : undefined,
        finalPrice: dto.finalPrice !== undefined ? Number(dto.finalPrice) : undefined,
        expectedGrossWeight: dto.expectedGrossWeight !== undefined ? Number(dto.expectedGrossWeight) : undefined,
        expectedNetWeight: dto.expectedNetWeight !== undefined ? Number(dto.expectedNetWeight) : undefined,
      },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string, reason?: string) {
    const patch: any = { status };
    const now = new Date();
    switch (status) {
      case 'DESIGNING': patch.designStartedAt = now; break;
      case 'METAL_ISSUED': patch.metalIssuedDate = now; break;
      case 'IN_PRODUCTION': patch.productionStartedAt = now; break;
      case 'POLISHING': patch.polishingStartedAt = now; break;
      case 'QUALITY_CHECK': patch.qualityCheckedAt = now; break;
      case 'HALLMARKING': patch.hallmarkedAt = now; break;
      case 'READY': patch.readyAt = now; break;
      case 'DELIVERED': patch.deliveredAt = now; break;
      case 'CANCELLED': patch.cancellationReason = reason; break;
    }
    return this.prisma.jewelryCustomOrder.update({ where: { id }, data: patch });
  }

  async issueMetal(user: AuthenticatedUser, id: string, grams: number) {
    return this.prisma.jewelryCustomOrder.update({
      where: { id },
      data: {
        metalIssuedGrams: grams,
        metalIssuedDate: new Date(),
        status: 'METAL_ISSUED',
      },
    });
  }

  async receiveMetal(user: AuthenticatedUser, id: string, receivedGrams: number, wastageGrams: number) {
    return this.prisma.jewelryCustomOrder.update({
      where: { id },
      data: {
        metalReceivedGrams: receivedGrams,
        metalReceivedDate: new Date(),
        wastageGrams,
      },
    });
  }

  async approveDesign(user: AuthenticatedUser, id: string, designUrl: string) {
    return this.prisma.jewelryCustomOrder.update({
      where: { id },
      data: {
        approvedDesignUrl: designUrl,
        designApprovedAt: new Date(),
      },
    });
  }

  async addPayment(user: AuthenticatedUser, id: string, amount: number) {
    const o = await this.prisma.jewelryCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    const newPaid = o.paidAmount + amount;
    let paymentStatus = 'ADVANCE_PAID';
    if (o.finalPrice && newPaid >= o.finalPrice) paymentStatus = 'PAID';
    else if (newPaid > 0) paymentStatus = 'PARTIAL';
    return this.prisma.jewelryCustomOrder.update({
      where: { id },
      data: { paidAmount: newPaid, paymentStatus },
    });
  }

  async rate(user: AuthenticatedUser, id: string, rating: number, feedback?: string) {
    return this.prisma.jewelryCustomOrder.update({
      where: { id },
      data: { customerRating: rating, customerFeedback: feedback },
    });
  }
}
