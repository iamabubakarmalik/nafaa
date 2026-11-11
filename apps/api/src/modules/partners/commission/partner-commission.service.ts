/**
 * Partner commission job. Every step is idempotent: each earning has a
 * unique `sourceRef`, so running the job twice never pays twice.
 *
 * Steps, in order:
 * 1. Link new shops to locked leads by phone (late attribution).
 * 2. Activation: a partner's shop that made `activationSales` sales within
 *    `activationDays` of joining is "activated" (activation bonus).
 * 3. Payments: the shop's first approved payment is the paid signup (signup
 *    bonus); each approved payment within `recurringMonths` of the first
 *    earns `recurringPercent`.
 * 4. Manager override on agents' earnings.
 * 5. Monthly target slabs for the month that just ended.
 * 6. Settle: earnings past their hold period become payable, or reversed if
 *    the payment was refunded or the shop was suspended.
 *
 * Amounts come from the partner's plan (or the default plan). Partners who
 * are not active, or whose incentives are off, earn nothing.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Partner, PartnerEarningKind, PartnerEarningStatus, PartnerLeadStage, PartnerPlan, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { Cron } from '../../../core/system-control/cron.decorator';
import { PartnerAttributionService } from '../attribution/partner-attribution.service';
import { addDays, defaultPlan, nextMonth, pkMonth, pkMonthStart, planSlabs } from '../shared/partner-utils';

const PKR = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

type PartnerWithPlan = Partner & { plan: PartnerPlan | null };

@Injectable()
export class PartnerCommissionService {
  private readonly logger = new Logger(PartnerCommissionService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly attribution: PartnerAttributionService,
  ) {}

  @Cron('0 5,35 * * * *')
  async run(): Promise<Record<string, number>> {
    if (this.running) return {};
    this.running = true;
    try {
      const fallback = await defaultPlan(this.prisma);
      const out = {
        linked: await this.attribution.attributeByLeadPhones(),
        activations: await this.activations(fallback),
        payments: await this.payments(fallback),
        overrides: await this.overrides(fallback),
        slabs: await this.slabs(fallback),
        settled: await this.settle(),
      };
      if (Object.values(out).some((n) => n > 0)) this.logger.log(`Partner commissions: ${JSON.stringify(out)}`);
      return out;
    } finally {
      this.running = false;
    }
  }

  private earns(p: Partner | null | undefined): p is Partner {
    return !!p && p.status === 'ACTIVE' && p.incentivesOn;
  }

  /** Creates an earning unless one with the same sourceRef exists. Returns true when created. */
  private async credit(data: { partnerId: string; tenantId?: string | null; kind: PartnerEarningKind; amount: number; description: string; sourceRef: string; holdDays: number }): Promise<boolean> {
    if (!(data.amount > 0)) return false;
    try {
      await this.prisma.partnerEarning.create({
        data: {
          partnerId: data.partnerId,
          tenantId: data.tenantId ?? null,
          kind: data.kind,
          amount: round2(data.amount),
          description: data.description,
          sourceRef: data.sourceRef,
          availableAt: addDays(new Date(), Math.max(0, data.holdDays)),
        },
      });
      return true;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return false;
      throw e;
    }
  }

  private async activations(fallback: PartnerPlan): Promise<number> {
    const leads = await this.prisma.partnerLead.findMany({
      where: { stage: PartnerLeadStage.SIGNED_UP, tenantId: { not: null } },
      select: { id: true, tenantId: true, shopName: true, signedUpAt: true, createdAt: true, partner: { include: { plan: true } } },
      take: 2000,
    });
    let n = 0;
    for (const lead of leads) {
      const plan = lead.partner.plan ?? fallback;
      const start = lead.signedUpAt ?? lead.createdAt;
      const end = addDays(start, plan.activationDays);
      const sales = await this.prisma.sale.count({
        where: { tenantId: lead.tenantId!, status: { not: 'VOIDED' }, createdAt: { gte: start, lte: end } },
      });
      if (sales < plan.activationSales) continue;
      await this.prisma.partnerLead.update({ where: { id: lead.id }, data: { stage: PartnerLeadStage.ACTIVATED, activatedAt: new Date() } });
      if (this.earns(lead.partner)) {
        await this.credit({
          partnerId: lead.partner.id, tenantId: lead.tenantId, kind: PartnerEarningKind.ACTIVATION_BONUS, amount: plan.activationBonus,
          description: `${lead.shopName} started using Nafaa (${sales} sales)`, sourceRef: `activation:${lead.tenantId}`, holdDays: plan.clawbackDays,
        });
      }
      n++;
    }
    return n;
  }

  private async payments(fallback: PartnerPlan): Promise<number> {
    const tenants = await this.prisma.tenant.findMany({
      where: { partnerId: { not: null }, payments: { some: { status: 'APPROVED' } } },
      select: { id: true, name: true, partnerAttributedAt: true, partner: { include: { plan: true } } },
      take: 5000,
    });
    let n = 0;
    for (const t of tenants) {
      const partner = t.partner as PartnerWithPlan | null;
      if (!partner) continue;
      const plan = partner.plan ?? fallback;
      // Payments from before the partner brought the shop do not count.
      const from = t.partnerAttributedAt ? addDays(t.partnerAttributedAt, -1) : undefined;
      const pays = await this.prisma.payment.findMany({
        where: { tenantId: t.id, status: 'APPROVED', ...(from ? { OR: [{ approvedAt: { gte: from } }, { approvedAt: null, createdAt: { gte: from } }] } : {}) },
        orderBy: [{ approvedAt: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, amount: true, approvedAt: true, createdAt: true },
      });
      if (!pays.length) continue;
      const first = pays[0];
      const firstAt = first.approvedAt ?? first.createdAt;

      const lead = await this.prisma.partnerLead.findFirst({ where: { tenantId: t.id, partnerId: partner.id }, select: { id: true, stage: true } });
      if (lead && lead.stage !== PartnerLeadStage.PAID) {
        await this.prisma.partnerLead.update({ where: { id: lead.id }, data: { stage: PartnerLeadStage.PAID, paidAt: firstAt } });
      }
      if (!this.earns(partner)) continue;

      if (await this.credit({
        partnerId: partner.id, tenantId: t.id, kind: PartnerEarningKind.SIGNUP_BONUS, amount: plan.signupBonus,
        description: `${t.name} paid for Nafaa`, sourceRef: `signup:${t.id}`, holdDays: plan.clawbackDays,
      })) n++;

      if (plan.recurringPercent > 0 && plan.recurringMonths > 0) {
        const until = new Date(firstAt);
        until.setMonth(until.getMonth() + plan.recurringMonths);
        for (const p of pays) {
          const at = p.approvedAt ?? p.createdAt;
          if (at >= until) break;
          if (await this.credit({
            partnerId: partner.id, tenantId: t.id, kind: PartnerEarningKind.RECURRING, amount: (p.amount * plan.recurringPercent) / 100,
            description: `${plan.recurringPercent}% of ${t.name}'s payment of ${PKR(p.amount)}`, sourceRef: `recurring:${p.id}`, holdDays: plan.clawbackDays,
          })) n++;
        }
      }
    }
    return n;
  }

  private async overrides(fallback: PartnerPlan): Promise<number> {
    const since = addDays(new Date(), -120);
    const base = await this.prisma.partnerEarning.findMany({
      where: {
        createdAt: { gte: since },
        status: { not: PartnerEarningStatus.REVERSED },
        kind: { in: [PartnerEarningKind.SIGNUP_BONUS, PartnerEarningKind.ACTIVATION_BONUS, PartnerEarningKind.RECURRING, PartnerEarningKind.SLAB_BONUS] },
        partner: { managerId: { not: null } },
      },
      select: { id: true, amount: true, tenantId: true, partner: { select: { fullName: true, plan: true, manager: true } } },
      take: 10000,
    });
    let n = 0;
    for (const e of base) {
      const plan = e.partner.plan ?? fallback;
      const manager = e.partner.manager;
      if (!this.earns(manager) || !(plan.managerOverridePercent > 0)) continue;
      if (await this.credit({
        partnerId: manager.id, tenantId: e.tenantId, kind: PartnerEarningKind.OVERRIDE, amount: (e.amount * plan.managerOverridePercent) / 100,
        description: `${plan.managerOverridePercent}% of ${e.partner.fullName}'s earning`, sourceRef: `override:${e.id}`, holdDays: plan.clawbackDays,
      })) n++;
    }
    return n;
  }

  /** Bonus for the highest slab reached last month (paid signups), once per partner per month. */
  private async slabs(fallback: PartnerPlan): Promise<number> {
    const month = pkMonth(addDays(pkMonthStart(pkMonth()), -1));
    const from = pkMonthStart(month);
    const to = pkMonthStart(nextMonth(month));
    const partners = await this.prisma.partner.findMany({ where: { status: 'ACTIVE', incentivesOn: true }, include: { plan: true } });
    let n = 0;
    for (const p of partners) {
      const slabs = planSlabs(p.plan ?? fallback);
      if (!slabs.length) continue;
      const paid = await this.prisma.partnerLead.count({ where: { partnerId: p.id, paidAt: { gte: from, lt: to } } });
      const reached = slabs.filter((s) => paid >= s.signups).pop();
      if (!reached) continue;
      if (await this.credit({
        partnerId: p.id, kind: PartnerEarningKind.SLAB_BONUS, amount: reached.bonus,
        description: `Target bonus for ${month}: ${paid} paid signups (target ${reached.signups})`, sourceRef: `slab:${p.id}:${month}`, holdDays: (p.plan ?? fallback).clawbackDays,
      })) n++;
    }
    return n;
  }

  private async settle(): Promise<number> {
    const due = await this.prisma.partnerEarning.findMany({
      where: { status: PartnerEarningStatus.PENDING, availableAt: { lte: new Date() } },
      select: { id: true, kind: true, tenantId: true, sourceRef: true },
      take: 2000,
    });
    let n = 0;
    for (const e of due) {
      const reason = await this.reversalReason(e);
      if (reason === 'wait') continue;
      await this.prisma.partnerEarning.update({
        where: { id: e.id },
        data: reason ? { status: PartnerEarningStatus.REVERSED, reversedReason: reason } : { status: PartnerEarningStatus.PAYABLE },
      });
      n++;
    }
    return n;
  }

  /** Why a due earning should not be paid; null when it is fine; "wait" when its base is still on hold. */
  private async reversalReason(e: { kind: PartnerEarningKind; tenantId: string | null; sourceRef: string | null }): Promise<string | null | 'wait'> {
    const ref = e.sourceRef ?? '';
    if (ref.startsWith('override:')) {
      const base = await this.prisma.partnerEarning.findUnique({ where: { id: ref.slice('override:'.length) }, select: { status: true } });
      if (!base || base.status === PartnerEarningStatus.REVERSED) return 'The agent’s earning was reversed';
      return base.status === PartnerEarningStatus.PENDING ? 'wait' : null;
    }
    if (ref.startsWith('recurring:')) {
      const pay = await this.prisma.payment.findUnique({ where: { id: ref.slice('recurring:'.length) }, select: { status: true } });
      if (!pay || pay.status !== 'APPROVED') return 'The shop’s payment was refunded or cancelled';
    }
    if (e.tenantId && (e.kind === PartnerEarningKind.SIGNUP_BONUS || e.kind === PartnerEarningKind.RECURRING || e.kind === PartnerEarningKind.ACTIVATION_BONUS)) {
      const t = await this.prisma.tenant.findUnique({ where: { id: e.tenantId }, select: { status: true } });
      if (!t) return 'The shop was deleted';
      if (t.status === 'SUSPENDED') return 'The shop was suspended';
      if (e.kind === PartnerEarningKind.SIGNUP_BONUS) {
        const ok = await this.prisma.payment.count({ where: { tenantId: e.tenantId, status: 'APPROVED' } });
        if (!ok) return 'The shop’s payment was refunded';
      }
    }
    return null;
  }
}
