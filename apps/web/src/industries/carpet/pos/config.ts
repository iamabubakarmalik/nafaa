/**
 * Carpet counter on the shared POS engine.
 *
 * Carpet sold by area or running length (sqft, sqm, sq gaz, ft, m) is cut
 * from a roll or sold as a remnant piece: tapping such a product opens the
 * cut window (CutModal). Each cut is its own bill line whose note names the
 * roll and size; after the bill is saved the server cuts the roll and sells
 * the piece (settleBill). Rugs by piece, underlay, gripper, fitting and
 * other goods sell like any product; fitting can be a service item.
 *
 * Offline bills are cut from stock once they reach the server (the rolls
 * page and the cart list such bills with one-tap settling).
 */

import { createElement } from 'react';
import { toast } from 'sonner';
import { Layers, Scissors, Sparkles } from 'lucide-react';
import { useProductCatalog, type AddOptions, type PosEngineApi, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import type { PosCartLine } from '@modules/pos/lib/posCart';
import { queryClient } from '@core/lib/queryClient';
import { carpetRollsApi } from '../api/carpet-rolls.api';
import { carpetCutPiecesApi } from '../api/carpet-cut-pieces.api';
import { useOfflineCarpetSummary } from '../hooks/useOfflineCarpetSummary';
import { PIECES_KEY, ROLLS_KEY, SUMMARY_KEY, isCarpetUnit, pieceNote, qtyInUnit, r2, readCarpetNote, realFt } from '../lib/meta';
import { CutModal, type PieceSale, type RollCut } from './CutModal';
import { PendingCuts } from './PendingCuts';

const isCarpetNote = (note?: string) => !!note && (note.startsWith('Cut from ') || note.startsWith('Cut piece '));

/** Width and length (decimal feet) written in a carpet line note. */
function noteDims(note: string): { w: number; l: number } | null {
  const size = readCarpetNote(note)?.size;
  const m = size && /^(\d+(?:\.\d+)?)ft(?:\s+(\d+(?:\.\d+)?)in)?\s*×\s*(\d+(?:\.\d+)?)ft(?:\s+(\d+(?:\.\d+)?)in)?/.exec(size);
  return m ? { w: realFt(Number(m[1]), Number(m[2] ?? 0)), l: realFt(Number(m[3]), Number(m[4] ?? 0)) } : null;
}

function useCarpetCatalog() {
  const base = useProductCatalog();
  const ids = base.items.filter((i) => isCarpetUnit(i.unit)).map((i) => i.id);
  const { data: summary = [] } = useOfflineCarpetSummary(ids, ids.length > 0);
  const byId = new Map(summary.map((s) => [s.productId, s]));
  const items = base.items.map((it): PosItem => {
    if (!isCarpetUnit(it.unit)) return { ...it, rank: 1 };
    const s = byId.get(it.id);
    const rolls = s?.rollCount ?? 0;
    const pieces = s?.cutPiecesCount ?? 0;
    return {
      ...it,
      rank: rolls || pieces ? 0 : 2,
      dim: !rolls && !pieces,
      subline: rolls || pieces ? [rolls ? `${rolls} roll` : '', pieces ? `${pieces} tukre` : '', s ? `${Math.round(s.totalSqft)} sqft` : ''].filter(Boolean).join(' · ') : 'Koi roll nahi',
      badges: [
        ...(rolls ? [{ label: `${rolls} roll`, tone: 'brand' as const, icon: Layers }] : []),
        ...(pieces ? [{ label: `${pieces} tukre`, tone: 'info' as const, icon: Scissors }] : []),
      ],
      meta: { ...it.meta, carpet: true, rolls, pieces },
    };
  });
  return { items, loading: base.loading, refreshKeys: [...base.refreshKeys, 'carpet-product-summary-pos', ROLLS_KEY, PIECES_KEY, SUMMARY_KEY] };
}

/** One cut or piece is one bill line: it keeps its own note and quantity. */
function addCarpetLine(api: PosEngineApi, item: PosItem, qty: number, rate: number, note: string, variant?: { id: string; name: string } | null) {
  const opts: AddOptions = {
    qty,
    price: rate,
    note,
    confirmed: ['carpet'],
    separate: true,
    unit: { id: `carpet-${item.id}`, unitName: item.unit, label: item.unit.toUpperCase(), emoji: '📐', conversionRate: 1, price: rate, isBase: true },
    ...(variant && { variant: { id: variant.id, name: variant.name, price: rate, stock: qty } }),
  };
  // The cut already names its roll's design, so the engine's own variant picker is skipped.
  api.addItem({ ...item, hasVariants: false }, opts);
}

function openCut(item: PosItem, api: PosEngineApi, preSelectedRollId?: string) {
  const product = { id: item.id, name: item.name, unit: item.unit, price: item.price };
  api.openPicker(createElement(CutModal, {
    product,
    preSelectedRollId,
    onClose: api.closePicker,
    onRoll: (c: RollCut) => {
      // The same roll on several lines must still have the length.
      const used = api.cart.reduce((s, l) => {
        const info = readCarpetNote(l.note);
        const d = l.note ? noteDims(l.note) : null;
        return info?.kind === 'roll' && info.ref === c.roll.rollNumber && d ? s + d.l : s;
      }, 0);
      const left = realFt(c.roll.remainingLengthFt, c.roll.remainingLengthInch);
      if (used + realFt(c.lengthFt, c.lengthInch) > left + 0.001) {
        toast.error(`${c.roll.rollNumber} me itni lambai nahi — bill me pehle se ${r2(used)}ft is roll se hai`);
        return;
      }
      api.closePicker();
      addCarpetLine(api, item, c.qty, c.rate, c.note, c.roll.variantId ? { id: c.roll.variantId, name: c.roll.variant?.name ?? 'Design' } : null);
    },
    onPiece: (p: PieceSale) => {
      if (api.cart.some((l) => readCarpetNote(l.note)?.ref === p.piece.pieceCode)) { toast.info(`${p.piece.pieceCode} pehle se bill me hai`); return; }
      api.closePicker();
      addCarpetLine(api, item, p.qty, p.rate, p.note, p.piece.variantId ? { id: p.piece.variantId, name: p.piece.variant?.name ?? 'Design' } : null);
    },
  }));
}

/** Bills saved with carpet lines; the next onSale settles them. */
let billHasCarpet = false;

async function settle(saleId: string) {
  try {
    const res = await carpetRollsApi.settleBill(saleId);
    const failed = res.lines.filter((l) => !l.ok);
    if (failed.length) toast.error(`Bill ${res.saleNumber} ban gaya, lekin stock se nahi kata: ${failed.map((f) => f.message).join(' • ')} — Carpet Rolls page se dobara karein`, { duration: 12000 });
  } catch {
    toast.error('Bill ban gaya, roll / tukra stock se nahi kata — Carpet Rolls page par "Kaatna baqi" se karein', { duration: 10000 });
  } finally {
    for (const key of [ROLLS_KEY, PIECES_KEY, SUMMARY_KEY, 'carpet-product-summary-pos', 'carpet-unsettled']) void queryClient.invalidateQueries({ queryKey: [key] });
  }
}

const filters: PosFilter[] = [
  { id: 'rolls', label: 'Roll wala', icon: Layers, match: (i) => Number(i.meta?.rolls) > 0 },
  { id: 'pieces', label: 'Tukre', icon: Scissors, match: (i) => Number(i.meta?.pieces) > 0 },
  { id: 'other', label: 'Rugs / baqi maal', icon: Sparkles, match: (i) => !i.meta?.carpet },
];

export const carpetPos: PosIndustryConfig = {
  id: 'carpet',
  label: 'Carpet',
  useCatalog: useCarpetCatalog,
  quickKeys: true,
  filters,
  searchHint: 'Carpet, design, rug, roll number ya barcode…',
  receiptFooter: 'Naap aur design check kar lein. Kata hua carpet dukaan ki policy ke mutabiq hi wapas hota hai.',
  CartExtra: PendingCuts,
  beforeAdd: (item, opts, api) => {
    if (!item.meta?.carpet || opts.confirmed?.includes('carpet')) return 'continue';
    openCut(item, api);
    return 'handled';
  },
  scan: async (code, api) => {
    if (!navigator.onLine) return false;
    const c = code.trim();
    const [rolls, pieces] = await Promise.all([
      carpetRollsApi.list({ search: c, limit: 5 }).catch(() => null),
      carpetCutPiecesApi.list({ search: c, status: 'AVAILABLE', limit: 5 }).catch(() => null),
    ]);
    const roll = rolls?.items.find((r) => r.rollNumber.toLowerCase() === c.toLowerCase());
    if (roll) {
      const item = api.itemById(roll.productId);
      if (!item) { toast.error(`${roll.rollNumber} ka product counter par nahi`); return true; }
      openCut(item, api, roll.id);
      return true;
    }
    const piece = pieces?.items.find((p) => p.pieceCode.toLowerCase() === c.toLowerCase());
    if (piece) {
      const item = api.itemById(piece.productId);
      if (!item) { toast.error(`${piece.pieceCode} ka product counter par nahi`); return true; }
      if (api.cart.some((l) => readCarpetNote(l.note)?.ref === piece.pieceCode)) { toast.info(`${piece.pieceCode} pehle se bill me hai`); return true; }
      const qty = qtyInUnit(item.unit, realFt(piece.widthFt, piece.widthInch), realFt(piece.lengthFt, piece.lengthInch));
      const price = Number(piece.salePrice) || 0;
      if (!(price > 0) || !(qty > 0)) { toast.error(`${piece.pieceCode} ka rate nahi — Cut pieces se rate likhein`); return true; }
      addCarpetLine(api, item, qty, r2(price / qty), pieceNote(piece.pieceCode, piece.widthFt, piece.widthInch, piece.lengthFt, piece.lengthInch), piece.variantId ? { id: piece.variantId, name: piece.variant?.name ?? 'Design' } : null);
      return true;
    }
    return false;
  },
  // A cut is sold by its size: its quantity must still match the size in its note.
  beforeCheckout: (cart: PosCartLine[]) => {
    billHasCarpet = cart.some((l) => isCarpetNote(l.note));
    for (const l of cart) {
      if (!isCarpetNote(l.note)) continue;
      const d = noteDims(l.note!);
      if (!d) continue;
      const want = qtyInUnit(l.baseUnit, d.w, d.l);
      if (Math.abs(want - l.baseQuantity) > 0.02) {
        return `${l.name}: ${readCarpetNote(l.note)?.ref} ki quantity ${want} honi chahiye, bill me ${r2(l.baseQuantity)} hai — line hata kar dobara kaatein`;
      }
    }
    return null;
  },
  onSale: (sale) => {
    if (!billHasCarpet) return;
    billHasCarpet = false;
    void settle(sale.id);
  },
  voiceAliases: { qaleen: 'carpet', galicha: 'carpet rug', dari: 'dari rug', chatai: 'mat chatai' },
};
