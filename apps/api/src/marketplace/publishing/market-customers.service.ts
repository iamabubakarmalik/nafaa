/**
 * Seller view of Market customers: everyone who ordered from this shop on
 * Nafaa Market, with order count, spend and last order. Phone numbers are
 * shown in full only to staff with the customers permission.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { PERMISSIONS, hasPermission } from '../../common/constants/permissions.constants';

const maskPhone = (p: string | null | undefined) => {
  const d = String(p ?? '');
  return d.length > 4 ? `${'*'.repeat(d.length - 4)}${d.slice(-4)}` : d;
};

@Injectable()
export class MarketCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private async shopId(user: AuthenticatedUser): Promise<string> {
    if (user.shopId) return user.shopId;
    const shop = await this.prisma.shop.findFirst({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (!shop) throw new NotFoundException('Koi dukaan nahi mili');
    return shop.id;
  }

  async list(user: AuthenticatedUser, q: { search?: string; page?: number; limit?: number }) {
    const shopId = await this.shopId(user);
    const page = Math.max(1, Math.floor(Number(q.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(q.limit) || 20)));
    const search = String(q.search ?? '').trim().slice(0, 60);
    const where: Prisma.MarketplaceOrderWhereInput = {
      shopId,
      tenantId: user.tenantId,
      status: { notIn: ['CANCELLED', 'DRAFT'] },
      ...(search && {
        customer: { OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { phone: { contains: search.replace(/\D/g, '') || search } }] },
      }),
    };

    // One row per customer; sorted by last order, newest first.
    const groups = await this.prisma.marketplaceOrder.groupBy({
      by: ['customerId'],
      where,
      _count: { _all: true },
      _sum: { total: true },
      _max: { createdAt: true },
    });
    groups.sort((a, b) => (b._max.createdAt?.getTime() ?? 0) - (a._max.createdAt?.getTime() ?? 0));
    const pageRows = groups.slice((page - 1) * limit, page * limit);
    const ids = pageRows.map((g) => g.customerId);

    const [customers, lastOrders] = await Promise.all([
      this.prisma.marketplaceCustomer.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true, phone: true, avatarUrl: true } }),
      this.prisma.marketplaceOrder.findMany({
        where: { shopId, customerId: { in: ids } },
        orderBy: { createdAt: 'desc' },
        distinct: ['customerId'],
        select: { customerId: true, addressSnapshot: true },
      }),
    ]);
    const byId = new Map(customers.map((c) => [c.id, c]));
    const cityOf = new Map(lastOrders.map((o) => [o.customerId, ((o.addressSnapshot ?? {}) as { city?: string }).city ?? null]));
    const fullPhone = hasPermission(user.role, user.permissions, PERMISSIONS.CUSTOMERS_VIEW);

    return {
      items: pageRows.map((g) => {
        const c = byId.get(g.customerId);
        return {
          customerId: g.customerId,
          name: c?.fullName ?? 'Customer',
          phone: fullPhone ? c?.phone ?? null : maskPhone(c?.phone),
          avatarUrl: c?.avatarUrl ?? null,
          city: cityOf.get(g.customerId) ?? null,
          ordersCount: g._count._all,
          totalSpent: Math.round(Number(g._sum.total ?? 0) * 100) / 100,
          lastOrderAt: g._max.createdAt,
        };
      }),
      meta: { page, limit, total: groups.length, totalPages: Math.ceil(groups.length / limit) },
      phoneMasked: !fullPhone,
    };
  }
}
