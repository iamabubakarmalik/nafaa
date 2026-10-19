import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GymGoal, GymMemberStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { DAY_MS, gymClock, nextNumber, opt, paging, r2 } from '../common/gym-common';
import { UpsertMemberDto } from './dto/upsert-member.dto';

/** Member lists the desk works from. */
export type MemberView = 'all' | 'running' | 'expiring' | 'expired' | 'dues' | 'frozen' | 'none' | 'left';
const VIEWS: MemberView[] = ['all', 'running', 'expiring', 'expired', 'dues', 'frozen', 'none', 'left'];

const CUSTOMER_FIELDS = { id: true, name: true, phone: true, cnic: true, email: true, address: true, balance: true, avatarUrl: true } as const;

export interface MemberListParams {
  status?: string;
  goal?: string;
  search?: string;
  hasActiveMembership?: boolean;
  view?: string;
  page?: string;
  limit?: string;
  expiringDays?: string;
  planId?: string;
  /** The member behind a khata (the counter's customer). */
  customerId?: string;
}

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  /**
   * Enrols a member. The member's khata is the customer record: an existing
   * customer is linked, otherwise one is found by phone or opened with the
   * name, phone and CNIC typed at the desk, in the same transaction.
   */
  async create(user: AuthenticatedUser, dto: UpsertMemberDto) {
    const { customerId: givenCustomer, name, phone, cnic, email, address, referralCode, dateOfBirth, memberNumber: typedNumber, ...rest } = dto;
    if (!givenCustomer && !opt(name)) throw new BadRequestException('Member ka naam likhein');
    if (!givenCustomer && !opt(phone)) throw new BadRequestException('Member ka phone number likhein');
    await this.checkLinks(user.tenantId, rest);

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, null);
      let customerId = givenCustomer;
      if (customerId) {
        const c = await tx.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true } });
        if (!c) throw new NotFoundException('Customer nahi mila');
      } else {
        const byPhone = await tx.customer.findFirst({ where: { tenantId: user.tenantId, phone: opt(phone), isActive: true }, select: { id: true, cnic: true } });
        if (byPhone) {
          customerId = byPhone.id;
          if (!byPhone.cnic && opt(cnic)) await tx.customer.update({ where: { id: byPhone.id }, data: { cnic: opt(cnic) } });
        } else {
          const made = await tx.customer.create({
            data: { tenantId: user.tenantId, shopId, name: opt(name)!, phone: opt(phone), cnic: opt(cnic), email: opt(email), address: opt(address) },
            select: { id: true },
          });
          customerId = made.id;
        }
      }
      const existing = await tx.gymMember.findUnique({ where: { customerId }, select: { memberNumber: true, isActive: true } });
      if (existing) {
        throw new BadRequestException(existing.isActive
          ? `Ye customer pehle se member ${existing.memberNumber} hai`
          : `Ye customer pehle member ${existing.memberNumber} tha — us profile ko dobara active karein`);
      }

      let memberNumber = opt(typedNumber);
      if (memberNumber) {
        const dup = await tx.gymMember.findFirst({ where: { tenantId: user.tenantId, memberNumber }, select: { id: true } });
        if (dup) throw new BadRequestException(`Member number ${memberNumber} pehle se kisi aur ka hai`);
      } else {
        memberNumber = await nextNumber(tx, user.tenantId, 'MEM-', async () => (await tx.gymMember.findFirst({
          where: { tenantId: user.tenantId, memberNumber: { startsWith: 'MEM-' } },
          orderBy: { memberNumber: 'desc' },
          select: { memberNumber: true },
        }))?.memberNumber);
      }

      let referredById = rest.referredById;
      if (!referredById && opt(referralCode)) {
        const referrer = await tx.gymMember.findFirst({ where: { tenantId: user.tenantId, referralCode: opt(referralCode) }, select: { id: true } });
        if (!referrer) throw new BadRequestException('Referral code nahi mila');
        referredById = referrer.id;
      }

      return tx.gymMember.create({
        data: {
          ...rest,
          tenantId: user.tenantId,
          shopId,
          customerId: customerId!,
          memberNumber,
          qrCode: opt(rest.qrCode) ?? `GYM-${user.tenantId.slice(0, 8)}-${memberNumber}`,
          rfidCard: opt(rest.rfidCard),
          referralCode: `REF-${user.tenantId.slice(0, 4)}-${memberNumber}`,
          referredById,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        },
      });
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertMemberDto) {
    const m = await this.prisma.gymMember.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Member nahi mila');
    // The customer link and own referral code never change on edit.
    const { customerId: _c, referralCode: _r, name, phone, cnic, email, address, dateOfBirth, memberNumber, ...rest } = dto;
    await this.checkLinks(user.tenantId, rest, id);
    if (memberNumber && memberNumber !== m.memberNumber) {
      const dup = await this.prisma.gymMember.findFirst({ where: { tenantId: user.tenantId, memberNumber, NOT: { id } }, select: { id: true } });
      if (dup) throw new BadRequestException(`Member number ${memberNumber} pehle se kisi aur ka hai`);
    }
    const customerPatch: Prisma.CustomerUpdateInput = {
      ...(opt(name) && { name: opt(name) }),
      ...(phone !== undefined && { phone: opt(phone) ?? null }),
      ...(cnic !== undefined && { cnic: opt(cnic) ?? null }),
      ...(email !== undefined && { email: opt(email) ?? null }),
      ...(address !== undefined && { address: opt(address) ?? null }),
    };
    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(customerPatch).length) {
        await tx.customer.updateMany({ where: { id: m.customerId, tenantId: user.tenantId }, data: customerPatch as Prisma.CustomerUpdateManyMutationInput });
      }
      return tx.gymMember.update({
        where: { id },
        data: {
          ...rest,
          ...(memberNumber && { memberNumber }),
          ...(rest.rfidCard !== undefined && { rfidCard: opt(rest.rfidCard) ?? null }),
          // A member brought back from "left" is active again.
          ...(rest.status === 'ACTIVE' && !m.isActive && { isActive: true }),
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        },
      });
    });
  }

  /** Card and trainer links must belong to this gym, and a card opens one member only. */
  private async checkLinks(tenantId: string, dto: { rfidCard?: string; preferredTrainerId?: string; referredById?: string }, selfId?: string) {
    const card = opt(dto.rfidCard);
    if (card) {
      const holder = await this.prisma.gymMember.findFirst({ where: { tenantId, rfidCard: card, ...(selfId && { NOT: { id: selfId } }) }, select: { memberNumber: true } });
      if (holder) throw new BadRequestException(`Ye card pehle se member ${holder.memberNumber} ke paas hai`);
    }
    if (dto.preferredTrainerId) {
      const t = await this.prisma.gymTrainer.findFirst({ where: { id: dto.preferredTrainerId, tenantId }, select: { id: true } });
      if (!t) throw new BadRequestException('Trainer nahi mila');
    }
    if (dto.referredById) {
      const r = await this.prisma.gymMember.findFirst({ where: { id: dto.referredById, tenantId }, select: { id: true } });
      if (!r) throw new BadRequestException('Refer karne wala member nahi mila');
    }
  }

  private viewWhere(view: MemberView, now: Date, soon: Date): Prisma.GymMemberWhereInput {
    const running: Prisma.GymMemberMembershipWhereInput = { status: { in: ['ACTIVE', 'FROZEN'] }, endDate: { gte: now } };
    switch (view) {
      case 'running': return { memberships: { some: running } };
      case 'expiring': return { memberships: { some: { status: 'ACTIVE', endDate: { gte: now, lte: soon } } }, NOT: { memberships: { some: { status: { in: ['ACTIVE', 'FROZEN'] }, endDate: { gt: soon } } } } };
      case 'expired': return { memberships: { some: {} }, NOT: { memberships: { some: running } } };
      case 'dues': return { memberships: { some: { status: { not: 'CANCELLED' }, balanceDue: { gt: 0.009 } } } };
      case 'frozen': return { memberships: { some: { status: 'FROZEN' } } };
      case 'none': return { memberships: { none: {} } };
      default: return {};
    }
  }

  /**
   * Members with their customer card and current membership. Without `page`
   * the plain array is returned (offline cache and older screens); with it,
   * one page plus the count of every view for the tabs.
   */
  async list(user: AuthenticatedUser, params: MemberListParams) {
    const tenantId = user.tenantId;
    const q = params.search?.trim();
    const now = new Date();
    const soon = new Date(now.getTime() + Math.min(Math.max(Number(params.expiringDays) || 7, 1), 60) * DAY_MS);
    const view: MemberView = VIEWS.includes(params.view as MemberView) ? (params.view as MemberView) : 'all';

    const matchedCustomers = q
      ? await this.prisma.customer.findMany({
          where: { tenantId, OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }, { cnic: { contains: q } }] },
          select: { id: true },
          take: 500,
        })
      : [];
    const base: Prisma.GymMemberWhereInput = {
      tenantId,
      isActive: view !== 'left',
      ...(q && {
        OR: [
          { customerId: { in: matchedCustomers.map((c) => c.id) } },
          { memberNumber: { contains: q, mode: 'insensitive' } },
          { rfidCard: q },
        ],
      }),
      ...(params.status && { status: params.status as GymMemberStatus }),
      ...(params.goal && { primaryGoal: params.goal as GymGoal }),
      ...(params.planId && { memberships: { some: { planId: params.planId } } }),
      ...(params.customerId && { customerId: params.customerId }),
    };
    const where: Prisma.GymMemberWhereInput = {
      AND: [
        base,
        this.viewWhere(view, now, soon),
        ...(params.hasActiveMembership === true ? [this.viewWhere('running', now, soon)] : []),
        ...(params.hasActiveMembership === false ? [{ NOT: this.viewWhere('running', now, soon) }] : []),
      ],
    };

    const paged = params.page !== undefined;
    const { limit, skip, page } = paging(params.page, params.limit);
    const members = await this.prisma.gymMember.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: paged ? skip : 0,
      take: paged ? limit : 200,
      include: {
        memberships: {
          where: { status: { not: 'CANCELLED' } },
          include: { plan: { select: { id: true, name: true, planType: true, allowFreeze: true, maxFreezeDays: true, freezeFee: true, price: true } } },
          orderBy: { endDate: 'desc' },
          take: 3,
        },
      },
    });
    const customers = await this.prisma.customer.findMany({ where: { id: { in: members.map((m) => m.customerId) }, tenantId }, select: CUSTOMER_FIELDS });
    const byId = new Map(customers.map((c) => [c.id, c]));
    const items = members.filter((m) => byId.has(m.customerId)).map((m) => {
      const current = this.currentOf(m.memberships, now);
      const due = r2(m.memberships.reduce((s, x) => s + (x.balanceDue > 0 ? x.balanceDue : 0), 0));
      // Renewed ahead: the next card is booked, so the member is not "ending soon".
      const renewed = m.memberships.some((x) => x !== current && ['ACTIVE', 'FROZEN'].includes(x.status) && x.startDate > now);
      const state = this.state(current, now, soon);
      return { ...m, customer: byId.get(m.customerId), current, due, state: state === 'EXPIRING' && renewed ? 'ACTIVE' : state };
    });
    if (!paged) return items;

    const counts = Object.fromEntries(await Promise.all(VIEWS.map(async (v) => [v, await this.prisma.gymMember.count({
      where: { AND: [{ ...base, isActive: v !== 'left' }, this.viewWhere(v, now, soon)] },
    })] as const)));
    const total = counts[view] ?? 0;
    return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)), counts };
  }

  /**
   * The membership the member is on today: the running one (not a renewal
   * that starts later), else the next one booked, else the latest.
   */
  private currentOf<T extends { status: string; startDate: Date; endDate: Date }>(rows: T[], now: Date): T | null {
    const live = rows.filter((x) => ['ACTIVE', 'FROZEN'].includes(x.status) && x.endDate >= now);
    return live.find((x) => x.startDate <= now) ?? live.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0] ?? rows[0] ?? null;
  }

  /** Where a member stands today: running, ending soon, ended, frozen, or never joined. */
  private state(m: { status: string; endDate: Date; startDate: Date } | null, now: Date, soon: Date) {
    if (!m) return 'NONE';
    if (m.status === 'FROZEN') return 'FROZEN';
    if (m.status === 'PENDING_PAYMENT') return 'PENDING';
    if (m.status !== 'ACTIVE' || m.endDate < now) return 'EXPIRED';
    if (m.startDate > now) return 'UPCOMING';
    return m.endDate <= soon ? 'EXPIRING' : 'ACTIVE';
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const m = await this.prisma.gymMember.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        memberships: { include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 30 },
        measurements: { orderBy: { measurementDate: 'desc' }, take: 12 },
        attendances: { orderBy: { checkInAt: 'desc' }, take: 30 },
      },
    });
    if (!m) throw new NotFoundException('Member nahi mila');
    const [customer, ptSessions, bills] = await Promise.all([
      this.prisma.customer.findFirst({ where: { id: m.customerId, tenantId: user.tenantId } }),
      this.prisma.gymPersonalTraining.findMany({ where: { tenantId: user.tenantId, memberId: m.id }, include: { trainer: { select: { id: true, trainerNumber: true, staffId: true } } }, orderBy: { scheduledStart: 'desc' }, take: 20 }),
      this.prisma.sale.findMany({
        where: { tenantId: user.tenantId, customerId: m.customerId },
        select: { id: true, saleNumber: true, total: true, paidAmount: true, creditAmount: true, status: true, paymentMethod: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    const now = new Date();
    const current = this.currentOf(m.memberships.filter((x) => x.status !== 'CANCELLED'), now);
    return { ...m, customer, ptSessions, bills, current, state: this.state(current, now, new Date(now.getTime() + 7 * DAY_MS)) };
  }

  async byQrCode(user: AuthenticatedUser, qrCode: string) {
    const m = await this.prisma.gymMember.findFirst({ where: { qrCode, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Member nahi mila');
    const customer = await this.prisma.customer.findFirst({ where: { id: m.customerId, tenantId: user.tenantId } });
    return { ...m, customer };
  }

  async byRfid(user: AuthenticatedUser, rfidCard: string) {
    const m = await this.prisma.gymMember.findFirst({ where: { rfidCard, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Member nahi mila');
    const customer = await this.prisma.customer.findFirst({ where: { id: m.customerId, tenantId: user.tenantId } });
    return { ...m, customer };
  }

  /** Member left the gym: the profile is kept (khata, history) and hidden from lists. */
  async remove(user: AuthenticatedUser, id: string) {
    const m = await this.prisma.gymMember.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Member nahi mila');
    return this.prisma.gymMember.update({ where: { id }, data: { isActive: false, status: 'INACTIVE' } });
  }

  async summary(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const clock = await gymClock(this.tz, tenantId);
    const now = new Date();
    const soon = new Date(now.getTime() + 7 * DAY_MS);
    const monthStart = clock.dayStart(`${clock.todayKey().slice(0, 7)}-01`);
    const live = { tenantId, isActive: true };
    const [total, active, byGoal, byStatus, running, expiring, expired, dues, joinedThisMonth, byGender, plans] = await Promise.all([
      this.prisma.gymMember.count({ where: live }),
      this.prisma.gymMember.count({ where: { ...live, status: 'ACTIVE' } }),
      this.prisma.gymMember.groupBy({ by: ['primaryGoal'], where: live, _count: { _all: true } }),
      this.prisma.gymMember.groupBy({ by: ['status'], where: live, _count: { _all: true } }),
      this.prisma.gymMember.count({ where: { ...live, ...this.viewWhere('running', now, soon) } }),
      this.prisma.gymMember.count({ where: { ...live, ...this.viewWhere('expiring', now, soon) } }),
      this.prisma.gymMember.count({ where: { ...live, ...this.viewWhere('expired', now, soon) } }),
      this.prisma.gymMemberMembership.aggregate({ where: { tenantId, status: { not: 'CANCELLED' }, balanceDue: { gt: 0 } }, _sum: { balanceDue: true }, _count: { _all: true } }),
      this.prisma.gymMember.count({ where: { ...live, joinedAt: { gte: monthStart } } }),
      this.prisma.gymMember.groupBy({ by: ['gender'], where: live, _count: { _all: true } }),
      this.prisma.gymMemberMembership.groupBy({ by: ['planId'], where: { tenantId, status: { in: ['ACTIVE', 'FROZEN'] }, endDate: { gte: now } }, _count: { _all: true } }),
    ]);
    const planNames = await this.prisma.gymMembershipPlan.findMany({ where: { tenantId, id: { in: plans.map((p) => p.planId) } }, select: { id: true, name: true } });
    const nameOf = new Map(planNames.map((p) => [p.id, p.name]));
    return {
      total, active, byGoal, byStatus,
      running, expiring, expired,
      duesAmount: r2(dues._sum.balanceDue ?? 0), duesCount: dues._count._all,
      joinedThisMonth,
      byGender: byGender.map((g) => ({ gender: g.gender ?? 'UNKNOWN', count: g._count._all })),
      byPlan: plans.map((p) => ({ planId: p.planId, name: nameOf.get(p.planId) ?? 'Plan', count: p._count._all })).sort((a, b) => b.count - a.count),
    };
  }
}
