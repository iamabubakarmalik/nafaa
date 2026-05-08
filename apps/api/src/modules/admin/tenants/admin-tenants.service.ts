import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminTenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    search?: string;
    status?: TenantStatus;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
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
    };

    const [items, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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
        title: `Account ${status}`,
        message: reason || `Aap ka account status ${status} kar diya gaya hai.`,
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
