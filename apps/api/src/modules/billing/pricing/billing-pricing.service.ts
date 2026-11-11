/**
 * Merchant side of pricing v2: the catalog (plans + add-ons), "My plan",
 * turning add-ons on and off, and moving to the Free plan.
 *
 * Turning an add-on on:
 * - during the trial or the grandfather period it is free until that ends;
 * - on a paid plan it is on at once with a bill for the rest of the period,
 *   to be paid within `addOnPayDays`, else the lifecycle job switches it off.
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AddOnKind, TenantAddOnStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey, startOfBusinessMonthTz } from '../../../common/helpers/business-time.helper';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { FEATURES, UNLIMITED } from '../entitlements/feature-catalog';
import { loadBillingSettings } from '../entitlements/billing-settings';
import { nextInvoiceNumber } from './invoice-number';
import { addOnAllowedOn, proratedLine, writeInvoiceItems } from './pricing-core';
import { BillingNotifier } from './billing-notifier';

const DAY = 86_400_000;

@Injectable()
export class BillingPricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly tz: TenantTimezoneService,
    private readonly notifier: BillingNotifier,
  ) {}

  /** Public price list: plans, add-ons and what each feature means. */
  async catalog() {
    const [plans, addOns, settings] = await Promise.all([
      this.prisma.plan.findMany({ where: { isActive: true, isPublic: true, slug: { not: 'free-trial' } }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.addOn.findMany({ where: { isActive: true, isPublic: true }, orderBy: { sortOrder: 'asc' } }),
      loadBillingSettings(this.prisma),
    ]);
    return {
      plans: plans.map((p) => ({
        id: p.id, slug: p.slug, name: p.name, description: p.description, isFree: p.isFree,
        priceMonthly: p.priceMonthly, priceQuarterly: p.priceQuarterly, priceYearly: p.priceYearly,
        limits: { users: p.maxUsers, shops: p.maxShops, products: p.maxProducts, salesPerMonth: p.maxSalesPerMonth },
        features: p.features,
      })),
      addOns: addOns.map((a) => ({
        key: a.key, name: a.name, description: a.description, category: a.category, kind: a.kind, priceMonthly: a.priceMonthly,
        unitLabel: a.unitLabel, grantsFeatures: a.grantsFeatures, bundleKeys: a.bundleKeys, availableOnPlans: a.availableOnPlans, comingSoon: a.comingSoon,
      })),
      features: FEATURES,
      trialDays: settings.trialDays,
      unlimited: UNLIMITED,
    };
  }

  /** Everything the "My plan" page and the app menus need. */
  async overview(tenantId: string) {
    const clock = await this.tz.clock(tenantId);
    const [year, month] = businessDayKey(new Date(), clock.tz, clock.dayStartHour).split('-').map(Number);
    const monthStart = startOfBusinessMonthTz(year, month, clock.tz, clock.dayStartHour);
    const [ent, usage, openInvoices] = await Promise.all([
      this.entitlements.get(tenantId, true),
      this.entitlements.usage(tenantId, monthStart),
      this.prisma.invoice.findMany({
        where: { tenantId, status: { in: ['PENDING', 'OVERDUE'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, invoiceNumber: true, total: true, amountDue: true, dueDate: true, status: true, description: true, subscriptionId: true, items: true, payments: { where: { status: 'PENDING' }, select: { id: true } } },
      }),
    ]);
    return {
      ...ent,
      usage,
      openInvoices: openInvoices.map(({ payments, ...i }) => ({ ...i, inReview: payments.length > 0 })),
    };
  }

  async turnOn(tenantId: string, userId: string, key: string, quantity = 1) {
    const addOn = await this.prisma.addOn.findUnique({ where: { key } });
    if (!addOn || !addOn.isActive) throw new NotFoundException('Ye add-on nahi mila');
    if (addOn.comingSoon) throw new BadRequestException(`${addOn.name} jald aa raha hai`);
    const qty = addOn.kind === AddOnKind.PER_UNIT ? Math.min(500, Math.max(1, Math.floor(quantity) || 1)) : 1;
    const ent = await this.entitlements.get(tenantId, true);
    if (ent.state === 'expired') throw new BadRequestException('Aap ka plan khatam ho chuka hai. Pehle plan renew karein.');

    const existing = await this.prisma.tenantAddOn.findUnique({ where: { tenantId_addOnId: { tenantId, addOnId: addOn.id } } });
    const now = new Date();

    // Trial or grandfather period: on now, free until that period ends.
    const freeUntil = ent.state === 'trial' ? ent.trialEndsAt : ent.grandfatheredUntil;
    if (freeUntil && freeUntil > now && addOn.kind !== AddOnKind.ONE_TIME) {
      await this.prisma.tenantAddOn.upsert({
        where: { tenantId_addOnId: { tenantId, addOnId: addOn.id } },
        create: { tenantId, addOnId: addOn.id, quantity: qty, status: TenantAddOnStatus.ACTIVE, source: ent.state === 'trial' ? 'TRIAL' : 'GRANDFATHER', freeUntil, createdById: userId },
        update: { quantity: qty, status: TenantAddOnStatus.ACTIVE, freeUntil, cancelAtPeriodEnd: false, cancelledAt: null },
      });
      this.entitlements.invalidate(tenantId);
      await this.entitlements.syncChannels(tenantId);
      return { mode: 'free' as const, freeUntil, overview: await this.overview(tenantId) };
    }

    const plan = ent.plan ? await this.prisma.plan.findUnique({ where: { id: ent.plan.id } }) : null;
    if (!plan || plan.isFree) throw new BadRequestException('Add-ons paid plan par milte hain. Pehle Basic, Pro ya Enterprise chunein.');
    if (!addOnAllowedOn(addOn, plan)) throw new BadRequestException(`${addOn.name} ${plan.name} plan par nahi milta. Plan badlein.`);
    if (!ent.periodEnd || ent.periodEnd <= now) throw new BadRequestException('Pehle plan renew karein, phir add-on jodein.');

    const sameQty = existing && existing.status === TenantAddOnStatus.ACTIVE && existing.quantity >= qty && !existing.cancelAtPeriodEnd;
    if (sameQty) throw new ConflictException(`${addOn.name} pehle se chalu hai`);
    if (existing?.status === TenantAddOnStatus.ACTIVE && existing.cancelAtPeriodEnd && existing.quantity >= qty) {
      await this.prisma.tenantAddOn.update({ where: { id: existing.id }, data: { cancelAtPeriodEnd: false } });
      this.entitlements.invalidate(tenantId);
      return { mode: 'resumed' as const, overview: await this.overview(tenantId) };
    }

    // Bill only the new units when more are added to a paid add-on.
    const paidQty = existing?.status === TenantAddOnStatus.ACTIVE ? existing.quantity : 0;
    const billQty = addOn.kind === AddOnKind.PER_UNIT ? qty - paidQty : 1;
    const settings = await loadBillingSettings(this.prisma);
    const line = proratedLine(addOn, billQty, ent.periodEnd, existing?.unitPrice);
    const dueAt = new Date(now.getTime() + settings.addOnPayDays * DAY);

    const invoice = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          tenantId, invoiceNumber: await nextInvoiceNumber(tx), status: 'PENDING',
          subtotal: line.amount, total: line.amount, amountDue: line.amount,
          description: `Add-on: ${addOn.name}`, dueDate: dueAt, periodStart: now, periodEnd: ent.periodEnd,
        },
      });
      // The bill states the full quantity so paying it sets the right count.
      await writeInvoiceItems(tx, inv.id, [{ ...line, quantity: qty, amount: line.amount }], now, ent.periodEnd ?? undefined);
      await tx.tenantAddOn.upsert({
        where: { tenantId_addOnId: { tenantId, addOnId: addOn.id } },
        create: { tenantId, addOnId: addOn.id, quantity: qty, status: TenantAddOnStatus.PENDING_PAYMENT, paymentDueAt: dueAt, source: 'USER', createdById: userId },
        update: { quantity: qty, status: paidQty ? TenantAddOnStatus.ACTIVE : TenantAddOnStatus.PENDING_PAYMENT, paymentDueAt: dueAt, cancelAtPeriodEnd: false, cancelledAt: null },
      });
      return inv;
    });
    this.entitlements.invalidate(tenantId);
    await this.entitlements.syncChannels(tenantId);
    await this.notifier.addOnTurnedOn(tenantId, addOn.name, line.amount, dueAt, invoice.invoiceNumber);
    return { mode: 'invoice' as const, invoice, overview: await this.overview(tenantId) };
  }

  async turnOff(tenantId: string, key: string) {
    const addOn = await this.prisma.addOn.findUnique({ where: { key } });
    if (!addOn) throw new NotFoundException('Ye add-on nahi mila');
    const row = await this.prisma.tenantAddOn.findUnique({ where: { tenantId_addOnId: { tenantId, addOnId: addOn.id } } });
    if (!row || row.status === TenantAddOnStatus.CANCELLED) throw new NotFoundException(`${addOn.name} chalu nahi hai`);
    const now = new Date();
    const paidAndRunning = row.status === TenantAddOnStatus.ACTIVE && row.currentPeriodEnd && row.currentPeriodEnd > now && !row.freeUntil;
    if (paidAndRunning) {
      await this.prisma.tenantAddOn.update({ where: { id: row.id }, data: { cancelAtPeriodEnd: true } });
    } else {
      await this.prisma.$transaction(async (tx) => {
        await tx.tenantAddOn.update({ where: { id: row.id }, data: { status: TenantAddOnStatus.CANCELLED, cancelledAt: now, paymentDueAt: null } });
        // An unpaid bill made only for this add-on is no longer owed.
        const bills = await tx.invoice.findMany({
          where: { tenantId, subscriptionId: null, status: { in: ['PENDING', 'OVERDUE'] }, items: { some: { refId: addOn.id } }, payments: { none: { status: 'PENDING' } } },
          select: { id: true, items: { select: { refId: true } } },
        });
        const only = bills.filter((b) => b.items.every((i) => i.refId === addOn.id)).map((b) => b.id);
        if (only.length) await tx.invoice.updateMany({ where: { id: { in: only } }, data: { status: 'CANCELLED' } });
      });
    }
    this.entitlements.invalidate(tenantId);
    return { endsAt: paidAndRunning ? row.currentPeriodEnd : now, overview: await this.overview(tenantId) };
  }

  /** Moves a shop to the Free plan when its use fits the Free limits. */
  async switchToFree(tenantId: string) {
    const free = await this.prisma.plan.findFirst({ where: { isFree: true, isActive: true } });
    if (!free) throw new BadRequestException('Free plan abhi band hai');
    const ent = await this.entitlements.get(tenantId, true);
    if (ent.plan?.isFree) throw new ConflictException('Aap pehle se Free plan par hain');
    if (ent.state === 'active' && ent.periodEnd && ent.periodEnd > new Date()) {
      throw new BadRequestException(`Aap ka ${ent.plan?.name} plan ${ent.periodEnd.toISOString().slice(0, 10)} tak chalu hai. Uske baad Free par aa sakte hain.`);
    }
    const clock = await this.tz.clock(tenantId);
    const [year, month] = businessDayKey(new Date(), clock.tz, clock.dayStartHour).split('-').map(Number);
    const usage = await this.entitlements.usage(tenantId, startOfBusinessMonthTz(year, month, clock.tz, clock.dayStartHour));
    const over: string[] = [];
    if (usage.users > free.maxUsers) over.push(`users ${usage.users}/${free.maxUsers} (baqi staff band karein)`);
    if (usage.shops > free.maxShops) over.push(`dukaanen ${usage.shops}/${free.maxShops}`);
    if (usage.products > free.maxProducts) over.push(`products ${usage.products}/${free.maxProducts}`);
    if (over.length) throw new BadRequestException(`Free plan ki had se zyada: ${over.join(', ')}`);

    const now = new Date();
    const forever = new Date(now.getTime() + 100 * 365 * DAY);
    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({ where: { tenantId, status: { in: ['TRIAL', 'PAST_DUE', 'EXPIRED', 'PENDING_PAYMENT'] } }, data: { status: 'CANCELLED', cancelledAt: now } });
      await tx.invoice.updateMany({ where: { tenantId, status: { in: ['PENDING', 'OVERDUE'] }, payments: { none: { status: 'PENDING' } } }, data: { status: 'CANCELLED' } });
      await tx.subscription.create({ data: { tenantId, planId: free.id, status: 'ACTIVE', interval: 'MONTHLY', amount: 0, currentPeriodStart: now, currentPeriodEnd: forever } });
      await tx.tenantAddOn.updateMany({ where: { tenantId, status: { not: TenantAddOnStatus.CANCELLED } }, data: { status: TenantAddOnStatus.CANCELLED, cancelledAt: now } });
      await tx.tenant.update({ where: { id: tenantId }, data: { status: 'ACTIVE' } });
    });
    this.entitlements.invalidate(tenantId);
    await this.notifier.movedToFree(tenantId);
    return this.overview(tenantId);
  }
}
