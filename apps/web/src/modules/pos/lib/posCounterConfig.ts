/**
 * POS counter setup: which layout the counter uses and which parts it shows.
 *
 * The owner sets the shop default in Settings → Counter & POS (saved on the
 * server, read by every counter through `/settings/counter`). Each user may
 * pick their own layout and density; that choice stays in this browser.
 */

import { useCallback, useState } from 'react';

export type PosLayout = 'classic' | 'express' | 'cartfocus' | 'touch';
export type PosDensity = 'compact' | 'comfortable';

export interface PosCounterConfig {
  layout: PosLayout;
  density: PosDensity;
  showImages: boolean;
  showCategories: boolean;
  showQuickKeys: boolean;
  showReceiver: boolean;
  showDelivery: boolean;
  showDiscount: boolean;
  lineNotes: boolean;
  priceEdit: boolean;
  sounds: boolean;
  autoPrint: boolean;
  showStock: boolean;
  recentItems: boolean;
  changeDue: boolean;
  quickDiscounts: number[];
}

export const POS_COUNTER_DEFAULTS: PosCounterConfig = {
  layout: 'classic',
  density: 'compact',
  showImages: true,
  showCategories: true,
  showQuickKeys: true,
  showReceiver: true,
  showDelivery: true,
  showDiscount: true,
  lineNotes: false,
  priceEdit: true,
  sounds: false,
  autoPrint: true,
  showStock: true,
  recentItems: true,
  changeDue: true,
  quickDiscounts: [5, 10],
};

export const POS_LAYOUTS: Array<{ id: PosLayout; label: string; hint: string }> = [
  { id: 'classic', label: 'Classic', hint: 'Products baayen, bill daayen' },
  { id: 'express', label: 'Express', hint: 'Bara search, neeche bill ki table — barcode aur keyboard ke liye' },
  { id: 'cartfocus', label: 'Bill bara', hint: 'Bara bill baayen, patli product list daayen' },
  { id: 'touch', label: 'Touch', hint: 'Bare tiles aur buttons — tablet ke liye' },
];

const isLayout = (v: unknown): v is PosLayout => POS_LAYOUTS.some((l) => l.id === v);
const isDensity = (v: unknown): v is PosDensity => v === 'compact' || v === 'comfortable';

/** Server value with defaults filled in (older servers send nothing). */
export function normalizePosCounter(raw: unknown): PosCounterConfig {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = { ...POS_COUNTER_DEFAULTS } as Record<string, unknown>;
  for (const [k, v] of Object.entries(POS_COUNTER_DEFAULTS)) {
    if (typeof v === 'boolean' && typeof s[k] === 'boolean') out[k] = s[k];
  }
  if (isLayout(s.layout)) out.layout = s.layout;
  if (isDensity(s.density)) out.density = s.density;
  if (Array.isArray(s.quickDiscounts)) out.quickDiscounts = s.quickDiscounts.map(Number).filter((n) => n > 0 && n <= 100);
  return out as unknown as PosCounterConfig;
}

/** This user's own layout and density on this browser; null follows the shop default. */
export function usePosUserLayout(userId?: string | null) {
  const key = (name: string) => `nafaa.pos.user.${userId || 'anon'}.${name}`;
  const read = (name: string) => { try { return localStorage.getItem(key(name)); } catch { return null; } };
  const [layout, setLayoutState] = useState<PosLayout | null>(() => { const v = read('layout'); return isLayout(v) ? v : null; });
  const [density, setDensityState] = useState<PosDensity | null>(() => { const v = read('density'); return isDensity(v) ? v : null; });
  const save = (name: string, v: string | null) => {
    try { if (v) localStorage.setItem(key(name), v); else localStorage.removeItem(key(name)); } catch { /* private window */ }
  };
  const setLayout = useCallback((v: PosLayout | null) => { setLayoutState(v); save('layout', v); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
  const setDensity = useCallback((v: PosDensity | null) => { setDensityState(v); save('density', v); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
  return { layout, density, setLayout, setDensity };
}
