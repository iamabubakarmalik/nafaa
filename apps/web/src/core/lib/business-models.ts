/**
 * How a business sells: counter retail, wholesale, distribution (bookers and
 * vans) and online. Asked at sign-up, editable in Settings → Business type,
 * stored on the tenant (Tenant.businessModels). Several can be picked.
 *
 * An empty list means the owner never answered; such a business is treated
 * as retail, which is how the app behaved before the question existed.
 */

import type { LucideIcon } from 'lucide-react';
import { Globe, Store, Truck, Warehouse } from 'lucide-react';
import { useAuthStore } from '@core/stores/auth.store';
import { t } from '@core/i18n';

export type BusinessModel = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTION' | 'ONLINE';

export interface BusinessModelOption {
  id: BusinessModel;
  title: string;
  hint: string;
  icon: LucideIcon;
  color: string;
}

export const BUSINESS_MODEL_OPTIONS: readonly BusinessModelOption[] = [
  { id: 'RETAIL', title: t('Dukaan / Retail'), hint: t('Counter par customer ko bechte hain'), icon: Store, color: '#059669' },
  { id: 'WHOLESALE', title: t('Wholesale'), hint: t('Dukaanon ko bulk, udhaar aur price list par'), icon: Warehouse, color: '#4f46e5' },
  { id: 'DISTRIBUTION', title: t('Distribution'), hint: t('Booker order lete hain, gaari delivery karti hai'), icon: Truck, color: '#ea580c' },
  { id: 'ONLINE', title: t('Online'), hint: t('Shopify, Daraz, website, WhatsApp, Instagram'), icon: Globe, color: '#0284c7' },
];

const ORDER: BusinessModel[] = ['RETAIL', 'WHOLESALE', 'DISTRIBUTION', 'ONLINE'];

export const DEFAULT_MODELS: BusinessModel[] = ['RETAIL'];

/** Known values only, in a fixed order. */
export function cleanModels(list: readonly string[] | null | undefined): BusinessModel[] {
  const picked = new Set((list ?? []).map((m) => m.toUpperCase()));
  return ORDER.filter((m) => picked.has(m));
}

/** What the app should act on: the saved list, or retail when nothing was answered. */
export function effectiveModels(list: readonly string[] | null | undefined): BusinessModel[] {
  const clean = cleanModels(list);
  return clean.length ? clean : DEFAULT_MODELS;
}

export function modelLabel(id: string): string {
  return BUSINESS_MODEL_OPTIONS.find((o) => o.id === id)?.title ?? id;
}

/** The current business's models with the flags screens usually need. */
export function useBusinessModels() {
  const saved = useAuthStore((s) => s.tenant?.businessModels);
  const models = effectiveModels(saved);
  return {
    models,
    answered: cleanModels(saved).length > 0,
    sellsOnline: models.includes('ONLINE'),
    wholesale: models.includes('WHOLESALE'),
    distribution: models.includes('DISTRIBUTION'),
    /** Wholesale or distribution: the business sells to other shops. */
    sellsToShops: models.includes('WHOLESALE') || models.includes('DISTRIBUTION'),
  };
}

// ─── Carrying the sign-up pick past account creation ────────────
// The register API has no field for it, so the pick waits here until the
// account exists (same as the industry pick).

const SIGNUP_MODELS_KEY = 'nafaa.signup-models';

export function rememberSignupModels(models: readonly string[]): void {
  try { sessionStorage.setItem(SIGNUP_MODELS_KEY, JSON.stringify(cleanModels(models))); } catch { /* storage blocked */ }
}

export function readSignupModels(): BusinessModel[] | null {
  try {
    const raw = sessionStorage.getItem(SIGNUP_MODELS_KEY);
    const list = raw ? cleanModels(JSON.parse(raw) as string[]) : [];
    return list.length ? list : null;
  } catch {
    return null;
  }
}

export function clearSignupModels(): void {
  try { sessionStorage.removeItem(SIGNUP_MODELS_KEY); } catch { /* storage blocked */ }
}
