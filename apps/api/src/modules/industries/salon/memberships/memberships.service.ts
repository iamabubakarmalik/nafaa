import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  // Plans
  async createPlan(user: AuthenticatedUser, dto: any) {
    const dup = await this.prisma.salonMembershipPlan.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`Plan "${dto.name}" exists`);
    return this.prisma.salonMembershipPlan.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async listPlans(user: AuthenticatedUser, params: { active?: boolean }) {
    return this.prisma.salonMembershipPlan.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async updatePlan(user: AuthenticatedUser, id: string, dto: any) {
    const plan = await this.prisma.salonMembershipPlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!plan) throw new NotFoundException('Plan not found');
    return this.prisma.salonMembershipPlan.update({ where: { id }, data: dto });
  }

  async removePlan(user: AuthenticatedUser, id: string) {
    const plan = await this.prisma.salonMembershipPlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!plan) throw new NotFoundException('Plan not found');
    return this.prisma.salonMembershipPlan.update({ where: { id }, data: { isActive: false } });
  }

  // Subscriptions
  async subscribe(user: AuthenticatedUser, dto: { planId: string; customerId: string; amountPaid: number; paymentMethod?: string; autoRenew?: boolean; notes?: string }) {
    const plan = await this.prisma.salonMembershipPlan.findFirst({ where: { id: dto.planId, tenantId: user.tenantId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const count = await this.prisma.salonMembership.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const membershipNumber = `MEM-${year}-${String(count + 1).padStart(4, '0')}`;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

    const membership = await this.prisma.salonMembership.create({
      data: {
        tenantId: user.tenantId,
        planId: dto.planId,
        customerId: dto.customerId,
        membershipNumber,
        expiryDate,
        amountPaid: dto.amountPaid,
        paymentMethod: dto.paymentMethod,
        autoRenew: dto.autoRenew ?? false,
        notes: dto.notes,
        createdById: user.id,
      },
    });

    await this.prisma.salonMembershipPlan.update({
      where: { id: dto.planId },
      data: { totalSubscribers: { increment: 1 } },
    });

    return membership;
  }

  async listMemberships(user: AuthenticatedUser, params: { status?: string; customerId?: string; planId?: string }) {
    return this.prisma.salonMembership.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.planId && { planId: params.planId }),
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const m = await this.prisma.salonMembership.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Membership not found');
    return this.prisma.salonMembership.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason },
    });
  }

  async expireOldOnes(user: AuthenticatedUser) {
    return this.prisma.salonMembership.updateMany({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        expiryDate: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
  }
}
