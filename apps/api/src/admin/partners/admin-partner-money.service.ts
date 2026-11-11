/**
 * Partner money for admins: commission plans, earnings (adjustments and
 * reversals), payouts and the marketing kit.
 *
 * Payouts are paid by hand outside Nafaa (JazzCash, Easypaisa or bank).
 * A payout moves REQUESTED → APPROVED → PAID, or to REJECTED from either
 * open state. Marking it paid marks its earnings paid; rejecting it frees its
 * earnings so the partner can ask again.
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PartnerEarningKind, PartnerEarningStatus, PartnerPayoutStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { defaultPlan } from '../../modules/partners/shared/partner-utils';
import { bool, meta, number, optText, paging, text } from './admin-partner-input';

const KIT_KEY = 'partner.kit';
const KIT_TYPES = ['link', 'video', 'pdf', 'image'] as const;
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface PlanInput {
  name?: unknown; description?: unknown; active?: unknown; isDefault?: unknown;
  signupBonus?: unknown; activationBonus?: unknown; activationSales?: unknown; activationDays?: unknown;
  recurringPercent?: unknown; recurringMonths?: unknown; managerOverridePercent?: unknown; clawbackDays?: unknown; slabs?: unknown;
}

export interface KitItem { id: string; title: string; type: (typeof KIT_TYPES)[number]; url: string; description: string | null }
export interface Kit { items: KitItem[]; demo: { url: string; email: string; password: string; note: string | null } | null }

@Injectable()
export class AdminPartnerMoneyService {
  constructor(private readonly prisma: PrismaService) {}

  /* ─────────────────────────── plans ─────────────────────────── */

  async plans() {
    await defaultPlan(this.prisma);
    const plans = await this.prisma.partnerPlan.findMany({ orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }], include: { _count: { select: { partners: true } } } });
    const withoutPlan = await this.prisma.partner.count({ where: { planId: null, status: { not: 'REJECTED' } } });
    return plans.map(({ _count, ...p }) => ({ ...p, partners: _count.partners + (p.isDefault ? withoutPlan : 0), ownPartners: _count.partners }));
  }

  async createPlan(input: PlanInput) {
    const data = this.planFields(input, true) as Prisma.PartnerPlanCreateInput;
    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault) await tx.partnerPlan.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      return tx.partnerPlan.create({ data });
    });
  }

  async updatePlan(id: string, input: PlanInput) {
    const plan = await this.prisma.partnerPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    const data = this.planFields(input, false);
    if (plan.isDefault && data.isDefault === false) throw new BadRequestException('Make another plan the default instead');
    if ((plan.isDefault || data.isDefault) && data.active === false) throw new BadRequestException('The default plan cannot be switched off');
    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault && !plan.isDefault) await tx.partnerPlan.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      return tx.partnerPlan.update({ where: { id }, data: data as Prisma.PartnerPlanUpdateInput });
    });
  }

  private planFields(input: PlanInput, creating: boolean): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (creating || input.name !== undefined) {
      const name = text(input.name, 80);
      if (name.length < 2) throw new BadRequestException('Give the plan a name');
      out.name = name;
    }
    const description = optText(input.description, 500);
    if (description !== undefined) out.description = description;
    if (input.active !== undefined) out.active = bool(input.active, 'Active');
    if (input.isDefault !== undefined) out.isDefault = bool(input.isDefault, 'Default');
    const money: Array<[keyof PlanInput, string]> = [['signupBonus', 'Signup bonus'], ['activationBonus', 'Activation bonus']];
    for (const [k, label] of money) if (input[k] !== undefined) out[k] = round2(number(input[k], label, { min: 0, max: 10_000_000 }));
    const percents: Array<[keyof PlanInput, string]> = [['recurringPercent', 'Recurring percent'], ['managerOverridePercent', 'Manager override percent']];
    for (const [k, label] of percents) if (input[k] !== undefined) out[k] = number(input[k], label, { min: 0, max: 100 });
    const ints: Array<[keyof PlanInput, string, number, number]> = [
      ['activationSales', 'Activation sales', 1, 100000], ['activationDays', 'Activation days', 1, 3650],
      ['recurringMonths', 'Recurring months', 0, 240], ['clawbackDays', 'Hold days', 0, 365],
    ];
    for (const [k, label, min, max] of ints) if (input[k] !== undefined) out[k] = number(input[k], label, { min, max, int: true });
    if (input.slabs !== undefined) {
      if (input.slabs === null) out.slabs = [];
      else {
        if (!Array.isArray(input.slabs)) throw new BadRequestException('Slabs must be a list');
        if (input.slabs.length > 20) throw new BadRequestException('Up to 20 slabs');
        const slabs = input.slabs.map((s, i) => {
          const row = (s ?? {}) as { signups?: unknown; bonus?: unknown };
          return {
            signups: number(row.signups, `Slab ${i + 1} signups`, { min: 1, max: 100000, int: true }),
            bonus: round2(number(row.bonus, `Slab ${i + 1} bonus`, { min: 0, max: 10_000_000 })),
          };
        });
        if (new Set(slabs.map((s) => s.signups)).size !== slabs.length) throw new BadRequestException('Two slabs have the same number of signups');
        out.slabs = slabs.sort((a, b) => a.signups - b.signups);
      }
    }
    return out;
  }

  /* ─────────────────────────── earnings ─────────────────────────── */

  async earnings(q: { partnerId?: string; status?: string; kind?: string; search?: string; page?: string; limit?: string }) {
    const { page, limit, skip } = paging(q);
    const base: Prisma.PartnerEarningWhereInput = {};
    if (q.partnerId) base.partnerId = q.partnerId;
    if (q.kind && Object.values(PartnerEarningKind).includes(q.kind as PartnerEarningKind)) base.kind = q.kind as PartnerEarningKind;
    if (q.search?.trim()) {
      const s = q.search.trim();
      base.OR = [
        { description: { contains: s, mode: 'insensitive' } },
        { partner: { fullName: { contains: s, mode: 'insensitive' } } },
        { partner: { code: { contains: s.toUpperCase() } } },
      ];
    }
    const where: Prisma.PartnerEarningWhereInput = { ...base };
    if (q.status === 'AVAILABLE') { where.status = PartnerEarningStatus.PAYABLE; where.payoutId = null; }
    else if (q.status && Object.values(PartnerEarningStatus).includes(q.status as PartnerEarningStatus)) where.status = q.status as PartnerEarningStatus;

    const [rows, total, sums] = await Promise.all([
      this.prisma.partnerEarning.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: { partner: { select: { id: true, fullName: true, code: true } }, payout: { select: { id: true, status: true, reference: true } } },
      }),
      this.prisma.partnerEarning.count({ where }),
      this.prisma.partnerEarning.groupBy({ by: ['status'], where: base, _sum: { amount: true }, _count: { _all: true } }),
    ]);
    const tenantIds = [...new Set(rows.map((r) => r.tenantId).filter((x): x is string => !!x))];
    const userIds = [...new Set(rows.map((r) => r.createdById).filter((x): x is string => !!x))];
    const [tenants, users] = await Promise.all([
      tenantIds.length ? this.prisma.tenant.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true } }) : [],
      userIds.length ? this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } }) : [],
    ]);
    return {
      items: rows.map((e) => ({
        ...e,
        tenantName: tenants.find((t) => t.id === e.tenantId)?.name ?? null,
        createdByName: users.find((u) => u.id === e.createdById)?.fullName ?? null,
      })),
      totals: Object.values(PartnerEarningStatus).map((s) => {
        const r = sums.find((x) => x.status === s);
        return { status: s, count: r?._count._all ?? 0, amount: r?._sum.amount ?? 0 };
      }),
      meta: meta(page, limit, total),
    };
  }

  /** A hand-made plus or minus amount, payable at once. A minus amount is taken from the next payout. */
  async adjust(adminId: string, partnerId: string, input: { amount?: unknown; note?: unknown }) {
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId }, select: { id: true } });
    if (!partner) throw new NotFoundException('Partner not found');
    const amount = round2(number(input.amount, 'Amount', { min: -10_000_000, max: 10_000_000 }));
    if (amount === 0) throw new BadRequestException('Amount cannot be zero');
    const note = text(input.note, 500);
    if (note.length < 3) throw new BadRequestException('Write a note; the partner sees it');
    return this.prisma.partnerEarning.create({
      data: { partnerId, kind: PartnerEarningKind.ADJUSTMENT, status: PartnerEarningStatus.PAYABLE, amount, description: note, availableAt: new Date(), createdById: adminId },
    });
  }

  /**
   * Cancels an earning that is still on hold, or payable but not yet in a
   * payout. Manager overrides made from it are cancelled the same way.
   */
  async reverse(id: string, reason: unknown) {
    const why = text(reason, 500);
    if (why.length < 3) throw new BadRequestException('Write the reason; the partner sees it');
    const earning = await this.prisma.partnerEarning.findUnique({ where: { id }, select: { id: true, status: true, payoutId: true } });
    if (!earning) throw new NotFoundException('Earning not found');
    const reversible: Prisma.PartnerEarningWhereInput = { OR: [{ status: PartnerEarningStatus.PENDING }, { status: PartnerEarningStatus.PAYABLE, payoutId: null }] };
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.partnerEarning.updateMany({ where: { id, ...reversible }, data: { status: PartnerEarningStatus.REVERSED, reversedReason: why } });
      if (!count) {
        throw new ConflictException(earning.payoutId && earning.status === PartnerEarningStatus.PAYABLE
          ? 'This earning is in a payout request. Reject the payout first.'
          : 'Only an earning on hold, or payable and not in a payout, can be reversed');
      }
      const overrides = await tx.partnerEarning.updateMany({
        where: { sourceRef: `override:${id}`, ...reversible },
        data: { status: PartnerEarningStatus.REVERSED, reversedReason: 'The agent’s earning was reversed' },
      });
      return { reversed: 1 + overrides.count };
    });
  }

  /* ─────────────────────────── payouts ─────────────────────────── */

  async payouts(q: { status?: string; partnerId?: string; search?: string; page?: string; limit?: string }) {
    const { page, limit, skip } = paging(q);
    const base: Prisma.PartnerPayoutWhereInput = {};
    if (q.partnerId) base.partnerId = q.partnerId;
    if (q.search?.trim()) {
      const s = q.search.trim();
      base.OR = [
        { partner: { fullName: { contains: s, mode: 'insensitive' } } },
        { partner: { phone: { contains: s.replace(/\D/g, '') || s } } },
        { partner: { code: { contains: s.toUpperCase() } } },
        { reference: { contains: s, mode: 'insensitive' } },
        { account: { contains: s } },
      ];
    }
    const where: Prisma.PartnerPayoutWhereInput = { ...base };
    if (q.status === 'OPEN') where.status = { in: [PartnerPayoutStatus.REQUESTED, PartnerPayoutStatus.APPROVED] };
    else if (q.status && Object.values(PartnerPayoutStatus).includes(q.status as PartnerPayoutStatus)) where.status = q.status as PartnerPayoutStatus;

    const [rows, total, sums] = await Promise.all([
      this.prisma.partnerPayout.findMany({
        where, orderBy: [{ requestedAt: 'desc' }], skip, take: limit,
        include: {
          partner: { select: { id: true, fullName: true, phone: true, code: true, type: true, payoutMethod: true, payoutAccount: true, payoutTitle: true, bankName: true } },
          _count: { select: { earnings: true } },
        },
      }),
      this.prisma.partnerPayout.count({ where }),
      this.prisma.partnerPayout.groupBy({ by: ['status'], where: base, _sum: { amount: true }, _count: { _all: true } }),
    ]);
    const deciderIds = [...new Set(rows.map((r) => r.decidedById).filter((x): x is string => !!x))];
    const deciders = deciderIds.length ? await this.prisma.user.findMany({ where: { id: { in: deciderIds } }, select: { id: true, fullName: true } }) : [];
    return {
      items: rows.map(({ _count, ...p }) => ({ ...p, earningsCount: _count.earnings, decidedByName: deciders.find((u) => u.id === p.decidedById)?.fullName ?? null })),
      totals: Object.values(PartnerPayoutStatus).map((s) => {
        const r = sums.find((x) => x.status === s);
        return { status: s, count: r?._count._all ?? 0, amount: r?._sum.amount ?? 0 };
      }),
      meta: meta(page, limit, total),
    };
  }

  async approvePayout(adminId: string, id: string) {
    await this.payout(id);
    const { count } = await this.prisma.partnerPayout.updateMany({
      where: { id, status: PartnerPayoutStatus.REQUESTED },
      data: { status: PartnerPayoutStatus.APPROVED, decidedAt: new Date(), decidedById: adminId },
    });
    if (!count) throw new ConflictException('Only a requested payout can be approved');
    return this.payout(id);
  }

  /** Records that the money was sent by hand, with the transaction reference. */
  async markPaid(id: string, input: { reference?: unknown; note?: unknown }) {
    const reference = text(input.reference, 120);
    if (reference.length < 3) throw new BadRequestException('Enter the transaction reference (TID) of the transfer');
    const note = optText(input.note, 500) ?? undefined;
    await this.prisma.$transaction(async (tx) => {
      const payout = await tx.partnerPayout.findUnique({ where: { id }, select: { status: true, amount: true } });
      if (!payout) throw new NotFoundException('Payout not found');
      if (payout.status !== PartnerPayoutStatus.APPROVED) throw new ConflictException('Approve the payout before marking it paid');
      const linked = await tx.partnerEarning.aggregate({ where: { payoutId: id, status: PartnerEarningStatus.PAYABLE }, _sum: { amount: true } });
      if (Math.abs((linked._sum.amount ?? 0) - payout.amount) > 0.01) {
        throw new ConflictException('The earnings in this payout no longer add up to its amount. Reject it and ask the partner to request again.');
      }
      const { count } = await tx.partnerPayout.updateMany({
        where: { id, status: PartnerPayoutStatus.APPROVED },
        data: { status: PartnerPayoutStatus.PAID, paidAt: new Date(), reference, ...(note !== undefined ? { note } : {}) },
      });
      if (!count) throw new ConflictException('This payout was changed by someone else. Refresh and try again.');
      await tx.partnerEarning.updateMany({ where: { payoutId: id, status: PartnerEarningStatus.PAYABLE }, data: { status: PartnerEarningStatus.PAID } });
    });
    return this.payout(id);
  }

  async rejectPayout(adminId: string, id: string, reason: unknown) {
    const why = text(reason, 500);
    if (why.length < 3) throw new BadRequestException('Write the reason; the partner sees it');
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.partnerPayout.updateMany({
        where: { id, status: { in: [PartnerPayoutStatus.REQUESTED, PartnerPayoutStatus.APPROVED] } },
        data: { status: PartnerPayoutStatus.REJECTED, rejectReason: why, decidedAt: new Date(), decidedById: adminId },
      });
      if (!count) {
        const exists = await tx.partnerPayout.findUnique({ where: { id }, select: { id: true } });
        if (!exists) throw new NotFoundException('Payout not found');
        throw new ConflictException('Only a requested or approved payout can be rejected');
      }
      await tx.partnerEarning.updateMany({ where: { payoutId: id, status: PartnerEarningStatus.PAYABLE }, data: { payoutId: null } });
    });
    return this.payout(id);
  }

  private async payout(id: string) {
    const p = await this.prisma.partnerPayout.findUnique({ where: { id }, include: { partner: { select: { id: true, fullName: true, phone: true, code: true } } } });
    if (!p) throw new NotFoundException('Payout not found');
    return p;
  }

  /* ─────────────────────────── marketing kit ─────────────────────────── */

  async kit(): Promise<Kit> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: KIT_KEY }, select: { value: true } });
    if (!row) return { items: [], demo: null };
    try {
      const v = JSON.parse(row.value) as Partial<Kit>;
      return { items: Array.isArray(v.items) ? v.items : [], demo: v.demo ?? null };
    } catch {
      return { items: [], demo: null };
    }
  }

  async saveKit(adminId: string, input: { items?: unknown; demo?: unknown }): Promise<Kit> {
    if (!Array.isArray(input.items)) throw new BadRequestException('Items must be a list');
    if (input.items.length > 100) throw new BadRequestException('Up to 100 items');
    const url = (v: unknown, field: string) => {
      const s = text(v, 1000);
      if (!/^https?:\/\/\S+$/i.test(s)) throw new BadRequestException(`${field} must be a full link starting with https://`);
      return s;
    };
    const items: KitItem[] = input.items.map((raw, i) => {
      const it = (raw ?? {}) as Record<string, unknown>;
      const title = text(it.title, 160);
      if (!title) throw new BadRequestException(`Item ${i + 1} needs a title`);
      const type = text(it.type, 10).toLowerCase() as KitItem['type'];
      if (!KIT_TYPES.includes(type)) throw new BadRequestException(`Item ${i + 1}: type must be link, video, pdf or image`);
      return { id: text(it.id, 64) || randomUUID(), title, type, url: url(it.url, `Item ${i + 1} link`), description: text(it.description, 500) || null };
    });
    let demo: Kit['demo'] = null;
    if (input.demo) {
      const d = input.demo as Record<string, unknown>;
      demo = { url: url(d.url, 'Demo link'), email: text(d.email, 160), password: text(d.password, 120), note: text(d.note, 500) || null };
    }
    const kit: Kit = { items, demo };
    const value = JSON.stringify(kit);
    await this.prisma.systemSetting.upsert({
      where: { key: KIT_KEY },
      create: { key: KIT_KEY, value, category: 'partners', description: 'Partner portal marketing kit and demo account', updatedById: adminId },
      update: { value, category: 'partners', updatedById: adminId },
    });
    return kit;
  }
}
