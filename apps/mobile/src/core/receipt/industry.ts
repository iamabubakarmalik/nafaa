/**
 * Industry rows on the one receipt (table, token, waiter, room, doctor,
 * karat and weight per line…). A pack registers once at module load:
 *
 *   registerReceiptIndustry('restaurant', (doc, { sale, lang }) => ({
 *     infoRows: sale?.restaurantOrder ? [{ label: lang === 'ur' ? 'میز' : 'Table', value: sale.restaurantOrder.tableName }] : [],
 *   }));
 *   registerReceiptIndustry('jewelry', (doc, { sale }) => ({
 *     lineDetails: (sale?.items ?? []).map((it) => it.jewelry ? [`${it.jewelry.karat}K · ${it.jewelry.weight} g`] : undefined),
 *     extraRows: [{ label: 'Making', value: '+Rs 4,000' }],
 *   }));
 *
 * Additions are data only. The design, paper, the shop's footer and the
 * Nafaa line stay the engine's, so every industry prints the same receipt.
 * Words follow `ctx.lang` (the shop's bill language), not the app language.
 */

import { useAuthStore } from '@/core/auth/store';
import type { SaleRow } from '@/core/offline';
import { industryIdForBusinessType } from '@/design/industries/businessTypes';
import type { ReceiptDoc, ReceiptRowDoc } from './types';
import type { ReceiptLang } from './words';

export interface ReceiptIndustryContext {
  lang: ReceiptLang;
  /** The server bill (GET /sales/:id), when the receipt is built from it. */
  sale: Record<string, any> | null;
  /** The phone's copy, when the receipt is built offline or for a bill waiting to sync. */
  row: SaleRow | null;
}

export interface ReceiptAdditions {
  /** Rows under the header: table, token, waiter, room, doctor, order type. */
  infoRows?: ReceiptRowDoc[];
  /** Rows between the items and the total: making, wastage, service. */
  extraRows?: ReceiptRowDoc[];
  /** Detail lines per item, by the item's position on the bill (karat, weight, frame, lens). */
  lineDetails?: Array<string[] | undefined>;
  /** Industry message above the shop's own footer (replaces any earlier one). */
  footerNote?: string;
  /** Extra boxes on A4 / sections on thermal (prescription, warranty). */
  boxes?: NonNullable<ReceiptDoc['boxes']>;
}

export type ReceiptExtender = (doc: ReceiptDoc, ctx: ReceiptIndustryContext) => ReceiptAdditions | null | undefined;

const EXTENDERS = new Map<string, ReceiptExtender>();

/** Adds or replaces an industry's receipt additions. */
export function registerReceiptIndustry(industry: string | string[], extend: ReceiptExtender) {
  for (const id of Array.isArray(industry) ? industry : [industry]) EXTENDERS.set(id, extend);
}

const currentIndustry = () => industryIdForBusinessType(useAuthStore.getState().tenant?.businessType);

/** Merges the current industry's additions into a receipt. A failing extender never stops a print. */
export function applyReceiptIndustry(doc: ReceiptDoc, ctx: ReceiptIndustryContext, industry: string | null = currentIndustry()): ReceiptDoc {
  const extend = industry ? EXTENDERS.get(industry) : undefined;
  if (!extend) return doc;
  let add: ReceiptAdditions | null | undefined;
  try {
    add = extend(doc, ctx);
  } catch {
    return doc;
  }
  if (!add) return doc;
  return {
    ...doc,
    infoRows: add.infoRows?.length ? [...(doc.infoRows ?? []), ...add.infoRows] : doc.infoRows,
    extraRows: add.extraRows?.length ? [...(doc.extraRows ?? []), ...add.extraRows] : doc.extraRows,
    lines: add.lineDetails?.length
      ? doc.lines.map((l, i) => (add!.lineDetails![i]?.length ? { ...l, details: [...(l.details ?? []), ...add!.lineDetails![i]!] } : l))
      : doc.lines,
    footerNote: add.footerNote ?? doc.footerNote,
    boxes: add.boxes?.length ? [...(doc.boxes ?? []), ...add.boxes] : doc.boxes,
  };
}
