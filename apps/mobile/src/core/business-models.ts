/**
 * How a business sells (same as the web core/lib/business-models.ts).
 * Stored on the tenant (Tenant.businessModels). An empty list means retail.
 */

import { Globe, Store, Truck, Warehouse, type LucideIcon } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { useAuthStore } from './auth/store';

export type BusinessModel = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTION' | 'ONLINE';

export interface BusinessModelOption {
  id: BusinessModel;
  title: string;
  hint: string;
  icon: LucideIcon;
  color: string;
}

export const BUSINESS_MODEL_OPTIONS: readonly BusinessModelOption[] = [
  { id: 'RETAIL', title: msg('Dukaan / Retail'), hint: msg('Counter par customer ko bechte hain'), icon: Store, color: '#059669' },
  { id: 'WHOLESALE', title: msg('Wholesale'), hint: msg('Dukaanon ko bulk, udhaar aur price list par'), icon: Warehouse, color: '#4f46e5' },
  { id: 'DISTRIBUTION', title: msg('Distribution'), hint: msg('Booker order lete hain, gaari delivery karti hai'), icon: Truck, color: '#ea580c' },
  { id: 'ONLINE', title: msg('Online'), hint: msg('Shopify, Daraz, website, WhatsApp, Instagram'), icon: Globe, color: '#0284c7' },
];

const ORDER: BusinessModel[] = ['RETAIL', 'WHOLESALE', 'DISTRIBUTION', 'ONLINE'];
export const DEFAULT_MODELS: BusinessModel[] = ['RETAIL'];

export function cleanModels(list: readonly string[] | null | undefined): BusinessModel[] {
  const picked = new Set((list ?? []).map((m) => m.toUpperCase()));
  return ORDER.filter((m) => picked.has(m));
}

export function effectiveModels(list: readonly string[] | null | undefined): BusinessModel[] {
  const clean = cleanModels(list);
  return clean.length ? clean : DEFAULT_MODELS;
}

export function useBusinessModels() {
  const saved = useAuthStore((s) => s.tenant?.businessModels);
  const models = effectiveModels(saved);
  return {
    models,
    answered: cleanModels(saved).length > 0,
    sellsOnline: models.includes('ONLINE'),
    wholesale: models.includes('WHOLESALE'),
    distribution: models.includes('DISTRIBUTION'),
    sellsToShops: models.includes('WHOLESALE') || models.includes('DISTRIBUTION'),
  };
}
