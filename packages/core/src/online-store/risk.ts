/**
 * Fake-order and RTO risk display rules. The API scores the customer
 * (customer-risk.ts); these decide what the screens show for it.
 */

import type { CustomerRisk } from './types';

export type RiskLevel = CustomerRisk['level'];
export const RISK_LEVELS: RiskLevel[] = ['NEW', 'TRUSTED', 'OK', 'WATCH', 'HIGH', 'BLOCKED'];

export type RiskTone = 'info' | 'success' | 'neutral' | 'warning' | 'danger' | 'inverse';
export const RISK_TONE: Record<RiskLevel, RiskTone> = {
  NEW: 'info',
  TRUSTED: 'success',
  OK: 'neutral',
  WATCH: 'warning',
  HIGH: 'danger',
  BLOCKED: 'inverse',
};

/** Badge in lists: only when there is something worth saying. */
export const showRiskBadge = (risk?: CustomerRisk | null) => !!risk && risk.level !== 'OK';

/** Risky enough to ask for an advance / hold the parcel. */
export const isRisky = (risk?: CustomerRisk | null) => risk?.level === 'HIGH' || risk?.level === 'WATCH' || risk?.level === 'BLOCKED';

/** Shield icon kind for the detail card. */
export const riskIcon = (level: RiskLevel): 'alert' | 'question' | 'check' =>
  level === 'HIGH' || level === 'WATCH' || level === 'BLOCKED' ? 'alert' : level === 'NEW' ? 'question' : 'check';

/** Every reason behind the level, most serious first (older API: the single reason). */
export const riskReasons = (risk: CustomerRisk) => ((risk.reasons?.length ?? 0) > 0 ? risk.reasons! : [risk.reason].filter(Boolean));

/** Pakistani mobile in WhatsApp form: 03001234567 → 923001234567; null when too short. */
export function waNumber(phone?: string | null): string | null {
  const d = String(phone ?? '').replace(/\D/g, '');
  if (d.length < 10) return null;
  if (d.startsWith('92')) return d;
  if (d.startsWith('0')) return '92' + d.slice(1);
  if (d.length === 10) return '92' + d;
  return d;
}

