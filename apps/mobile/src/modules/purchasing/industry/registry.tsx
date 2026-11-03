/**
 * Industries with their own purchase bill editor (web PurchasesGate: carpet
 * buys rolls, electronics buys serial numbers). A pack registers its editor
 * with registerPurchaseEditor(); every other industry keeps the shared one.
 */

import type { ComponentType } from 'react';
import type { Purchase, PurchaseItem } from '../api/purchases';
import { useIndustry } from '@/modules/shell/hooks/useIndustry';
import { PurchaseEditorScreen } from '../screens/editor/PurchaseEditorScreen';

const EDITORS = new Map<string, ComponentType>();

export function registerPurchaseEditor(industry: string, Editor: ComponentType) {
  EDITORS.set(industry, Editor);
}

/** Route screen of "New purchase": the industry's editor when it has one. */
export function PurchaseEditorGate() {
  const { id } = useIndustry();
  const Own = id ? EDITORS.get(id) : undefined;
  return Own ? <Own /> : <PurchaseEditorScreen />;
}

/** What the cost hook is asked about: one line being added to a purchase bill. */
export interface PurchaseCostContext {
  productId: string;
  variantId: string | null;
  /** Supplier on the bill so far ('' when none chosen yet). */
  supplierId: string;
  /** Selling (list / printed) price of one base unit. */
  listPrice: number;
  /** Last cost of one base unit. */
  lastCost: number;
}

export interface PurchaseCostResult {
  /** Cost of one base unit; the editor multiplies it for packs. */
  cost: number;
  /** Shown once as a toast, e.g. "Publisher discount 35%". Already translated. */
  note?: string;
}

/**
 * Small industry additions to the shared purchase screens (electronics: serial
 * badge on a line, serial entry on a received line; bookstore: publisher
 * discount as the cost).
 */
export interface PurchaseExtras {
  /** Badge next to a line's name in the bill being written. */
  LineBadge?: ComponentType<{ productId: string }>;
  /** Block under a received line on the purchase page. */
  ItemExtra?: ComponentType<{ item: PurchaseItem; purchase: Purchase }>;
  /**
   * Cost of a line when it is added to a new bill, in place of the last cost
   * (bookstore: list price minus the publisher's discount for that supplier).
   * Return null to keep the usual cost. It is not asked for lines whose cost
   * was given (reorder prefill) and is asked again for every line when the
   * supplier changes, so it should be a quick lookup (it may be async).
   */
  lineCost?: (ctx: PurchaseCostContext) => PurchaseCostResult | null | Promise<PurchaseCostResult | null>;
}

const EXTRAS = new Map<string, PurchaseExtras>();

export function registerPurchaseExtras(industry: string, extras: PurchaseExtras) {
  EXTRAS.set(industry, extras);
}

export function usePurchaseExtras(): PurchaseExtras {
  const { id } = useIndustry();
  return (id && EXTRAS.get(id)) || {};
}
