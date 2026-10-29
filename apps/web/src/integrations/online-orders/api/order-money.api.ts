/**
 * Online order money beyond the order itself: selling costs and true profit,
 * the shop's rate cards, COD statement reconciliation, courier auto-booking
 * rules and courier suggestions, and the per-order delivery choice.
 */

import { apiClient } from '@core/api/client';
import type { DeliveryMode, OnlineOrder } from './online-orders.api';

function unwrap<T>(r: any): T {
  if (r?.data?.data !== undefined) return r.data.data as T;
  if (r?.data !== undefined) return r.data as T;
  return r as T;
}

export const COST_KINDS = ['courierCharge', 'codFee', 'gatewayFee', 'packagingCost', 'rtoCost'] as const;
export type CostKind = (typeof COST_KINDS)[number];
export type CostSource = 'API' | 'STATEMENT' | 'MANUAL' | 'POSTED' | 'ESTIMATE' | 'NONE';
export interface CostLine { value: number; source: CostSource }
export type OrderCosts = Record<CostKind, CostLine> & { total: number; estimated: boolean; courierMissing: boolean };
export interface OrderProfit { sale: number; cost: number; deliveryCollected: number; sellingCosts: number; profit: number; margin: number | null }

export interface CourierRate { base: number; baseKg: number; perKg: number; cities: Array<{ city: string; base: number }>; codPct: number; codFixed: number; rtoPct: number }
export interface CostSettings {
  postExpenses: boolean;
  packaging: { default: number; byChannel: Record<string, number> };
  couriers: Record<string, CourierRate>;
  gateways: Record<string, { pct: number; fixed: number }>;
  chosen: boolean;
}
export interface CostSettingsView {
  settings: CostSettings;
  channels: Array<{ id: string; type: string; displayName: string; platform: string | null }>;
  couriers: Array<{ code: string; name: string }>;
}

type Agg = { orders: number; sale: number; cost?: number; deliveryCollected: number; profit?: number; margin?: number | null; estimated: number; sellingCosts: number } & Record<CostKind, number>;
export interface ProfitReport {
  range: { from: string; to: string };
  posting: boolean;
  missingRates: Array<{ code: string; name: string }>;
  totals: Agg;
  byChannel: Array<Agg & { name: string; type: string }>;
  byCourier: Array<Agg & { code: string; name: string }>;
  byCity: Array<Agg & { city: string }>;
  byProduct: Array<Agg & { name: string; qty: number }>;
}

export const STATEMENT_FIELDS = ['cn', 'orderRef', 'amount', 'charge', 'codFee', 'tax', 'net', 'status'] as const;
export type StatementField = (typeof STATEMENT_FIELDS)[number];
export type ColumnMap = Partial<Record<StatementField, number>>;
export interface ReconcileMatch {
  orderId: string; number: string; customerName: string; city: string | null; cn: string | null; by: 'CN' | 'ORDER'; line: number;
  expected: number; received: number; diff: number; ok: boolean; charge: number; codFee: number; net: number | null; status: string | null;
  settled: boolean; returned: boolean; orderStatus: string;
}
export interface ReconcileResult {
  headers: string[]; detected: ColumnMap; mapping: ColumnMap; needs: string[]; rows: number;
  courier?: { code: string; name: string } | null;
  hasCharges?: boolean; hasCodFee?: boolean;
  matched?: ReconcileMatch[];
  unknown?: Array<{ line: number; cn: string | null; orderRef: string | null; amount: number; charge: number; status: string | null }>;
  missing?: Array<{ orderId: string; number: string; cn: string | null; customerName: string; city: string | null; expected: number; deliveredAt: string | null; days: number | null }>;
  totals?: { statement: number; charges: number; matchedExpected: number; matchedReceived: number; missingValue: number; unknownValue: number };
}

export type RuleTrigger = 'OFF' | 'ACCEPT' | 'READY';
export interface CourierRule {
  id: string; cities: string[]; codMin: number | null; codMax: number | null; risks: string[]; channelIds: string[];
  action: 'BOOK' | 'ASK'; courier: string | null;
}
export interface CourierRules { trigger: RuleTrigger; rules: CourierRule[]; fallback: string | null; holdRisky: boolean }
export interface CourierRulesView {
  rules: CourierRules; saved: boolean;
  couriers: Array<{ code: string; name: string; api: boolean; connected: boolean }>;
}
export interface CourierSuggest {
  city: string | null; basis: 'CITY' | 'ALL'; sample: number;
  couriers: Array<{ code: string; name: string; sent: number; delivered: number; returned: number; successRate: number | null; avgCharge: number | null; score: number; best: boolean }>;
}

export const orderMoneyApi = {
  costSettings: () => apiClient.get('/online-orders/costs/settings').then((r) => unwrap<CostSettingsView>(r)),
  saveCostSettings: (body: Partial<CostSettings>) =>
    apiClient.put('/online-orders/costs/settings', body).then((r) => unwrap<{ settings: CostSettings }>(r)),
  setCosts: (id: string, body: Partial<Record<CostKind, number | null>>) =>
    apiClient.post(`/online-orders/${id}/costs`, body).then((r) => unwrap<{ costs: OrderCosts; profit?: OrderProfit }>(r)),
  profitReport: (q: { from?: string; to?: string; integrationId?: string }) =>
    apiClient.get('/online-orders/report/profit', { params: q }).then((r) => unwrap<ProfitReport>(r)),
  reconcile: (body: { headers: string[]; rows: unknown[][]; mapping?: ColumnMap; courier?: string }) =>
    apiClient.post('/online-orders/cod/reconcile', body).then((r) => unwrap<ReconcileResult>(r)),
  settleStatement: (body: { reference?: string; withCharges?: boolean; items: Array<{ orderId: string; received: number; charge?: number | null; codFee?: number | null }> }) =>
    apiClient.post('/online-orders/cod/reconcile/settle', body).then((r) => unwrap<{ settled: number; charged: number; skipped: number }>(r)),
  courierRules: () => apiClient.get('/online-orders/courier-rules').then((r) => unwrap<CourierRulesView>(r)),
  saveCourierRules: (body: CourierRules) => apiClient.put('/online-orders/courier-rules', body).then((r) => unwrap<CourierRulesView>(r)),
  courierSuggest: (id: string) => apiClient.get(`/online-orders/${id}/courier-suggest`).then((r) => unwrap<CourierSuggest>(r)),
  setDelivery: (id: string, mode: DeliveryMode) => apiClient.post(`/online-orders/${id}/delivery`, { mode }).then((r) => unwrap<OnlineOrder>(r)),
};

export const COST_LABEL: Record<CostKind, string> = {
  courierCharge: 'Courier charge', codFee: 'COD fee', gatewayFee: 'Gateway fee', packagingCost: 'Packaging', rtoCost: 'Wapsi (RTO)',
};

export interface ScanLine { index: number; name: string; variant: string | null; quantity: number; image: string | null; codes: string[]; matched: boolean }
export interface ScanOrder {
  id: string; number: string; orderStatus: string; paymentStatus: string; customerName: string; customerCity: string | null; total: number;
  courierCode: string | null; courierLabel: string | null; trackingNumber: string | null; courierBooked: boolean; shopId: string | null;
  packed: { at: string; by: string } | null;
  rtoReceived: { at: string; damaged: Array<{ index: number; qty: number }>; failed: string[] } | null;
  lines: ScanLine[];
  canPack: boolean; packProblem: string | null; canReturn: boolean; returnProblem: string | null;
}
export interface RiskSettings { askAdvance: boolean; advancePct: number }

export const scanApi = {
  lookup: (code: string) => apiClient.get('/online-orders/scan', { params: { code } }).then((r) => unwrap<ScanOrder>(r)),
  packed: (id: string, counts: Record<number, number>, manual: number[]) =>
    apiClient.post(`/online-orders/${id}/packed`, { counts, manual }).then((r) => unwrap<{ ok: true; order: ScanOrder }>(r)),
  rtoReceive: (id: string, damaged: Record<number, number>, reason?: string) =>
    apiClient.post(`/online-orders/${id}/rto-receive`, { damaged, reason }).then((r) => unwrap<{ ok: true; restocked: number; damaged: number; failed: string[]; rtoCost: number; order: ScanOrder }>(r)),
  riskSettings: () => apiClient.get('/online-orders/risk/settings').then((r) => unwrap<RiskSettings>(r)),
  saveRiskSettings: (body: Partial<RiskSettings>) => apiClient.put('/online-orders/risk/settings', body).then((r) => unwrap<RiskSettings>(r)),
};
