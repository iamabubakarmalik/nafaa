/**
 * Plan and add-on answers from the API, kept for the app-wide prompts.
 *
 * - 403 ADDON_REQUIRED / PLAN_FEATURE_REQUIRED and 402 PLAN_LIMIT open one
 *   upgrade dialog (modules/billing/pricing/components/UpsellHost).
 * - 402 TRIAL_EXPIRED / SUBSCRIPTION_EXPIRED / NO_SUBSCRIPTION mark the plan
 *   as ended, which shows the full-screen plan gate (PlanGate).
 * - 403 SHOP_PAUSED marks the shop as paused by Nafaa, which shows the
 *   full-screen paused notice (also in PlanGate).
 *
 * The axios interceptor in client.ts calls noteBillingResponse(); screens and
 * the sidebar may also open the dialog themselves with openUpsell().
 * Nothing here touches the offline queue: queued sales stay queued.
 */

import { useSyncExternalStore } from 'react';

export type UpsellKind = 'addon' | 'feature' | 'limit';

export interface UpsellRequest {
  kind: UpsellKind;
  /** Feature key, e.g. "loyalty" or "integration.shopify". */
  feature?: string | null;
  /** Add-on that unlocks it, when one does. */
  addOnKey?: string | null;
  /** For limits: which limit, how many are used and the cap. */
  limit?: string | null;
  current?: number | null;
  max?: number | null;
  /** The server's sentence, already translated by the client. */
  message?: string | null;
}

export type PlanEndedCode = 'TRIAL_EXPIRED' | 'SUBSCRIPTION_EXPIRED' | 'NO_SUBSCRIPTION';

export interface PlanEndedNotice {
  code: PlanEndedCode;
  message: string;
  /** When the trial or plan ended, if the API said. */
  expiredAt: string | null;
}

export interface ShopPausedNotice {
  /** The reason Nafaa gave, or the API's default sentence. */
  message: string;
  /** When the pause ends; null = until Nafaa lifts it. */
  until: string | null;
  /** When this answer arrived (ms), to compare with fresher entitlements. */
  at: number;
}

const ENDED_CODES = new Set<string>(['TRIAL_EXPIRED', 'SUBSCRIPTION_EXPIRED', 'NO_SUBSCRIPTION']);

function store<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next: T) => {
      if (next === value) return;
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => { listeners.delete(l); };
    },
  };
}

const upsell = store<UpsellRequest | null>(null);
const ended = store<PlanEndedNotice | null>(null);
const paused = store<ShopPausedNotice | null>(null);

export const openUpsell = (request: UpsellRequest) => upsell.set(request);
export const closeUpsell = () => upsell.set(null);
export const clearPlanEnded = () => ended.set(null);
export const clearShopPaused = () => paused.set(null);

/** Reads a refused request; returns true when it was a plan or add-on answer. */
export function noteBillingResponse(status: number | undefined, body: unknown): boolean {
  const b = body as { code?: unknown; message?: unknown; feature?: unknown; addOnKey?: unknown; limit?: unknown; current?: unknown; max?: unknown; expiredAt?: unknown } | undefined;
  const code = typeof b?.code === 'string' ? b.code : null;
  if (!code) return false;
  const message = typeof b?.message === 'string' ? b.message : null;
  const str = (v: unknown) => (typeof v === 'string' && v ? v : null);
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  if (status === 402 && ENDED_CODES.has(code)) {
    if (!ended.get()) ended.set({ code: code as PlanEndedCode, message: message ?? '', expiredAt: str(b?.expiredAt) });
    return true;
  }
  if (status === 403 && code === 'SHOP_PAUSED') {
    const prev = paused.get();
    const until = str(b?.expiredAt);
    if (!prev || prev.message !== (message ?? '') || prev.until !== until) paused.set({ message: message ?? '', until, at: Date.now() });
    return true;
  }
  if (status === 403 && (code === 'ADDON_REQUIRED' || code === 'PLAN_FEATURE_REQUIRED')) {
    openUpsell({ kind: code === 'ADDON_REQUIRED' ? 'addon' : 'feature', feature: str(b?.feature), addOnKey: str(b?.addOnKey), message });
    return true;
  }
  if (status === 402 && code === 'PLAN_LIMIT') {
    openUpsell({ kind: 'limit', limit: str(b?.limit), current: num(b?.current), max: num(b?.max), addOnKey: str(b?.addOnKey), message });
    return true;
  }
  return false;
}

export function useUpsellRequest(): UpsellRequest | null {
  return useSyncExternalStore(upsell.subscribe, upsell.get, () => null);
}

export function usePlanEndedNotice(): PlanEndedNotice | null {
  return useSyncExternalStore(ended.subscribe, ended.get, () => null);
}

export function useShopPausedNotice(): ShopPausedNotice | null {
  return useSyncExternalStore(paused.subscribe, paused.get, () => null);
}
