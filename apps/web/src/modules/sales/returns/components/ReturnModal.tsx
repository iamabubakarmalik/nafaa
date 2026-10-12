/**
 * Return from a bill, opened from the bill itself. The customer brought some
 * or all of the goods back: pick how much of each line, how the money goes
 * back and why. Stock comes back, the day's sales go down, and credit on the
 * bill is taken off the customer's khata by the server.
 *
 * Not the same as cancelling (void): a cancelled bill should never have
 * existed; a return is a real sale coming back and is kept as its own record.
 */

import { useMemo, useState, type ComponentType } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Banknote, BookOpen, Building2, CheckCircle2, CreditCard, Minus, Package, Plus, RotateCcw, Smartphone, Zap } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { returnsApi } from '@modules/sales/returns/api/returns.api';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

const REFUND_METHODS: Array<{ v: PaymentMethod; label: string; icon: ComponentType<{ className?: string }>; hint: string }> = [
  { v: 'CASH', label: 'Cash', icon: Banknote, hint: 'Golak se' },
  { v: 'JAZZCASH', label: 'JazzCash', icon: Smartphone, hint: 'Wapas bhejein' },
  { v: 'EASYPAISA', label: 'EasyPaisa', icon: Zap, hint: 'Wapas bhejein' },
  { v: 'BANK_TRANSFER', label: 'Bank', icon: Building2, hint: 'Account me' },
  { v: 'CARD', label: 'Card', icon: CreditCard, hint: 'Card par' },
];

const REASONS = [
  'Cheez kharab nikli', 'Ghalat cheez de di', 'Pasand nahi aayi',
  'Naap/size theek nahi', 'Tareekh guzar chuki thi', 'Zyada de di thi',
];

interface Line { id: string; name: string; unit: string; sold: number; already: number; remaining: number; unitPrice: number }

export function ReturnModal({ sale, onClose, onDone }: {
  sale: any;
  onClose: () => void;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>((sale.paymentMethod as PaymentMethod) ?? 'CASH');
  const [reason, setReason] = useState('');
  const hadCredit = Number(sale.creditAmount ?? 0) > 0;

  const lines = useMemo<Line[]>(() => (sale.items ?? []).map((it: any) => {
    const already = Number(it.returnedQty ?? 0);
    return {
      id: it.id,
      name: it.product?.name ?? it.productName ?? 'Cheez',
      unit: it.product?.unit ?? 'pcs',
      sold: Number(it.quantity ?? 0),
      already,
      remaining: Math.max(Number(it.quantity ?? 0) - already, 0),
      unitPrice: Number(it.unitPrice ?? it.price ?? 0),
    };
  }), [sale]);

  const returnable = lines.filter((l) => l.remaining > 0);
  const setLine = (l: Line, v: number) => setQty((q) => ({ ...q, [l.id]: Math.max(0, Math.min(Number(v.toFixed(3)), l.remaining)) }));
  const selected = lines.filter((l) => (qty[l.id] ?? 0) > 0);
  const refund = selected.reduce((s, l) => s + (qty[l.id] ?? 0) * l.unitPrice, 0);
  const allPicked = returnable.length > 0 && returnable.every((l) => (qty[l.id] ?? 0) === l.remaining);

  const toggleAll = () => setQty(allPicked ? {} : Object.fromEntries(returnable.map((l) => [l.id, l.remaining])));

  const mut = useMutation({
    mutationFn: () => returnsApi.create({
      saleId: sale.id,
      refundMethod,
      reason: reason.trim() || undefined,
      items: selected.map((l) => ({ saleItemId: l.id, quantity: qty[l.id] })),
    }),
    onSuccess: (res: any) => {
      toast.success(`Wapsi ho gayi — ${formatPKR(res?.refundAmount ?? refund)} wapas`);
      ['sales-list', 'sales-history', 'sales-summary', 'returns', 'products', 'product-catalog', 'customers', 'customer-directory', 'dashboard-overview']
        .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Wapsi nahi ho saki'),
  });

  return (
    <Modal open onClose={onClose} size="lg"
      title={<span className="inline-flex items-center gap-2"><RotateCcw className="h-4 w-4 text-amber-600" /> Wapsi — {sale.saleNumber}</span>}
      description={`${sale.customer?.name || 'Walk-in'} · ${formatPKR(sale.total)} ka bill`}
      footer={returnable.length > 0 ? (
        <div className="flex w-full flex-wrap items-center gap-3">
          <div className="mr-auto min-w-0">
            <p className="text-[0.75rem] text-slate-500">{selected.length ? `${selected.length} cheez${selected.length > 1 ? 'ein' : ''} wapas` : 'Abhi kuch nahi chuna'}</p>
            <p className="text-xl font-bold tabular-nums text-slate-900">{formatPKR(refund)}</p>
          </div>
          <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
          <Button onClick={() => mut.mutate()} loading={mut.isPending} disabled={!selected.length} leftIcon={<RotateCcw className="h-4 w-4" />}
            className="bg-amber-600 hover:bg-amber-700">
            Wapsi karein
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
                return (
                  <li key={l.id} className={cn('flex flex-wrap items-center gap-3 px-3 py-2.5 transition', v > 0 && 'bg-amber-50/70', done && 'opacity-50')}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100"><Package className="h-4 w-4 text-slate-500" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{l.name}</p>
                      <p className="text-[0.75rem] text-slate-500">
                        {l.sold} {l.unit} becha · {formatPKR(l.unitPrice)} fi {l.unit}
                        {l.already > 0 && <span className="text-amber-700"> · {l.already} pehle wapas</span>}
                      </p>
                    </div>
                    {done ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.75rem] text-slate-500">Poora wapas</span>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" onClick={() => setLine(l, v - 1)} aria-label={`${l.name} kam`} disabled={v <= 0}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input type="number" min={0} max={l.remaining} step="any" value={v || ''} placeholder="0" aria-label={`${l.name} kitna wapas`}
                          onChange={(e) => setLine(l, Number(e.target.value) || 0)}
                          className="h-8 w-14 rounded-lg border border-slate-200 text-center text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-amber-500" />
                        <button type="button" onClick={() => setLine(l, v + 1)} aria-label={`${l.name} zyada`} disabled={v >= l.remaining}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 text-right text-[0.75rem] tabular-nums text-slate-400">/ {l.remaining}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Paisa kaise wapas</h3>
            <div role="radiogroup" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
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
            {hadCredit && (
              <p className="mt-2 flex items-start gap-2 rounded-xl bg-blue-50 p-2.5 text-[0.75rem] text-blue-900">
                <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Is bill par {formatPKR(sale.creditAmount)} udhaar tha — woh khud customer ke khate se kam ho jayega.
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
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ya apne alfaaz me likhein…" aria-label="Wajah"
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15" />
            {refund > 0 && <p className="mt-2 text-[0.75rem] text-slate-500">Maal stock me wapas aayega aur yeh raqam aaj ki bikri se kam hogi.</p>}
          </section>
        </div>
      )}
    </Modal>
  );
}
