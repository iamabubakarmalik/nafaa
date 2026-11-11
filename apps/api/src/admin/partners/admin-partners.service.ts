/**
 * Admin side of partner accounts: the list and stats, adding a partner
 * directly (Nafaa employees), the partner profile with its numbers,
 * approving, suspending, passwords, the partner's shops and monthly targets.
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { PartnerEarningStatus, PartnerPayoutStatus, PartnerStatus, PartnerType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/password.util';
import {
  SYSTEM_TENANT_SLUG, defaultPlan, makePartnerCode, nextMonth, normalizePhone, pkMonth, pkMonthStart,
} from '../../modules/partners/shared/partner-utils';
import { PAYOUT_METHODS, bool, meta, number, oneOf, optText, paging, text } from './admin-partner-input';

/** Visits not marked fake. A plain NOT would also drop visits with no review (NULL). */
const NOT_FAKE = { OR: [{ review: null }, { review: { not: 'fake' } }] } satisfies Prisma.PartnerVisitWhereInput;

const TYPES = Object.values(PartnerType);
const STATUSES = Object.values(PartnerStatus);

export interface PartnerListQuery {
  status?: string; type?: string; city?: string; managerId?: string; manager?: string; search?: string; sort?: string; page?: string; limit?: string;
}

export interface PartnerInput {
  fullName?: unknown; phone?: unknown; email?: unknown; cnic?: unknown; type?: unknown; city?: unknown; territory?: unknown;
  isManager?: unknown; managerId?: unknown; planId?: unknown; salary?: unknown; incentivesOn?: unknown; notes?: unknown;
  payoutMethod?: unknown; payoutAccount?: unknown; payoutTitle?: unknown; bankName?: unknown;
}

const tempPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join('');
};

@Injectable()
export class AdminPartnersService {
  constructor(private readonly prisma: PrismaService) {}

  /* ─────────────────────────── list ─────────────────────────── */

  async stats() {
    const month = pkMonth();
    const from = pkMonthStart(month);
    const to = pkMonthStart(nextMonth(month));
    const [byStatus, byType, paidMonth, signupsMonth, owed, payouts, flagged] = await Promise.all([
      this.prisma.partner.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.partner.groupBy({ by: ['type'], where: { status: PartnerStatus.ACTIVE }, _count: { _all: true } }),
      this.prisma.partnerLead.count({ where: { paidAt: { gte: from, lt: to } } }),
      this.prisma.partnerLead.count({ where: { signedUpAt: { gte: from, lt: to } } }),
      this.prisma.partnerEarning.aggregate({ where: { status: PartnerEarningStatus.PAYABLE }, _sum: { amount: true } }),
      this.prisma.partnerPayout.groupBy({ by: ['status'], where: { status: { in: [PartnerPayoutStatus.REQUESTED, PartnerPayoutStatus.APPROVED] } }, _count: { _all: true }, _sum: { amount: true } }),
      this.prisma.partnerVisit.count({ where: { flags: { isEmpty: false }, review: null } }),
    ]);
    const status = (s: PartnerStatus) => byStatus.find((r) => r.status === s)?._count._all ?? 0;
    const payout = (s: PartnerPayoutStatus) => payouts.find((r) => r.status === s);
    return {
      month,
      total: byStatus.reduce((n, r) => n + r._count._all, 0),
      active: status(PartnerStatus.ACTIVE),
      applied: status(PartnerStatus.APPLIED),
      suspended: status(PartnerStatus.SUSPENDED),
      rejected: status(PartnerStatus.REJECTED),
      byType: TYPES.map((t) => ({ type: t, count: byType.find((r) => r.type === t)?._count._all ?? 0 })),
      signupsThisMonth: signupsMonth,
      paidSignupsThisMonth: paidMonth,
      owed: owed._sum.amount ?? 0,
      requestedPayouts: { count: payout(PartnerPayoutStatus.REQUESTED)?._count._all ?? 0, amount: payout(PartnerPayoutStatus.REQUESTED)?._sum.amount ?? 0 },
      approvedPayouts: { count: payout(PartnerPayoutStatus.APPROVED)?._count._all ?? 0, amount: payout(PartnerPayoutStatus.APPROVED)?._sum.amount ?? 0 },
      flaggedVisits: flagged,
    };
  }

  async list(q: PartnerListQuery) {
    const { page, limit, skip } = paging(q);
    const where: Prisma.PartnerWhereInput = {};
    if (q.status && STATUSES.includes(q.status as PartnerStatus)) where.status = q.status as PartnerStatus;
    if (q.type && TYPES.includes(q.type as PartnerType)) where.type = q.type as PartnerType;
    if (q.city?.trim()) where.city = { contains: q.city.trim(), mode: 'insensitive' };
    if (q.manager === '1') where.isManager = true;
    if (q.managerId === 'none') where.managerId = null;
    else if (q.managerId) where.managerId = q.managerId;
    const search = q.search?.trim();
    if (search) {
      const phone = normalizePhone(search);
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { code: { contains: search.toUpperCase() } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: /^03\d{9}$/.test(phone) ? phone : search.replace(/\D/g, '') || search } },
      ];
    }
    const orderBy: Prisma.PartnerOrderByWithRelationInput =
      q.sort === 'oldest' ? { createdAt: 'asc' }
        : q.sort === 'name' ? { fullName: 'asc' }
          : q.sort === 'last_seen' ? { user: { lastSeenAt: { sort: 'desc', nulls: 'last' } } }
            : { createdAt: 'desc' };

    const [rows, total] = await Promise.all([
      this.prisma.partner.findMany({
        where, orderBy, skip, take: limit,
        select: {
          id: true, code: true, type: true, status: true, fullName: true, phone: true, email: true, city: true, territory: true,
          isManager: true, incentivesOn: true, salary: true, appliedAt: true, approvedAt: true, createdAt: true, rejectReason: true,
          manager: { select: { id: true, fullName: true, code: true } },
          plan: { select: { id: true, name: true } },
          user: { select: { lastSeenAt: true, lastLoginAt: true, isActive: true } },
          _count: { select: { leads: true, tenants: true, team: true } },
        },
      }),
      this.prisma.partner.count({ where }),
    ]);
    const ids = rows.map((r) => r.id);
    const [paid, owed] = ids.length ? await Promise.all([
      this.prisma.partnerLead.groupBy({ by: ['partnerId'], where: { partnerId: { in: ids }, paidAt: { not: null } }, _count: { _all: true } }),
      this.prisma.partnerEarning.groupBy({ by: ['partnerId'], where: { partnerId: { in: ids }, status: PartnerEarningStatus.PAYABLE }, _sum: { amount: true } }),
    ]) : [[], []];
    return {
      items: rows.map(({ user, _count, ...p }) => ({
        ...p,
        lastSeenAt: user.lastSeenAt ?? user.lastLoginAt,
        signedIn: !!user.lastLoginAt,
        leads: _count.leads,
        signups: _count.tenants,
        teamSize: _count.team,
        paid: paid.find((r) => r.partnerId === p.id)?._count._all ?? 0,
        owed: owed.find((r) => r.partnerId === p.id)?._sum.amount ?? 0,
      })),
      meta: meta(page, limit, total),
    };
  }

  /* ─────────────────────────── create and edit ─────────────────────────── */

  /** Admin adds a partner (usually a Nafaa employee). Active at once; the temporary password is returned once. */
  async create(adminId: string, input: PartnerInput) {
    const fullName = text(input.fullName, 120);
    const phone = normalizePhone(text(input.phone, 30));
    if (fullName.length < 3) throw new BadRequestException('Enter the full name');
    if (!/^03\d{9}$/.test(phone)) throw new BadRequestException('Enter the mobile number as 03xxxxxxxxx');
    const type = input.type === undefined ? PartnerType.EMPLOYEE : oneOf(input.type, TYPES, 'Type');
    const email = (optText(input.email, 160) ?? null)?.toLowerCase() ?? null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Email is not valid');
    if (await this.prisma.partner.findUnique({ where: { phone }, select: { id: true } })) throw new ConflictException('A partner with this mobile number already exists');
    if (email && (await this.prisma.partner.findFirst({ where: { email }, select: { id: true } }))) throw new ConflictException('A partner with this email already exists');

    const data = await this.editableFields(null, { ...input, type: undefined, fullName: undefined, phone: undefined, email: undefined });
    const system = await this.systemTenant();
    let code = makePartnerCode();
    for (let i = 0; i < 5 && (await this.prisma.partner.findUnique({ where: { code }, select: { id: true } })); i++) code = makePartnerCode();
    const password = tempPassword();
    const passwordHash = await hashPassword(password);
    const now = new Date();

    const partner = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { tenantId: system.id, email: `${code.toLowerCase()}@partner.nafaa.pk`, fullName, role: UserRole.PARTNER, passwordHash, isActive: true, emailVerified: false },
      });
      return tx.partner.create({
        data: {
          ...(data as Prisma.PartnerUncheckedCreateInput),
          userId: user.id, code, type, fullName, phone, email,
          incentivesOn: typeof data.incentivesOn === 'boolean' ? data.incentivesOn : type !== PartnerType.EMPLOYEE,
          status: PartnerStatus.ACTIVE, approvedAt: now, approvedById: adminId,
        },
      });
    });
    return { partner: { id: partner.id, code: partner.code, fullName: partner.fullName, phone: partner.phone }, temporaryPassword: password };
  }

  async update(id: string, input: PartnerInput) {
    const current = await this.partner(id);
    const data = await this.editableFields(current, input);
    if (input.fullName !== undefined) {
      const fullName = text(input.fullName, 120);
      if (fullName.length < 3) throw new BadRequestException('Enter the full name');
      data.fullName = fullName;
    }
    if (input.phone !== undefined) {
      const phone = normalizePhone(text(input.phone, 30));
      if (!/^03\d{9}$/.test(phone)) throw new BadRequestException('Enter the mobile number as 03xxxxxxxxx');
      if (phone !== current.phone && (await this.prisma.partner.findUnique({ where: { phone }, select: { id: true } }))) throw new ConflictException('Another partner has this mobile number');
      data.phone = phone;
    }
    if (input.email !== undefined) {
      const email = (optText(input.email, 160) ?? null)?.toLowerCase() ?? null;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Email is not valid');
      if (email && email !== current.email && (await this.prisma.partner.findFirst({ where: { email, id: { not: id } }, select: { id: true } }))) throw new ConflictException('Another partner has this email');
      data.email = email;
    }
    if (input.type !== undefined) data.type = oneOf(input.type, TYPES, 'Type');
    await this.prisma.partner.update({ where: { id }, data: data as Prisma.PartnerUncheckedUpdateInput });
    return this.detail(id);
  }

  /** Fields shared by create and edit. `current` is null when creating. */
  private async editableFields(current: { id: string; isManager: boolean } | null, input: PartnerInput): Promise<Record<string, unknown>> {
    const out: Record<string, unknown> = {};
    const plain: Array<[keyof PartnerInput, number]> = [['city', 80], ['territory', 120], ['notes', 2000], ['payoutAccount', 60], ['payoutTitle', 120], ['bankName', 80]];
    for (const [k, max] of plain) {
      const v = optText(input[k], max);
      if (v !== undefined) out[k] = v;
    }
    if (input.cnic !== undefined) {
      const cnic = text(input.cnic, 20).replace(/\D/g, '') || null;
      if (cnic && cnic.length !== 13) throw new BadRequestException('CNIC has 13 digits');
      out.cnic = cnic;
    }
    if (input.payoutMethod !== undefined) {
      const m = text(input.payoutMethod, 20).toUpperCase();
      if (m && !PAYOUT_METHODS.includes(m)) throw new BadRequestException('Payout method must be JazzCash, Easypaisa or bank');
      out.payoutMethod = m || null;
    }
    if (input.incentivesOn !== undefined) out.incentivesOn = bool(input.incentivesOn, 'Incentives');
    if (input.salary !== undefined) out.salary = input.salary === null || input.salary === '' ? null : number(input.salary, 'Salary', { min: 0 });
    if (input.isManager !== undefined) {
      out.isManager = bool(input.isManager, 'Area manager');
      if (current && current.isManager && !out.isManager) {
        const team = await this.prisma.partner.count({ where: { managerId: current.id } });
        if (team) throw new BadRequestException(`Move the ${team} people in this team to another manager first`);
      }
    }
    if (input.planId !== undefined) {
      const planId = typeof input.planId === 'string' && input.planId ? input.planId : null;
      if (planId && !(await this.prisma.partnerPlan.findUnique({ where: { id: planId }, select: { id: true } }))) throw new BadRequestException('Commission plan not found');
      out.planId = planId;
    }
    if (input.managerId !== undefined) {
      const managerId = typeof input.managerId === 'string' && input.managerId ? input.managerId : null;
      if (managerId) await this.checkManager(current?.id ?? null, managerId);
      out.managerId = managerId;
    }
    return out;
  }

  /** The manager must be an area manager who is not rejected, not the partner, and not someone in the partner's own team. */
  private async checkManager(partnerId: string | null, managerId: string) {
    if (partnerId && managerId === partnerId) throw new BadRequestException('A partner cannot be their own manager');
    const manager = await this.prisma.partner.findUnique({ where: { id: managerId }, select: { id: true, isManager: true, status: true } });
    if (!manager) throw new BadRequestException('Manager not found');
    if (!manager.isManager) throw new BadRequestException('That partner is not an area manager');
    if (manager.status === PartnerStatus.REJECTED) throw new BadRequestException('That manager’s application was rejected');
    if (!partnerId) return;
    let cursor: string | null = managerId;
    for (let i = 0; cursor && i < 50; i++) {
      const row: { managerId: string | null } | null = await this.prisma.partner.findUnique({ where: { id: cursor }, select: { managerId: true } });
      cursor = row?.managerId ?? null;
      if (cursor === partnerId) throw new BadRequestException('That manager is in this partner’s own team');
    }
  }

  /* ─────────────────────────── profile ─────────────────────────── */

  async detail(id: string) {
    const p = await this.prisma.partner.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, isActive: true, lastLoginAt: true, lastSeenAt: true, lastSeenVia: true } },
        manager: { select: { id: true, fullName: true, code: true, phone: true } },
        plan: true,
        team: { orderBy: { fullName: 'asc' }, select: { id: true, fullName: true, code: true, status: true, type: true, city: true } },
      },
    });
    if (!p) throw new NotFoundException('Partner not found');
    const month = pkMonth();
    const range = { gte: pkMonthStart(month), lt: pkMonthStart(nextMonth(month)) };
    const [thisMonth, allTime, target, balances, plan, approvedBy, flaggedOpen, sessions] = await Promise.all([
      this.numbers(id, range),
      this.numbers(id),
      this.prisma.partnerTarget.findUnique({ where: { partnerId_month: { partnerId: id, month } } }),
      this.balances(id),
      p.plan ? Promise.resolve(p.plan) : defaultPlan(this.prisma),
      p.approvedById ? this.prisma.user.findUnique({ where: { id: p.approvedById }, select: { fullName: true } }) : Promise.resolve(null),
      this.prisma.partnerVisit.count({ where: { partnerId: id, flags: { isEmpty: false }, review: null } }),
      this.prisma.session.count({ where: { userId: p.userId, expiresAt: { gt: new Date() } } }),
    ]);
    const { user, plan: _own, ...rest } = p;
    return {
      ...rest,
      user: { ...user, activeSessions: sessions },
      plan,
      usesDefaultPlan: !p.planId,
      approvedByName: approvedBy?.fullName ?? null,
      month,
      thisMonth,
      allTime,
      target: target ? { visits: target.visits, signups: target.signups, activations: target.activations } : null,
      balances,
      flaggedOpen,
    };
  }

  /** Activity counts and earnings for one partner, in a date range or all time. */
  private async numbers(partnerId: string, range?: { gte: Date; lt: Date }) {
    const [visits, leads, signups, activations, paid, earned] = await Promise.all([
      this.prisma.partnerVisit.count({ where: { partnerId, ...(range ? { visitedAt: range } : {}), ...NOT_FAKE } }),
      this.prisma.partnerLead.count({ where: { partnerId, ...(range ? { createdAt: range } : {}) } }),
      this.prisma.partnerLead.count({ where: { partnerId, signedUpAt: range ?? { not: null } } }),
      this.prisma.partnerLead.count({ where: { partnerId, activatedAt: range ?? { not: null } } }),
      this.prisma.partnerLead.count({ where: { partnerId, paidAt: range ?? { not: null } } }),
      this.prisma.partnerEarning.aggregate({ where: { partnerId, status: { not: PartnerEarningStatus.REVERSED }, ...(range ? { createdAt: range } : {}) }, _sum: { amount: true } }),
    ]);
    return { visits, leads, signups, activations, paid, earned: earned._sum.amount ?? 0 };
  }

  /** Same buckets the partner sees in the portal, plus `owed` (all payable, in a payout or not). */
  async balances(partnerId: string) {
    const [rows, inPayout] = await Promise.all([
      this.prisma.partnerEarning.groupBy({ by: ['status'], where: { partnerId }, _sum: { amount: true } }),
      this.prisma.partnerEarning.aggregate({ where: { partnerId, status: PartnerEarningStatus.PAYABLE, payoutId: { not: null } }, _sum: { amount: true } }),
    ]);
    const sum = (s: PartnerEarningStatus) => rows.find((r) => r.status === s)?._sum.amount ?? 0;
    const requested = inPayout._sum.amount ?? 0;
    return {
      pending: sum(PartnerEarningStatus.PENDING),
      available: sum(PartnerEarningStatus.PAYABLE) - requested,
      requested,
      owed: sum(PartnerEarningStatus.PAYABLE),
      paid: sum(PartnerEarningStatus.PAID),
      reversed: sum(PartnerEarningStatus.REVERSED),
    };
  }

  /* ─────────────────────────── status and access ─────────────────────────── */

  async approve(adminId: string, id: string) {
    const p = await this.partner(id);
    if (p.status !== PartnerStatus.APPLIED && p.status !== PartnerStatus.REJECTED) throw new BadRequestException('Only an application can be approved');
    await this.prisma.partner.update({ where: { id }, data: { status: PartnerStatus.ACTIVE, approvedAt: new Date(), approvedById: adminId, rejectReason: null } });
    return this.detail(id);
  }

  async reject(id: string, reason: unknown) {
    const p = await this.partner(id);
    const why = text(reason, 500);
    if (!why) throw new BadRequestException('Write the reason; the applicant sees it');
    if (p.status !== PartnerStatus.APPLIED) throw new BadRequestException('Only an application can be rejected. Suspend an active partner instead.');
    await this.prisma.$transaction([
      this.prisma.partner.update({ where: { id }, data: { status: PartnerStatus.REJECTED, rejectReason: why } }),
      this.prisma.session.deleteMany({ where: { userId: p.userId } }),
    ]);
    return this.detail(id);
  }

  async suspend(id: string) {
    const p = await this.partner(id);
    if (p.status !== PartnerStatus.ACTIVE) throw new BadRequestException('Only an active partner can be suspended');
    await this.prisma.$transaction([
      this.prisma.partner.update({ where: { id }, data: { status: PartnerStatus.SUSPENDED } }),
      this.prisma.session.deleteMany({ where: { userId: p.userId } }),
    ]);
    return this.detail(id);
  }

  async reactivate(id: string) {
    const p = await this.partner(id);
    if (p.status !== PartnerStatus.SUSPENDED) throw new BadRequestException('Only a suspended partner can be reactivated');
    await this.prisma.partner.update({ where: { id }, data: { status: PartnerStatus.ACTIVE } });
    return this.detail(id);
  }

  async resetPassword(id: string) {
    const p = await this.partner(id);
    const password = tempPassword();
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: p.userId }, data: { passwordHash: await hashPassword(password), passwordResetToken: null, passwordResetExpires: null } }),
      this.prisma.session.deleteMany({ where: { userId: p.userId } }),
    ]);
    return { temporaryPassword: password };
  }

  async signOut(id: string) {
    const p = await this.partner(id);
    const { count } = await this.prisma.session.deleteMany({ where: { userId: p.userId } });
    return { ended: count };
  }

  /* ─────────────────────────── shops and targets ─────────────────────────── */

  /** Shops this partner brought. Admins see the shop status and payments; partners never do. */
  async shops(id: string, q: { search?: string; page?: string; limit?: string }) {
    await this.partner(id);
    const { page, limit, skip } = paging(q);
    const where: Prisma.TenantWhereInput = { partnerId: id };
    if (q.search?.trim()) where.name = { contains: q.search.trim(), mode: 'insensitive' };
    const [rows, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where, orderBy: { partnerAttributedAt: 'desc' }, skip, take: limit,
        select: {
          id: true, name: true, slug: true, phone: true, status: true, createdAt: true, partnerAttributedAt: true, partnerSource: true, lastActiveAt: true,
          subscriptions: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true, plan: { select: { name: true } } } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);
    const ids = rows.map((t) => t.id);
    const [leads, pays] = ids.length ? await Promise.all([
      this.prisma.partnerLead.findMany({ where: { partnerId: id, tenantId: { in: ids } }, select: { tenantId: true, stage: true, signedUpAt: true, activatedAt: true, paidAt: true } }),
      this.prisma.payment.groupBy({ by: ['tenantId'], where: { tenantId: { in: ids }, status: 'APPROVED' }, _sum: { amount: true } }),
    ]) : [[], []];
    return {
      items: rows.map(({ subscriptions, ...t }) => {
        const lead = leads.find((l) => l.tenantId === t.id);
        return {
          ...t,
          planName: subscriptions[0]?.plan.name ?? null,
          subscriptionStatus: subscriptions[0]?.status ?? null,
          stage: lead?.stage ?? null,
          activatedAt: lead?.activatedAt ?? null,
          paidAt: lead?.paidAt ?? null,
          paymentsTotal: pays.find((r) => r.tenantId === t.id)?._sum.amount ?? 0,
        };
      }),
      meta: meta(page, limit, total),
    };
  }

  /** Targets for the last 12 months (and any future month set), each with what was reached. */
  async targets(id: string) {
    await this.partner(id);
    const rows = await this.prisma.partnerTarget.findMany({ where: { partnerId: id }, orderBy: { month: 'desc' }, take: 24 });
    const current = pkMonth();
    const months = [...new Set([current, ...rows.map((r) => r.month)])].sort().reverse().slice(0, 12);
    const items = await Promise.all(months.map(async (month) => {
      const range = { gte: pkMonthStart(month), lt: pkMonthStart(nextMonth(month)) };
      const [visits, signups, activations] = await Promise.all([
        this.prisma.partnerVisit.count({ where: { partnerId: id, visitedAt: range, ...NOT_FAKE } }),
        this.prisma.partnerLead.count({ where: { partnerId: id, signedUpAt: range } }),
        this.prisma.partnerLead.count({ where: { partnerId: id, activatedAt: range } }),
      ]);
      const t = rows.find((r) => r.month === month);
      return { month, target: t ? { visits: t.visits, signups: t.signups, activations: t.activations } : null, actual: { visits, signups, activations } };
    }));
    return { currentMonth: current, items };
  }

  async setTarget(id: string, month: string, input: { visits?: unknown; signups?: unknown; activations?: unknown }) {
    await this.partner(id);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('Month must look like 2026-11');
    const data = {
      visits: number(input.visits ?? 0, 'Visits', { min: 0, max: 100000, int: true }),
      signups: number(input.signups ?? 0, 'Signups', { min: 0, max: 100000, int: true }),
      activations: number(input.activations ?? 0, 'Activations', { min: 0, max: 100000, int: true }),
    };
    return this.prisma.partnerTarget.upsert({ where: { partnerId_month: { partnerId: id, month } }, create: { partnerId: id, month, ...data }, update: data });
  }

  /* ─────────────────────────── shop's partner (shop page) ─────────────────────────── */

  async tenantPartner(tenantId: string) {
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, partnerSource: true, partnerAttributedAt: true, partner: { select: { id: true, fullName: true, code: true, phone: true, status: true, type: true, city: true } } },
    });
    if (!t) throw new NotFoundException('Shop not found');
    const lead = t.partner
      ? await this.prisma.partnerLead.findFirst({ where: { tenantId, partnerId: t.partner.id }, select: { stage: true } })
      : null;
    return { partner: t.partner, source: t.partnerSource, attributedAt: t.partnerAttributedAt, stage: lead?.stage ?? null };
  }

  /* ─────────────────────────── helpers ─────────────────────────── */

  async partner(id: string) {
    const p = await this.prisma.partner.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Partner not found');
    return p;
  }

  /** The internal Nafaa shop partner accounts belong to (falls back to the first super admin's shop). */
  private async systemTenant(): Promise<{ id: string }> {
    const system = await this.prisma.tenant.findUnique({ where: { slug: SYSTEM_TENANT_SLUG }, select: { id: true } });
    if (system) return system;
    const admin = await this.prisma.user.findFirst({ where: { role: UserRole.SUPER_ADMIN }, orderBy: { createdAt: 'asc' }, select: { tenantId: true } });
    if (!admin) throw new BadRequestException('No internal Nafaa account found to hold partner logins');
    return { id: admin.tenantId };
  }
}
