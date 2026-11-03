/**
 * Carpet counter (web carpet/pos/config.ts) on the shared POS.
 *
 * Carpet sold by area or running length (sqft, sqm, sq gaz, ft, m) is cut
 * from a roll or sold as a remnant piece: tapping such a product opens the
 * cut sheet. Each cut is its own bill line whose note names the roll and
 * size; after the bill is saved the server cuts the roll and sells the piece
 * (settleBill). Rugs by piece, underlay, gripper, fitting and other goods
 * sell like any product. Bills made offline are cut from stock once they
 * reach the server (the rolls screen and the bill list them with one-tap
 * settling). A roll number or piece code scanned at the counter opens its cut.
 */

import { cutMismatch, isCarpetNote, isCarpetUnit, readCarpetNote, usedFromRoll } from '@nafaa/core/industries/carpet';
import { msg, t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { offline } from '@/core/offline';
import { toast } from '@/design';
import { useBill } from '@/modules/pos/engine/bill';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { unitsOf, type PosApi } from '@/modules/pos/engine/usePos';
import { carpetCutPiecesApi, carpetRollsApi } from './api';
import { CarpetOverlay, askCut, type PieceSale, type RollCut } from './components/CutSheet';
import { PendingCuts } from './components/PendingCuts';
import { pieceNote, qtyInUnit, r2, realFt, refreshCarpet } from './meta';

const allowOnce = new Set<string>();

/** One cut or piece is one bill line: it keeps its own note and quantity. */
async function addCarpetLine(api: PosApi, productId: string, qty: number, rate: number, note: string, variant?: { id: string; name: string } | null) {
  const product = await offline.products.get(productId, api.shopId);
  if (!product) { toast.error(t('Product not found')); return; }
  const unit = unitsOf(product)[0];
  api.place(product, unit, {
    qty, price: rate, note, separate: true, limit: qty,
    ...(variant && { variant: { id: variant.id, name: variant.name, price: rate, stock: qty } }),
  });
}

function openCut(productId: string, api: PosApi, preSelectedRollId?: string) {
  void offline.products.get(productId, api.shopId).then((p) => {
    if (!p) { toast.error(t('Product not found')); return; }
    askCut({
      product: { id: p.id, name: p.name, unit: p.unit, price: p.price }, preSelectedRollId,
      onRoll: (c: RollCut) => {
        // The same roll on several lines must still have the length.
        const used = usedFromRoll(useBill.getState().lines, c.roll.rollNumber);
        const left = realFt(c.roll.remainingLengthFt, c.roll.remainingLengthInch);
        if (used + realFt(c.lengthFt, c.lengthInch) > left + 0.001) {
          toast.error(t('{{rollNumber}} me itni lambai nahi — bill me pehle se {{used}}ft is roll se hai', { rollNumber: c.roll.rollNumber, used: r2(used) }));
          return;
        }
        void addCarpetLine(api, p.id, c.qty, c.rate, c.note, c.roll.variantId ? { id: c.roll.variantId, name: c.roll.variant?.name ?? 'Design' } : null);
      },
      onPiece: (s: PieceSale) => {
        if (useBill.getState().lines.some((l) => readCarpetNote(l.note)?.ref === s.piece.pieceCode)) { toast.info(t('{{pieceCode}} pehle se bill me hai', { pieceCode: s.piece.pieceCode })); return; }
        void addCarpetLine(api, p.id, s.qty, s.rate, s.note, s.piece.variantId ? { id: s.piece.variantId, name: s.piece.variant?.name ?? 'Design' } : null);
      },
    });
  });
}

async function settle(saleId: string) {
  try {
    const res = await carpetRollsApi.settleBill(saleId);
    const failed = res.lines.filter((l) => !l.ok);
    if (failed.length) toast.error(t('Bill {{saleNumber}} ban gaya, lekin stock se nahi kata: {{value}} — Carpet Rolls page se dobara karein', { saleNumber: res.saleNumber, value: failed.map((f) => f.message).join(' • ') }));
  } catch {
    toast.error(t('Bill ban gaya, roll / tukra stock se nahi kata — Carpet Rolls page par "Kaatna baqi" se karein'));
  } finally {
    refreshCarpet();
  }
}

/** Bills saved with carpet lines; set before the bill is cleared. */
let billHasCarpet = false;

export const carpetPos: PosIndustryConfig = {
  ...generalPos,
  id: 'carpet',
  searchHint: msg('Carpet, design, rug, roll number ya barcode…'),
  receiptFooter: 'Naap aur design check kar lein. Kata hua carpet dukaan ki policy ke mutabiq hi wapas hota hai.',
  Overlay: CarpetOverlay,
  CartExtra: PendingCuts,
  beforeAdd: (productId, opts, api) => {
    if (allowOnce.delete(productId)) return 'continue';
    void (async () => {
      const product = await offline.products.get(productId, api.shopId).catch(() => null);
      if (product && isCarpetUnit(product.unit) && !opts.note) { openCut(productId, api); return; }
      allowOnce.add(productId);
      const ok = await api.addProduct(productId, opts);
      if (!ok) allowOnce.delete(productId);
    })();
    return 'handled';
  },
  scan: async (code, api) => {
    if (!isOnline()) return false;
    const c = code.trim();
    const [rolls, pieces] = await Promise.all([
      carpetRollsApi.list({ search: c, limit: 5 }).catch(() => null),
      carpetCutPiecesApi.list({ search: c, status: 'AVAILABLE', limit: 5 }).catch(() => null),
    ]);
    const roll = rolls?.items.find((r) => r.rollNumber.toLowerCase() === c.toLowerCase());
    if (roll) { openCut(roll.productId, api, roll.id); return true; }
    const piece = pieces?.items.find((p) => p.pieceCode.toLowerCase() === c.toLowerCase());
    if (piece) {
      if (useBill.getState().lines.some((l) => readCarpetNote(l.note)?.ref === piece.pieceCode)) { toast.info(t('{{pieceCode}} pehle se bill me hai', { pieceCode: piece.pieceCode })); return true; }
      const p = await offline.products.get(piece.productId, api.shopId);
      if (!p) { toast.error(t('{{pieceCode}} ka product counter par nahi', { pieceCode: piece.pieceCode })); return true; }
      const qty = qtyInUnit(p.unit, realFt(piece.widthFt, piece.widthInch), realFt(piece.lengthFt, piece.lengthInch));
      const price = Number(piece.salePrice) || 0;
      if (!(price > 0) || !(qty > 0)) { toast.error(t('{{pieceCode}} ka rate nahi — Cut pieces se rate likhein', { pieceCode: piece.pieceCode })); return true; }
      await addCarpetLine(api, p.id, qty, r2(price / qty), pieceNote(piece.pieceCode, piece.widthFt, piece.widthInch, piece.lengthFt, piece.lengthInch), piece.variantId ? { id: piece.variantId, name: piece.variant?.name ?? 'Design' } : null);
      return true;
    }
    return false;
  },
  // A cut is sold by its size: its quantity must still match the size in its note.
  beforeCheckout: () => {
    const lines = useBill.getState().lines;
    billHasCarpet = lines.some((l) => isCarpetNote(l.note));
    for (const l of lines) {
      const m = cutMismatch({ note: l.note, baseUnit: l.baseUnit, baseQuantity: l.baseQuantity });
      if (m) return t('{{name}}: {{ref}} ki quantity {{want}} honi chahiye, bill me {{qty}} hai — line hata kar dobara kaatein', { name: l.name, ref: m.ref, want: m.want, qty: m.have });
    }
    return null;
  },
  afterSale: (sale) => {
    if (!billHasCarpet) return;
    billHasCarpet = false;
    if (isOnline()) void settle(sale.id);
  },
};

registerPosIndustry(carpetPos);
