import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const real = { tenant: { slug: { not: 'nafaa-system' } } };
    const [total, withCredit, totalSpentAgg, totalCreditAgg] = await Promise.all([
      this.prisma.customer.count({ where: real }),
      this.prisma.customer.count({ where: { ...real, balance: { gt: 0 } } }),
      this.prisma.customer.aggregate({ where: real, _sum: { totalSpent: true } }),
      this.prisma.customer.aggregate({ where: real, _sum: { balance: true } }),
    ]);

    return {
      total,
      withCredit,
      totalSpentPlatform: totalSpentAgg._sum.totalSpent ?? 0,
      totalOutstandingCredit: totalCreditAgg._sum.balance ?? 0,
    };
  }

  async list(params: {
    search?: string;
    tenantId?: string;
    hasCredit?: boolean;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      tenant: { slug: { not: 'nafaa-system' } },
      ...(params.status === 'active' ? { isActive: true } : params.status === 'inactive' ? { isActive: false } : {}),
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.hasCredit ? { balance: { gt: 0 } } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { phone: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          tenant: { select: { id: true, name: true } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
