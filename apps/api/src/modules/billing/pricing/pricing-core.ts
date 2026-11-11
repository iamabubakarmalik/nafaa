/**
 * Pricing v2 money rules shared by checkout, add-on purchase, renewals and
 * payment approval. Plain functions over Prisma so SubscriptionsService and
 * the admin billing service can use them without module cycles.
 */

import { BadRequestException } from '@nestjs/common';
import { AddOn, AddOnKind, BillingInterval, Plan, Prisma, TenantAddOnStatus } from '@prisma/client';
import { invalidateEntitlements } from '../entitlements/entitlements.service';

/** Note prefix on a paid one-time service that is not delivered yet. */
export const SETUP_PENDING = 'Setup: pending';
/** Note prefix once an admin marks it delivered. */
export const SETUP_DONE = 'Setup: done';

export const INTERVAL_MONTHS: Record<BillingInterval, number> = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };
const DAY = 86_400_000;

export interface AddOnChoice { key: string; quantity?: number }

export interface InvoiceLine {
  kind: 'PLAN' | 'ADDON' | 'ONE_TIME';
  refId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

/** Rupees, rounded to the nearest 10 like the plan prices. */
const money = (n: number) => Math.max(0, Math.round(n / 10) * 10);

export function planPrice(plan: Plan, interval: BillingInterval): number {
  return interval === 'YEARLY' ? plan.priceYearly : interval === 'QUARTERLY' ? plan.priceQuarterly : plan.priceMonthly;
}

/**
 * The plan's discount for a longer interval, applied to add-ons too, so a
 * yearly plan gives the same saving on its add-ons.
 */
export function intervalFactor(plan: Plan, interval: BillingInterval): number {
  const months = INTERVAL_MONTHS[interval];
  const full = plan.priceMonthly * months;
  const price = planPrice(plan, interval);
  return full > 0 && price > 0 ? price / full : 1;
}

export function addOnAllowedOn(addOn: AddOn, plan: Plan): boolean {
  if (plan.isFree) return false;
  return !addOn.availableOnPlans.length || addOn.availableOnPlans.includes(plan.slug);
}

/** Checks the requested add-ons and drops ones a chosen bundle already includes. */
export async function resolveChoices(tx: Prisma.TransactionClient, plan: Plan, choices: AddOnChoice[] | undefined): Promise<Array<{ addOn: AddOn; quantity: number }>> {
  const wanted = new Map<string, number>();
  for (const c of choices ?? []) {
    if (!c || typeof c.key !== 'string') continue;
    const q = Math.floor(Number(c.quantity ?? 1));
    wanted.set(c.key, Math.min(500, Math.max(1, Number.isFinite(q) ? q : 1)));
  }
  if (!wanted.size) return [];
  const rows = await tx.addOn.findMany({ where: { key: { in: [...wanted.keys()] } } });
  const out: Array<{ addOn: AddOn; quantity: number }> = [];
  const inBundles = new Set(rows.flatMap((r) => r.bundleKeys));
  for (const addOn of rows) {
    if (!addOn.isActive || addOn.comingSoon) throw new BadRequestException(`${addOn.name} abhi nahi mil sakta`);
    if (!addOnAllowedOn(addOn, plan)) throw new BadRequestException(`${addOn.name} ${plan.name} plan par nahi milta`);
    if (inBundles.has(addOn.key)) continue;
    out.push({ addOn, quantity: addOn.kind === AddOnKind.PER_UNIT ? wanted.get(addOn.key)! : 1 });
  }
  return out;
}

export const SETUP_KEY = 'setup';
export const FULL_ACTIVATION_KEY = 'full_activation';

/**
 * Yearly plans get Assisted setup free; Full activation then costs its price
 * minus the Assisted setup price. `setupCredit` is that price, or 0 when the
 * admin turned the offer off.
 */
export function oneTimePrice(addOn: AddOn, unit: number, interval: BillingInterval | null, setupCredit: number): { amount: number; note: string | null } {
  if (interval !== 'YEARLY' || setupCredit <= 0) return { amount: money(unit), note: null };
  if (addOn.key === SETUP_KEY) return { amount: 0, note: 'saal ke plan ke saath muft' };
  if (addOn.key === FULL_ACTIVATION_KEY) return { amount: money(Math.max(0, unit - setupCredit)), note: `saal ke plan par Rs ${setupCredit.toLocaleString('en-PK')} kam` };
  return { amount: money(unit), note: null };
}

/** Bill lines for a plan period with its add-ons. */
export function checkoutLines(plan: Plan, interval: BillingInterval, picks: Array<{ addOn: AddOn; quantity: number }>, unitPrices: Map<string, number> = new Map(), setupCredit = 0): { lines: InvoiceLine[]; total: number } {
  const months = INTERVAL_MONTHS[interval];
  const factor = intervalFactor(plan, interval);
  const lines: InvoiceLine[] = [{
    kind: 'PLAN', refId: plan.id, description: `${plan.name} plan (${interval === 'MONTHLY' ? '1 mahina' : interval === 'QUARTERLY' ? '3 mahine' : '12 mahine'})`,
    quantity: 1, unitPrice: planPrice(plan, interval), amount: planPrice(plan, interval),
  }];
  for (const { addOn, quantity } of picks) {
    const unit = unitPrices.get(addOn.id) ?? addOn.priceMonthly;
    if (addOn.kind === AddOnKind.ONE_TIME) {
      const p = oneTimePrice(addOn, unit, interval, setupCredit);
      lines.push({ kind: 'ONE_TIME', refId: addOn.id, description: p.note ? `${addOn.name} (${p.note})` : addOn.name, quantity: 1, unitPrice: p.amount, amount: p.amount });
      continue;
    }
    const each = money(unit * months * factor);
    lines.push({
      kind: 'ADDON', refId: addOn.id,
      description: addOn.kind === AddOnKind.PER_UNIT ? `${addOn.name} × ${quantity}` : addOn.name,
      quantity, unitPrice: each, amount: each * quantity,
    });
  }
  return { lines, total: lines.reduce((n, l) => n + l.amount, 0) };
}

/** Price of an add-on from now to the end of the paid period. */
export function proratedLine(addOn: AddOn, quantity: number, periodEnd: Date, unitPrice?: number | null, interval: BillingInterval | null = null, setupCredit = 0): InvoiceLine {
  const unit = unitPrice ?? addOn.priceMonthly;
  if (addOn.kind === AddOnKind.ONE_TIME) {
    const p = oneTimePrice(addOn, unit, interval, setupCredit);
    return { kind: 'ONE_TIME', refId: addOn.id, description: p.note ? `${addOn.name} (${p.note})` : addOn.name, quantity: 1, unitPrice: p.amount, amount: p.amount };
  }
  const days = Math.max(1, Math.ceil((periodEnd.getTime() - Date.now()) / DAY));
  const each = money((unit * days) / 30);
  return {
    kind: 'ADDON', refId: addOn.id,
    description: `${addOn.kind === AddOnKind.PER_UNIT ? `${addOn.name} × ${quantity}` : addOn.name} (${days} din, ${periodEnd.toISOString().slice(0, 10)} tak)`,
    quantity, unitPrice: each, amount: each * quantity,
  };
}

export async function writeInvoiceItems(tx: Prisma.TransactionClient, invoiceId: string, lines: InvoiceLine[], periodStart?: Date, periodEnd?: Date) {
  await tx.invoiceItem.deleteMany({ where: { invoiceId } });
  if (!lines.length) return;
  await tx.invoiceItem.createMany({
    data: lines.map((l) => ({ invoiceId, kind: l.kind, refId: l.refId, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, amount: l.amount, periodStart, periodEnd })),
  });
}

/**
 * A paid invoice turns on the add-ons it bills. The add-on runs to the end of
 * the shop's paid plan period (or `periodEnd` when given). One-time items are
 * recorded and marked done.
 */
export async function applyPaidInvoiceAddOns(tx: Prisma.TransactionClient, invoiceId: string, periodEnd?: Date | null): Promise<number> {
  const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, select: { tenantId: true, items: true } });
  if (!invoice) return 0;
  const items = invoice.items.filter((i) => (i.kind === 'ADDON' || i.kind === 'ONE_TIME') && i.refId);
  if (!items.length) return 0;
  let end = periodEnd ?? null;
  if (!end) {
    const live = await tx.subscription.findFirst({
      where: { tenantId: invoice.tenantId, status: { in: ['ACTIVE', 'PAST_DUE'] } },
      orderBy: { currentPeriodEnd: 'desc' },
      select: { currentPeriodEnd: true },
    });
    end = live?.currentPeriodEnd ?? null;
  }
  const now = new Date();
  for (const item of items) {
    if (item.kind === 'ONE_TIME') {
      // A service to deliver: it stays on the admin "Setup requests" list until marked done.
      // Its features (e.g. priority support) run for 30 days.
      const extraDays = new Date(now.getTime() + 30 * DAY);
      await tx.tenantAddOn.upsert({
        where: { tenantId_addOnId: { tenantId: invoice.tenantId, addOnId: item.refId! } },
        create: { tenantId: invoice.tenantId, addOnId: item.refId!, quantity: 1, source: 'CHECKOUT', status: TenantAddOnStatus.ACTIVE, freeUntil: extraDays, note: `${SETUP_PENDING} ${invoiceId}` },
        update: { quantity: 1, status: TenantAddOnStatus.ACTIVE, freeUntil: extraDays, paymentDueAt: null, cancelledAt: null, note: `${SETUP_PENDING} ${invoiceId}` },
      });
      const [shop, service] = await Promise.all([
        tx.tenant.findUnique({ where: { id: invoice.tenantId }, select: { name: true, phone: true } }),
        tx.addOn.findUnique({ where: { id: item.refId! }, select: { name: true } }),
      ]);
      await tx.adminNotification.create({
        data: {
          type: 'USER_ACTION', priority: 'HIGH',
          title: `Setup karna hai: ${service?.name ?? 'Service'} — ${shop?.name ?? ''}`,
          message: `${shop?.name ?? 'Shop'} ne ${service?.name ?? 'service'} li hai${item.amount > 0 ? ` (Rs ${Math.round(item.amount).toLocaleString('en-PK')})` : ' (saal ke plan ke saath muft)'}. Phone: ${shop?.phone ?? '—'}. Kaam mukammal hone par Setup requests me "Done" karein.`,
          link: '/setups', tenantId: invoice.tenantId, entityType: 'Invoice', entityId: invoiceId,
        },
      });
      continue;
    }
    await tx.tenantAddOn.upsert({
      where: { tenantId_addOnId: { tenantId: invoice.tenantId, addOnId: item.refId! } },
      create: { tenantId: invoice.tenantId, addOnId: item.refId!, quantity: item.quantity, source: 'CHECKOUT', status: TenantAddOnStatus.ACTIVE, currentPeriodEnd: end },
      update: { quantity: item.quantity, status: TenantAddOnStatus.ACTIVE, currentPeriodEnd: end, paymentDueAt: null, cancelAtPeriodEnd: false, cancelledAt: null },
    });
  }
  invalidateEntitlements(invoice.tenantId);
  return items.length;
}
