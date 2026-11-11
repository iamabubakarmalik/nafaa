/**
 * What a shop may use right now: its plan's features and limits, plus its
 * add-ons, plus the grandfather period for shops that existed before pricing
 * v2. Every gate, the merchant apps (GET /billing/entitlements) and the admin
 * Shop 360 read it from here, so the answer is the same everywhere.
 *
 * Results are cached per shop for 60 seconds; billing changes call
 * invalidate() so the new state shows at once on this server.
 */

import { ForbiddenException, Injectable } from '@nestjs/common';
import { Plan, SubscriptionStatus, TenantAddOnStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { FEATURE_KEYS, LimitKey, UNLIMITED } from './feature-catalog';
import { loadBillingSettings } from './billing-settings';

export type BillingState = 'trial' | 'active' | 'free' | 'grace' | 'expired';

export interface ActiveAddOn {
  key: string;
  name: string;
  quantity: number;
  status: TenantAddOnStatus;
  /** True while it is on because of a free gift or the pay window. */
  free: boolean;
  paymentDueAt: Date | null;
  currentPeriodEnd: Date | null;
  freeUntil: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface Entitlements {
  tenantId: string;
  state: BillingState;
  plan: { id: string; slug: string; name: string; isFree: boolean } | null;
  subscriptionId: string | null;
  interval: string | null;
  trialEndsAt: Date | null;
  periodEnd: Date | null;
  /** When the app stops if nothing is paid (end + grace). */
  blocksAt: Date | null;
  graceDaysLeft: number | null;
  grandfatheredUntil: Date | null;
  features: string[];
  limits: Record<LimitKey, number>;
  addOns: ActiveAddOn[];
  /**
   * Optional modules the shop has turned on or already uses (add-on keys, e.g.
   * "shopify", "distribution", "online_store"). The apps show these in the
   * menu; anything else stays out of the menu until the shop adds it.
   */
  apps: string[];
}

const RANK: Partial<Record<SubscriptionStatus, number>> = { ACTIVE: 0, TRIAL: 1, PAST_DUE: 2, EXPIRED: 3 };
const DAY = 86_400_000;

/** Old boolean plan columns, used only when a plan has no feature list. */
function legacyFeatures(plan: Plan): string[] {
  const out = ['pos', 'khata', 'inventory', 'returns', 'barcode', 'cash_register', 'reports', 'offline'];
  if (plan.featureProfitReport) out.push('profit_report', 'expenses');
  if (plan.featureLoyalty) out.push('loyalty');
  if (plan.featureDiscounts) out.push('discount_rules');
  if (plan.featureExports) out.push('exports');
  if (plan.featureBackup) out.push('backup');
  if (plan.featureStockTransfer) out.push('stock_transfer');
  if (plan.featureMultiShop) out.push('multi_shop');
  if (plan.featureWhatsappReceipt) out.push('whatsapp_receipt');
  if (plan.featureCustomBranding) out.push('branding');
  if (plan.featureSupport24x7) out.push('priority_support');
  return out;
}

/** Shared by every caller (and invalidateEntitlements) so a billing change shows at once on this server. */
const CACHE = new Map<string, { value: Entitlements; at: number }>();

export function invalidateEntitlements(tenantId: string) {
  CACHE.delete(tenantId);
}

@Injectable()
export class EntitlementsService {

  constructor(private readonly prisma: PrismaService) {}

  invalidate(tenantId: string) {
    invalidateEntitlements(tenantId);
  }

  async has(tenantId: string, feature: string): Promise<boolean> {
    return (await this.get(tenantId)).features.includes(feature);
  }

  /** Throws 403 ADDON_REQUIRED (with the add-on key) when the shop lacks the feature. */
  async assertAddOn(tenantId: string, feature: string, addOnKey: string, label: string) {
    if (await this.has(tenantId, feature)) return;
    throw new ForbiddenException({
      statusCode: 403, error: 'Forbidden', code: 'ADDON_REQUIRED', feature, addOnKey,
      message: `${label} ke liye add-on chahiye. "Mera plan" me jaa kar abhi jodein.`,
    });
  }

  async get(tenantId: string, fresh = false): Promise<Entitlements> {
    const hit = CACHE.get(tenantId);
    if (!fresh && hit && Date.now() - hit.at < 60_000) return hit.value;
    const value = await this.resolve(tenantId);
    CACHE.set(tenantId, { value, at: Date.now() });
    if (CACHE.size > 20_000) CACHE.clear();
    return value;
  }

  private async resolve(tenantId: string): Promise<Entitlements> {
    const now = new Date();
    const [settings, tenant, subs, addOns] = await Promise.all([
      loadBillingSettings(this.prisma),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { billingGrandfatherUntil: true, extraFeatures: true, limitOverrides: true } }),
      this.prisma.subscription.findMany({
        where: { tenantId, status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'EXPIRED'] } },
        orderBy: { createdAt: 'desc' },
        include: { plan: true },
        take: 10,
      }),
      this.prisma.tenantAddOn.findMany({
        where: { tenantId, status: { not: TenantAddOnStatus.CANCELLED } },
        include: { addOn: true },
      }),
    ]);
    const sub = subs.sort((a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9))[0] ?? null;
    const plan = sub?.plan ?? null;

    let state: BillingState = 'expired';
    let periodEnd: Date | null = null;
    let blocksAt: Date | null = null;
    if (sub?.status === 'TRIAL') {
      periodEnd = sub.trialEndsAt;
      blocksAt = sub.trialEndsAt;
      state = sub.trialEndsAt && sub.trialEndsAt > now ? 'trial' : 'expired';
    } else if (sub && (sub.status === 'ACTIVE' || sub.status === 'PAST_DUE')) {
      periodEnd = sub.currentPeriodEnd;
      blocksAt = new Date(sub.currentPeriodEnd.getTime() + settings.graceDays * DAY);
      if (plan?.isFree) state = 'free';
      else if (sub.currentPeriodEnd > now) state = 'active';
      else state = blocksAt > now ? 'grace' : 'expired';
    }

    const grandfathered = tenant?.billingGrandfatherUntil && tenant.billingGrandfatherUntil > now ? tenant.billingGrandfatherUntil : null;
    const live = state !== 'expired';

    // ─── Add-ons that count right now ───
    const byKey = new Map(addOns.map((a) => [a.addOn.key, a]));
    const activeAddOns: ActiveAddOn[] = [];
    const features = new Set<string>();
    const extra: Record<LimitKey, number> = { users: 0, shops: 0, products: 0, salesPerMonth: 0, bookers: 0 };
    for (const ta of addOns) {
      const freeNow = !!ta.freeUntil && ta.freeUntil > now;
      const inPayWindow = ta.status === TenantAddOnStatus.PENDING_PAYMENT && !!ta.paymentDueAt && ta.paymentDueAt > now;
      const paid = ta.status === TenantAddOnStatus.ACTIVE && !!ta.currentPeriodEnd && ta.currentPeriodEnd.getTime() + settings.graceDays * DAY > now.getTime();
      // An admin gift with no end date stays on for good.
      const permanentGift = ta.status === TenantAddOnStatus.ACTIVE && ta.source === 'ADMIN' && !ta.freeUntil && !ta.currentPeriodEnd;
      const counts = live && ta.addOn.isActive && (freeNow || inPayWindow || paid || permanentGift);
      activeAddOns.push({
        key: ta.addOn.key, name: ta.addOn.name, quantity: ta.quantity, status: ta.status, free: freeNow || inPayWindow || permanentGift,
        paymentDueAt: ta.paymentDueAt, currentPeriodEnd: ta.currentPeriodEnd, freeUntil: ta.freeUntil, cancelAtPeriodEnd: ta.cancelAtPeriodEnd,
      });
      if (!counts) continue;
      for (const f of ta.addOn.grantsFeatures) features.add(f);
      for (const k of ta.addOn.bundleKeys) for (const f of byKey.get(k)?.addOn.grantsFeatures ?? []) features.add(f);
      const per = (ta.addOn.grantsLimits ?? {}) as Partial<Record<LimitKey, number>>;
      for (const [k, v] of Object.entries(per)) if (k in extra && Number(v) > 0) extra[k as LimitKey] += Number(v) * Math.max(1, ta.quantity);
    }
    // A bundle's own add-on rows are not needed; its catalog keys are enough.
    const bundleKeys = addOns.filter((a) => a.addOn.bundleKeys.length).flatMap((a) => a.addOn.bundleKeys);
    if (bundleKeys.length) {
      const bundled = await this.prisma.addOn.findMany({ where: { key: { in: bundleKeys } }, select: { grantsFeatures: true } });
      if (live) for (const b of bundled) for (const f of b.grantsFeatures) features.add(f);
    }

    // ─── Plan features ───
    if (live && plan) for (const f of plan.features.length ? plan.features : legacyFeatures(plan)) features.add(f);
    if (live && plan?.featureDistribution) features.add('distribution');
    // Admin gifts and deals.
    if (live) for (const f of tenant?.extraFeatures ?? []) features.add(f);
    // Trial and the grandfather period: everything is on.
    if ((state === 'trial' || (live && grandfathered))) for (const f of FEATURE_KEYS) features.add(f);

    const unlimited = state === 'trial' || !!grandfathered;
    const cap = (n: number | undefined, add: number) => (n == null ? UNLIMITED : n >= UNLIMITED ? UNLIMITED : n + add);
    const limits: Record<LimitKey, number> = live && plan
      ? {
          users: cap(plan.maxUsers, extra.users),
          shops: cap(plan.maxShops, extra.shops),
          products: cap(plan.maxProducts, extra.products),
          salesPerMonth: cap(plan.maxSalesPerMonth, extra.salesPerMonth),
          bookers: unlimited ? UNLIMITED : extra.bookers,
        }
      : { users: 0, shops: 0, products: 0, salesPerMonth: 0, bookers: 0 };

    // Before the features list is built: a Shopify-billed store gains its Shopify feature here.
    const apps = await this.apps(tenantId, addOns.map((a) => a.addOn), live ? features : null);

    const overrides = (tenant?.limitOverrides ?? {}) as Partial<Record<LimitKey, number>>;
    if (live) for (const [k, v] of Object.entries(overrides)) if (k in limits && Number(v) >= 0) limits[k as LimitKey] = Number(v);

    return {
      tenantId,
      state,
      plan: plan ? { id: plan.id, slug: plan.slug, name: plan.name, isFree: plan.isFree } : null,
      subscriptionId: sub?.id ?? null,
      interval: sub?.interval ?? null,
      trialEndsAt: sub?.trialEndsAt ?? null,
      periodEnd,
      blocksAt,
      graceDaysLeft: state === 'grace' && blocksAt ? Math.max(0, Math.ceil((blocksAt.getTime() - now.getTime()) / DAY)) : null,
      grandfatheredUntil: grandfathered,
      features: [...features].sort(),
      limits,
      addOns: activeAddOns,
      apps,
    };
  }

  /** Add-on keys of modules turned on or already in use. */
  /**
   * Also adds "integration.shopify" to `features` for a store that pays for
   * Nafaa through Shopify App Pricing (App Store rule: the Shopify app must
   * work without a Nafaa plan).
   */
  private async apps(tenantId: string, turnedOn: Array<{ key: string; bundleKeys: string[] }>, features: Set<string> | null): Promise<string[]> {
    const out = new Set<string>();
    for (const a of turnedOn) {
      out.add(a.key);
      for (const k of a.bundleKeys) out.add(k);
    }
    const [integrations, dist, fbr, meta] = await Promise.all([
      this.prisma.integration.findMany({ where: { tenantId, isActive: true }, select: { type: true, category: true, config: true } }),
      this.prisma.distributionSettings.findUnique({ where: { tenantId }, select: { enabled: true } }),
      this.prisma.fbrConfig.findUnique({ where: { tenantId }, select: { isEnabled: true } }),
      this.prisma.metaConnection.findUnique({ where: { tenantId }, select: { status: true } }),
    ]);
    const byType: Record<string, string> = {
      SHOPIFY: 'shopify', WOOCOMMERCE: 'woocommerce', DARAZ: 'daraz', CUSTOM_WEBSITE: 'website', FOODPANDA: 'foodpanda',
      TCS_COURIER: 'courier', LEOPARDS_COURIER: 'courier', CALLCOURIER: 'courier', MANUAL: 'online_store',
    };
    for (const i of integrations) {
      if (byType[i.type]) out.add(byType[i.type]);
      const cfg = (i.config ?? {}) as { shopifyBilling?: string; shopifyPlan?: { active?: boolean } };
      if (features && i.type === 'SHOPIFY' && cfg.shopifyBilling === 'shopify' && cfg.shopifyPlan?.active) features.add('integration.shopify');
      if (i.category === 'ACCOUNTING') out.add('accounting');
    }
    if (dist?.enabled) out.add('distribution');
    if (fbr?.isEnabled) out.add('fbr');
    if (meta?.status === 'CONNECTED') out.add('meta');
    return [...out].sort();
  }

  /**
   * Pauses online channels the shop no longer pays for and resumes them once
   * it does. Only channels paused for billing (config.billingSuspended) are
   * ever resumed here; Shopify-billed stores are never paused.
   */
  async syncChannels(tenantId: string): Promise<{ paused: number; resumed: number }> {
    const ent = await this.get(tenantId, true);
    const rows = await this.prisma.integration.findMany({
      where: { tenantId, isActive: true, type: { in: Object.keys(CHANNEL_ADDON) as never } },
      select: { id: true, type: true, status: true, config: true },
    });
    let paused = 0;
    let resumed = 0;
    for (const r of rows) {
      const gate = CHANNEL_ADDON[r.type];
      const cfg = (r.config ?? {}) as Record<string, unknown> & { shopifyBilling?: string };
      const allowed = ent.state !== 'expired' && ent.features.includes(gate.feature);
      if (!allowed && r.status === 'CONNECTED' && cfg.shopifyBilling !== 'shopify') {
        await this.prisma.integration.update({ where: { id: r.id }, data: { status: 'SUSPENDED', config: { ...cfg, billingSuspended: true } } });
        paused++;
      } else if (allowed && r.status === 'SUSPENDED' && cfg.billingSuspended) {
        const { billingSuspended: _drop, ...rest } = cfg;
        await this.prisma.integration.update({ where: { id: r.id }, data: { status: 'CONNECTED', config: rest as object } });
        resumed++;
      }
    }
    return { paused, resumed };
  }

  /** Current counts for the limits, for the "My plan" page and limit checks. */
  async usage(tenantId: string, monthStart: Date) {
    const [users, shops, products, salesThisMonth, bookers] = await Promise.all([
      this.prisma.user.count({ where: { tenantId, isActive: true } }),
      this.prisma.shop.count({ where: { tenantId, isActive: true } }),
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
      this.prisma.sale.count({ where: { tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] }, soldAt: { gte: monthStart } } }),
      this.countBookers(tenantId),
    ]);
    return { users, shops, products, salesPerMonth: salesThisMonth, bookers };
  }

  /** A booker login is an active, non-owner user who can book distribution orders. */
  countBookers(tenantId: string): Promise<number> {
    return this.prisma.user.count({
      where: { tenantId, isActive: true, role: { notIn: ['OWNER', 'SUPER_ADMIN'] }, permissions: { has: PERMISSIONS.DISTRIBUTION_ORDERS_BOOK } },
    });
  }
}

/** Feature and add-on for each online channel type. */
export const CHANNEL_ADDON: Record<string, { feature: string; addOn: string; label: string }> = {
  SHOPIFY: { feature: 'integration.shopify', addOn: 'shopify', label: 'Shopify' },
  WOOCOMMERCE: { feature: 'integration.woocommerce', addOn: 'woocommerce', label: 'WooCommerce' },
  DARAZ: { feature: 'integration.daraz', addOn: 'daraz', label: 'Daraz' },
  CUSTOM_WEBSITE: { feature: 'integration.website', addOn: 'website', label: 'Apni website' },
  FOODPANDA: { feature: 'integration.foodpanda', addOn: 'foodpanda', label: 'Foodpanda' },
  TCS_COURIER: { feature: 'courier', addOn: 'courier', label: 'Courier' },
  LEOPARDS_COURIER: { feature: 'courier', addOn: 'courier', label: 'Courier' },
  CALLCOURIER: { feature: 'courier', addOn: 'courier', label: 'Courier' },
  MANUAL: { feature: 'online_store', addOn: 'online_store', label: 'Online orders' },
};
