import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  create(user: AuthenticatedUser, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
      },
    });
  }

  async findAll(user: AuthenticatedUser, query: QuerySuppliersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {
      tenantId: user.tenantId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { contactPerson: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { ntn: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.supplier.count({ where }),
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
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        purchases: {
          orderBy: { purchasedAt: 'desc' },
          take: 20,
          select: {
            id: true,
            purchaseNumber: true,
            total: true,
            paidAmount: true,
            paymentMethod: true,
            status: true,
            purchasedAt: true,
          },
        },
        _count: { select: { purchases: true } },
      },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const agg = await this.prisma.purchase.aggregate({
      where: { supplierId: id, tenantId: user.tenantId, status: 'RECEIVED' },
      _sum: { total: true, paidAmount: true },
      _count: { _all: true },
      _avg: { total: true },
    });

    const outstanding = (agg._sum.total ?? 0) - (agg._sum.paidAmount ?? 0);

    return {
      ...supplier,
      stats: {
        totalPurchases: agg._count._all ?? 0,
        totalAmount: agg._sum.total ?? 0,
        totalPaid: agg._sum.paidAmount ?? 0,
        outstanding,
        averagePurchase: agg._avg.total ?? 0,
      },
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateSupplierDto) {
    await this.findOne(user, id);
    return this.prisma.supplier.update({
      where: { id },
      data: dto,
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    await this.prisma.supplier.delete({ where: { id } });
    return { message: 'Supplier deleted successfully' };
  }
}
