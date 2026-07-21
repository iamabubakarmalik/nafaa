import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class CustomerProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: any) {
    const c = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Customer not found');

    const existing = await this.prisma.serviceCustomerProfile.findUnique({ where: { customerId: dto.customerId } });
    if (existing) {
      return this.prisma.serviceCustomerProfile.update({
        where: { customerId: dto.customerId },
        data: { ...dto, tenantId: user.tenantId },
      });
    }
    return this.prisma.serviceCustomerProfile.create({
      data: { ...dto, tenantId: user.tenantId },
    });
  }

  async byCustomer(user: AuthenticatedUser, customerId: string) {
    return this.prisma.serviceCustomerProfile.findFirst({
      where: { customerId, tenantId: user.tenantId },
    });
  }

  async list(user: AuthenticatedUser, params: { vip?: boolean; hasAmc?: boolean }) {
    return this.prisma.serviceCustomerProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.vip !== undefined && { isVip: params.vip }),
        ...(params.hasAmc !== undefined && { hasActiveAmc: params.hasAmc }),
      },
      orderBy: { lastServiceAt: 'desc' },
      take: 100,
    });
  }
}
