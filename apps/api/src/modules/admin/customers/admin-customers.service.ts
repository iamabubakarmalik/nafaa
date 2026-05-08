import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [total, withCredit, totalSpentAgg, totalCreditAgg] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { balance: { gt: 0 } } }),
      this.prisma.customer.aggregate({ _sum: { totalSpent: true } }),
      this.prisma.customer.aggregate({ _sum: { balance: true } }),
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
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
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
