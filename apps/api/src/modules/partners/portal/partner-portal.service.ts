/**
 * What a signed-in partner can see and do: dashboard, leads, field visits,
 * earnings, payouts, marketing kit and (for area managers) their team.
 *
 * Privacy: a partner sees a shop's name, stage dates and plan name only,
 * never its sales, products or customers.
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Partner, PartnerEarningStatus, PartnerLeadStage, PartnerPayoutStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageService } from '../../../core/storage/storage.service';
import { LEAD_LOCK_DAYS, MIN_PAYOUT, addDays, defaultPlan, normalizePhone, phoneVariants, pkMonth, pkMonthStart, nextMonth, planSlabs } from '../shared/partner-utils';
import { visitFlags } from '../shared/visit-checks';

const OPEN_STAGES: PartnerLeadStage[] = [PartnerLeadStage.VISITED, PartnerLeadStage.DEMO];
const PARTNER_SET_STAGES: PartnerLeadStage[] = [PartnerLeadStage.VISITED, PartnerLeadStage.DEMO, PartnerLeadStage.LOST];
const INTEREST = ['HOT', 'WARM', 'COLD'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);
const date = (v: unknown) => {
  if (typeof v !== 'string' && !(v instanceof Date)) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
/** Start of today in Pakistan, as UTC. */
const pkDayStart = (d = new Date()) => {
  const pk = new Date(d.getTime() + 5 * 3_600_000);
  return new Date(Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth(), pk.getUTCDate()) - 5 * 3_600_000);
};

export interface LeadInput {
  shopName?: string; ownerName?: string; phone?: string; category?: string; city?: string; address?: string;
  interest?: string; followUpAt?: string | null; notes?: string; stage?: string; lostReason?: string;
}

export interface VisitInput {
  clientId?: string; leadId?: string; lead?: LeadInput;
  lat?: number; lng?: number; accuracy?: number; photoUrl?: string; note?: string; visitedAt?: string;
  interest?: string; followUpAt?: string | null; stage?: string;
}

@Injectable()
export class PartnerPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /* ─────────────────────────── dashboard ─────────────────────────── */

  async dashboard(p: Partner) {
    const month = pkMonth();
    const from = pkMonthStart(month);
    const to = pkMonthStart(nextMonth(month));
    const today = pkDayStart();
    const tomorrow = addDays(today, 1);
    const [visitsToday, visitsMonth, stages, signups, activations, paid, balances, target, followUps, plan] = await Promise.all([
      this.prisma.partnerVisit.count({ where: { partnerId: p.id, visitedAt: { gte: today } } }),
      this.prisma.partnerVisit.count({ where: { partnerId: p.id, visitedAt: { gte: from, lt: to } } }),
      this.prisma.partnerLead.groupBy({ by: ['stage'], where: { partnerId: p.id }, _count: { _all: true } }),
      this.prisma.partnerLead.count({ where: { partnerId: p.id, signedUpAt: { gte: from, lt: to } } }),
      this.prisma.partnerLead.count({ where: { partnerId: p.id, activatedAt: { gte: from, lt: to } } }),
      this.prisma.partnerLead.count({ where: { partnerId: p.id, paidAt: { gte: from, lt: to } } }),
      this.balances(p.id),
      this.prisma.partnerTarget.findUnique({ where: { partnerId_month: { partnerId: p.id, month } } }),
      this.prisma.partnerLead.findMany({
        where: { partnerId: p.id, stage: { in: OPEN_STAGES }, followUpAt: { lt: tomorrow } },
        orderBy: { followUpAt: 'asc' }, take: 10,
        select: { id: true, shopName: true, ownerName: true, phone: true, followUpAt: true, stage: true, interest: true },
      }),
      p.planId ? this.prisma.partnerPlan.findUnique({ where: { id: p.planId } }) : defaultPlan(this.prisma),
    ]);
    const byStage = Object.fromEntries(stages.map((s) => [s.stage, s._count._all])) as Partial<Record<PartnerLeadStage, number>>;
    const slabs = plan ? planSlabs(plan) : [];
    return {
      month,
      today: { visits: visitsToday },
      thisMonth: { visits: visitsMonth, signups, activations, paid },
      leads: Object.fromEntries(Object.values(PartnerLeadStage).map((s) => [s, byStage[s] ?? 0])),
      earnings: balances,
      target: target ? { visits: target.visits, signups: target.signups, activations: target.activations } : null,
      nextSlab: slabs.find((s) => s.signups > paid) ?? null,
      plan: plan && p.incentivesOn ? {
        name: plan.name, signupBonus: plan.signupBonus, activationBonus: plan.activationBonus, activationSales: plan.activationSales, activationDays: plan.activationDays,
        recurringPercent: plan.recurringPercent, recurringMonths: plan.recurringMonths, managerOverridePercent: p.isManager ? plan.managerOverridePercent : 0,
        clawbackDays: plan.clawbackDays, slabs,
      } : null,
      followUps,
      leaderboard: await this.leaderboard(p.id, from, to),
    };
  }

  /** Top partners this month by paid signups, then signups. First name and city only. */
  private async leaderboard(meId: string, from: Date, to: Date) {
    const [paid, signed] = await Promise.all([
      this.prisma.partnerLead.groupBy({ by: ['partnerId'], where: { paidAt: { gte: from, lt: to } }, _count: { _all: true } }),
      this.prisma.partnerLead.groupBy({ by: ['partnerId'], where: { signedUpAt: { gte: from, lt: to } }, _count: { _all: true } }),
    ]);
    const score = new Map<string, { paid: number; signups: number }>();
    for (const r of signed) score.set(r.partnerId, { paid: 0, signups: r._count._all });
    for (const r of paid) score.set(r.partnerId, { signups: score.get(r.partnerId)?.signups ?? 0, paid: r._count._all });
    const ranked = [...score.entries()].sort((a, b) => b[1].paid - a[1].paid || b[1].signups - a[1].signups);
    const top = ranked.slice(0, 10).map(([id]) => id);
    const people = top.length ? await this.prisma.partner.findMany({ where: { id: { in: top } }, select: { id: true, fullName: true, city: true } }) : [];
    const names = new Map(people.map((x) => [x.id, x]));
    const myRank = ranked.findIndex(([id]) => id === meId);
    return {
      top: ranked.slice(0, 10).map(([id, s], i) => ({ rank: i + 1, name: (names.get(id)?.fullName ?? '').split(' ')[0], city: names.get(id)?.city ?? null, me: id === meId, ...s })),
      myRank: myRank >= 0 ? myRank + 1 : null,
      total: ranked.length,
    };
  }

  /* ─────────────────────────── leads ─────────────────────────── */

  async leads(p: Partner, q: { stage?: string; search?: string; due?: string; page?: string; limit?: string }) {
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 25));
    const page = Math.max(1, Number(q.page) || 1);
    const term = str(q.search, 80);
    const where: Prisma.PartnerLeadWhereInput = {
      partnerId: p.id,
      ...(q.stage && (Object.values(PartnerLeadStage) as string[]).includes(q.stage) ? { stage: q.stage as PartnerLeadStage } : {}),
      ...(q.due === '1' ? { stage: { in: OPEN_STAGES }, followUpAt: { lt: addDays(pkDayStart(), 1) } } : {}),
      ...(term ? { OR: [{ shopName: { contains: term, mode: 'insensitive' } }, { ownerName: { contains: term, mode: 'insensitive' } }, { phone: { contains: term.replace(/\D/g, '') || term } }] } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.partnerLead.findMany({
        where, orderBy: [{ updatedAt: 'desc' }], skip: (page - 1) * limit, take: limit,
        include: { _count: { select: { visits: true } }, visits: { orderBy: { visitedAt: 'desc' }, take: 1, select: { visitedAt: true } } },
      }),
      this.prisma.partnerLead.count({ where }),
    ]);
    const plans = await this.tenantPlans(items.map((l) => l.tenantId));
    return {
      items: items.map(({ _count, visits, ...l }) => ({ ...this.leadView(l, plans), visitCount: _count.visits, lastVisitAt: visits[0]?.visitedAt ?? null })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async lead(p: Partner, id: string) {
    const l = await this.prisma.partnerLead.findFirst({
      where: { id, partnerId: p.id },
      include: { visits: { orderBy: { visitedAt: 'desc' }, select: { id: true, visitedAt: true, lat: true, lng: true, photoUrl: true, note: true, flags: true } } },
    });
    if (!l) throw new NotFoundException('Lead nahi mili');
    const plans = await this.tenantPlans([l.tenantId]);
    const { visits, ...lead } = l;
    return { ...this.leadView(lead, plans), visits };
  }

  async createLead(p: Partner, input: LeadInput) {
    const data = this.leadFields(input, true);
    const phone = data.phone as string;
    const mine = await this.prisma.partnerLead.findFirst({ where: { partnerId: p.id, phone: { in: phoneVariants(phone) } }, select: { id: true } });
    if (mine) throw new ConflictException('Ye dukaan pehle se aap ki leads me hai');
    await this.assertPhoneFree(p.id, phone);
    const now = new Date();
    const lead = await this.prisma.partnerLead.create({
      data: { ...data, shopName: data.shopName as string, phone, partnerId: p.id, lockedUntil: addDays(now, LEAD_LOCK_DAYS) } as Prisma.PartnerLeadUncheckedCreateInput,
    });
    return this.lead(p, lead.id);
  }

  async updateLead(p: Partner, id: string, input: LeadInput) {
    const lead = await this.prisma.partnerLead.findFirst({ where: { id, partnerId: p.id }, select: { id: true, stage: true } });
    if (!lead) throw new NotFoundException('Lead nahi mili');
    const data = this.leadFields(input, false);
    delete data.phone; // the phone is the lock key; it cannot be changed
    if (input.stage !== undefined) {
      const stage = input.stage as PartnerLeadStage;
      if (!PARTNER_SET_STAGES.includes(stage)) throw new BadRequestException('Ye stage Nafaa khud lagata hai');
      if (!OPEN_STAGES.includes(lead.stage) && lead.stage !== PartnerLeadStage.LOST) throw new BadRequestException('Signup ho chuki lead ka stage nahi badal sakta');
      data.stage = stage;
      data.lostReason = stage === PartnerLeadStage.LOST ? str(input.lostReason, 300) || null : null;
    }
    await this.prisma.partnerLead.update({ where: { id }, data: data as Prisma.PartnerLeadUncheckedUpdateInput });
    return this.lead(p, id);
  }

  /* ─────────────────────────── visits ─────────────────────────── */

  async createVisit(p: Partner, input: VisitInput) {
    const clientId = str(input.clientId, 64) || null;
    if (clientId) {
      const done = await this.prisma.partnerVisit.findUnique({ where: { clientId }, select: { id: true, leadId: true, partnerId: true } });
      if (done && done.partnerId === p.id) return { visitId: done.id, lead: await this.lead(p, done.leadId), duplicate: true };
    }

    const now = new Date();
    let visitedAt = date(input.visitedAt) ?? now;
    if (visitedAt > addDays(now, 0.01) || visitedAt < addDays(now, -7)) visitedAt = now;
    const lat = num(input.lat);
    const lng = num(input.lng);
    const accuracy = num(input.accuracy);
    const photoUrl = str(input.photoUrl, 600) || null;
    if (photoUrl && !/^https:\/\//.test(photoUrl)) throw new BadRequestException('Photo ka link durust nahi');

    let leadId = str(input.leadId, 64);
    if (leadId) {
      const own = await this.prisma.partnerLead.findFirst({ where: { id: leadId, partnerId: p.id }, select: { id: true } });
      if (!own) throw new NotFoundException('Lead nahi mili');
    } else {
      const data = this.leadFields(input.lead ?? {}, true);
      const phone = data.phone as string;
      const mine = await this.prisma.partnerLead.findFirst({ where: { partnerId: p.id, phone: { in: phoneVariants(phone) } }, select: { id: true } });
      if (mine) leadId = mine.id;
      else {
        await this.assertPhoneFree(p.id, phone);
        const created = await this.prisma.partnerLead.create({
          data: { ...data, shopName: data.shopName as string, phone, partnerId: p.id, lockedUntil: addDays(now, LEAD_LOCK_DAYS), lat, lng } as Prisma.PartnerLeadUncheckedCreateInput,
        });
        leadId = created.id;
      }
    }

    const lead = await this.prisma.partnerLead.findUnique({ where: { id: leadId }, select: { lat: true, lng: true, stage: true } });
    const [previous, sameDay] = await Promise.all([
      this.prisma.partnerVisit.findFirst({ where: { partnerId: p.id, visitedAt: { lte: visitedAt } }, orderBy: { visitedAt: 'desc' }, select: { lat: true, lng: true, visitedAt: true } }),
      this.prisma.partnerVisit.count({ where: { partnerId: p.id, visitedAt: { gte: pkDayStart(visitedAt), lt: addDays(pkDayStart(visitedAt), 1) } } }),
    ]);
    const flags = visitFlags({ visit: { lat, lng, accuracy, visitedAt }, leadPoint: lead, previous, visitsThatDay: sameDay });

    const leadUpdate: Prisma.PartnerLeadUncheckedUpdateInput = {};
    if (lead && lead.lat == null && lat != null && lng != null) { leadUpdate.lat = lat; leadUpdate.lng = lng; }
    const interest = str(input.interest, 10).toUpperCase();
    if (INTEREST.includes(interest)) leadUpdate.interest = interest;
    if (input.followUpAt !== undefined) leadUpdate.followUpAt = date(input.followUpAt);
    if (input.stage === PartnerLeadStage.DEMO && lead && OPEN_STAGES.includes(lead.stage)) leadUpdate.stage = PartnerLeadStage.DEMO;

    try {
      const [visit] = await this.prisma.$transaction([
        this.prisma.partnerVisit.create({ data: { partnerId: p.id, leadId, clientId, lat, lng, accuracy, photoUrl, note: str(input.note, 1000) || null, visitedAt, flags } }),
        this.prisma.partnerLead.update({ where: { id: leadId }, data: leadUpdate }),
      ]);
      return { visitId: visit.id, flags, lead: await this.lead(p, leadId) };
    } catch (e) {
      // The same offline visit arrived twice at the same moment.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && clientId) {
        const done = await this.prisma.partnerVisit.findUnique({ where: { clientId }, select: { id: true } });
        return { visitId: done?.id, lead: await this.lead(p, leadId), duplicate: true };
      }
      throw e;
    }
  }

  async visits(p: Partner, q: { from?: string; to?: string; page?: string; limit?: string }) {
    const limit = Math.min(500, Math.max(1, Number(q.limit) || 100));
    const page = Math.max(1, Number(q.page) || 1);
    const from = date(q.from) ?? pkMonthStart(pkMonth());
    const to = date(q.to) ?? addDays(new Date(), 1);
    const where: Prisma.PartnerVisitWhereInput = { partnerId: p.id, visitedAt: { gte: from, lt: to } };
    const [items, total] = await Promise.all([
      this.prisma.partnerVisit.findMany({
        where, orderBy: { visitedAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        select: { id: true, visitedAt: true, lat: true, lng: true, photoUrl: true, note: true, flags: true, lead: { select: { id: true, shopName: true, stage: true } } },
      }),
      this.prisma.partnerVisit.count({ where }),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async presignPhoto(p: Partner, input: { fileName?: string; contentType?: string; fileSize?: number }) {
    const contentType = str(input.contentType, 40);
    if (!IMAGE_TYPES.includes(contentType)) throw new BadRequestException('Sirf photo (JPG, PNG, WebP) bhej sakte hain');
    return this.storage.getPresignedUploadUrl({ fileName: str(input.fileName, 120) || 'visit.jpg', contentType, fileSize: num(input.fileSize) ?? undefined, folder: 'partner-visits', userId: p.userId });
  }

  /* ─────────────────────────── money ─────────────────────────── */

  async balances(partnerId: string) {
    const rows = await this.prisma.partnerEarning.groupBy({ by: ['status'], where: { partnerId }, _sum: { amount: true } });
    const sum = (s: PartnerEarningStatus) => rows.find((r) => r.status === s)?._sum.amount ?? 0;
    const inPayout = await this.prisma.partnerEarning.aggregate({ where: { partnerId, status: PartnerEarningStatus.PAYABLE, payoutId: { not: null } }, _sum: { amount: true } });
    const requested = inPayout._sum.amount ?? 0;
    return {
      pending: sum(PartnerEarningStatus.PENDING),
      available: Math.max(0, sum(PartnerEarningStatus.PAYABLE) - requested),
      requested,
      paid: sum(PartnerEarningStatus.PAID),
      reversed: sum(PartnerEarningStatus.REVERSED),
      minPayout: MIN_PAYOUT,
    };
  }

  async earnings(p: Partner, q: { status?: string; month?: string; page?: string; limit?: string }) {
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 25));
    const page = Math.max(1, Number(q.page) || 1);
    const month = /^\d{4}-\d{2}$/.test(q.month ?? '') ? q.month! : null;
    const where: Prisma.PartnerEarningWhereInput = {
      partnerId: p.id,
      ...(q.status && (Object.values(PartnerEarningStatus) as string[]).includes(q.status) ? { status: q.status as PartnerEarningStatus } : {}),
      ...(month ? { createdAt: { gte: pkMonthStart(month), lt: pkMonthStart(nextMonth(month)) } } : {}),
    };
    const [items, total, balances] = await Promise.all([
      this.prisma.partnerEarning.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        select: { id: true, kind: true, status: true, amount: true, description: true, availableAt: true, reversedReason: true, payoutId: true, createdAt: true },
      }),
      this.prisma.partnerEarning.count({ where }),
      this.balances(p.id),
    ]);
    return { items, balances, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async payouts(p: Partner) {
    return this.prisma.partnerPayout.findMany({
      where: { partnerId: p.id }, orderBy: { requestedAt: 'desc' }, take: 100,
      select: { id: true, amount: true, status: true, method: true, account: true, accountTitle: true, reference: true, rejectReason: true, requestedAt: true, decidedAt: true, paidAt: true },
    });
  }

  /** Asks for the whole available balance. One open request at a time. */
  async requestPayout(p: Partner) {
    if (!p.payoutMethod || !p.payoutAccount) throw new BadRequestException('Pehle Profile me payout account (JazzCash, Easypaisa ya bank) likhein');
    const open = await this.prisma.partnerPayout.count({ where: { partnerId: p.id, status: { in: [PartnerPayoutStatus.REQUESTED, PartnerPayoutStatus.APPROVED] } } });
    if (open) throw new ConflictException('Aap ki pichli payout request abhi chal rahi hai');
    return this.prisma.$transaction(async (tx) => {
      const free = await tx.partnerEarning.findMany({ where: { partnerId: p.id, status: PartnerEarningStatus.PAYABLE, payoutId: null }, select: { id: true, amount: true } });
      const amount = Math.round(free.reduce((n, e) => n + e.amount, 0) * 100) / 100;
      if (amount < MIN_PAYOUT) throw new BadRequestException(`Kam az kam PKR ${MIN_PAYOUT} hone par payout mangwa sakte hain`);
      const payout = await tx.partnerPayout.create({
        data: { partnerId: p.id, amount, method: p.payoutMethod, account: p.payoutAccount, accountTitle: p.payoutTitle ?? p.fullName },
      });
      await tx.partnerEarning.updateMany({ where: { id: { in: free.map((e) => e.id) } }, data: { payoutId: payout.id } });
      return payout;
    });
  }

  /** Monthly statement: every earning made and every payout paid in the month. */
  async statement(p: Partner, month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('Mahina durust nahi');
    const from = pkMonthStart(month);
    const to = pkMonthStart(nextMonth(month));
    const [earnings, payouts] = await Promise.all([
      this.prisma.partnerEarning.findMany({ where: { partnerId: p.id, createdAt: { gte: from, lt: to } }, orderBy: { createdAt: 'asc' }, select: { kind: true, status: true, amount: true, description: true, createdAt: true } }),
      this.prisma.partnerPayout.findMany({ where: { partnerId: p.id, status: PartnerPayoutStatus.PAID, paidAt: { gte: from, lt: to } }, orderBy: { paidAt: 'asc' }, select: { amount: true, reference: true, method: true, paidAt: true } }),
    ]);
    const earned = earnings.filter((e) => e.status !== PartnerEarningStatus.REVERSED).reduce((n, e) => n + e.amount, 0);
    return {
      month,
      partner: { name: p.fullName, code: p.code, phone: p.phone, cnic: p.cnic, city: p.city },
      earnings, payouts,
      totals: { earned, paid: payouts.reduce((n, x) => n + x.amount, 0) },
    };
  }

  /* ─────────────────────────── profile, kit, team ─────────────────────────── */

  async updateProfile(p: Partner, input: { city?: string; email?: string; payoutMethod?: string; payoutAccount?: string; payoutTitle?: string; bankName?: string }) {
    const data: Prisma.PartnerUpdateInput = {};
    if (input.city !== undefined) data.city = str(input.city, 80) || null;
    if (input.email !== undefined) {
      const email = str(input.email, 160).toLowerCase();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Email durust nahi');
      data.email = email || null;
    }
    if (input.payoutMethod !== undefined) {
      const m = str(input.payoutMethod, 20).toUpperCase();
      if (m && !['JAZZCASH', 'EASYPAISA', 'BANK'].includes(m)) throw new BadRequestException('Payout ka tareeqa durust nahi');
      data.payoutMethod = m || null;
    }
    if (input.payoutAccount !== undefined) data.payoutAccount = str(input.payoutAccount, 60) || null;
    if (input.payoutTitle !== undefined) data.payoutTitle = str(input.payoutTitle, 120) || null;
    if (input.bankName !== undefined) data.bankName = str(input.bankName, 80) || null;
    await this.prisma.partner.update({ where: { id: p.id }, data });
    return { success: true };
  }

  async kit() {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: 'partner.kit' }, select: { value: true } });
    try { return row ? JSON.parse(row.value) : { items: [], demo: null }; } catch { return { items: [], demo: null }; }
  }

  async team(p: Partner) {
    if (!p.isManager) return { members: [] };
    const month = pkMonth();
    const from = pkMonthStart(month);
    const to = pkMonthStart(nextMonth(month));
    const members = await this.prisma.partner.findMany({
      where: { managerId: p.id },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, phone: true, city: true, type: true, status: true, user: { select: { lastSeenAt: true } } },
    });
    const ids = members.map((m) => m.id);
    const [visits, signups, paid] = ids.length ? await Promise.all([
      this.prisma.partnerVisit.groupBy({ by: ['partnerId'], where: { partnerId: { in: ids }, visitedAt: { gte: from, lt: to } }, _count: { _all: true } }),
      this.prisma.partnerLead.groupBy({ by: ['partnerId'], where: { partnerId: { in: ids }, signedUpAt: { gte: from, lt: to } }, _count: { _all: true } }),
      this.prisma.partnerLead.groupBy({ by: ['partnerId'], where: { partnerId: { in: ids }, paidAt: { gte: from, lt: to } }, _count: { _all: true } }),
    ]) : [[], [], []];
    const c = (rows: Array<{ partnerId: string; _count: { _all: number } }>, id: string) => rows.find((r) => r.partnerId === id)?._count._all ?? 0;
    return {
      month,
      members: members.map(({ user, ...m }) => ({ ...m, lastSeenAt: user.lastSeenAt, visits: c(visits, m.id), signups: c(signups, m.id), paid: c(paid, m.id) })),
    };
  }

  /* ─────────────────────────── helpers ─────────────────────────── */

  /** A phone that is already a Nafaa shop, or locked by another partner, cannot be added. */
  private async assertPhoneFree(partnerId: string, phone: string) {
    const variants = phoneVariants(phone);
    const shop = await this.prisma.tenant.findFirst({
      where: { OR: [{ phone: { in: variants } }, { users: { some: { phone: { in: variants }, role: { in: ['OWNER', 'MANAGER'] } } } }] },
      select: { id: true },
    });
    if (shop) throw new ConflictException('Ye dukaan pehle se Nafaa use karti hai');
    const other = await this.prisma.partnerLead.findFirst({
      where: { phone: { in: variants }, partnerId: { not: partnerId }, OR: [{ lockedUntil: { gt: new Date() } }, { tenantId: { not: null } }] },
      select: { lockedUntil: true },
    });
    if (other) throw new ConflictException(`Ye dukaan kisi aur partner ki lead hai (${other.lockedUntil.toISOString().slice(0, 10)} tak)`);
  }

  private leadFields(input: LeadInput, creating: boolean): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const shopName = str(input.shopName, 120);
    if (creating || input.shopName !== undefined) {
      if (shopName.length < 2) throw new BadRequestException('Dukaan ka naam likhein');
      out.shopName = shopName;
    }
    if (creating) {
      const phone = normalizePhone(str(input.phone, 30));
      if (!/^03\d{9}$/.test(phone)) throw new BadRequestException('Mobile number 03xxxxxxxxx shakal me likhein');
      out.phone = phone;
    }
    for (const k of ['ownerName', 'category', 'city', 'address', 'notes'] as const) {
      if (input[k] !== undefined) out[k] = str(input[k], k === 'notes' ? 1000 : 160) || null;
    }
    if (input.interest !== undefined) {
      const i = str(input.interest, 10).toUpperCase();
      out.interest = INTEREST.includes(i) ? i : null;
    }
    if (input.followUpAt !== undefined) out.followUpAt = date(input.followUpAt);
    return out;
  }

  private async tenantPlans(ids: Array<string | null>) {
    const list = ids.filter((x): x is string => !!x);
    if (!list.length) return new Map<string, string | null>();
    const subs = await this.prisma.subscription.findMany({
      where: { tenantId: { in: list } }, orderBy: { createdAt: 'desc' }, select: { tenantId: true, plan: { select: { name: true } } },
    });
    const map = new Map<string, string | null>();
    for (const s of subs) if (!map.has(s.tenantId)) map.set(s.tenantId, s.plan?.name ?? null);
    return map;
  }

  private leadView<T extends { tenantId: string | null; lockedUntil: Date }>(l: T, plans: Map<string, string | null>) {
    const { tenantId, ...rest } = l;
    return { ...rest, signedUp: !!tenantId, planName: tenantId ? plans.get(tenantId) ?? null : null, locked: l.lockedUntil > new Date() };
  }
}
