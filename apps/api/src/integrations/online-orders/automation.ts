/**
 * Commerce automation: "if this happens and these conditions hold, do
 * that". Pure functions: rule cleaning, condition checks with reasons (for
 * dry-run), the loop guard and the ready-made recipes. The service feeds
 * them facts from orders and products and carries out the actions.
 */

import { RiskLevel } from './customer-risk';
import { sameCity } from './pk-cities';

export const AUTOMATION_EVENTS = ['ORDER_RECEIVED', 'CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'RETURNED', 'PAYMENT_RECEIVED', 'STOCK_LOW'] as const;
export type AutomationEvent = (typeof AUTOMATION_EVENTS)[number];

export const ORDER_ACTIONS = ['SET_STATUS', 'TAG', 'ASSIGN', 'BOOK_COURIER', 'ASK_ADVANCE', 'NOTE', 'NOTIFY'] as const;
export const PRODUCT_ACTIONS = ['HIDE_PRODUCT', 'PUSH_STOCK', 'NOTIFY'] as const;
export type ActionType = (typeof ORDER_ACTIONS)[number] | (typeof PRODUCT_ACTIONS)[number];

/** Board statuses an action may set (lib/orders BOARD minus DELETED). */
const SETTABLE = ['NEW', 'PAY_PENDING', 'ON_HOLD', 'NO_STOCK', 'CUSTOMER_QUERY', 'CONFIRMED', 'PACKED', 'PACKED_NOT_SENT', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'ISSUE', 'CLAIM'];
const RISKS: RiskLevel[] = ['NEW', 'TRUSTED', 'OK', 'WATCH', 'HIGH', 'BLOCKED'];

export interface Conditions {
  /** Order came from one of these channels (empty = any). */
  channelIds: string[];
  /** Customer city is (or, with citiesExclude, is not) one of these; aliases count ("Lhr" = Lahore). */
  cities: string[];
  citiesExclude: boolean;
  amountMin: number | null;
  amountMax: number | null;
  payment: 'ANY' | 'COD' | 'PREPAID';
  /** Customer's returned (RTO) parcels at this shop, at least. */
  rtoMin: number | null;
  /** true = first order from this phone; false = has ordered before; null = either. */
  newCustomer: boolean | null;
  risks: RiskLevel[];
  /** Any item is one of these products (empty = any). */
  productIds: string[];
  /** Order carries any of these tags (empty = any). */
  tags: string[];
  /** Business-time hours, from (inclusive) to (exclusive); from > to wraps midnight. */
  hourFrom: number | null;
  hourTo: number | null;
  /** 0 = Sunday … 6 = Saturday (empty = every day). */
  days: number[];
  /** STOCK_LOW: product stock below this. */
  stockBelow: number | null;
}

export type Action =
  | { type: 'SET_STATUS'; to: string }
  | { type: 'TAG'; tag: string }
  | { type: 'ASSIGN'; userId: string }
  /** courier code, 'BEST' (best in the scorecard for the city) or 'RULES' (auto-booking rules). */
  | { type: 'BOOK_COURIER'; courier: string }
  | { type: 'ASK_ADVANCE'; pct: number }
  | { type: 'NOTE'; text: string }
  | { type: 'NOTIFY'; text: string }
  /** channelId null = every channel Nafaa sends stock to. */
  | { type: 'HIDE_PRODUCT'; channelId: string | null }
  | { type: 'PUSH_STOCK'; channelId: string | null };

export interface AutomationRuleInput {
  name: string;
  event: AutomationEvent;
  conditions: Conditions;
  actions: Action[];
  enabled: boolean;
}

export const emptyConditions = (): Conditions => ({
  channelIds: [], cities: [], citiesExclude: false, amountMin: null, amountMax: null, payment: 'ANY', rtoMin: null, newCustomer: null,
  risks: [], productIds: [], tags: [], hourFrom: null, hourTo: null, days: [], stockBelow: null,
});

const num = (v: unknown, min = 0, max = 1e9) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 100) / 100 : null;
};
const strs = (v: unknown, max: number, len = 64) =>
  (Array.isArray(v) ? v : []).map((x) => String(x ?? '').trim().slice(0, len)).filter(Boolean).slice(0, max);
const hour = (v: unknown) => { const n = num(v, 0, 24); return n === null ? null : Math.floor(n); };

export function normalizeConditions(raw: unknown): Conditions {
  const c = (raw && typeof raw === 'object' ? raw : {}) as any;
  return {
    channelIds: strs(c.channelIds, 20),
    cities: strs(c.cities, 50, 60),
    citiesExclude: c.citiesExclude === true,
    amountMin: num(c.amountMin),
    amountMax: num(c.amountMax),
    payment: c.payment === 'COD' || c.payment === 'PREPAID' ? c.payment : 'ANY',
    rtoMin: num(c.rtoMin, 1, 1000),
    newCustomer: c.newCustomer === true ? true : c.newCustomer === false ? false : null,
    risks: (Array.isArray(c.risks) ? c.risks : []).filter((r: unknown): r is RiskLevel => RISKS.includes(r as RiskLevel)),
    productIds: strs(c.productIds, 50),
    tags: strs(c.tags, 10, 30),
    hourFrom: hour(c.hourFrom),
    hourTo: hour(c.hourTo),
    days: [...new Set((Array.isArray(c.days) ? c.days : []).map(Number).filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6))] as number[],
    stockBelow: num(c.stockBelow, 0, 1e6),
  };
}

const COURIER_RE = /^[A-Z_]{2,20}$/;

export function normalizeAction(raw: unknown, event: AutomationEvent): Action | null {
  const a = (raw && typeof raw === 'object' ? raw : {}) as any;
  const productEvent = event === 'STOCK_LOW';
  const allowed: readonly string[] = productEvent ? PRODUCT_ACTIONS : ORDER_ACTIONS;
  if (!allowed.includes(a.type)) return null;
  const text = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);
  switch (a.type as ActionType) {
    case 'SET_STATUS': return SETTABLE.includes(a.to) || /^custom:[a-z0-9_-]{1,30}$/.test(String(a.to)) ? { type: 'SET_STATUS', to: String(a.to) } : null;
    case 'TAG': return text(a.tag, 30) ? { type: 'TAG', tag: text(a.tag, 30) } : null;
    case 'ASSIGN': return text(a.userId, 64) ? { type: 'ASSIGN', userId: text(a.userId, 64) } : null;
    case 'BOOK_COURIER': return COURIER_RE.test(String(a.courier)) ? { type: 'BOOK_COURIER', courier: String(a.courier) } : null;
    case 'ASK_ADVANCE': { const p = num(a.pct, 1, 100); return { type: 'ASK_ADVANCE', pct: p ?? 30 }; }
    case 'NOTE': return text(a.text, 300) ? { type: 'NOTE', text: text(a.text, 300) } : null;
    case 'NOTIFY': return { type: 'NOTIFY', text: text(a.text, 200) };
    case 'HIDE_PRODUCT': return { type: 'HIDE_PRODUCT', channelId: text(a.channelId, 64) || null };
    case 'PUSH_STOCK': return { type: 'PUSH_STOCK', channelId: text(a.channelId, 64) || null };
  }
  return null;
}

/** Cleans a posted rule; throws a message when it cannot run. */
export function normalizeRule(raw: unknown): AutomationRuleInput {
  const r = (raw && typeof raw === 'object' ? raw : {}) as any;
  const event = AUTOMATION_EVENTS.includes(r.event) ? (r.event as AutomationEvent) : null;
  if (!event) throw new Error('Kab chale — event chunein');
  const actions = (Array.isArray(r.actions) ? r.actions : []).slice(0, 8).map((a: unknown) => normalizeAction(a, event)).filter((a: Action | null): a is Action => !!a);
  if (!actions.length) throw new Error('Kam az kam ek kaam chunein');
  const conditions = normalizeConditions(r.conditions);
  if (event === 'STOCK_LOW' && conditions.stockBelow === null) conditions.stockBelow = 1;
  return { name: String(r.name ?? '').trim().slice(0, 80) || 'Rule', event, conditions, actions, enabled: r.enabled !== false };
}

// ─── Facts and checks ──────────────────────────────────────────

export interface OrderFacts {
  kind: 'order';
  integrationId: string;
  city: string | null;
  amount: number;
  isCod: boolean;
  risk: RiskLevel | null;
  /** Customer's earlier orders at this shop and how many came back. */
  pastOrders: number;
  returns: number;
  productIds: string[];
  tags: string[];
  hour: number;
  weekday: number;
}

export interface ProductFacts {
  kind: 'product';
  productId: string;
  stock: number;
  hour: number;
  weekday: number;
}

export type Facts = OrderFacts | ProductFacts;

export interface Check { key: keyof Conditions | 'event'; ok: boolean; have: string; want: string }

const inHours = (h: number, from: number | null, to: number | null) => {
  if (from === null && to === null) return true;
  const f = from ?? 0;
  const t = to ?? 24;
  return f <= t ? h >= f && h < t : h >= f || h < t;
};

/** Every condition the rule sets, with what the order has and what the rule wants. */
export function checkConditions(c: Conditions, f: Facts): Check[] {
  const out: Check[] = [];
  const add = (key: Check['key'], ok: boolean, have: unknown, want: unknown) => out.push({ key, ok, have: String(have ?? '—'), want: String(want) });
  if (c.hourFrom !== null || c.hourTo !== null) add('hourFrom', inHours(f.hour, c.hourFrom, c.hourTo), `${f.hour}:00`, `${c.hourFrom ?? 0}–${c.hourTo ?? 24}`);
  if (c.days.length) add('days', c.days.includes(f.weekday), f.weekday, c.days.join(','));
  if (f.kind === 'product') {
    if (c.stockBelow !== null) add('stockBelow', f.stock < c.stockBelow, f.stock, `< ${c.stockBelow}`);
    if (c.productIds.length) add('productIds', c.productIds.includes(f.productId), f.productId, c.productIds.length);
    return out;
  }
  if (c.channelIds.length) add('channelIds', c.channelIds.includes(f.integrationId), f.integrationId, c.channelIds.join(','));
  if (c.cities.length) {
    const hit = c.cities.some((x) => sameCity(x, f.city));
    add('cities', c.citiesExclude ? !hit : hit, f.city, `${c.citiesExclude ? 'not ' : ''}${c.cities.join(', ')}`);
  }
  if (c.amountMin !== null) add('amountMin', f.amount >= c.amountMin, f.amount, `>= ${c.amountMin}`);
  if (c.amountMax !== null) add('amountMax', f.amount <= c.amountMax, f.amount, `<= ${c.amountMax}`);
  if (c.payment !== 'ANY') add('payment', c.payment === 'COD' ? f.isCod : !f.isCod, f.isCod ? 'COD' : 'PREPAID', c.payment);
  if (c.rtoMin !== null) add('rtoMin', f.returns >= c.rtoMin, f.returns, `>= ${c.rtoMin}`);
  if (c.newCustomer !== null) add('newCustomer', c.newCustomer ? f.pastOrders === 0 : f.pastOrders > 0, f.pastOrders, c.newCustomer ? '0' : '> 0');
  if (c.risks.length) add('risks', !!f.risk && c.risks.includes(f.risk), f.risk, c.risks.join(','));
  if (c.productIds.length) add('productIds', f.productIds.some((p) => c.productIds.includes(p)), f.productIds.length, c.productIds.length);
  if (c.tags.length) add('tags', f.tags.some((t) => c.tags.includes(t)), f.tags.join(','), c.tags.join(','));
  return out;
}

export function matches(c: Conditions, f: Facts): boolean {
  return checkConditions(c, f).every((x) => x.ok);
}

// ─── Loop guard ────────────────────────────────────────────────

/** A rule's action can raise another event for the same order; chains stop at this depth. */
export const MAX_CHAIN = 3;
/** STOCK_LOW runs once per product per this many hours. */
export const STOCK_REPEAT_HOURS = 24;
/** A rule that runs more than this in RATE_WINDOW_MIN minutes is held (a runaway). */
export const RATE_LIMIT = 300;
export const RATE_WINDOW_MIN = 10;

export interface PriorRun { ruleId: string; subjectId: string; event: string; at: Date; dryRun: boolean }
export type GuardStop = 'CHAIN' | 'ALREADY_RAN' | 'RATE';

/**
 * Should a rule run now? Stops a chain of rules that keep raising events for
 * the same order, a second run of the same rule for the same order and
 * event (orders) or within a day (products), and a runaway rule.
 */
export function guardRun(i: { ruleId: string; subjectId: string; event: AutomationEvent; depth: number; prior: PriorRun[]; now?: number }): GuardStop | null {
  const now = i.now ?? Date.now();
  if (i.depth >= MAX_CHAIN) return 'CHAIN';
  const live = i.prior.filter((p) => !p.dryRun && p.ruleId === i.ruleId);
  const same = live.filter((p) => p.subjectId === i.subjectId && p.event === i.event);
  if (i.event === 'STOCK_LOW') {
    if (same.some((p) => now - p.at.getTime() < STOCK_REPEAT_HOURS * 3600_000)) return 'ALREADY_RAN';
  } else if (same.length) return 'ALREADY_RAN';
  if (live.filter((p) => now - p.at.getTime() < RATE_WINDOW_MIN * 60_000).length >= RATE_LIMIT) return 'RATE';
  return null;
}

/** Order status events (order-events) → automation event. */
export function eventOfStatus(status: string): AutomationEvent | null {
  switch (status) {
    case 'READY': return 'PACKED';
    case 'OUT_FOR_DELIVERY': return 'DISPATCHED';
    case 'DELIVERED': return 'DELIVERED';
    case 'RETURNED': return 'RETURNED';
    case 'SETTLED': return 'PAYMENT_RECEIVED';
    default: return null;
  }
}

// ─── Recipes ───────────────────────────────────────────────────

export const RECIPE_KEYS = ['auto_confirm_prepaid', 'hold_big_cod_new', 'city_courier', 'rto_advance', 'low_stock_unlist'] as const;
export type RecipeKey = (typeof RECIPE_KEYS)[number];

export interface RecipeParams { amount?: number; city?: string; courier?: string; returns?: number; pct?: number; stock?: number }

export const RECIPE_DEFAULTS: Record<RecipeKey, RecipeParams> = {
  auto_confirm_prepaid: {},
  hold_big_cod_new: { amount: 5000 },
  city_courier: { city: 'Lahore', courier: '' },
  rto_advance: { returns: 2, pct: 30 },
  low_stock_unlist: { stock: 2 },
};

/** The rule a recipe switches on, with the shop's numbers filled in. */
export function recipeRule(key: RecipeKey, p: RecipeParams = {}): AutomationRuleInput {
  const v = { ...RECIPE_DEFAULTS[key], ...p };
  const c = emptyConditions();
  switch (key) {
    case 'auto_confirm_prepaid':
      return { name: 'Prepaid order khud confirm', event: 'ORDER_RECEIVED', enabled: true, conditions: { ...c, payment: 'PREPAID' }, actions: [{ type: 'SET_STATUS', to: 'CONFIRMED' }] };
    case 'hold_big_cod_new':
      return {
        name: `Naye customer ka Rs ${v.amount}+ COD hold`, event: 'ORDER_RECEIVED', enabled: true,
        conditions: { ...c, payment: 'COD', amountMin: Number(v.amount) || 5000, newCustomer: true },
        actions: [{ type: 'SET_STATUS', to: 'ON_HOLD' }, { type: 'NOTE', text: 'Bara COD, naya customer — call karke confirm karein' }],
      };
    case 'city_courier':
      if (!v.courier || !COURIER_RE.test(v.courier)) throw new Error('Courier chunein');
      return {
        name: `${v.city} → ${v.courier}`, event: 'CONFIRMED', enabled: true,
        conditions: { ...c, cities: [String(v.city || 'Lahore').slice(0, 60)] }, actions: [{ type: 'BOOK_COURIER', courier: v.courier }],
      };
    case 'rto_advance':
      return {
        name: `${v.returns}+ RTO wale se advance`, event: 'ORDER_RECEIVED', enabled: true,
        conditions: { ...c, payment: 'COD', rtoMin: Math.max(1, Number(v.returns) || 2) }, actions: [{ type: 'ASK_ADVANCE', pct: Number(v.pct) || 30 }],
      };
    case 'low_stock_unlist':
      return {
        name: `Stock ${v.stock} se kam → channel se hatayein`, event: 'STOCK_LOW', enabled: true,
        conditions: { ...c, stockBelow: Math.max(1, Number(v.stock) || 2) }, actions: [{ type: 'HIDE_PRODUCT', channelId: null }],
      };
  }
}

/** The WhatsApp link that asks for an advance (wa.me opens WhatsApp with the text ready; a person presses send). */
export function waLink(phone: string | null, text: string): string | null {
  let d = String(phone ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = `92${d.slice(1)}`;
  if (d.length === 10 && d.startsWith('3')) d = `92${d}`;
  if (d.length < 11) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

/** Advance amount rounded up to the next Rs 10. */
export const advanceAmount = (total: number, pct: number) => Math.ceil((Math.max(0, total) * pct) / 100 / 10) * 10;
