/**
 * One shop's billing for Shop 360: what it may use right now, its usage,
 * plan, add-ons and bills, and the admin deals — extra features, limit
 * overrides, the grandfather date and add-ons given free or at a custom
 * price. Every change refreshes the shop's entitlements and channels.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TenantAddOnStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EntitlementsService } from '../../modules/billing/entitlements/entitlements.service';
import { BillingPricingService } from '../../modules/billing/pricing/billing-pricing.service';
import { FEATURES, LIMIT_KEYS, LimitKey, UNLIMITED } from '../../modules/billing/entitlements/feature-catalog';
import { GiveAddOnInput } from './billing-catalog-input';

@Injectable()
export class AdminShopBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly pricing: BillingPricingService,
  ) {}

  private async refresh(tenantId: string) {
    this.entitlements.invalidate(tenantId);
    await this.entitlements.syncChannels(tenantId);
  }

  private async tenantOr404(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, extraFeatures: true, limitOverrides: true, billingGrandfatherUntil: true },
    });
    if (!tenant) throw new NotFoundException('Shop not found');
    return tenant;
  }

  async get(tenantId: string) {
    const tenant = await this.tenantOr404(tenantId);
    // Fresh entitlements, usage this business month and open bills.
    const overview = await this.pricing.overview(tenantId);
    const [plan, subscriptions, addOns, invoices, catalog] = await Promise.all([
      overview.plan ? this.prisma.plan.findUnique({ where: { id: overview.plan.id } }) : null,
      this.prisma.subscription.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { plan: { select: { id: true, name: true, slug: true, isFree: true } } },
      }),
      this.prisma.tenantAddOn.findMany({
        where: { tenantId },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: { addOn: { select: { id: true, key: true, name: true, category: true, kind: true, priceMonthly: true, unitLabel: true, isActive: true, comingSoon: true } } },
      }),
      this.prisma.invoice.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
          items: { orderBy: { createdAt: 'asc' } },
          payments: { select: { id: true, status: true, amount: true, provider: true, createdAt: true } },
        },
      }),
      this.prisma.addOn.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: { id: true, key: true, name: true, category: true, kind: true, priceMonthly: true, unitLabel: true, isActive: true, comingSoon: true, bundleKeys: true },
      }),
    ]);

    return {
      entitlements: overview,
      usage: overview.usage,
      plan: plan
        ? {
            id: plan.id, name: plan.name, slug: plan.slug, isFree: plan.isFree, features: plan.features,
            limits: { users: plan.maxUsers, shops: plan.maxShops, products: plan.maxProducts, salesPerMonth: plan.maxSalesPerMonth },
            priceMonthly: plan.priceMonthly,
          }
        : null,
      subscriptions,
      addOns,
      invoices,
      deals: {
        extraFeatures: tenant.extraFeatures,
        limitOverrides: (tenant.limitOverrides ?? {}) as Partial<Record<LimitKey, number>>,
        billingGrandfatherUntil: tenant.billingGrandfatherUntil,
      },
      catalog: { addOns: catalog, features: FEATURES, limitKeys: LIMIT_KEYS, unlimited: UNLIMITED },
    };
  }

  /** Extra features, limit overrides (null clears one) and the grandfather date. */
  async updateDeals(tenantId: string, input: {
    extraFeatures?: string[];
    limitOverrides?: Partial<Record<LimitKey, number | null>> | null;
    billingGrandfatherUntil?: Date | null;
  }) {
    const tenant = await this.tenantOr404(tenantId);
    const data: Prisma.TenantUpdateInput = {};
    if (input.extraFeatures !== undefined) data.extraFeatures = input.extraFeatures;
    if (input.limitOverrides !== undefined) {
      const next: Partial<Record<LimitKey, number>> = input.limitOverrides === null ? {} : { ...((tenant.limitOverrides ?? {}) as Partial<Record<LimitKey, number>>) };
      for (const [k, v] of Object.entries(input.limitOverrides ?? {})) {
        if (v === null) delete next[k as LimitKey];
        else next[k as LimitKey] = v;
      }
      data.limitOverrides = Object.keys(next).length ? next : Prisma.DbNull;
    }
    if (input.billingGrandfatherUntil !== undefined) data.billingGrandfatherUntil = input.billingGrandfatherUntil;
    await this.prisma.tenant.update({ where: { id: tenantId }, data });
    await this.refresh(tenantId);
    return this.get(tenantId);
  }

  /**
   * Gives an add-on to the shop:
   * - forever: on for good, no bill (admin gift with no end date);
   * - free_until: on and free until the date, then it needs paying;
   * - custom_price: the shop's own price. An add-on already on keeps its
   *   state and uses the price from the next bill; a new one is turned on
   *   with a bill at this price for the rest of the period.
   */
  async giveAddOn(tenantId: string, adminUserId: string, input: GiveAddOnInput) {
    await this.tenantOr404(tenantId);
    const addOn = await this.prisma.addOn.findUnique({ where: { key: input.key } });
    if (!addOn) throw new NotFoundException('Add-on not found');
    if (addOn.kind === 'ONE_TIME' && input.mode !== 'custom_price') {
      throw new BadRequestException('A one-time service cannot be given as a running add-on. Bill it with an invoice instead.');
    }
    const quantity = addOn.kind === 'PER_UNIT' ? input.quantity : 1;
    const where = { tenantId_addOnId: { tenantId, addOnId: addOn.id } };
    const existing = await this.prisma.tenantAddOn.findUnique({ where });
    const note = input.note ?? undefined;

    if (input.mode === 'forever' || input.mode === 'free_until') {
      const freeUntil = input.mode === 'forever' ? null : input.freeUntil;
      const gift = {
        quantity, status: TenantAddOnStatus.ACTIVE, source: 'ADMIN', freeUntil, paymentDueAt: null,
        cancelAtPeriodEnd: false, cancelledAt: null,
        // A forever gift has no paid period; a dated gift keeps any period already paid.
        ...(input.mode === 'forever' ? { currentPeriodEnd: null } : {}),
      };
      await this.prisma.$transaction(async (tx) => {
        await tx.tenantAddOn.upsert({
          where,
          create: { tenantId, addOnId: addOn.id, ...gift, note, createdById: adminUserId },
          update: { ...gift, ...(note ? { note } : {}) },
        });
        await this.cancelOpenAddOnBills(tx, tenantId, addOn.id);
      });
      await this.refresh(tenantId);
      return this.get(tenantId);
    }

    // custom_price
    const price = input.unitPrice!;
    if (existing && existing.status !== TenantAddOnStatus.CANCELLED) {
      await this.prisma.tenantAddOn.update({
        where: { id: existing.id },
        data: { unitPrice: price, quantity, ...(note ? { note } : {}) },
      });
      await this.refresh(tenantId);
      return this.get(tenantId);
    }
    // Store the price first so the bill made by turnOn uses it.
    await this.prisma.tenantAddOn.upsert({
      where,
      create: { tenantId, addOnId: addOn.id, quantity, status: TenantAddOnStatus.CANCELLED, source: 'USER', unitPrice: price, note, createdById: adminUserId, cancelledAt: new Date() },
      update: { unitPrice: price, source: 'USER', ...(note ? { note } : {}) },
    });
    await this.pricing.turnOn(tenantId, adminUserId, addOn.key, quantity);
    await this.refresh(tenantId);
    return this.get(tenantId);
  }

  /** Switches the add-on off now and drops unpaid bills made only for it. */
  async removeAddOn(tenantId: string, key: string) {
    const addOn = await this.prisma.addOn.findUnique({ where: { key } });
    if (!addOn) throw new NotFoundException('Add-on not found');
    const row = await this.prisma.tenantAddOn.findUnique({ where: { tenantId_addOnId: { tenantId, addOnId: addOn.id } } });
    if (!row || row.status === TenantAddOnStatus.CANCELLED) throw new NotFoundException('This shop does not have the add-on');
    await this.prisma.$transaction(async (tx) => {
      await tx.tenantAddOn.update({
        where: { id: row.id },
        data: { status: TenantAddOnStatus.CANCELLED, cancelledAt: new Date(), paymentDueAt: null, cancelAtPeriodEnd: false },
      });
      await this.cancelOpenAddOnBills(tx, tenantId, addOn.id);
    });
    await this.refresh(tenantId);
    return this.get(tenantId);
  }

  /** Unpaid bills made only for this add-on (no plan, no payment under review) are no longer owed. */
  private async cancelOpenAddOnBills(tx: Prisma.TransactionClient, tenantId: string, addOnId: string) {
    const bills = await tx.invoice.findMany({
      where: { tenantId, subscriptionId: null, status: { in: ['PENDING', 'OVERDUE'] }, items: { some: { refId: addOnId } }, payments: { none: { status: 'PENDING' } } },
      select: { id: true, items: { select: { refId: true } } },
    });
    const only = bills.filter((b) => b.items.every((i) => i.refId === addOnId)).map((b) => b.id);
    if (only.length) await tx.invoice.updateMany({ where: { id: { in: only } }, data: { status: 'CANCELLED' } });
  }
}
