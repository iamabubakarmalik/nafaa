/**
 * Pricing v2 endpoints: the public price list, what the shop may use
 * (entitlements), "My plan" (overview), add-ons on/off, moving to the Free
 * plan and checkout of a plan with add-ons.
 */

import { apiClient } from '@core/api/client';
import type { BillingInterval } from '@modules/billing/subscriptions/api/subscriptions.api';

export type BillingState = 'trial' | 'active' | 'free' | 'grace' | 'expired';
export type AddOnKind = 'FLAT' | 'PER_UNIT' | 'ONE_TIME';
export type AddOnStatus = 'ACTIVE' | 'PENDING_PAYMENT' | 'PAST_DUE' | 'CANCELLED';
export type LimitKey = 'users' | 'shops' | 'products' | 'salesPerMonth' | 'bookers';
export type FeatureGroup = 'Core' | 'Business' | 'Growth' | 'Advanced' | 'Add-on';

export interface CatalogPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isFree: boolean;
  priceMonthly: number;
  priceQuarterly: number;
  priceYearly: number;
  limits: { users: number; shops: number; products: number; salesPerMonth: number };
  features: string[];
}

export interface CatalogAddOn {
  key: string;
  name: string;
  description: string | null;
  category: string;
  kind: AddOnKind;
  priceMonthly: number;
  unitLabel: string | null;
  grantsFeatures: string[];
  bundleKeys: string[];
  /** Plan slugs; empty means every paid plan. */
  availableOnPlans: string[];
  comingSoon: boolean;
}

export interface CatalogFeature {
  key: string;
  label: string;
  group: FeatureGroup;
  hint?: string;
}

export interface PricingOffers {
  /** With a yearly plan Assisted setup is free and Full activation costs less by its price. */
  yearlyFreeSetup: boolean;
  setupKey: string;
  fullActivationKey: string;
}

export interface PricingCatalog {
  plans: CatalogPlan[];
  /** Missing on older APIs. */
  offers?: PricingOffers;
  addOns: CatalogAddOn[];
  features: CatalogFeature[];
  trialDays: number;
  unlimited: number;
}

export interface Entitlements {
  state: BillingState;
  plan: { id: string; slug: string; name: string; isFree: boolean } | null;
  trialEndsAt: string | null;
  periodEnd: string | null;
  blocksAt: string | null;
  graceDaysLeft: number | null;
  grandfatheredUntil: string | null;
  features: string[];
  limits: Record<LimitKey, number>;
  /** Optional modules turned on or already in use (add-on keys). */
  apps: string[];
  addOns: Array<{ key: string; status: AddOnStatus; free: boolean }>;
}

export interface ShopAddOn {
  key: string;
  name: string;
  quantity: number;
  status: AddOnStatus;
  free: boolean;
  paymentDueAt: string | null;
  currentPeriodEnd: string | null;
  freeUntil: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface OpenInvoice {
  id: string;
  invoiceNumber: string;
  total: number;
  amountDue: number;
  dueDate: string;
  status: 'PENDING' | 'OVERDUE';
  description: string | null;
  subscriptionId: string | null;
  items: Array<{ id: string; description: string; quantity: number; unitPrice: number; amount: number; kind?: string }>;
  inReview: boolean;
}

export interface BillingOverview extends Omit<Entitlements, 'addOns'> {
  interval: BillingInterval | null;
  subscriptionId: string | null;
  addOns: ShopAddOn[];
  usage: Record<LimitKey, number>;
  openInvoices: OpenInvoice[];
}

export interface TurnOnResult {
  mode: 'free' | 'invoice' | 'resumed';
  freeUntil?: string | null;
  invoice?: { id: string; invoiceNumber: string; total: number; amountDue: number; dueDate: string };
  overview: BillingOverview;
}

export interface CheckoutResult {
  invoice: { id: string; invoiceNumber: string; total: number; amountDue: number; status: string };
}

/** Most bodies come as { success, data }; a few routes answer bare. */
const unwrap = <T,>(res: { data: unknown }): T => {
  const body = res.data as { success?: boolean; data?: T } | T;
  return (body && typeof body === 'object' && 'success' in (body as object) && 'data' in (body as object) ? (body as { data: T }).data : body) as T;
};

export const pricingApi = {
  catalog: () => apiClient.get('/plans/catalog').then(unwrap<PricingCatalog>),
  entitlements: () => apiClient.get('/plan-usage/entitlements').then(unwrap<Entitlements>),
  overview: () => apiClient.get('/billing/overview').then(unwrap<BillingOverview>),
  turnOn: (key: string, quantity = 1) => apiClient.post('/billing/addons', { key, quantity }).then(unwrap<TurnOnResult>),
  turnOff: (key: string) => apiClient.delete(`/billing/addons/${encodeURIComponent(key)}`).then(unwrap<{ endsAt: string | null; overview: BillingOverview }>),
  goFree: () => apiClient.post('/billing/free').then(unwrap<BillingOverview>),
  checkout: (planId: string, interval: BillingInterval, addOns: Array<{ key: string; quantity: number }>) =>
    apiClient.post('/subscriptions/start', { planId, interval, addOns }).then(unwrap<CheckoutResult>),
};
