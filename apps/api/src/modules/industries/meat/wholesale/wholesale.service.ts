import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class WholesaleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const existing = await this.prisma.meatWholesaleAccount.findUnique({ where: { customerId: dto.customerId } });
    if (existing) throw new BadRequestException('Wholesale account already exists for this customer');

    const count = await this.prisma.meatWholesaleAccount.count({ where: { tenantId: user.tenantId } });
    const accountNumber = 'WS-' + String(count + 1).padStart(5, '0');

    return this.prisma.meatWholesaleAccount.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        accountNumber,
        contractStart: dto.contractStart ? new Date(dto.contractStart) : null,
        contractEnd: dto.contractEnd ? new Date(dto.contractEnd) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { active?: boolean; search?: string }) {
    return this.prisma.meatWholesaleAccount.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.search && {
          OR: [
            { accountNumber: { contains: params.search, mode: 'insensitive' } },
            { businessName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.meatWholesaleAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account not found');
    return a;
  }

  async byCustomer(user: AuthenticatedUser, customerId: string) {
    return this.prisma.meatWholesaleAccount.findFirst({ where: { customerId, tenantId: user.tenantId } });
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const a = await this.prisma.meatWholesaleAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account not found');
    return this.prisma.meatWholesaleAccount.update({
      where: { id },
      data: {
        ...dto,
        contractStart: dto.contractStart ? new Date(dto.contractStart) : undefined,
        contractEnd: dto.contractEnd ? new Date(dto.contractEnd) : undefined,
      },
    });
  }

  async recordPurchase(user: AuthenticatedUser, id: string, amount: number) {
    const a = await this.prisma.meatWholesaleAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account not found');
    return this.prisma.meatWholesaleAccount.update({
      where: { id },
      data: {
        totalPurchases: a.totalPurchases + amount,
        totalOrders: a.totalOrders + 1,
        currentBalance: a.currentBalance + amount,
        totalOutstanding: a.totalOutstanding + amount,
      },
    });
  }

  async recordPayment(user: AuthenticatedUser, id: string, amount: number) {
    const a = await this.prisma.meatWholesaleAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account not found');
    return this.prisma.meatWholesaleAccount.update({
      where: { id },
      data: {
        currentBalance: Math.max(a.currentBalance - amount, 0),
        totalOutstanding: Math.max(a.totalOutstanding - amount, 0),
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.meatWholesaleAccount.update({ where: { id }, data: { isActive: false } });
  }
}
