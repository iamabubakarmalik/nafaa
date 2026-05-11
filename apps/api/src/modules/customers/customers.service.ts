import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { startOfMonth, subMonths } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        tenantId: user.tenantId,
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

  async findAll(user: AuthenticatedUser, query: QueryCustomersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      tenantId: user.tenantId,
    };

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

  async findOne(user: AuthenticatedUser, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        sales: {
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
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: {
            createdBy: { select: { id: true, fullName: true } },
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
      where: { customerId: id, tenantId: user.tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } },
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

  async update(user: AuthenticatedUser, id: string, dto: UpdateCustomerDto) {
    await this.findOne(user, id);
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
    const c = await this.findOne(user, id);
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
}
