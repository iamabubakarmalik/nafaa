import { Injectable } from '@nestjs/common';
import { startOfDay, startOfMonth } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminSalesService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const todayStart = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());

    const [
      totalCount,
      todayCount,
      monthCount,
      totalAgg,
      todayAgg,
      monthAgg,
    ] = await Promise.all([
      this.prisma.sale.count({ where: { status: 'COMPLETED' } }),
      this.prisma.sale.count({
        where: { status: 'COMPLETED', soldAt: { gte: todayStart } },
      }),
      this.prisma.sale.count({
        where: { status: 'COMPLETED', soldAt: { gte: monthStart } },
      }),
      this.prisma.sale.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { total: true, costOfGoods: true },
      }),
      this.prisma.sale.aggregate({
        where: { status: 'COMPLETED', soldAt: { gte: todayStart } },
        _sum: { total: true },
      }),
      this.prisma.sale.aggregate({
        where: { status: 'COMPLETED', soldAt: { gte: monthStart } },
        _sum: { total: true },
      }),
    ]);

    const totalRevenue = totalAgg._sum.total ?? 0;
    const totalCogs = totalAgg._sum.costOfGoods ?? 0;

    return {
      totalCount,
      todayCount,
      monthCount,
      totalRevenue,
      todayRevenue: todayAgg._sum.total ?? 0,
      monthRevenue: monthAgg._sum.total ?? 0,
      totalProfit: totalRevenue - totalCogs,
    };
  }

  async list(params: {
    search?: string;
    tenantId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: any = { status: 'COMPLETED' };
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.search) {
      where.saleNumber = { contains: params.search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        orderBy: { soldAt: 'desc' },
        skip,
        take: limit,
        include: {
          tenant: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
