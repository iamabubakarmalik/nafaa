import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { postIndustrySale, recordKhataPayment, resolveIndustryShopId } from '../../_shared/industry-sale.helper';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

export interface SubscribeInput {
  memberId: string;
  planId: string;
  startDate?: string;
  paidAmount?: number;
  /** Agreed price when the desk gives a discount; defaults to the plan total. */
  totalPrice?: number;
  paymentMethod?: string;
  autoRenew?: boolean;
  notes?: string;
  shopId?: string;
  parentMembershipId?: string;
  /** Renewals do not charge admission fee or security deposit again. */
  renewal?: boolean;
}

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sells a membership. The fee is income on the day it is sold, so a sale is
   * posted at once; any unpaid part goes on the member's khata.
   */
  async subscribe(user: AuthenticatedUser, dto: SubscribeInput) {
    const plan = await this.prisma.gymMembershipPlan.findFirst({ where: { id: dto.planId, tenantId: user.tenantId } });
    if (!plan) throw new NotFoundException('Plan not found');
    if (!plan.isActive) throw new BadRequestException('Ye plan band hai');

    const member = await this.prisma.gymMember.findFirst({ where: { id: dto.memberId, tenantId: user.tenantId } });
    if (!member) throw new NotFoundException('Member not found');

    const year = new Date().getFullYear();
    const prefix = 'GYM-M-' + year + '-';
    const last = await this.prisma.gymMemberMembership.findFirst({
      where: { tenantId: user.tenantId, membershipNumber: { startsWith: prefix } },
      orderBy: { membershipNumber: 'desc' },
      select: { membershipNumber: true },
    });
    const membershipNumber = prefix + String((last ? Number(last.membershipNumber.slice(prefix.length)) || 0 : 0) + 1).padStart(5, '0');

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    if (Number.isNaN(startDate.getTime())) throw new BadRequestException('Start date sahi likhein');
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const admission = dto.renewal ? 0 : plan.registrationFee;
    const deposit = dto.renewal ? 0 : plan.securityDeposit;
    const listPrice = r2(plan.price + admission + deposit);
    const totalPrice = dto.totalPrice != null && Number(dto.totalPrice) > 0 ? r2(Number(dto.totalPrice)) : listPrice;
    if (totalPrice > listPrice + 0.01) throw new BadRequestException(`Plan ki poori qeemat Rs ${listPrice} hai`);
    const paidAmount = r2(Math.max(Number(dto.paidAmount) || 0, 0));
    if (paidAmount > totalPrice + 0.01) throw new BadRequestException(`Kul amount sirf Rs ${totalPrice} hai`);
    const balanceDue = r2(Math.max(totalPrice - paidAmount, 0));
    let paymentStatus = 'UNPAID';
    if (paidAmount >= totalPrice - 0.01) paymentStatus = 'PAID';
    else if (paidAmount > 0) paymentStatus = 'PARTIALLY_PAID';

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, dto.shopId ?? member.shopId);
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
          status: paidAmount > 0 || totalPrice <= 0 ? 'ACTIVE' : 'PENDING_PAYMENT',
          visitsRemaining: plan.visitLimit,
          autoRenew: dto.autoRenew ?? false,
          parentMembershipId: dto.parentMembershipId,
          notes: dto.notes,
          createdById: user.id,
        },
      });

      await tx.gymMembershipPlan.update({
        where: { id: dto.planId },
        data: {
          totalSubscribers: { increment: 1 },
          totalRevenue: { increment: totalPrice },
        },
      });

      let sale: { id: string; saleNumber: string } | null = null;
      if (totalPrice > 0) {
        const lines = [
          { label: `Membership: ${plan.name} (${plan.durationDays} din)`, amount: plan.price },
          { label: 'Admission fee', amount: admission },
          { label: 'Security deposit', amount: deposit },
        ];
        const posted = await postIndustrySale(tx, user, {
          saleNumber: `GYM-${membershipNumber}`,
          sourceRef: membershipNumber,
          shopId,
          customerId: member.customerId,
          lines,
          discount: r2(listPrice - totalPrice),
          paidAmount,
          paymentMethod: dto.paymentMethod,
        });
        sale = { id: posted.id, saleNumber: posted.saleNumber };
      }

      return { ...membership, sale };
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

  /** Later payment on a membership: it clears the udhaar its sale put on khata. Method left out is cash. */
  async addPayment(user: AuthenticatedUser, id: string, amount: number, paymentMethod?: string) {
    const m = await this.prisma.gymMemberMembership.findFirst({ where: { id, tenantId: user.tenantId }, include: { member: true } });
    if (!m) throw new NotFoundException('Membership not found');
    const value = r2(Number(amount));
    if (!(value > 0)) throw new BadRequestException('Amount sahi likhein');
    const due = r2(m.totalPrice - m.paidAmount);
    if (due <= 0) throw new BadRequestException('Is membership ka koi baqi nahi');
    if (value > due + 0.01) throw new BadRequestException(`Baqi sirf Rs ${due} hai`);

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, m.member.shopId);
      const billed = await tx.sale.findFirst({
        where: { tenantId: user.tenantId, saleNumber: `GYM-${m.membershipNumber}` },
        select: { id: true },
      });
      if (billed) {
        await recordKhataPayment(tx, user, {
          customerId: m.member.customerId,
          shopId,
          amount: value,
          reference: m.membershipNumber,
          note: `Gym fee wasool: ${m.membershipNumber}`,
          method: paymentMethod,
        });
      } else {
        // Memberships sold before fees were posted have no sale: book this payment as income now.
        const n = await tx.sale.count({ where: { tenantId: user.tenantId, saleNumber: { startsWith: `GYM-${m.membershipNumber}-P` } } });
        await postIndustrySale(tx, user, {
          saleNumber: `GYM-${m.membershipNumber}-P${n + 1}`,
          sourceRef: m.membershipNumber,
          shopId,
          customerId: m.member.customerId,
          lines: [{ label: `Membership fee: ${m.membershipNumber}`, amount: value }],
          paidAmount: value,
          paymentMethod,
        });
      }
      const newPaid = r2(m.paidAmount + value);
      const newBalance = r2(Math.max(m.totalPrice - newPaid, 0));
      const patch: any = { paidAmount: newPaid, balanceDue: newBalance, paymentStatus: newBalance <= 0.01 ? 'PAID' : 'PARTIALLY_PAID' };
      if (m.status === 'PENDING_PAYMENT' && newPaid > 0) patch.status = 'ACTIVE';
      return tx.gymMemberMembership.update({ where: { id }, data: patch, include: { plan: true } });
    });
  }

  async freeze(user: AuthenticatedUser, id: string, days: number, reason?: string) {
    const m = await this.prisma.gymMemberMembership.findFirst({ where: { id, tenantId: user.tenantId }, include: { plan: true } });
    if (!m) throw new NotFoundException('Membership not found');
    days = Math.floor(Number(days));
    if (!(days > 0)) throw new BadRequestException('Din sahi likhein');
    if (m.status !== 'ACTIVE') throw new BadRequestException('Sirf active membership freeze hoti hai');
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
    const m = await this.prisma.gymMemberMembership.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Membership not found');
    if (m.status !== 'FROZEN' && !m.isFrozen) throw new BadRequestException('Ye membership freeze nahi hai');

    // Coming back early gives back the unused freeze days.
    const now = new Date();
    const unusedDays = m.frozenUntil && m.frozenUntil > now
      ? Math.floor((m.frozenUntil.getTime() - now.getTime()) / 86_400_000)
      : 0;
    const endDate = new Date(m.endDate);
    endDate.setDate(endDate.getDate() - unusedDays);

    return this.prisma.gymMemberMembership.update({
      where: { id },
      data: {
        isFrozen: false,
        frozenAt: null,
        frozenUntil: null,
        status: 'ACTIVE',
        endDate,
        totalFrozenDays: Math.max(m.totalFrozenDays - unusedDays, 0),
      },
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

  /** Renewal starts the day the current period ends, so early renewers lose no days. */
  async renew(user: AuthenticatedUser, id: string, paidAmount?: number, paymentMethod?: string) {
    const old = await this.prisma.gymMemberMembership.findFirst({ where: { id, tenantId: user.tenantId }, include: { plan: true } });
    if (!old) throw new NotFoundException('Membership not found');
    const now = new Date();
    const stillRunning = ['ACTIVE', 'FROZEN'].includes(old.status) && old.endDate > now
      && (old.visitsRemaining === null || old.visitsRemaining > 0);
    const startDate = stillRunning ? old.endDate : now;
    if (!stillRunning && old.status === 'ACTIVE') {
      // Visits used up or period over: the old card closes today.
      await this.prisma.gymMemberMembership.update({ where: { id: old.id }, data: { status: 'EXPIRED', actualEndDate: now } });
    }
    return this.subscribe(user, {
      memberId: old.memberId,
      planId: old.planId,
      startDate: startDate.toISOString(),
      paidAmount,
      paymentMethod,
      autoRenew: old.autoRenew,
      parentMembershipId: old.id,
      renewal: true,
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
