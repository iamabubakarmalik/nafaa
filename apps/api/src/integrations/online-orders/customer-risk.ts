/**
 * Customer ka bharosa — isi dukaan ke pichhle online orders (phone se).
 * Pakistan me COD ka sab se bada nuqsan RTO (parcel wapas) hai: courier
 * ka kharcha dono taraf, maal phansa. Pehle se pata ho to call karke
 * confirm karein ya advance maangein.
 */
export type RiskLevel = 'NEW' | 'TRUSTED' | 'OK' | 'WATCH' | 'HIGH' | 'BLOCKED';

export interface CustomerHistory {
  total: number;
  delivered: number;
  returned: number;
  cancelled: number;
  open: number;
  spent: number;
}

export interface CustomerRisk extends CustomerHistory {
  level: RiskLevel;
  label: string;
  reason: string;
  /** Isi customer ke abhi khule (deliver/cancel nahi hue) doosre orders — dobara order? */
  duplicateOpen?: number;
  /** Every reason behind the level, in Roman Urdu, most serious first. */
  reasons?: string[];
}

/** Block list me ho to sab se upar */
export function blockedRisk(h: CustomerHistory, reason?: string | null): CustomerRisk {
  return { ...h, level: 'BLOCKED', label: 'Block kiya hua', reason: reason ? `Block: ${reason}` : 'Aap ne ye number block kiya hai — order accept na karein' };
}

/** 0300-1234567 / +92 300… / 3001234567 → "3001234567" (aakhri 10) */
export const phoneKey = (p?: string | null) => {
  const d = String(p ?? '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : null;
};

export function riskOf(h: CustomerHistory): CustomerRisk {
  const r = (level: RiskLevel, label: string, reason: string): CustomerRisk => ({ ...h, level, label, reason });
  if (h.total === 0) return r('NEW', 'Naya customer', 'Pehla order — COD ho to call karke confirm kar lein');
  if (h.returned >= 2 || (h.returned >= 1 && h.delivered === 0)) {
    return r('HIGH', 'RTO khatra', `${h.returned} parcel wapas kiye${h.delivered ? `, ${h.delivered} liye` : ', ek bhi nahi liya'} — advance ya call confirm`);
  }
  if (h.returned === 1) return r('WATCH', 'Dhyan se', `1 parcel wapas kiya, ${h.delivered} liye`);
  if (h.cancelled >= 3 && h.delivered === 0) return r('WATCH', 'Dhyan se', `${h.cancelled} order cancel, koi deliver nahi`);
  if (h.delivered >= 2) return r('TRUSTED', 'Bharosemand', `${h.delivered} order le chuka, koi wapas nahi`);
  return r('OK', 'Theek', `${h.delivered} order le chuka`);
}

export const emptyHistory = (): CustomerHistory => ({ total: 0, delivered: 0, returned: 0, cancelled: 0, open: 0, spent: 0 });

/** Signals about one order beyond the customer's history. */
export interface OrderSignals {
  /** COD the customer pays on delivery. */
  cod: number;
  /** The shop's average delivered order value (last 90 days); null when unknown. */
  avgOrder: number | null;
  /** Minutes to the nearest other order from the same phone; null when none. */
  nearestOrderMinutes: number | null;
  /** Customer city is in a connected courier's city list: true, false, or null when unknown. */
  cityCovered: boolean | null;
  city: string | null;
}

const RANK: Record<RiskLevel, number> = { TRUSTED: 0, OK: 1, NEW: 2, WATCH: 3, HIGH: 4, BLOCKED: 5 };
/** A same-phone order this close is likely a repeat by mistake or a fake. */
export const DUPLICATE_MINUTES = 30;
const rs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

/**
 * Adds the order's own warning signs to the customer's history risk: returns
 * and repeated cancellations on this phone, a city no connected courier
 * serves, a very high COD from a new customer, and another order from the
 * same phone within minutes. The level only goes up; a blocked number stays
 * blocked. Two warning signs on a new customer make it HIGH.
 */
export function withSignals(base: CustomerRisk, s: OrderSignals): CustomerRisk {
  const reasons: string[] = [];
  let level = base.level;
  const raise = (to: RiskLevel) => { if (RANK[to] > RANK[level]) level = to; };
  if (base.level === 'BLOCKED') reasons.push(base.reason);
  if (base.returned > 0) reasons.push(`Is number se ${base.returned} parcel pehle wapas aaye${base.delivered ? `, ${base.delivered} liye` : ', ek bhi nahi liya'}`);
  if (base.cancelled >= 2) {
    reasons.push(`${base.cancelled} order pehle cancel hue`);
    if (base.delivered === 0) raise('WATCH');
  }
  let warnings = 0;
  if (s.nearestOrderMinutes !== null && s.nearestOrderMinutes <= DUPLICATE_MINUTES) {
    reasons.push(`Isi number se ${Math.max(1, Math.round(s.nearestOrderMinutes))} minute ke farq se doosra order bhi aaya — dobara to nahi?`);
    raise('WATCH'); warnings++;
  }
  if (s.cityCovered === false && s.city) {
    reasons.push(`"${s.city}" jure courier ki shehar list me nahi — address aur shehar dobara poochein`);
    raise('WATCH'); warnings++;
  }
  const high = Math.max(15_000, (s.avgOrder ?? 0) * 3);
  if (base.total === 0 && s.cod >= high) {
    reasons.push(`Naya customer aur COD bahut zyada (${rs(s.cod)})${s.avgOrder ? ` — aap ka ausat order ${rs(s.avgOrder)}` : ''}`);
    raise(s.cod >= Math.max(30_000, (s.avgOrder ?? 0) * 5) ? 'HIGH' : 'WATCH'); warnings++;
  }
  if (base.level === 'NEW' && warnings >= 2) raise('HIGH');
  if (!reasons.length) return { ...base, reasons: [base.reason] };
  if (base.level !== 'BLOCKED' && base.returned === 0 && base.cancelled < 2) reasons.push(base.reason);
  const label = level === base.level ? base.label : level === 'HIGH' ? 'RTO khatra' : 'Dhyan se';
  return { ...base, level, label, reason: reasons[0], reasons };
}
