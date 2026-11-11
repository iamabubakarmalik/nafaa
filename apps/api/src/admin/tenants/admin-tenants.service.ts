import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { apiMessage, notificationText } from '../../common/i18n/api-message';

@Injectable()
export class AdminTenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    search?: string;
    status?: TenantStatus;
    /** RETAIL also matches businesses that never answered (empty list). */
    model?: string;
    /** Tenant.businessType; 'NONE' matches shops that have not chosen one. */
    industry?: string;
    sort?: 'newest' | 'oldest' | 'name';
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.TenantWhereInput = {
      slug: { not: 'nafaa-system' },
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { slug: { contains: params.search, mode: 'insensitive' } },
              { phone: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.model === 'RETAIL'
        ? { AND: [{ OR: [{ businessModels: { has: 'RETAIL' } }, { businessModels: { isEmpty: true } }] }] }
        : params.model
          ? { businessModels: { has: params.model } }
          : {}),
      ...(params.industry === 'NONE'
        ? { businessType: null }
        : params.industry
          ? { businessType: params.industry }
          : {}),
    };
    const orderBy: Prisma.TenantOrderByWithRelationInput =
      params.sort === 'oldest' ? { createdAt: 'asc' } : params.sort === 'name' ? { name: 'asc' } : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              users: true,
              products: true,
              sales: true,
              customers: true,
            },
          },
          subscriptions: {
            where: { status: { in: ['ACTIVE', 'TRIAL', 'PENDING_PAYMENT'] } },
            include: { plan: true },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        referredBy: { select: { id: true, name: true, referralCode: true } },
        _count: {
          select: {
            users: true,
            products: true,
            sales: true,
            customers: true,
            suppliers: true,
            shops: true,
            referredTenants: true,
          },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const [salesAgg, expensesAgg] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { tenantId: id, status: 'COMPLETED' },
        _sum: { total: true, costOfGoods: true },
      }),
      this.prisma.expense.aggregate({
        where: { tenantId: id, status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    return {
      tenant,
      stats: {
        totalRevenue: salesAgg._sum.total ?? 0,
        totalCogs: salesAgg._sum.costOfGoods ?? 0,
        totalExpenses: expensesAgg._sum.amount ?? 0,
      },
    };
  }

  /** Counts for the Shops page header: by status, new this week, and the industries in use. */
  async stats() {
    const scope = { slug: { not: 'nafaa-system' } };
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [byStatus, newThisWeek, industries] = await Promise.all([
      this.prisma.tenant.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
      this.prisma.tenant.count({ where: { ...scope, createdAt: { gte: weekAgo } } }),
      this.prisma.tenant.groupBy({ by: ['businessType'], where: scope, _count: { _all: true }, orderBy: { _count: { businessType: 'desc' } } }),
    ]);
    const count = (s: string) => byStatus.find((x) => x.status === s)?._count._all ?? 0;
    return {
      total: byStatus.reduce((n, x) => n + x._count._all, 0),
      active: count('ACTIVE'),
      trial: count('TRIAL'),
      suspended: count('SUSPENDED'),
      expired: count('EXPIRED'),
      newThisWeek,
      industries: industries.map((r) => ({ type: r.businessType ?? 'NONE', count: r._count._all })),
    };
  }

  async updateStatus(id: string, status: TenantStatus, reason?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { status },
    });

    await this.prisma.notification.create({
      data: {
        tenantId: id,
        type: status === 'SUSPENDED' ? 'WARNING' : 'INFO',
        ...notificationText(
          apiMessage('Account {{status}}', { status }),
          reason || apiMessage('Aap ka account status {{status}} kar diya gaya hai.', { status }),
        ),
      },
    });

    return updated;
  }

  async remove(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.slug === 'nafaa-system') {
      throw new NotFoundException('Cannot delete system tenant');
    }
    await this.prisma.tenant.delete({ where: { id } });
    return { message: 'Tenant deleted permanently' };
  }
}
