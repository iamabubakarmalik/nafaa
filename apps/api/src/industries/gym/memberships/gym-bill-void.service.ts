/**
 * A gym bill voided at the counter or returned in full. The shared void
 * has already put the money and khata back; this settles the gym records:
 *
 * - Membership bill (GYM-<membership number>): the membership is cancelled
 *   and the plan and member totals are taken back out. Later payments made
 *   on khata stay there as the member's advance.
 * - Payment bill of an old membership (…-P1): the membership's paid amount
 *   goes down again, so the due shows.
 * - Single PT session bill (GYM-PT-…): the session is cancelled and the
 *   trainer's commission for it is taken back.
 * - Freeze fee bill (…-F1): nothing changes on the membership.
 *
 * Every step runs once: a second call finds nothing left to change.
 */

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReturnsService } from '../../../modules/sales/returns/returns.service';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { GYM_SALE, r2 } from '../common/gym-common';

const MEMBERSHIP_BILL = /^GYM-(GYM-M-\d{4}-\d+)(?:-([PF])\d+)?$/;
const PT_BILL = /^GYM-(PT-\d{4}-\d+)$/;

@Injectable()
export class GymBillVoidService implements OnModuleInit {
  private readonly log = new Logger(GymBillVoidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
    private readonly returns: ReturnsService,
  ) {}

  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.settle(tenantId, saleId, 'VOIDED').catch((e) => {
      this.log.warn(`Voided gym bill ${saleId} not settled: ${(e as Error).message}`);
    }));
    this.returns.onReturn((tenantId, saleId) => this.settle(tenantId, saleId, 'FULLY_RETURNED').catch((e) => {
      this.log.warn(`Returned gym bill ${saleId} not settled: ${(e as Error).message}`);
    }));
  }

  async settle(tenantId: string, saleId: string, status: 'VOIDED' | 'FULLY_RETURNED') {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, select: { id: true, saleNumber: true, status: true, total: true } });
    if (!sale || sale.status !== status || !sale.saleNumber.startsWith(GYM_SALE)) return null;
    const note = `Bill ${sale.saleNumber} ${status === 'VOIDED' ? 'void' : 'wapas'}`;

    const m = MEMBERSHIP_BILL.exec(sale.saleNumber);
    if (m) {
      const [, membershipNumber, kind] = m;
      if (kind === 'F') return null;
      return kind === 'P' ? this.paymentBack(tenantId, membershipNumber, r2(sale.total)) : this.cancelMembership(tenantId, membershipNumber, note);
    }
    const pt = PT_BILL.exec(sale.saleNumber);
    return pt ? this.cancelSession(tenantId, pt[1], note) : null;
  }

  private cancelMembership(tenantId: string, membershipNumber: string, note: string) {
    return this.prisma.$transaction(async (tx) => {
      const ms = await tx.gymMemberMembership.findFirst({ where: { tenantId, membershipNumber } });
      if (!ms) return null;
      const done = await tx.gymMemberMembership.updateMany({
        where: { id: ms.id, status: { not: 'CANCELLED' } },
        data: { status: 'CANCELLED', cancelledAt: new Date(), actualEndDate: new Date(), cancellationReason: note, isFrozen: false, balanceDue: 0 },
      });
      if (!done.count) return null;
      await tx.gymMembershipPlan.updateMany({
        where: { id: ms.planId, totalSubscribers: { gt: 0 } },
        data: { totalSubscribers: { decrement: 1 }, totalRevenue: { decrement: ms.totalPrice } },
      });
      await tx.gymMember.updateMany({ where: { id: ms.memberId, totalSpent: { gte: ms.totalPrice } }, data: { totalSpent: { decrement: ms.totalPrice } } });
      return { membershipId: ms.id };
    });
  }

  private paymentBack(tenantId: string, membershipNumber: string, amount: number) {
    return this.prisma.$transaction(async (tx) => {
      const ms = await tx.gymMemberMembership.findFirst({ where: { tenantId, membershipNumber } });
      if (!ms || amount <= 0 || ms.status === 'CANCELLED') return null;
      const paid = r2(Math.max(ms.paidAmount - amount, 0));
      const due = r2(Math.max(ms.totalPrice - paid, 0));
      await tx.gymMemberMembership.update({
        where: { id: ms.id },
        data: { paidAmount: paid, balanceDue: due, paymentStatus: due <= 0.01 ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID' },
      });
      return { membershipId: ms.id };
    });
  }

  private cancelSession(tenantId: string, sessionNumber: string, note: string) {
    return this.prisma.$transaction(async (tx) => {
      const s = await tx.gymPersonalTraining.findFirst({ where: { tenantId, sessionNumber } });
      if (!s) return null;
      const done = await tx.gymPersonalTraining.updateMany({
        where: { id: s.id, status: { not: 'CANCELLED' } },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: note, commissionAmount: 0 },
      });
      if (!done.count) return null;
      if (s.status === 'COMPLETED') {
        await tx.gymTrainer.update({
          where: { id: s.trainerId },
          data: { totalSessions: { decrement: 1 }, totalRevenue: { decrement: s.price }, totalCommission: { decrement: s.commissionAmount } },
        });
        await tx.gymMember.updateMany({ where: { id: s.memberId, totalSpent: { gte: s.price } }, data: { totalSpent: { decrement: s.price } } });
      }
      return { sessionId: s.id };
    });
  }
}
