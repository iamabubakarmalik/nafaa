import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(user: AuthenticatedUser, dto: { memberId: string; planId: string; startDate?: string; paidAmount?: number; autoRenew?: boolean; notes?: string }) {
    const plan = await this.prisma.gymMembershipPlan.findFirst({ where: { id: dto.planId, tenantId: user.tenantId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const member = await this.prisma.gymMember.findFirst({ where: { id: dto.memberId, tenantId: user.tenantId } });
    if (!member) throw new NotFoundException('Member not found');

    const count = await this.prisma.gymMemberMembership.count({ where: { tenantId: user.tenantId } });
    const membershipNumber = 'GYM-M-' + new Date().getFullYear() + '-' + String(count + 1).padStart(5, '0');

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const totalPrice = plan.price + plan.registrationFee + plan.securityDeposit;
    const paidAmount = dto.paidAmount ?? 0;
    const balanceDue = totalPrice - paidAmount;
    let paymentStatus = 'UNPAID';
    if (paidAmount >= totalPrice) paymentStatus = 'PAID';
    else if (paidAmount > 0) paymentStatus = 'PARTIALLY_PAID';

    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.gymMemberMembership.create({
        data: {
          tenantId: user.tenantId,
          memberId: dto.memberId,
          planId: dto.planId,
          membershipNumber,
          startDate,
          endDate,
          totalPrice,
          paidAmount,
          balanceDue,
          paymentStatus,
          status: paidAmount > 0 ? 'ACTIVE' : 'PENDING_PAYMENT',
          visitsRemaining: plan.visitLimit,
          autoRenew: dto.autoRenew ?? false,
          notes: dto.notes,
          createdById: user.id,
        },
      });

      await tx.gymMembershipPlan.update({
        where: { id: dto.planId },
        data: {
          totalSubscribers: { increment: 1 },
          totalRevenue: { increment: paidAmount },
        },
      });

      return membership;
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; memberId?: string; planId?: string; expiringDays?: number }) {
    const where: any = {
      tenantId: user.tenantId,
      ...(params.status && { status: params.status as any }),
      ...(params.memberId && { memberId: params.memberId }),
      ...(params.planId && { planId: params.planId }),
    };

    if (params.expiringDays) {
      const future = new Date();
      future.setDate(future.getDate() + params.expiringDays);
      where.status = 'ACTIVE';
      where.endDate = { gte: new Date(), lte: future };
    }

    return this.prisma.gymMemberMembership.findMany({
      where,
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const m = await this.prisma.gymMemberMembership.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { plan: true, member: true },
    });
    if (!m) throw new NotFoundException('Membership not found');
    return m;
  }

  async addPayment(user: AuthenticatedUser, id: string, amount: number) {
    const m = await this.prisma.gymMemberMembership.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Membership not found');

    const newPaid = m.paidAmount + amount;
    const newBalance = Math.max(m.totalPrice - newPaid, 0);
    let paymentStatus = 'PARTIALLY_PAID';
    if (newPaid >= m.totalPrice) paymentStatus = 'PAID';

    const patch: any = { paidAmount: newPaid, balanceDue: newBalance, paymentStatus };
    if (m.status === 'PENDING_PAYMENT' && newPaid > 0) patch.status = 'ACTIVE';

    return this.prisma.gymMemberMembership.update({ where: { id }, data: patch, include: { plan: true } });
  }

  async freeze(user: AuthenticatedUser, id: string, days: number, reason?: string) {
    const m = await this.prisma.gymMemberMembership.findFirst({ where: { id, tenantId: user.tenantId }, include: { plan: true } });
    if (!m) throw new NotFoundException('Membership not found');
    if (!m.plan.allowFreeze) throw new BadRequestException('This plan does not allow freezing');
    if (m.totalFrozenDays + days > m.plan.maxFreezeDays) throw new BadRequestException('Freeze days limit exceeded');

    const frozenUntil = new Date();
    frozenUntil.setDate(frozenUntil.getDate() + days);
    const newEndDate = new Date(m.endDate);
    newEndDate.setDate(newEndDate.getDate() + days);

    return this.prisma.gymMemberMembership.update({
      where: { id },
      data: {
        isFrozen: true,
        frozenAt: new Date(),
        frozenUntil,
        frozenReason: reason,
        totalFrozenDays: m.totalFrozenDays + days,
        status: 'FROZEN',
        endDate: newEndDate,
      },
    });
  }

  async unfreeze(user: AuthenticatedUser, id: string) {
    return this.prisma.gymMemberMembership.update({
      where: { id },
      data: { isFrozen: false, frozenAt: null, frozenUntil: null, status: 'ACTIVE' },
    });
  }

  async cancel(user: AuthenticatedUser, id: string, reason?: string, refundAmount?: number) {
    const m = await this.prisma.gymMemberMembership.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Membership not found');
    return this.prisma.gymMemberMembership.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason,
        refundAmount: refundAmount ?? 0,
        actualEndDate: new Date(),
      },
    });
  }

  async renew(user: AuthenticatedUser, id: string, paidAmount?: number) {
    const old = await this.prisma.gymMemberMembership.findFirst({ where: { id, tenantId: user.tenantId }, include: { plan: true } });
    if (!old) throw new NotFoundException('Membership not found');
    return this.subscribe(user, {
      memberId: old.memberId,
      planId: old.planId,
      paidAmount,
    });
  }

  async expireOldOnes(user: AuthenticatedUser) {
    return this.prisma.gymMemberMembership.updateMany({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        endDate: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
  }
}
