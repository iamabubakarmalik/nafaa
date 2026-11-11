/**
 * Pricing v2 lifecycle job (every hour). Plan status changes (trial end,
 * past due, expired) stay in SubscriptionCronService; this job handles:
 * 1. add-on pay windows: reminder a day before, switch off when unpaid;
 * 2. paid add-ons whose period ended: cancelled if asked, else off until paid;
 * 3. trial and grandfather add-ons that ran out: off until paid;
 * 4. renewal bills a few days before the period ends (plan + add-ons);
 * 5. reminders before the end, every day of the grace period;
 * 6. notice before the grandfather period ends;
 * 7. warnings when a Free or Basic shop nears its limits.
 * Every message goes through BillingNotifier, which never repeats itself.
 */

import { Injectable, Logger } from '@nestjs/common';
import { TenantAddOnStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { Cron } from '../../../core/system-control/cron.decorator';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CHANNEL_ADDON, EntitlementsService, invalidateEntitlements } from '../entitlements/entitlements.service';
import { loadBillingSettings } from '../entitlements/billing-settings';
import { UNLIMITED } from '../entitlements/feature-catalog';
import { BillingNotifier } from './billing-notifier';

const DAY = 86_400_000;
const HOUR = 3_600_000;

@Injectable()
export class BillingLifecycleService {
  private readonly logger = new Logger(BillingLifecycleService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
    private readonly entitlements: EntitlementsService,
    private readonly notifier: BillingNotifier,
  ) {}

  @Cron('0 20 * * * *')
  async run(): Promise<Record<string, number>> {
    if (this.running) return {};
    this.running = true;
    try {
      const out = {
        addOnDue: await this.addOnPayWindows(),
        addOnEnded: await this.addOnPeriods(),
        renewals: await this.renewals(),
        reminders: await this.reminders(),
        grandfather: await this.grandfatherNotices(),
        limits: await this.limitWarnings(),
        channels: await this.channels(),
      };
      if (Object.values(out).some((n) => n > 0)) this.logger.log(`Billing lifecycle: ${JSON.stringify(out)}`);
      return out;
    } finally {
      this.running = false;
    }
  }

  /** 1. Add-ons turned on with "Add now": remind, then switch off when unpaid. */
  private async addOnPayWindows(): Promise<number> {
    const now = new Date();
    const rows = await this.prisma.tenantAddOn.findMany({
      where: { paymentDueAt: { not: null, lt: new Date(now.getTime() + DAY) }, status: { in: [TenantAddOnStatus.PENDING_PAYMENT, TenantAddOnStatus.ACTIVE] } },
      include: { addOn: { select: { id: true, name: true } } },
    });
    let n = 0;
    for (const r of rows) {
      if (r.paymentDueAt! > now) {
        if (await this.notifier.addOnPaymentDue(r.tenantId, r.addOn.name, r.paymentDueAt!, r.id)) n++;
        continue;
      }
      // A payment under review keeps it on until the admin decides.
      const inReview = await this.prisma.payment.count({ where: { tenantId: r.tenantId, status: 'PENDING', invoice: { items: { some: { refId: r.addOn.id } } } } });
      if (inReview) continue;
      await this.prisma.tenantAddOn.update({ where: { id: r.id }, data: { status: TenantAddOnStatus.PAST_DUE } });
      invalidateEntitlements(r.tenantId);
      await this.notifier.addOnSuspended(r.tenantId, r.addOn.name, r.id);
      n++;
    }
    return n;
  }

  /** 2 + 3. Paid, trial and grandfather add-ons whose time ran out. */
  private async addOnPeriods(): Promise<number> {
    const settings = await loadBillingSettings(this.prisma);
    const now = new Date();
    const paidEnd = new Date(now.getTime() - settings.graceDays * DAY);
    const rows = await this.prisma.tenantAddOn.findMany({
      where: {
        status: TenantAddOnStatus.ACTIVE,
        paymentDueAt: null,
        // One-time services are tracked on the admin "Setup requests" list instead.
        addOn: { kind: { not: 'ONE_TIME' } },
        OR: [
          { currentPeriodEnd: { lt: paidEnd } },
          { currentPeriodEnd: null, freeUntil: { lt: now } },
        ],
      },
      include: { addOn: { select: { name: true } } },
    });
    let n = 0;
    for (const r of rows) {
      // Still inside a free period (gift running past the paid period).
      if (r.freeUntil && r.freeUntil > now) continue;
      const cancel = r.cancelAtPeriodEnd;
      await this.prisma.tenantAddOn.update({
        where: { id: r.id },
        data: cancel ? { status: TenantAddOnStatus.CANCELLED, cancelledAt: now } : { status: TenantAddOnStatus.PAST_DUE },
      });
      invalidateEntitlements(r.tenantId);
      if (!cancel) await this.notifier.addOnSuspended(r.tenantId, r.addOn.name, `${r.id}:${(r.currentPeriodEnd ?? r.freeUntil)?.toISOString().slice(0, 10)}`);
      n++;
    }
    return n;
  }

  /** 4. Renewal bill for plan + running add-ons, a few days before the end. */
  private async renewals(): Promise<number> {
    const settings = await loadBillingSettings(this.prisma);
    const now = new Date();
    const subs = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', plan: { isFree: false }, currentPeriodEnd: { gt: now, lt: new Date(now.getTime() + settings.renewalLeadDays * DAY) } },
      select: { id: true, tenantId: true, planId: true, interval: true, currentPeriodEnd: true, plan: { select: { name: true, isActive: true } } },
    });
    let n = 0;
    for (const s of subs) {
      if (!s.plan.isActive) continue;
      const open = await this.prisma.subscription.count({ where: { tenantId: s.tenantId, status: 'PENDING_PAYMENT', createdAt: { gt: new Date(now.getTime() - 40 * DAY) } } });
      if (open) continue;
      const addOns = await this.prisma.tenantAddOn.findMany({
        where: { tenantId: s.tenantId, status: TenantAddOnStatus.ACTIVE, cancelAtPeriodEnd: false, source: { not: 'ADMIN' }, addOn: { kind: { not: 'ONE_TIME' } } },
        select: { quantity: true, freeUntil: true, addOn: { select: { key: true } } },
      });
      const keep = addOns.filter((a) => !a.freeUntil || a.freeUntil < s.currentPeriodEnd).map((a) => ({ key: a.addOn.key, quantity: a.quantity }));
      try {
        const res = await this.subscriptions.startSubscription({ tenantId: s.tenantId }, s.planId, s.interval, keep);
        if (!res.reused) {
          await this.notifier.renewalBill(s.tenantId, s.plan.name, res.invoice.total, s.currentPeriodEnd, res.invoice.invoiceNumber);
          n++;
        }
      } catch (e) {
        this.logger.warn(`Renewal bill for ${s.tenantId} skipped: ${e instanceof Error ? e.message : e}`);
      }
    }
    return n;
  }

  /** 5. Before the end (reminder days) and every day of the grace period. */
  private async reminders(): Promise<number> {
    const settings = await loadBillingSettings(this.prisma);
    const now = new Date();
    const maxDays = Math.max(0, ...settings.reminderDays);
    const subs = await this.prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'PAST_DUE'] },
        plan: { isFree: false },
        currentPeriodEnd: { gt: new Date(now.getTime() - settings.graceDays * DAY - DAY), lt: new Date(now.getTime() + maxDays * DAY + DAY) },
      },
      select: { tenantId: true, currentPeriodEnd: true, plan: { select: { name: true } } },
    });
    let n = 0;
    for (const s of subs) {
      // A newer paid period already covers this shop.
      const covered = await this.prisma.subscription.count({ where: { tenantId: s.tenantId, status: 'ACTIVE', currentPeriodEnd: { gt: s.currentPeriodEnd } } });
      if (covered) continue;
      const ms = s.currentPeriodEnd.getTime() - now.getTime();
      if (ms > 0) {
        const daysLeft = Math.ceil(ms / DAY);
        if (settings.reminderDays.includes(daysLeft) && (await this.notifier.planEndingSoon(s.tenantId, s.plan.name, daysLeft, s.currentPeriodEnd))) n++;
      } else {
        const blocksAt = new Date(s.currentPeriodEnd.getTime() + settings.graceDays * DAY);
        if (blocksAt > now) {
          const left = Math.floor((blocksAt.getTime() - now.getTime()) / DAY);
          // The first day is covered by the "plan ended" email from the daily check.
          if (left < settings.graceDays && (await this.notifier.graceDay(s.tenantId, left, blocksAt))) n++;
        }
      }
    }
    return n;
  }

  /** 6. Tell grandfathered shops what they use before their free period ends. */
  private async grandfatherNotices(): Promise<number> {
    const settings = await loadBillingSettings(this.prisma);
    const now = new Date();
    let n = 0;
    for (const d of settings.grandfatherNoticeDays) {
      const from = new Date(now.getTime() + (d - 1) * DAY);
      const to = new Date(now.getTime() + d * DAY);
      const tenants = await this.prisma.tenant.findMany({ where: { billingGrandfatherUntil: { gt: from, lte: to } }, select: { id: true, billingGrandfatherUntil: true } });
      for (const t of tenants) {
        const ent = await this.entitlements.get(t.id, true);
        const paidKeys = new Set(ent.addOns.filter((a) => a.status === 'ACTIVE' && !a.free).map((a) => a.key));
        const apps = ent.apps.filter((k) => !paidKeys.has(k));
        const names = apps.length ? (await this.prisma.addOn.findMany({ where: { key: { in: apps } }, select: { name: true } })).map((a) => a.name) : [];
        if (await this.notifier.grandfatherEnding(t.id, d, t.billingGrandfatherUntil!, names)) n++;
      }
    }
    return n;
  }

  /** 8. Pause channels nobody pays for; resume paid ones. */
  private async channels(): Promise<number> {
    const tenants = await this.prisma.integration.findMany({
      where: { isActive: true, type: { in: Object.keys(CHANNEL_ADDON) as never }, status: { in: ['CONNECTED', 'SUSPENDED'] } },
      select: { tenantId: true },
      distinct: ['tenantId'],
    });
    let n = 0;
    for (const t of tenants) {
      const r = await this.entitlements.syncChannels(t.tenantId);
      n += r.paused + r.resumed;
    }
    return n;
  }

  /** 7. Free and Basic shops near their limits (checked once a day). */
  private async limitWarnings(): Promise<number> {
    const now = new Date();
    if (new Date(now.getTime() + 5 * HOUR).getUTCHours() !== 10) return 0; // 10 AM Pakistan
    const subs = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', currentPeriodEnd: { gt: now }, plan: { OR: [{ isFree: true }, { slug: 'basic' }] } },
      select: { tenantId: true },
      distinct: ['tenantId'],
    });
    const month = new Date(now.getTime() + 5 * HOUR).toISOString().slice(0, 7);
    const monthStart = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1) - 5 * HOUR);
    let n = 0;
    for (const s of subs) {
      const ent = await this.entitlements.get(s.tenantId);
      if (ent.grandfatheredUntil) continue;
      const use = await this.entitlements.usage(s.tenantId, monthStart);
      const checks: Array<[string, number, number]> = [
        ['bill', use.salesPerMonth, ent.limits.salesPerMonth],
        ['products', use.products, ent.limits.products],
        ['users', use.users, ent.limits.users],
      ];
      for (const [label, cur, lim] of checks) {
        if (lim >= UNLIMITED || lim <= 0 || cur < lim * 0.8) continue;
        if (await this.notifier.limitNear(s.tenantId, label, cur, lim, month)) n++;
      }
    }
    return n;
  }
}
