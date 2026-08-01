import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertCarpenterDto } from './dto/upsert-carpenter.dto';

@Injectable()
export class CarpentersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertCarpenterDto) {
    const dup = await this.prisma.furnitureCarpenter.findFirst({
      where: { tenantId: user.tenantId, employeeCode: dto.employeeCode },
    });
    if (dup) throw new BadRequestException(`Employee code "${dto.employeeCode}" already exists`);
    return this.prisma.furnitureCarpenter.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { active?: boolean; workshop?: string; search?: string }) {
    return this.prisma.furnitureCarpenter.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.workshop && { workshopLocation: { contains: params.workshop, mode: 'insensitive' } }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search } },
            { employeeCode: { contains: params.search, mode: 'insensitive' } },
            { cnic: { contains: params.search } },
          ],
        }),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.furnitureCarpenter.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Carpenter not found');

    const activeOrders = await this.prisma.furnitureCustomOrder.findMany({
      where: {
        carpenterId: id,
        status: { in: ['DEPOSIT_PAID', 'IN_PRODUCTION', 'READY_FOR_DELIVERY'] },
      },
      orderBy: { expectedDeliveryDate: 'asc' },
    });

    const recentCompleted = await this.prisma.furnitureCustomOrder.findMany({
      where: { carpenterId: id, status: 'COMPLETED' },
      orderBy: { actualDeliveryDate: 'desc' },
      take: 10,
    });

    return { ...c, activeOrders, recentCompleted };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertCarpenterDto) {
    const c = await this.prisma.furnitureCarpenter.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Carpenter not found');
    return this.prisma.furnitureCarpenter.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.furnitureCarpenter.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Carpenter not found');
    return this.prisma.furnitureCarpenter.update({ where: { id }, data: { isActive: false } });
  }

  async workload(user: AuthenticatedUser, id: string, from: string, to: string) {
    const c = await this.prisma.furnitureCarpenter.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Carpenter not found');

    const start = new Date(from);
    const end = new Date(to);

    const orders = await this.prisma.furnitureCustomOrder.findMany({
      where: {
        carpenterId: id,
        productionStartDate: { gte: start, lte: end },
      },
      orderBy: { expectedDeliveryDate: 'asc' },
    });

    return {
      carpenter: c,
      orders,
      totals: {
        total: orders.length,
        active: orders.filter((o) => ['IN_PRODUCTION', 'DEPOSIT_PAID'].includes(o.status)).length,
        completed: orders.filter((o) => o.status === 'COMPLETED').length,
        revenue: orders.reduce((s, o) => s + (o.finalPrice ?? o.quotedPrice), 0),
      },
    };
  }

  async topPerformers(user: AuthenticatedUser, limit = 10) {
    return this.prisma.furnitureCarpenter.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalRevenue: 'desc' },
      take: limit,
    });
  }
}
