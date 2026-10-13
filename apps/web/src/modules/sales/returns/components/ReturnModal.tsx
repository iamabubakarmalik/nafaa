/**
 * Return from a bill: pick how much of each line came back, whether it goes
 * back on the shelf or is not fit to sell, how the money goes back and why.
 * Used from the Returns page, Sales history, the receipt page and Agri sales.
 *
 * The refund shown follows the server: each line at what was actually paid
 * (after line and bill discounts). On a credit bill the refund first clears
 * what is still owed on the bill; only the rest is handed back.
 *
 * Not the same as cancelling (void): a cancelled bill should never have
 * existed; a return is a real sale coming back and is kept as its own record.
 */

import { useMemo, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Banknote, BookOpen, Building2, CheckCircle2, CreditCard, Minus, Package, PackageCheck, PackageX, Plus, RotateCcw, Scissors,
  Smartphone, StickyNote, Zap,
} from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import {
  CarpetReturnOptionsDialog, parseCarpetNoteClient, type CarpetReturnOptions,
} from '@industries/carpet/components/CarpetReturnOptionsDialog';
import { returnsApi, type CreatedReturn } from '@modules/sales/returns/api/returns.api';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { CARPET_UNITS, REASONS, qtyText, refreshAfterReturn } from './meta';

const REFUND_METHODS: Array<{ v: PaymentMethod; label: string; icon: ComponentType<{ className?: string }>; hint: string }> = [
  { v: 'CASH', label: 'Cash', icon: Banknote, hint: 'Golak se' },
  { v: 'JAZZCASH', label: 'JazzCash', icon: Smartphone, hint: 'Wapas bhejein' },
  { v: 'EASYPAISA', label: 'EasyPaisa', icon: Zap, hint: 'Wapas bhejein' },
  { v: 'BANK_TRANSFER', label: 'Bank', icon: Building2, hint: 'Account me' },
  { v: 'CARD', label: 'Card', icon: CreditCard, hint: 'Card par' },
];

interface Line {
  id: string; name: string; variant: string | null; unit: string; sold: number; already: number; remaining: number;
  /** Refund for one unit after line and bill discounts. */
  unitRefund: number; units: string[]; note: string | null; isCarpet: boolean;
}

function readLines(sale: any): Line[] {
  const items: any[] = sale.items ?? [];
  const net = (it: any) => Number(it.total ?? Number(it.price ?? it.unitPrice ?? 0) * Number(it.quantity ?? 0));
  const gross = (it: any) => Number(it.price ?? it.unitPrice ?? 0) * Number(it.quantity ?? 0);
  const lines = items.reduce((s, it) => s + net(it), 0);
  const lineDiscount = items.reduce((s, it) => s + Math.max(0, gross(it) - net(it)), 0);
  const billDiscount = Math.max(0, Number(sale.discount ?? 0) - lineDiscount);
  const factor = lines > 0 ? Math.min(1, Math.max(0, (lines - billDiscount) / lines)) : 1;
  return items.filter((it) => it.productId !== null || it.product).map((it) => {
    const sold = Number(it.quantity ?? 0);
    const already = Number(it.returnedQty ?? 0);
    const unit = it.product?.unit ?? it.unit ?? 'pcs';
    return {
      id: it.id,
      name: it.product?.name ?? it.name ?? it.productName ?? 'Cheez',
      variant: it.variant ?? it.variantLink?.variant?.name ?? null,
      unit,
      sold,
      already,
      remaining: Math.max(sold - already, 0),
      unitRefund: sold > 0 ? (net(it) / sold) * factor : 0,
      units: [...(it.imeis ?? []).map((i: any) => i.imei1), ...(it.serials ?? []).map((s: any) => s.serialNumber)].filter(Boolean),
      note: it.note ?? null,
      isCarpet: CARPET_UNITS.has(unit),
    };
  });
}

export function ReturnModal({ sale, onClose, onDone }: {
  sale: any;
  onClose: () => void;
  onDone: (created?: CreatedReturn) => void;
}) {
  const qc = useQueryClient();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [shelf, setShelf] = useState<Record<string, boolean>>({});
  const [carpet, setCarpet] = useState<Record<string, CarpetReturnOptions>>({});
  const [carpetFor, setCarpetFor] = useState<Line | null>(null);
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>((sale.paymentMethod as PaymentMethod) ?? 'CASH');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const lines = useMemo(() => readLines(sale), [sale]);
  const returnable = lines.filter((l) => l.remaining > 0);
  const tracked = (l: Line) => l.units.length > 0;
  const setLine = (l: Line, v: number) => {
    const n = tracked(l) ? Math.round(v) : Number(v.toFixed(3));
    setQty((q) => ({ ...q, [l.id]: Math.max(0, Math.min(n, l.remaining)) }));
  };
  const selected = lines.filter((l) => (qty[l.id] ?? 0) > 0);
  const refund = Math.round(selected.reduce((s, l) => s + (qty[l.id] ?? 0) * l.unitRefund, 0) * 100) / 100;
  const allPicked = returnable.length > 0 && returnable.every((l) => (qty[l.id] ?? 0) === l.remaining);
  const toggleAll = () => setQty(allPicked ? {} : Object.fromEntries(returnable.map((l) => [l.id, l.remaining])));
  const onShelf = (l: Line) => shelf[l.id] !== false;

  // What is still owed on this bill; the refund clears it before any money goes back.
  const owed = Math.max(0, Number(sale.creditAmount ?? 0) - Number(sale.refundedAmount ?? 0));
  const khata = sale.customer ? Math.min(refund, owed) : 0;
  const handBack = Math.max(0, refund - khata);
  const discounted = lines.some((l) => l.sold > 0 && Math.abs(l.unitRefund - Number(sale.items?.find((i: any) => i.id === l.id)?.price ?? l.unitRefund)) > 0.005);
  const writtenOff = selected.filter((l) => !onShelf(l)).length;

  const mut = useMutation({
    mutationFn: () => returnsApi.create({
      saleId: sale.id,
      refundMethod,
      reason: reason.trim() || undefined,
      notes: notes.trim() || undefined,
      items: selected.map((l) => {
        const c = carpet[l.id];
        return {
          saleItemId: l.id,
          quantity: qty[l.id],
          ...(onShelf(l) ? {} : { restock: false }),
          ...(c ? {
            createCutPiece: c.createCutPiece, isDamaged: c.isDamaged, cutPieceCondition: c.cutPieceCondition,
            cutPieceWidthFt: c.cutPieceWidthFt || undefined, cutPieceLengthFt: c.cutPieceLengthFt || undefined, cutPieceNotes: c.cutPieceNotes || undefined,
          } : {}),
        };
      }),
    }),
    onSuccess: (res) => {
      if (res.repeated) toast.info('Yeh return pehle hi ho chuki thi — dobara nahi ki');
      else {
        const parts = [res.khataAmount > 0 && `${formatPKR(res.khataAmount)} khate se kam`, res.payout > 0 && `${formatPKR(res.payout)} wapas diye`].filter(Boolean);
        toast.success(`Return ho gayi — ${res.returnNumber}`, {
          description: [parts.join(' · ') || formatPKR(res.refundAmount), res.createdCutPieces?.length ? `${res.createdCutPieces.length} cut piece bana` : ''].filter(Boolean).join(' · '),
        });
      }
      refreshAfterReturn(qc);
      onDone(res);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Return nahi ho saki'),
  });

  const submit = () => { if (selected.length && !mut.isPending) mut.mutate(); };

  return (
    <>
      <Modal open onClose={onClose} size="lg"
        title={<span className="inline-flex items-center gap-2"><RotateCcw className="h-4 w-4 text-amber-600" /> Return — {sale.saleNumber}</span>}
        description={`${sale.customer?.name || 'Walk-in'} · ${formatPKR(sale.total)} ka bill`}
        footer={returnable.length > 0 ? (
          <div className="flex w-full flex-wrap items-center gap-3">
            <div className="mr-auto min-w-0">
              <p className="text-[0.75rem] text-slate-500">
                {selected.length ? `${selected.length} cheez${selected.length > 1 ? 'ein' : ''} wapas${writtenOff ? ` · ${writtenOff} kharab` : ''}` : 'Abhi kuch nahi chuna'}
              </p>
              <p className="text-xl font-bold tabular-nums text-slate-900">{formatPKR(refund)}</p>
              {khata > 0 && <p className="text-[0.6875rem] text-slate-500">{formatPKR(khata)} khate se · {formatPKR(handBack)} haath me</p>}
            </div>
            <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
            <Button onClick={submit} loading={mut.isPending} disabled={!selected.length} leftIcon={<RotateCcw className="h-4 w-4" />}
              className="bg-amber-600 hover:bg-amber-700">
              Return karein
            </Button>
          </div>
        ) : <Button variant="secondary" onClick={onClose}>Band karein</Button>}>
        {returnable.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="mt-2 font-semibold text-slate-800">Is bill ka saara maal pehle hi wapas ho chuka</p>
          </div>
        ) : (
          <div className="space-y-5">
            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Kya wapas aaya</h3>
                <button type="button" onClick={toggleAll} className="text-[0.8125rem] font-medium text-amber-700 hover:underline">
                  {allPicked ? 'Sab hatayein' : 'Poora bill wapas'}
                </button>
              </div>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {lines.map((l) => {
                  const v = qty[l.id] ?? 0;
                  const done = l.remaining <= 0;
                  const rollCut = l.isCarpet && parseCarpetNoteClient(l.note).isRollCut;
                  return (
                    <li key={l.id} className={cn('px-3 py-2.5 transition', v > 0 && 'bg-amber-50/70', done && 'opacity-50')}>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100"><Package className="h-4 w-4 text-slate-500" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{l.name}{l.variant && <span className="text-slate-500"> · {l.variant}</span>}</p>
                          <p className="text-[0.75rem] text-slate-500">
                            {qtyText(l.sold)} {l.unit} becha · {formatPKR(l.unitRefund)} fi {l.unit} wapas
                            {l.already > 0 && <span className="text-amber-700"> · {qtyText(l.already)} pehle wapas</span>}
                          </p>
                          {l.units.length > 0 && <p className="truncate font-mono text-[0.6875rem] text-slate-500">{l.units.join(', ')}</p>}
                        </div>
                        {done ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.75rem] text-slate-500">Poora wapas</span>
                        ) : (
                          <div className="flex shrink-0 items-center gap-1">
                            <button type="button" onClick={() => setLine(l, v - 1)} aria-label={`${l.name} kam`} disabled={v <= 0}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40">
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <input type="number" min={0} max={l.remaining} step={tracked(l) ? 1 : 'any'} value={v || ''} placeholder="0" aria-label={`${l.name} kitna wapas`}
                              onChange={(e) => setLine(l, Number(e.target.value) || 0)}
                              className="h-8 w-14 rounded-lg border border-slate-200 bg-white text-center text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-amber-500" />
                            <button type="button" onClick={() => setLine(l, v + 1)} aria-label={`${l.name} zyada`} disabled={v >= l.remaining}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-10 text-right text-[0.75rem] tabular-nums text-slate-400">/ {qtyText(l.remaining)}</span>
                          </div>
                        )}
                      </div>
                      {v > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-12">
                          {rollCut ? (
                            <button type="button" onClick={() => setCarpetFor(l)}
                              className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white px-2.5 text-[0.75rem] font-medium text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50">
                              <Scissors className="h-3.5 w-3.5" />
                              {carpet[l.id] ? (carpet[l.id].isDamaged ? 'Kharab cut piece' : carpet[l.id].createCutPiece ? `Cut piece ${carpet[l.id].cutPieceWidthFt}×${carpet[l.id].cutPieceLengthFt} ft` : 'Cut piece nahi banega') : 'Cut piece ka naap'}
                            </button>
                          ) : (
                            <>
                              <ShelfButton on={onShelf(l)} good onClick={() => setShelf((s) => ({ ...s, [l.id]: true }))} />
                              <ShelfButton on={!onShelf(l)} onClick={() => setShelf((s) => ({ ...s, [l.id]: false }))} />
                            </>
                          )}
                          <span className="ml-auto text-[0.75rem] font-semibold tabular-nums text-slate-700">{formatPKR(v * l.unitRefund)}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-1.5 text-[0.6875rem] text-slate-500">
                "Stock me wapas" se maal dobara bikne ke liye shelf par aata hai. "Kharab" wala stock me nahi aata aur nuqsan me likha jata hai.
                {discounted && ' Rate discount ke baad wala hai — jitna customer ne diya utna hi wapas.'}
              </p>
            </section>

            <section>
              <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Paisa kaise wapas</h3>
              <div role="radiogroup" aria-label="Paisa kaise wapas" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {REFUND_METHODS.map((m) => {
                  const on = refundMethod === m.v;
                  return (
                    <button key={m.v} type="button" role="radio" aria-checked={on} onClick={() => setRefundMethod(m.v)}
                      className={cn('rounded-xl border p-2.5 text-left transition', on ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-slate-200 hover:border-slate-300')}>
                      <m.icon className={cn('h-4 w-4', on ? 'text-amber-700' : 'text-slate-400')} />
                      <p className="mt-1 text-[0.8125rem] font-semibold text-slate-900">{m.label}</p>
                      <p className="truncate text-[0.6875rem] text-slate-500">{m.hint}</p>
                    </button>
                  );
                })}
              </div>
              {owed > 0 && sale.customer && (
                <p className="mt-2 flex items-start gap-2 rounded-xl bg-blue-50 p-2.5 text-[0.75rem] text-blue-900">
                  <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Is bill par {formatPKR(owed)} udhaar baqi hai. Return pehle yeh udhaar khate se kam karti hai, baqi amount haath me wapas di jati hai.
                </p>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Wapas kyun aaya</h3>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {REASONS.map((r) => (
                  <button key={r} type="button" onClick={() => setReason(reason === r ? '' : r)} aria-pressed={reason === r}
                    className={cn('rounded-full px-3 py-1 text-[0.75rem] font-medium ring-1 transition',
                      reason === r ? 'bg-amber-600 text-white ring-amber-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300')}>
                    {r}
                  </button>
                ))}
              </div>
              <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Ya apne in words likhein…" aria-label="Wajah"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15" />
              <p className="mt-1 text-[0.6875rem] text-slate-500">Wajah se Analytics me pata chalta hai ke maal kyun wapas aa raha hai.</p>
              {showNotes ? (
                <>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={2} placeholder="Koi aur baat — jaise dabba khula tha" aria-label="Note"
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15" />
                  <p className="text-[0.6875rem] text-slate-500">Note return ki parchi par bhi chhapta hai.</p>
                </>
              ) : (
                <button type="button" onClick={() => setShowNotes(true)} className="mt-2 inline-flex items-center gap-1 text-[0.75rem] font-medium text-slate-600 hover:text-slate-900">
                  <StickyNote className="h-3.5 w-3.5" /> Note likhein
                </button>
              )}
              {refund > 0 && <p className="mt-2 text-[0.75rem] text-slate-500">Yeh amount aaj ki sale se kam hogi.</p>}
            </section>
          </div>
        )}
      </Modal>

      {carpetFor && createPortal(
        // Above the return form (the carpet dialog has a lower layer of its own).
        <div className="fixed inset-0 z-[100]">
          <CarpetReturnOptionsDialog
            carpetInfo={parseCarpetNoteClient(carpetFor.note)}
            productName={carpetFor.name}
            variantName={carpetFor.variant ?? undefined}
            returnedSqft={qty[carpetFor.id] ?? carpetFor.remaining}
            pricePerSqft={carpetFor.unitRefund}
            initialOptions={carpet[carpetFor.id]}
            onConfirm={(o) => { setCarpet((c) => ({ ...c, [carpetFor.id]: o })); setCarpetFor(null); }}
            onClose={() => setCarpetFor(null)}
          />
        </div>,
        document.body,
      )}
    </>
  );
}

function ShelfButton({ on, good, onClick }: { on: boolean; good?: boolean; onClick: () => void }) {
  const Icon = good ? PackageCheck : PackageX;
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={cn('inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[0.75rem] font-medium ring-1 transition',
        on ? (good ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-rose-600 text-white ring-rose-600') : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300')}>
      <Icon className="h-3.5 w-3.5" />{good ? 'Stock me wapas' : 'Kharab — stock me nahi'}
    </button>
  );
}
