/**
 * Commerce phase 6 API: live parcel map and order journey, the multi-courier
 * scorecard, automation rules and the seller setup.
 */

import { apiClient } from '@core/api/client';
import { unwrap, type OnlineOrder } from './online-orders.api';

// ─── Map and journey ──────────────────────────────────────────────

export type ParcelState = 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'FAILED' | 'STUCK' | 'RETURNING' | 'DELIVERED';
export const PARCEL_STATES: ParcelState[] = ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'FAILED', 'STUCK', 'RETURNING', 'DELIVERED'];

export interface Place { name: string; lat: number; lng: number }
export interface Rider { name?: string; phone?: string }

export interface MapCity extends Place {
  key: string;
  province: string;
  total: number;
  counts: Record<ParcelState, number>;
  top: ParcelState;
}

export interface MapParcel {
  id: string;
  number: string;
  customerName: string;
  customerPhone: string | null;
  city: string | null;
  destination: string | null;
  seen: string | null;
  seenKnown: boolean;
  state: ParcelState;
  courierCode: string | null;
  courierName: string | null;
  trackingNumber: string | null;
  lastEvent: string | null;
  lastAt: string | null;
  rider: Rider | null;
  daysOut: number | null;
  attempts: number;
  cod: number;
  stage: string | null;
  integrationId: string;
  reattemptAsked: boolean;
}

export interface ParcelMap {
  at: string;
  by: 'destination' | 'seen';
  counts: Record<ParcelState, number>;
  total: number;
  cities: MapCity[];
  unplaced: { name: string; count: number }[];
  noCity: number;
  origin: Place | null;
  couriers: { code: string; name: string | null }[];
  parcels: MapParcel[];
  attention: { stuck: MapParcel[]; failed: MapParcel[]; returning: MapParcel[] };
  capped: boolean;
}

export type JourneyStepKey = 'BOOKED' | 'PICKED_UP' | 'AT_ORIGIN_HUB' | 'IN_TRANSIT' | 'AT_DESTINATION_HUB' | 'OUT_FOR_DELIVERY' | 'END';

export interface JourneyStep {
  key: JourneyStepKey;
  outcome?: 'DELIVERED' | 'RETURNED';
  reached: boolean;
  inferred: boolean;
  current: boolean;
  at: string | null;
  city: string | null;
  text: string | null;
  rider: Rider | null;
}

export interface Journey {
  steps: JourneyStep[];
  outcome: 'DELIVERED' | 'RETURNED' | null;
  returning: boolean;
  attempts: number;
  rider: Rider | null;
  origin: Place | null;
  destination: Place | null;
  path: Place[];
  here: Place | null;
  last?: { at: string | null; text: string; city: string | null } | null;
  courierName?: string | null;
  trackingNumber?: string | null;
  syncedAt?: string | null;
  hasCourier?: boolean;
}

// ─── Scorecard ────────────────────────────────────────────────────

export interface CourierScore {
  code: string;
  name: string | null;
  connected: boolean;
  sent: number;
  delivered: number;
  returned: number;
  open: number;
  deliveryRate: number | null;
  rtoRate: number | null;
  avgDays: number | null;
  firstAttemptRate: number | null;
  firstAttemptSample: number;
  stuck: number;
  codOnTimeRate: number | null;
  avgPayDelay: number | null;
  codSample: number;
  costPerParcel: number | null;
  claims: number;
}

export interface CityScore {
  city: string;
  parcels: number;
  best: string | null;
  bestName: string | null;
  bestRate: number | null;
  runnerUp: string | null;
  runnerUpName: string | null;
  bookable: boolean;
  couriers: { code: string; sent: number; deliveryRate: number | null; avgDays: number | null; best: boolean }[];
}

export interface Scorecard {
  from: string;
  to: string;
  onTimeDays: number;
  sample: number;
  capped: boolean;
  couriers: CourierScore[];
  bestOverall: string | null;
  cities: CityScore[];
  connected: string[];
  autoBooking: { trigger: string; applied: { city: string; courier: string | null }[] };
}

// ─── Automation ───────────────────────────────────────────────────

export type AutomationEvent = 'ORDER_RECEIVED' | 'CONFIRMED' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'RETURNED' | 'PAYMENT_RECEIVED' | 'STOCK_LOW';
export const AUTOMATION_EVENTS: AutomationEvent[] = ['ORDER_RECEIVED', 'CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'RETURNED', 'PAYMENT_RECEIVED', 'STOCK_LOW'];

export interface Conditions {
  channelIds: string[];
  cities: string[];
  citiesExclude: boolean;
  amountMin: number | null;
  amountMax: number | null;
  payment: 'ANY' | 'COD' | 'PREPAID';
  rtoMin: number | null;
  newCustomer: boolean | null;
  risks: string[];
  productIds: string[];
  tags: string[];
  hourFrom: number | null;
  hourTo: number | null;
  days: number[];
  stockBelow: number | null;
}

export type AutomationAction =
  | { type: 'SET_STATUS'; to: string }
  | { type: 'TAG'; tag: string }
  | { type: 'ASSIGN'; userId: string }
  | { type: 'BOOK_COURIER'; courier: string }
  | { type: 'ASK_ADVANCE'; pct: number }
  | { type: 'NOTE'; text: string }
  | { type: 'NOTIFY'; text: string }
  | { type: 'REVIEW_REQUEST' }
  | { type: 'HIDE_PRODUCT'; channelId: string | null }
  | { type: 'PUSH_STOCK'; channelId: string | null };
export type ActionType = AutomationAction['type'];

export interface AutomationRule {
  id: string;
  name: string;
  event: AutomationEvent;
  conditions: Conditions;
  actions: AutomationAction[];
  enabled: boolean;
  recipe: string | null;
  runCount: number;
  lastRunAt: string | null;
}

export type RuleDraft = Pick<AutomationRule, 'name' | 'event' | 'conditions' | 'actions' | 'enabled'>;

export type RecipeKey = 'auto_confirm_prepaid' | 'hold_big_cod_new' | 'city_courier' | 'rto_advance' | 'low_stock_unlist' | 'review_after_delivery';
export interface RecipeParams { amount?: number; city?: string; courier?: string; returns?: number; pct?: number; stock?: number }

export interface ActionResult { type: ActionType; ok: boolean; text: string; link?: string | null }

export interface AutomationRun {
  id: string;
  ruleId: string;
  ruleName: string;
  event: AutomationEvent;
  subjectType: 'ORDER' | 'PRODUCT';
  subjectId: string;
  subject: string;
  dryRun: boolean;
  status: 'DONE' | 'PARTIAL' | 'FAILED' | 'SKIPPED';
  results: ActionResult[] | null;
  at: string;
}

export interface AutomationOverview {
  events: AutomationEvent[];
  rules: AutomationRule[];
  recipes: { key: RecipeKey; defaults: RecipeParams; params: RecipeParams; ruleId: string | null; enabled: boolean }[];
  runs: AutomationRun[];
  staff: { id: string; name: string }[];
  dryRunOnly: boolean;
}

export interface DryRunResult {
  event: AutomationEvent;
  checked: number;
  matched: number;
  results: {
    subjectType: 'ORDER' | 'PRODUCT';
    id: string;
    label: string;
    matched: boolean;
    checks: { key: string; ok: boolean; have: string; want: string }[];
    actions: ActionResult[];
  }[];
}

// ─── Setup ────────────────────────────────────────────────────────

export type SellPlace = 'WEBSITE' | 'SHOPIFY' | 'WOOCOMMERCE' | 'DARAZ' | 'INSTAGRAM' | 'FACEBOOK' | 'WHATSAPP' | 'TIKTOK' | 'FOODPANDA';

export interface SetupAnswers {
  places: SellPlace[];
  couriers: string[];
  codShare: 'MOST' | 'HALF' | 'FEW';
  team: 'SOLO' | 'SMALL' | 'LARGE';
  confirmBy: 'CALL' | 'WHATSAPP' | 'BOTH' | 'NONE';
  packScan: boolean;
}

export interface SetupDefaults {
  homeTiles: string[];
  hiddenTiles: string[];
  hiddenNav: string[];
  pinnedNav: string[];
  recipes: { key: RecipeKey; params: RecipeParams }[];
  courierFallback: string | null;
  confirmText: string | null;
}

export interface SetupProfile {
  answers: SetupAnswers | null;
  doneAt: string | null;
  skippedAt: string | null;
  homeTiles: string[];
  hiddenTiles: string[];
  hiddenNav: string[];
  pinnedNav: string[];
  connectedCouriers: string[];
  preview: SetupDefaults | null;
}

export const insightsApi = {
  map: (q: { courier?: string; status?: string; from?: string; to?: string; integrationId?: string; by?: string }) =>
    apiClient.get('/online-orders/tracking/map', { params: q }).then((r) => unwrap<ParcelMap>(r)),
  journey: (id: string) => apiClient.get(`/online-orders/tracking/order/${id}`).then((r) => unwrap<Journey>(r)),
  reattempt: (id: string, note?: string) =>
    apiClient.post(`/online-orders/tracking/order/${id}/reattempt`, { note }).then((r) => unwrap<{ ok: boolean; text: string; order: OnlineOrder }>(r)),

  score: (q: { from?: string; to?: string }) => apiClient.get('/online-orders/couriers-score', { params: q }).then((r) => unwrap<Scorecard>(r)),
  applyBest: (cities?: string[]) =>
    apiClient.post('/online-orders/couriers-score/apply-best', { cities }).then((r) => unwrap<{ applied: number; skipped: number; trigger: string; rules: { city: string; courier: string; name: string | null }[] }>(r)),

  automation: () => apiClient.get('/online-orders/automation').then((r) => unwrap<AutomationOverview>(r)),
  runs: (q: { ruleId?: string; orderId?: string; limit?: number }) => apiClient.get('/online-orders/automation/runs', { params: q }).then((r) => unwrap<AutomationRun[]>(r)),
  createRule: (rule: RuleDraft) => apiClient.post('/online-orders/automation/rules', rule).then((r) => unwrap<AutomationRule>(r)),
  updateRule: (id: string, rule: RuleDraft) => apiClient.put(`/online-orders/automation/rules/${id}`, rule).then((r) => unwrap<AutomationRule>(r)),
  setEnabled: (id: string, enabled: boolean) => apiClient.post(`/online-orders/automation/rules/${id}/enabled`, { enabled }).then((r) => unwrap<AutomationRule>(r)),
  deleteRule: (id: string) => apiClient.delete(`/online-orders/automation/rules/${id}`).then((r) => unwrap<{ ok: boolean }>(r)),
  recipe: (key: RecipeKey, body: { enabled: boolean; params?: RecipeParams }) =>
    apiClient.post(`/online-orders/automation/recipes/${key}`, body).then((r) => unwrap<AutomationRule | null>(r)),
  dryRun: (body: { rule?: RuleDraft; ruleId?: string; orderId?: string }) => apiClient.post('/online-orders/automation/dry-run', body).then((r) => unwrap<DryRunResult>(r)),

  setup: () => apiClient.get('/online-orders/setup').then((r) => unwrap<SetupProfile>(r)),
  setupPreview: (answers: SetupAnswers) => apiClient.post('/online-orders/setup/preview', { answers }).then((r) => unwrap<SetupDefaults>(r)),
  finishSetup: (body: { answers: SetupAnswers; recipes: RecipeKey[]; autoBooking: boolean }) =>
    apiClient.post('/online-orders/setup', body).then((r) => unwrap<{ ok: boolean; profile: SetupProfile; applied: { recipes: string[]; autoBooking: string; confirmText: boolean; fallback: string | null } }>(r)),
  skipSetup: () => apiClient.post('/online-orders/setup/skip').then((r) => unwrap<SetupProfile>(r)),
  savePrefs: (body: Partial<Pick<SetupProfile, 'homeTiles' | 'hiddenTiles' | 'hiddenNav' | 'pinnedNav'>>) =>
    apiClient.put('/online-orders/setup/prefs', body).then((r) => unwrap<SetupProfile>(r)),
};
