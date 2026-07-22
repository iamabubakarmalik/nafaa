import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateAlterationDto } from './dto/create-alteration.dto';

@Injectable()
export class AlterationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateAlterationDto) {
    const count = await this.prisma.garmentAlterationTicket.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const ticketNumber = `ALT-${year}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.garmentAlterationTicket.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        ticketNumber,
        customerId: dto.customerId,
        saleId: dto.saleId,
        productId: dto.productId,
        variantId: dto.variantId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        garmentDescription: dto.garmentDescription,
        alterationType: dto.alterationType,
        alterationDetails: dto.alterationDetails,
        priority: dto.priority ?? 'NORMAL',
        promisedDate: dto.promisedDate ? new Date(dto.promisedDate) : null,
        tailorId: dto.tailorId,
        charges: dto.charges ?? 0,
        beforeImageUrls: dto.beforeImageUrls ?? [],
        notes: dto.notes,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; priority?: string; customerId?: string; tailorId?: string; search?: string }) {
    return this.prisma.garmentAlterationTicket.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.priority && { priority: params.priority as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.tailorId && { tailorId: params.tailorId }),
        ...(params.search && {
          OR: [
            { ticketNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      orderBy: [{ priority: 'desc' }, { promisedDate: 'asc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.garmentAlterationTicket.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Ticket not found');
    return t;
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string, afterImageUrls?: string[]) {
    const t = await this.prisma.garmentAlterationTicket.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Ticket not found');
    const patch: any = { status };
    const now = new Date();
    if (status === 'READY') patch.readyAt = now;
    if (status === 'DELIVERED') patch.deliveredAt = now;
    if (afterImageUrls?.length) patch.afterImageUrls = [...(t.afterImageUrls ?? []), ...afterImageUrls];
    return this.prisma.garmentAlterationTicket.update({ where: { id }, data: patch });
  }

  async recordPayment(user: AuthenticatedUser, id: string, amount: number) {
    const t = await this.prisma.garmentAlterationTicket.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Ticket not found');
    const newPaid = t.paidAmount + amount;
    let paymentStatus: any = 'PARTIALLY_PAID';
    if (newPaid >= t.charges) paymentStatus = 'PAID';
    if (newPaid <= 0) paymentStatus = 'UNPAID';
    return this.prisma.garmentAlterationTicket.update({ where: { id }, data: { paidAmount: newPaid, paymentStatus } });
  }
}
