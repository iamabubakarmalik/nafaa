import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateTeamOrderDto, RecordPaymentDto, UpdateTeamOrderStatusDto } from './dto/create-team-order.dto';

@Injectable()
export class TeamOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateTeamOrderDto) {
    const count = await this.prisma.sportsTeamOrder.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const orderNumber = `TO-${year}-${String(count + 1).padStart(4, '0')}`;

    const totalQuantity = dto.items.reduce((s, it) => s + Number(it.quantity || 0), 0);
    const subtotal = dto.items.reduce((s, it) => s + Number(it.total || 0), 0);
    const discountPct = dto.discountPct ?? 0;
    const discountAmount = (subtotal * discountPct) / 100;
    const taxAmount = dto.taxAmount ?? 0;
    const shippingCharge = dto.shippingCharge ?? 0;
    const totalAmount = subtotal - discountAmount + taxAmount + shippingCharge;
    const advancePaid = dto.advancePaid ?? 0;
    const balanceAmount = totalAmount - advancePaid;

    return this.prisma.sportsTeamOrder.create({
      data: {
        tenantId: user.tenantId,
        orderNumber,
        teamName: dto.teamName,
        contactPerson: dto.contactPerson,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        organization: dto.organization,
        city: dto.city,
        address: dto.address,
        items: dto.items as any,
        totalQuantity,
        subtotal,
        discountPct,
        discountAmount,
        taxAmount,
        shippingCharge,
        totalAmount,
        hasCustomJerseys: dto.hasCustomJerseys ?? false,
        customizationDetails: dto.customizationDetails,
        playerNames: dto.playerNames,
        playerNumbers: dto.playerNumbers,
        teamLogoUrl: dto.teamLogoUrl,
        advancePaid,
        balanceAmount,
        paymentMethod: dto.paymentMethod,
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
        poNumber: dto.poNumber,
        notes: dto.notes,
        internalNotes: dto.internalNotes,
        handledById: user.id,
        status: 'DRAFT',
      },
    });
  }

  async list(user: AuthenticatedUser, params: {
    status?: string;
    hasCustomJerseys?: boolean;
    from?: string;
    to?: string;
    search?: string;
  }) {
    return this.prisma.sportsTeamOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.hasCustomJerseys !== undefined && { hasCustomJerseys: params.hasCustomJerseys }),
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
            { teamName: { contains: params.search, mode: 'insensitive' } },
            { contactPerson: { contains: params.search, mode: 'insensitive' } },
            { contactPhone: { contains: params.search } },
            { organization: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.sportsTeamOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Team order not found');
    return o;
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateTeamOrderStatusDto) {
    const o = await this.prisma.sportsTeamOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Team order not found');

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'QUOTED' && !o.quotedAt) patch.quotedAt = now;
    if (dto.status === 'CONFIRMED' && !o.confirmedAt) patch.confirmedAt = now;
    if (dto.status === 'DELIVERED' && !o.deliveredAt) patch.deliveredAt = now;
    if (dto.notes) patch.internalNotes = ((o.internalNotes || '') + '\n' + dto.notes).trim();

    return this.prisma.sportsTeamOrder.update({ where: { id }, data: patch });
  }

  async update(user: AuthenticatedUser, id: string, dto: Partial<CreateTeamOrderDto>) {
    const o = await this.prisma.sportsTeamOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Team order not found');

    const patch: any = { ...dto };

    if (dto.items) {
      const totalQuantity = dto.items.reduce((s, it) => s + Number(it.quantity || 0), 0);
      const subtotal = dto.items.reduce((s, it) => s + Number(it.total || 0), 0);
      const discountPct = dto.discountPct ?? o.discountPct;
      const discountAmount = (subtotal * discountPct) / 100;
      const taxAmount = dto.taxAmount ?? o.taxAmount;
      const shippingCharge = dto.shippingCharge ?? o.shippingCharge;
      const totalAmount = subtotal - discountAmount + taxAmount + shippingCharge;
      const balanceAmount = totalAmount - Number(o.advancePaid || 0);

      Object.assign(patch, {
        items: dto.items,
        totalQuantity,
        subtotal,
        discountAmount,
        totalAmount,
        balanceAmount,
      });
    }

    if (dto.expectedDeliveryDate) patch.expectedDeliveryDate = new Date(dto.expectedDeliveryDate);

    return this.prisma.sportsTeamOrder.update({ where: { id }, data: patch });
  }

  async recordPayment(user: AuthenticatedUser, id: string, dto: RecordPaymentDto) {
    const o = await this.prisma.sportsTeamOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Team order not found');
    if (dto.amount <= 0) throw new BadRequestException('Amount must be positive');

    const newAdvance = Number(o.advancePaid || 0) + dto.amount;
    const newBalance = Math.max(Number(o.totalAmount || 0) - newAdvance, 0);

    return this.prisma.sportsTeamOrder.update({
      where: { id },
      data: {
        advancePaid: newAdvance,
        balanceAmount: newBalance,
        paymentMethod: dto.paymentMethod ?? o.paymentMethod,
        internalNotes: dto.notes ? ((o.internalNotes || '') + '\nPayment: ' + dto.notes).trim() : undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.sportsTeamOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Team order not found');
    if (o.status === 'DELIVERED') {
      throw new BadRequestException('Cannot delete a delivered order');
    }
    return this.prisma.sportsTeamOrder.delete({ where: { id } });
  }

  async summary(user: AuthenticatedUser) {
    const [draft, quoted, confirmed, inProduction, ready, delivered] = await Promise.all([
      this.prisma.sportsTeamOrder.count({ where: { tenantId: user.tenantId, status: 'DRAFT' } }),
      this.prisma.sportsTeamOrder.count({ where: { tenantId: user.tenantId, status: 'QUOTED' } }),
      this.prisma.sportsTeamOrder.count({ where: { tenantId: user.tenantId, status: 'CONFIRMED' } }),
      this.prisma.sportsTeamOrder.count({ where: { tenantId: user.tenantId, status: 'IN_PRODUCTION' } }),
      this.prisma.sportsTeamOrder.count({ where: { tenantId: user.tenantId, status: 'READY' } }),
      this.prisma.sportsTeamOrder.count({ where: { tenantId: user.tenantId, status: 'DELIVERED' } }),
    ]);

    const totals = await this.prisma.sportsTeamOrder.aggregate({
      where: { tenantId: user.tenantId, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true, advancePaid: true, balanceAmount: true },
      _count: { _all: true },
    });

    return {
      counts: { draft, quoted, confirmed, inProduction, ready, delivered },
      totalOrders: totals._count._all,
      totalRevenue: totals._sum.totalAmount ?? 0,
      totalCollected: totals._sum.advancePaid ?? 0,
      totalPending: totals._sum.balanceAmount ?? 0,
    };
  }

  async upcomingDeliveries(user: AuthenticatedUser, days = 14) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return this.prisma.sportsTeamOrder.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['CONFIRMED', 'IN_PRODUCTION', 'READY'] },
        expectedDeliveryDate: { gte: now, lte: future },
      },
      orderBy: { expectedDeliveryDate: 'asc' },
    });
  }
}
