import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class FarmersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.farmerNumber) {
      const count = await this.prisma.agriFarmer.count({ where: { tenantId: user.tenantId } });
      dto.farmerNumber = 'FRM-' + String(count + 1).padStart(5, '0');
    }
    if (dto.cnic) {
      const dup = await this.prisma.agriFarmer.findFirst({ where: { tenantId: user.tenantId, cnic: dto.cnic } });
      if (dup) throw new BadRequestException('Farmer with this CNIC already exists');
    }

    return this.prisma.agriFarmer.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        creditLimit: Number(dto.creditLimit) || 0,
        landAreaAcres: dto.landAreaAcres ? Number(dto.landAreaAcres) : null,
        landAreaKanals: dto.landAreaKanals ? Number(dto.landAreaKanals) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; district?: string; search?: string }) {
    return this.prisma.agriFarmer.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.status && { status: params.status as any }),
        ...(params.district && { district: { contains: params.district, mode: 'insensitive' } }),
        ...(params.search && {
          OR: [
            { farmerNumber: { contains: params.search, mode: 'insensitive' } },
            { fullName: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search } },
            { cnic: { contains: params.search } },
            { village: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const f = await this.prisma.agriFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Farmer not found');
    return f;
  }

  async byCustomer(user: AuthenticatedUser, customerId: string) {
    return this.prisma.agriFarmer.findFirst({ where: { customerId, tenantId: user.tenantId } });
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const f = await this.prisma.agriFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Farmer not found');
    return this.prisma.agriFarmer.update({
      where: { id },
      data: {
        ...dto,
        creditLimit: dto.creditLimit !== undefined ? Number(dto.creditLimit) : undefined,
        landAreaAcres: dto.landAreaAcres !== undefined ? Number(dto.landAreaAcres) : undefined,
        landAreaKanals: dto.landAreaKanals !== undefined ? Number(dto.landAreaKanals) : undefined,
      },
    });
  }

  async suspend(user: AuthenticatedUser, id: string, reason: string) {
    return this.prisma.agriFarmer.update({
      where: { id },
      data: { status: 'SUSPENDED', suspendedAt: new Date(), suspensionReason: reason },
    });
  }

  async reactivate(user: AuthenticatedUser, id: string) {
    return this.prisma.agriFarmer.update({
      where: { id },
      data: { status: 'ACTIVE', suspendedAt: null, suspensionReason: null },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.agriFarmer.update({ where: { id }, data: { isActive: false } });
  }

  async recordPurchase(user: AuthenticatedUser, id: string, amount: number) {
    const f = await this.prisma.agriFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Farmer not found');
    return this.prisma.agriFarmer.update({
      where: { id },
      data: {
        totalOrders: f.totalOrders + 1,
        totalPurchases: f.totalPurchases + amount,
        currentBalance: f.currentBalance + amount,
        totalOutstanding: f.totalOutstanding + amount,
        lastPurchaseAt: new Date(),
      },
    });
  }

  async recordPayment(user: AuthenticatedUser, id: string, amount: number) {
    const f = await this.prisma.agriFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Farmer not found');
    return this.prisma.agriFarmer.update({
      where: { id },
      data: {
        totalPaid: f.totalPaid + amount,
        currentBalance: Math.max(f.currentBalance - amount, 0),
        totalOutstanding: Math.max(f.totalOutstanding - amount, 0),
      },
    });
  }

  async overdueList(user: AuthenticatedUser) {
    return this.prisma.agriFarmer.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        totalOutstanding: { gt: 0 },
      },
      orderBy: { totalOutstanding: 'desc' },
      take: 100,
    });
  }

  async summary(user: AuthenticatedUser) {
    const [total, active, suspended, byDistrict, totalOutstanding, totalCredit] = await Promise.all([
      this.prisma.agriFarmer.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.agriFarmer.count({ where: { tenantId: user.tenantId, isActive: true, status: 'ACTIVE' } }),
      this.prisma.agriFarmer.count({ where: { tenantId: user.tenantId, isActive: true, status: 'SUSPENDED' } }),
      this.prisma.agriFarmer.groupBy({
        by: ['district'],
        where: { tenantId: user.tenantId, isActive: true, district: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.agriFarmer.aggregate({
        where: { tenantId: user.tenantId, isActive: true },
        _sum: { totalOutstanding: true, currentBalance: true, totalPurchases: true, creditLimit: true },
      }),
      this.prisma.agriFarmer.count({
        where: { tenantId: user.tenantId, isActive: true, currentBalance: { gt: 0 } },
      }),
    ]);
    return {
      total,
      active,
      suspended,
      byDistrict,
      totals: totalOutstanding._sum,
      farmersWithCredit: totalCredit,
    };
  }
}
