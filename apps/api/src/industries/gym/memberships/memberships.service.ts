import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { postIndustrySale, recordKhataPayment, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { DAY_MS, GYM_SALE, assertCan, gymClock, nextNumber, opt, paging, r2 } from '../common/gym-common';
import { CancelMembershipDto, FreezeDto, RenewDto, SubscribeDto } from './dto/membership.dto';

const P = PERMISSIONS;

export type MembershipView = 'all' | 'running' | 'expiring' | 'expired' | 'frozen' | 'dues' | 'cancelled' | 'upcoming';
const VIEWS: MembershipView[] = ['all', 'running', 'expiring', 'expired', 'frozen', 'dues', 'cancelled', 'upcoming'];

/** The bill a membership was sold on. */
export const membershipSaleNumber = (membershipNumber: string) => `${GYM_SALE}${membershipNumber}`;

interface SubscribeInput extends SubscribeDto {
  parentMembershipId?: string;
  /** Renewals and returning members pay no admission fee or security deposit again. */
  renewal?: boolean;
}

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  /**
   * Sells a membership. The fee is income on the day it is sold, so a sale is
   * posted at once; any unpaid part goes on the member's khata as udhaar and
   * the membership runs (the desk sees the due at check-in).
   */
  async subscribe(user: AuthenticatedUser, dto: SubscribeInput) {
    const tenantId = user.tenantId;
    const plan = await this.prisma.gymMembershipPlan.findFirst({ where: { id: dto.planId, tenantId } });
    if (!plan) throw new NotFoundException('Plan nahi mila');
    if (!plan.isActive) throw new BadRequestException('Ye plan band hai');

    const member = await this.prisma.gymMember.findFirst({ where: { id: dto.memberId, tenantId } });
    if (!member) throw new NotFoundException('Member nahi mila');
    if (!member.isActive || member.status === 'BANNED') throw new BadRequestException('Ye member active nahi — pehle profile active karein');

    const clock = await gymClock(this.tz, tenantId);
    const startDate = clock.dayStart(dto.startDate);
    if (startDate.getTime() < clock.dayStart().getTime() - 31 * DAY_MS) throw new BadRequestException('Start date ek mahine se zyada purani nahi ho sakti');
    const endDate = clock.periodEnd(startDate, plan.durationDays);
    if (!dto.renewal) {
      // Two cards running at once would double-count days; a running member renews instead.
      const overlap = await this.prisma.gymMemberMembership.findFirst({
        where: { tenantId, memberId: member.id, status: { in: ['ACTIVE', 'FROZEN'] }, endDate: { gte: startDate }, startDate: { lte: endDate } },
        select: { membershipNumber: true, endDate: true },
      });
      if (overlap) throw new BadRequestException(`Membership ${overlap.membershipNumber} ${clock.keyOf(overlap.endDate)} tak chal rahi hai — Renew karein, nayi us ke baad shuru hogi`);
    }

    // Admission is taken once: a member who already had a membership pays none.
    const hadBefore = await this.prisma.gymMemberMembership.count({ where: { tenantId, memberId: member.id, status: { not: 'CANCELLED' } } });
    const firstTime = !dto.renewal && hadBefore === 0;
    const admission = firstTime && !dto.waiveAdmission ? r2(plan.registrationFee) : 0;
    const deposit = firstTime ? r2(plan.securityDeposit) : 0;
    const listPrice = r2(plan.price + admission + deposit);
    const totalPrice = dto.totalPrice != null ? r2(Number(dto.totalPrice)) : listPrice;
    if (totalPrice > listPrice + 0.01) throw new BadRequestException(`Plan ki poori qeemat Rs ${listPrice} hai`);
    if (totalPrice < listPrice - 0.01) assertCan(user, [P.POS_DISCOUNT_OVERRIDE, P.DISCOUNTS_MANAGE], 'Discount dene');
    const paidAmount = r2(Math.max(Number(dto.paidAmount) || 0, 0));
    if (paidAmount > totalPrice + 0.01) throw new BadRequestException(`Kul amount sirf Rs ${totalPrice} hai`);
    const balanceDue = r2(Math.max(totalPrice - paidAmount, 0));
    const paymentStatus = paidAmount >= totalPrice - 0.01 ? 'PAID' : paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID';

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, dto.shopId ?? member.shopId);
      const prefix = `GYM-M-${clock.year()}-`;
      const membershipNumber = await nextNumber(tx, tenantId, prefix, async () => (await tx.gymMemberMembership.findFirst({
        where: { tenantId, membershipNumber: { startsWith: prefix } },
        orderBy: { membershipNumber: 'desc' },
        select: { membershipNumber: true },
      }))?.membershipNumber);

      const membership = await tx.gymMemberMembership.create({
        data: {
          tenantId,
          memberId: member.id,
          planId: plan.id,
          membershipNumber,
          startDate,
          endDate,
          totalPrice,
          paidAmount,
          balanceDue,
          paymentStatus,
          status: 'ACTIVE',
          visitsRemaining: plan.isUnlimited ? null : plan.visitLimit,
          autoRenew: dto.autoRenew ?? false,
          parentMembershipId: dto.parentMembershipId,
          notes: opt(dto.notes),
          createdById: user.id,
        },
      });

      await tx.gymMembershipPlan.update({
        where: { id: plan.id },
        data: { totalSubscribers: { increment: 1 }, totalRevenue: { increment: totalPrice } },
      });

      let sale: { id: string; saleNumber: string } | null = null;
      if (totalPrice > 0) {
        const posted = await postIndustrySale(tx, user, {
          saleNumber: membershipSaleNumber(membershipNumber),
          sourceRef: membershipNumber,
          shopId,
          customerId: member.customerId,
          lines: [
            { label: `Membership: ${plan.name} (${plan.durationDays} din)`, amount: plan.price },
            { label: 'Admission fee', amount: admission },
            { label: 'Security deposit', amount: deposit },
          ],
          discount: r2(listPrice - totalPrice),
          paidAmount,
          paymentMethod: dto.paymentMethod,
        });
        sale = { id: posted.id, saleNumber: posted.saleNumber };
        await tx.gymMember.update({ where: { id: member.id }, data: { totalSpent: { increment: totalPrice } } });
      }

      return { ...membership, plan, sale };
    });
  }

  private viewWhere(view: MembershipView, now: Date, soon: Date): Prisma.GymMemberMembershipWhereInput {
    switch (view) {
      case 'running': return { status: { in: ['ACTIVE', 'FROZEN'] }, startDate: { lte: now }, endDate: { gte: now } };
      case 'upcoming': return { status: 'ACTIVE', startDate: { gt: now } };
      case 'expiring': return { status: 'ACTIVE', endDate: { gte: now, lte: soon } };
      case 'expired': return { OR: [{ status: 'EXPIRED' }, { status: { in: ['ACTIVE', 'FROZEN', 'PENDING_PAYMENT'] }, endDate: { lt: now } }] };
      case 'frozen': return { status: 'FROZEN' };
      case 'dues': return { status: { not: 'CANCELLED' }, balanceDue: { gt: 0.009 } };
      case 'cancelled': return { status: 'CANCELLED' };
      default: return {};
    }
  }

  /**
   * Memberships with the member's name and phone. Without `page` the plain
   * array (older callers); with it, a page plus the count of each view.
   */
  async list(user: AuthenticatedUser, params: {
    status?: string; memberId?: string; planId?: string; expiringDays?: number;
    view?: string; search?: string; page?: string; limit?: string;
  }) {
    const tenantId = user.tenantId;
    const now = new Date();
    const soon = new Date(now.getTime() + Math.min(Math.max(params.expiringDays || 7, 1), 60) * DAY_MS);
    const q = params.search?.trim();
    const customers = q
      ? await this.prisma.customer.findMany({ where: { tenantId, OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] }, select: { id: true }, take: 500 })
      : [];
    const base: Prisma.GymMemberMembershipWhereInput = {
      tenantId,
      ...(params.status && { status: params.status as Prisma.GymMemberMembershipWhereInput['status'] }),
      ...(params.memberId && { memberId: params.memberId }),
      ...(params.planId && { planId: params.planId }),
      ...(q && {
        OR: [
          { membershipNumber: { contains: q, mode: 'insensitive' } },
          { member: { memberNumber: { contains: q, mode: 'insensitive' } } },
          { member: { customerId: { in: customers.map((c) => c.id) } } },
        ],
      }),
    };
    // Older callers ask for "expiring in N days" without a view.
    const view: MembershipView = VIEWS.includes(params.view as MembershipView) ? (params.view as MembershipView) : params.expiringDays ? 'expiring' : 'all';
    const where = { AND: [base, this.viewWhere(view, now, soon)] };
    const paged = params.page !== undefined;
    const { page, limit, skip } = paging(params.page, params.limit);

    const rows = await this.prisma.gymMemberMembership.findMany({
      where,
      include: { plan: true, member: { select: { id: true, memberNumber: true, customerId: true, photoUrl: true } } },
      orderBy: view === 'expiring' || view === 'running' ? { endDate: 'asc' } : view === 'expired' ? { endDate: 'desc' } : { createdAt: 'desc' },
      skip: paged ? skip : 0,
      take: paged ? limit : 200,
    });
    const people = await this.prisma.customer.findMany({
      where: { tenantId, id: { in: rows.map((r) => r.member.customerId) } },
      select: { id: true, name: true, phone: true, balance: true },
    });
    const byId = new Map(people.map((c) => [c.id, c]));
    const items = rows.map((r) => ({ ...r, member: { ...r.member, customer: byId.get(r.member.customerId) ?? null } }));
    if (!paged) return items;

    const counts = Object.fromEntries(await Promise.all(VIEWS.map(async (v) => [v, await this.prisma.gymMemberMembership.count({ where: { AND: [base, this.viewWhere(v, now, soon)] } })] as const)));
    const [money] = await Promise.all([
      this.prisma.gymMemberMembership.aggregate({ where, _sum: { totalPrice: true, paidAmount: true, balanceDue: true } }),
    ]);
    const total = counts[view] ?? 0;
    return {
      items, total, page, pages: Math.max(1, Math.ceil(total / limit)), counts,
      totals: { price: r2(money._sum.totalPrice ?? 0), paid: r2(money._sum.paidAmount ?? 0), due: r2(money._sum.balanceDue ?? 0) },
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const m = await this.prisma.gymMemberMembership.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { plan: true, member: true },
    });
    if (!m) throw new NotFoundException('Membership nahi mili');
    const [customer, bills, payments] = await Promise.all([
      this.prisma.customer.findFirst({ where: { id: m.member.customerId, tenantId: user.tenantId }, select: { id: true, name: true, phone: true, balance: true } }),
      this.prisma.sale.findMany({
        where: { tenantId: user.tenantId, saleNumber: { startsWith: membershipSaleNumber(m.membershipNumber) } },
        select: { id: true, saleNumber: true, total: true, paidAmount: true, creditAmount: true, status: true, paymentMethod: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.customerLedger.findMany({
        where: { tenantId: user.tenantId, reference: m.membershipNumber, type: 'PAYMENT_RECEIVED' },
        select: { id: true, amount: true, paymentMethod: true, createdAt: true, note: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return { ...m, member: { ...m.member, customer }, bills, payments: payments.map((p) => ({ ...p, amount: r2(-p.amount) })) };
  }

  /** Later payment on a membership: it clears the udhaar its sale put on khata. Method left out is cash. */
  async addPayment(user: AuthenticatedUser, id: string, amount: number, paymentMethod?: string) {
    const m = await this.prisma.gymMemberMembership.findFirst({ where: { id, tenantId: user.tenantId }, include: { member: true } });
    if (!m) throw new NotFoundException('Membership nahi mili');
    if (m.status === 'CANCELLED') throw new BadRequestException('Cancel membership par paisa nahi liya ja sakta — khata se wasool karein');
    const value = r2(Number(amount));
    if (!(value > 0)) throw new BadRequestException('Amount sahi likhein');
    const due = r2(m.totalPrice - m.paidAmount);
    if (due <= 0) throw new BadRequestException('Is membership ka koi baqi nahi');
    if (value > due + 0.01) throw new BadRequestException(`Baqi sirf Rs ${due} hai`);

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, m.member.shopId);
      const billed = await tx.sale.findFirst({
        where: { tenantId: user.tenantId, saleNumber: membershipSaleNumber(m.membershipNumber) },
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
        const n = await tx.sale.count({ where: { tenantId: user.tenantId, saleNumber: { startsWith: `${membershipSaleNumber(m.membershipNumber)}-P` } } });
        await postIndustrySale(tx, user, {
          saleNumber: `${membershipSaleNumber(m.membershipNumber)}-P${n + 1}`,
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
      const patch: Prisma.GymMemberMembershipUpdateInput = { paidAmount: newPaid, balanceDue: newBalance, paymentStatus: newBalance <= 0.01 ? 'PAID' : 'PARTIALLY_PAID' };
      if (m.status === 'PENDING_PAYMENT') patch.status = 'ACTIVE';
      return tx.gymMemberMembership.update({ where: { id }, data: patch, include: { plan: true } });
    });
  }

  /** Pauses a running membership; the end date moves by the same days. The plan's freeze fee is billed. */
  async freeze(user: AuthenticatedUser, id: string, dto: FreezeDto) {
    const m = await this.prisma.gymMemberMembership.findFirst({ where: { id, tenantId: user.tenantId }, include: { plan: true, member: true } });
    if (!m) throw new NotFoundException('Membership nahi mili');
    const days = Math.floor(Number(dto.days));
    if (!(days > 0)) throw new BadRequestException('Din sahi likhein');
    if (m.status !== 'ACTIVE' || m.endDate < new Date()) throw new BadRequestException('Sirf chalti membership freeze hoti hai');
    if (!m.plan.allowFreeze) throw new BadRequestException('Is plan me freeze ki ijazat nahi');
    const left = m.plan.maxFreezeDays - m.totalFrozenDays;
    if (days > left) throw new BadRequestException(left > 0 ? `Sirf ${left} din freeze baqi hain` : 'Is membership ke freeze din khatam ho chuke');

    const fee = r2(m.plan.freezeFee);
    const paid = r2(Math.min(Math.max(Number(dto.paidAmount) || 0, 0), fee));
    if (fee > 0) assertCan(user, [P.POS_USE], 'Freeze fee lene');
    const clock = await gymClock(this.tz, user.tenantId);
    const frozenUntil = clock.periodEnd(clock.dayStart(), days);
    const endDate = new Date(m.endDate.getTime() + days * DAY_MS);

    return this.prisma.$transaction(async (tx) => {
      if (fee > 0) {
        const n = await tx.sale.count({ where: { tenantId: user.tenantId, saleNumber: { startsWith: `${membershipSaleNumber(m.membershipNumber)}-F` } } });
        await postIndustrySale(tx, user, {
          saleNumber: `${membershipSaleNumber(m.membershipNumber)}-F${n + 1}`,
          sourceRef: m.membershipNumber,
          shopId: m.member.shopId,
          customerId: m.member.customerId,
          lines: [{ label: `Freeze fee: ${m.membershipNumber} (${days} din)`, amount: fee }],
          paidAmount: paid,
          paymentMethod: dto.paymentMethod,
        });
      }
      return tx.gymMemberMembership.update({
        where: { id },
        data: {
          isFrozen: true,
          frozenAt: new Date(),
          frozenUntil,
          frozenReason: opt(dto.reason),
          totalFrozenDays: m.totalFrozenDays + days,
          status: 'FROZEN',
          endDate,
        },
        include: { plan: true },
      });
    });
  }

  async unfreeze(user: AuthenticatedUser, id: string) {
    const m = await this.prisma.gymMemberMembership.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Membership nahi mili');
    if (m.status !== 'FROZEN' && !m.isFrozen) throw new BadRequestException('Ye membership freeze nahi hai');
    return this.prisma.gymMemberMembership.update({ where: { id }, data: this.unfreezePatch(m, new Date()), include: { plan: true } });
  }

  /** Coming back early gives back the unused freeze days. */
  unfreezePatch(m: { frozenUntil: Date | null; endDate: Date; totalFrozenDays: number }, now: Date): Prisma.GymMemberMembershipUpdateInput {
    const unusedDays = m.frozenUntil && m.frozenUntil > now ? Math.floor((m.frozenUntil.getTime() - now.getTime()) / DAY_MS) : 0;
    return {
      isFrozen: false,
      frozenAt: null,
      frozenUntil: null,
      status: 'ACTIVE',
      endDate: new Date(m.endDate.getTime() - unusedDays * DAY_MS),
      totalFrozenDays: Math.max(m.totalFrozenDays - unusedDays, 0),
    };
  }

  /**
   * Stops a membership. Money is never paid out here: the bill's Return
   * gives money back through the drawer, and a returned or voided bill
   * cancels the membership by itself.
   */
  async cancel(user: AuthenticatedUser, id: string, dto: CancelMembershipDto) {
    const m = await this.prisma.gymMemberMembership.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Membership nahi mili');
    if (m.status === 'CANCELLED') throw new BadRequestException('Ye membership pehle hi cancel hai');
    if ((Number(dto.refundAmount) || 0) > 0) {
      throw new BadRequestException(`Paisa wapas karne ke liye Sales me bill ${membershipSaleNumber(m.membershipNumber)} ka Return karein — membership khud cancel ho jayegi`);
    }
    return this.prisma.gymMemberMembership.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: opt(dto.reason), actualEndDate: new Date(), isFrozen: false },
      include: { plan: true },
    });
  }

  /** Renewal starts the day after the current period ends, so early renewers lose no days. */
  async renew(user: AuthenticatedUser, id: string, dto: RenewDto) {
    const old = await this.prisma.gymMemberMembership.findFirst({ where: { id, tenantId: user.tenantId }, include: { plan: true } });
    if (!old) throw new NotFoundException('Membership nahi mili');
    const now = new Date();
    const stillRunning = ['ACTIVE', 'FROZEN'].includes(old.status) && old.endDate > now
      && (old.visitsRemaining === null || old.visitsRemaining > 0);
    const clock = await gymClock(this.tz, user.tenantId);
    const startKey = stillRunning ? clock.keyOf(new Date(old.endDate.getTime() + 1)) : clock.todayKey(now);
    const renewed = await this.subscribe(user, {
      memberId: old.memberId,
      planId: dto.planId ?? old.planId,
      startDate: startKey,
      paidAmount: dto.paidAmount,
      totalPrice: dto.totalPrice,
      paymentMethod: dto.paymentMethod,
      autoRenew: old.autoRenew,
      notes: dto.notes,
      parentMembershipId: old.id,
      renewal: true,
    });
    if (!stillRunning && old.status === 'ACTIVE') {
      // Visits used up or period over: the old card closes today.
      await this.prisma.gymMemberMembership.update({ where: { id: old.id }, data: { status: 'EXPIRED', actualEndDate: now } });
    }
    return renewed;
  }

  /** The desk sent the renewal reminder (WhatsApp or call). */
  async markReminded(user: AuthenticatedUser, id: string) {
    const m = await this.prisma.gymMemberMembership.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!m) throw new NotFoundException('Membership nahi mili');
    return this.prisma.gymMemberMembership.update({ where: { id }, data: { renewalReminded: true } });
  }

  /** Closes ended periods and lifts freezes whose days are over. */
  async expireOldOnes(user: AuthenticatedUser) {
    const now = new Date();
    const thawed = await this.prisma.gymMemberMembership.updateMany({
      where: { tenantId: user.tenantId, status: 'FROZEN', frozenUntil: { lt: now } },
      data: { status: 'ACTIVE', isFrozen: false, frozenAt: null, frozenUntil: null },
    });
    const expired = await this.prisma.gymMemberMembership.updateMany({
      where: { tenantId: user.tenantId, status: 'ACTIVE', endDate: { lt: now } },
      data: { status: 'EXPIRED' },
    });
    return { count: expired.count, unfrozen: thawed.count };
  }
}
