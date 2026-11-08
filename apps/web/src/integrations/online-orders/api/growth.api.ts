/**
 * Commerce growth and protection: abandoned checkouts, payment health, the
 * profit statement, the team queue, WhatsApp templates and scammer reports.
 */

import { apiClient } from '@core/api/client';
import { unwrap } from './online-orders.api';
import type { ProfitReport } from './order-money.api';

// ─── Abandoned carts ───
export type CartStatus = 'ALL' | 'OPEN' | 'CONTACTED' | 'RECOVERED';
export interface AbandonedCart {
  id: string;
  source: 'SHOPIFY' | 'WEBSITE';
  channel: string | null;
  integrationId: string;
  name: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerCity: string | null;
  items: Array<{ name: string; quantity: number; price: number; sku: string | null; variant: string | null }>;
  total: number;
  currency: string | null;
  recoveryUrl: string | null;
  abandonedAt: string;
  contactedAt: string | null;
  contactCount: number;
  recoveredAt: string | null;
  recoveredValue: number | null;
  recoveredOrderId: string | null;
  recoveredOrderNo: string | null;
}
export interface AbandonedList {
  days: number;
  stats: { carts: number; value: number; contacted: number; recovered: number; recoveredValue: number; recoveredAfterContact: number; rate: number };
  sources: {
    shopify: Array<{ id: string; name: string; connected: boolean }>;
    woocommerce: Array<{ id: string; name: string }>;
    website: Array<{ id: string; name: string }>;
  };
  items: AbandonedCart[];
}

// ─── Payment health ───
export type AgeKey = 'd0_7' | 'd8_14' | 'd15_30' | 'd30p';
export type ForecastKey = 'overdue' | 'thisWeek' | 'later';
export interface PaymentHealth {
  range: { from: string; to: string };
  cod: {
    outstanding: number; inTransit: number; withCourier: number; ages: Record<AgeKey, number>;
    byCourier: Array<{ code: string; name: string; inTransit: number; withCourier: number; count: number; ages: Record<AgeKey, number>; settleDays: number; forecast: Record<ForecastKey, number> }>;
  };
  forecast: Record<ForecastKey, number>;
  mix: { cod: { count: number; value: number; share: number }; prepaid: { count: number; value: number; share: number } };
  advance: { value: number; orders: number };
  links: {
    created: number; paid: number; failed: number; expired: number; pending: number; paidValue: number; failedValue: number;
    failures: Array<{ orderId: string; number: string; customerName: string; provider: string; amount: number; status: string; at: string }>;
  };
  losses: { rtoCount: number; rtoGoods: number; rtoCost: number; refunds: number; refundCount: number };
}

// ─── Profit ───
export interface Waterfall {
  sales: number; productCost: number; ads: number; courier: number; returns: number; otherExpenses: number; grossProfit: number; net: number; margin: number | null;
}
export interface ProfitOrderRow {
  id: string; number: string; receivedAt: string; channel: string; channelType: string; courier: string | null; city: string | null;
  status: string; sale: number; cost: number; sellingCosts: number; profit: number; margin: number | null; estimated: boolean;
}
export interface ProfitStatement {
  range: { from: string; to: string };
  withExpenses: boolean;
  waterfall: Waterfall;
  cash: { received: number; codOutstanding: number };
  ads: { total: number; byPlatform: Array<{ platform: string; amount: number }> };
  expenses: Array<{ category: string; amount: number }>;
  missingRates: ProfitReport['missingRates'];
  totals: ProfitReport['totals'];
  returns: ProfitReport['totals'];
  orders: ProfitOrderRow[];
  byChannel: Array<ProfitReport['byChannel'][number] & { id: string | null; ads: number; afterAds: number }>;
  byCourier: ProfitReport['byCourier'];
  byCity: ProfitReport['byCity'];
  byProduct: ProfitReport['byProduct'];
}

// ─── Team ───
export interface TeamQueue {
  staff: Array<{ userId: string; name: string; active: boolean; open: number; followUpsDue: number; doneToday: number }>;
  unassigned: number;
  me: string;
}

// ─── WhatsApp templates ───
export type WaTemplateKey = 'confirm' | 'address' | 'advance' | 'dispatched' | 'delivered' | 'cart';
export interface WaTemplates { keys: WaTemplateKey[]; templates: Partial<Record<WaTemplateKey, string>> }

// ─── Scammer reports ───
export interface PhoneHistory { total: number; delivered: number; returned: number; cancelled: number; open: number; loss: number; last: string | null }
export interface ScamOverview {
  entries: Array<{
    key: string; phone: string; name: string | null; reason: string | null; at: string; by: string;
    evidence?: string | null; orderId?: string | null; orderNo?: string | null; history: PhoneHistory;
  }>;
  suggestions: Array<{ key: string; phone: string; name: string | null; total: number; delivered: number; returned: number; cancelled: number; loss: number; last: string }>;
  totals: { blocked: number; reportedFromOrders: number; suggestions: number; knownLoss: number };
}

export const growthApi = {
  abandoned: (q: { status?: CartStatus; search?: string; days?: number }) =>
    apiClient.get('/online-orders/abandoned', { params: { ...q, status: q.status === 'ALL' ? undefined : q.status } }).then((r) => unwrap<AbandonedList>(r)),
  syncAbandoned: () =>
    apiClient.post('/online-orders/abandoned/sync').then((r) => unwrap<Array<{ channel: string; ok: boolean; count: number; error?: string }>>(r)),
  contacted: (id: string, undo = false) =>
    apiClient.post(`/online-orders/abandoned/${id}/contacted`, { undo }).then((r) => unwrap<{ id: string; contactedAt: string | null; contactCount: number }>(r)),
  paymentHealth: (q: { from?: string; to?: string }) =>
    apiClient.get('/online-orders/payment-health', { params: q }).then((r) => unwrap<PaymentHealth>(r)),
  profit: (q: { from?: string; to?: string; integrationId?: string; expenses?: '0' | '1' }) =>
    apiClient.get('/online-orders/profit', { params: q }).then((r) => unwrap<ProfitStatement>(r)),
  team: () => apiClient.get('/online-orders/team').then((r) => unwrap<TeamQueue>(r)),
  waTemplates: () => apiClient.get('/online-orders/wa-templates').then((r) => unwrap<WaTemplates>(r)),
  saveWaTemplates: (templates: Partial<Record<WaTemplateKey, string>>) =>
    apiClient.put('/online-orders/wa-templates', { templates }).then((r) => unwrap<WaTemplates>(r)),
  scamOverview: () => apiClient.get('/online-orders/scam-report').then((r) => unwrap<ScamOverview>(r)),
  reportScam: (id: string, body: { reason: string; evidence?: string }) =>
    apiClient.post(`/online-orders/${id}/report-scam`, body).then((r) => unwrap<{ ok: boolean }>(r)),
};
