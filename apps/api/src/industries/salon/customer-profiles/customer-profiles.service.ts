import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class CustomerProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: any) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const existing = await this.prisma.salonCustomerProfile.findUnique({ where: { customerId: dto.customerId } });
    if (existing) {
      return this.prisma.salonCustomerProfile.update({
        where: { customerId: dto.customerId },
        data: { ...dto, tenantId: user.tenantId },
      });
    }
    return this.prisma.salonCustomerProfile.create({
      data: { ...dto, tenantId: user.tenantId },
    });
  }

  async byCustomer(user: AuthenticatedUser, customerId: string) {
    return this.prisma.salonCustomerProfile.findFirst({
      where: { customerId, tenantId: user.tenantId },
    });
  }

  async list(user: AuthenticatedUser, params: { search?: string }) {
    return this.prisma.salonCustomerProfile.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { lastVisitAt: 'desc' },
      take: 100,
    });
  }
}
