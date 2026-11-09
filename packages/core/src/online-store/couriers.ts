/**
 * Courier logic shared by the screens: auto-booking rule matching (same
 * order of checks as the API's courier-rules.ts), courier name → brand key,
 * and the courier state families.
 */

import type { CourierRule, CourierRules, CourierState } from './types';

const cityKey = (s?: string | null) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '');

export interface RuleOrder {
  city: string | null;
  cod: number;
  risk: string | null;
  integrationId: string;
}

export type RuleDecision =
  | { action: 'BOOK'; courier: string; ruleIndex: number | null; reason: 'risky' | 'blocked' | 'rule' | 'fallback' }
  | { action: 'ASK'; ruleIndex: number | null; reason: 'risky' | 'blocked' | 'rule' | 'none' };

export function ruleFits(rule: CourierRule, o: RuleOrder): boolean {
  if (rule.cities.length && !rule.cities.some((c) => cityKey(c) === cityKey(o.city))) return false;
  if (rule.codMin !== null && o.cod < rule.codMin) return false;
  if (rule.codMax !== null && o.cod > rule.codMax) return false;
  if (rule.risks.length && !rule.risks.includes(o.risk ?? '')) return false;
  if (rule.channelIds.length && !rule.channelIds.includes(o.integrationId)) return false;
  return true;
}

/** Which courier an order goes to under the shop's rules (the first rule that fits decides). */
export function pickCourier(cfg: CourierRules, o: RuleOrder): RuleDecision {
  if (cfg.holdRisky && (o.risk === 'HIGH' || o.risk === 'BLOCKED')) {
    return { action: 'ASK', ruleIndex: null, reason: o.risk === 'BLOCKED' ? 'blocked' : 'risky' };
  }
  for (const [i, rule] of cfg.rules.entries()) {
    if (!ruleFits(rule, o)) continue;
    return rule.action === 'ASK' || !rule.courier
      ? { action: 'ASK', ruleIndex: i, reason: 'rule' }
      : { action: 'BOOK', courier: rule.courier, ruleIndex: i, reason: 'rule' };
  }
  return cfg.fallback
    ? { action: 'BOOK', courier: cfg.fallback, ruleIndex: null, reason: 'fallback' }
    : { action: 'ASK', ruleIndex: null, reason: 'none' };
}

/** A rule that books needs a courier; such rules are dropped by the API on save. */
export const ruleIncomplete = (r: CourierRule) => r.action === 'BOOK' && !r.courier;

export const newRule = (seed: number): CourierRule => ({
  id: `r${Date.now().toString(36)}${seed}`, cities: [], codMin: null, codMax: null, risks: [], channelIds: [], action: 'BOOK', courier: null,
});

/** Moves a rule up (-1) or down (+1). */
export function moveRule(rules: CourierRule[], i: number, by: number): CourierRule[] {
  const next = [...rules];
  const [r] = next.splice(i, 1);
  next.splice(Math.max(0, Math.min(next.length, i + by)), 0, r);
  return next;
}

export type CourierBrand =
  | 'tcs' | 'leopards' | 'postex' | 'trax' | 'mnp' | 'callcourier' | 'blueex' | 'daewoo' | 'tpl' | 'rider' | 'other';

/** Courier code or name shown on an order ("TCS", "M&P", "Apna rider") → brand key. */
export function courierBrand(nameOrCode?: string | null): CourierBrand {
  const k = String(nameOrCode ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  if (!k) return 'other';
  if (k.startsWith('TCS')) return 'tcs';
  if (k.includes('LEOPARD')) return 'leopards';
  if (k.includes('POSTEX')) return 'postex';
  if (k.includes('TRAX')) return 'trax';
  if (k === 'MP' || k === 'MNP' || k.startsWith('MNP') || k.includes('MULLER')) return 'mnp';
  if (k.includes('CALLCOURIER')) return 'callcourier';
  if (k.includes('BLUEEX') || k === 'BLUEX') return 'blueex';
  if (k.includes('DAEWOO')) return 'daewoo';
  if (k.includes('TPL')) return 'tpl';
  if (k.includes('RIDER')) return 'rider';
  return 'other';
}

/** Couriers the dispatch form offers (code + brand name; "Apna rider" and "Doosra" are labels the app translates). */
export const COURIER_CODES = [
  'RIDER', 'TCS', 'LEOPARDS', 'POSTEX', 'TRAX', 'MNP', 'BLUE_EX', 'CALL_COURIER', 'DAEWOO', 'TPL_RIDER',
  'INSTAWORLD', 'SHIPNOC', 'TRANZO', 'SWYFT', 'BARQRAFTAR', 'ZOOM', 'MOVEX', 'FORRUN', 'BYKEA', 'PAKPOST', 'OTHER',
] as const;
export const COURIER_NAMES: Record<(typeof COURIER_CODES)[number], string> = {
  RIDER: 'Rider', TCS: 'TCS', LEOPARDS: 'Leopards', POSTEX: 'PostEx', TRAX: 'Trax', MNP: 'M&P', BLUE_EX: 'BlueEx',
  CALL_COURIER: 'Call Courier', DAEWOO: 'Daewoo FastEx', TPL_RIDER: 'Rider (TPL)',
  INSTAWORLD: 'InstaWorld', SHIPNOC: 'ShipNOC', TRANZO: 'Tranzo', SWYFT: 'Swyft', BARQRAFTAR: 'BarqRaftar', ZOOM: 'Zoom COD',
  MOVEX: 'MoveX', FORRUN: 'Forrun', BYKEA: 'Bykea', PAKPOST: 'Pakistan Post', OTHER: 'Other',
};

export type CourierStateTone = 'neutral' | 'info' | 'brand' | 'warning' | 'success' | 'danger';
export const COURIER_STATE_TONE: Record<CourierState | 'BOOKING', CourierStateTone> = {
  BOOKING: 'neutral', BOOKED: 'info', PICKED_UP: 'info', IN_TRANSIT: 'brand', OUT_FOR_DELIVERY: 'brand', ATTEMPTED: 'warning',
  DELIVERED: 'success', RETURNING: 'danger', RETURNED: 'danger', CANCELLED: 'neutral', UNKNOWN: 'neutral',
};

/** Courier picked from the customer's typed city: exact match on letters only. */
export function findCity<T extends { id: string; name: string }>(cities: T[], typed?: string | null): T | undefined {
  const key = cityKey(typed);
  return key ? cities.find((c) => cityKey(c.name) === key) : undefined;
}
