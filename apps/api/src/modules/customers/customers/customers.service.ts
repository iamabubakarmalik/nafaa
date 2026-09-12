import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { startOfMonth, subMonths } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: AuthenticatedUser,
    scope: ShopScope,
    dto: CreateCustomerDto,
  ) {
    // The branch that registers a customer owns them in every branch list.
    // The record itself stays shared — one person, one balance, one loyalty pot.
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope);

    return this.prisma.customer.create({
      data: {
        tenantId: user.tenantId,
        shopId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        cnic: dto.cnic,
        address: dto.address,
        city: dto.city,
        area: dto.area,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        avatarUrl: dto.avatarUrl,
        notes: dto.notes,
        creditLimit: dto.creditLimit ?? 0,
        isVip: dto.isVip ?? false,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /**
   * What each of these customers owes at one branch.
   *
   * The customer record itself is shared across branches (one person, one
   * profile), so the per-branch figure has to be added up from their ledger.
   */
  private async branchBalances(
    tenantId: string,
    shopId: string,
    customerIds: string[],
  ): Promise<Map<string, number>> {
    if (customerIds.length === 0) return new Map();

    const rows = await this.prisma.customerLedger.groupBy({
      by: ['customerId'],
      where: { tenantId, shopId, customerId: { in: customerIds } },
      _sum: { amount: true },
    });
    return new Map(rows.map((r) => [r.customerId, Number(r._sum.amount ?? 0)]));
  }

  async findAll(
    user: AuthenticatedUser,
    scope: ShopScope,
    query: QueryCustomersDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      tenantId: user.tenantId,
    };

    // ─── Whose customers are these? ───────────────────────────
    // Registered at this branch, OR they have actually bought / taken udhaar
    // here. The second half matters: a walk-in from another branch becomes
    // "ours" the moment they transact, without anybody re-typing their details.
    //
    // A search is deliberately exempt — the cashier typing a phone number must
    // always find the person, whichever branch first met them.
    const branchList = Boolean(
      scope.shopId && !query.search && query.scope !== 'all',
    );

    if (branchList) {
      const shopId = scope.shopId!;
      const [fromSales, fromLedger] = await Promise.all([
        this.prisma.sale.findMany({
          where: { tenantId: user.tenantId, shopId, customerId: { not: null } },
          select: { customerId: true },
          distinct: ['customerId'],
        }),
        this.prisma.customerLedger.findMany({
          where: { tenantId: user.tenantId, shopId },
          select: { customerId: true },
          distinct: ['customerId'],
        }),
      ]);

      const transacted = [
        ...new Set([
          ...fromSales.map((s) => s.customerId!),
          ...fromLedger.map((l) => l.customerId),
        ]),
      ];

      where.OR = [{ shopId }, ...(transacted.length ? [{ id: { in: transacted } }] : [])];
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { cnic: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.city) where.city = { equals: query.city, mode: 'insensitive' };
    if (query.hasCredit === 'true') where.balance = { gt: 0 };
    if (query.isVip === 'true') where.isVip = true;

    const orderBy: Prisma.CustomerOrderByWithRelationInput = {};
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    orderBy[sortBy] = sortOrder;

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    // On a single branch, show what is owed *here* alongside the overall
    // balance, so a cashier isn't chasing money another branch already took.
    let decorated: any[] = items;
    if (scope.shopId) {
      const balances = await this.branchBalances(
        user.tenantId,
        scope.shopId,
        items.map((c) => c.id),
      );
      decorated = items.map((c) => ({
        ...c,
        shopBalance: balances.get(c.id) ?? 0,
        totalBalance: c.balance,
      }));
    }

    return {
      items: decorated,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      isAllShops: scope.isAll,
      /** true = sirf is branch ke customers dikh rahe hain */
      branchFiltered: branchList,
    };
  }

  async findOne(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        sales: {
          where: scope.where,
          orderBy: { soldAt: 'desc' },
          take: 20,
          select: {
            id: true,
            saleNumber: true,
            total: true,
            paidAmount: true,
            creditAmount: true,
            paymentMethod: true,
            status: true,
            soldAt: true,
          },
        },
        ledgers: {
          where: scope.where,
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: {
            createdBy: { select: { id: true, fullName: true } },
            shop: { select: { id: true, name: true, isMain: true } },
          },
        },
        loyaltyTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: { sales: true, ledgers: true },
        },
      },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    const totalSalesAgg = await this.prisma.sale.aggregate({
      where: { customerId: id, tenantId: user.tenantId, ...scope.where, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } },
      _sum: { total: true },
      _count: { _all: true },
      _avg: { total: true },
    });

    return {
      ...customer,
      stats: {
        totalSales: totalSalesAgg._count._all ?? 0,
        totalSpent: totalSalesAgg._sum.total ?? 0,
        averageSale: totalSalesAgg._avg.total ?? 0,
      },
    };
  }

  /** Existence + tenant check. The customer record itself is branch-neutral. */
  private async assertExists(user: AuthenticatedUser, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateCustomerDto) {
    await this.assertExists(user, id);
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    await this.prisma.customer.delete({ where: { id } });
    return { message: 'Customer deleted successfully' };
  }

  async toggleVip(user: AuthenticatedUser, id: string) {
    const c = await this.assertExists(user, id);
    return this.prisma.customer.update({
      where: { id },
      data: { isVip: !c.isVip },
    });
  }

  async stats(user: AuthenticatedUser) {
    const monthStart = startOfMonth(new Date());
    const lastMonthStart = subMonths(monthStart, 1);

    const [total, vip, withCredit, newThisMonth, newLastMonth, topSpenders, totalDebt] =
      await Promise.all([
        this.prisma.customer.count({ where: { tenantId: user.tenantId } }),
        this.prisma.customer.count({ where: { tenantId: user.tenantId, isVip: true } }),
        this.prisma.customer.count({ where: { tenantId: user.tenantId, balance: { gt: 0 } } }),
        this.prisma.customer.count({
          where: { tenantId: user.tenantId, createdAt: { gte: monthStart } },
        }),
        this.prisma.customer.count({
          where: {
            tenantId: user.tenantId,
            createdAt: { gte: lastMonthStart, lt: monthStart },
          },
        }),
        this.prisma.customer.findMany({
          where: { tenantId: user.tenantId, totalSpent: { gt: 0 } },
          orderBy: { totalSpent: 'desc' },
          take: 5,
          select: {
            id: true,
            name: true,
            phone: true,
            avatarUrl: true,
            totalSpent: true,
            isVip: true,
          },
        }),
        this.prisma.customer.aggregate({
          where: { tenantId: user.tenantId },
          _sum: { balance: true },
        }),
      ]);

    return {
      total,
      vip,
      withCredit,
      newThisMonth,
      newLastMonth,
      growthPct:
        newLastMonth > 0
          ? ((newThisMonth - newLastMonth) / newLastMonth) * 100
          : newThisMonth > 0
          ? 100
          : 0,
      totalDebt: totalDebt._sum.balance ?? 0,
      topSpenders,
    };
  }

  /**
   * Get all mobile-related history for a customer:
   * - IMEIs purchased (with PTA + warranty info)
   * - Repair tickets
   * - Used phone trade-ins
   * - EMI plans
   */
  async getMobileHistory(user: AuthenticatedUser, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    // 1. IMEIs sold to this customer (via sale items)
    const customerSales = await this.prisma.sale.findMany({
      where: {
        tenantId: user.tenantId,
        customerId,
        status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
      },
      select: {
        id: true,
        saleNumber: true,
        soldAt: true,
        total: true,
        items: { select: { id: true } },
      },
      orderBy: { soldAt: 'desc' },
    });
    const saleItemIds = customerSales.flatMap((s) => s.items.map((i) => i.id));

    const imeisPurchased = saleItemIds.length > 0
      ? await this.prisma.productImei.findMany({
          where: {
            tenantId: user.tenantId,
            saleItemId: { in: saleItemIds },
          },
          include: {
            product: { select: { id: true, name: true, brand: { select: { name: true } } } },
            variant: { select: { id: true, name: true, color: true } },
          },
          orderBy: { soldAt: 'desc' },
        })
      : [];

    // Map IMEIs back to their sale
    const saleMap = new Map<string, any>();
    customerSales.forEach((s) => {
      s.items.forEach((i) => saleMap.set(i.id, s));
    });
    const enrichedImeis = imeisPurchased.map((imei) => {
      const sale = imei.saleItemId ? saleMap.get(imei.saleItemId) : null;
      const isUnderWarranty = imei.warrantyExpiry
        ? new Date(imei.warrantyExpiry) > new Date()
        : false;
      return {
        ...imei,
        sale: sale ? {
          id: sale.id,
          saleNumber: sale.saleNumber,
          soldAt: sale.soldAt,
        } : null,
        isUnderWarranty,
      };
    });

    // 2. Repair tickets
    const repairs = await this.prisma.repairTicket.findMany({
      where: { tenantId: user.tenantId, customerId },
      include: {
        _count: { select: { parts: true, payments: true } },
      },
      orderBy: { receivedAt: 'desc' },
    });

    // 3. Used phones sold by this customer (trade-in)
    const usedPhonesSold = await this.prisma.usedPhone.findMany({
      where: { tenantId: user.tenantId, fromCustomerId: customerId },
      orderBy: { receivedAt: 'desc' },
    });

    // 4. EMI plans
    const emiPlans = await this.prisma.emiPlan.findMany({
      where: { tenantId: user.tenantId, customerId },
      include: {
        installments: {
          select: { id: true, status: true, amount: true, paidAmount: true, dueDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      customer,
      summary: {
        totalPhonesPurchased: imeisPurchased.length,
        underWarrantyCount: enrichedImeis.filter((i) => i.isUnderWarranty).length,
        repairTicketsCount: repairs.length,
        usedPhonesSoldCount: usedPhonesSold.length,
        activeEmiPlansCount: emiPlans.filter((p) => p.status === 'ACTIVE').length,
      },
      imeisPurchased: enrichedImeis,
      repairs,
      usedPhonesSold,
      emiPlans,
    };
  }

}
