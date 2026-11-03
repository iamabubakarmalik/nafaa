/**
 * Industry additions to the shared Sales history and bill screens (same idea
 * as registerPosIndustry / registerInventoryIndustry). A pack registers once
 * at module load (src/industries/<id>/index.ts):
 *
 *   registerSalesExtras('optical', {
 *     rowChips: (s) => s.note?.includes('Rx') ? [{ label: t('Rx'), tone: 'info' }] : [],
 *     rowActions: (s) => [{ icon: Glasses, label: t('Eye test'), href: `/optical/tests?sale=${s.id}` }],
 *     detailLinks: (s) => [{ icon: Glasses, label: t('Glasses order'), href: `/optical/orders?sale=${s.id}` }],
 *     DetailExtra: ({ sale, raw }) => <PrescriptionCard saleId={sale.id} />,
 *   });
 *
 * Rules: chips are short (1–3 per bill) and computed from the row only, since
 * the list is read from the phone and must stay instant. Anything that needs
 * a server call belongs in DetailExtra (online-only data shows its own
 * offline state). Labels are already translated by the pack.
 */

import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react-native';
import type { StatusTone } from '@/design';
import { useIndustry } from '@/modules/shell/hooks/useIndustry';
import type { HistorySale } from '../api/history';

export interface SaleChip {
  label: string;
  tone?: StatusTone;
  icon?: LucideIcon;
}

export interface SaleLink {
  label: string;
  /** App route to open. */
  href: string;
  icon?: LucideIcon;
  /** Second line under the label. */
  hint?: string;
}

export interface SalesExtras {
  /** Chips after the bill number on a history row and at the top of the bill. */
  rowChips?: (sale: HistorySale) => SaleChip[];
  /** Extra swipe actions on a history row (next to Receipt). Not shown for bills waiting to sync. */
  rowActions?: (sale: HistorySale) => SaleLink[];
  /** Rows in a "Linked" section on the bill screen. `raw` is the server bill (null while offline or pending). */
  detailLinks?: (sale: HistorySale, raw: Record<string, unknown> | null) => SaleLink[];
  /** Industry block on the bill screen, under the items. */
  DetailExtra?: ComponentType<{ sale: HistorySale; raw: Record<string, unknown> | null }>;
}

const EXTRAS = new Map<string, SalesExtras>();

/** Adds or replaces an industry's sales additions. Call at module load of the pack. */
export function registerSalesExtras(industry: string | string[], extras: SalesExtras) {
  for (const id of Array.isArray(industry) ? industry : [industry]) EXTRAS.set(id, extras);
}

export function salesExtrasFor(industry: string | null | undefined): SalesExtras {
  return (industry && EXTRAS.get(industry)) || {};
}

export function useSalesExtras(): SalesExtras {
  const { id } = useIndustry();
  return salesExtrasFor(id);
}
