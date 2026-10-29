/**
 * Selling costs of an online order and its true profit. Pure functions, so
 * the order panel, the online reports, the expense posting and the tests use
 * the same numbers.
 *
 *   courier charge  saved on the order (booking reply, settlement statement or
 *                   typed by hand), else the shop's rate card for the courier:
 *                   base up to `baseKg`, `perKg` for each started kilo above
 *                   it, a city price replacing the base when set
 *   COD fee         % of the COD amount + a fixed amount, per courier
 *   gateway fee     on payment-link money: the fee the gateway reported, else
 *                   the shop's % + fixed for that gateway
 *   packaging       per channel, else the shop default
 *   RTO cost        when a parcel comes back: the return leg, as a % of the
 *                   forward charge (100 = same again, 0 = free returns)
 *
 *   true profit = goods sold − product cost + delivery collected − selling costs
 *
 * Goods sold and product cost come from the order's bill through
 * business-math (bill net less its delivery charge, and the bill cost), so
 * they match the shop's P&L. A returned parcel has a voided bill: no sale and
 * no product cost, only the costs of sending it and bringing it back.
 */

export const COST_KINDS = ['courierCharge', 'codFee', 'gatewayFee', 'packagingCost', 'rtoCost'] as const;
export type CostKind = (typeof COST_KINDS)[number];
export type CostSource = 'API' | 'STATEMENT' | 'MANUAL' | 'POSTED' | 'ESTIMATE' | 'NONE';

export interface CityRate { city: string; base: number }

export interface CourierRate {
  /** Charge up to `baseKg`. */
  base: number;
  baseKg: number;
  /** Charge for each started kilo above `baseKg`. */
  perKg: number;
  /** City prices that replace `base`. */
  cities: CityRate[];
  /** COD fee: % of the COD amount plus a fixed amount. */
  codPct: number;
  codFixed: number;
  /** Return leg as a % of the forward charge. */
  rtoPct: number;
}

export interface GatewayFee { pct: number; fixed: number }

export interface OrderCostSettings {
  /** Post each order's selling costs as an expense (P&L). */
  postExpenses: boolean;
  packaging: { default: number; byChannel: Record<string, number> };
  couriers: Record<string, CourierRate>;
  gateways: Record<string, GatewayFee>;
}

const num = (v: unknown, max = 1_000_000) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0;
};
export const r2 = (v: number) => Math.round(v * 100) / 100;
const cityKey = (s?: string | null) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '');

export const emptyRate = (): CourierRate => ({ base: 0, baseKg: 0.5, perKg: 0, cities: [], codPct: 0, codFixed: 0, rtoPct: 100 });

/** Cleans a saved or posted settings object. `postDefault` applies when the shop never chose. */
export function normalizeCostSettings(raw: unknown, postDefault: boolean): OrderCostSettings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as any;
  const couriers: Record<string, CourierRate> = {};
  for (const [code, r] of Object.entries((s.couriers && typeof s.couriers === 'object' ? s.couriers : {}) as Record<string, any>)) {
    if (!/^[A-Z_]{2,20}$/.test(code) || !r || typeof r !== 'object') continue;
    const seen = new Set<string>();
    couriers[code] = {
      base: r2(num(r.base, 100_000)),
      baseKg: num(r.baseKg, 100) > 0 ? num(r.baseKg, 100) : 0.5,
      perKg: r2(num(r.perKg, 100_000)),
      cities: (Array.isArray(r.cities) ? r.cities : [])
        .map((c: any) => ({ city: String(c?.city ?? '').trim().slice(0, 60), base: r2(num(c?.base, 100_000)) }))
        .filter((c: CityRate) => c.city && !seen.has(cityKey(c.city)) && seen.add(cityKey(c.city)))
        .slice(0, 100),
      codPct: num(r.codPct, 20),
      codFixed: r2(num(r.codFixed, 10_000)),
      rtoPct: r.rtoPct === undefined || r.rtoPct === null || r.rtoPct === '' ? 100 : num(r.rtoPct, 200),
    };
  }
  const gateways: Record<string, GatewayFee> = {};
  for (const [code, g] of Object.entries((s.gateways && typeof s.gateways === 'object' ? s.gateways : {}) as Record<string, any>)) {
    if (!/^[A-Z_]{2,20}$/.test(code) || !g || typeof g !== 'object') continue;
    gateways[code] = { pct: num(g.pct, 20), fixed: r2(num(g.fixed, 10_000)) };
  }
  const byChannel: Record<string, number> = {};
  for (const [id, v] of Object.entries((s.packaging?.byChannel && typeof s.packaging.byChannel === 'object' ? s.packaging.byChannel : {}) as Record<string, unknown>)) {
    if (id.length <= 64 && v !== null && v !== '' && v !== undefined) byChannel[id] = r2(num(v, 100_000));
  }
  return {
    postExpenses: typeof s.postExpenses === 'boolean' ? s.postExpenses : postDefault,
    packaging: { default: r2(num(s.packaging?.default, 100_000)), byChannel },
    couriers,
    gateways,
  };
}

/** Courier charge from the rate card; null when the shop set no rate for this courier. */
export function rateCharge(rate: CourierRate | undefined, city: string | null | undefined, weightKg: number | null | undefined): number | null {
  if (!rate) return null;
  const k = cityKey(city);
  const cityRate = k ? rate.cities.find((c) => cityKey(c.city) === k) : undefined;
  const base = cityRate ? cityRate.base : rate.base;
  if (!(base > 0) && !(rate.perKg > 0)) return null;
  const w = Number(weightKg) > 0 ? Number(weightKg) : rate.baseKg;
  const extra = Math.max(0, Math.ceil(Math.round((w - rate.baseKg) * 1000) / 1000));
  return r2(base + extra * rate.perKg);
}

export const codFeeOf = (rate: CourierRate | undefined, cod: number) =>
  rate && cod > 0 && (rate.codPct > 0 || rate.codFixed > 0) ? r2((cod * rate.codPct) / 100 + rate.codFixed) : 0;

export const rtoCostOf = (rate: CourierRate | undefined, forward: number) => (rate ? r2((forward * rate.rtoPct) / 100) : r2(forward));

/** A courier's charge in a booking reply, when it sends one. */
export function chargeFromBooking(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object') return null;
  const keys = ['deliveryCharges', 'delivery_charges', 'shipmentCharges', 'shipment_charges', 'booked_packet_charges', 'totalCharges', 'total_charges', 'charges'];
  for (const k of keys) {
    const v = Number((raw as any)[k]);
    if (Number.isFinite(v) && v > 0 && v < 100_000) return r2(v);
  }
  return null;
}

export interface CostOrder {
  orderStatus: string;
  isCod: boolean;
  courierCode: string | null;
  customerCity: string | null;
  integrationId: string;
  /** Parcel handed to a rider or courier. */
  dispatched: boolean;
  weightKg: number | null;
  /** COD the courier collects. */
  codAmount: number;
  /** Paid payment-link rows (manual advances are left out). */
  links: Array<{ provider?: string; amount?: unknown; fee?: unknown }>;
  /** Costs saved on the order; null = not known. */
  saved: Partial<Record<CostKind, number | null>>;
  /** Where each saved cost came from. */
  sources?: Partial<Record<CostKind, CostSource>>;
}

export interface CostLine { value: number; source: CostSource }
export type OrderCosts = Record<CostKind, CostLine> & { total: number; estimated: boolean; courierMissing: boolean };

const CANCELLED = ['CANCELLED', 'REJECTED'];

/** Every selling cost of an order: saved values first, the shop's rates for the rest. */
export function orderCosts(o: CostOrder, s: OrderCostSettings): OrderCosts {
  const rate = o.courierCode ? s.couriers[o.courierCode] : undefined;
  const returned = o.orderStatus === 'RETURNED';
  // Cancelled before it left the shop: nothing was spent on it.
  const dead = CANCELLED.includes(o.orderStatus) && !o.dispatched;
  const ownRider = !o.courierCode || o.courierCode === 'RIDER';
  const line = (k: CostKind, est: () => number | null): CostLine => {
    const saved = o.saved[k];
    if (saved !== null && saved !== undefined && Number.isFinite(Number(saved))) {
      return { value: r2(Number(saved)), source: o.sources?.[k] ?? 'MANUAL' };
    }
    if (dead) return { value: 0, source: 'NONE' };
    const v = est();
    return v && v > 0 ? { value: r2(v), source: 'ESTIMATE' } : { value: 0, source: 'NONE' };
  };
  const courierCharge = line('courierCharge', () => (ownRider ? null : rateCharge(rate, o.customerCity, o.weightKg)));
  const codFee = line('codFee', () => (o.isCod && !returned && !ownRider ? codFeeOf(rate, o.codAmount) : 0));
  const rtoCost = line('rtoCost', () => (returned && !ownRider ? rtoCostOf(rate, courierCharge.value) : 0));
  const packagingCost = line('packagingCost', () => s.packaging.byChannel[o.integrationId] ?? s.packaging.default);
  const gatewayFee = line('gatewayFee', () => o.links.reduce((sum, l) => {
    const fee = Number(l.fee);
    if (Number.isFinite(fee) && fee > 0) return sum + fee;
    const g = s.gateways[String(l.provider ?? '').toUpperCase()];
    const amount = Number(l.amount) || 0;
    return g && amount > 0 ? sum + (amount * g.pct) / 100 + g.fixed : sum;
  }, 0));
  const lines = { courierCharge, codFee, gatewayFee, packagingCost, rtoCost };
  return {
    ...lines,
    total: r2(COST_KINDS.reduce((t, k) => t + lines[k].value, 0)),
    estimated: COST_KINDS.some((k) => lines[k].source === 'ESTIMATE'),
    courierMissing: !dead && !ownRider && !rate && (o.saved.courierCharge === null || o.saved.courierCharge === undefined),
  };
}

export interface BillPart {
  /** Bill total less refunds; 0 when there is no live bill. */
  net: number;
  /** Cost of the goods the customer kept. */
  cost: number;
  /** Delivery charged on the bill (its service charges). */
  delivery: number;
}

export interface OrderProfit {
  /** Goods sold: bill net less its delivery charge. */
  sale: number;
  cost: number;
  deliveryCollected: number;
  sellingCosts: number;
  profit: number;
  /** Profit as a % of what the customer paid; null without a sale. */
  margin: number | null;
}

export function orderProfit(bill: BillPart | null, costs: Pick<OrderCosts, 'total'>): OrderProfit {
  const net = bill ? Math.max(0, bill.net) : 0;
  const delivery = bill ? Math.min(Math.max(0, bill.delivery), net) : 0;
  const cost = bill ? bill.cost : 0;
  const profit = r2(net - cost - costs.total);
  return {
    sale: r2(net - delivery), cost: r2(cost), deliveryCollected: r2(delivery), sellingCosts: r2(costs.total),
    profit, margin: net > 0 ? Math.round((profit / net) * 1000) / 10 : null,
  };
}

/** What a posted expense should hold for an order: the saved and estimated costs, by kind. */
export function postableCosts(c: OrderCosts): { amount: number; parts: Array<{ kind: CostKind; value: number }> } {
  const parts = COST_KINDS.map((kind) => ({ kind, value: c[kind].value })).filter((p) => p.value > 0);
  return { amount: r2(parts.reduce((t, p) => t + p.value, 0)), parts };
}

export const COST_LABEL: Record<CostKind, string> = {
  courierCharge: 'Courier', codFee: 'COD fee', gatewayFee: 'Gateway fee', packagingCost: 'Packaging', rtoCost: 'Wapsi (RTO)',
};
