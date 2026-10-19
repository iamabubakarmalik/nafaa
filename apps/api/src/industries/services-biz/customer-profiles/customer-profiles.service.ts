/** Service facts kept per customer: property, access, contact preference, VIP. */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import type { UpsertProfileDto } from './dto/profile.dto';

@Injectable()
export class CustomerProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertProfileDto) {
    const c = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true } });
    if (!c) throw new NotFoundException('Customer nahi mila');
    if (dto.preferredTechnicianId && !(await this.prisma.staff.findFirst({ where: { id: dto.preferredTechnicianId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('Technician nahi mila');
    }
    const { customerId, ...data } = dto;
    return this.prisma.serviceCustomerProfile.upsert({
      where: { customerId },
      update: data,
      create: { ...data, customerId, tenantId: user.tenantId },
    });
  }

  async byCustomer(user: AuthenticatedUser, customerId: string) {
    return this.prisma.serviceCustomerProfile.findFirst({ where: { customerId, tenantId: user.tenantId } });
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
