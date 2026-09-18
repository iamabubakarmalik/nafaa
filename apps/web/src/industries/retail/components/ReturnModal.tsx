import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  RotateCcw, X, Loader2, Package, Plus, Minus, AlertTriangle,
  Banknote, CreditCard, Smartphone, Building2, Zap, BookOpen, CheckCircle2,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { returnsApi } from '@modules/sales/returns/api/returns.api';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

/* ═════════════════════════════════════════════════════════════
   WAPSI (RETURN) — usi safhe par
   ─────────────────────────────────────────────────────────────
   Customer maal wapas le kar aaya. Pehle iske liye alag safhe par
   jana parta tha, phir wahan bill dhoondna parta tha — counter par
   customer khara intezar karta rehta.

   Ab bill ki usi line se modal khulta hai.

   Ye "Wapas lein" (void) se ALAG cheez hai:
     • Void  = bikri honi hi nahi chahiye thi (demo, ghalat bill).
               Poora bill mit jata hai, paisa kabhi aaya hi nahi mana jata.
     • Wapsi = bikri asli thi, customer ne waqai khareeda tha, ab
               kuch ya saara maal wapas la raha hai. Paisa GOLAK SE
               BAHAR jata hai, aur ye alag record banta hai —
               taake report me pata chale kitna maal wapas aaya.
   ═════════════════════════════════════════════════════════════ */

const REFUND_METHODS: { v: PaymentMethod; label: string; icon: any; hint: string }[] = [
  { v: 'CASH', label: 'Cash', icon: Banknote, hint: 'Golak se nikal kar' },
  { v: 'JAZZCASH', label: 'JazzCash', icon: Smartphone, hint: 'Wapas bhej dein' },
  { v: 'EASYPAISA', label: 'EasyPaisa', icon: Zap, hint: 'Wapas bhej dein' },
  { v: 'BANK_TRANSFER', label: 'Bank', icon: Building2, hint: 'Account me' },
  { v: 'CARD', label: 'Card', icon: CreditCard, hint: 'Card par wapas' },
];

const REASONS = [
  'Cheez kharab nikli',
  'Ghalat cheez de di',
  'Customer ko pasand nahi aayi',
  'Naap/size theek nahi',
  'Tareekh guzar chuki thi',
  'Zyada de di thi',
];

export function ReturnModal({ sale, onClose, onDone }: {
  sale: any;
  onClose: () => void;
  onDone: () => void;
}) {
  const qc = useQueryClient();

  /** Har line ka kitna wapas — shuru me sab sifar */
  const [qty, setQty] = useState<Record<string, number>>({});
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>(
    (sale.paymentMethod as PaymentMethod) ?? 'CASH',
  );

  /* Agar bill par udhaar tha to backend KHUD customer ka khata
     kam kar deta hai — is ke liye alag se kuch chunna nahi parta.
     (returns.service: `sale.creditAmount > 0 && customer.balance > 0`) */
  const hadCredit = Number(sale.creditAmount ?? 0) > 0;
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  /** Jo pehle wapas ho chuka wo dobara nahi ho sakta */
  const lines = useMemo(
    () => (sale.items ?? []).map((it: any) => {
      const already = Number(it.returnedQty ?? 0);
      const remaining = Math.max(Number(it.quantity ?? 0) - already, 0);
      const unitPrice = Number(it.unitPrice ?? it.price ?? 0);
      return {
        id: it.id,
        name: it.product?.name ?? 'Cheez',
        unit: it.product?.unit ?? 'pcs',
        sold: Number(it.quantity ?? 0),
        already,
        remaining,
        unitPrice,
      };
    }),
    [sale],
  );

  const anyReturnable = lines.some((l: any) => l.remaining > 0);

  const setLineQty = (id: string, v: number, max: number) =>
    setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(v, max)) }));

  const selected = lines.filter((l: any) => (qty[l.id] ?? 0) > 0);
  const refundAmount = selected.reduce((s: number, l: any) => s + (qty[l.id] ?? 0) * l.unitPrice, 0);

  const takeAll = () => {
    const next: Record<string, number> = {};
    for (const l of lines) if (l.remaining > 0) next[l.id] = l.remaining;
    setQty(next);
  };

  const mut = useMutation({
    mutationFn: () => returnsApi.create({
      saleId: sale.id,
      refundMethod,
      reason: reason.trim() || undefined,
      notes: notes.trim() || undefined,
      items: selected.map((l: any) => ({ saleItemId: l.id, quantity: qty[l.id] })),
    }),
    onSuccess: (res: any) => {
      toast.success(`Wapsi ho gayi — ${formatPKR(res?.refundAmount ?? refundAmount)} wapas`);
      // Stock, khata, reports — sab isi se badalte hain
      qc.invalidateQueries({ queryKey: ['sales-list'] });
      qc.invalidateQueries({ queryKey: ['sales-summary'] });
      qc.invalidateQueries({ queryKey: ['returns'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['retail-products'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Wapsi nahi ho saki'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col border-2 border-amber-200 dark:border-amber-500/40">

        {/* ── Header ── */}
        <div className="shrink-0 relative bg-gradient-to-br from-amber-600 to-orange-700 text-white px-5 py-4 overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black border border-white/30">
                <RotateCcw className="h-3 w-3" /> Maal Wapas Aaya
              </div>
              <h3 className="text-lg sm:text-xl font-black mt-2">Wapsi — {sale.saleNumber}</h3>
              <p className="text-xs font-bold text-white/85 mt-0.5">
                {sale.customer?.name || 'Walk-in'} · {formatPKR(sale.total)} ka bill
              </p>
            </div>
            <button onClick={onClose}
              className="h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!anyReturnable ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
              <p className="font-black text-slate-800 dark:text-slate-200">Is bill ka saara maal pehle hi wapas ho chuka</p>
            </div>
          ) : (
            <>
              {/* ── Kitna wapas ── */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Kya kya wapas aaya
                  </div>
                  <button onClick={takeAll}
                    className="h-8 px-3 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-black transition">
                    Poora bill wapas
                  </button>
                </div>

                <div className="space-y-2">
                  {lines.map((l: any) => {
                    const v = qty[l.id] ?? 0;
                    const done = l.remaining <= 0;
                    return (
                      <div key={l.id}
                        className={`rounded-2xl border-2 p-3 transition ${
                          done ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-60'
                               : v > 0 ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10'
                                       : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                        }`}>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-slate-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-black text-sm text-slate-900 dark:text-white truncate">{l.name}</div>
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              {l.sold} {l.unit} becha · {formatPKR(l.unitPrice)} fi {l.unit}
                              {l.already > 0 && (
                                <span className="text-amber-600 dark:text-amber-400"> · {l.already} pehle wapas</span>
                              )}
                            </div>
                          </div>

                          {done ? (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 text-[10px] font-black shrink-0">
                              Poora wapas ho chuka
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => setLineQty(l.id, v - 1, l.remaining)}
                                className="h-9 w-9 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-amber-400 transition">
                                <Minus className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                              </button>
                              <input type="number" min={0} max={l.remaining} step="any" value={v || ''}
                                onChange={(e) => setLineQty(l.id, Number(e.target.value) || 0, l.remaining)}
                                placeholder="0"
                                className="h-9 w-16 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-sm font-black tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" />
                              <button onClick={() => setLineQty(l.id, v + 1, l.remaining)}
                                className="h-9 w-9 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-amber-400 transition">
                                <Plus className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                              </button>
                              <span className="text-[10px] font-black text-slate-400 w-14 text-right">
                                / {l.remaining}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Paisa kaise wapas ── */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                  Paisa kaise wapas karein
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {REFUND_METHODS.map((m) => (
                    <button key={m.v} onClick={() => setRefundMethod(m.v)}
                      className={`rounded-2xl border-2 p-2.5 text-left transition ${
                        refundMethod === m.v
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 ring-2 ring-amber-200 dark:ring-amber-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-amber-400'
                      }`}>
                      <m.icon className={`h-4 w-4 ${refundMethod === m.v ? 'text-amber-600' : 'text-slate-400'}`} />
                      <div className="text-xs font-black text-slate-900 dark:text-white mt-1">{m.label}</div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">{m.hint}</div>
                    </button>
                  ))}
                </div>
                {hadCredit && (
                  <div className="mt-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-2.5 text-[11px] font-bold text-blue-900 dark:text-blue-200 flex items-start gap-2">
                    <BookOpen className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      Is bill par <strong>{formatPKR(sale.creditAmount)}</strong> udhaar tha — wo khud hi
                      customer ke khate se kam ho jayega. Alag se kuch karne ki zaroorat nahi.
                    </span>
                  </div>
                )}
              </div>

              {/* ── Wajah ── */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                  Wapas kyun aaya
                </div>
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {REASONS.map((r) => (
                    <button key={r} onClick={() => setReason(r)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border-2 transition ${
                        reason === r ? 'bg-amber-600 border-amber-600 text-white'
                                     : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400'
                      }`}>{r}</button>
                  ))}
                </div>
                <input value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="Ya apne alfaaz me likhein…"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500 transition" />
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {anyReturnable && (
          <div className="shrink-0 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-4 space-y-3">
            <div className={`rounded-2xl p-3 flex items-center justify-between gap-3 border-2 ${
              refundAmount > 0 ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40'
                               : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Wapas karna hai
                </div>
                <div className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
                  {formatPKR(refundAmount)}
                </div>
              </div>
              <div className="text-right text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {selected.length > 0
                  ? <>{selected.length} cheez{selected.length > 1 ? 'ein' : ''} wapas</>
                  : 'Abhi kuch nahi chuna'}
              </div>
            </div>

            {refundAmount > 0 && (
              <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
                Maal stock me wapas aa jayega aur ye raqam din ki bikri me se kam ho jayegi.
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 h-12" onClick={onClose}>
                <X className="h-4 w-4" /> Rehne dein
              </Button>
              <button onClick={() => mut.mutate()} disabled={mut.isPending || selected.length === 0}
                className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-700 disabled:opacity-40 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98]">
                {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Wapsi Mukammal Karein
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
