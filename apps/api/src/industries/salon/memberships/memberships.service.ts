import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { postIndustrySale } from '../../_shared/industry-sale.helper';

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
  async subscribe(user: AuthenticatedUser, dto: { planId: string; customerId: string; amountPaid: number; paymentMethod?: string; autoRenew?: boolean; notes?: string; shopId?: string }) {
    const plan = await this.prisma.salonMembershipPlan.findFirst({ where: { id: dto.planId, tenantId: user.tenantId } });
    if (!plan) throw new NotFoundException('Plan not found');
    if (!plan.isActive) throw new BadRequestException('Ye plan band hai');
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true } });
    if (!customer) throw new NotFoundException('Customer nahi mila');
    const amountPaid = Math.max(Number(dto.amountPaid) || 0, 0);
    if (amountPaid > plan.price + 0.01) throw new BadRequestException(`Plan ki qeemat sirf Rs ${plan.price} hai`);

    const year = new Date().getFullYear();
    const prefix = `MEM-${year}-`;
    const last = await this.prisma.salonMembership.findFirst({
      where: { tenantId: user.tenantId, membershipNumber: { startsWith: prefix } },
      orderBy: { membershipNumber: 'desc' },
      select: { membershipNumber: true },
    });
    const membershipNumber = `${prefix}${String((last ? Number(last.membershipNumber.slice(prefix.length)) || 0 : 0) + 1).padStart(4, '0')}`;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.salonMembership.create({
        data: {
          tenantId: user.tenantId,
          planId: dto.planId,
          customerId: dto.customerId,
          membershipNumber,
          expiryDate,
          amountPaid,
          paymentMethod: dto.paymentMethod,
          autoRenew: dto.autoRenew ?? false,
          notes: dto.notes,
          createdById: user.id,
        },
      });

      await tx.salonMembershipPlan.update({
        where: { id: dto.planId },
        data: { totalSubscribers: { increment: 1 } },
      });

      // Membership fee is income on the day it is sold; any unpaid part goes on khata.
      if (plan.price > 0) {
        await postIndustrySale(tx, user, {
          saleNumber: `SLN-${membershipNumber}`,
          sourceRef: membershipNumber,
          shopId: dto.shopId,
          customerId: dto.customerId,
          lines: [{ label: `Membership: ${plan.name} (${plan.durationDays} din)`, amount: plan.price }],
          paidAmount: amountPaid,
          paymentMethod: dto.paymentMethod,
        });
      }

      return membership;
    });
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
