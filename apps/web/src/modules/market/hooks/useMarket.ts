/**
 * Shared Market queries: the shop profile, the platform's Market rules and
 * the shop's gate with its effective flow switches.
 */

import { useQuery } from '@tanstack/react-query';
import { currentLocale, msg, t } from '@core/i18n';
import { marketApi, MARKET_GATES, type FlowSettings, type Localized, type MarketConfig, type MarketGate, type MarketProfile } from '../api/market.api';

export const marketKeys = {
  profile: ['market', 'profile'] as const,
  config: ['market', 'config'] as const,
  dashboard: ['market', 'dashboard'] as const,
};

export function useMarketProfile() {
  return useQuery({ queryKey: marketKeys.profile, queryFn: marketApi.profile.get, staleTime: 30_000 });
}

export function useMarketConfig() {
  return useQuery({ queryKey: marketKeys.config, queryFn: marketApi.config, staleTime: 5 * 60_000, retry: 1 });
}

/** Gate names used while the Market rules have not loaded. */
const GATE_FALLBACK: Record<MarketGate, string> = {
  FOOD: msg('Khana'),
  GROCERY: msg('Grocery'),
  PHARMACY: msg('Pharmacy'),
  SHOPPING: msg('Shopping'),
  BOOKING: msg('Booking'),
  WHOLESALE: msg('Wholesale'),
};

/** Picks the text for the screen language from a { en, roman, ur } label. */
export function pickLabel(l: Localized | undefined, fallback = ''): string {
  if (!l) return fallback;
  const loc = currentLocale();
  return (loc === 'ur' ? l.ur : loc === 'en' ? l.en : l.roman) || l.en || fallback;
}

export function gateLabel(gate: MarketGate | null | undefined, config?: MarketConfig): string {
  if (!gate) return '';
  const g = config?.gates.find((x) => x.id === gate);
  return g ? pickLabel(g.label, t(GATE_FALLBACK[gate])) : t(GATE_FALLBACK[gate]);
}

export const isGate = (v: unknown): v is MarketGate => typeof v === 'string' && (MARKET_GATES as readonly string[]).includes(v);

/** The shop's gate: the owner's choice, else what the API resolved from the business type. */
export function shopGate(p: MarketProfile | undefined): MarketGate | null {
  if (!p) return null;
  if (isGate(p.gate)) return p.gate;
  if (isGate(p.resolvedGate)) return p.resolvedGate;
  return null;
}

/** Gate defaults, then the API's merged flow, then the shop's saved switches. */
export function effectiveFlow(p: MarketProfile | undefined, config: MarketConfig | undefined, gate: MarketGate | null): FlowSettings {
  const defaults = config?.gates.find((g) => g.id === gate)?.defaults ?? {};
  return { ...defaults, ...(p?.flow ?? {}), ...(p?.flowSettings ?? {}) };
}

/** Money fields arrive as strings from decimal columns. */
export const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
