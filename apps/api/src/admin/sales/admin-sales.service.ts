import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfDayTz, startOfMonthTz } from '../../common/helpers/business-time.helper';
import { dayRange } from '../common/date-range';

@Injectable()
export class AdminSalesService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const todayStart = startOfDayTz();
    const monthStart = startOfMonthTz();
    const real = { tenant: { slug: { not: 'nafaa-system' } } };

    const [
      totalCount,
      todayCount,
      monthCount,
      totalAgg,
      todayAgg,
      monthAgg,
    ] = await Promise.all([
      this.prisma.sale.count({ where: { status: 'COMPLETED', ...real } }),
      this.prisma.sale.count({
        where: { status: 'COMPLETED', ...real, soldAt: { gte: todayStart } },
      }),
      this.prisma.sale.count({
        where: { status: 'COMPLETED', ...real, soldAt: { gte: monthStart } },
      }),
      this.prisma.sale.aggregate({
        where: { status: 'COMPLETED', ...real },
        _sum: { total: true, costOfGoods: true },
      }),
      this.prisma.sale.aggregate({
        where: { status: 'COMPLETED', ...real, soldAt: { gte: todayStart } },
        _sum: { total: true },
      }),
      this.prisma.sale.aggregate({
        where: { status: 'COMPLETED', ...real, soldAt: { gte: monthStart } },
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
    method?: string;
    credit?: boolean;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
    const skip = (page - 1) * limit;

    const where: any = { status: 'COMPLETED', tenant: { slug: { not: 'nafaa-system' } } };
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.method) where.paymentMethod = params.method;
    if (params.credit) where.creditAmount = { gt: 0 };
    const range = dayRange(params.from, params.to);
    if (range) where.soldAt = range;
    if (params.search) {
      where.OR = [
        { saleNumber: { contains: params.search, mode: 'insensitive' } },
        { customer: { name: { contains: params.search, mode: 'insensitive' } } },
        { tenant: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
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
