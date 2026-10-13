/**
 * Shared wording, colours and helpers for the Branches pages: branch types,
 * a fixed colour per branch for charts, query keys and error text.
 */

import { Building2, Package, Warehouse, type LucideIcon } from 'lucide-react';
import type { ShopType } from '../api/shops.api';

/** Query keys these pages read; a change to a branch refreshes all of them. */
export const SHOP_KEYS = ['shops', 'shops-analytics', 'shops-overview', 'shops-compare', 'dashboard-overview'];

export const SHOP_TYPES: Record<ShopType, { label: string; hint: string; icon: LucideIcon; color: string }> = {
  SHOP: { label: 'Dukaan', hint: 'POS, sale, customer aur galla', icon: Building2, color: '#2563eb' },
  WAREHOUSE: { label: 'Warehouse', hint: 'Bara store — sirf maal rakhna aur bhejna', icon: Warehouse, color: '#d97706' },
  GODOWN: { label: 'Godown', hint: 'Chhota store — extra maal ke liye', icon: Package, color: '#7c3aed' },
};

/**
 * Chart colours by branch position (main first, then by name), in a fixed
 * order and never cycled, so a branch keeps its colour across periods and
 * sorts. Branches after the eighth share a neutral tone.
 */
const BRANCH_HUES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'] as const;
const OTHER_HUE = '#94a3b8';
export const hueAt = (i: number) => BRANCH_HUES[i] ?? OTHER_HUE;

/** Server message from an API error, else the fallback. */
export function apiError(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { message?: unknown } }; message?: string };
  const m = err?.response?.data?.message;
  if (typeof m === 'string') return m;
  if (Array.isArray(m) && typeof m[0] === 'string') return m[0];
  if (m && typeof m === 'object' && typeof (m as { message?: unknown }).message === 'string') return (m as { message: string }).message;
  return err?.message || fallback;
}

/** "3 Oct", or "3 Oct — 9 Oct". */
export const dayShort = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

/** "abhi", "20 min se", "3 ghante se". */
export function since(iso: string | null | undefined) {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'abhi khula';
  if (m < 60) return `${m} min se khula`;
  const h = Math.floor(m / 60);
  return `${h} ghante se khula`;
}
